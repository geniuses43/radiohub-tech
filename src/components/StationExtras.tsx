import Link from 'next/link';
import { plural, showsOf, type Station } from '@/lib/catalog';
import { board } from '@/lib/board';
import { StationBoard } from './StationBoard';

/** Низ страницы станции и городского эфира: подкасты, городские эфиры, другие станции */
export function StationExtras({ s }: { s: Station; currentCity?: string }) {
  const own = showsOf(s.id);
  return (
    <div className="page">
      {own.length > 0 && (
        <section className="section section--slim" aria-labelledby="h-pods">
          <h2 id="h-pods" className="slim-h">
            Подкасты
          </h2>
          <ul className="covers">
            {own.map((sh) => (
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
      )}

      <section className="section section--slim" aria-labelledby="h-other">
        <h2 id="h-other" className="slim-h">
          Другие станции
        </h2>
        <StationBoard list={board(s.id)} compact />
      </section>
    </div>
  );
}
