import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StationHero } from '@/components/StationHero';
import { StreamStrip } from '@/components/StreamStrip';
import { stationBySlug, stations } from '@/lib/catalog';
import { cityItem, sideItem } from '@/lib/items';
import { StationExtras } from '@/components/StationExtras';
import { VideoEmbed } from '@/components/VideoEmbed';
import { absUrl } from '@/lib/site';

type P = { params: Promise<{ slug: string; city: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return stations.flatMap((s) => s.cities.filter((c) => c.page).map((c) => ({ slug: s.slug, city: c.slug })));
}

function find(slug: string, city: string) {
  const s = stationBySlug(slug);
  const c = s?.cities.find((x) => x.slug === city && x.page);
  return s && c ? { s, c } : null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, city } = await params;
  const f = find(slug, city);
  if (!f) return {};
  const { s, c } = f;
  const path = `/station/${s.slug}/city/${c.slug}/`;
  const title = `${s.name}, ${c.name} — слушать онлайн`;
  const description = `${s.name} (${c.name}): городской эфир онлайн бесплатно. Что играет сейчас и что играло.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    itunes: { appId: '6761184795', appArgument: absUrl(path) },
    openGraph: { title, description, url: path, images: s.tile ? [{ url: s.tile }] : [] },
  };
}

export default async function CityPage({ params }: P) {
  const { slug, city } = await params;
  const f = find(slug, city);
  if (!f) notFound();
  const { s, c } = f;
  const item = cityItem(s, c);
  const here = stations
    .filter((x) => x.id !== s.id)
    .map((x) => ({ x, c: x.cities.find((y) => y.slug === c.slug) }))
    .filter((r): r is { x: typeof s; c: NonNullable<typeof r.c> } => !!r.c && r.c.stream !== r.x.stream);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RadioStation',
    name: `${s.name} — ${c.name}`,
    url: absUrl(`/station/${s.slug}/city/${c.slug}/`),
    areaServed: { '@type': 'City', name: c.name },
    parentOrganization: { '@type': 'Organization', name: 'Европейская медиагруппа' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StationHero
        station={s}
        title={`${s.name} — ${c.name}`}
        big={c.name}
        strip={[
          { name: 'Эфир города', image: s.tile, item },
          ...s.sides.map((y) => ({ name: y.name, image: y.image || y.logo, item: sideItem(s, y) })),
        ]}
        actions={s.video ? <VideoEmbed src={s.video} station={s.name} color={s.color} href={`/station/${s.slug}/`} /> : null}
        item={item}
        crumbs={[
          { href: `/station/${s.slug}/`, name: s.name },
          { href: item.href, name: c.name },
        ]}
      />
      {here.length > 0 && (
        <section className="section" aria-labelledby="h-here">
          <div className="section__head">
            <h2 id="h-here">Ещё в городе {c.name}</h2>
          </div>
          <StreamStrip items={here.map(({ x, c: xc }) => ({ name: x.name, image: x.tile, item: cityItem(x, xc) }))} className="strip--wrap" />
        </section>
      )}
      <StationExtras s={s} currentCity={c.slug} />
    </>
  );
}
