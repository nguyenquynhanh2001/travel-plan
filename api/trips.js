// GET  /api/trips  → { trips: [{ id, title, updatedAt, days, stops, people, spent, startDate, endDate, cover }] }
// POST /api/trips  ← { title, data }  (cần header X-Edit-Key) → { id, version }
// id tạo từ tên chuyến đi (bỏ dấu), trùng thì thêm -2, -3…
import { db, fail, readBody, requireEditor, route, send } from './_lib.js';

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '') || 'chuyen-di';

export default route({
  async GET(req, res) {
    const rows = await db()`
      with t as (select id, data, updated_at, coalesce(data->'days', '[]'::jsonb) as days from trips)
      select id, data->>'title' as title, updated_at,
        jsonb_array_length(days) as days,
        (select coalesce(sum(jsonb_array_length(coalesce(d->'stops', '[]'::jsonb))), 0)::int from jsonb_array_elements(days) d) as stops,
        jsonb_array_length(coalesce(data->'people', '[]'::jsonb)) as people,
        (select coalesce(sum((x->>'amount')::numeric), 0)::float8 from jsonb_array_elements(coalesce(data->'expenses', '[]'::jsonb)) x) as spent,
        (select min(nullif(d->>'date', '')) from jsonb_array_elements(days) d) as start_date,
        (select max(nullif(d->>'date', '')) from jsonb_array_elements(days) d) as end_date,
        (select s->'images'->>0 from jsonb_array_elements(days) d, jsonb_array_elements(coalesce(d->'stops', '[]'::jsonb)) s
          where jsonb_array_length(coalesce(s->'images', '[]'::jsonb)) > 0 limit 1) as cover
      from t order by updated_at desc`;
    res.setHeader('Cache-Control', 'no-store');
    send(res, 200, {
      trips: rows.map((r) => ({
        id: r.id, title: r.title, updatedAt: r.updated_at, days: r.days, stops: r.stops, people: r.people,
        spent: r.spent, startDate: r.start_date, endDate: r.end_date, cover: r.cover,
      })),
    });
  },

  async POST(req, res) {
    requireEditor(req);
    const { title, data } = await readBody(req);
    const name = String(title ?? '').trim();
    if (!name) throw fail(400, 'Thiếu tên chuyến đi');
    if (!data || !Array.isArray(data.days)) throw fail(400, 'Dữ liệu không hợp lệ');
    const json = JSON.stringify({ ...data, title: name });
    const base = slugify(name);
    const sql = db();
    for (let n = 1; n <= 50; n++) {
      const id = n === 1 ? base : `${base}-${n}`;
      const rows = await sql`insert into trips (id, data) values (${id}, ${json}::jsonb)
        on conflict (id) do nothing returning version`;
      if (rows.length) return send(res, 201, { id, version: rows[0].version });
    }
    throw fail(409, 'Đã có quá nhiều chuyến đi trùng tên, hãy đặt tên khác');
  },
});
