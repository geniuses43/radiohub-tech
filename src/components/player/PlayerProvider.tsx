'use client';

import type Hls from 'hls.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeAir, trackLine, type Air } from '@/lib/nowPlaying';
import { useCity } from '../city/CityProvider';

export type PlayItem = {
  /** уникальный ключ: live:<slug>, live:<slug>/<stream>, ep:<id>, hook:<url> */
  key: string;
  kind: 'live' | 'episode' | 'preview';
  /** станция / шоу */
  title: string;
  /** поток, город или название выпуска */
  subtitle?: string;
  stream: string;
  meta?: string | null;
  color: string;
  art?: string | null;
  href: string;
};

export type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/** Эфиры станции для переключателя в плеере: основной + тематические потоки */
export type LiveStation = { slug: string; name: string; items: { name: string; image: string | null; item: PlayItem }[] };

type Ctx = {
  item: PlayItem | null;
  status: Status;
  volume: number;
  air: Air | null;
  play: (item: PlayItem) => void;
  toggle: (item?: PlayItem) => void;
  pause: () => void;
  setVolume: (v: number) => void;
  seek: (sec: number) => void;
  getAnalyser: () => AnalyserNode | null;
  getMedia: () => HTMLAudioElement | null;
  stations: LiveStation[];
  /** трансляция из студии (мини-плеер поверх сайта) */
  video: VideoState | null;
  openVideo: (v: VideoState) => void;
  closeVideo: () => void;
};

export type VideoState = { src: string; station: string; color: string; href: string };

const PlayerCtx = createContext<Ctx | null>(null);

export function usePlayer() {
  const c = useContext(PlayerCtx);
  if (!c) throw new Error('usePlayer вне PlayerProvider');
  return c;
}

/** Играет ли сейчас этот элемент (или грузится) */
export function useIsActive(key: string) {
  const { item, status } = usePlayer();
  const on = item?.key === key;
  return { on, playing: on && (status === 'playing' || status === 'loading'), loading: on && status === 'loading' };
}

const isHls = (u: string) => /\.m3u8(\?|$)/i.test(u);

function preferNative(el: HTMLAudioElement) {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua));
  return apple && el.canPlayType('application/vnd.apple.mpegurl') !== '';
}

const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

