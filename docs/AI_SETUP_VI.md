# Trợ lý Gemini cho BridgeMate

BridgeMate mặc định dùng Gemini Developer API cho sáu chức năng: dịch Việt–Anh, viết dễ hiểu, viết lịch sự, tóm tắt, tạo checklist và hỏi về nội dung. Có trong mục AI và trang chi tiết nhiệm vụ. Kết quả chỉ là bản gợi ý; không tự gửi tin nhắn hay thay đổi nhiệm vụ.

## 1. Tạo khóa miễn phí

Vào https://aistudio.google.com/apikey, đăng nhập Google và tạo API key trong project thuộc Free tier. Kiểm tra model `gemini-2.5-flash-lite` có hạn mức trong project của bạn. Không nâng cấp billing nếu chỉ muốn dùng miễn phí. Free tier có hạn mức, tùy khu vực/tài khoản/model và có thể thay đổi. Hạn mức BridgeMate không thay thế hạn mức Google; sáu thành viên chia sẻ quota của cùng project Google.

Không gửi API key vào chat, commit lên GitHub hoặc nhập vào giao diện website. Khóa chỉ nằm trong biến môi trường backend.

## 2. Cấu hình trên Windows

Trong PowerShell ở thư mục dự án:

```powershell
git pull origin main
npm ci
notepad .env.local
```

Giữ cấu hình MySQL hiện tại và thêm hoặc cập nhật các dòng sau (không tạo dòng trùng):

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash-lite
AI_ENABLED=true
AI_DAILY_LIMIT=30
```

Thay YOUR_GEMINI_API_KEY bằng khóa của bạn. Các giá trị OPENAI cũ không được dùng khi AI_PROVIDER=gemini. Không đặt tiền tố NEXT_PUBLIC_ cho khóa.

```powershell
npm run db:migrate
npm run dev
```

Nếu máy chủ đang chạy, dừng bằng Ctrl+C rồi chạy lại. Migration tạo bảng ai_usage nếu bạn chưa áp dụng bản AI trước; lần đổi provider này không thêm bảng mới.

Đăng nhập BridgeMate, mở mục AI, chọn Dịch thuật, nhập “Please submit the slides by Friday at 5 PM”, chọn Tiếng Việt và bấm Nhờ AI hỗ trợ. Kiểm tra kết quả giữ nguyên thời hạn. Nhãn “Đã cấu hình” chỉ xác nhận có cấu hình, không xác nhận key hoạt động.

## 3. Vercel

Thêm năm biến AI ở trên vào Settings → Environment Variables của project Vercel, chọn các môi trường cần dùng rồi Redeploy. Dùng cùng model và project Free tier. MySQL online và migration phải sẵn sàng trước khi gọi AI.

## Giới hạn và xử lý lỗi

- Tối đa 6 lượt/phút và mặc định 30 lượt/ngày UTC cho mỗi tài khoản; lượt được giữ chỗ nguyên tử trong MySQL trước khi gọi API. Lượt gọi lỗi vẫn tính vào giới hạn ứng dụng.
- Hết quota Google: ứng dụng báo lỗi, không tự retry, đổi model hoặc chuyển OpenAI. Nếu cần, chờ quota phục hồi hoặc kiểm tra hạn mức trong AI Studio.
- Nếu key thuộc project trả phí thì Google có thể tính phí. Mã nguồn không kiểm tra được trạng thái billing; muốn miễn phí phải dùng project Free tier.
- Chưa cấu hình: kiểm tra GEMINI_API_KEY, AI_PROVIDER=gemini, AI_ENABLED=true rồi khởi động lại/redeploy.
- Không cấp quyền: kiểm tra key mới tạo và quyền project trong AI Studio. Không dùng key đã lộ.
- Model không khả dụng hoặc yêu cầu không hợp lệ: kiểm tra GEMINI_MODEL, key và khả năng truy cập model của tài khoản.
- Nội dung bị chặn hoặc câu trả lời bị cắt: diễn đạt lại hoặc rút ngắn đầu vào.

## Dữ liệu và bảo mật

Chỉ văn bản/ngữ cảnh bạn chủ động gửi được chuyển đến provider; không gửi toàn bộ cơ sở dữ liệu. Gemini Free tier có thể dùng nội dung để cải thiện sản phẩm Google. Không gửi dữ liệu nhạy cảm. BridgeMate không lưu văn bản/câu trả lời AI vào MySQL; bảng ai_usage chỉ lưu số lượt theo tài khoản/thời gian. Bảng này chưa có tác vụ dọn dữ liệu tự động. Chính sách lưu giữ của Google vẫn áp dụng.

API key gửi bằng header từ backend, không có trong URL hoặc bundle trình duyệt. Lỗi upstream được đổi thành mã lỗi an toàn. Phản hồi AI hiển thị như văn bản, không thực thi HTML. Các quy tắc prompt không đảm bảo tuyệt đối kết quả đúng; kiểm tra tên, số liệu và thời hạn.

## Tùy chọn OpenAI

Chỉ khi chủ dự án chủ động chọn AI_PROVIDER=openai, đặt OPENAI_API_KEY và OPENAI_MODEL thì backend mới gọi OpenAI; đây là dịch vụ API riêng có thể tính phí. Gemini không tự chuyển sang OpenAI khi lỗi. Nút sao chép prompt/mở ChatGPT là phương án thủ công, không tích hợp tài khoản Plus vào API.

## Kiểm thử và tài liệu

19 unit tests đã chạy với phản hồi Gemini/OpenAI giả lập; chưa có key thật để xác minh gọi Gemini trực tiếp. Chưa xác minh quota với MySQL thật hoặc triển khai Vercel trong phiên này.

- Giá và free tier: https://ai.google.dev/gemini-api/docs/pricing
- Tạo key: https://ai.google.dev/gemini-api/docs/api-key
- REST API: https://ai.google.dev/api/generate-content
