import raw from '@data/catalog.json';

export type SideStream = {
  id: string;
  slug: string;
  name: string;
  stream: string;
  meta: string | null;
  logo: string | null;
  image: string | null;
};

export type City = {
  id: string;
  slug: string;
  name: string;
  stream: string;
  meta: string | null;
  lat: number | null;
  lon: number | null;
  /** своя страница: у города свой эфир */
  page: boolean;
};

export type Station = {
  id: string;
  slug: string;
  name: string;
  color: string;
  sortOrder: number;
  stream: string;
  meta: string;
  logo: string | null;
  logoBlack: string | null;
  tile: string | null;
  banner: string | null;
  video: string | null;
  sides: SideStream[];
  cities: City[];
};

export type Episode = {
  id: string;
  name: string;
  duration: number | null;
  date: string | null;
  text: string;
  image: string | null;
  audio: string;
};

export type Show = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover: string | null;
  stationId: string;
  total: number;
  episodes: Episode[];
};

type Catalog = { generatedAt: string; stations: Station[]; shows: Show[] };
const catalog = raw as Catalog;

export const generatedAt = catalog.generatedAt;
export const stations = catalog.stations;
export const shows = catalog.shows;

export const stationBySlug = (slug: string) => stations.find((s) => s.slug === slug);
export const stationById = (id: string) => stations.find((s) => s.id === id);
export const showBySlug = (slug: string) => shows.find((s) => s.slug === slug);
export const showsOf = (stationId: string) => shows.filter((s) => s.stationId === stationId);

/** Цвет текста поверх цвета станции: тёмный на жёлтом/оранжевом/сером, белый на остальных. */
export function inkOn(hex: string) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // контраст с белым vs с чёрным
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#000000';
}

/** Склонение: 1 подкаст, 2 подкаста, 5 подкастов */
export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}

export function duration(sec: number | null) {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dateRu(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const stripHtml = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
