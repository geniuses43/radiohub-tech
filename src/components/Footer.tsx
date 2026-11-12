import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="footer">
      <Logo />
      <nav className="footer__nav" aria-label="Разделы">
        <Link href="/podcasts/">Подкасты</Link>
        <Link href="/cities/">Города</Link>
        <Link href="/app/">Приложение</Link>
      </nav>
      <p className="footer__legal">© {new Date().getFullYear()} Европейская медиагруппа</p>
    </footer>
  );
}
