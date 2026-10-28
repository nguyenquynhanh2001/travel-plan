// Dùng chung cho các API. File bắt đầu bằng "_" nên Vercel không coi là một endpoint.
import { createHash, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

let sqlClient;
export const db = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw fail(500, 'Server chưa cấu hình DATABASE_URL');
  return (sqlClient ||= neon(url));
};

// Tự tạo bảng ở lần gọi đầu tiên của mỗi lần khởi động, nên không cần chạy migration tay.
let schemaReady;
const ensureSchema = () => schemaReady ||= (async () => {
  const sql = db();
  await sql`create table if not exists trips (
    id text primary key,
    data jsonb not null,
    version integer not null default 1,
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists images (
    hash text primary key,
    mime text not null,
    data bytea not null,
    created_at timestamptz not null default now()
  )`;
})().catch((e) => { schemaReady = null; throw e; });

export const fail = (status, message) => Object.assign(new Error(message), { status });

export const query = (req) => new URL(req.url, 'http://localhost').searchParams;

export const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

// Vercel tự parse JSON vào req.body; chạy bằng Node thuần thì tự đọc stream.
export const readBody = async (req) => {
  try {
    if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw fail(400, 'Body không phải JSON hợp lệ');
  }
};

export const requireEditor = (req) => {
  const key = process.env.EDIT_KEY;
  if (!key) throw fail(500, 'Server chưa cấu hình EDIT_KEY');
  const got = req.headers['x-edit-key'];
  const digest = (v) => createHash('sha256').update(String(v)).digest();
  if (typeof got !== 'string' || !timingSafeEqual(digest(got), digest(key))) throw fail(401, 'Sai mã chỉnh sửa');
};

const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://nguyenquynhanh2001.github.io')
  .split(',').map((s) => s.trim()).filter(Boolean);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const cors = (req, res) => {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes(origin) || LOCAL.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Edit-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method !== 'OPTIONS') return false;
  res.statusCode = 204;
  res.end();
  return true;
};

// route({ GET, PUT, ... }) → handler (req, res) dùng được cho cả Vercel lẫn http.createServer.
export const route = (methods) => async (req, res) => {
  if (cors(req, res)) return;
  const fn = methods[req.method];
  if (!fn) return send(res, 405, { error: 'Method not allowed' });
  try {
    await ensureSchema();
    await fn(req, res);
  } catch (e) {
    if (!e.status || e.status >= 500) console.error(e);
    send(res, e.status || 500, { error: e.status ? e.message : 'Lỗi server' });
  }
};
