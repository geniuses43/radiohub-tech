import Link from 'next/link';
import { StationBoard } from '@/components/StationBoard';
import { AppBlock } from '@/components/AppBlock';
import { plural, shows, stationById, stations } from '@/lib/catalog';
import { board } from '@/lib/board';
import { SITE_URL } from '@/lib/site';

export default function Home() {
  const nSides = stations.reduce((n, s) => n + s.sides.length, 0);
  const featuredShows = [...shows].sort((a, b) => (b.episodes[0]?.date ?? '').localeCompare(a.episodes[0]?.date ?? '')).slice(0, 6);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'РадиоХаб',
    url: SITE_URL,
    inLanguage: 'ru',
    publisher: { '@type': 'Organization', name: 'Европейская медиагруппа', url: 'https://emg.fm' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="home" id="stations" aria-labelledby="home-h">
        <div className="home__head">
          <h1 id="home-h">Радио онлайн</h1>
          <p>
            {stations.length} станций и {nSides} {plural(nSides, 'поток', 'потока', 'потоков')} в прямом эфире
          </p>
        </div>
        <StationBoard list={board()} />
      </section>

      <section className="section" aria-labelledby="pc-h">
        <div className="section__head">
          <h2 id="pc-h">Подкасты</h2>
        </div>
        <ul className="covers covers--row">
          {featuredShows.map((sh) => {
            const st = stationById(sh.stationId);
            return (
              <li key={sh.id}>
                <Link href={`/podcasts/${sh.slug}/`} className="cover">
                  {sh.cover && <img src={sh.cover} alt="" width={320} height={320} loading="lazy" />}
                  <b>{sh.name}</b>
                  <span>{st?.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/podcasts/" className="more">
          Все подкасты
        </Link>
      </section>

      <AppBlock />
    </>
  );
}
