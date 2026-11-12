'use client';

import { usePlayer, useIsActive, type PlayItem } from './player/PlayerProvider';

export type StripItem = { name: string; image: string | null; item: PlayItem };

function Sw({ it }: { it: StripItem }) {
  const { toggle } = usePlayer();
  const { on, playing } = useIsActive(it.item.key);
  return (
    <li>
      <button
        type="button"
        className={`sw ${on ? 'is-on' : ''} ${playing ? 'is-playing' : ''}`}
        onClick={() => toggle(it.item)}
        aria-pressed={playing}
        aria-label={`${playing ? 'Пауза' : 'Слушать'}: ${it.name}`}
      >
        {it.image ? <img src={it.image} alt="" width={64} height={64} loading="lazy" /> : <span className="sw__blank" />}
        <span>{it.name}</span>
      </button>
    </li>
  );
}

/** Ряд эфиров станции: основной и тематические потоки, нажатие включает */
export function StreamStrip({ items, className = '' }: { items: StripItem[]; className?: string }) {
  return (
    <ul className={`strip ${className}`}>
      {items.map((x) => (
        <Sw key={x.item.key} it={x} />
      ))}
    </ul>
  );
}
