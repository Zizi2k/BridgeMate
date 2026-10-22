# Kích hoạt trợ lý AI cho BridgeMate

## Tính năng

Có mục Trợ lý AI với 6 công cụ: dịch Việt–Anh, viết đơn giản, viết lịch sự, tóm tắt, tạo checklist và hỏi về nội dung. Trong chi tiết nhiệm vụ có phần mở rộng AI dùng tên, mô tả và sản phẩm bàn giao. Bình luận có nút đưa nội dung sang trang dịch AI. Người dùng chọn ngôn ngữ kết quả; website không tự đổi nhiệm vụ hay gửi bình luận.

## ChatGPT Plus và API

ChatGPT Plus là gói sử dụng ChatGPT, không phải khóa API cho website. BridgeMate gọi OpenAI Responses API ở backend; cần tài khoản API có quyền model và hạn mức phù hợp. Không dùng cookie, mật khẩu ChatGPT hoặc tài khoản Plus làm API key.

## Chạy trên máy

1. Tại thư mục project: `git pull origin main` rồi `npm ci`.
2. Database MySQL cần hoạt động như trước. Chạy `npm run db:migrate` để thêm bảng `ai_usage`; không chạy lại file schema khởi tạo trên database đã có dữ liệu.
3. Thêm vào `.env.local`:

```env
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_MODEL=gpt-4.1-mini
AI_ENABLED=true
AI_DAILY_LIMIT=30
```

4. Điền khóa thật ngay trong file local, không dán vào chat hoặc GitHub. API key chỉ thuộc backend, không đặt tên NEXT_PUBLIC.
5. Khởi động lại `npm run dev`. Đăng nhập, mở Trợ lý AI. Khi có cấu hình sẽ hiện Đã cấu hình; trạng thái này cho biết khóa đã được khai báo, chưa chứng minh khóa có hạn mức. Gửi một nội dung ngắn để kiểm tra gọi thật.
6. Ví dụ: chọn Dịch thuật, nhập “Mình sẽ gửi thiết kế trang chủ trước thứ Sáu”, chọn English, bấm Nhờ AI hỗ trợ.

## Vercel

Thêm cùng các biến OPENAI_API_KEY, OPENAI_MODEL, AI_ENABLED và AI_DAILY_LIMIT trong Environment Variables, chọn môi trường cần dùng rồi redeploy. Không cần đưa khóa vào mã nguồn. Chạy migration trên MySQL online trước khi sử dụng trợ lý AI.

## Giới hạn sử dụng và dữ liệu

Chỉ tài khoản đã đăng nhập được gọi AI. Mỗi tài khoản tối đa 6 yêu cầu/phút và mặc định 30 yêu cầu/ngày UTC; AI_DAILY_LIMIT có giới hạn cấu hình tối đa 200. Các lượt tính khi gửi yêu cầu đến nhà cung cấp, kể cả khi nhà cung cấp báo lỗi. Mỗi đầu vào tối đa 6.000 ký tự, câu hỏi tối đa 2.000 ký tự ở giao diện, phản hồi giới hạn 1.400 output tokens, timeout 25 giây. Các giới hạn số lượt không phải hạn mức chi phí toàn bộ tài khoản API; cấu hình quản lý chi phí riêng trên tài khoản nhà cung cấp.

Bảng ai_usage chỉ lưu bộ đếm và thời điểm hết cửa sổ; không lưu nội dung yêu cầu hay kết quả. Các bản ghi bộ đếm hiện chưa được tự động dọn. Text chỉ được gửi khi người dùng bấm nút AI. Request đặt store:false; điều này không phải cam kết không lưu dữ liệu theo mọi chính sách của nhà cung cấp. Không gửi mật khẩu hay nội dung riêng tư không cần thiết. Kết quả hiển thị dạng văn bản, cần kiểm tra tên, số liệu và thời hạn trước khi dùng.

## Xử lý lỗi

- AI chưa cấu hình: thêm OPENAI_API_KEY hoặc bật AI_ENABLED rồi khởi động lại/redeploy.
- Khóa không có quyền: kiểm tra key và project API.
- Model không dùng được: kiểm tra OPENAI_MODEL và quyền model của key.
- Hết hạn mức: kiểm tra API billing/quota; Plus không thay thế hạn mức API.
- Thiếu bảng ai_usage: chạy migration mới trên đúng database.
- Hết thời gian: thử nội dung ngắn hơn.

## Kiểm chứng

Kiểm thử sử dụng phản hồi mô phỏng của nhà cung cấp để không phát sinh phí và không cần khóa thật. Chưa kiểm tra phản hồi trực tiếp bằng API key của người dùng. Chất lượng dịch cần được nhóm Việt Nam/WCC thử nghiệm sau khi cấu hình.

Tài liệu chính thức: https://developers.openai.com/api/docs/guides/text và https://developers.openai.com/api/docs/models/gpt-4.1-mini

## Dùng tài khoản ChatGPT hiện có khi chưa có API key

Bạn có thể nhập nội dung, chọn công cụ và ngôn ngữ, bấm Sao chép prompt rồi bấm Mở ChatGPT. Dán prompt vào ChatGPT và gửi thủ công bằng tài khoản của bạn. Website không tự truyền nội dung, không đăng nhập thay bạn và không tự nhận kết quả về. Đây là phương án thủ công, không phải nhúng gói Plus vào website.
