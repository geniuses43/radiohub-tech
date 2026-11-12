import Link from 'next/link';
import { inkOn, type Station } from '@/lib/catalog';
import type { PlayItem } from './player/PlayerProvider';
import { PlayButton } from './player/PlayButton';
import { NowCard } from './LiveAir';
import { StreamStrip, type StripItem } from './StreamStrip';

type Crumb = { href: string; name: string };

export function StationHero({
  station,
  title,
  lead,
  big,
  item,
  crumbs,
  image,
  extra,
  strip,
  actions,
}: {
  station: Station;
  title: string;
  lead?: string;
  /** крупная надпись фоном */
  big?: string;
  item: PlayItem;
  crumbs: Crumb[];
  image?: string | null;
  extra?: React.ReactNode;
  /** эфиры станции (основной + потоки) прямо в шапке */
  strip?: StripItem[];
  /** дополнительные кнопки рядом со «Слушать» */
  actions?: React.ReactNode;
}) {
  const ink = inkOn(station.color);
  return (
    <section className="shero" style={{ '--bg': station.color, '--ink': ink } as React.CSSProperties}>
      <nav className="crumbs" aria-label="Навигация">
        <ol>
          <li>
            <Link href="/">РадиоХаб</Link>
          </li>
          {crumbs.map((c) => (
            <li key={c.href}>
              <Link href={c.href}>{c.name}</Link>
            </li>
          ))}
        </ol>
      </nav>
      {big && (
        <div className="shero__big" aria-hidden>
          {big}
        </div>
      )}
      <div className="shero__grid">
        <div className="shero__main">
          {image && <img src={image} alt="" className="shero__img" width={160} height={160} />}
          <h1 className="shero__title">{title}</h1>
          {lead && <p className="shero__lead">{lead}</p>}
          <div className="shero__actions">
            <PlayButton item={item} className="shero__play" text={{ play: 'Слушать', pause: 'Пауза' }} />
            {actions}
          </div>
          {extra}
        </div>
        <NowCard item={item} fallback={station.name} />
      </div>
      {strip && strip.length > 1 && (
        <div className="shero__strip">
          <StreamStrip items={strip} className="strip--hero" />
        </div>
      )}
    </section>
  );
}
