import Link from 'next/link';
import { Logo } from './Logo';
import { CityControl } from './city/CityControl';

export function Header() {
  return (
    <header className="header">
      <a href="#main" className="skip">
        К содержанию
      </a>
      <Link href="/" className="header__home" aria-label="РадиоХаб, на главную">
        <Logo />
      </Link>
      <CityControl />
      <nav className="header__nav" aria-label="Разделы">
        <Link href="/podcasts/">Подкасты</Link>
        <Link href="/app/" className="header__app">
          Приложение
        </Link>
      </nav>
    </header>
  );
}
