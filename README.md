# BridgeMate — GitHub and Vercel edition

Website cộng tác Việt–Anh dành cho nhóm sinh viên Việt Nam và WCC. Đây là bản Next.js độc lập, tách từ bản Sites; không dùng danh tính hoặc cookie ChatGPT.

## Công nghệ

React + Next.js App Router + Drizzle + Turso/libSQL. Database local dùng SQLite để phát triển; Vercel phải dùng database từ xa để dữ liệu bền vững. API chạy Node.js Runtime. Phiên đăng nhập lưu trên máy chủ; trình duyệt dùng cookie HttpOnly, Secure khi HTTPS và SameSite=Lax.

## Cài trên Windows hoặc máy cá nhân

Cần Node.js >=22.13, Git, npm.

```bash
npm ci
```

Copy `.env.example` thành `.env.local`. Để chạy local, đặt:

```env
TURSO_DATABASE_URL=file:./bridgemate.db
```

Không cần token với database file local. Chạy:

```bash
npm run db:migrate
npm run dev
```

Mở http://localhost:3000. Chọn Explore the workspace hoặc đăng ký tài khoản.

## Đẩy lên GitHub

Tạo một repository trống, không thêm README hoặc .gitignore trên GitHub. Trong thư mục này:

```bash
git init
git add .
git commit -m "feat: BridgeMate Next.js app for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Thay YOUR_USERNAME/YOUR_REPOSITORY bằng repo thật. Không đẩy `.env.local`, file database hoặc node_modules. Không dán token truy cập vào chat.

## Đưa lên Vercel

1. Tạo một database Turso do bạn sở hữu, lấy URL và token trong trang quản lý của dịch vụ. Kiểm tra gói sử dụng trước khi xác nhận dịch vụ có phí.
2. Thay cấu hình trong `.env.local` bằng URL và token thật của database từ xa, rồi chạy `npm run db:migrate`. Script có theo dõi migration và có thể chạy lại an toàn.
3. Trong Vercel, import repository GitHub. Framework là Next.js; root directory là thư mục chứa package.json.
4. Trong Environment Variables, thêm `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`. Chọn đúng Production/Preview cần dùng. Không dùng tiền tố NEXT_PUBLIC cho hai biến này.
5. Build Command: `npm run build`. Install Command: `npm ci`. Không đặt Output Directory thành dist.
6. Deploy, mở website và thử đăng ký → tạo nhóm → giao nhiệm vụ → xác nhận hiểu. Khi sửa biến môi trường, redeploy.
7. Các commit tiếp theo trên nhánh production được triển khai theo cấu hình Git của dự án Vercel.

Không chạy migration trong mỗi HTTP request. Chạy `npm run db:migrate` trước bản triển khai cần schema mới. Không dùng file SQLite local trên Vercel.

## Dữ liệu từ bản Sites

Đây là database mới. Mã nguồn và schema đã chuyển; tài khoản, nhóm và nhiệm vụ đang có trên Sites chưa được sao chép. Không xóa hoặc thay website Sites cũ. Việc chuyển dữ liệu thật cần bước xuất/nhập riêng và không nên sao chép phiên đăng nhập đang hoạt động.

## Cấu trúc cho hai dev

- app/page.tsx: giao diện React và các màn hình.
- app/globals.css: Soft Academic và responsive.
- app/api/[...path]/route.ts: API, tài khoản và phân quyền.
- db/schema.ts: 8 bảng dữ liệu.
- db/index.ts: kết nối Turso/libSQL phía máy chủ.
- lib/content.ts: 30 mẫu câu và 10 quiz Việt–Anh.
- scripts/migrate.mjs: chạy migration có kiểm tra checksum.
- tests: kiểm thử policy và kịch bản tích hợp API.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
```

Để kiểm tra tự động bản build với database tạm, chạy `node tests/run-next-integration.mjs`. Khi máy chủ local đang chạy, dùng `node tests/integration.mjs` để kiểm thử API với dữ liệu mẫu mới. Chỉ chạy test tích hợp trên database phát triển: test có tạo tài khoản và nhóm.

## Giới hạn MVP

Chưa có AI translation, xác minh email, khôi phục mật khẩu hoặc giới hạn tần suất đăng ký/đăng nhập. Cần bổ sung trước khi mở đăng ký công khai rộng rãi. Tên trong demo là giả định.
