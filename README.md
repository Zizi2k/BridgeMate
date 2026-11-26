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

## Team ranking

Each task's first completion creates one immutable snapshot of its primary assignee and collaborators, in the same transaction as the status update. Every distinct participant in that snapshot earns 10 points in that team. Task creators/leaders receive points only if they participate. Subtasks do not earn separate points. The task ID primary key plus existing parent/team locks prevent concurrent requests, repeated completion or reopening from awarding twice. Later assignment changes and soft deletion do not move or remove earned points.

The team-only leaderboard appears in Our team and as an expandable panel in Task board. Positions use competition ranking: equal points share a position (1, 1, 3). Positive-point places 1–4 are Diamond, Gold, Platinum and Ruby respectively, as requested; zero points and places below 4 have no badge. Scores are private to team members and separate between teams. Deleting/restoring a team hides/restores the same ranking.

Migration 0007 creates completion snapshots and backfills existing completed, non-deleted tasks in active teams using their current participant rosters. Demo seed tasks also record their completed-work snapshot. `node tests/ranking.integration.mjs` exercises idempotency, participant awards, rank order, permissions and team isolation against BRIDGEMATE_TEST_URL.

## Brand assets

The supplied BridgeMate logo is used in the public header, workspace sidebar, login/register panel and loading screen. The PNG retains the navy rounded tile and uses transparent pixels outside its silhouette. `public/brand/bridgemate-logo-4k.png` is the 4096 × 4096 master, while the 512 px web image and 64/180 px browser and Apple icons keep page downloads small.

## Kho liên kết và Kế hoạch ngày

Đăng nhập BridgeMate, sau đó mở **Kho liên kết** hoặc **Kế hoạch ngày** trong thanh điều hướng. Dữ liệu cá nhân được lưu theo tài khoản BridgeMate trong MySQL, tách khỏi dữ liệu của nhóm và của tài khoản khác. Chạy `npm run db:migrate` trên cơ sở dữ liệu BridgeMate trước khi bật phiên bản mới. Render cũng áp dụng migration qua lệnh `prestart` hiện có. Hai mục chạy trong cùng website BridgeMate và dùng cấu hình triển khai của BridgeMate.

## Điền biểu mẫu AI

Đăng nhập và chọn **Điền biểu mẫu AI**. Tải tệp tối đa 8 MB, bấm **Nhận diện trường**, kiểm tra nhãn, nhập dữ liệu và tải bản đã điền cùng định dạng. Module dùng cấu hình AI và hạn mức sẵn có của BridgeMate.

- DOCX: nhận diện dấu chấm, dấu gạch dưới, `{{Tên trường}}` và `[[Tên trường]]` trong nội dung, bảng, đầu trang và chân trang.
- XLSX: nhận diện dấu giữ chỗ và ô trống đã định dạng ngay sau nhãn kết thúc bằng dấu hai chấm. Ô chứa công thức được giữ nguyên.
- PDF: hỗ trợ ô văn bản và ô đánh dấu tương tác (AcroForm). PDF scan, PDF phẳng và XFA chưa hỗ trợ.

Tệp gốc và dữ liệu nhập được xử lý trong trình duyệt. AI chỉ nhận các đoạn ngắn quanh vị trí cần điền thông qua API đang cấu hình. Có thể nhập thủ công nếu AI tạm thời không khả dụng. Văn bản dài có thể làm Word tự xuống dòng hoặc đổi trang theo bố cục mẫu.

## Quản trị tài khoản

Chạy migration trước khi dùng bản mới. Để cấp quyền quản trị, tra UUID tài khoản đã đăng ký bằng MySQL với `SELECT id, email FROM users WHERE demo = 0;`, rồi đặt `BRIDGEMATE_ADMIN_IDS` ở backend bằng UUID đã xác nhận. Có thể thêm nhiều UUID, phân cách bằng dấu phẩy. Đặt biến ở Render nếu Vercel chuyển tiếp API sang Render, hoặc ở Vercel nếu Vercel chạy API trực tiếp. Triển khai lại nơi đã đổi cấu hình.

