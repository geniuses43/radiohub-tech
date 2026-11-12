'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AirHistory } from '../LiveAir';
import { StreamStrip } from '../StreamStrip';
import { useAir } from '@/lib/nowPlaying';
import { usePlayer, type PlayItem } from './PlayerProvider';
import { PlayIcon } from './PlayButton';

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

function Progress() {
  const { getMedia, seek, item } = usePlayer();
  const [t, setT] = useState({ cur: 0, dur: 0 });
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const el = getMedia();
      if (el) {
        const cur = el.currentTime || 0;
        if (Math.floor(cur * 4) !== last) {
          last = Math.floor(cur * 4);
          setT({ cur, dur: Number.isFinite(el.duration) ? el.duration : 0 });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getMedia, item?.key]);
  return (
    <div className="pbar__progress">
      <span className="pbar__time">{fmt(t.cur)}</span>
      <input
        type="range"
        min={0}
        max={t.dur || 1}
        step={1}
        value={Math.min(t.cur, t.dur || 1)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Перемотка"
        aria-valuetext={`${fmt(t.cur)} из ${fmt(t.dur)}`}
        style={{ '--p': `${t.dur ? (t.cur / t.dur) * 100 : 0}%` } as React.CSSProperties}
      />
      <span className="pbar__time">{fmt(t.dur)}</span>
    </div>
  );
}

/** Полоски спектра: настоящий звук через Web Audio, где он доступен, иначе спокойная имитация */
function Spectrum({ on }: { on: boolean }) {
  const { getAnalyser } = usePlayer();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = 14;
    let raf = 0;
    let buf: Uint8Array<ArrayBuffer> | null = null;
    let level = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      level += ((on ? 1 : 0) - level) * 0.08;
      const an = on ? getAnalyser() : null;
      if (an) {
        if (!buf || buf.length !== an.frequencyBinCount) buf = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(buf);
      }
      const bw = w / N;
      const barW = Math.max(3, bw * 0.55);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < N; i++) {
        let a: number;
        if (an && buf) {
          // полосы по логарифмической шкале частот + степень для контраста, иначе все упираются в потолок
          const lo = Math.floor(2 * Math.pow(70 / 2, i / N));
          const hi = Math.max(lo + 1, Math.floor(2 * Math.pow(70 / 2, (i + 1) / N)));
          let sum = 0;
          for (let k = lo; k < hi; k++) sum += buf[Math.min(buf.length - 1, k)];
          a = Math.pow(sum / (hi - lo) / 255, 1.3) * (1.15 + i / N / 1.2);
        } else a = reduced ? 0.3 : 0.32 + 0.26 * Math.sin(t / 230 + i * 0.9) * Math.sin(t / 370 - i * 0.4);
        const bh = Math.max(3, Math.min(1, a) * level * h);
        ctx.globalAlpha = 0.4 + 0.6 * level;
        const x = i * bw + (bw - barW) / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, h - bh, barW, bh, barW / 2);
        else ctx.rect(x, h - bh, barW, bh);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [on, getAnalyser]);
  return <canvas ref={ref} className="pbar__spectrum" aria-hidden />;
}

