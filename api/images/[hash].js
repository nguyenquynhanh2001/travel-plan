// GET /api/images/<id> → file ảnh. Nội dung không bao giờ đổi nên cho CDN cache vĩnh viễn.
import { db, fail, route } from '../_lib.js';

export default route({
  async GET(req, res) {
    const id = new URL(req.url, 'http://localhost').pathname.split('/').pop();
    if (!/^[0-9a-f]{32}$/.test(id)) throw fail(404, 'Không có ảnh');
    const [row] = await db()`select mime, encode(data, 'base64') as b64 from images where hash = ${id}`;
    if (!row) throw fail(404, 'Không có ảnh');
    res.statusCode = 200;
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.end(Buffer.from(row.b64, 'base64'));
  },
});