Quản trị viên mở **Quản trị tài khoản** để khóa và mở khóa tài khoản thường. Khi khóa, các phiên đang lưu của tài khoản bị thu hồi. Quyền trong nhóm và quyền sở hữu dữ liệu cá nhân được kiểm tra độc lập với vai trò quản trị.

### Duyệt tính năng và phiếu lương

Tài khoản thường cần admin duyệt riêng từng mục **Kho liên kết**, **Lương cá nhân**, **Lương nhóm**. Quyền xem lương nhóm còn yêu cầu vai trò chủ nhóm hoặc trưởng nhóm. Admin vào **Quản trị tài khoản** để duyệt, từ chối, thu hồi hoặc xóa tài khoản. Xóa tài khoản thu hồi phiên và ngăn đăng nhập, giữ liên kết lịch sử công việc trong cơ sở dữ liệu.

Quản trị viên sửa thông tin công ty và nhãn trường tại **Mẫu in phiếu lương và phiếu tạm ứng**. Trong bảng lương, có thể in theo dòng hoặc theo tổng từng người trong tháng ở bảng nhóm. Phụ cấp, bảo hiểm và thuế nhập khi in chỉ tác động phiếu hiện tại. Trình duyệt hỗ trợ in A4 hoặc lưu PDF.

### Tra tên chủ tài khoản trên phiếu lương

Cấu hình `VIETQR_CLIENT_ID` và `VIETQR_API_KEY` từ My VietQR ở máy chủ xử lý API (Render nếu đang dùng Vercel rewrite sang Render). Triển khai lại sau khi lưu biến môi trường. Người có quyền bảng lương có thể bấm **Tra tên chủ tài khoản** để gửi mã BIN và số tài khoản tới VietQR. Kết quả xác minh xuất hiện cạnh QR và trên phiếu in.

### Chấm công và lương tháng

- Chạy migration `0013_attendance.sql` bằng `npm run db:migrate` trước khi khởi động phiên bản mới.
- Admin mở **Quản trị tài khoản**, cấp mã nhân viên duy nhất, tên, đơn giá giờ và vai trò **Người quản lý**. Chỉ admin được cấp vai trò và quyền Kho liên kết.
- Trong **Chấm công**, nhân viên nhập mã và tên đã cấp để ghi nhận giờ vào/ra từ máy chủ theo giờ Việt Nam. Mỗi ngày có một ca; ca qua đêm được đóng bằng nút giờ ra. Ca thiếu giờ ra không được đưa vào lương.
- Admin và quản lý xem bảng tháng, sửa giờ với lý do, hoặc mở quyền sửa một lần cho nhân viên. Lịch sử trước/sau được lưu tại `attendance_audit`.
- **Xem trước tổng giờ vào lương** rồi **Cập nhật giờ vào phiếu lương** cập nhật cùng một phiếu tháng, không cộng trùng. Nhân viên tra cứu tại **Phiếu lương của tôi** bằng mã nhân viên.
- Thiết lập `CRON_SECRET` trên Vercel để bật lịch tổng hợp mỗi ngày lúc 01:00 giờ Việt Nam (18:00 UTC). Với Render, cấu hình scheduler gọi `GET /api/cron/attendance` kèm header `Authorization: Bearer <CRON_SECRET>`. Chỉ các tháng đã kết thúc được tổng hợp tự động; xem Chấm công/tra cứu phiếu cũng đối soát các tháng chưa tổng hợp. Ca qua giao tháng chia giờ theo từng tháng; sửa ca cũ được cập nhật ở lần đối soát kế tiếp. Đơn giá của phiếu đã tự tổng hợp được giữ khi đối soát tự động; tổng hợp thủ công sử dụng đơn giá đang cấu hình.
- Giờ công trừ thời lượng nghỉ trưa được chọn cho từng ca. Dữ liệu cũ mặc định nghỉ 0 phút; admin hoặc người được cấp quyền có thể điều chỉnh. Ca giao tháng phân bổ giờ nghỉ theo tỷ lệ thời lượng ca của mỗi tháng. Không thay thế các phiếu lương đã nhập tay.

