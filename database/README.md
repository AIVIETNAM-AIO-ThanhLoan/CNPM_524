# Database và backend

## Cài đặt

Yêu cầu Node.js 20.9+, MySQL 8+ hoặc MariaDB 10.4+. XAMPP đã kèm MariaDB; bật nút MySQL trong XAMPP Control Panel. Hướng dẫn chạy từng bước nằm ở [README chính](../README.md).

`.env.local` giữ cấu hình ứng dụng và credentials setup, được Git bỏ qua. `DB_USER` phải là tài khoản riêng, không phải root, có mật khẩu không rỗng. `DB_SETUP_USER` chỉ dùng bởi CLI để tạo database/user và bảng. Script không đổi mật khẩu hoặc quyền của user đã có; nếu dùng user có sẵn, quản trị viên phải cấp quyền DML trên database tương ứng trước.

`npm.cmd run db:setup` áp dụng `schema.sql` và các migration đã khai báo trong script, ghi checksum trong `schema_migrations` và không chạy lại phiên bản đã áp dụng. Migration 002 thêm trigger thu hồi mọi session khi một user bị khóa (`blocked=true`); mở khóa không khôi phục các session cũ.

| Migration | Nội dung |
| --- | --- |
| 003 | `exchange_history` lịch sử quy đổi theo `user_id` (UC13). Nếu DB đã có bảng tạo tay không có `user_id`, setup đổi tên thành `exchange_history_legacy`, không xóa dữ liệu |
| 004 | 2FA TOTP: cột `totp_*` trong `users`, `login_challenges` (phiên chờ bước hai), `totp_recovery_codes` (mã dự phòng) |
| 005 | Mã khôi phục mật khẩu: `users.recovery_code_hash` |
| 006 | Hủy/điều chỉnh giao dịch bằng bút toán đối ứng: `reverses_id`, `replaces_id`, `reason`, `created_by` trong `transactions` (UC07) |
| 007 | Mục tiêu có tài khoản sổ cái riêng `kind='goal'`, `status`, `closed_at` (UC15) |
| 008 | `budget_alerts` cảnh báo ngân sách theo người dùng, chống trùng theo danh mục/tháng/ngưỡng (UC09) |
| 009 | `reminder_deliveries` lịch sử nhắc khoản định kỳ, chống gửi trùng (UC11) |
| 010 | `backup_runs` kết quả mỗi lần sao lưu (UC19) |

Chạy lại `npm.cmd run db:setup` sau khi lấy code mới để áp dụng migration còn thiếu. MySQL DDL tự commit: nếu lần đầu bị lỗi giữa chừng, kiểm tra nguyên nhân và các bảng đã tạo trước khi tiếp tục; script chủ động dừng khi phát hiện bảng `users` không có migration, không xóa bảng để thử lại. Thay đổi schema đã áp dụng cần migration mới.

## Mô hình dữ liệu

```mermaid
erDiagram
    users ||--o{ sessions : "đăng nhập"
    users ||--o{ accounts : "sở hữu"
    accounts ||--o| categories : "tài khoản đối ứng"
    users ||--o{ transactions : "ghi"
    categories o|--o{ transactions : "phân loại"
    transactions ||--|{ transaction_entries : "dòng sổ"
    accounts ||--o{ transaction_entries : "hạch toán"
    categories ||--o{ budgets : "ngân sách tháng"
    users ||--o{ goals : "mục tiêu"
    accounts ||--o{ recurring_transactions : "ví định kỳ"
    categories ||--o{ recurring_transactions : "danh mục định kỳ"
```

