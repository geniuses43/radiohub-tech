'use client';

import { usePlayer, useIsActive, type PlayItem } from './PlayerProvider';

export function PlayIcon({ playing, loading }: { playing: boolean; loading?: boolean }) {
  if (loading)
    return (
      <svg viewBox="0 0 24 24" className="ico ico--spin" aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 60" strokeLinecap="round" />
      </svg>
    );
  return playing ? (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden>
      <path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z" fill="currentColor" />
    </svg>
  );
}

type Props = {
  item: PlayItem;
  className?: string;
  label?: string;
  /** подпись рядом с иконкой; без неё кнопка круглая */
  text?: { play: string; pause: string };
};

export function PlayButton({ item, className = '', label, text }: Props) {
  const { toggle } = usePlayer();
  const { playing, loading } = useIsActive(item.key);
  const name = label ?? [item.title, item.subtitle].filter(Boolean).join(', ');
  return (
    <button
      type="button"
      className={`play ${text ? 'play--text' : ''} ${playing ? 'is-playing' : ''} ${className}`}
      onClick={() => toggle(item)}
      aria-label={`${playing ? 'Пауза' : 'Слушать'}: ${name}`}
      aria-pressed={playing}
    >
      <PlayIcon playing={playing && !loading} loading={loading} />
      {text && <span>{playing ? text.pause : text.play}</span>}
    </button>
  );
}