### Phòng ban, bảng lương và ảnh minh chứng

- Admin tạo, đổi tên hoặc ngưng hoạt động phòng ban tại **Quản trị tài khoản → Phòng ban**. Tài khoản thật chưa có phòng ban phải chọn phòng ban khi vào web. Lựa chọn ở trạng thái chờ duyệt; admin xác nhận cùng thông tin nhân viên. Chỉ admin được đổi phòng ban đã duyệt và cấp vai trò quản lý.
- Quản lý chỉ xem, sửa công, cấp quyền sửa công, xem ảnh và tổng hợp lương của nhân viên có phòng ban đã được xác nhận trùng với mình. Các cấu hình chung, quản trị tài khoản và cấp quyền Kho liên kết dành cho admin. Quyền được kiểm tra lại từ database cho từng request.
- Nút **Xem bảng lương nhân viên** mở bảng lương tháng với tìm kiếm theo mã nhân viên hoặc tên (hỗ trợ tên không dấu). Admin có bộ lọc tất cả/từng phòng ban, tổng theo phòng ban và tổng chung. Quản lý không thể mở phòng ban khác bằng cách thay query string. API bảng lương nhóm cũ chỉ dành cho admin; quản lý dùng bảng lương phòng ban.
- Ảnh có thể đính kèm lúc chấm vào/ra hoặc từ mục **Ảnh minh chứng** trong ca. Lưu tối đa 10 ảnh/ca, 3 MB/ảnh ở định dạng gốc. Nhận các định dạng trình duyệt, HEIC/HEIF, TIFF, SVG, PSD, RAW máy ảnh và các MIME `image/*`. Các định dạng không xem trực tiếp được tải xuống; nội dung không được nhận dạng là ảnh raster an toàn luôn được trả dưới dạng file tải xuống, không thực thi trong trang web.
- Nhân viên có thể bổ sung ảnh khi ca còn mở hoặc trong 15 phút sau khi chấm ra; sau đó cần quyền sửa công. Admin có thể bổ sung ảnh. Quản lý chỉ xem và gửi yêu cầu đổi ảnh cho nhân viên trong phòng ban, không được tải thêm hoặc thay ảnh của nhân viên.
- Ảnh hết hạn hai tháng sau thời điểm tải lên, bị chặn tải ngay khi hết hạn và được xóa vật lý bằng lịch `/api/cron/attendance` hiện có mỗi ngày, cùng cơ chế dọn khi mở mục chấm công/ảnh. Giữ lại giờ công và phiếu lương. Không ghi nội dung ảnh vào audit log.
- Chạy migration `0015_departments_evidence.sql` trước khi chạy phiên bản mới. Các tài khoản đang có vai trò quản lý cần được admin xác nhận phòng ban trước khi có quyền xem lương phòng ban.

### Review minh chứng và xuất lương theo tháng/năm

