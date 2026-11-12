import type { MetadataRoute } from 'next';
import { generatedAt, shows, stations } from '@/lib/catalog';
import { absUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(generatedAt);
  const u = (p: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly') => ({
    url: absUrl(p),
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    u('/', 1, 'daily'),
    u('/podcasts/', 0.7, 'daily'),
    u('/cities/', 0.6),
    u('/app/', 0.6, 'monthly'),
    ...stations.map((s) => u(`/station/${s.slug}/`, 0.9, 'daily')),
    ...stations.flatMap((s) => s.sides.map((x) => u(`/station/${s.slug}/${x.slug}/`, 0.7))),
    ...shows.map((sh) => u(`/podcasts/${sh.slug}/`, 0.6, 'daily')),
    ...stations.flatMap((s) => s.cities.filter((c) => c.page).map((c) => u(`/station/${s.slug}/city/${c.slug}/`, 0.5, 'monthly'))),
  ];
}
