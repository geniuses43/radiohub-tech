'use client';

import { useEffect } from 'react';
import { STORE, withUtm } from '@/lib/site';

/** QR-код ведёт на /app/?utm_medium=qr: телефон сразу уходит в свой магазин, остальные видят страницу */
export function StoreRedirect() {
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('utm_medium') !== 'qr') return;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) location.replace(withUtm(STORE.appStore, 'qr'));
    else if (/Android/i.test(ua)) location.replace(withUtm(STORE.googlePlay, 'qr'));
  }, []);
  return null;
}