- **Xem ảnh minh chứng → Review / xem ảnh** mở hộp xem ảnh lớn, có ảnh nhỏ cho các định dạng raster được trình duyệt hỗ trợ. Định dạng khác có liên kết tải ảnh gốc. Quyền xem giữ nguyên: nhân viên xem của mình, quản lý xem phòng ban mình, admin xem toàn bộ.
- Quản lý bấm **Yêu cầu thay đổi ảnh**, nhập lý do. Nhân viên thấy nhãn có yêu cầu và lý do tại đúng ảnh, rồi dùng **Gửi ảnh thay thế**. Yêu cầu mở quyền thay đúng ảnh đó, không mở quyền sửa giờ công; sau khi thay thành công, yêu cầu được đánh dấu hoàn tất. Không cho quản lý tự tạo yêu cầu với ảnh của mình để mở lại quyền. Admin giữ quyền tối cao.
- API chặn quản lý tải thêm, sửa hoặc thay ảnh của nhân viên, kể cả dùng trực tiếp request thay vì giao diện. Nhật ký chỉ ghi người thực hiện, ảnh liên quan, tên và lý do; không sao chép dữ liệu ảnh vào nhật ký. Hạn lưu hai tháng bắt đầu lại theo ngày tải ảnh thay thế.
- Trong **Xem bảng lương nhân viên**, chọn **Theo tháng / Cả năm**, tìm kiếm hoặc bấm **Xem toàn bộ nhân viên phòng ban**. Chọn nội dung **Bảng lương / Toàn bộ phiếu lương**, sau đó **Xuất XLSX / Xuất PDF**. Có nút xuất riêng cho từng phiếu tháng.
- Xuất cả năm tạo báo cáo gồm các kỳ lương của năm; bộ phiếu giữ riêng từng nhân viên, từng phòng ban và từng tháng, không gộp các tháng thành một phiếu sai kỳ. XLSX có trang danh sách và các trang phiếu; PDF có một trang cho mỗi phiếu và bảng lương nhiều trang tự lặp tiêu đề.
- Export dùng cùng API lọc phòng ban ở máy chủ, không lấy dữ liệu ngoài phạm vi quản lý dù thay đổi query phòng ban, nhân viên hay kỳ lương. File trả về riêng tư, không cache. PDF nhúng font Noto Sans sẵn có để giữ tiếng Việt.
- Chạy migration `0016_evidence_review.sql` trước khi khởi động phiên bản này.

### Chấm công bổ sung và website hoạt động nhóm

- Trong **Chấm công**, admin và quản lý có nút **Chấm công bổ sung ngày trước**. Chọn nhân viên, ngày trước hôm nay, giờ vào/ra, nghỉ trưa, ca qua đêm nếu có và lý do bổ sung. Quản lý chỉ chọn được nhân viên thuộc phòng ban đã được duyệt của mình; admin chọn được toàn bộ nhân viên có mã đã cấp.
- API xác thực lại phạm vi phòng ban, ngày theo múi giờ Việt Nam, thời điểm kết thúc không ở tương lai, thời lượng không vượt 24 giờ và nghỉ không vượt tổng ca. Khóa bản ghi nhân viên và kiểm tra khóa duy nhất nhân viên/ngày để không tạo trùng hoặc ghi đè ca cũ. Nếu đã có ca, dùng chức năng sửa chấm công hiện có.
- Bản ghi bổ sung được đánh dấu riêng, lưu người bổ sung và lý do trong nhật ký; giờ công đi vào tổng hợp lương như ca thông thường. Nhân viên được tải ảnh của mình cho ca bổ sung dù ngày ca đã qua, không mở quyền sửa giờ công. Quản lý vẫn không được tải hoặc thay ảnh của nhân viên.
- **Nhóm của tôi → Website hoạt động của nhóm** có ô dán link và nút mở website ở tab mới. Người tạo nhóm, trưởng nhóm được bầu hoặc admin (có quyền vào nhóm) cập nhật link; các thành viên khác xem và mở link. Để trống rồi lưu để gỡ link.
- Chỉ nhận HTTP/HTTPS, tự thêm HTTPS khi dán tên miền chưa có giao thức; từ chối link chứa mã thực thi hoặc thông tin đăng nhập. Hệ thống không truy cập nội dung website bên ngoài khi lưu link.
- Migration: `0017_attendance_supplement_team_website.sql`.

### Ứng lương, thanh toán và cộng gộp công nợ

