# BridgeMate — Next.js and MySQL

Website cộng tác Việt–Anh cho sinh viên Việt Nam và WCC. Bản hiện tại dùng **Next.js + MySQL + Drizzle**, triển khai ứng dụng lên Vercel. MySQL chạy trên một máy chủ database riêng, không nằm trong repository GitHub.

## 1. Chuẩn bị

- Node.js >=22.13, npm và Git.
- MySQL 8.x local để phát triển, hoặc MySQL từ xa để triển khai.
- Một tài khoản database có quyền tạo bảng và khóa ngoại. Lệnh tạo database còn cần quyền CREATE DATABASE; nếu nhà cung cấp đã tạo sẵn database thì bỏ qua lệnh này.

```bash
git clone https://github.com/Zizi2k/BridgeMate.git
cd BridgeMate
npm ci
```

## 2. Tạo database MySQL

Copy `.env.example` thành `.env.local`, điền thông tin MySQL của bạn. Ví dụ local:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=bridgemate
MYSQL_SSL=false
```

Chạy:

```bash
npm run db:create
npm run db:migrate
npm run dev
```

Lệnh đầu tạo database `bridgemate` nếu chưa tồn tại; lệnh sau tạo 9 bảng. Nếu database được nhà cung cấp tạo sẵn, chỉ chạy `npm run db:migrate`. Mở http://localhost:3000.

Có thể thay lệnh tạo database/bảng bằng cách mở `mysql/schema.sql` trong MySQL Workbench và thực thi trên database mới. Chọn một cách khởi tạo: script hoặc Workbench. Nếu đã import thủ công thì không chạy migration ban đầu lên cùng database; cần baseline lịch sử trước.

Không dùng tài khoản root cho ứng dụng thật. Sau khi tạo schema, tài khoản ứng dụng chỉ cần SELECT, INSERT, UPDATE, DELETE trên database; dùng tài khoản có quyền DDL riêng khi chạy migration.

## 3. Đưa lên Vercel

1. Chuẩn bị MySQL online có địa chỉ host và cổng mà Vercel kết nối được. `localhost` hoặc `127.0.0.1` trên máy cá nhân không phải MySQL online cho Vercel.
2. Điền thông tin database online vào `.env.local`, đặt `MYSQL_SSL=true` nếu endpoint dùng TLS. Nếu nhà cung cấp yêu cầu CA, thêm `MYSQL_SSL_CA` bằng chứng chỉ CA họ cung cấp. Không tắt kiểm tra chứng chỉ để xử lý lỗi TLS.
3. Chạy `npm run db:migrate` với tài khoản có quyền tạo bảng trên database online mới.
4. Trong Vercel, import repo **Zizi2k/BridgeMate**. Framework: Next.js. Root Directory: `./`. Install: `npm ci`. Build: `npm run build`. Giữ Output Directory mặc định.
5. Thêm các Environment Variables: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_SSL`; thêm `MYSQL_SSL_CA` khi nhà cung cấp yêu cầu. Không đặt tiền tố NEXT_PUBLIC cho thông tin database.
6. Deploy. Mở `/api/health`: khi kết nối thành công sẽ trả `{data:{status:"ok",database:"mysql"}}`.
7. Thử đăng ký, đăng nhập, tạo nhóm, giao nhiệm vụ, xác nhận hiểu, cẩm nang và quiz. Khi đổi biến môi trường cần redeploy.

Ứng dụng dùng pool ở phạm vi module, giới hạn 3 kết nối mỗi instance và tích hợp quản lý pool Vercel. Tổng kết nối vẫn phụ thuộc số instance và giới hạn máy chủ MySQL. Không chạy migration trong mỗi HTTP request hoặc trong quá trình build.

## 4. Chức năng

- Đăng ký/đăng nhập, cookie HttpOnly, Secure trên HTTPS.
- Nhóm và mã mời; kiểm tra quyền ở backend.
- Nhiệm vụ, người phụ trách, hạn và tiến độ.
- Xác nhận hiểu theo phiên bản nhiệm vụ, phản hồi và bình luận.
- 30 mẫu câu Việt–Anh, quiz 10 câu chấm ở backend.
- Trợ lý AI: dịch, đơn giản hóa, viết lịch sự, tóm tắt, tạo checklist và hỏi về nội dung; cần cấu hình OpenAI API. Xem docs/AI_SETUP_VI.md.
- Giao diện EN/VI, responsive Soft Academic.

## 5. File quan trọng

| File | Nội dung |
|---|---|
| app/page.tsx | Giao diện React |
| app/globals.css | Kiểu trình bày |
| app/api/[...path]/route.ts | API và phân quyền |
| db/schema.ts | Schema MySQL 9 bảng |
| db/index.ts | MySQL pool và Drizzle |
| lib/mysql-config.ts | Cấu hình biến môi trường và TLS |
| mysql/schema.sql | Tạo database/bảng bằng Workbench |
| mysql/migrations | Migration SQL và metadata |
| scripts/create-database.mjs | Tạo database nếu được cấp quyền |
| scripts/migrate.mjs | Migration có checksum và khóa chống chạy đồng thời |
| .env.example | Mẫu cấu hình, không phải thông tin thật |

## 6. Kiểm tra

```bash
npm run typecheck
npm test
npm run build
```

Có MySQL phát triển và tài khoản được phép tạo database tạm thì chạy `npm run test:integration` sau build. Script tạo một database tên `bridgemate_test_*`, chạy migration hai lần để kiểm tra bỏ qua bản đã áp dụng, chạy API test rồi xóa đúng database tạm đó. Không dùng tài khoản production cho test này.

MySQL DDL tự commit. Script lưu tiến độ theo từng statement, nhưng nếu tiến trình dừng đúng giữa DDL và cập nhật nhật ký thì cần kiểm tra thủ công trước khi chạy lại. Không chỉnh migration đã áp dụng.

## 7. Dữ liệu cũ và giới hạn

Dữ liệu trên Sites/Turso chưa được chuyển vào MySQL. Bộ SQL này tạo schema mới; không nhập mật khẩu dạng văn bản và không sao chép các phiên đăng nhập đang hoạt động. Website Sites cũ vẫn giữ nguyên.

Trợ lý AI cần khóa API riêng, không dùng trực tiếp gói ChatGPT Plus. Chưa có xác minh email, khôi phục mật khẩu hoặc rate limiting cho đăng nhập. Nội dung demo là giả định. Không đưa `.env.local`, mật khẩu, file dump dữ liệu người dùng hoặc node_modules lên GitHub.
