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
- Trợ lý AI: dịch, đơn giản hóa, viết lịch sự, tóm tắt, tạo checklist và hỏi về nội dung; mặc định Gemini (có Free tier với hạn mức); cần cấu hình GEMINI_API_KEY. Xem docs/AI_SETUP_VI.md.
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

## Member profiles / Hồ sơ cá nhân

Click your avatar in the top bar or the sidebar, then choose **Edit profile / Chỉnh sửa hồ sơ**. Add a display name, introduction, up to 12 interests, a personal slogan and up to 8 HTTPS social links. **Save & publish profile / Lưu và đăng hồ sơ** publishes the profile to teammates. Click a teammate's picture/name in Our team to view their profile. Only the account owner can edit; people outside shared teams cannot access the profile. Email and password are excluded from the shared profile response.

Avatar upload accepts JPG, PNG and WebP up to 8 MB. The browser center-crops/resizes to 384 × 384 and compresses before upload; the server checks format and caps the stored data URL at 160,000 characters. Raster avatars are stored in MySQL, not Render's temporary filesystem, so no extra storage key is needed. Choose Remove photo then Save to restore initials. This intentionally supports small avatars, not a general photo gallery.

Migration `0002_dazzling_nekra.sql` adds the profiles table without changing existing user records. `npm start` runs pending migrations before startup on Render. For local development run `npm run db:migrate` before `npm run dev`. The Vercel frontend continues proxying `/api` to Render using `API_BACKEND_URL`.

## Editable Phrasebook / Cẩm nang có thể chỉnh sửa

Phrasebook is personal to each account. The 30 starter phrases remain a read-only source template; the UI allows each user to edit or delete their own copies without changing anyone else's phrasebook. New entries require English, Vietnamese and an existing category. Search and category filtering work for both active entries and Trash. Delete asks for confirmation and moves the entry into Trash; Restore brings it back, including edits made before deletion. Changes persist across sign-ins.

Migration `0003_bored_spectrum.sql` adds `phrase_entries` keyed by account and phrase ID. Starter overrides are resolved at read time, so opening Phrasebook does not write 30 copies to the database. The backend scopes all reads and writes to the signed-in account; it never accepts an owner ID from the browser. API: `GET/POST /api/phrases`, `PATCH/DELETE /api/phrases/:id`, `POST /api/phrases/:id/restore`. DELETE requests use JSON `{}` like the other mutation endpoints. Render's existing prestart applies the migration; local development should run `npm run db:migrate`.

## Personal Practice & Learn

Every account receives ten virtual starter questions. Add, edit, soft-delete and restore questions in Practice & Learn. Overrides and imported questions belong only to the current user. Quiz attempts store their own question count, and submissions with a stale revision are rejected.

Download `/templates/BridgeMate_Quiz_Template.docx` from the page, replace the sample questions and upload the `.docx`. The server validates the file and returns a preview; confirming the preview adds all questions in one transaction. Imports allow up to 2 MB and 100 questions, with at most 500 stored entries per account including Trash. Word text is imported; images and arbitrary exam layouts are not converted. Optional English fields fall back to Vietnamese. The original Word file is not stored.

Labels: `Câu 1:`, `Question EN:` (optional), `A.` through `D.` (2–4 choices), optional `A EN:` through `D EN:`, `Đáp án: A`, optional `Giải thích:` and `Explanation EN:`. Each label starts a separate Word paragraph. Type question and choice labels manually; automatic list numbering is not supported.

Migration `0004_shallow_rictor.sql` adds only the personal question table; existing quiz history is preserved. The downloadable template can be regenerated with `python scripts/build-quiz-template.py` using python-docx, then rendered for layout review.

## Team leaders and shared tasks

Each team can elect one leader on Task board or Our team. Every member has one changeable vote; a candidate needs more than half of the total membership. Ties keep the current leader. Successful election atomically sets the leader and clears the round's ballots. The next majority replaces the leader and revokes their old leader-only permissions. Existing teams start with no elected leader.

Only the elected leader or the task creator may delete a task. Deletion hides the parent and its subtasks without erasing stored history. The team owner keeps existing editing rights but needs election to delete other people's tasks.

Tasks retain one primary assignee and can include up to 50 additional collaborators from the same team. The creator, primary assignee, owner and elected leader can manage participants and subtasks. Collaborators can update parent progress; each subtask assignee can update only their own subtask status. Only task editors can change parent requirements.

Subtasks have a title, details, an assigned task participant, an optional deadline and a status. Add/edit/delete structural changes increment the parent requirements version; status updates do not. Reassign or delete a person's subtasks before removing them from the parent task. The primary assignee remains responsible for understanding confirmation.

Migration `0005_abnormal_purifiers.sql` adds the nullable team leader, ballot table, task collaborators, subtasks and soft task deletion. It preserves existing tasks and team ownership. Elections and task writes use a common team-row lock so role changes and assignment changes serialize.

## Team owner settings

Only `teams.ownerId` (the account that created a team) can rename it, edit its description, delete it, or restore it. Elected leadership does not grant these permissions. Our team shows owner-only settings and a list of the user's own deleted teams.

Deletion requires the current exact team name. It soft-deletes the team, blocks its invitation code, hides it from member lists, and denies access to tasks, leadership, team members and profiles shared only through that team. Restoring reactivates the same team, memberships, tasks, conversations and invitation code. Other teams and personal learning data are unchanged. Migration 0006 adds a default-zero deleted flag so existing teams stay active.