- Phiếu lương hiển thị **Tổng lương − tiền đã ứng − lương đã thanh toán = còn phải trả**. Khoản ứng đã có trong dòng bảng lương được cộng với các khoản ứng mới ghi nhận; không nhập lại cùng một khoản ứng vào hai nơi.
- Trong **Xem bảng lương nhân viên**, dùng **Ghi nhận ứng / trả lương** để lưu khoản chi thực tế theo nhân viên, phòng ban và kỳ lương. Có ngày chi, ghi chú, lịch sử và hủy ghi nhận sai có lý do. Chỉ admin và quản lý trong phạm vi phòng ban được phép ghi nhận hoặc hủy. Đây là lưu sổ ứng/thanh toán; không gọi API chuyển tiền.
- Dữ liệu cũ chưa có trạng thái lương đã trả. Người quản lý cần ghi nhận các khoản đã thanh toán trước đây để công nợ không bị tính dư. Giá trị tiền ứng cũ được tính sẵn, không cần nhập lại.
- **Tổng cộng gộp công nợ** tự tạo phiếu khi một kỳ còn nợ cũ hơn kỳ đang xem trên 2 tháng. Ví dụ xem 2026-11, kỳ 2026-08 còn nợ sẽ kích hoạt. Phiếu gồm các kỳ chưa tất toán đến kỳ đang xem (và kỳ hiện tại), bỏ các kỳ cũ đã trả hết; tiền ứng, lương đã trả và số còn lại được trình bày từng kỳ. Phần ứng vượt lương của cùng nhân viên/phòng ban được giữ như số dư để trừ trong phiếu gộp.
- Phiếu gộp được tính từ sổ gốc, không tạo bản ghi thu nhập trùng. Trả nợ từ phiếu gộp phân bổ vào các kỳ cũ nhất trước; chặn số trả vượt số còn nợ. Yêu cầu lưu có khóa giao dịch và khóa dòng để gửi lại cùng thao tác không cộng tiền hai lần.
- Có XLSX/PDF phiếu gộp và trang chi tiết công nợ từng kỳ. Phiếu tháng trên trang nhân viên cũng tự dùng phiếu gộp khi đủ điều kiện. Chọn cả năm dùng kỳ cuối năm làm mốc đối chiếu; báo cáo tháng dùng chính kỳ đã chọn.
- Migration: `0018_salary_payments.sql` tạo sổ chi trả và bảng khóa giao dịch. Lịch tổng hợp giờ công không ghi đè sổ ứng/thanh toán.

### Attendance email notifications
Self clock-in/out writes one email per active administrator and approved manager of the employee's active department in the same transaction as the shift. Recipients are derived server-side and deduplicated by email; their permission is rechecked before delivery. Emails show employee name/code, department, Vietnam times and net hours at clock-out. The employee account email is Reply-To, not an impersonated From address. Photos stay behind authenticated review; no image attachment or public proof link.

Set `RESEND_API_KEY` and `ATTENDANCE_MAIL_FROM` on Render. From must be verified with Resend; Gmail addresses entered as account emails do not authorize sending from Gmail. Never put these credentials in NEXT_PUBLIC variables or commit them. Without configuration, attendance remains saved and emails remain pending, and the admin attendance page shows a setup notice. Deployment migration 0019 creates the notification outbox. Next after() attempts delivery after successful commit; subsequent clocks and protected daily attendance cron retry pending deliveries. Individual messages have a stable Resend idempotency key; retries stop after five attempts or 23 hours from first tracked attempt. Failed or deauthorized messages remain recorded; no delivery guarantee is made until the sender is configured and verified.

Managers and admins also receive an in-app attendance notification immediately after a successful clock transaction, independent of email setup. The header bell refreshes every 30 seconds while visible and on focus, lists the latest 50 notifications, counts unread items and supports marking one/all read. Each recipient has their own read state. Department managers are limited to their current approved active department; admins see notifications addressed to themselves. Revoked recipients cannot read or receive queued email. Existing historical shifts do not create retrospective notifications.

### Employee team supervision
The Nhóm của nhân viên screen lets department managers list teams containing their approved active, assigned employees, read tasks assigned to those employees, create tasks with deadlines and update deadlines. Admins can supervise assigned employees across departments. Mixed teams expose only the managed employees and tasks assigned to them; no invitation codes, other departments’ tasks or implicit memberships are granted. Removed/suspended/demo accounts and deleted teams are excluded. Deadline edits increment task version to invalidate outdated understanding confirmations. Standard team membership, elections, deletion, payroll and link permissions remain independent.

