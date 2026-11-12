'use client';

import { usePlayer } from './player/PlayerProvider';

/** Кнопка «Трансляция из студии»: открывает мини-плеер, радио встаёт на паузу */
export function VideoEmbed({ src, station, color, href }: { src: string; station: string; color: string; href: string }) {
  const { openVideo, video } = usePlayer();
  const on = video?.src === src;
  return (
    <button type="button" className={`btn btn--ghost vbtn ${on ? 'is-on' : ''}`} onClick={() => openVideo({ src, station, color, href })} disabled={on}>
      <span className="vbtn__dot" aria-hidden />
      <span className="lbl-full">{on ? 'Трансляция идёт' : 'Трансляция из студии'}</span>
      <span className="lbl-short">{on ? 'Идёт' : 'Из студии'}</span>
    </button>
  );
}
