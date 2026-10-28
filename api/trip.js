// GET  /api/trip?id=main  → { data, version, updatedAt }   (ai cũng xem được)
// PUT  /api/trip?id=main  ← { data, version, force? }      (cần header X-Edit-Key)
// version là số lần lưu; gửi sai version (đã bị sửa ở máy khác) thì trả 409.
import { db, fail, query, readBody, requireEditor, route, send } from './_lib.js';

const tripId = (req) => {
  const id = query(req).get('id') || 'main';
  if (!/^[a-z0-9-]{1,64}$/i.test(id)) throw fail(400, 'id không hợp lệ');
  return id;
};

export default route({
  async GET(req, res) {
    const [row] = await db()`select data, version, updated_at from trips where id = ${tripId(req)}`;
    if (!row) throw fail(404, 'Chưa có lịch trình');
    res.setHeader('Cache-Control', 'no-store');
    send(res, 200, { data: row.data, version: row.version, updatedAt: row.updated_at });
  },

  async PUT(req, res) {
    requireEditor(req);
    const id = tripId(req);
    const { data, version = 0, force = false } = await readBody(req);
    if (!data || !Array.isArray(data.days)) throw fail(400, 'Dữ liệu không hợp lệ');
    const json = JSON.stringify(data);
    const sql = db();

    let rows;
    if (force) {
      rows = await sql`insert into trips (id, data) values (${id}, ${json}::jsonb)
        on conflict (id) do update set data = excluded.data, version = trips.version + 1, updated_at = now()
        returning version, updated_at`;
    } else if (!version) {
      rows = await sql`insert into trips (id, data) values (${id}, ${json}::jsonb)
        on conflict (id) do nothing
        returning version, updated_at`;
    } else {
      rows = await sql`update trips set data = ${json}::jsonb, version = version + 1, updated_at = now()
        where id = ${id} and version = ${version}
        returning version, updated_at`;
    }

    if (!rows.length) {
      const [cur] = await sql`select version from trips where id = ${id}`;
      return send(res, 409, { error: 'Lịch trình đã được sửa ở nơi khác', version: cur?.version ?? 0 });
    }
    send(res, 200, { version: rows[0].version, updatedAt: rows[0].updated_at });
  },
});