export function PlayerProvider({ children, stations }: { children: React.ReactNode; stations: LiveStation[] }) {
  const liveQueue = useMemo(() => stations.map((s) => s.items[0].item), [stations]);
  const { localize, city } = useCity();
  const [video, setVideo] = useState<VideoState | null>(null);
  // Два элемента: «live» идёт через hls.js и Web Audio (для визуализации),
  // «plain» — нативный (Safari HLS, выпуски подкастов, превью). Так чужой mp3 без CORS
  // никогда не попадёт в AudioContext и не замолчит.
  const liveEl = useRef<HTMLAudioElement | null>(null);
  const plainEl = useRef<HTMLAudioElement | null>(null);
  const active = useRef<HTMLAudioElement | null>(null);
  const hls = useRef<Hls | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const retries = useRef(0);
  const resumeAfterPreview = useRef<PlayItem | null>(null);

  const [item, setItem] = useState<PlayItem | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [volume, setVol] = useState(0.9);
  const [air, setAir] = useState<Air | null>(null);
  const itemRef = useRef<PlayItem | null>(null);
  itemRef.current = item;

  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem('rh:volume') || '');
      if (v >= 0 && v <= 1) setVol(v);
      // последняя станция: плеер сразу готов, но сам не играет
      const key = localStorage.getItem('rh:last');
      const found = stations.flatMap((s) => s.items).find((x) => x.item.key === key);
      if (found && !itemRef.current) {
        setItem(found.item);
        itemRef.current = found.item;
        setStatus('paused');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    [liveEl.current, plainEl.current].forEach((el) => el && (el.volume = volume));
  }, [volume]);

  const destroyHls = () => {
    hls.current?.destroy();
    hls.current = null;
  };

  const stopAll = () => {
    destroyHls();
    for (const el of [liveEl.current, plainEl.current]) {
      if (!el) continue;
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  };

  const ensureAnalyser = (el: HTMLAudioElement) => {
    if (analyser.current || isMobile()) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(el);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.82;
      // эфир радио сильно сжат по громкости: шире диапазон, иначе все полосы упираются в потолок
      an.minDecibels = -90;
      an.maxDecibels = -10;
      src.connect(an);
      an.connect(ctx.destination);
      audioCtx.current = ctx;
      analyser.current = an;
    } catch {
      analyser.current = null;
    }
  };

  const start = useCallback(async (it: PlayItem) => {
    const live = liveEl.current!;
    const plain = plainEl.current!;
    active.current = null; // события от прежнего элемента больше не трогают статус
    stopAll();
    retries.current = 0;
    setStatus('loading');

    const useHlsJs = isHls(it.stream) && !preferNative(plain);
    let el = plain;
    if (useHlsJs) {
      const { default: HlsCls } = await import('hls.js');
      if (itemRef.current?.key !== it.key) return; // пока грузился модуль, выбрали другое
      if (HlsCls.isSupported()) {
        el = live;
        ensureAnalyser(live);
        audioCtx.current?.resume().catch(() => {});
        const h = new HlsCls({ lowLatencyMode: false, backBufferLength: 30, maxBufferLength: 20 });
        hls.current = h;
        h.on(HlsCls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (retries.current++ < 4) {
            if (data.type === HlsCls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError();
            else setTimeout(() => hls.current === h && h.startLoad(-1), 1200 * retries.current);
          } else {
            setStatus('error');
          }
        });
        h.loadSource(it.stream);
        h.attachMedia(live);
      } else {
        plain.src = it.stream;
      }
    } else {
      plain.src = it.stream;
    }
    active.current = el;
    el.volume = volume;
    try {
      await el.play();
    } catch (e) {
      // автоплей запрещён или источник не открылся
      if ((e as Error)?.name === 'NotAllowedError') setStatus('paused');
      else if (itemRef.current?.key === it.key && el.error) setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  const play = useCallback(
    (raw: PlayItem) => {
      const it = localize(raw); // основной эфир станции → эфир выбранного города
      setVideo(null); // два звука сразу ни к чему
      if (it.kind === 'preview' && itemRef.current && itemRef.current.kind !== 'preview' && status === 'playing') {
        resumeAfterPreview.current = itemRef.current;
      } else if (it.kind !== 'preview') {
        resumeAfterPreview.current = null;
      }
      setItem(it);
      itemRef.current = it;
      if (it.kind === 'live') {
        try {
          localStorage.setItem('rh:last', it.key);
        } catch {}
      }
      void start(it);
    },
    [start, status, localize],
  );

  // сменили город — играющий (или стоящий на паузе) основной эфир переходит на эфир этого города
  useEffect(() => {
    const cur = itemRef.current;
    if (!cur || cur.kind !== 'live' || !/^live:[^/]+$/.test(cur.key)) return;
    const base = stations.flatMap((s) => s.items).find((x) => x.item.key === cur.key)?.item;
    if (!base) return;
    const loc = localize(base);
    if (loc.stream === cur.stream) return;
    if (status === 'playing' || status === 'loading') play(base);
    else {
      setItem(loc);
      itemRef.current = loc;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const pause = useCallback(() => {
    const it = itemRef.current;
    const el = active.current;
    if (!el) return;
    el.pause();
    // эфир на паузе не копим: при продолжении начнём с «живой» точки
    if (it?.kind === 'live') hls.current?.stopLoad();
    setStatus('paused');
  }, []);

  const toggle = useCallback(
    (it?: PlayItem) => {
      const cur = itemRef.current;
      if (it && it.key !== cur?.key) return play(it);
      if (!cur) return;
      if (status === 'playing' || status === 'loading') return pause();
      if (cur.kind === 'live' || status === 'error') return play(cur);
      active.current?.play().catch(() => setStatus('error'));
    },
    [play, pause, status],
  );

  const setVolume = useCallback((v: number) => {
    const x = Math.max(0, Math.min(1, v));
    setVol(x);
    try {
      localStorage.setItem('rh:volume', String(x));
    } catch {}
  }, []);

  const seek = useCallback((sec: number) => {
    const el = active.current;
    if (el && Number.isFinite(el.duration)) el.currentTime = Math.max(0, Math.min(el.duration - 0.5, sec));
  }, []);

  // события медиа-элементов
  useEffect(() => {
    const els = [liveEl.current!, plainEl.current!];
    const on = (el: HTMLAudioElement, type: string, fn: () => void) => {
      el.addEventListener(type, fn);
      return () => el.removeEventListener(type, fn);
    };
    const offs = els.flatMap((el) => [
      on(el, 'playing', () => active.current === el && setStatus('playing')),
      on(el, 'waiting', () => active.current === el && !el.paused && setStatus('loading')),
      on(el, 'pause', () => active.current === el && !el.ended && setStatus((s) => (s === 'error' ? s : 'paused'))),
      on(el, 'error', () => {
        if (active.current !== el || !el.getAttribute('src')) return;
        setStatus('error');
      }),
      on(el, 'ended', () => {
        if (active.current !== el) return;
        const back = resumeAfterPreview.current;
        resumeAfterPreview.current = null;
        if (back) play(back);
        else setStatus('paused');
      }),
    ]);
    return () => offs.forEach((f) => f());
  }, [play]);

  // «сейчас играет» для текущего эфира
  useEffect(() => {
    setAir(null);
    if (!item?.meta || item.kind !== 'live') return;
    return subscribeAir(item.meta, setAir);
  }, [item?.meta, item?.kind]);

  // системный плеер: экран блокировки, гарнитура, клавиши
  useEffect(() => {
    if (!('mediaSession' in navigator) || !item) return;
    const cur = item.kind === 'live' ? air?.current : null;
    const art = cur?.cover || item.art;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cur ? cur.title || item.title : item.subtitle || item.title,
        artist: cur ? cur.artist : item.title,
        album: item.kind === 'live' ? `${item.title}${item.subtitle ? ' · ' + item.subtitle : ''} · РадиоХаб` : 'РадиоХаб',
        artwork: art ? [{ src: new URL(art, location.href).href, sizes: '512x512' }] : [],
      });
    } catch {}
  }, [item, air]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const step = (d: number) => {
      const cur = itemRef.current;
      if (!cur || cur.kind !== 'live' || !liveQueue.length) return;
      const base = cur.key.split('/')[0];
      const i = liveQueue.findIndex((q) => q.key === base);
      const n = liveQueue[(i + d + liveQueue.length) % liveQueue.length];
      if (n) play(n);
    };
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {}
    };
    set('play', () => toggle());
    set('pause', () => pause());
    set('stop', () => pause());
    set('nexttrack', () => step(1));
    set('previoustrack', () => step(-1));
    return () => (['play', 'pause', 'stop', 'nexttrack', 'previoustrack'] as const).forEach((a) => set(a, null));
  }, [toggle, pause, play, liveQueue]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : item ? 'paused' : 'none';
  }, [status, item]);

  useEffect(() => () => destroyHls(), []);

  const value = useMemo<Ctx>(
    () => ({
      item,
      status,
      volume,
      air,
      play,
      toggle,
      pause,
      setVolume,
      seek,
      getAnalyser: () => (active.current === liveEl.current ? analyser.current : null),
      getMedia: () => active.current,
      stations,
      video,
      openVideo: (v: VideoState) => {
        const el = active.current;
        if (el && !el.paused) {
          el.pause();
          if (itemRef.current?.kind === 'live') hls.current?.stopLoad();
          setStatus('paused');
        }
        setVideo(v);
      },
      closeVideo: () => setVideo(null),
    }),
    [item, status, volume, air, play, toggle, pause, setVolume, seek, stations, video],
  );

  return (
    <PlayerCtx.Provider value={value}>
      {children}
      <audio ref={liveEl} crossOrigin="anonymous" preload="none" hidden />
      <audio ref={plainEl} preload="none" hidden />
    </PlayerCtx.Provider>
  );
}

export { trackLine };
