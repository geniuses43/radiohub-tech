'use client';

import Link from 'next/link';
import { useAir } from '@/lib/nowPlaying';
import { usePlayer, useIsActive, type PlayItem } from './player/PlayerProvider';
import { PlayIcon } from './player/PlayButton';
import { useCity } from './city/CityProvider';

export type BoardStation = {
  slug: string;
  name: string;
  color: string;
  ink: string;
  logo: string | null;
  item: PlayItem;
  streams: { name: string; image: string | null; item: PlayItem }[];
  extra: string;
};

function Eq() {
  return (
    <span className="eq" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

function StreamTile({ s }: { s: BoardStation['streams'][number] }) {
  const { toggle } = usePlayer();
  const { playing, loading } = useIsActive(s.item.key);
  return (
    <li>
      <button
        type="button"
        className={`stile ${playing ? 'is-playing' : ''}`}
        onClick={() => toggle(s.item)}
        aria-label={`${playing ? 'Пауза' : 'Слушать'}: ${s.item.title}, ${s.name}`}
        aria-pressed={playing}
        title={s.name}
      >
        {s.image ? <img src={s.image} alt="" width={64} height={64} loading="lazy" /> : <span>{s.name}</span>}
        {playing && <span className="stile__on">{loading ? '…' : <Eq />}</span>}
      </button>
    </li>
  );
}

function Card({ st, compact }: { st: BoardStation; compact?: boolean }) {
  const { toggle, item, status } = usePlayer();
  const { localize } = useCity();
  const local = localize(st.item);
  const air = useAir(local.meta);
  const cur = air?.current ?? air?.previous?.[0] ?? null;
  const mainOn = item?.key === st.item.key && (status === 'playing' || status === 'loading');
  // играет любой эфир этой станции: основной, поток или город
  const anyOn = !!item && item.kind === 'live' && item.key.startsWith(st.item.key) && (status === 'playing' || status === 'loading');
  const loading = item?.key === st.item.key && status === 'loading';
  return (
    <li className={`card ${anyOn ? 'is-on' : ''}`} style={{ '--bg': st.color, '--ink': st.ink } as React.CSSProperties}>
      <div className="card__top">
        <Link href={st.item.href} className="card__name">
          {st.name}
          {local.subtitle && <small className="card__city">{local.subtitle}</small>}
        </Link>
        <button
          type="button"
          className="card__play"
          onClick={() => toggle(st.item)}
          aria-label={`${mainOn ? 'Пауза' : 'Слушать'}: ${st.name}`}
          aria-pressed={mainOn}
        >
          <PlayIcon playing={mainOn && !loading} loading={loading} />
        </button>
      </div>
      <div className="card__now">
        {cur ? (
          <>
            {cur.cover ? <img src={cur.cover} alt="" width={44} height={44} loading="lazy" /> : <span className="card__blank" />}
            <span>
              <b>{cur.title}</b>
              <span>{cur.artist}</span>
            </span>
          </>
        ) : (
          <span className="card__wait">{air ? 'В эфире ведущие' : 'Подключаемся к эфиру'}</span>
        )}
      </div>
      {!compact && st.streams.length > 0 && (
        <ul className="card__streams" aria-label={`Потоки ${st.name}`}>
          {st.streams.map((s) => (
            <StreamTile key={s.item.key} s={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function StationBoard({ list, compact = false }: { list: BoardStation[]; compact?: boolean }) {
  return (
    <ul className={`board ${compact ? 'board--compact' : ''}`}>
      {list.map((st) => (
        <Card key={st.slug} st={st} compact={compact} />
      ))}
    </ul>
  );
}
