// POST /api/images ← { mime, data: base64 } (cần X-Edit-Key) → { id }
// id là hash nội dung nên cùng một ảnh có tải lên nhiều lần cũng chỉ lưu một bản.
import { createHash } from 'node:crypto';
import { db, fail, readBody, requireEditor, route, send } from '../_lib.js';

const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 3 * 1024 * 1024;

export default route({
  async POST(req, res) {
    requireEditor(req);
    const { mime, data } = await readBody(req);
    if (!MIMES.includes(mime) || typeof data !== 'string') throw fail(400, 'Ảnh không hợp lệ');
    const buf = Buffer.from(data, 'base64');
    if (!buf.length) throw fail(400, 'Ảnh rỗng');
    if (buf.length > MAX_BYTES) throw fail(413, 'Ảnh quá lớn (tối đa 3MB)');
    const id = createHash('sha256').update(buf).digest('hex').slice(0, 32);
    await db()`insert into images (hash, mime, data)
      values (${id}, ${mime}, decode(${buf.toString('base64')}, 'base64'))
      on conflict (hash) do nothing`;
    send(res, 200, { id });
  },
});
