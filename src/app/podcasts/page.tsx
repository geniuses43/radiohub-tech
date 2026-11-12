import type { Metadata } from 'next';
import Link from 'next/link';
import { inkOn, plural, shows, stations } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Подкасты радиостанций: слушать онлайн',
  description:
    'Подкасты Европы Плюс, Дорожного Радио, Ретро FM, Радио 7, Нового Радио, Studio 21 и Эльдорадио: шоу, интервью и программы. Свежие выпуски онлайн.',
  alternates: { canonical: '/podcasts/' },
};

export default function Podcasts() {
  const groups = stations.map((s) => ({ s, list: shows.filter((x) => x.stationId === s.id) })).filter((g) => g.list.length);
  return (
    <div className="page page--plain">
      <header className="plainhead">
        <h1>Подкасты</h1>
        <p>
          {shows.length} шоу от ведущих станций РадиоХаба. Выпуски играют прямо на сайте, а полный архив есть в приложении.
        </p>
        <nav className="tabs" aria-label="Станции">
          {groups.map(({ s }) => (
            <a key={s.id} href={`#${s.slug}`} style={{ '--st': s.color, '--st-ink': inkOn(s.color) } as React.CSSProperties}>
              {s.name}
            </a>
          ))}
        </nav>
      </header>
      {groups.map(({ s, list }) => (
        <section key={s.id} id={s.slug} className="section" aria-labelledby={`h-${s.slug}`}>
          <div className="section__head">
            <h2 id={`h-${s.slug}`}>{s.name}</h2>
            <p>
              {list.length} {plural(list.length, 'шоу', 'шоу', 'шоу')}
            </p>
          </div>
          <ul className="covers">
            {list.map((sh) => (
              <li key={sh.id}>
                <Link href={`/podcasts/${sh.slug}/`} className="cover">
                  {sh.cover && <img src={sh.cover} alt="" width={320} height={320} loading="lazy" />}
                  <b>{sh.name}</b>
                  <span>
                    {sh.total} {plural(sh.total, 'выпуск', 'выпуска', 'выпусков')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
