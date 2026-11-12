import type { MetadataRoute } from 'next';
import { absUrl, BASE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (BASE) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
