import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StationHero } from '@/components/StationHero';
import { VideoEmbed } from '@/components/VideoEmbed';
import { StationExtras } from '@/components/StationExtras';
import { plural, stationBySlug, stations } from '@/lib/catalog';
import { liveItem, sideItem } from '@/lib/items';
import { absUrl } from '@/lib/site';

type P = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return stations.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = stationBySlug((await params).slug);
  if (!s) return {};
  const path = `/station/${s.slug}/`;
  const title = `${s.name} — слушать онлайн`;
  const description = `${s.name} в прямом эфире бесплатно и без регистрации. Что играет сейчас и что играло${
    s.sides.length ? `, ${s.sides.length} ${plural(s.sides.length, 'тематический поток', 'тематических потока', 'тематических потоков')}` : ''
  }${s.cities.length > 1 ? `, городские эфиры` : ''}.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    itunes: { appId: '6761184795', appArgument: absUrl(path) },
    openGraph: { title, description, url: path, images: s.tile ? [{ url: s.tile, width: 1000, height: 1000 }] : [] },
  };
}

export default async function StationPage({ params }: P) {
  const s = stationBySlug((await params).slug);
  if (!s) notFound();
  const item = liveItem(s);
  const strip = [
    { name: 'Основной эфир', image: s.tile, item },
    ...s.sides.map((x) => ({ name: x.name, image: x.image || x.logo, item: sideItem(s, x) })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RadioStation',
    name: s.name,
    url: absUrl(`/station/${s.slug}/`),
    image: s.tile ? absUrl(s.tile) : undefined,
    parentOrganization: { '@type': 'Organization', name: 'Европейская медиагруппа' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StationHero
        station={s}
        title={s.name}
        item={item}
        crumbs={[{ href: `/station/${s.slug}/`, name: s.name }]}
        strip={strip}
        actions={s.video ? <VideoEmbed src={s.video} station={s.name} color={s.color} href={`/station/${s.slug}/`} /> : null}
      />

      <StationExtras s={s} />
    </>
  );
}
