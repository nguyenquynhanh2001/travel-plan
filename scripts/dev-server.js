// Chạy thử cả web lẫn API trên máy: npm run dev → http://localhost:3000
// Cần file .env có DATABASE_URL và EDIT_KEY (xem .env.example).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 3000;

const routes = [
  [/^\/api\/trip$/, 'api/trip.js'],
  [/^\/api\/auth$/, 'api/auth.js'],
  [/^\/api\/images$/, 'api/images/index.js'],
  [/^\/api\/images\/[^/]+$/, 'api/images/[hash].js'],
];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const hit = routes.find(([re]) => re.test(pathname));
  if (hit) {
    const { default: handler } = await import(new URL(`../${hit[1]}`, import.meta.url));
    return handler(req, res);
  }
  if (pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('Not found'); }
  const file = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