### Admin-approved password recovery
The login dialog has Quên mật khẩu. A public request returns the same message for all valid email inputs, creates no password/token and preserves current sessions until admin approval. Existing pending requests are deduplicated and fresh requests have a one-hour per-account cooldown. Admin account administration lists pending requests; only a supreme admin may confirm identity and issue a random 128-bit temporary password (shown once, to be relayed privately after verification). Approval stores only a salted password hash, records reviewer/time, resolves the request and revokes every old session. No email sender is required. Temporary-password login is restricted server-side to password change/logout/me until the owner sets a different password of at least eight characters. Login, password change and reset serialize on the user row so old credentials cannot create a session after a completed reset. Migration 0020 adds password recovery records and the mandatory password-change flag. Admins cannot approve their own request through this screen. No existing production passwords were changed during implementation.

### Daily work with different pay
Công việc trong ngày và đơn giá riêng is available in attendance and monthly department payroll. Managers/admins enter an employee, day, job, specific note, hours and rate. Replacement mode changes the rate for allocated net hours within a completed shift: payroll keeps base attendance hours and adds only the pay difference; cumulative allocations cannot exceed net paid minutes for the shift in that payroll month. Extra mode adds separate hourly or fixed job pay and does not deduct attendance. Employees have read-only access to their own items; department managers are restricted to their department and admin retains global access. Creation uses a stable request ID to avoid duplicate payment on retry. Entries and removals are audited; corrections use remove/re-add. Monthly attendance synchronization reprices replacement differences against the actual monthly base rate and preserves the original advance/commission. Details survive payment deduction and overdue consolidation and are included in printed payslips, XLSX Chi_tiet_cong_viec and paginated PDF detail pages. No schema migration is required; records are isolated in team:daily-work payroll scope.

### Monthly attendance reports
Chấm công → Xem danh sách chấm công opens a monthly collective summary or selected employee report. Admins can filter departments globally; department managers are restricted server-side to currently approved employees in their own active department, and ordinary employees cannot access the report/export endpoint. The same authorized report data feeds the screen, XLSX and PDF. Each employee sheet/table includes every calendar day, Vietnam timestamps, lunch minutes per shift, payable minutes within the chosen month, open/empty/future status, supplemental flags, audit reasons with actor/time and daily work notes. Overnight carry-in/out shares use the same monthly-minute allocation as payroll. Missing entries do not imply unauthorized absence; unfinished shifts contribute zero payable minutes. XLSX has a collective sheet and per-employee sheets with frozen/repeated headers, wrapped notes, numeric hours and literal strings; lengthy notes continue on additional rows without duplicating numeric hours. PDF is A4 landscape with repeated headers, page numbering, paginated full notes, totals and sign-off areas. No schema or existing attendance changes are required.

### Admin bulk attendance import
Chấm công → Nhập chấm công hàng loạt từ Excel provides a blank template with a separate instruction/example sheet. Only the Cham_cong sheet is imported, with eight exact headers and one employee/day per row. The admin-only endpoint accepts up to 5,000 populated rows or a 3 MB XLSX, supports multiple employees/months, native Excel date/time values (1900/1904 calendars), ISO or dd/mm/yyyy dates and overnight shifts. Codes and names must match server assignments; future/unfinished/invalid/overlapping shifts and in-file duplicate days are rejected. Formula cells, external-link/macro files, XML entities, oversized XML/ZIP payloads and malformed sheet references are rejected.

The server previews every row without writing, then revalidates all rows under employee locks during confirmation. Any invalid row rolls back the entire batch. Existing employee/day records can be skipped (default), never overwritten. Stable batch IDs and file/option hashes make retries return the original result without duplicate shifts. Imported shifts are marked supplemented with actor, batch ID, original Excel line and reason in attendance audit. No photos or file bytes are stored by import, and no retrospective clock email blast is sent. Payroll uses existing monthly reconciliation/preview/sync and preserves daily rate adjustments. Migration 0021 adds idempotent import batch records. The committed template is authored once; the app serves it without a spreadsheet-authoring runtime dependency.

### Required location and image for clock-in/out
Normal clock-in and clock-out require a fresh browser geolocation reading (numeric coordinates, accuracy and device capture time within five minutes of the server) plus a selected image up to 3 MiB. The browser requests location only when the user presses a clock button, with maximumAge 0, high accuracy and a 20-second timeout. Denied/unavailable location or missing/invalid images prevent the normal clock operation. There is no background tracking or geofence; coordinates are device-reported, not proof against spoofing.

