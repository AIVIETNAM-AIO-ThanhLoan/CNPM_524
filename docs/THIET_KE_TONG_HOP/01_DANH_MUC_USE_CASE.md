# Danh mục Use Case và liên kết thiết kế

Nguồn yêu cầu: UC.docx của nhóm. Trạng thái mã: main / HEAD 7e47d99, đã fetch và đối chiếu với GitHub ngày 21/10/2026. Chưa chạy ứng dụng để xác nhận nghiệp vụ. Giữ 19 mã UC01, UC03–UC20; không tự tạo UC02.

| UC | Tác nhân | Mục tiêu | UR/SR theo bảng gốc | Dữ liệu cần đọc/ghi | API có trong mã | Trạng thái và phần còn thiếu |
|---|---|---|---|---|---|---|
| [UC01](sources/design/Usecase&UML/UC01.png) | Người dùng | Đăng ký/Đăng nhập | UR-F10, SR-F01, SR-F02 | users, sessions | POST /api/auth/register; POST /api/auth/login; POST /api/auth/logout; GET /api/auth/me | Một phần: Đã có xác thực/phiên; chưa có 2FA. |
| [UC03](sources/design/Usecase&UML/UC03.png) | Người dùng | Quản lý tài khoản tiền | UR-F02, SR-F03 | accounts (kind=wallet) | GET/POST /api/wallets | Một phần: Có tạo và xem ví/số dư; chưa có sửa, ngừng sử dụng. |
| [UC04](sources/design/Usecase&UML/UC04.png) | Người dùng | Quản lý danh mục thu/chi | UR-F02, SR-F03 | categories, accounts | GET/POST /api/categories | Một phần: Có tạo và xem; chưa có sửa, ngừng sử dụng. |
| [UC05](sources/design/Usecase&UML/UC05.png) | Người dùng | Ghi nhận giao dịch thu/chi | UR-F01, SR-F04 | transactions, transaction_entries, accounts, categories | POST /api/transactions | Đã có mã luồng chính: Thu/chi/chuyển tiền VND, hai dòng đối ứng, chống gửi trùng. Chưa có đa tiền tệ. |
| [UC06](sources/design/Usecase&UML/UC06.png) | Người dùng | Tra cứu lịch sử giao dịch | UR-F01, UR-F09, SR-F07 | transactions, transaction_entries, categories, accounts | GET /api/finance | Một phần: Có kỳ và tìm kiếm; lịch sử tối đa 200 dòng, chưa có phân trang đầy đủ. |
| [UC07](sources/design/Usecase&UML/UC07.png) | Người dùng | Hủy hoặc điều chỉnh giao dịch | UR-F01, SR-F08 | transactions, transaction_entries; còn thiếu liên kết đảo/thay thế | Chưa có API | Cần bổ sung: Chưa có liên kết reversal/correction trong schema, chưa có chức năng đảo/thay thế. |
| [UC08](sources/design/Usecase&UML/UC08-09.png) | Người dùng | Quản lý ngân sách | UR-F04, SR-F13–14 | budgets, categories | GET/POST /api/budgets | Một phần: Có xem/đặt/cập nhật ngân sách theo danh mục chi và tháng; chưa có ngưỡng cấu hình. |
| [UC09](sources/design/Usecase&UML/UC08-09.png) | Người dùng | Nhận cảnh báo ngân sách | UR-F04, SR-F14–15 | budgets; chưa có lưu thông báo/cảnh báo | Chưa có API cảnh báo | Cần bổ sung: Trang thông báo có dữ liệu mẫu; chưa có lịch sử cảnh báo thật. |
| [UC10](sources/design/Usecase&UML/UC10-11.png) | Người dùng | Quản lý khoản đăng ký định kỳ | UR-F05, SR-F16 | recurring_transactions | Chưa có API trong cây đã kiểm tra | Có bảng nền: Có cấu trúc quy tắc; chưa có scheduler/quy trình CRUD hoàn chỉnh. |
| [UC11](sources/design/Usecase&UML/UC11.png) | Người dùng | Nhận nhắc nhở thanh toán | UR-F05, SR-F17 | recurring_transactions; chưa có lịch sử gửi | Chưa có API/scheduler | Cần bổ sung: Chưa có nơi lưu kết quả gửi để chống nhắc trùng. |
| [UC12](sources/design/Usecase&UML/UC12.png) | Người dùng | Xem đề xuất khoản đăng ký định kỳ | UR-F05, SR-F18 | transactions + đề xuất định kỳ chưa có bảng | Chưa có API | Cần bổ sung: Chưa có thuật toán, tiêu chí phát hiện hoặc dữ liệu đề xuất. |
| [UC13](sources/design/Usecase&UML/UC.docx) | Người dùng | Xem giá trị quy đổi ngoại tệ | UR-F06, SR-F11–12 | exchange_rates | Chưa có API quy đổi | Có bảng nền: Ghi sổ hiện khóa VND; chưa lưu snapshot tỷ giá giao dịch. |
| [UC14](sources/design/Usecase&UML/UC.docx) | Người dùng | Xem dashboard | UR-F07, SR-F20 | accounts, transaction_entries, transactions, budgets | GET /api/finance; GET /api/wallets | Một phần: Có tổng hợp và số dư; chưa có mô hình nợ để khẳng định tài sản ròng đầy đủ. |
| [UC15](sources/design/Usecase&UML/UC15.png) | Người dùng | Quản lý mục tiêu tài chính | UR-F08, SR-F19, SR-F21 | goals | GET/POST /api/goals | Một phần: Có tạo/xem tên, số tiền đích và hạn; chưa có tích lũy, phân bổ, kết thúc. |
| [UC16](sources/design/Usecase&UML/UC15-UC20.png) | Người dùng | Xem báo cáo thu/chi | UR-F09, SR-F22 | transactions, categories, transaction_entries | GET /api/finance | Đã có mã luồng chính: Có tổng/breakdown theo kỳ; kiểm tra tối đa 366 ngày; chưa xác nhận chạy trong lượt này. |
| [UC17](sources/design/Usecase&UML/UC15-UC20.png) | Người dùng | So sánh tài chính giữa các kỳ | UR-F03 — chưa có SR tương ứng | Truy vấn tổng hợp transactions, không bắt buộc bảng mới | Chưa có luồng so sánh riêng | Cần bổ sung: UR-F03 còn thiếu SR tương ứng; đổi kỳ chưa đồng nghĩa so sánh kỳ. |
| [UC18](sources/design/Usecase&UML/UC15-UC20.png) | Người vận hành / Nhà cung cấp tỷ giá | Đồng bộ tỷ giá | SR-F10 | exchange_rates | Chưa có đồng bộ thật | Có bảng nền: Bảng tỷ giá dự phòng; thao tác quản trị vẫn mô phỏng. |
| [UC19](sources/design/Usecase&UML/UC15-UC20.png) | Bộ lập lịch / Người vận hành | Sao lưu dữ liệu | SR-F24 | Chưa có dữ liệu sao lưu; schema_migrations chỉ ghi phiên bản schema | Chưa có backup thật | Cần bổ sung: Chưa có tác vụ tạo file/lưu trạng thái sao lưu. |
| [UC20](sources/design/Usecase&UML/UC15-UC20.png) | Người vận hành được cấp quyền | Khôi phục dữ liệu | SR-F25 | Chưa có dữ liệu phục vụ quy trình khôi phục | Chưa có restore thật | Cần bổ sung: Cần quyền vận hành, xác nhận và kiểm tra phục hồi riêng. |

