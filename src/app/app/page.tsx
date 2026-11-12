import type { Metadata } from 'next';
import { AppBlock } from '@/components/AppBlock';
import { StoreRedirect } from '@/components/StoreRedirect';
import { stations } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Приложение РадиоХаб для iPhone и Android',
  description:
    'Европа Плюс, Дорожное Радио, Ретро FM, Радио 7, Новое Радио, Studio 21, Калина Красная и Эльдорадио в одном приложении. Скачайте бесплатно в App Store, Google Play и RuStore.',
  alternates: { canonical: '/app/' },
};

export default function AppPage() {
  return (
    <div className="apppage">
      <StoreRedirect />
      <header className="apppage__head">
        <h1>Все станции в одном приложении</h1>
        <ul className="apppage__logos">
          {stations.map((s) => (
            <li key={s.id}>{s.tile && <img src={s.tile} alt={s.name} width={120} height={120} />}</li>
          ))}
        </ul>
      </header>
      <AppBlock heading="Скачайте РадиоХаб" />
    </div>
  );
}
