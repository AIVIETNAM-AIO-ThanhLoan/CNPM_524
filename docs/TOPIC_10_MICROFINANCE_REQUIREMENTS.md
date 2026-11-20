# **Topic 10 Microfinance Personal Wealth and Expense Tracker**

> Source: [Google Docs](https://docs.google.com/document/d/1RyeaL6kIv7LI-t-_DjtJ1jj3uceK3CLHrPGZK5juN-g/edit?tab=t.0)
> Imported on: 2026-11-12 (Asia/Ho_Chi_Minh).
> This snapshot contains project requirements and proposed design. It does not certify the current implementation.

GITHUB: [AIVIETNAM-AIO-ThanhLoan/CNPM\_524](https://github.com/AIVIETNAM-AIO-ThanhLoan/CNPM_524) 

Domain: Financial Technology (FinTech).

Core Features: Income/expense logging, multi-currency conversion, budget threshold alerts, recurring subscription tracking, financial goal visualization.

Phân công tổng quan

M1: Financial dashboard analytics, budget tracker, transaction entry forms. (Anh)

M2: Transaction ledger API, currency conversion worker, budget alert service. (Tín)

M3: Double-entry ledger database design, user profile security, data backup pipelines. (Loan)

M4: Double-entry balance unit testing, automated API integration test coverage. (Linh)

# **I Giai đoạn 1 Phân tích bài toán**

## **1 Xác định bài toán thực tế**

Phần lớn người dùng cá nhân, đặc biệt là nhóm thu nhập thấp và trung bình (đối tượng chính của tài chính vi mô \- microfinance), gặp khó khăn trong việc:

* Theo dõi dòng tiền thu/chi hàng ngày do không có công cụ phù hợp hoặc công cụ hiện có quá phức tạp/tốn phí.

* Quản lý các khoản chi tiêu bằng nhiều loại tiền tệ khác nhau (ví dụ: người lao động xuất khẩu, freelancer nhận thu nhập ngoại tệ, du học sinh) mà không có cơ chế quy đổi tự động, minh bạch.

* Kiểm soát các khoản đăng ký định kỳ (subscription) đang âm thầm rút tiền hàng tháng (Netflix, Spotify, gói data, bảo hiểm...) dẫn đến chi tiêu vượt kiểm soát.

* Không nhận được cảnh báo kịp thời khi chi tiêu vượt ngưỡng ngân sách đã đặt ra theo từng danh mục (ăn uống, di chuyển, giải trí...).

* Thiếu công cụ trực quan hóa mục tiêu tài chính (tiết kiệm mua nhà, quỹ khẩn cấp, trả nợ...) khiến người dùng mất động lực theo đuổi kế hoạch dài hạn.

**Hệ quả:**

* Chi tiêu mất kiểm soát, không có khoản dự phòng, dễ rơi vào nợ xấu hoặc vay nóng.

* Thiếu dữ liệu tài chính cá nhân đáng tin cậy để lập kế hoạch hoặc chứng minh năng lực trả nợ khi cần vay vốn vi mô.

Đặc biệt với các tổ chức tài chính vi mô (MFI), việc thiếu công cụ giúp khách hàng ghi chép tài chính cá nhân minh bạch cũng gây khó khăn cho MFI trong việc đánh giá rủi ro tín dụng.

Giải pháp đề xuất: Xây dựng ứng dụng Personal Wealth & Expense Tracker theo mô hình sổ cái kép (double-entry ledger), hỗ trợ ghi chép chính xác và đối soát dữ liệu tài chính cá nhân.

* Ghi nhận thu/chi qua biểu mẫu, phân loại theo danh mục và hỗ trợ theo dõi các khoản định kỳ.

* Quy đổi đa tiền tệ theo tỷ giá đã đồng bộ, kèm thời điểm cập nhật.

* Cảnh báo ngưỡng ngân sách sau khi giao dịch được ghi nhận thành công.

* Theo dõi các khoản đăng ký định kỳ và nhắc nhở trước khi bị trừ tiền.

* Trực quan hóa tiến độ đạt mục tiêu tài chính qua dashboard.

## **2 Đối tượng sử dụng và nhu cầu**

| Đối tượng | Nhu cầu chính |
| :---- | :---- |
| Người dùng cá nhân | Ghi chép thu/chi, quản lý ví, ngân sách, đăng ký định kỳ và mục tiêu tài chính. |
| Người dùng có giao dịch ngoại tệ | Quy đổi về đồng tiền cơ sở và kiểm tra tỷ giá đã áp dụng. |
| Người nhận báo cáo được cho phép | Xem dữ liệu do chủ tài khoản chủ động cung cấp; không mặc nhiên có quyền truy cập tài khoản. |

Báo cáo có thể hỗ trợ người dùng cung cấp thông tin tài chính cho tổ chức tài chính vi mô (MFI). Quyền truy cập trực tiếp của MFI cần được đặc tả riêng nếu đưa vào phạm vi triển khai.

## **3 Quy ước đặc tả yêu cầu theo EARS**

Yêu cầu người dùng (User Requirements) mô tả khả năng và chất lượng người dùng cần. Yêu cầu hệ thống (System Requirements) cụ thể hóa hành vi, ràng buộc và kết quả kiểm chứng. Mỗi cấp được tách thành Functional Requirements và Non-functional Requirements.

Các phát biểu dùng EARS (Easy Approach to Requirements Syntax) với từ khóa tiếng Việt tương ứng: Khi (When) cho sự kiện; Trong khi (While) cho trạng thái; Nếu… thì… (If… then…) cho tình huống không mong muốn; “hệ thống phải” (shall) biểu thị nghĩa vụ. Yêu cầu áp dụng thường trực bắt đầu bằng “Hệ thống phải”. \[1\]

Mã UR-F và UR-N lần lượt chỉ yêu cầu chức năng và phi chức năng của người dùng; SR-F và SR-N chỉ hai nhóm tương ứng ở cấp hệ thống. Cột UR trong bảng hệ thống dùng để truy vết về nhu cầu nguồn. Bảng là cách tổ chức thông tin; EARS là quy tắc viết câu yêu cầu.

Chức năng xác thực, từ chối truy cập, sao lưu và khôi phục thuộc nhóm Functional vì mô tả hành vi. Tính bảo mật, độ chính xác, hiệu năng và độ sẵn sàng thuộc nhóm Non-functional vì quy định chất lượng hoặc ràng buộc của hệ thống.

## **4 User Requirements**

### **4.1 Functional Requirements**

| Mã | Phát biểu yêu cầu theo EARS | Tiêu chí chấp nhận |
| ----- | :---- | :---- |
| UR-F01 | Khi cần ghi chép dòng tiền, hệ thống phải cho phép người dùng lưu giao dịch thu/chi kèm số tiền, ngày, tài khoản, danh mục và tiền tệ. | Tạo một khoản thu và một khoản chi; tra cứu lại đúng thông tin đã nhập. |
| UR-F02 | Khi cần tổ chức sổ theo dõi, hệ thống phải cho phép người dùng quản lý tài khoản tiền và danh mục thu/chi của mình. | Tạo, xem, sửa và ngừng sử dụng tài khoản hoặc danh mục. |
| UR-F03 | So sánh với các kì/tháng trước |  |
| UR-F04 | Khi theo dõi chi tiêu theo danh mục, hệ thống phải cho phép người dùng đặt ngân sách và nhận cảnh báo khi đạt các ngưỡng đã đặt. | Đặt ngân sách; kiểm tra tiến độ và cảnh báo tại 80% và 100%. |
| UR-F05 | Khi quản lý khoản đăng ký định kỳ, hệ thống phải cho phép người dùng theo dõi lịch đến hạn và nhận nhắc nhở trước ngày thanh toán. | Lưu một đăng ký định kỳ; nhận nhắc nhở theo lịch đã cấu hình. |
| UR-F06 | Khi theo dõi giao dịch ngoại tệ, hệ thống phải cho phép người dùng xem giá trị quy đổi về đồng tiền cơ sở cùng tỷ giá và thời điểm cập nhật. | Đối chiếu số tiền quy đổi với tỷ giá hiển thị. |
| UR-F07 | Khi mở dashboard, hệ thống phải cho phép người dùng xem tài sản ròng, tổng thu/chi và biểu đồ theo khoảng thời gian đã chọn. | Chọn ngày, tuần, tháng hoặc năm; đối chiếu số liệu với lịch sử giao dịch. |
| UR-F08 | Khi theo đuổi mục tiêu tài chính, hệ thống phải cho phép người dùng đặt mục tiêu và xem tiến độ thực hiện. | Tạo mục tiêu; cập nhật khoản tích lũy và kiểm tra tiến độ. |
| UR-F09 | Khi cần đối chiếu tình hình tài chính, hệ thống phải cho phép người dùng truy xuất báo cáo thu/chi theo kỳ. | Xem báo cáo có kỳ báo cáo, tiền tệ, tổng thu, tổng chi và chênh lệch. |
| UR-F10 | Khi sử dụng dữ liệu cá nhân, hệ thống phải cho phép người dùng đăng ký và đăng nhập vào tài khoản riêng. | Đăng ký hợp lệ; đăng nhập đúng tài khoản, bao gồm 2FA khi được bật. |

### **4.2 Non functional Requirements**

| Mã | Phát biểu yêu cầu theo EARS | Tiêu chí chấp nhận |
| ----- | :---- | :---- |
| UR-N01 | Trong khi người dùng sử dụng màn hình rộng từ 360 đến 1920 CSS px, hệ thống phải giữ giao diện đọc được và đầy đủ chức năng. | Không tràn nội dung gây mất thao tác; kiểm tra ở hai biên và các độ rộng trung gian. |
| UR-N02 | Hệ thống phải giữ bí mật dữ liệu cá nhân và dữ liệu tài chính đối với người không được cấp quyền. | Người dùng khác không đọc/sửa được dữ liệu riêng; kiểm chứng qua SR-F23 và SR-N06 đến SR-N08. |
| UR-N03 | Khi người dùng thực hiện tương tác thông thường, hệ thống phải hiển thị phản hồi trong thời gian dưới 2 giây theo hồ sơ kiểm thử đã thống nhất. | Đo từ thao tác đến phản hồi hiển thị; xem điều kiện đo tại mục II.4. |
| UR-N05 | Hệ thống phải duy trì khả năng truy cập dịch vụ và khôi phục dữ liệu sau sự cố theo các chỉ tiêu vận hành đã thống nhất. | Đối chiếu SR-N09, SR-N10 và thử khôi phục theo SR-F25. |

## **5 System Requirements**

### **5.1 Functional Requirements**

| Mã | Phát biểu yêu cầu theo EARS | Cách kiểm chứng | UR |
| ----- | :---- | :---- | :---: |
| SR-F01 | Khi nhận thông tin đăng ký hợp lệ với email chưa tồn tại, hệ thống phải tạo tài khoản người dùng mới. | Tài khoản được tạo một lần; email trùng bị từ chối. | UR-F10 |
| SR-F02 | Khi thông tin đăng nhập và bước 2FA được yêu cầu đều hợp lệ, hệ thống phải tạo phiên truy cập cho đúng người dùng. | Thông tin sai hoặc thiếu 2FA bắt buộc không tạo phiên. | UR-F10 |
| SR-F03 | Khi người dùng yêu cầu quản lý tài khoản tiền hoặc danh mục của mình, hệ thống phải lưu thay đổi hợp lệ và giữ liên kết với lịch sử giao dịch. | Kiểm thử tạo, sửa, truy vấn và ngừng sử dụng; lịch sử vẫn truy xuất được. | UR-F02 |
| SR-F04 | Khi người dùng gửi giao dịch hợp lệ, hệ thống phải lưu dữ liệu giao dịch cùng ghi chú, nhãn và hóa đơn/ảnh đính kèm được cung cấp. | Thu/chi có đủ trường bắt buộc; thông tin bổ sung được truy xuất cùng giao dịch. | UR-F01 |
| SR-F07 | Khi người dùng truy vấn lịch sử, hệ thống phải trả về giao dịch và bút toán thuộc quyền truy cập theo bộ lọc thời gian và phân trang. | Không lẫn dữ liệu người khác; số bản ghi và thứ tự theo hợp đồng API. | UR-F01UR-F09 |
| SR-F08 | Khi người dùng xác nhận hủy hoặc điều chỉnh giao dịch đã ghi sổ, hệ thống phải ghi bút toán đảo và liên kết điều chỉnh với giao dịch gốc. | Không xóa/sửa âm thầm bút toán đã ghi; số dư sau điều chỉnh đúng. | UR-F01UR-N04 |
| SR-F10 | Khi đến lịch đồng bộ tỷ giá đã cấu hình, hệ thống phải lấy và lưu tỷ giá từ nhà cung cấp cùng cặp tiền, nguồn và thời điểm cập nhật. | Dùng dữ liệu nhà cung cấp giả lập để đối chiếu tỷ giá và dấu thời gian. | UR-F06 |
| SR-F11 | Khi quy đổi một số tiền có tỷ giá hợp lệ, hệ thống phải trả giá trị quy đổi cùng tỷ giá đã áp dụng và thời điểm của tỷ giá. | Kết quả bằng số tiền nhân tỷ giá rồi làm tròn theo quy tắc thống nhất. | UR-F06 |
| SR-F12 | Nếu không có tỷ giá đáp ứng chính sách hiệu lực, thì hệ thống phải từ chối quy đổi hoặc ghi sổ nghiệp vụ cần tỷ giá đó và nêu lý do. | Không dùng tỷ giá rỗng hoặc mặc định 1; chính sách hiệu lực phải được chốt. | UR-F06UR-N04 |
| SR-F13 | Khi người dùng gửi ngân sách hợp lệ, hệ thống phải lưu hạn mức, danh mục, tiền tệ, kỳ áp dụng và ngưỡng cảnh báo. | Hạn mức dương; ngày bắt đầu không sau ngày kết thúc; đọc lại đúng cấu hình. | UR-F04 |
| SR-F14 | Khi giao dịch chi tiêu hoặc điều chỉnh đã commit làm mức sử dụng ngân sách đạt hay vượt một ngưỡng cấu hình, hệ thống phải xác định ngân sách đã chạm ngưỡng đó. | Kiểm tra dưới, bằng và trên 80%/100%; so sánh bằng cùng tiền tệ ngân sách. | UR-F04 |
| SR-F15 | Khi phát sinh cảnh báo ngân sách, hệ thống phải gửi thông báo qua kênh đã được cấu hình cho người dùng. | Thông báo nêu danh mục, kỳ, chi tiêu và hạn mức; kiểm thử kênh được chọn. | UR-F04 |
| SR-F16 | Khi người dùng thay đổi đăng ký định kỳ, hệ thống phải lưu tên khoản chi, số tiền, tiền tệ, chu kỳ và ngày đến hạn tiếp theo. | Tạo, xem, sửa và dừng theo dõi khoản đăng ký. | UR-F05 |
| SR-F17 | Khi đến thời điểm nhắc đã cấu hình trước ngày đến hạn, hệ thống phải gửi nhắc nhở cho khoản đăng ký còn hoạt động. | Kiểm thử bằng đồng hồ giả lập; khoản đã dừng không phát nhắc mới. | UR-F05 |
| SR-F18 | Khi lịch sử chi tiêu khớp quy tắc nhận diện định kỳ đã thống nhất, hệ thống phải đề xuất khoản đăng ký để người dùng kiểm tra. | Kiểm thử các mẫu khớp/không khớp; quy tắc nhận diện xem ghi chú. | UR-F05 |
| SR-F19 | Khi người dùng gửi mục tiêu tài chính hợp lệ, hệ thống phải lưu tên mục tiêu, số tiền đích, tiền tệ và khoản tích lũy liên quan. | Tạo, xem, sửa và kết thúc mục tiêu; mục tiêu có số tiền đích dương. | UR-F08 |
| SR-F20 | Khi người dùng chọn kỳ xem dashboard, hệ thống phải tổng hợp tài sản ròng, thu nhập, chi tiêu và dữ liệu biểu đồ từ sổ cái. | Tài sản ròng \= tài sản − nợ phải trả; thu/chi và biểu đồ khớp dữ liệu kiểm thử. | UR-F07 |
| SR-F21 | Khi khoản tích lũy của mục tiêu thay đổi, hệ thống phải tính lại tiến độ bằng khoản tích lũy chia số tiền đích nhân 100%. | Dùng bộ số liệu biết trước để đối chiếu tỷ lệ và giá trị hiển thị. | UR-F08 |
| SR-F22 | Khi người dùng yêu cầu báo cáo theo kỳ, hệ thống phải trả báo cáo thu/chi có kỳ báo cáo, tiền tệ cơ sở và các tổng đối chiếu được với sổ cái. | Tổng thu, tổng chi, chênh lệch khớp giao dịch trong kỳ. | UR-F09 |
| SR-F23 | Nếu yêu cầu truy cập dữ liệu không có quyền hợp lệ, thì hệ thống phải từ chối yêu cầu mà không tiết lộ dữ liệu được bảo vệ. | Kiểm thử chưa đăng nhập, phiên không hợp lệ và truy cập chéo người dùng. | UR-N02 |
| SR-F24 | Khi đến lịch sao lưu đã cấu hình, hệ thống phải tạo bản sao cơ sở dữ liệu nhất quán tại nơi lưu trữ được chỉ định. | Có bản sao, trạng thái thực hiện và kết quả kiểm tra khả năng đọc. | UR-N05 |
| SR-F25 | Khi người vận hành được cấp quyền yêu cầu phục hồi từ bản sao hợp lệ, hệ thống phải khôi phục dữ liệu tới trạng thái của bản sao đó. | Thử phục hồi vào môi trường tách biệt; đối chiếu số dư và cân bằng sổ cái. | UR-N05 |
| SR-F26 | Nếu nhận lại yêu cầu tạo giao dịch có cùng người dùng, khóa idempotency và nội dung đã xử lý, thì hệ thống phải trả lại kết quả cũ mà không ghi thêm giao dịch. | Gửi lặp và gửi đồng thời: chỉ một giao dịch; cùng khóa nhưng khác nội dung bị từ chối. | UR-F01UR-N04 |

### **5.2 Non functional Requirements**

| Mã | Phát biểu yêu cầu theo EARS | Cách kiểm chứng | UR |
| ----- | :---- | :---- | :---: |
| SR-N01 | Hệ thống phải lưu và tính toán số tiền bằng DECIMAL/NUMERIC hoặc đơn vị tiền nhỏ nhất với số học chính xác. | Kiểm tra schema và mã xử lý; không dùng FLOAT/DOUBLE cho số tiền. | UR-N04 |
| SR-N02 | Hệ thống phải áp dụng nhất quán quy tắc làm tròn theo tiền tệ và lưu tỷ giá đã dùng cho giao dịch ngoại tệ. | Tỷ giá mới không đổi báo cáo lịch sử; kiểm tra số lẻ và bút toán cân bằng. | UR-N04UR-F06 |
| SR-N04 | Khi người dùng mở dashboard trong hồ sơ tải đã thống nhất, hệ thống phải tải và hiển thị biểu đồ trong thời gian dưới 1,5 giây. | Đo từ thao tác mở trang đến khi biểu đồ sẵn sàng; bao gồm thời gian mạng. | UR-N03 |
| SR-N05 | Trong khi màn hình rộng từ 360 đến 1920 CSS px, hệ thống phải hiển thị các màn hình chính mà không chồng lấn, cắt chữ hoặc mất thao tác. | Kiểm tra nhập giao dịch, dashboard, ngân sách và mục tiêu tại các độ rộng đã chọn. | UR-N01 |
| SR-N06 | Hệ thống phải truyền dữ liệu ứng dụng qua HTTPS sử dụng TLS 1.3. | Kiểm tra cấu hình và kết nối; endpoint có dữ liệu không phục vụ qua HTTP rõ. | UR-N02 |
| SR-N07 | Hệ thống phải lưu mật khẩu bằng hàm băm có salt như bcrypt hoặc Argon2 và mã hóa dữ liệu cá nhân nhạy cảm được lưu bằng AES-256. | Không có mật khẩu rõ/khôi phục được; kiểm tra dữ liệu mã hóa và quản lý khóa. | UR-N02 |
| SR-N08 | Hệ thống phải ngăn SQL Injection, XSS và CSRF tại các điểm nhập liệu, hiển thị và thao tác có liên quan. | Bộ kiểm thử bảo mật chứng minh truy vấn an toàn, đầu ra an toàn và chống yêu cầu giả mạo. | UR-N02 |
| SR-N09 | Hệ thống phải đạt tỷ lệ sẵn sàng ít nhất 99,9% trong kỳ đo vận hành được thống nhất. | Dựa trên nhật ký giám sát: (thời gian kỳ đo − gián đoạn) / thời gian kỳ đo × 100%. | UR-N05 |
| SR-N10 | Trong khi tác vụ sao lưu đang chạy, hệ thống phải duy trì khả năng đọc và ghi giao dịch mà không gián đoạn do tác vụ sao lưu. | Chạy luồng đọc/ghi khi sao lưu; không có lỗi truy cập do sao lưu gây ra. | UR-N05 |

## **6 Phân công triển khai và kiểm thử**

Phân công dưới đây là công việc của nhóm để đáp ứng yêu cầu sản phẩm; không thay thế bảng User Requirements và System Requirements.

| Thành viên | Trách nhiệm | Nhóm yêu cầu liên quan |
| :---- | :---- | :---- |
| M1 – Anh | Dashboard, biểu đồ, ngân sách, biểu mẫu giao dịch; giao diện mục tiêu và đăng ký định kỳ phối hợp M2. | UR-F01 đến UR-F11; SR-N04, SR-N05. |
| M2 – Tín | Transaction Ledger API, đồng bộ/quy đổi tỷ giá, cảnh báo ngân sách; API mục tiêu và khoản định kỳ phối hợp M1/M3. | SR-F03 đến SR-F22, SR-F26, SR-F27; SR-N03. |
| M3 – Loan | Mô hình sổ cái kép, toàn vẹn dữ liệu, hồ sơ người dùng, xác thực/phân quyền, bảo mật và sao lưu/khôi phục. | SR-F01, SR-F02, SR-F05, SR-F23 đến SR-F25; SR-N01, SR-N02, SR-N06 đến SR-N10. |
| M4 – Linh | Unit test sổ kép và trường hợp biên; integration/E2E API; kiểm thử liên dịch vụ; regression trong CI/CD và báo cáo kiểm thử. | Kiểm chứng tiêu chí của các UR/SR; phối hợp M1/M2/M3 về dữ liệu và môi trường test. |

## **7 Công nghệ đề xuất**

Frontend (M1): React.js hoặc Next.js, Tailwind CSS, Chart.js hoặc Recharts.

Backend (M2): Node.js (Express/NestJS) hoặc Python (FastAPI/Django); Redis cho cache và hàng đợi. Thiết kế endpoint bên dưới dùng REST.

Database và hạ tầng (M3): PostgreSQL hoặc MySQL, Docker, S3 hoặc Google Cloud Storage; phương án phiên truy cập dùng JWT, tích hợp OAuth 2.0 nếu cần.

Testing và CI/CD (M4): Jest/Supertest hoặc pytest, Postman/Newman; GitHub Actions hoặc GitLab CI. Lựa chọn theo backend thực tế.

# **II Giai đoạn 2 Thiết kế hệ thống**

## **1 Thiết kế thành phần hệ thống**

### **1.1 Transaction Ledger Service**

Nhận yêu cầu tạo giao dịch từ giao diện M1 qua POST /api/v1/transactions.

Kiểm tra dữ liệu: tài khoản (account\_id), danh mục (category\_id), số tiền và quyền sở hữu; xác định người dùng từ phiên đã xác thực.

Mở giao dịch cơ sở dữ liệu và tạo các bút toán đối ứng trong ledger\_entries. Chỉ commit khi tổng Nợ bằng tổng Có theo đồng tiền cơ sở; rollback toàn bộ nếu có lỗi. Một nghiệp vụ có thể cần nhiều hơn hai bút toán.

### **1.2 Currency Conversion Worker**

Chạy nền theo lịch cấu hình để gọi API tỷ giá (ví dụ ExchangeRate-API). Chu kỳ mỗi 6 giờ là phương án đề xuất; cần chốt theo nguồn dữ liệu và nhu cầu cập nhật.

Lưu lịch sử cặp tiền, tỷ giá, nguồn và thời điểm cập nhật; cần bổ sung thiết kế bảng exchange\_rates.

Quy đổi từ tiền tệ giao dịch sang đồng tiền báo cáo cơ sở (VND trong ví dụ). Lưu số tiền gốc, số tiền quy đổi và tỷ giá áp dụng; không tự thay tỷ giá của giao dịch đã ghi sổ.

### **1.3 Budget Alert Service**

Lắng nghe sự kiện sau khi giao dịch tạo mới hoặc điều chỉnh đã commit thành công.

Tính chi tiêu ròng trong kỳ ngân sách theo danh mục tương ứng, có xét bút toán hoàn/hủy; quy đổi về cùng tiền tệ với ngân sách trước khi so sánh.

Nếu tổng chi tiêu lớn hơn hoặc bằng hạn mức × tỷ lệ ngưỡng (ví dụ 0,8 hoặc 1,0), xác định đã chạm ngưỡng và phát cảnh báo theo kênh cấu hình. Chính sách gửi lặp và độ trễ tối đa cần được thống nhất.

## **2 Thiết kế API endpoints**

| HTTP | Endpoint | Mô tả | Dữ liệu gửi | Kết quả |
| :---- | :---- | :---- | :---- | :---- |
| POST | /​api/​v1/​transactions | Tạo mới giao dịch thu/chi | Body: {account\_id, category\_id, amount, currency, type, transaction\_date}; Idempotency-Key trong header. | 201 Created \+ transaction; lần gửi lại trả kết quả đã lưu. |
| GET | /​api/​v1/​transactions | Lấy danh sách lịch sử sổ cái | ?page=1\&limit=20\&start\_date=... | 200 OK \+ List Transactions & Ledger entries |
| GET | /​api/​v1/​currencies/​rates | Lấy tỷ giá quy đổi hiện tại | ?from=USD\&to=VND | 200 OK \+ {rate, source, updated\_at} |
| POST | /​api/​v1/​currencies/​convert | API quy đổi tiền tệ tức thì | {amount: 100, from: "USD", to: "VND"} | 200 OK \+ {converted\_amount, rate, source, updated\_at} |
| GET | /​api/​v1/​budgets/​alerts | Kiểm tra trạng thái cảnh báo ngân sách | Người dùng lấy từ phiên đã xác thực. | 200 OK \+ Danh sách danh mục sắp/đã vượt ngưỡng |

## **3 Thiết kế cơ sở dữ liệu**

### **3.1 Bảng users**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT — Primary Key | Định danh người dùng |
| username | VARCHAR | Tên đăng nhập |
| email | VARCHAR — UNIQUE | Địa chỉ email |
| password\_hash | VARCHAR | Giá trị băm mật khẩu có salt |
| created\_at | TIMESTAMP | Thời gian tạo tài khoản |
| updated\_at | TIMESTAMP | Thời gian cập nhật gần nhất |

### **3.2 Bảng accounts**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT  (PK) | Định danh ví tiền |
| user\_id | INT   (FK) | Liên kết tới bảng users |
| name | VARCHAR(100) | Tên ví tiền, ví dụ: Tiền mặt, Tiền tiết kiệm |
| currency | CHAR(3) | Loại tiền sử dụng, ví dụ: VND, USD |
| initial\_balance | DECIMAL (19,4) | Số dư ban đầu của ví |
| is\_active | BOOLEAN | Trạng thái hoạt động của ví |
| created\_at | TIMESTAMP | Thời gian tạo ví |
| updated\_at | TIMESTAMP | Thời gian cập nhật ví |
| deleted\_at | TIMESTAMP | Thời gian xóa ví (soft delete) |

### **3.3 Bảng categories**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT  (PK) | Định danh danh mục |
| user\_id | INT   (FK) | Liên kết tới bảng users |
| name | VARCHAR(100) | Tên danh mục, ví dụ: Ăn uống, Mua sắm, Lương |
| type | VARCHAR(20) | Loại giao dịch của danh mục: INCOME hoặc EXPENSE |
| icon | VARCHAR(50) | Biểu tượng đại diện cho danh mục |
| created\_at | TIMESTAMP | Thời gian tạo danh mục |
| updated\_at | TIMESTAMP | Thời gian cập nhật danh mục |
| deleted\_at | TIMESTAMP | Thời gian xóa danh mục |

### **3.4 Bảng transactions**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT (PK) | Định danh giao dịch |
| user\_id | INT (FK) | Liên kết tới người dùng thực hiện giao dịch |
| account\_id | INT (FK) | Tài khoản tiền liên quan; tham chiếu accounts.id |
| category\_id | INT (FK) | Liên kết tới danh mục thu/chi |
| amount | DECIMAL(19,4) | Số tiền thu hoặc chi |
| type | VARCHAR(20) | Loại giao dịch: INCOME hoặc EXPENSE |
| currency | CHAR(3) | Loại tiền, ví dụ: VND, USD |
| description | TEXT | Nội dung hoặc ghi chú của khoản thu/chi |
| transaction\_date | TIMESTAMP | Ngày và thời gian phát sinh khoản thu/chi |
| created\_at | TIMESTAMP | Thời gian tạo giao dịch |
| updated\_at | TIMESTAMP | Thời gian cập nhật giao dịch |

### **3.5 Bảng ledger\_entries**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT (PK) | Định danh bút toán |
| transaction\_id | INT (FK) | Liên kết tới giao dịch thu/chi trong bảng transactions |
| account\_id | INT (FK) | Tài khoản nhận bút toán; tham chiếu accounts.id |
| entry\_type | VARCHAR | Xác định bút toán thuộc DEBIT hoặc CREDIT |
| amount | DECIMAL(19,4) | Số tiền được ghi nhận trong bút toán |
| created\_at | TIMESTAMP | Thời gian tạo bút toán |
| currency | CHAR(3) | Tiền tệ của bút toán gốc |
| base\_amount | DECIMAL(19,4) | Giá trị theo tiền tệ cơ sở dùng để kiểm tra cân bằng |

### **3.6 Bảng budgets**

| Trường | Kiểu dữ liệu | Mô tả |
| :---- | :---- | :---- |
| id | INT (PK) | Định danh ngân sách |
| user\_id | INT (FK) | Liên kết tới người dùng |
| category\_id | INT (FK) | Danh mục áp dụng ngân sách |
| amount | DECIMAL(19,4) | Hạn mức chi tiêu |
| currency | CHAR(3) | Loại tiền |
| start\_date | DATE | Ngày bắt đầu |
| end\_date | DATE | Ngày kết thúc |
| created\_at | TIMESTAMP | Thời gian tạo ngân sách |

### **3.7 Quan hệ giữa các bảng**

| Bảng 1 | Quan hệ | Bảng 2 | Khóa liên kết | Mô tả |
| :---- | :---- | :---- | :---- | :---- |
| users | 1 \- N | accounts | accounts.​user\_id→ users.​id | Một người dùng có thể có nhiều ví/tài khoản quản lý dòng tiền. |
| users | 1 \- N | categories | categories.​user\_id→ users.​id | Một người dùng có thể tạo nhiều danh mục thu/chi. |
| users | 1 \- N | transactions | transactions.​user\_id→ users.​id | Một người dùng có thể có nhiều giao dịch thu/chi. |
| users | 1 \- N | budgets | budgets.​user\_id→ users.​id | Một người dùng có thể tạo nhiều ngân sách. |
| accounts | 1 \- N | transactions | transactions.​account\_id→ accounts.​id | Một ví/tài khoản có thể phát sinh nhiều giao dịch. |
| categories | 1 \- N | transactions | transactions.​category\_id→ categories.​id | Một danh mục có thể được sử dụng cho nhiều giao dịch. |
| categories | 1 \- N | budgets | budgets.​category\_id→ categories.​id | Một danh mục có thể có nhiều ngân sách theo các khoảng thời gian khác nhau. |
| transactions | 1 \- N | ledger\_entries | ledger\_entries.​transaction\_id→ transactions.​id | Một giao dịch có thể tạo ra nhiều bút toán Debit/Credit. |
| accounts | 1 \- N | ledger\_entries | ledger\_entries.​account\_id→ accounts.​id | Một tài khoản có nhiều bút toán Nợ/Có. |

### **Các điểm thiết kế cần hoàn thiện**

Bổ sung exchange\_rates, subscriptions, financial\_goals, dữ liệu nhãn/tệp đính kèm và lịch sử cảnh báo; đặc tả tài khoản đối ứng kế toán, bút toán số dư đầu kỳ, chuyển khoản và quan hệ hoàn/hủy. Chốt khóa idempotency, ràng buộc chủ sở hữu và chính sách thời gian. Các bảng hiện tại là thiết kế sơ bộ cho luồng sổ cái, chưa bao phủ toàn bộ yêu cầu.

## **4 Kế hoạch kiểm thử**

Mục tiêu: Kiểm chứng tính đúng đắn của nghiệp vụ sổ kép và sự phối hợp giữa Transaction Ledger API, Currency Conversion Worker, Budget Alert Service bằng bộ kiểm thử tự động trong CI; đối chiếu kết quả với các mã UR/SR.

**Công việc cần làm:** 

* Thống nhất API contract với M2 và schema DB (accounts, transactions, ledger\_entries) với M3; gắn mỗi test case với mã SR tương ứng.

* Dựng khung CI (GitHub Actions) chạy test tự động mỗi lần push/PR.

* Unit test bất biến sổ kép: tổng Debit bằng tổng Credit theo cùng tiền tệ cơ sở; chấp nhận giao dịch cân bằng và từ chối giao dịch lệch (SR-F05).

* Unit test trường hợp biên: quy đổi đa tiền tệ, làm tròn, số tiền lớn sát giới hạn kiểu dữ liệu, refund/void qua bút toán đảo, số tiền bằng 0 hoặc âm, gửi lặp và ghi đồng thời (SR-F06, SR-F08, SR-F26, SR-N01, SR-N02).

* Integration test API sổ cái và tỷ giá; kiểm tra xác thực/phân quyền, validation, phân trang và idempotency (SR-F01 đến SR-F12, SR-F23, SR-F26).

* Integration test liên dịch vụ: giao dịch ngoại tệ → quy đổi → ghi sổ thành công → chạm/vượt ngưỡng → cảnh báo. Kiểm tra chính xác tại 80% và 100% (SR-F10 đến SR-F15).

* Integration test rollback và điều chỉnh: lỗi giữa chừng không để lại dữ liệu một phần; hoàn/hủy phải cập nhật lại ngân sách và báo cáo (SR-F05, SR-F08, SR-F14).

* Đo coverage, bổ sung tình huống thiếu, lưu báo cáo kiểm thử và bộ test khi nộp; coverage là số liệu hỗ trợ, không thay thế kiểm chứng yêu cầu.

### **Hồ sơ đo và điều kiện nghiệm thu**

Trước khi chạy kiểm thử hiệu năng, nhóm cần ghi rõ cấu hình máy chủ, trình duyệt và mạng, số bản ghi, số người dùng đồng thời, trạng thái cache, thời lượng chạy và cách tổng hợp số đo. Các ngưỡng giữ từ yêu cầu là API \<200 ms, dashboard \<1,5 giây và tương tác thông thường \<2 giây; không đồng nhất thời gian xử lý máy chủ với thời gian người dùng chờ trên giao diện.

Kế hoạch bổ sung: kiểm thử màn hình từ 360 đến 1920 CSS px; kiểm thử khoản định kỳ, mục tiêu và báo cáo; kiểm thử bảo mật; sao lưu khi có đọc/ghi và phục hồi thử. Chốt kỳ đo uptime 99,9%, mục tiêu mất dữ liệu tối đa (RPO) và thời gian khôi phục tối đa (RTO) trước nghiệm thu vận hành.

# **Tài liệu tham khảo**

