# Personal Wealth & Expense Tracker

Ứng dụng quản lý tài chính cá nhân, hỗ trợ theo dõi thu chi, ngân sách và mục tiêu tiết kiệm theo mô hình sổ cái kép (double-entry ledger).

## Chức năng dự kiến của dự án

- Quản lý tài khoản, ví tiền và danh mục thu chi.
- Ghi nhận giao dịch và xem báo cáo theo kỳ.
- Quy đổi đa tiền tệ và lưu tỷ giá áp dụng.
- Quản lý ngân sách, cảnh báo tại ngưỡng 80% và 100%.
- Theo dõi khoản thanh toán định kỳ và nhắc ngày đến hạn.
- Hiển thị dashboard và tiến độ mục tiêu tài chính.

## Phân công

| Thành viên | Công việc |
| --- | --- |
| Anh | Giao diện, dashboard, ngân sách và biểu mẫu giao dịch |
| Tín | API giao dịch, quy đổi tiền tệ và cảnh báo ngân sách |
| Loan | Cơ sở dữ liệu sổ kép, xác thực, bảo mật và sao lưu |
| Linh | Kiểm thử sổ kép, API và tích hợp CI/CD |

## Trạng thái

Đã có Next.js 16 + React 19 và backend MySQL/MariaDB: đăng ký, đăng nhập/đăng xuất, phiên cookie, ví, danh mục, thu/chi/chuyển tiền sổ kép, lịch sử và báo cáo theo kỳ. Mỗi tài khoản mới có hai ví số dư 0 và sáu danh mục mặc định.

Tab **Ngân sách** cho phép đặt/sửa hạn mức theo danh mục chi tiêu và tháng. Tạo danh mục tại **Trang chủ → Ghi giao dịch → Thêm danh mục** (nút cạnh tiêu đề **Danh mục**); trang Ngân sách lấy các danh mục chi tiêu từ đó để đặt hạn mức. Tổng ngân sách tự cộng từ các hạn mức đã lưu, không nhập riêng. Lịch sử giao dịch truy cập từ Báo cáo.

Mục tiêu, khoản định kỳ và tỷ giá chưa có quy trình đầy đủ. Giao diện Ting Ting có các trang trợ lý AI và thông báo từ nhánh main; hai trang này vẫn dùng phản hồi/dữ liệu mẫu, chưa kết nối dịch vụ AI hoặc database. Đăng nhập Google, khôi phục mật khẩu, "QR của tôi" và trang quản trị vẫn là phần chưa triển khai/bản mẫu. Giao dịch hiện chỉ dùng VND.


## Chạy ứng dụng với XAMPP trên Windows

1. Mở XAMPP Control Panel và bật **MySQL** (MariaDB đi kèm XAMPP). Không cần bật Apache để chạy Next.js.
2. Mở PowerShell trong thư mục repo và cài thư viện:

```powershell
cd C:\xampp\htdocs\CNPM_524
npm.cmd ci
Copy-Item .env.example .env.local
```

3. Sửa `.env.local`: thay `DB_PASSWORD=CHANGE_ME` bằng mật khẩu ngẫu nhiên riêng cho ứng dụng. `DB_SETUP_USER=root` và `DB_SETUP_PASSWORD=` phù hợp với XAMPP mặc định trên máy cục bộ; nếu bạn đã đổi mật khẩu root, nhập mật khẩu tương ứng. Ứng dụng kết nối bằng `cnpm_524_app`, không dùng root.
4. Tạo database, bảng và tài khoản ứng dụng, sau đó chạy:

```powershell
npm.cmd run db:setup
npm.cmd run dev
```

Mở [http://localhost:3000](http://localhost:3000), chọn **Tôi → Tạo tài khoản**, đăng ký rồi đăng nhập. Chọn **Ghi giao dịch** để ghi thu, chi hoặc chuyển tiền. Xem số dư ở **Tôi**, lịch sử và báo cáo ở các tab tương ứng. Dữ liệu vẫn còn sau khi khởi động lại ứng dụng.

Trên máy đã được cấu hình, giữ nguyên `.env.local`; chỉ cần bật MySQL và chạy `npm.cmd run dev`. Dừng server bằng `Ctrl+C`. Nếu đổi cổng hoặc dùng `127.0.0.1` thay `localhost`, đổi `APP_ORIGIN` cho khớp rồi khởi động lại server; các yêu cầu ghi dữ liệu kiểm tra origin để chống CSRF.

`db:setup` không xóa dữ liệu và có thể chạy lại. Không commit `.env.local`. Khi triển khai qua HTTPS, đặt `APP_ORIGIN` theo domain thật và `COOKIE_SECURE=true`.

Chi tiết bảng, ERD, API, giới hạn hiện tại và cách kiểm thử: [database/README.md](database/README.md).

Scripts:

- `npm run dev`: chạy môi trường phát triển
- `npm run build`: build production
- `npm run start`: chạy bản build
- `npm run lint`: kiểm tra ESLint
- `npm run db:setup`: tạo database, áp dụng schema một lần và tạo user ứng dụng mới
- `npm run test:integration`: kiểm thử HTTP trên database và server tạm, tự dọn tài nguyên
