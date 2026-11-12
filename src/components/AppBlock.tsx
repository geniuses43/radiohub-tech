import QRCode from 'qrcode';
import { STORE, withUtm } from '@/lib/site';

async function qrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
}

export function StoreLinks({ medium }: { medium: string }) {
  return (
    <div className="stores">
      <a className="store" href={withUtm(STORE.appStore, medium)} rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden className="ico">
          <path
            fill="currentColor"
            d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.9-1.1-2.9-4.3zM13.9 5.3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"
          />
        </svg>
        <span>
          <small>Загрузите в</small>App Store
        </span>
      </a>
      <a className="store" href={withUtm(STORE.googlePlay, medium)} rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden className="ico">
          <path fill="currentColor" d="M4 2.8v18.4c0 .4.4.7.8.5l10.4-9.7L4.8 2.3c-.4-.2-.8.1-.8.5zm12.6 7.8L6.9 2.9l11.2 6.2-1.5 1.5zm0 2.8 1.5 1.5-11.2 6.2 9.7-7.7zm2.8-3.5 2.2 1.2c.6.4.6 1.3 0 1.7l-2.2 1.2-1.9-2 1.9-2.1z" />
        </svg>
        <span>
          <small>Доступно в</small>Google Play
        </span>
      </a>
      <a className="store" href={withUtm(STORE.ruStore, medium)} rel="noopener">
        <svg viewBox="0 0 24 24" aria-hidden className="ico">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
          <path d="M8 16V8h4.2a2.4 2.4 0 0 1 .5 4.7L15.5 16H13l-2.5-3.1H10V16H8zm2-4.8h2a.9.9 0 0 0 0-1.8h-2v1.8z" fill="var(--store-bg, #000)" />
        </svg>
        <span>
          <small>Скачайте из</small>RuStore
        </span>
      </a>
    </div>
  );
}

export async function AppBlock({ heading = 'РадиоХаб в телефоне' }: { heading?: string }) {
  const svg = await qrSvg('https://radiohub.tech/app/?utm_source=radiohub.tech&utm_medium=qr');
  return (
    <section className="appblock" aria-labelledby="app-h">
      <div className="appblock__text">
        <h2 id="app-h">{heading}</h2>
        <p>
          Все восемь станций, тематические потоки и подкасты в одном приложении. Играет в фоне и на заблокированном экране.
          Бесплатно и без регистрации.
        </p>
        <StoreLinks medium="app_block" />
      </div>
      <figure className="appblock__qr">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption>Наведите камеру телефона, чтобы скачать</figcaption>
      </figure>
    </section>
  );
}
