'use client';

import { useEffect, useState } from 'react';
import { useAir, type Track } from '@/lib/nowPlaying';
import { usePlayer, useIsActive, type PlayItem } from './player/PlayerProvider';
import { PlayIcon } from './player/PlayButton';
import { useCity } from './city/CityProvider';

const hhmm = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

/** Карточка «сейчас в эфире» для героя станции/потока/города */
export function NowCard({ item, fallback }: { item: PlayItem; fallback: string }) {
  const { localize } = useCity();
  const air = useAir(localize(item).meta ?? null);
  const live = air?.current;
  const cur = live ?? air?.previous?.[0] ?? null;
  const next = air?.next?.[0];
  return (
    <div className="now" aria-live="polite">
      <div className="now__cover">{cur?.cover ? <img src={cur.cover} alt="" width={300} height={300} /> : <span>{fallback}</span>}</div>
      <div className="now__text">
        <span className="now__label">{live ? 'Сейчас в эфире' : cur ? 'Только что играло' : air ? 'В эфире ведущие' : 'Подключаемся к эфиру'}</span>
        {cur && (
          <>
            <b className="now__title">{cur.title}</b>
            <span className="now__artist">{cur.artist}</span>
          </>
        )}
        {next && (
          <span className="now__next">
            Дальше: {next.artist} — {next.title}
          </span>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ t, base }: { t: Track; base: Omit<PlayItem, 'key' | 'kind' | 'stream' | 'subtitle'> }) {
  const { toggle } = usePlayer();
  const item: PlayItem | null = t.hook
    ? { ...base, key: `hook:${t.hook}`, kind: 'preview', stream: t.hook, subtitle: `${t.artist} — ${t.title}`, art: t.cover || base.art }
    : null;
  const { playing, loading } = useIsActive(item?.key ?? '-');
  return (
    <li className="hist__row">
      <time className="hist__time">{hhmm(t.startTime)}</time>
      {t.cover ? <img src={t.cover} alt="" width={56} height={56} loading="lazy" /> : <span className="hist__blank" />}
      <span className="hist__text">
        <b>{t.title}</b>
        <span>{t.artist}</span>
      </span>
      {item && (
        <button
          type="button"
          className={`hist__play ${playing ? 'is-playing' : ''}`}
          onClick={() => toggle(item)}
          aria-label={`${playing ? 'Остановить' : 'Послушать фрагмент'}: ${t.artist} — ${t.title}`}
        >
          <PlayIcon playing={playing && !loading} loading={loading} />
        </button>
      )}
    </li>
  );
}

/** «Что играло»: последние треки с превью-фрагментами */
export function AirHistory({ meta, base, limit = 12 }: { meta: string | null; base: Omit<PlayItem, 'key' | 'kind' | 'stream' | 'subtitle'>; limit?: number }) {
  const air = useAir(meta);
  const [more, setMore] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!air) {
    return <p className="hist__empty">{ready ? 'История эфира сейчас недоступна.' : 'Загружаем историю эфира…'}</p>;
  }
  const list = air.previous;
  if (!list.length) return <p className="hist__empty">История эфира пока пуста.</p>;
  const shown = more ? list : list.slice(0, limit);
  return (
    <>
      <ol className="hist">
        {shown.map((t, i) => (
          <HistoryRow key={`${t.startTime}-${i}`} t={t} base={base} />
        ))}
      </ol>
      {list.length > limit && (
        <button type="button" className="more" onClick={() => setMore((m) => !m)}>
          {more ? 'Свернуть' : `Показать все ${list.length}`}
        </button>
      )}
    </>
  );
}