| Bảng | Vai trò |
| --- | --- |
| `users` | Tài khoản email/số điện thoại chuẩn hóa, tên, mật khẩu băm scrypt, vai trò và trạng thái |
| `sessions` | SHA-256 của token ngẫu nhiên, người dùng và hạn dùng 7 ngày; không lưu token gốc |
| `accounts` | Ví và tài khoản đối ứng thu/chi; hiện giới hạn VND |
| `categories` | Danh mục thu hoặc chi, gắn với một tài khoản sổ cái |
| `transactions` | Loại, số tiền, ngày, ghi chú, danh mục và khóa chống gửi trùng |
| `transaction_entries` | Hai dòng tiền có dấu đối ứng của mỗi giao dịch |
| `budgets` | Hạn mức theo danh mục/tháng; schema nền tảng |
| `goals` | Tên, số tiền đích, hạn, trạng thái; mỗi mục tiêu có một tài khoản sổ cái `kind='goal'` |
| `recurring_transactions` | Quy tắc định kỳ; chưa có scheduler phát sinh giao dịch |
| `exchange_rates` | Tỷ giá theo ngày; chưa áp dụng quy đổi đa tiền tệ |
| `exchange_history` | Lịch sử quy đổi tiền tệ của từng người: số tiền, kết quả, tỷ giá áp dụng, thời điểm |
| `login_challenges`, `totp_recovery_codes` | Phiên chờ nhập mã 2FA (5 phút, tối đa 5 lần sai) và mã dự phòng 2FA (chỉ lưu SHA-256) |
| `budget_alerts` | Cảnh báo chạm ngưỡng ngân sách, trạng thái đã đọc; mỗi ngưỡng một lần mỗi tháng |
| `reminder_deliveries` | Mỗi lần nhắc khoản định kỳ theo kỳ/ngày nhắc, trạng thái gửi và số lần thử |
| `backup_runs` | Thời điểm, file, dung lượng, SHA-256 và lỗi của mỗi lần sao lưu |
| `schema_migrations` | Phiên bản và checksum schema đã áp dụng |

Khóa ngoại ghép `(user_id, id)` giữ tài khoản, danh mục và dòng sổ trong cùng một người dùng. Tất cả API đọc/ghi đều lấy user từ session phía server; client không được chọn `user_id` hay vai trò khi đăng ký.

## Quy tắc sổ kép

Số tiền lưu bằng `DECIMAL(14,2)`, nhập dưới dạng chuỗi thập phân dương, tối đa `999999999999.99`. Không tính dòng hạch toán bằng số dấu phẩy động. Số dư ví được tính bằng tổng dòng sổ, không duy trì một cột số dư riêng.

| Nghiệp vụ | Dòng 1 | Dòng 2 |
| --- | --- | --- |
| Thu 1.000.000đ | Ví +1.000.000 | Tài khoản thu -1.000.000 |
| Chi 50.000đ | Ví -50.000 | Tài khoản chi +50.000 |
| Chuyển 200.000đ | Ví nguồn -200.000 | Ví nhận +200.000 |

Backend ghi header và hai dòng trong cùng database transaction, khóa ví theo thứ tự ổn định và rollback nếu có lỗi. Tổng dòng của mỗi giao dịch bằng 0. Chuyển tiền bị loại khỏi tổng thu/chi và biểu đồ danh mục. Không sửa/xóa giao dịch qua API hiện tại. Số dư âm được cho phép vì đây là sổ ghi chép, không phải hệ thống chi trả.

Hủy hoặc điều chỉnh giao dịch (UC07, migration 006) không sửa/xóa giao dịch gốc: giao dịch đảo có `reverses_id` trỏ tới giao dịch gốc, cùng `kind` và `amount`, các dòng sổ đổi dấu; điều chỉnh = đảo giao dịch gốc rồi ghi giao dịch mới có `replaces_id`. Khóa duy nhất bảo đảm mỗi giao dịch chỉ bị đảo/thay thế một lần; `reason` bắt buộc với giao dịch đảo/thay thế, `created_by` lưu người thực hiện. Báo cáo cần trừ giao dịch đảo khỏi tổng thu/chi.

Mục tiêu tiết kiệm (UC15, migration 007) dùng tiền thật: góp tiền là chuyển từ ví sang tài khoản `goal` của mục tiêu, rút là chuyển ngược lại. Đây là chuyển tiền nên không tính vào thu/chi; số đã tích lũy là số dư tài khoản mục tiêu và số dư ví giảm tương ứng, không bị đếm hai lần. `/api/transactions` chỉ nhận ví nên không chuyển nhầm vào tài khoản mục tiêu.

Ràng buộc tổng nhiều dòng được bảo đảm ở hàm ghi sổ và kiểm thử tích hợp; không ghi SQL thủ công vào sổ cái để bỏ qua nghiệp vụ này. Số tiền đầu vào và lưu trữ là decimal chính xác; biểu đồ hiển thị dùng JavaScript Number, không dùng để ghi sổ. Chưa có nghiệp vụ số dư đầu kỳ độc lập; ví mới bắt đầu từ 0.

## API đã triển khai

