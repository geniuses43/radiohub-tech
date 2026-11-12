'use client';

import { useEffect, useState } from 'react';
import { androidIntent, asset, STORE, withUtm } from '@/lib/site';

/** Кнопка «Открыть в приложении»: Android — intent на этот же адрес, iOS — App Store, компьютер — страница приложения */
export function OpenInApp({ path, className = '' }: { path: string; className?: string }) {
  const [href, setHref] = useState(asset('/app/'));
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) setHref(androidIntent(path, 'open_in_app'));
    else if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
      setHref(withUtm(STORE.appStore, 'open_in_app'));
  }, [path]);
  return (
    <a href={href} className={`btn btn--ghost ${className}`}>
      <span className="lbl-full">Открыть в приложении</span>
      <span className="lbl-short">В приложении</span>
    </a>
  );
}
