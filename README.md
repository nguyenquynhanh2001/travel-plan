# Lịch trình du lịch

Trang lập lịch trình chuyến đi gồm giờ, địa điểm, bản đồ và ảnh, kèm tab **Chi tiêu** để ghi ai chi khoản gì, bao nhiêu và tính ai cần trả ai.

- Web: https://nguyenquynhanh2001.github.io/travel-plan/
- Link không có `?trip=` thì hiện danh sách chuyến đi: ai cũng xem/mở được; tạo, đổi tên, xoá cần mã chỉnh sửa.
- Mỗi chuyến đi có link riêng `?trip=ten-chuyen-di` (tạo từ tên, bỏ dấu).
- Link mở thẳng tab Chi tiêu: thêm `#chi-tieu` vào cuối link.

## Kiến trúc

```
GitHub Pages (index.html, config.js)
        │  fetch
        ▼
Vercel Functions (api/*.js, Node 22, region sin1)
        │  @neondatabase/serverless
        ▼
Neon PostgreSQL (bảng trips, shared, images — tự tạo ở lần gọi đầu)
```

| API | Quyền | Mô tả |
|---|---|---|
| `GET /api/trips` | ai cũng gọi được | Danh sách chuyến đi kèm tóm tắt (số ngày, điểm, người, tổng chi, ảnh bìa) |
| `POST /api/trips` | `X-Edit-Key` | Tạo chuyến đi `{ title, data }` → `{ id }` |
| `GET /api/trip?id=main` | ai cũng gọi được | Lấy lịch trình `{ data, version, updatedAt }` |
| `PUT /api/trip?id=main` | `X-Edit-Key` | Lưu `{ data, version }`; sai version thì trả 409 |
| `PATCH /api/trip?id=main` | `X-Edit-Key` | Đổi tên `{ title }` |
| `DELETE /api/trip?id=main` | `X-Edit-Key` | Xoá chuyến đi |
| `GET /api/shared?id=poses` | ai cũng gọi được | Dữ liệu dùng chung mọi chuyến đi (thư viện pose dáng) |
| `PUT /api/shared?id=poses` | `X-Edit-Key` | Lưu `{ data, version }`; sai version thì trả 409 |
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
