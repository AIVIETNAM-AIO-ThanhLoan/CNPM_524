# Trạng thái công việc của dự án

Cập nhật: 21/10/2026. Đối chiếu với commit `ef51000` trên nhánh `latest`.

Nguồn: [README.md](../README.md), [docs/THIET_KE_TONG_HOP/01_DANH_MUC_USE_CASE.md](THIET_KE_TONG_HOP/01_DANH_MUC_USE_CASE.md), [docs/DE_CUONG_THUYET_TRINH.md](DE_CUONG_THUYET_TRINH.md), [docs/TONG_HOP_QUY_TRINH_DO_AN.md](TONG_HOP_QUY_TRINH_DO_AN.md). Các tài liệu này ghi trạng thái theo commit `7e47d99`. Từ đó đến nay có thêm trợ lý AI, ngân sách theo danh mục và sửa thanh ngân sách, nên mục này đã được cập nhật theo mã nguồn.

Chưa chạy lại ứng dụng, build, lint hay kiểm thử trong lần cập nhật này. Mọi mục "đã làm" dưới đây là dựa trên mã nguồn, chưa được xác nhận bằng chạy thử.

## 1. Đã hoàn thành (có mã nguồn)

| Mã UC | Chức năng | Ghi chú |
|---|---|---|
| UC01 | Đăng ký, đăng nhập, đăng xuất, phiên cookie 7 ngày | Mật khẩu băm scrypt. Đăng nhập sai quá 15 lần trong 15 phút thì bị khóa tạm. |
| UC05 | Ghi thu, chi, chuyển tiền giữa hai ví | Ghi sổ kép bằng hai bút toán đối ứng. Có `requestKey` để chống gửi trùng. Chỉ dùng VND. |
| UC06 | Xem lịch sử, tìm kiếm, chọn tháng | Hiển thị tối đa 200 giao dịch gần nhất. Chưa có phân trang. |
| UC16 | Báo cáo thu chi theo tuần hoặc tháng | Có tổng thu, tổng chi, chênh lệch và cơ cấu theo danh mục. Khoảng thời gian tối đa 366 ngày. |
| UC08 | Ngân sách theo danh mục chi và tháng | Có `GET/POST /api/budgets`, trang Ngân sách, và thanh ngân sách trên trang chủ. Tổng ngân sách tự cộng từ các hạn mức. |
| — | Thêm danh mục ngay trên trang ghi giao dịch | Qua `AddCategoryButton` và `POST /api/categories`. |
| — | Trợ lý AI | Gọi DeepSeek có streaming, kèm công cụ tìm kiếm web qua Tavily. Giới hạn 20 tin nhắn và 2.000 ký tự mỗi tin. Cần `DEEPSEEK_API_KEY`, và `TAVILY_API_KEY` nếu muốn tìm kiếm web. |
| — | Lời nhắc | Trang `/reminders` lưu trong trình duyệt bằng `localStorage`. |
| — | Kiểm thử tích hợp | `tests/integration.mjs` gồm kiểm tra ngân sách, mục tiêu và giới hạn đăng nhập. `scripts/test-ai-keys.mjs` kiểm tra khóa AI. |
| — | Cơ sở dữ liệu | Schema 10 bảng, có `db:setup` và thư mục migrations. |

## 2. Làm một phần

| Mã UC | Chức năng | Còn thiếu |
|---|---|---|
| UC03 | Quản lý ví | Chưa sửa hoặc ngừng sử dụng ví. |
| UC04 | Quản lý danh mục | Chưa sửa hoặc ngừng sử dụng danh mục. |
| UC06 | Lịch sử giao dịch | Chưa phân trang đầy đủ. |
| UC08 | Ngân sách | Ngưỡng cảnh báo 70% và 90% được viết cố định trong code. README ghi 80% và 100%. Chưa cấu hình được ngưỡng. |
| UC09 | Cảnh báo ngân sách | Trang thông báo đang dùng dữ liệu mẫu. Chưa có cảnh báo thật và chưa lưu lịch sử cảnh báo. |
| UC11 | Nhắc thanh toán | Chỉ có lời nhắc lưu trong trình duyệt. Chưa có nhắc theo khoản định kỳ, chưa có scheduler. |
| UC14 | Dashboard | Có tổng hợp và số dư. Chưa có mô hình nợ để tính tài sản ròng. |
| UC15 | Mục tiêu | Có tạo và xem. Chưa có tích lũy, phân bổ, kết thúc hoặc tiến độ. |
| UC13 | Quy đổi ngoại tệ | Đã có bảng `exchange_rates`, chưa có API quy đổi. |
| UC10 | Khoản đăng ký định kỳ | Đã có bảng `recurring_transactions`, chưa có API hay giao diện. |
| — | Trang trợ lý AI | Đã gọi API thật. Cần khóa hợp lệ mới trả lời được. |

## 3. Chưa làm

| Mã UC | Chức năng | Ghi chú |
|---|---|---|
| UC07 | Hủy hoặc điều chỉnh giao dịch | Không có API. Schema chưa có liên kết đảo hoặc thay thế. |
| UC12 | Đề xuất khoản định kỳ | Chưa có thuật toán và bảng dữ liệu. |
| UC17 | So sánh giữa các kỳ | UR-F03 chưa có SR tương ứng. |
| UC18 | Đồng bộ tỷ giá | Trang quản trị chỉ mô phỏng. |
| UC19 | Sao lưu dữ liệu | Chưa có tác vụ sao lưu thật. |
| UC20 | Khôi phục dữ liệu | Chưa có quy trình khôi phục. |
| — | Xác thực hai lớp (2FA) | Chỉ xuất hiện trong giao diện mẫu của trang quản trị. |
| — | Đăng nhập Google | Nút đang bị vô hiệu hóa. |
| — | Khôi phục mật khẩu | Trang đăng nhập ghi là chưa hỗ trợ. |
| — | Quét mã QR chuyển khoản | Logic đã gỡ trong commit `7e47d99`. Trang `/scan` chỉ là placeholder. |
| — | "QR của tôi" | Nút chưa có chức năng. |
| — | Đa tiền tệ | Giao dịch chỉ dùng VND. |
| — | Trang quản trị | Giao diện mẫu, số liệu và thao tác đều được giả lập. |

## 4. Việc nên làm để đồng bộ tài liệu

- Cập nhật mốc đối chiếu trong `docs/THIET_KE_TONG_HOP/01_DANH_MUC_USE_CASE.md` từ `7e47d99` lên `ef51000`, và bổ sung trạng thái UC08 cùng trợ lý AI.
- Bỏ hoặc đánh dấu lại sơ đồ trạng thái quét QR, vì chức năng đó đã bị gỡ.
- Thống nhất ngưỡng ngân sách: README ghi 80% và 100%, code dùng 70% và 90%.
- Chạy lại `npm run lint`, `npm run build` và `npm run test:integration` để xác nhận trạng thái trước khi nộp.
- Thêm ghi chú về khóa API vào hướng dẫn cài đặt: `DEEPSEEK_API_KEY` và `TAVILY_API_KEY` đặt trong `.env.local`, không commit.
