'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { androidIntent, asset } from '@/lib/site';

const KEY = 'rh:bannerHiddenUntil';
const BOTS = /Googlebot|YandexBot|bingbot|AhrefsBot|SemrushBot|Lighthouse|HeadlessChrome/i;

/**
 * Баннер «Открыть в приложении» для Android (на iOS это делает системный Smart App Banner
 * через meta apple-itunes-app). Встроен в поток страницы сверху, ничего не перекрывает.
 * ?rhb=1 — показать на любом устройстве, ?rhb=0 — спрятать.
 */
export function SmartBanner() {
  const path = usePathname() || '/';
  const [show, setShow] = useState(false);

  useEffect(() => {
    const force = /[?&]rhb=([01])/.exec(location.search);
    if (force) return setShow(force[1] === '1');
    const ua = navigator.userAgent;
    if (!/Android/i.test(ua) || BOTS.test(ua)) return;
    if (matchMedia('(display-mode: standalone)').matches) return;
    try {
      const until = Number(localStorage.getItem(KEY));
      if (until && Date.now() < until) return;
    } catch {}
    setShow(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('has-banner', show);
  }, [show]);

  if (!show) return null;

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, String(Date.now() + 14 * 864e5));
    } catch {}
  };

  return (
    <div className="sbanner" role="complementary" aria-label="Приложение РадиоХаб">
      <button type="button" className="sbanner__close" onClick={close} aria-label="Закрыть">
        ×
      </button>
      <img src={asset('/app-icon.png')} alt="" width={44} height={44} className="sbanner__icon" />
      <div className="sbanner__text">
        <b>РадиоХаб</b>
        <span>8 станций в одном приложении</span>
      </div>
      <a className="sbanner__cta" href={androidIntent(path)}>
        Открыть
      </a>
    </div>
  );
}
