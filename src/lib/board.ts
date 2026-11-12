import type { BoardStation } from '@/components/StationBoard';
import { inkOn, plural, shows, stations, type Station } from './catalog';
import { liveItem, sideItem } from './items';

/** Данные для карточек станций (главная и «Другие станции») */
export function boardStation(s: Station): BoardStation {
  const ink = inkOn(s.color);
  const nShows = shows.filter((x) => x.stationId === s.id).length;
  const ownCities = s.cities.filter((c) => c.page).length;
  const extra = [
    ownCities ? `${ownCities} ${plural(ownCities, 'городской эфир', 'городских эфира', 'городских эфиров')}` : '',
    nShows ? `${nShows} ${plural(nShows, 'подкаст', 'подкаста', 'подкастов')}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return {
    slug: s.slug,
    name: s.name,
    color: s.color,
    ink,
    logo: ink === '#ffffff' ? s.logo : s.logoBlack,
    item: liveItem(s),
    streams: s.sides.map((x) => ({ name: x.name, image: x.image || x.logo, item: sideItem(s, x) })),
    extra,
  };
}

export const board = (exceptId?: string) => stations.filter((s) => s.id !== exceptId).map(boardStation);
