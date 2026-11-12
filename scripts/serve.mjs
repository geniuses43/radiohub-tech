// Локальный просмотр собранного сайта (папка out): npm run serve → http://localhost:3200
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const PORT = Number(process.env.PORT) || 3200;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!p.endsWith('/')) return res.writeHead(308, { location: p + '/' }).end();
    file = path.join(file, 'index.html');
  }
  let status = 200;
  if (!existsSync(file)) {
    status = 404;
    file = path.join(ROOT, '404.html');
  }
  const ext = path.extname(file);
  const type = p.endsWith('apple-app-site-association') ? 'application/json' : TYPES[ext] || 'application/octet-stream';
  res.writeHead(status, { 'content-type': type });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
