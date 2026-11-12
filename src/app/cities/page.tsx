import type { Metadata } from 'next';
import Link from 'next/link';
import { inkOn, plural, stations } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Радио в городах России: городские эфиры онлайн',
  description: 'Где звучат Европа Плюс, Дорожное Радио, Ретро FM, Радио 7, Новое Радио и другие станции РадиоХаба. Слушайте городской эфир онлайн.',
  alternates: { canonical: '/cities/' },
};

export default function Cities() {
  const map = new Map<string, { name: string; list: { st: (typeof stations)[number]; slug: string; page: boolean }[] }>();
  for (const st of stations)
    for (const c of st.cities) {
      const e = map.get(c.slug) ?? { name: c.name, list: [] };
      e.list.push({ st, slug: c.slug, page: c.page });
      map.set(c.slug, e);
    }
  const all = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const letters = new Map<string, typeof all>();
  for (const c of all) {
    const l = c.name[0].toUpperCase();
    letters.set(l, [...(letters.get(l) ?? []), c]);
  }
  return (
    <div className="page page--plain">
      <header className="plainhead">
        <h1>Радио в городах</h1>
        <p>
          {all.length} {plural(all.length, 'город', 'города', 'городов')}, где звучат станции РадиоХаба. Нажмите на станцию, чтобы послушать.
        </p>
        <nav className="letters" aria-label="Буквы">
          {[...letters.keys()].map((l) => (
            <a key={l} href={`#l-${l}`}>
              {l}
            </a>
          ))}
        </nav>
      </header>
      {[...letters.entries()].map(([l, list]) => (
        <section key={l} id={`l-${l}`} className="letter">
          <h2>{l}</h2>
          <ul className="citylist">
            {list.map((c) => (
              <li key={c.name}>
                <b>{c.name}</b>
                <ul className="citylist__st">
                  {c.list.map(({ st, slug, page }) => (
                    <li key={st.id} style={{ '--st': st.color, '--st-ink': inkOn(st.color) } as React.CSSProperties}>
                      <Link href={page ? `/station/${st.slug}/city/${slug}/` : `/station/${st.slug}/`}>
                        {st.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
