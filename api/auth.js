// GET /api/auth (header X-Edit-Key) → 200 nếu đúng mã. Đồng thời kiểm tra luôn kết nối DB.
import { requireEditor, route, send } from './_lib.js';

export default route({
  async GET(req, res) {
    requireEditor(req);
    send(res, 200, { ok: true });
  },
});
