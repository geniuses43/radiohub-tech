'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePlayer } from './player/PlayerProvider';

/** Трансляция из студии: мини-плеер в углу, живёт при переходах по сайту и не перекрывает его */
export function VideoDock() {
  const { video, closeVideo } = usePlayer();
  const [big, setBig] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('has-video', !!video);
    if (!video) setBig(false);
  }, [video]);
  if (!video) return null;
  return (
    <aside className={`vdock ${big ? 'vdock--big' : ''}`} style={{ '--st': video.color } as React.CSSProperties} aria-label="Трансляция из студии">
      <div className="vdock__bar">
        <span className="vdock__live" aria-hidden />
        <Link href={video.href} className="vdock__title">
          Трансляция из студии · {video.station}
        </Link>
        <button type="button" onClick={() => setBig((b) => !b)} aria-label={big ? 'Уменьшить' : 'Увеличить'}>
          <svg viewBox="0 0 24 24" className="ico" aria-hidden>
            {big ? (
              <path d="M10 4v6H4M14 20v-6h6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M4 10V4h6M20 14v6h-6" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
        <button type="button" onClick={closeVideo} aria-label="Закрыть трансляцию">
          <svg viewBox="0 0 24 24" className="ico" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="vdock__frame">
        <iframe src={video.src} title={`Трансляция из студии ${video.station}`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" />
      </div>
    </aside>
  );
}
