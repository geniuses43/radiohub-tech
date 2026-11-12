// Снимок каталога РадиоХаба с бэкенда приложения → data/catalog.json + картинки в public/media.
// Запуск: npm run snapshot. Сайт собирается из снимка, поэтому на проде бэкенд не нужен.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.RADIOHUB_API || 'https://back-radiohub.vvdev.ru/api';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'public', 'media');
const EPISODES_PER_SHOW = 24;
mkdirSync(MEDIA, { recursive: true });
mkdirSync(path.join(ROOT, 'data'), { recursive: true });

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((res) => setTimeout(res, 500 * i));
    }
  }
}
const api = (p) => get(API + p);

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

const hasSips = (() => {
  try {
    execFileSync('which', ['sips'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/** Скачивает картинку в public/media, возвращает путь от корня сайта. maxSide — ужать (только если есть sips). */
async function media(url, maxSide) {
  if (!url) return null;
  const ext = (path.extname(new URL(url).pathname) || '.png').toLowerCase();
  const name = createHash('sha1').update(url + (maxSide || '')).digest('hex').slice(0, 16) + ext;
  const file = path.join(MEDIA, name);
  if (!existsSync(file) || statSync(file).size === 0) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      if (maxSide && hasSips && /\.(jpe?g|png)$/.test(ext)) {
        execFileSync('sips', ['-Z', String(maxSide), file], { stdio: 'ignore' });
      }
    } catch (e) {
      console.warn('  ! картинка не скачалась', url, e.message);
      return url; // пусть грузится напрямую
    }
  }
  return '/media/' + name;
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slugify = (s) =>
  s
    .toLowerCase()
    .split('')
    .map((c) => (c in TR ? TR[c] : c))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const LOWER = new Set(['на', 'де', 'в', 'и', 'при', 'под', 'над']);
/** «РОСТОВ-НА-ДОНУ» → «Ростов-на-Дону», «НАБЕРЕЖНЫЕ ЧЕЛНЫ» → «Набережные Челны» */
const cityName = (s) =>
  s
    .toLowerCase()
    .replace(/[а-яёa-z]+/g, (w, off) => (off > 0 && LOWER.has(w) ? w : w[0].toUpperCase() + w.slice(1)));

/** «Удачное С» → «Удачное», «Михайловск(Шпаковский Р-Н, ...)» → «Михайловск» */
const cleanCity = (s) =>
  s
    .replace(/C(?=[а-яёА-ЯЁ])/g, 'С') // латинская C внутри кириллицы
    .replace(/\s*\(([^)]*(обл|край|р-н|район)[^)]*)\)/gi, '')
    .replace(/\s+(с|п|пгт|п\.г\.т|р\.п\.|снт|станица|хмао)\.?$/i, '')
    .replace(/^станица\s+/i, '')
    .trim();

const wsSlug = (ws) => ws?.match(/\/emg\/([^/]+)\/ws/)?.[1] ?? null;

function uniq(list, key) {
  const seen = new Map();
  for (const it of list) {
    let s = it[key] || 'x';
    if (seen.has(s)) {
      let n = 2;
      while (seen.has(`${s}-${n}`)) n++;
      s = `${s}-${n}`;
    }
    seen.set(s, true);
    it[key] = s;
  }
  return list;
}

/** Координаты городов: справочник hflabs/city (data/ru-cities.csv), недостающие — Nominatim (OpenStreetMap), с кэшем */
async function addGeo(stations) {
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s*\(.*\)\s*/g, '').trim();
  const idx = new Map();
  const csv = readFileSync(path.join(ROOT, 'data', 'ru-cities.csv'), 'utf8').split('\n');
  const head = parseCsvLine(csv[0]);
  const col = (n) => head.indexOf(n);
  for (const line of csv.slice(1)) {
    if (!line.trim()) continue;
    const r = parseCsvLine(line);
    const name = norm(r[col('city')] || r[col('settlement')] || (r[col('region')] === 'Москва' ? 'Москва' : r[col('region')] === 'Санкт-Петербург' ? 'Санкт-Петербург' : r[col('region')] === 'Севастополь' ? 'Севастополь' : ''));
    if (!name) continue;
    const pop = Number(r[col('population')]) || 0;
    const cur = idx.get(name);
    if (!cur || pop > cur.pop) idx.set(name, { lat: Number(r[col('geo_lat')]), lon: Number(r[col('geo_lon')]), pop });
  }
  const cacheFile = path.join(ROOT, 'data', 'geo-cache.json');
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  const names = [...new Set(stations.flatMap((s) => s.cities.map((c) => c.name)))];
  let asked = 0;
  for (const n of names) {
    if (idx.has(norm(n)) || n in cache) continue;
    const q = n.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const look = async (extra) => {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru${extra}&q=${encodeURIComponent(q)}`, {
          headers: { 'user-agent': 'radiohub.tech snapshot (EMG)' },
        });
        const j = await r.json();
        return j[0] ? { lat: Number(j[0].lat), lon: Number(j[0].lon) } : null;
      };
      // сначала ищем в России, потом где угодно (Абхазия, Молдова, Пхукет)
      cache[n] = await look('&countrycodes=ru');
      if (!cache[n]) {
        await new Promise((res) => setTimeout(res, 1100));
        cache[n] = await look('');
      }
    } catch {
      cache[n] = null;
    }
    asked++;
    await new Promise((res) => setTimeout(res, 1100)); // правила Nominatim: не чаще 1 запроса в секунду
  }
  writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
  let miss = 0;
  for (const st of stations)
    for (const c of st.cities) {
      const g = idx.get(norm(c.name)) || cache[c.name];
      c.lat = g ? Math.round(g.lat * 1e4) / 1e4 : null;
      c.lon = g ? Math.round(g.lon * 1e4) / 1e4 : null;
      if (!g) miss++;
    }
  console.log(`координаты: запросов к Nominatim ${asked}, без координат ${miss}`);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') out.push(cur), (cur = '');
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function main() {
  console.log('API', API);
  const { list: rawStations } = await api('/stations?page=1&limit=50');
  rawStations.sort((a, b) => a.sortOrder - b.sortOrder);

  const stations = [];
  for (const s of rawStations) {
    const slug = wsSlug(s.defaultStreamMetadataUrl) || slugify(s.name);
    console.log('•', s.name, slug);
    const [sidesRaw, citiesRaw] = await Promise.all([
      s.hasSideStations ? api(`/stations/${s.id}/side-stations?page=1&limit=100`).then((d) => d.list) : [],
      s.hasCities ? api(`/stations/${s.id}/cities?page=1&limit=2000`).then((d) => d.list) : [],
    ]);
    sidesRaw.sort((a, b) => a.sortOrder - b.sortOrder);
    const sides = uniq(
      await pool(sidesRaw, 4, async (x) => {
        const ws = wsSlug(x.streamMetadataUrl);
        let sl = ws && ws.startsWith(slug + '-') ? ws.slice(slug.length + 1) : ws || slugify(x.name);
        return {
          id: x.id,
          slug: sl,
          name: x.name,
          stream: x.streamUrl,
          meta: x.streamMetadataUrl || null,
          logo: await media(x.logoUrl),
          image: await media(x.imageUrl || x.bannerUrl, 800),
        };
      }),
      'slug',
    );
    const cities = uniq(
      citiesRaw
        .filter((c) => c.isReal && c.name && c.streamUrl && !/^россия$/i.test(c.name.trim()))
        .map((c) => ({
          id: c.id,
          slug: slugify(cleanCity(c.name)),
          name: cityName(cleanCity(c.name.trim())),
          stream: c.streamUrl,
          meta: c.streamMetadataUrl || s.defaultStreamMetadataUrl,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      'slug',
    );
    stations.push({
      id: s.id,
      slug,
      name: s.name,
      color: s.color,
      sortOrder: s.sortOrder,
      stream: s.defaultStreamUrl,
      meta: s.defaultStreamMetadataUrl,
      logo: await media(s.imageUrl),
      logoBlack: await media(s.imageUrlBlack),
      tile: await media(s.placeholderImageUrl),
      banner: await media(s.bannerUrl, 1600),
      video: s.hasLiveStream && s.videoStreamUrl ? s.videoStreamUrl : null,
      sides,
      cities,
    });
  }

  const { list: rawShows } = await api('/shows?page=1&limit=200');
  const activeShows = rawShows.filter((x) => x.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  console.log('подкасты', activeShows.length);
  const shows = uniq(
    await pool(activeShows, 4, async (sh) => {
      const ep = await api(`/shows/${sh.id}/episodes?page=1&limit=${EPISODES_PER_SHOW}`).catch(() => ({ list: [], meta: {} }));
      const episodes = (
        await pool(ep.list, 6, async (e) => {
          const a = await api(`/shows/${sh.id}/episodes/audio?episodeId=${e.id}`).catch(() => null);
          const audio = a?.data?.audioLink;
          if (!audio) return null;
          return {
            id: e.id,
            name: e.name.trim(),
            duration: Number(e.duration) || null,
            date: e.publishDate ? new Date(e.publishDate).toISOString() : null,
            text: e.text || '',
            image: e.imageUrl || null,
            audio,
          };
        })
      ).filter(Boolean);
      console.log('  ', sh.name, episodes.length, '/', ep.meta?.total ?? 0);
      return {
        id: sh.id,
        slug: sh.slug || slugify(sh.name),
        name: sh.name.trim(),
        description: (sh.description || '').trim(),
        cover: await media(sh.imageUrl, 640),
        stationId: sh.stationId,
        total: ep.meta?.total ?? episodes.length,
        episodes,
      };
    }),
    'slug',
  );

  await addGeo(stations);
  for (const st of stations) {
    const use = new Map();
    for (const c of st.cities) use.set(c.stream, (use.get(c.stream) || 0) + 1);
    // своя страница — только у города со своим эфиром (поток не общий и не на целую область)
    for (const c of st.cities) c.page = c.stream !== st.stream && use.get(c.stream) <= 3;
  }
  mkdirSync(path.join(ROOT, 'public', 'geo'), { recursive: true });
  // общий список городов для выбора в шапке: у каждого — свои основные эфиры станций (если отличаются от федерального)
  const all = new Map();
  for (const st of stations)
    for (const c of st.cities) {
      if (c.lat == null) continue;
      const e = all.get(c.slug) ?? { s: c.slug, n: c.name, a: c.lat, o: c.lon, x: {} };
      if (c.stream !== st.stream) e.x[st.slug] = [c.stream, c.meta];
      all.set(c.slug, e);
    }
  writeFileSync(
    path.join(ROOT, 'public', 'geo', 'cities.json'),
    JSON.stringify([...all.values()].sort((a, b) => a.n.localeCompare(b.n, 'ru'))),
  );

  const catalog = {
    generatedAt: new Date().toISOString(),
    stations,
    shows: shows.filter((s) => s.episodes.length > 0),
  };
  writeFileSync(path.join(ROOT, 'data', 'catalog.json'), JSON.stringify(catalog, null, 1));
  const nCities = stations.reduce((n, s) => n + s.cities.length, 0);
  const nSides = stations.reduce((n, s) => n + s.sides.length, 0);
  console.log(`готово: станций ${stations.length}, потоков ${nSides}, городов ${nCities}, подкастов ${catalog.shows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