function Panel({ close }: { close: () => void }) {
  const { item: playing, air: playingAir, stations } = usePlayer();
  const ref = useRef<HTMLDivElement>(null);
  // пока играет превью трека, панель остаётся на эфире, из которого его включили
  const lastLive = useRef<PlayItem | null>(null);
  if (playing && playing.kind !== 'preview') lastLive.current = playing;
  const item = playing?.kind === 'preview' ? lastLive.current : playing;
  const ctxAir = useAir(item?.kind === 'live' && playing?.kind === 'preview' ? item.meta : null);
  const air = playing?.kind === 'preview' ? ctxAir : playingAir;
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  if (!item) return null;
  const slug = item.key.replace(/^live:/, '').split('/')[0];
  const st = item.kind === 'live' ? stations.find((s) => s.slug === slug) : undefined;
  const cur = air?.current ?? null;
  const next = air?.next?.[0];
  return (
    <div className="ppanel" ref={ref} tabIndex={-1} role="dialog" aria-label="Эфир" style={{ '--st': item.color } as React.CSSProperties}>
      <div className="ppanel__head">
        <div className="ppanel__title">
          <span>{[item.title, item.subtitle].filter(Boolean).join(' · ')}</span>
          <b>{cur ? `${cur.artist} — ${cur.title}` : item.kind === 'live' ? 'В эфире ведущие' : item.subtitle}</b>
          {next && <small>Дальше: {[next.artist, next.title].filter(Boolean).join(' — ')}</small>}
        </div>
        <button type="button" className="ppanel__close" onClick={close} aria-label="Закрыть">
          <svg viewBox="0 0 24 24" className="ico" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {st && st.items.length > 1 && (
        <>
          <h3 className="ppanel__h">Эфиры {st.name}</h3>
          <StreamStrip items={st.items} className="strip--panel" />
        </>
      )}
      {item.kind === 'live' && (
        <>
          <h3 className="ppanel__h">Недавно в эфире</h3>
          <AirHistory meta={item.meta ?? null} base={{ title: item.title, color: item.color, art: item.art, href: item.href }} limit={20} />
        </>
      )}
      <Link href={item.href} className="ppanel__link" onClick={close}>
        Открыть страницу {item.kind === 'episode' ? 'подкаста' : 'станции'}
      </Link>
    </div>
  );
}

export function PlayerBar() {
  const { item, status, toggle, air, volume, setVolume } = usePlayer();
  const [open, setOpen] = useState(false);

  // место под плеер внизу страницы, чтобы он не закрывал подвал
  useEffect(() => {
    document.documentElement.classList.toggle('has-player', !!item);
  }, [item]);
  useEffect(() => {
    if (item?.kind === 'episode') setOpen(false);
  }, [item?.kind]);

  if (!item) return null;
  const cur = item.kind === 'live' ? air?.current : null;
  const art = cur?.cover || item.art;
  const playing = status === 'playing' || status === 'loading';
  const src = [item.title, item.subtitle].filter(Boolean).join(' · ');
  const line1 = cur ? cur.title : item.kind === 'live' ? src : item.subtitle || item.title;
  const prev = item.kind === 'live' ? air?.previous?.[0] : null;
  const line2 = cur
    ? `${cur.artist} · ${src}`
    : item.kind === 'live'
      ? status === 'paused'
        ? 'Нажмите ▶, чтобы включить'
        : prev
          ? `Только что: ${prev.artist} — ${prev.title}`
          : 'В эфире'
      : item.title;

  return (
    <>
      {open && <Panel close={() => setOpen(false)} />}
      <div className="pbar" style={{ '--st': item.color } as React.CSSProperties} role="region" aria-label="Плеер">
        <button type="button" className="pbar__art" onClick={() => setOpen((o) => !o)} aria-label="История эфира и потоки станции" disabled={item.kind === 'episode'}>
          {art ? <img src={art} alt="" width={56} height={56} /> : null}
          {item.kind === 'live' && <span className="pbar__live">Эфир</span>}
        </button>
        <div className="pbar__meta">
          <div className="pbar__line1" aria-live="polite">
            {line1}
          </div>
          <div className="pbar__line2">{line2}</div>
          {status === 'error' && <div className="pbar__err">Поток не отвечает. Нажмите ▶, чтобы попробовать снова.</div>}
        </div>
        {item.kind === 'live' ? <Spectrum on={status === 'playing'} /> : <Progress />}
        {item.kind !== 'episode' && (
          <button
            type="button"
            className={`pbar__hist ${open ? 'is-on' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="ico" aria-hidden>
              <path d="M4 6h11M4 12h11M4 18h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M18 14v6l3-2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>История</span>
          </button>
        )}
        <button type="button" className="pbar__toggle" onClick={() => toggle()} aria-label={playing ? 'Пауза' : 'Слушать'}>
          <PlayIcon playing={status === 'playing'} loading={status === 'loading'} />
        </button>
        <label className="pbar__vol">
          <span className="sr">Громкость</span>
          <svg viewBox="0 0 24 24" className="ico" aria-hidden>
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            {volume > 0.02 && <path d="M16 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />}
            {volume > 0.5 && <path d="M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />}
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ '--p': `${volume * 100}%` } as React.CSSProperties}
          />
        </label>
      </div>
    </>
  );
}
