# Lịch trình du lịch

Trang lập lịch trình chuyến đi gồm giờ, địa điểm, bản đồ và ảnh, kèm tab **Chi tiêu** để ghi ai chi khoản gì, bao nhiêu và tính ai cần trả ai.

- Web: https://nguyenquynhanh2001.github.io/travel-plan/
- Nhiều chuyến đi: thêm `?trip=ten-chuyen-di` vào link (mặc định là `main`).
- Link mở thẳng tab Chi tiêu: thêm `#chi-tieu` vào cuối link.

## Kiến trúc

```
GitHub Pages (index.html, config.js)
        │  fetch
        ▼
Vercel Functions (api/*.js, Node 22, region sin1)
        │  @neondatabase/serverless
        ▼
Neon PostgreSQL (bảng trips, images — tự tạo ở lần gọi đầu)
```

| API | Quyền | Mô tả |
|---|---|---|
| `GET /api/trip?id=main` | ai cũng gọi được | Lấy lịch trình `{ data, version, updatedAt }` |
| `PUT /api/trip?id=main` | `X-Edit-Key` | Lưu `{ data, version }`; sai version thì trả 409 |
| `POST /api/images` | `X-Edit-Key` | Tải ảnh lên `{ mime, data(base64) }` → `{ id }` |
| `GET /api/images/:id` | ai cũng gọi được | Trả file ảnh, cache vĩnh viễn |
| `GET /api/auth` | `X-Edit-Key` | Kiểm tra mã chỉnh sửa và kết nối DB |

Người mở link ở chế độ chỉ xem. Bấm **✎ Chỉnh sửa**, nhập `EDIT_KEY` thì máy đó sửa được, và mọi thay đổi tự lưu lên server.

## Cài đặt lần đầu

### 1. Tạo DB trên Neon
1. Đăng nhập https://console.neon.tech, bấm **New project**.
2. Đặt tên `travel-plan`, Postgres bản mới nhất, region **AWS Asia Pacific (Singapore)** cho gần server Vercel `sin1`.
3. Ở trang project bấm **Connect**, chọn **Connection string**, copy chuỗi `postgresql://…?sslmode=require`.

Không cần tạo bảng: API tự chạy `create table if not exists` ở lần gọi đầu. Nếu muốn tạo tay thì xem `db/schema.sql`.

### 2. Deploy API lên Vercel
1. Đăng nhập https://vercel.com bằng GitHub, bấm **Add New… → Project**, chọn repo `travel-plan`, rồi **Import**.
2. Framework Preset: **Other**. Các mục khác để mặc định.
3. Mở **Environment Variables** và thêm:
   - `DATABASE_URL` = chuỗi kết nối Neon ở bước 1
   - `EDIT_KEY` = một mật khẩu dài, khó đoán (đây là mã để vào chỉnh sửa)
4. Bấm **Deploy**. Xong thì copy domain, dạng `https://travel-plan-xxx.vercel.app`.
5. Kiểm tra: mở `https://<domain>/api/trip`. Thấy `{"error":"Chưa có lịch trình"}` là đã kết nối được DB.

### 3. Nối web với API
Sửa `config.js`:

```js
window.TRAVEL_API = 'https://travel-plan-xxx.vercel.app';
```

Commit và push. GitHub Pages tự cập nhật sau khoảng 1 phút.

## Chạy trên máy

```bash
cp .env.example .env    # điền DATABASE_URL, EDIT_KEY
npm install
npm run dev             # http://localhost:3000 (web + API cùng origin)
```