## Cách dùng khi thiết kế một màn hình

1. Chọn mã UC từ bảng này; xác định mục tiêu và actor.
2. Đọc luồng chính, điều kiện và lỗi trong tài liệu UML.
3. Đối chiếu bảng/cột trong ERD và từ điển dữ liệu; không suy ra quyền sở hữu từ tên trường đơn thuần.
4. Xác định API đã có và phần thiếu; chỉ mở rộng dữ liệu sau khi chốt nghiệp vụ.
5. Kiểm tra đủ nhánh bằng ví dụ và kết quả dữ liệu mong đợi.

## Lưu ý khi đọc ảnh gốc

- Actor ngân sách/định kỳ trong bảng UC là Người dùng; một số ảnh gốc còn ghi Tour Guide. Ảnh được giữ nguyên để nhóm đối chiếu.
- UC13 là quy đổi ngoại tệ; ảnh UC13 gốc trùng UC12. UC14 là dashboard; ảnh UC14 gốc đang ghi nhắc định kỳ.
- Tên nhóm ghi chi–cảnh báo chuẩn hóa là UC05 + UC08/UC09; tên file gốc UC6-9 vẫn được giữ trong sources để đối chiếu.
- Dùng ngừng sử dụng cho ví/danh mục theo bảng UC; không tự suy ra xóa vật lý.
- Không vẽ tạo/xem/sửa/xóa bằng include như thể một lần quản lý phải luôn chạy đủ bốn thao tác.
- UC09 chỉ mở rộng sau ghi chi thành công khi đạt/vượt ngưỡng. UC08 là cấu hình dùng trước, không bắt buộc gọi lại mỗi lần ghi chi.
- UC13 đọc tỷ giá đã có; UC18 đồng bộ là tác vụ riêng.
- Vai trò Người vận hành cho UC18–UC20 được chuẩn hóa đề xuất; chính sách quyền chi tiết cần nhóm chốt.
