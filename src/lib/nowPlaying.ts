'use client';

import { useEffect, useState } from 'react';

/**
 * «Сейчас в эфире» из meta.hostingradio.ru.
 * Одно общее подключение emg/ws?format=native на все станции (как у europaplus.ru):
 * отдельный сокет на каждую станцию сервер режет ответом 429.
 * Протокол: {fetch:{full:[codes]}, subscribe:{full:[codes]}} → {code:{current,previous,next}}; {unsubscribe:[codes]}.
 */

const SOCKET = 'wss://meta.hostingradio.ru/emg/ws?format=native';

export type Track = {
  artist: string;
  title: string;
  cover: string | null;
  hook: string | null;
  startTime: number | null;
  youtube: string | null;
  apple: string | null;
  spotify: string | null;
};

export type Air = {
  current: Track | null;
  previous: Track[];
  next: Track[];
};

/** wss://meta.hostingradio.ru/emg/europaplus-party/ws?... → europaplus-party */
export const codeOf = (meta: string | null | undefined) => meta?.match(/\/emg\/([^/?]+)\/ws/)?.[1] ?? null;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function toTrack(x: unknown): Track | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const artist = str(o.artist) ?? '';
  const title = str(o.title) ?? '';
  if (!artist && !title) return null;
  const st = o.startTime;
  const startTime = typeof st === 'number' ? st : typeof st === 'string' ? Date.parse(st) || null : null;
  return {
    artist,
    title,
    cover: str(o.coverImageUrl600) ?? str(o.coverImageUrl300) ?? str(o.cover),
    hook: str(o.previewUrl) ?? str(o.hook),
    startTime,
    youtube: str(o.youtubeUrl),
    apple: str(o.itunesUrl),
    spotify: str(o.spotifyUrl),
  };
}

const list = (v: unknown) => (Array.isArray(v) ? v.map(toTrack).filter((t): t is Track => !!t) : null);

type Sub = (a: Air) => void;
const subs = new Map<string, Set<Sub>>();
const last = new Map<string, Air>();
let ws: WebSocket | null = null;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const queue: string[] = [];

function send(msg: object) {
  const s = JSON.stringify(msg);
  if (ws?.readyState === WebSocket.OPEN) ws.send(s);
  else queue.push(s);
}

function onData(text: string) {
  let d: Record<string, Record<string, unknown>>;
  try {
    d = JSON.parse(text);
  } catch {
    return;
  }
  if (!d || typeof d !== 'object') return;
  for (const code of Object.keys(d)) {
    const v = d[code];
    if (!v || typeof v !== 'object') continue;
    const prev = last.get(code);
    // previous приходит от старых к новым — переворачиваем, свежие сверху
    const p = list(v.previous);
    const n = list(v.next);
    const air: Air = {
      current: 'current' in v ? toTrack(v.current) : prev?.current ?? null,
      previous: p ? p.reverse() : prev?.previous ?? [],
      next: n ?? prev?.next ?? [],
    };
    last.set(code, air);
    subs.get(code)?.forEach((f) => f(air));
  }
}

function connect() {
  if (ws || subs.size === 0 || typeof WebSocket === 'undefined') return;
  let sock: WebSocket;
  try {
    sock = new WebSocket(SOCKET);
  } catch {
    return;
  }
  ws = sock;
  sock.onopen = () => {
    retry = 0;
    queue.length = 0; // всё актуальное переподпишем одним сообщением
    const codes = [...subs.keys()];
    if (codes.length) sock.send(JSON.stringify({ fetch: { full: codes }, subscribe: { full: codes } }));
  };
  sock.onmessage = (e) => typeof e.data === 'string' && onData(e.data);
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    if (subs.size === 0) return;
    const delay = Math.min(30000, 2000 * 2 ** retry++);
    retryTimer = setTimeout(connect, delay);
  };
  sock.onerror = () => sock.close();
}

export function subscribeAir(meta: string, cb: Sub) {
  const code = codeOf(meta);
  if (!code) return () => {};
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  let set = subs.get(code);
  const fresh = !set;
  if (!set) {
    set = new Set();
    subs.set(code, set);
  }
  set.add(cb);
  const cached = last.get(code);
  if (cached) cb(cached);
  if (!ws) connect();
  else if (fresh) send({ fetch: { full: [code] }, subscribe: { full: [code] } });

  return () => {
    const s = subs.get(code);
    if (!s) return;
    s.delete(cb);
    if (s.size) return;
    subs.delete(code);
    if (ws?.readyState === WebSocket.OPEN) send({ unsubscribe: [code] });
    if (subs.size === 0) {
      // закрываем с задержкой: при переходе между страницами подписки сразу возвращаются
      idleTimer = setTimeout(() => {
        if (subs.size) return;
        if (retryTimer) clearTimeout(retryTimer);
        const s2 = ws;
        ws = null;
        s2?.close();
      }, 5000);
    }
  };
}

export function useAir(url: string | null | undefined, enabled = true) {
  const [state, setState] = useState<{ url: string; air: Air } | null>(null);
  useEffect(() => {
    if (!url || !enabled) return;
    return subscribeAir(url, (air) => setState({ url, air }));
  }, [url, enabled]);
  return url && enabled && state?.url === url ? state.air : null;
}

export const trackLine = (t: Track | null) => (t ? [t.artist, t.title].filter(Boolean).join(' — ') : '');
