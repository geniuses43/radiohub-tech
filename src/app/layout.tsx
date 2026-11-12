import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { PlayerProvider, type LiveStation } from '@/components/player/PlayerProvider';
import { PlayerBar } from '@/components/player/PlayerBar';
import { CityProvider } from '@/components/city/CityProvider';
import { VideoDock } from '@/components/VideoDock';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SmartBanner } from '@/components/SmartBanner';
import { stations } from '@/lib/catalog';
import { IOS_APP_ID, SITE_NAME, SITE_URL } from '@/lib/site';
import { liveItem, sideItem } from '@/lib/items';
import './globals.css';

const wix = localFont({
  src: [
    { path: '../fonts/WixMadeforDisplay-Regular.woff2', weight: '400' },
    { path: '../fonts/WixMadeforDisplay-Medium.woff2', weight: '500' },
    { path: '../fonts/WixMadeforDisplay-SemiBold.woff2', weight: '600' },
    { path: '../fonts/WixMadeforDisplay-Bold.woff2', weight: '700' },
    { path: '../fonts/WixMadeforDisplay-ExtraBold.woff2', weight: '800' },
  ],
  variable: '--font',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'РадиоХаб — слушать радио онлайн: Европа Плюс, Дорожное, Ретро FM и ещё 5 станций',
    template: '%s · РадиоХаб',
  },
  description:
    'Европа Плюс, Дорожное Радио, Ретро FM, Радио 7, Новое Радио, Studio 21, Калина Красная и Эльдорадио в прямом эфире. Что играет сейчас, тематические потоки, региональные эфиры и подкасты. Бесплатно и без регистрации.',
  applicationName: SITE_NAME,
  icons: { icon: '/app-icon.png', apple: '/app-icon.png' },
  itunes: { appId: IOS_APP_ID },
  openGraph: { siteName: SITE_NAME, locale: 'ru_RU', type: 'website' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const live: LiveStation[] = stations.map((s) => ({
    slug: s.slug,
    name: s.name,
    items: [
      { name: 'Основной эфир', image: s.tile, item: liveItem(s) },
      ...s.sides.map((x) => ({ name: x.name, image: x.image || x.logo, item: sideItem(s, x) })),
    ],
  }));
  return (
    <html lang="ru" className={wix.variable}>
      <body>
        <CityProvider>
        <PlayerProvider stations={live}>
          <SmartBanner />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <VideoDock />
          <PlayerBar />
        </PlayerProvider>
        </CityProvider>
      </body>
    </html>
  );
}