The shift update, event-specific photo and notification outbox are committed in one database transaction, so failed image persistence cannot leave a new clock event without evidence. Clock locations are stored separately for in/out and shown as scoped map links with reported accuracy; report exports include recorded coordinates. Existing rows remain valid with null locations. Photo access remains scoped and safe-preview rules plus two-month expiry are unchanged. Live shifts reserve one of the ten photo places for checkout (nine photos maximum before clock-out).

Historical supplementation, including Excel import, does not require location or an image. The supplemental form optionally accepts one initial image, saved with the new record; managers may attach this initial evidence when creating a supplemental record but cannot replace existing employee evidence. Employees retain the ability to add their own supplementary evidence. Admin Excel template download and import controls are always visible in attendance, rather than hidden in a collapsed section. Migration 0022 adds nullable locations and photo action metadata; old data is not backfilled with invented coordinates.

### Employee weekly work registration
Đăng ký lịch làm tuần is available to real signed-in accounts. Employees with an assigned code and approved active department can register their own future shifts (multiple non-overlapping shifts/day), with Vietnam start/end times, overnight flag, planned lunch and notes. Employees can edit/delete only their own shifts before the original start time; version checks reject stale edits. A stable client ID prevents duplicate creates after retry, and employee-row locks serialize overlap checks across simultaneous requests. Deletion is soft.

The week begins Monday and includes Sunday; overnight shifts retain their actual next-day end even across a week boundary. Department managers see a roster/calendar only for approved current employees in their active department and the matching department snapshot; they cannot edit staff schedules. Admins may view/filter all department registrations. Search supports code and Vietnamese name without accents; staff without registrations remain visible in the roster. Calendar hours are planned, net of selected lunch, and never create attendance, payroll, task deadlines or automatic check-ins. No email is sent by registration. Migration 0023 creates the separate work_schedules table.

### Direct phone camera evidence
The shared evidence picker has Chụp ảnh trực tiếp and Chọn ảnh từ máy. The first uses a user-activated native file input with accept=image/* and capture=environment to request the phone camera; the second retains arbitrary supported image-format selection. Availability and camera switching depend on the device/browser, with file selection as fallback. Selected safe raster images receive a local preview and can be removed or retaken before saving. The same picker is used for normal clock proof, optional supplemental proof, additional photos and authorized replacements. Existing manager/employee photo permissions are unchanged.

Oversized camera raster photos (up to 25 MiB source) are reduced to a maximum 2048-pixel long side, preserving aspect ratio, and encoded as JPEG until they fit the existing 3 MiB upload limit. No SVG/unknown-format decoding is attempted for this conversion; unsupported large images require a smaller/JPEG capture. Gallery uploads preserve original formats and the existing size cap. Temporary object URLs are revoked. No camera stream or background capture is opened, and photos remain local until the user saves the clock/supplement/evidence action. Real phone hardware was not available for automated verification.

### Employee other-work / out-of-hours attendance
Every assigned employee with an approved department may choose Chấm công khác / ngoài giờ, enter a job name/reason, then clock actual server-time in/out with the same required photo and device location as regular attendance. A single employee may have only one open shift of any type; multiple non-overlapping other-work shifts can be recorded on the same day. One regular shift/day remains enforced by the nullable regular_day unique key, with existing regular records backfilled by migration 0024. Every application regular insert (clock, historical supplement, Excel import) writes that key.

Managers/admins may supplement a past other-work shift with a name and reason and optional initial photo. Excel imports remain regular shifts and may coexist with non-overlapping other-work shifts, without overwriting either. Existing overlap checks now cover all types and attendance edits serialize on the employee. Monthly reports list shifts in chronological order, label other-work jobs, and sum actual net minutes once. Monthly payroll includes all completed shifts at the admin-assigned base hourly rate; employees cannot set rates. Managers/admins can use daily-work rate replacement for selected hours across the completed shifts of that day; the shared daily cap prevents double allocation. Planned weekly registrations still do not create attendance or wage entries.