API ghi chỉ nhận JSON, yêu cầu header `Origin` khớp `APP_ORIGIN`. Cookie phiên là HttpOnly, SameSite=Lax; đặt Secure khi dùng HTTPS. Tất cả API tài chính cần đăng nhập.

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| POST | `/api/auth/register` | `{name, account, password}`; băm mật khẩu, tạo ví và danh mục mặc định, không tự đăng nhập |
| POST | `/api/auth/login` | `{account, password}`; tạo session cookie |
| POST | `/api/auth/logout` | `{}`; xóa session phía server và cookie |
| GET | `/api/auth/me` | Người dùng hiện tại hoặc `null` |
| GET/POST | `/api/wallets` | Danh sách và số dư / thêm ví `{name}` số dư 0 |
| GET/POST | `/api/categories` | Danh sách / thêm `{name, kind: income\|expense}` |
| POST | `/api/transactions` | Ghi sổ kép |
| GET | `/api/finance?start=YYYY-MM-DD&end=YYYY-MM-DD&q=...` | Tổng thu/chi, lịch sử, thống kê danh mục và ngân sách đã có dữ liệu |
| GET/POST | `/api/goals` | Danh sách kèm `savedAmount`, `status` / tạo `{name, targetAmount, dueOn?}` cùng tài khoản sổ cái |
| GET | `/api/currency?action=rate&from=USD&to=VND` | Tỷ giá từ open.er-api.com (không cần đăng nhập) |
| GET | `/api/currency?action=history` | 5 lần quy đổi gần nhất của người đang đăng nhập |
| POST | `/api/currency` | `{from, to, amount, rate}`; server tự tính `result`, lưu theo người dùng |
| POST | `/api/auth/recover` | `{account, recoveryCode, password}`; đặt lại mật khẩu, trả mã khôi phục mới, thu hồi mọi phiên |
| POST | `/api/auth/recovery-code` | `{password}`; tạo mã khôi phục mới (mã cũ hết hiệu lực) |
| GET | `/api/auth/2fa` | `{enabled, backupCodesLeft}` |
| POST | `/api/auth/2fa/setup` | `{password}`; trả `{secret, otpauthUrl}` để quét bằng ứng dụng xác thực |
| POST | `/api/auth/2fa/enable` | `{code}`; bật 2FA, trả 8 mã dự phòng (chỉ một lần) |
| POST | `/api/auth/2fa/disable` | `{password, code}`; `code` là mã 6 số hoặc mã dự phòng |
| POST | `/api/auth/2fa/verify` | `{code}`; bước hai đăng nhập, dùng cookie `cnpm_2fa` |
| GET | `/api/admin/stats` | Chỉ admin: số người dùng, giao dịch, tỷ giá đã lưu, 10 lần sao lưu gần nhất |
| GET/POST | `/api/admin/users` | Chỉ admin: danh sách `?q=` / khóa, mở khóa `{userId, blocked}`; không tự khóa mình, không khóa admin khác |

Khi tài khoản đã bật 2FA, `POST /api/auth/login` đúng mật khẩu trả `{twoFactorRequired: true}` và cookie `cnpm_2fa` thay vì session; client gửi mã tới `/api/auth/2fa/verify` để nhận session. Mã TOTP chấp nhận lệch ±30 giây, không dùng lại được mã đã dùng; sai 5 lần thì phiên chờ bị hủy, sai 15 lần/15 phút thì tạm khóa nhập mã.

Ví dụ body ghi giao dịch:

```json
{
  "kind": "expense",
  "walletId": "UUID-của-ví",
  "categoryId": "UUID-danh-mục-chi",
  "amount": "50000.00",
  "bookedOn": "2026-10-14",
  "note": "Ăn trưa",
  "requestKey": "UUID-v4-duy-nhất"
}
```

Chuyển tiền dùng `kind=transfer`, `targetId` là ví nhận, không cần `categoryId`. Khóa `requestKey` trùng trả HTTP 409 và không ghi lần hai. Form giữ khóa khi chưa rõ kết quả do lỗi mạng; gặp 409 thì kiểm tra lịch sử trước khi ghi lại. Lịch sử trả tối đa 200 giao dịch gần nhất trong kỳ; tổng và thống kê vẫn tính toàn kỳ. Khoảng truy vấn tối đa 366 ngày. Ngày nghiệp vụ là `DATE`, ngày mặc định theo múi giờ Việt Nam; session hết hạn theo UTC.

