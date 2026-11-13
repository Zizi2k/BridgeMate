# Trạm liên kết

Ứng dụng tiếng Việt dành cho một người dùng. Bạn có thể lưu, sửa, xóa, tìm kiếm và phân loại website. Bấm vào tên hoặc ảnh bìa để mở website trong tab mới. Lịch ngày lưu giờ bắt đầu, giờ kết thúc, ghi chú và trạng thái hoàn thành. Ảnh tải lên được thu nhỏ và lưu cùng dữ liệu trong PostgreSQL.

## Triển khai

1. **GitHub** — Dùng repo `Zizi2k/BridgeMate`, nhánh `main`. Mã nguồn ứng dụng nằm trong `apps/tram-lien-ket`. Giữ tệp cấu hình môi trường thật ngoài Git.
2. **Railway** — Tạo PostgreSQL. Sao chép giá trị `DATABASE_PUBLIC_URL` hoặc địa chỉ kết nối công khai qua TCP Proxy. Render sẽ dùng địa chỉ này để truy cập PostgreSQL từ bên ngoài Railway.
3. **Vercel** — Import repo, đặt **Root Directory** là `apps/tram-lien-ket/frontend` và **Framework Preset** là **Other**. Lấy tên miền production để khai báo trên Render. Nếu cần hoàn thành lần import đầu tiên, dùng một giá trị tạm có dạng URL cho `API_BASE_URL`, rồi cập nhật và triển khai lại ở bước 5.
4. **Render** — Tạo Blueprint từ repo và đặt **Blueprint Path** thành `apps/tram-lien-ket/render.yaml`. Chọn gói phù hợp trên dashboard. Điền `DATABASE_URL` bằng URL công khai từ Railway, `FRONTEND_ORIGIN` bằng địa chỉ Vercel production (ví dụ `https://ten-du-an.vercel.app`, bỏ dấu gạch chéo cuối) và `APP_PASSWORD` bằng mật khẩu riêng ít nhất 12 ký tự. Blueprint tạo `SESSION_SECRET`. Khi khởi động, API tự tạo bảng nếu cần. Mở `/api/health` trên tên miền Render để kiểm tra kết nối.
5. **Vercel** — Đặt biến production `API_BASE_URL` bằng địa chỉ gốc của Render, ví dụ `https://ten-api.onrender.com`, rồi triển khai lại. Mở website và đăng nhập bằng `APP_PASSWORD`.

Chỉ `API_BASE_URL` xuất hiện trong frontend. Giữ mật khẩu, khóa phiên và chuỗi kết nối trong Render. Phiên đăng nhập hết hạn sau 8 giờ. Dữ liệu link và lịch dùng chung giữa các thiết bị khi đăng nhập vào cùng một bản triển khai.

## Chạy trên máy

Dùng Node.js 22 và PostgreSQL. Tạo trước database, sao chép `backend/.env.example` thành `backend/.env`, rồi thay các giá trị tương ứng. Đổi mật khẩu và tạo khóa bí mật riêng, ví dụ bằng `openssl rand -hex 32`.

Tại thư mục `apps/tram-lien-ket/backend`:

```sh
npm ci
node --env-file=.env server.js
```

Tại thư mục `apps/tram-lien-ket/frontend` trên Bash:

```sh
API_BASE_URL=http://localhost:5000 node build.mjs
python3 -m http.server 8080 --directory dist
```

Mở `http://localhost:8080`. Nếu dùng PowerShell, đặt biến bằng `$env:API_BASE_URL = "http://localhost:5000"` trước khi chạy `node build.mjs`.
