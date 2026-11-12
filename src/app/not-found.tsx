import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Страница не найдена', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="page page--plain nf">
      <p className="nf__num" aria-hidden>
        404
      </p>
      <h1>Такой страницы нет в эфире</h1>
      <p>Возможно, ссылка устарела. Вернитесь на главную и выберите станцию на шкале.</p>
      <Link href="/" className="btn">
        На главную
      </Link>
    </div>
  );
}
