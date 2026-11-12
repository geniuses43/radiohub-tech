import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StationHero } from '@/components/StationHero';
import { StationExtras } from '@/components/StationExtras';
import { stationBySlug, stations } from '@/lib/catalog';
import { liveItem, sideItem } from '@/lib/items';
import { absUrl } from '@/lib/site';

type P = { params: Promise<{ slug: string; stream: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return stations.flatMap((s) => s.sides.map((x) => ({ slug: s.slug, stream: x.slug })));
}

function find(slug: string, stream: string) {
  const s = stationBySlug(slug);
  const x = s?.sides.find((y) => y.slug === stream);
  return s && x ? { s, x } : null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, stream } = await params;
  const f = find(slug, stream);
  if (!f) return {};
  const { s, x } = f;
  const path = `/station/${s.slug}/${x.slug}/`;
  const name = x.name.startsWith(s.name) ? x.name : `${s.name} ${x.name}`;
  const title = `${name} — слушать онлайн`;
  const description = `Поток «${x.name}» радиостанции ${s.name}: слушайте онлайн бесплатно, смотрите, что играет сейчас и что играло.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    itunes: { appId: '6761184795', appArgument: absUrl(path) },
    openGraph: { title, description, url: path, images: x.image ? [{ url: x.image }] : [] },
  };
}

export default async function StreamPage({ params }: P) {
  const { slug, stream } = await params;
  const f = find(slug, stream);
  if (!f) notFound();
  const { s, x } = f;
  const item = sideItem(s, x);
  const name = x.name.startsWith(s.name) ? x.name : `${s.name} ${x.name}`;
  return (
    <>
      <StationHero
        station={s}
        title={name}
        big={x.name}
        item={item}
        image={x.image || x.logo}
        strip={[
          { name: 'Основной эфир', image: s.tile, item: liveItem(s) },
          ...s.sides.map((y) => ({ name: y.name, image: y.image || y.logo, item: sideItem(s, y) })),
        ]}
        crumbs={[
          { href: `/station/${s.slug}/`, name: s.name },
          { href: item.href, name: x.name },
        ]}
      />
      <StationExtras s={s} />
    </>
  );
}
