'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useCity, type CityRec } from './CityProvider';

const pin = (
  <svg viewBox="0 0 24 24" className="ico" aria-hidden>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.4" fill="currentColor" />
  </svg>
);

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();
const POPULAR = ['moskva', 'sankt-peterburg', 'novosibirsk', 'ekaterinburg', 'kazan', 'nizhniy-novgorod', 'samara', 'krasnodar', 'voronezh', 'perm', 'ufa', 'chelyabinsk'];

function ownCount(c: CityRec) {
  const n = Object.keys(c.x).length;
  if (!n) return 'федеральный эфир';
  return n === 1 ? '1 городской эфир' : n < 5 ? `${n} городских эфира` : `${n} городских эфиров`;
}

function Picker() {
  const { closePicker, setCity, loadCities, nearest, city } = useCity();
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<CityRec[]>([]);
  const [q, setQ] = useState('');
  const [geo, setGeo] = useState<'idle' | 'busy' | 'denied' | 'far' | 'failed'>('idle');
  const dq = useDeferredValue(norm(q));

  useEffect(() => {
    dlg.current?.showModal();
    input.current?.focus();
    loadCities().then(setList);
  }, [loadCities]);

  const found = useMemo(() => {
    if (!dq) {
      const pop = POPULAR.map((s) => list.find((c) => c.s === s)).filter((c): c is CityRec => !!c);
      return pop;
    }
    const starts = list.filter((c) => norm(c.n).startsWith(dq));
    const inside = list.filter((c) => !norm(c.n).startsWith(dq) && norm(c.n).includes(dq));
    return [...starts, ...inside].slice(0, 60);
  }, [dq, list]);

  const choose = (c: CityRec | null) => {
    setCity(c);
    closePicker();
  };

  const byGeo = () => {
    if (!('geolocation' in navigator)) return setGeo('failed');
    setGeo('busy');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const c = await nearest(p.coords.latitude, p.coords.longitude, 100);
        if (c) choose(c);
        else setGeo('far');
      },
      (e) => setGeo(e.code === e.PERMISSION_DENIED ? 'denied' : 'failed'),
      { timeout: 12000, maximumAge: 6 * 3600e3 },
    );
  };

  return (
    <dialog
      ref={dlg}
      className="cpick"
      onClose={closePicker}
      onClick={(e) => e.target === e.currentTarget && closePicker()}
      aria-labelledby="cpick-h"
    >
      <div className="cpick__box">
        <div className="cpick__head">
          <h2 id="cpick-h">Ваш город</h2>
          <button type="button" className="cpick__close" onClick={closePicker} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" className="ico" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="cpick__note">От города зависит только основной эфир станций. Потоки и подкасты везде одинаковые.</p>
        <input
          ref={input}
          type="search"
          className="cpick__search"
          placeholder="Найти город"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Найти город"
        />
        <div className="cpick__quick">
          <button type="button" onClick={byGeo} disabled={geo === 'busy'}>
            {pin}
            {geo === 'busy' ? 'Определяем…' : 'Определить по геопозиции'}
          </button>
          <button type="button" className={!city ? 'is-on' : ''} onClick={() => choose(null)}>
            Федеральный эфир
          </button>
        </div>
        {geo === 'denied' && <p className="cpick__msg">Браузер не дал доступ к геопозиции. Найдите город в списке.</p>}
        {geo === 'far' && <p className="cpick__msg">Рядом с вами нет городов со своим эфиром. Подойдёт федеральный.</p>}
        {geo === 'failed' && <p className="cpick__msg">Не получилось определить город. Найдите его в списке.</p>}
        {!dq && <h3 className="cpick__h">Популярные</h3>}
        <ul className="cpick__list">
          {found.map((c) => (
            <li key={c.s}>
              <button type="button" className={city?.s === c.s ? 'is-on' : ''} onClick={() => choose(c)}>
                <b>{c.n}</b>
                <span>{ownCount(c)}</span>
              </button>
            </li>
          ))}
        </ul>
        {dq && found.length === 0 && <p className="cpick__msg">Такого города нет в списке. Выберите федеральный эфир, он звучит везде.</p>}
      </div>
    </dialog>
  );
}

export function CityControl() {
  const { city, prompt, ready, setCity, dismissPrompt, openPicker, pickerOpen } = useCity();
  return (
    <div className="cityctl">
      <button type="button" className="cityctl__btn" onClick={openPicker} aria-haspopup="dialog">
        {pin}
        {city ? (
          <span>{city.n}</span>
        ) : (
          <>
            <span className="lbl-full">{ready ? 'Федеральный эфир' : 'Город'}</span>
            <span className="lbl-short">Город</span>
          </>
        )}
      </button>
      {prompt && (
        <div className="cityctl__pop" role="dialog" aria-label="Выбор города">
          {prompt.guess ? (
            <>
              <p>
                Ваш город — <b>{prompt.guess.n}</b>?
              </p>
              <div className="cityctl__row">
                <button type="button" className="cityctl__yes" onClick={() => setCity(prompt.guess)}>
                  Да, верно
                </button>
                <button type="button" onClick={openPicker}>
                  Выбрать другой
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Выберите город, чтобы слушать местный эфир. Пока играет федеральный.</p>
              <div className="cityctl__row">
                <button type="button" className="cityctl__yes" onClick={openPicker}>
                  Выбрать город
                </button>
                <button type="button" onClick={dismissPrompt}>
                  Не сейчас
                </button>
              </div>
            </>
          )}
          <button type="button" className="cityctl__x" onClick={dismissPrompt} aria-label="Закрыть">
            ×
          </button>
        </div>
      )}
      {pickerOpen && <Picker />}
    </div>
  );
}
