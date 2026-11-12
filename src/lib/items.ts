import type { PlayItem } from '@/components/player/PlayerProvider';
import type { City, Episode, Show, SideStream, Station } from './catalog';

export const liveItem = (s: Station): PlayItem => ({
  key: `live:${s.slug}`,
  kind: 'live',
  title: s.name,
  stream: s.stream,
  meta: s.meta,
  color: s.color,
  art: s.tile,
  href: `/station/${s.slug}/`,
});

export const sideItem = (s: Station, x: SideStream): PlayItem => ({
  key: `live:${s.slug}/${x.slug}`,
  kind: 'live',
  title: s.name,
  subtitle: x.name,
  stream: x.stream,
  meta: x.meta,
  color: s.color,
  art: x.image || x.logo || s.tile,
  href: `/station/${s.slug}/${x.slug}/`,
});

export const cityItem = (s: Station, c: City): PlayItem => ({
  key: `live:${s.slug}/city/${c.slug}`,
  kind: 'live',
  title: s.name,
  subtitle: c.name,
  stream: c.stream,
  meta: c.meta,
  color: s.color,
  art: s.tile,
  href: `/station/${s.slug}/city/${c.slug}/`,
});

export const episodeItem = (sh: Show, e: Episode, color: string): PlayItem => ({
  key: `ep:${e.id}`,
  kind: 'episode',
  title: sh.name,
  subtitle: e.name,
  stream: e.audio,
  color,
  art: e.image || sh.cover,
  href: `/podcasts/${sh.slug}/`,
});
