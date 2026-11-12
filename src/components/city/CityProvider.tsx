'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PlayItem } from '../player/PlayerProvider';
import { asset } from '@/lib/site';

/**
 * Город слушателя — один на весь сайт. От него зависят только основные эфиры станций
 * (у многих городов свой поток); тематические потоки и подкасты везде одинаковые.
 * Без города играет федеральный эфир.
 *
 * Флоу: при первом входе угадываем город по IP и спрашиваем «Ваш город — X?» ненавязчивой
 * подсказкой у кнопки города в шапке. Ответ (или закрытие) запоминаем — больше не спрашиваем.
 */

export type CityRec = { s: string; n: string; a: number; o: number; x: Record<string, [string, string | null]> };

type Ctx = {
  city: CityRec | null;
  /** показать подсказку «Ваш город — …?» */
  prompt: { guess: CityRec | null } | null;
  ready: boolean;
  setCity: (c: CityRec | null) => void;
  dismissPrompt: () => void;
  loadCities: () => Promise<CityRec[]>;
  nearest: (lat: number, lon: number, maxKm?: number) => Promise<CityRec | null>;
  /** основной эфир станции → эфир выбранного города (ключ не меняется) */
  localize: (it: PlayItem) => PlayItem;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
};

const CityCtx = createContext<Ctx | null>(null);
export const useCity = () => {
  const c = useContext(CityCtx);
  if (!c) throw new Error('useCity вне CityProvider');
  return c;
};

const KEY = 'rh:city';
const ASKED = 'rh:cityAsked';

let citiesP: Promise<CityRec[]> | null = null;
const loadCities = () =>
  (citiesP ??= fetch(asset('/geo/cities.json'))
    .then((r) => (r.ok ? (r.json() as Promise<CityRec[]>) : []))
    .catch(() => {
      citiesP = null;
      return [];
    }));

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const x = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

async function nearest(lat: number, lon: number, maxKm = 80) {
  const list = await loadCities();
  let best: CityRec | null = null;
  let d = Infinity;
  for (const c of list) {
    const k = km(lat, lon, c.a, c.o);
    if (k < d) {
      d = k;
      best = c;
    }
  }
  return best && d <= maxKm ? best : null;
}

/** Город по IP: get.geojs.io (бесплатно, без ключа). Не вышло за 4 секунды — значит, без догадки. */
async function guessByIp(): Promise<CityRec | null> {
  try {
    const cached = sessionStorage.getItem('rh:ipGuess');
    if (cached) return JSON.parse(cached);
  } catch {}
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    const lat = parseFloat(j.latitude);
    const lon = parseFloat(j.longitude);
    const c = Number.isFinite(lat) && Number.isFinite(lon) ? await nearest(lat, lon, 80) : null;
    try {
      sessionStorage.setItem('rh:ipGuess', JSON.stringify(c));
    } catch {}
    return c;
  } catch {
    return null;
  }
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<CityRec | null>(null);
  const [prompt, setPrompt] = useState<Ctx['prompt']>(null);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let saved: { mode: 'city'; c: CityRec } | { mode: 'federal' } | null = null;
    let asked = false;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      asked = localStorage.getItem(ASKED) === '1';
    } catch {}
    if (saved?.mode === 'city' && saved.c?.s) {
      setCityState(saved.c);
      setReady(true);
      return;
    }
    if (saved?.mode === 'federal' || asked) {
      setReady(true);
      return;
    }
    // первый вход: угадываем и спрашиваем
    let alive = true;
    guessByIp().then((g) => {
      if (!alive) return;
      if (g) setCityState(g); // догадку применяем сразу, подсказка лишь просит подтвердить
      setPrompt({ guess: g });
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const markAsked = () => {
    try {
      localStorage.setItem(ASKED, '1');
    } catch {}
  };

  const setCity = useCallback((c: CityRec | null) => {
    setCityState(c);
    setPrompt(null);
    markAsked();
    try {
      localStorage.setItem(KEY, JSON.stringify(c ? { mode: 'city', c } : { mode: 'federal' }));
    } catch {}
  }, []);

  const dismissPrompt = useCallback(() => {
    setPrompt(null);
    markAsked();
  }, []);

  const localize = useCallback(
    (it: PlayItem) => {
      if (it.kind !== 'live' || !city) return it;
      const m = /^live:([^/]+)$/.exec(it.key);
      const own = m ? city.x[m[1]] : undefined;
      if (!own) return it;
      return { ...it, stream: own[0], meta: own[1] ?? it.meta, subtitle: city.n };
    },
    [city],
  );

  const value = useMemo<Ctx>(
    () => ({
      city,
      prompt,
      ready,
      setCity,
      dismissPrompt,
      loadCities,
      nearest,
      localize,
      pickerOpen,
      openPicker: () => {
        setPrompt(null);
        markAsked();
        setPickerOpen(true);
      },
      closePicker: () => setPickerOpen(false),
    }),
    [city, prompt, ready, setCity, dismissPrompt, localize, pickerOpen],
  );

  return <CityCtx.Provider value={value}>{children}</CityCtx.Provider>;
}
