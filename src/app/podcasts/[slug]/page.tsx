import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayButton } from '@/components/player/PlayButton';
import { OpenInApp } from '@/components/OpenInApp';
import { Expandable } from '@/components/Expandable';
import { dateRu, duration, inkOn, plural, showBySlug, shows, stationById, stripHtml } from '@/lib/catalog';
import { episodeItem } from '@/lib/items';
import { absUrl } from '@/lib/site';

type P = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return shows.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const sh = showBySlug((await params).slug);
  if (!sh) return {};
  const st = stationById(sh.stationId);
  const path = `/podcasts/${sh.slug}/`;
  const title = `${sh.name} — подкаст ${st?.name ?? ''}`.trim();
  const description = (stripHtml(sh.description).split('\n')[0] || `Подкаст ${sh.name}`).slice(0, 220);
  return {
    title,
    description,
    alternates: { canonical: path },
    itunes: { appId: '6761184795', appArgument: absUrl(path) },
    openGraph: { title, description, url: path, images: sh.cover ? [{ url: sh.cover }] : [] },
  };
}

export default async function ShowPage({ params }: P) {
  const sh = showBySlug((await params).slug);
  if (!sh) notFound();
  const st = stationById(sh.stationId);
  const color = st?.color ?? '#000000';
  const ink = inkOn(color);
  const desc = stripHtml(sh.description);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: sh.name,
    url: absUrl(`/podcasts/${sh.slug}/`),
    description: desc.slice(0, 500),
    image: sh.cover ? absUrl(sh.cover) : undefined,
    publisher: st ? { '@type': 'Organization', name: st.name } : undefined,
    episode: sh.episodes.slice(0, 10).map((e) => ({
      '@type': 'PodcastEpisode',
      name: e.name,
      datePublished: e.date ?? undefined,
      associatedMedia: { '@type': 'MediaObject', contentUrl: e.audio },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="phero" style={{ '--bg': color, '--ink': ink } as React.CSSProperties}>
        <nav className="crumbs" aria-label="Навигация">
          <ol>
            <li>
              <Link href="/">РадиоХаб</Link>
            </li>
            <li>
              <Link href="/podcasts/">Подкасты</Link>
            </li>
            <li>
              <Link href={`/podcasts/${sh.slug}/`}>{sh.name}</Link>
            </li>
          </ol>
        </nav>
        <div className="phero__grid">
          {sh.cover && <img src={sh.cover} alt="" className="phero__cover" width={480} height={480} />}
          <div>
            {st && (
              <Link href={`/station/${st.slug}/`} className="phero__station">
                {st.name}
              </Link>
            )}
            <h1 className="phero__title">{sh.name}</h1>
            <p className="phero__count">
              {sh.total} {plural(sh.total, 'выпуск', 'выпуска', 'выпусков')}
            </p>
            <div className="shero__actions">
              {sh.episodes[0] && (
                <PlayButton item={episodeItem(sh, sh.episodes[0], color)} className="shero__play" text={{ play: 'Последний выпуск', pause: 'Пауза' }} />
              )}
              <OpenInApp path={`/podcasts/${sh.slug}/`} />
            </div>
          </div>
        </div>
      </section>

      <div className="page">
        {desc && (
          <section className="section section--narrow">
            <Expandable text={desc} />
          </section>
        )}
        <section className="section" aria-labelledby="h-eps">
          <div className="section__head">
            <h2 id="h-eps">Выпуски</h2>
            {sh.total > sh.episodes.length && (
              <p>
                Здесь последние {sh.episodes.length}. Все {sh.total} {plural(sh.total, 'выпуск', 'выпуска', 'выпусков')} есть в приложении.
              </p>
            )}
          </div>
          <ol className="eps">
            {sh.episodes.map((e) => (
              <li key={e.id} className="ep">
                <PlayButton item={episodeItem(sh, e, color)} className="ep__play" />
                <div className="ep__text">
                  <b>{e.name}</b>
                  <span>{[dateRu(e.date), duration(e.duration)].filter(Boolean).join(', ')}</span>
                  {(() => {
                    const t = stripHtml(e.text);
                    return t && t !== e.name ? <p>{t.slice(0, 220)}</p> : null;
                  })()}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