Đăng nhập, khôi phục mật khẩu và nhập mã 2FA có giới hạn 15 lần sai/15 phút trong một tiến trình. Khi triển khai nhiều instance cần kho giới hạn dùng chung; chưa có xác minh email/điện thoại hoặc Google OAuth. Khôi phục mật khẩu dùng mã khôi phục 16 ký tự cấp khi đăng ký (hoặc tạo lại ở trang Tôi): mã dùng một lần, bị thay ngay sau khi dùng, và thông báo lỗi không cho biết tài khoản có tồn tại hay không. Secret TOTP lưu dạng văn bản trong database; bảo vệ database và file sao lưu như dữ liệu nhạy cảm. `/admin` yêu cầu vai trò admin; giao diện vẫn là bản mẫu, API thật ở `/api/admin/*`.

## Sao lưu và khôi phục

Hai lệnh dùng `mysqldump`/`mysql` của XAMPP với tài khoản `DB_SETUP_*`; mật khẩu truyền qua biến môi trường, không nằm trên dòng lệnh. Nếu không tìm thấy công cụ, đặt `MYSQLDUMP_PATH` và `MYSQL_CLIENT_PATH` trong `.env.local`.

```powershell
npm.cmd run db:backup
npm.cmd run db:restore -- --file backups/cnpm_524-YYYYMMDD-HHMMSS.sql --target cnpm_524_restore_test
```

- `db:backup` tạo `backups/<DB_NAME>-YYYYMMDD-HHMMSS.sql` và file `.sha256`, kiểm tra mã thoát và dòng `-- Dump completed`; lỗi thì xóa file dở và ghi `status='failed'` vào `backup_runs`. Giữ `BACKUP_KEEP` bản mới nhất (mặc định 14), thư mục đổi bằng `BACKUP_DIR`. Thư mục `backups/` bị Git bỏ qua.
- `db:restore` kiểm tra file, checksum và dump đầy đủ trước khi chạy. Database đích đã có dữ liệu cần `--replace`. Ghi đè database chính cần `--overwrite-main`, gõ lại tên database trong terminal, và luôn sao lưu database chính trước. Mỗi lần chạy ghi một dòng vào `backups/restore.log` kèm số bảng, user, giao dịch và số giao dịch lệch sổ kép để đối chiếu.
- Đặt lịch sao lưu hằng ngày lúc 2 giờ: macOS/Linux thêm vào `crontab -e` dòng `0 2 * * * cd /đường/dẫn/CNPM_524 && npm run db:backup -- --scheduled`; Windows tạo Task Scheduler chạy `npm.cmd run db:backup -- --scheduled` trong thư mục dự án. Lần chạy theo lịch ghi `trigger_type='schedule'`.
- Schema không có stored procedure nên không dump `--routines` (XAMPP cũ có thể lỗi `mysql.proc`); trigger vẫn được sao lưu.

## Kiểm thử

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd run test:integration
npm.cmd run test:browser
```

Integration runner cần MySQL đang chạy và credentials `DB_SETUP_*`. Nó tạo database/user có tên ngẫu nhiên `cnpm_test_*`/`cnpm_t_*`, chạy server riêng trên cổng trống, kiểm tra auth/CSRF/quyền sở hữu, tiền thập phân, chống trùng, chuyển tiền, ghi đồng thời, rollback khi dòng thứ hai lỗi, báo cáo, setup chạy lại và các trang. Sau cùng chỉ dọn đúng tài nguyên thử nghiệm đã tạo. Không dùng database `cnpm_524` để ghi dữ liệu test.

`test:browser` chạy thêm quy trình đăng ký, đăng nhập, ghi thu/chi/chuyển tiền, xem số dư/báo cáo và đăng xuất bằng Playwright. Trên Windows dùng Microsoft Edge đã cài sẵn; trên Linux cần chạy `npx playwright install chromium` một lần. Kiểm tra cả form rỗng và chiều rộng màn hình điện thoại 390px.

Có thể kiểm tra thủ công sau đăng nhập: thu 1.000.000đ vào Tiền mặt, chi 50.000đ, chuyển 200.000đ sang Ngân hàng. Số dư phải là 750.000đ và 200.000đ; tổng thu 1.000.000đ và tổng chi 50.000đ. Đăng xuất rồi đăng nhập lại để xác nhận dữ liệu vẫn còn.
