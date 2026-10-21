# Tổng hợp quy trình thực hiện đồ án quản lý tài chính cá nhân

**Cập nhật nguồn ngày 21/10/2026:** bản tổng hợp bên dưới phản ánh mã ở HEAD cũ. Ref `origin/main` đã có trên máy hiện chứa backend và schema MySQL. Khi thiết kế UC, UML và ERD, dùng [bộ thiết kế tổng hợp mới](THIET_KE_TONG_HOP/README.md), có ghi rõ phiên bản và phần đề xuất bổ sung.

Bài của nhóm: Personal Wealth & Expense Tracker — giao diện hiện tại mang tên Chi Tiêu.

## 1. Nhìn toàn bộ quá trình làm bài

Có thể sắp xếp các sản phẩm của bài theo chuỗi công việc sau:

**Xác định đề tài → xác định yêu cầu → xác định tác nhân và Use Case → phân tích luồng nghiệp vụ → thiết kế Activity Diagram → thiết kế Sequence Diagram → làm rõ cấu trúc dữ liệu và thành phần xử lý → thiết kế giao diện → lập trình → đối chiếu, kiểm thử và hoàn thiện.**

Đây là cách tổ chức lại các tài liệu theo quan hệ đầu vào–đầu ra. Chưa có nhật ký đầy đủ để khẳng định nhóm đã thực hiện từng bước đúng thứ tự thời gian này hoặc đã áp dụng một mô hình quy trình cụ thể như Waterfall hay Scrum.

| Giai đoạn                                | Trong bài của nhóm                                                             | Sản phẩm đang có để đối chiếu                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Xác định bài toán                     | Quản lý tài chính cá nhân, thu chi, ngân sách, định kỳ và mục tiêu  | README của CNPM_524                                                                 |
| Xác định yêu cầu                      | Các mã UR-F và SR-F được gắn với chức năng                              | Cột “Yêu cầu liên quan” trong UC.docx                                          |
| Phân tích chức năng                    | Người dùng, tác nhân vận hành và 19 Use Case có mã                      | Bảng UC.docx; bộ ảnh trong Usecase&UML                                            |
| Chọn luồng quan trọng                   | Ghi chi/cảnh báo, điều chỉnh, nhắc thanh toán, báo cáo, đăng nhập 2FA | Mục “Main UC” trong UC.docx                                                       |
| Thiết kế luồng xử lý                  | Các bước, nhánh quyết định và xử lý lỗi                                | Bốn Activity Diagram                                                                |
| Thiết kế tương tác                    | Thành phần nào gửi yêu cầu cho thành phần nào                            | Bốn Sequence Diagram                                                                |
| Thiết kế dữ liệu                       | Thông tin nghiệp vụ và quan hệ được nêu trong Use Case/sơ đồ          | Chưa thấy ERD, schema hay từ điển dữ liệu độc lập trong bộ nguồn này    |
| Thiết kế giao diện và hiện thực hóa | Trang chủ, báo cáo, lịch sử, tài khoản, quản trị                         | Mã Next.js trong CNPM_524                                                           |
| Kiểm thử và đối chiếu                | Có thể suy ra trường hợp kiểm tra từ các nhánh thiết kế                | Chưa có kết quả kiểm thử toàn đồ án được xác nhận trong phạm vi này |

**Điểm quan trọng:** bài của bạn đã có kết quả phân tích và thiết kế nghiệp vụ rộng hơn phần chức năng hiện thực trong frontend. Sơ đồ là kết quả của giai đoạn thiết kế; không cần đợi chức năng chạy thật mới được ghi nhận là đã làm thiết kế. Tuy nhiên, có sơ đồ cũng chưa đồng nghĩa với đã hoàn thành lập trình chức năng đó.

## 2. Giai đoạn xác định đề tài và phạm vi

### 2.1 Bài toán cụ thể của nhóm

README xác định sản phẩm là ứng dụng quản lý tài chính cá nhân, hỗ trợ theo dõi thu chi, ngân sách và mục tiêu tiết kiệm theo định hướng sổ cái kép.

Từ bảng Use Case, phạm vi bài được thể hiện rõ hơn:

- Người dùng quản lý tài khoản tiền và danh mục thu/chi.
- Người dùng ghi nhận, tra cứu, hủy hoặc điều chỉnh giao dịch.
- Hệ thống hỗ trợ ngân sách và cảnh báo khi đạt ngưỡng.
- Hệ thống theo dõi khoản thanh toán định kỳ và nhắc đến hạn.
- Người dùng xem quy đổi ngoại tệ, tổng quan, báo cáo và mục tiêu tài chính.
- Hệ thống có các yêu cầu vận hành như đồng bộ tỷ giá, sao lưu và khôi phục.

Như vậy, bài toán bao gồm cả việc ghi nhận tiền, kiểm soát cách sử dụng tiền và duy trì dữ liệu để tra cứu về sau.

### 2.2 Phạm vi cần phân biệt

“Tài khoản tiền” trong UC03 là đối tượng dùng để ghi nhận nguồn tiền của người dùng. Nó khác với tài khoản đăng ký/đăng nhập ở UC01. Nếu gộp hai khái niệm này khi phân tích, thiết kế dữ liệu và phân công sẽ dễ bị nhầm.

“Danh mục” trong UC04 dùng để phân loại thu/chi. “Ngân sách” trong UC08 có hạn mức, danh mục và kỳ áp dụng. Vì vậy, danh mục là dữ liệu đầu vào cho nghiệp vụ ngân sách; hai chức năng có liên quan nhưng có mục đích riêng.

### 2.3 Đầu ra của giai đoạn này

Bài đã có tên đề tài, phạm vi chức năng trong README và phân công:

| Thành viên | Trách nhiệm theo README                                      |
| ------------ | -------------------------------------------------------------- |
| Anh          | Giao diện, dashboard, ngân sách và biểu mẫu giao dịch   |
| Tín         | API giao dịch, quy đổi tiền tệ và cảnh báo ngân sách |
| Loan         | Cơ sở dữ liệu sổ kép, xác thực, bảo mật và sao lưu |
| Linh         | Kiểm thử sổ kép, API và tích hợp CI/CD                  |

Đây là bảng phân công được ghi trong dự án. Chưa có đủ bằng chứng để gán toàn bộ kết quả của một giai đoạn cho một người hoặc xác nhận mỗi người đã hoàn thành toàn bộ mục được giao.

## 3. Giai đoạn xác định và liên kết yêu cầu

### 3.1 Yêu cầu được thể hiện như thế nào trong bài

UC.docx có cột “Yêu cầu liên quan”, nối các Use Case với mã UR-F và SR-F. Có thể đọc UR-F là nhóm yêu cầu chức năng ở phía người dùng và SR-F là nhóm yêu cầu chức năng ở mức hệ thống theo cách tổ chức bảng. Bộ nguồn hiện có chưa kèm tài liệu định nghĩa riêng toàn bộ các mã này.

Do đó, nội dung dưới đây là tổng hợp từ các liên kết trong UC.docx, không phải bản sao của một SRS đầy đủ đã tìm được.

| Mã yêu cầu phía người dùng | Nội dung được phản ánh qua Use Case                        | Use Case liên quan |
| --------------------------------- | ---------------------------------------------------------------- | ------------------- |
| UR-F01                            | Ghi nhận, tra cứu, hủy hoặc điều chỉnh giao dịch         | UC05, UC06, UC07    |
| UR-F02                            | Quản lý tài khoản tiền và danh mục                        | UC03, UC04          |
| UR-F03                            | So sánh tài chính giữa các kỳ                              | UC17                |
| UR-F04                            | Thiết lập ngân sách và nhận cảnh báo                     | UC08, UC09          |
| UR-F05                            | Quản lý khoản định kỳ, nhắc đến hạn và xem đề xuất | UC10, UC11, UC12    |
| UR-F06                            | Xem giá trị quy đổi ngoại tệ                               | UC13                |
| UR-F07                            | Xem dashboard                                                    | UC14                |
| UR-F08                            | Quản lý mục tiêu tài chính                                 | UC15                |
| UR-F09                            | Xem lịch sử và báo cáo thu/chi                              | UC06, UC16          |
| UR-F10                            | Đăng ký, đăng nhập và 2FA nếu bật                       | UC01                |

### 3.2 Tại sao cần gắn mã yêu cầu với Use Case

Liên kết này giúp trả lời được: một chức năng được thiết kế để đáp ứng nhu cầu nào, và một nhu cầu đã được đưa vào thiết kế hay chưa.

Ví dụ cụ thể của bài:

**UR-F04 → UC08 và UC09 → thiết kế luồng ghi khoản chi và kiểm tra ngân sách.**

Người dùng cần kiểm soát ngân sách. Tài liệu tách thành thiết lập ngân sách và nhận cảnh báo. Để cảnh báo có ý nghĩa, luồng ghi chi phải cập nhật mức sử dụng ngân sách và so với ngưỡng đã cấu hình. Đây là mối liên hệ giữa yêu cầu, chức năng và xử lý nghiệp vụ.

### 3.3 Điểm còn thiếu ở bước yêu cầu

- UC17 được tài liệu ghi rõ “UR-F03 — chưa có SR tương ứng”. Đây là một khoảng trống đã được nhận diện ngay trong bảng.
- Chưa tìm thấy bảng đầy đủ của các SR-F để kiểm tra từng điều kiện, đầu vào, đầu ra và tiêu chí chấp nhận.
- Chưa có tài liệu yêu cầu phi chức năng độc lập như tải dự kiến, thời gian phản hồi mục tiêu hay độ sẵn sàng. Không tự điền số liệu cho những mục này.
- Chưa có biên bản khảo sát hoặc phỏng vấn để mô tả nhóm đã thu thập yêu cầu bằng cách nào. Có thể xác nhận kết quả yêu cầu được ghi nhận, chưa thể xác nhận phương pháp khảo sát đã dùng.

## 4. Giai đoạn xác định tác nhân và xây dựng Use Case

### 4.1 Tác nhân trong tài liệu của bạn

| Tác nhân                             | Vai trò trong bài                                                   | Ghi chú nguồn                                                             |
| -------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Người dùng                          | Quản lý tài chính của chính mình                               | Actor chính trong UC.docx                                                  |
| Nhà cung cấp tỷ giá                | Hệ thống bên ngoài cung cấp dữ liệu tỷ giá                   | UC18                                                                        |
| Bộ lập lịch bên ngoài, nếu có   | Kích hoạt tác vụ sao lưu theo mô hình hệ thống được chọn | UC19; tài liệu ghi điều kiện “nếu có”                              |
| Người vận hành được cấp quyền | Thực hiện khôi phục dữ liệu                                     | UC20                                                                        |
| Admin trong ảnh tổng hợp            | Tham gia một số chức năng vận hành trên sơ đồ UC15–UC20    | Cần thống nhất với tên và phạm vi “người vận hành” trong bảng |

Không mặc nhiên coi mọi người dùng là quản trị viên. Tên “Tour Guide” xuất hiện trong hai ảnh ngân sách và khoản định kỳ không phù hợp với actor của bài tài chính trong UC.docx; cần được sửa hoặc xác nhận là phần sót từ mẫu.

### 4.2 Danh sách Use Case của chính đồ án

Tài liệu có 19 Use Case được đặt mã: UC01 và UC03–UC20. Không có mục UC02 được mô tả trong bảng đang đọc; không tự tạo thêm để lấp số thứ tự.

| Mã  | Chức năng                                                                 | Yêu cầu liên quan trong UC.docx |
| ---- | --------------------------------------------------------------------------- | ---------------------------------- |
| UC01 | Đăng ký/Đăng nhập; 2FA nếu được bật                              | UR-F10, SR-F01, SR-F02             |
| UC03 | Tạo, xem, sửa, ngừng sử dụng tài khoản tiền                         | UR-F02, SR-F03                     |
| UC04 | Tạo, xem, sửa, ngừng sử dụng danh mục thu/chi                         | UR-F02, SR-F03                     |
| UC05 | Ghi nhận giao dịch thu/chi                                                | UR-F01, SR-F04                     |
| UC06 | Tra cứu, lọc lịch sử theo thời gian và phân trang                    | UR-F01, UR-F09, SR-F07             |
| UC07 | Hủy hoặc điều chỉnh bằng bút toán đảo, liên kết giao dịch gốc | UR-F01, SR-F08                     |
| UC08 | Thiết lập hạn mức, danh mục, kỳ và ngưỡng ngân sách              | UR-F04, SR-F13–14                 |
| UC09 | Nhận cảnh báo khi đạt hoặc vượt ngưỡng                            | UR-F04, SR-F14–15                 |
| UC10 | Tạo, xem, sửa, dừng theo dõi khoản đăng ký định kỳ               | UR-F05, SR-F16                     |
| UC11 | Nhận nhắc trước ngày đến hạn của khoản còn hoạt động          | UR-F05, SR-F17                     |
| UC12 | Xem khoản chi được nhận diện có tính định kỳ                     | UR-F05, SR-F18                     |
| UC13 | Xem tiền quy đổi, tỷ giá áp dụng và thời điểm cập nhật         | UR-F06, SR-F11–12                 |
| UC14 | Xem tài sản ròng, tổng thu/chi và biểu đồ theo kỳ                  | UR-F07, SR-F20                     |
| UC15 | Quản lý mục tiêu, cập nhật tích lũy và xem tiến độ              | UR-F08, SR-F19, SR-F21             |
| UC16 | Xem tổng thu, tổng chi và chênh lệch theo kỳ                          | UR-F09, SR-F22                     |
| UC17 | So sánh số liệu giữa các kỳ                                           | UR-F03; chưa có SR tương ứng  |
| UC18 | Đồng bộ tỷ giá                                                         | SR-F10                             |
| UC19 | Sao lưu dữ liệu                                                          | SR-F24                             |
| UC20 | Khôi phục dữ liệu                                                       | SR-F25                             |

### 4.3 Từ yêu cầu sang chức năng cụ thể

Ở UC05, nhu cầu ghi nhận thu/chi được cụ thể thành các thông tin cần nhập: số tiền, ngày, tài khoản tiền, danh mục, tiền tệ và thông tin bổ sung. Ảnh UC05 thể hiện thêm kiểm tra hợp lệ và lưu giao dịch.

Ở UC07, “sửa giao dịch” được làm rõ thành nghiệp vụ giữ giao dịch gốc, ghi bút toán đảo và liên kết phần điều chỉnh. Chi tiết này ảnh hưởng trực tiếp đến cách lưu dữ liệu; không thể chỉ xây dựng một thao tác sửa đè thông thường rồi coi là đã đáp ứng thiết kế.

Ở UC16, “xem báo cáo” được làm rõ thành chọn kỳ và xem các đại lượng tổng thu, tổng chi, chênh lệch. Đây là cơ sở cho các bước kiểm tra khoảng thời gian và tổng hợp dữ liệu trong sơ đồ tiếp theo.

### 4.4 Đầu ra thực tế

Đã có bảng Use Case và 14 ảnh trong Usecase&UML. Số ảnh không bằng số Use Case vì có ảnh gộp nhiều chức năng; một số ảnh có nội dung không khớp mã trong bảng.

UC.docx hiện là bảng danh mục, nội dung tóm tắt và liên kết yêu cầu. Nó chưa phải bộ đặc tả đầy đủ từng Use Case với toàn bộ tiền điều kiện, hậu điều kiện, luồng chính và luồng thay thế. Các nội dung này chỉ được bổ sung một phần qua các sơ đồ chi tiết.

## 5. Giai đoạn chọn các nghiệp vụ quan trọng để thiết kế sâu

Mục “Main UC” trong UC.docx chọn năm luồng:

| Luồng ưu tiên | Phạm vi                                     | Ý nghĩa thiết kế trong bài                                           |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| 1                | UC05 + UC09, dùng ngân sách UC08          | Nối việc ghi một khoản chi với cập nhật và cảnh báo ngân sách |
| 2                | UC07                                         | Xử lý điều chỉnh dữ liệu tài chính đã ghi sổ                  |
| 3                | UC11, dùng dữ liệu khoản định kỳ UC10 | Xử lý nghiệp vụ được kích hoạt theo thời điểm                 |
| 4                | UC16                                         | Kiểm tra kỳ, lấy giao dịch, tổng hợp và trả báo cáo             |
| 5                | Phần đăng nhập của UC01                 | Xác thực tài khoản, kiểm tra 2FA và tạo phiên                     |

Bốn luồng đầu đã có cặp ảnh Activity–Sequence trong thư mục Diagram. Luồng đăng nhập 2FA được mô tả là cần thiết kế trong UC.docx, nhưng chưa tìm thấy cặp sơ đồ chi tiết tương ứng trong thư mục này.

Việc chọn các luồng trên giúp bài đi sâu vào những xử lý có điều kiện và có sự phối hợp giữa nhiều phần. Đây là nhận xét từ nội dung luồng đã chọn, không phải ghi chép về lý do thảo luận ban đầu của nhóm.

## 6. Giai đoạn thiết kế Activity Diagram

Trong bài của bạn, Activity Diagram dùng để mô tả các bước xử lý và những tình huống khiến luồng rẽ sang hướng khác. Đọc sơ đồ ở bước này cần tập trung vào: bắt đầu do sự kiện gì, xử lý gì, kiểm tra điều kiện gì và kết thúc với kết quả nào.

### 6.1 Ghi khoản chi và cảnh báo ngân sách

Nguồn: ảnh UC6-9_Activity_Diagram.png. Tên file là UC6-9, nhưng nội dung ảnh và bảng Main UC mô tả ghi chi UC05 kết hợp cảnh báo UC09, dùng ngân sách UC08. Vì vậy, bản tổng hợp dùng tên nghiệp vụ thay vì suy ra phạm vi từ tên file.

Luồng nghiệp vụ thể hiện:

1. Người dùng nhập khoản chi.
2. Hệ thống kiểm tra dữ liệu.
3. Không hợp lệ thì báo lỗi.
4. Hợp lệ thì lưu khoản chi.
5. Cập nhật mức sử dụng ngân sách.
6. Kiểm tra vượt ngưỡng.
7. Nếu vượt thì tạo và gửi cảnh báo; người dùng nhận thông báo.
8. Nếu không vượt thì hiển thị lưu thành công.

**Điều đã được làm rõ ở bước thiết kế:** một giao dịch mới có thể kéo theo thay đổi mức sử dụng ngân sách. Vì vậy, ghi giao dịch và cảnh báo không phải hai chức năng hoàn toàn tách rời.

**Cần thống nhất thêm:** Activity ghi “vượt ngưỡng”, trong khi bảng UC09 và Sequence dùng “đạt/vượt ngưỡng”. Trường hợp bằng đúng ngưỡng cần có quy tắc duy nhất.

### 6.2 Hủy hoặc điều chỉnh giao dịch UC07

Nguồn: UC07_Activity Diagram.png.

Luồng đã được thể hiện khá chi tiết:

1. Chọn giao dịch đã ghi sổ.
2. Kiểm tra quyền và hiệu lực của giao dịch.
3. Không đủ điều kiện thì thông báo không thể thao tác và dừng.
4. Chọn hủy hoặc điều chỉnh.
5. Nếu điều chỉnh, nhập nội dung mới và kiểm tra dữ liệu; lỗi thì quay lại nhập.
6. Yêu cầu người dùng xác nhận.
7. Không đồng ý thì dừng; đồng ý thì ghi bút toán đảo giao dịch gốc.
8. Nếu điều chỉnh, ghi thêm giao dịch mới với nội dung đã sửa.
9. Liên kết các bút toán và lưu đồng thời.
10. Lưu thất bại thì hoàn tác và báo lỗi; thành công thì hiển thị kết quả.

**Giá trị thiết kế:** sơ đồ đã tính đến quyền thao tác, tính hợp lệ, xác nhận của người dùng và lỗi lưu dữ liệu. Giao dịch gốc được giữ để tra cứu lịch sử.

**Ví dụ giải thích, không phải dữ liệu thật:** một khoản chi ghi nhầm 500.000đ thành ra cần sửa còn 50.000đ. Theo ý định thiết kế này, hệ thống giữ bản gốc, tạo phần đảo ảnh hưởng cũ rồi tạo giao dịch thay thế. Cách biểu diễn từng dòng bút toán và bảng dữ liệu chưa được chỉ rõ trong bộ nguồn đang có.

### 6.3 Nhắc thanh toán đến hạn UC11

Nguồn: UC11_ActivityDiagram.png.

Luồng thể hiện:

1. Đến thời điểm kiểm tra định kỳ.
2. Lấy danh sách khoản còn hoạt động và lịch nhắc.
3. Quét, lọc các khoản đến hạn và chưa gửi nhắc thành công.
4. Không có khoản phù hợp thì kết thúc.
5. Có khoản phù hợp thì tạo nội dung và gửi tới người dùng.
6. Theo dõi kết quả gửi; sơ đồ có nhánh thành công và lỗi/không phản hồi.

**Giá trị thiết kế:** xác định được tác vụ không nhất thiết bắt đầu bằng một cú bấm của người dùng. Nó phụ thuộc thời điểm và trạng thái khoản định kỳ; cần nhớ kết quả đã gửi để tránh gửi lại một cách không kiểm soát.

**Cần làm rõ thêm:** cách thử lại khi gửi lỗi, số lần thử, thời điểm thử và điều kiện dừng chưa được đặc tả đầy đủ trong ảnh.

### 6.4 Xem báo cáo theo kỳ UC16

Nguồn: UC16_Activity Diagram.png.

Luồng thể hiện:

1. Chọn kỳ thời gian.
2. Kiểm tra khoảng thời gian.
3. Nếu không hợp lệ, báo lỗi và yêu cầu chọn lại.
4. Nếu hợp lệ, lấy giao dịch theo kỳ.
5. Nếu không có dữ liệu, hiển thị trạng thái tương ứng rồi kết thúc.
6. Nếu có dữ liệu, tính tổng thu, tổng chi và chênh lệch.
7. Hiển thị báo cáo.

**Giá trị thiết kế:** ngoài kết quả bình thường, sơ đồ đã tính tới hai tình huống quan trọng: kỳ không hợp lệ và kỳ không có dữ liệu.

### 6.5 Đầu ra của bước Activity

Bài đã có bốn sơ đồ giúp xác định thứ tự xử lý, điều kiện rẽ nhánh và kết quả kết thúc. Những nhánh này cũng là đầu vào để thiết kế test case sau này.

Một số thanh đen ở đầu/cuối các ảnh chưa làm rõ ý nghĩa xử lý song song. Cần rà lại ký hiệu và đường nối trước khi dùng như bản UML đã hoàn thiện; bản tổng hợp này chỉ diễn giải luồng nghiệp vụ đọc được trong ảnh.

## 7. Giai đoạn thiết kế Sequence Diagram

Sau khi biết các bước nghiệp vụ, Sequence Diagram của bài chuyển sang câu hỏi: phần nào chịu trách nhiệm thực hiện mỗi bước, và các phần trao đổi yêu cầu/kết quả theo thứ tự nào?

### 7.1 Ghi chi và cảnh báo ngân sách

Nguồn: UC6-9_sequenceDiagram.png.

Các đối tượng trong ảnh: client(User), GiaoDich, NganSach và Database.

Trình tự được mô tả:

1. Client gửi khoản chi tới phần xử lý giao dịch.
2. Phần giao dịch lưu khoản chi vào Database và nhận kết quả đã lưu.
3. Phần giao dịch yêu cầu kiểm tra ngân sách.
4. Phần ngân sách lấy ngân sách đã cấu hình từ Database.
5. Nhánh đạt/vượt ngưỡng: gửi cảnh báo và lưu lịch sử cảnh báo.
6. Nhánh chưa vượt ngưỡng: trả thông báo ghi nhận thành công.

**Điều thể hiện về phân chia trách nhiệm:** phần giao dịch tiếp nhận việc ghi nhận; phần ngân sách kiểm tra hạn mức; Database lưu dữ liệu và lịch sử cảnh báo.

**Đối chiếu với Activity:** Activity có bước kiểm tra dữ liệu và cập nhật mức sử dụng ngân sách; Sequence chưa thể hiện tường minh toàn bộ các bước này. Đây là điểm cần bổ sung khi làm hai sơ đồ nhất quán.

### 7.2 Hủy hoặc điều chỉnh giao dịch UC07

Nguồn: UC07_Sequence Diagram.png.

Các đối tượng: Người dùng → Giao diện → Bộ xử lý giao dịch → Database.

- Người dùng chọn giao dịch và thao tác.
- Giao diện gửi id, thao tác và dữ liệu tới bộ xử lý.
- Bộ xử lý lấy giao dịch gốc rồi kiểm tra quyền và dữ liệu.
- Nhánh hợp lệ ghi bút toán đảo; nếu là điều chỉnh thì ghi thêm giao dịch thay thế.
- Liên kết và lưu đồng thời, nhận kết quả rồi trả về giao diện.
- Nhánh không hợp lệ trả thông báo lỗi.

**Điểm thiết kế cần nắm:** kiểm tra quyền và xử lý dữ liệu được đặt ở bộ xử lý giao dịch. Giao diện nhận yêu cầu người dùng và hiển thị kết quả. Lưu đồng thời các thay đổi liên quan là ý định rõ ràng của thiết kế.

**Phần cần đồng bộ:** Activity có nhánh người dùng không xác nhận và nhánh lưu thất bại/hoàn tác. Sequence hiện chưa biểu diễn riêng đầy đủ hai nhánh đó.

### 7.3 Nhắc thanh toán UC11

Nguồn: UC11_SequenceDiagram.png.

Các đối tượng trong ảnh: Client(User), NhacNhoController và Database.

- Controller lấy danh sách còn hoạt động, đã đến giờ nhắc và chưa gửi thành công.
- Controller tạo nội dung thông báo và gửi người dùng.
- Lưu kết quả thông báo và thời gian.
- Ảnh còn thể hiện ghi log lỗi, thông báo và lưu kết quả lỗi.

**Điều đã được phân chia:** controller xử lý lịch nhắc và nội dung; Database cung cấp dữ liệu và lưu kết quả; người dùng là bên nhận.

**Phần cần làm rõ:** bảng Main UC nêu bộ lập lịch và dịch vụ thông báo, nhưng ảnh chưa tách hai thành phần đó. Các trường hợp thành công/thất bại cũng chưa được tách nhánh rõ, nên không nên đọc thành một luồng bắt buộc luôn vừa thành công vừa ghi lỗi.

### 7.4 Xem báo cáo UC16

Nguồn: UC16_Sequent Diagram.png.

Các đối tượng: Người dùng → Giao diện → Báo cáo Controller → Cơ sở dữ liệu.

1. Người dùng chọn kỳ; giao diện gửi yêu cầu xem báo cáo.
2. Controller kiểm tra khoảng thời gian và bộ lọc.
3. Không hợp lệ thì trả lỗi để giao diện yêu cầu chọn lại.
4. Hợp lệ thì lấy giao dịch theo kỳ và bộ lọc.
5. Không có dữ liệu thì trả thông báo.
6. Có dữ liệu thì tính tổng thu, tổng chi và chênh lệch, rồi trả kết quả để giao diện hiển thị.

**Điều đã được xác định:** dữ liệu báo cáo được lấy từ giao dịch; controller chịu trách nhiệm kiểm tra và tổng hợp; giao diện chịu trách nhiệm nhận lựa chọn và hiển thị.

### 7.5 Activity và Sequence bổ sung nhau thế nào trong bài

| Câu hỏi                   | Activity của UC07                                                            | Sequence của UC07                                                      |
| --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Khi nào được hủy/sửa? | Khi đủ quyền, giao dịch còn hiệu lực và người dùng xác nhận      | Bộ xử lý lấy giao dịch gốc rồi kiểm tra                         |
| Phải xử lý những gì?   | Đảo giao dịch gốc, có thể ghi giao dịch thay thế, liên kết và lưu | Các lời gọi giữa giao diện, bộ xử lý và Database               |
| Khi nào kết thúc?        | Thành công, không đủ điều kiện, hủy xác nhận hoặc lỗi lưu       | Các phản hồi trả về giao diện đã được biểu diễn một phần |

Đây là lý do cùng một nghiệp vụ cần được đối chiếu giữa hai góc nhìn. Không phải có hai hình là mặc nhiên mô tả cùng một tập hành vi đầy đủ.

## 8. Giai đoạn thiết kế dữ liệu và cấu trúc hệ thống

### 8.1 Những dữ liệu đã được xác định từ nghiệp vụ

Chưa tìm thấy sơ đồ ERD, sơ đồ lớp, schema SQL hoặc từ điển dữ liệu trong bộ “Dự án CNPM CKI” và CNPM_524 đang kiểm tra. Tuy vậy, các Use Case và sơ đồ đã nêu những thông tin hệ thống phải quản lý.

Bảng dưới đây tổng hợp các khái niệm dữ liệu từ chính tài liệu của nhóm; đây chưa phải thiết kế bảng cơ sở dữ liệu đã được nhóm chốt.

| Khái niệm dữ liệu        | Thông tin hoặc quan hệ được nêu trong bài                                        | Nguồn dẫn tới nhu cầu dữ liệu |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| Người dùng và xác thực | Tài khoản email, xác thực, trạng thái bật 2FA; phiên được nhắc trong Main UC | UC01                                |
| Tài khoản tiền            | Có thể tạo, xem, sửa, ngừng sử dụng; được chọn khi ghi giao dịch             | UC03, UC05                          |
| Danh mục thu/chi            | Có thể quản lý; giao dịch và ngân sách gắn với danh mục                       | UC04, UC05, UC08                    |
| Giao dịch                   | Số tiền, ngày, tài khoản, danh mục, tiền tệ, thông tin bổ sung                 | UC05                                |
| Liên kết điều chỉnh     | Giao dịch gốc, bút toán đảo và giao dịch thay thế nếu có                      | UC07 và hai sơ đồ UC07          |
| Ngân sách                  | Hạn mức, danh mục, kỳ áp dụng, ngưỡng cảnh báo và mức sử dụng              | UC08, UC09                          |
| Lịch sử cảnh báo         | Cảnh báo phát sinh khi kiểm tra ngân sách                                          | Sequence ghi chi và cảnh báo     |
| Khoản đăng ký định kỳ | Khoản được theo dõi, trạng thái hoạt động, ngày đến hạn, lịch nhắc       | UC10, UC11                          |
| Kết quả gửi nhắc         | Kết quả và thời gian gửi; thông tin lỗi                                           | Sequence UC11                       |
| Tỷ giá                     | Tỷ giá áp dụng, thời điểm cập nhật, dữ liệu từ nhà cung cấp                | UC13, UC18                          |
| Mục tiêu tài chính       | Mục tiêu, phần tích lũy, tiến độ và trạng thái kết thúc                     | UC15                                |
| Dữ liệu báo cáo          | Giao dịch theo kỳ, tổng thu, tổng chi và chênh lệch                               | UC16 và hai sơ đồ UC16          |
| Bản sao lưu                | Bản dữ liệu được tạo và được chọn để khôi phục                           | UC19, UC20, ảnh UC15–UC20         |

### 8.2 Mối liên hệ dữ liệu cần rút ra từ bài

**Giao dịch và danh mục:** UC05 yêu cầu chọn danh mục cho giao dịch. Khi lập báo cáo theo danh mục, dữ liệu phải giữ được thông tin phân loại đó. Frontend báo cáo hiện có danh sách danh mục tổng hợp sẵn; nó chưa chứng minh dữ liệu giao dịch đã được thiết kế và lưu đầy đủ.

**Giao dịch và ngân sách:** mức sử dụng ngân sách phụ thuộc các khoản chi thuộc phạm vi ngân sách. Vì vậy, khi thiết kế chi tiết cần thống nhất cách chọn khoản chi theo danh mục và kỳ. Tài liệu đã nêu các thành phần này, nhưng chưa chỉ rõ toàn bộ quy tắc tính.

**Giao dịch gốc và điều chỉnh:** UC07 yêu cầu giữ được liên kết giữa các bút toán. Nếu mất liên kết, sẽ không đáp ứng mục tiêu tra cứu lịch sử điều chỉnh mà sơ đồ đã nêu.

**Khoản định kỳ và kết quả nhắc:** UC11 lọc các khoản chưa gửi thành công. Muốn thực hiện được điều kiện đó, hệ thống cần biết lần gửi nào thành công, thất bại và vào thời điểm nào. Đây là nhu cầu lưu trữ được thể hiện trong Sequence.

**Báo cáo và giao dịch:** Sequence UC16 lấy giao dịch từ cơ sở dữ liệu rồi mới tổng hợp. Vì vậy, báo cáo trong thiết kế dựa trên dữ liệu nghiệp vụ, không phải một tập số liệu nhập riêng để hiển thị.

### 8.3 Những quyết định dữ liệu chưa có bằng chứng

Chưa thể xác nhận từ bộ tài liệu hiện có:

- Tên bảng, kiểu cột, khóa chính, khóa ngoại và số lượng bảng cuối cùng.
- Quan hệ và lực lượng cụ thể giữa từng bảng trong ERD.
- Quy tắc duy nhất của tài khoản, cách lưu trạng thái ngừng sử dụng và ràng buộc xóa.
- Cách biểu diễn chi tiết sổ kép, các dòng bút toán và kiểm tra cân bằng.
- Đơn vị và độ chính xác của số tiền, tỷ giá trong cơ sở dữ liệu.
- Cách tổ chức giao dịch cơ sở dữ liệu để lưu đồng thời và hoàn tác theo UC07.

Những mục này là khoảng trống cần bổ sung hoặc tìm lại tài liệu đã làm. Không nên chuyển bảng khái niệm ở trên thành một ERD tự tạo rồi ghi rằng đó là thiết kế ban đầu của nhóm.

### 8.4 Phân chia trách nhiệm hệ thống đã xuất hiện trong thiết kế

Từ các Sequence Diagram, có thể tổng hợp ba nhóm trách nhiệm:

| Nhóm trách nhiệm        | Thành phần được gọi tên trong các sơ đồ                        | Công việc thể hiện                                                                   |
| -------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tiếp nhận và hiển thị | Giao diện, Client/User                                                   | Nhận lựa chọn/dữ liệu; hiển thị báo cáo, thông báo hoặc lỗi                 |
| Xử lý nghiệp vụ        | Bộ xử lý giao dịch, NganSach, NhacNhoController, Báo cáo Controller | Kiểm tra, quyết định nhánh, tính toán, điều phối việc lưu và trả kết quả |
| Lưu trữ                  | Database/Cơ sở dữ liệu                                                | Lấy giao dịch, ngân sách, lịch nhắc; lưu thay đổi và kết quả                 |

Đây là phân chia trách nhiệm ở mức mô hình. Các ảnh chưa xác định cách triển khai vật lý, số máy chủ, số dịch vụ độc lập hoặc giao thức API. Vì vậy, có thể nói thiết kế đã tách giao diện, xử lý và dữ liệu; chưa đủ căn cứ để khẳng định đã thiết kế hoàn chỉnh hay triển khai kiến trúc microservices.

## 9. Giai đoạn thiết kế giao diện

### 9.1 Giao diện gắn với Use Case như thế nào

Mã hiện tại cho thấy các màn hình đã được xây dựng theo những nhóm nhu cầu trong bài. Bảng dưới đây là đối chiếu chức năng, không phải bằng chứng rằng một màn hình đã đáp ứng đầy đủ Use Case.

| Use Case/yêu cầu                   | Vị trí tương ứng trong giao diện hiện tại                    | Mục đích của màn hình                                                        |
| ------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| UC01 — đăng ký/đăng nhập      | /register, /login và trạng thái khách ở /profile                | Nhập thông tin và điều hướng tài khoản                                    |
| UC05 — ghi giao dịch               | Nút “Ghi giao dịch” trên trang chủ                             | Vị trí thao tác đã có, chưa có form và luồng lưu                        |
| UC06 — lịch sử                    | /history                                                             | Khung danh sách, tìm kiếm, lọc và tổng quan                                  |
| UC08–UC09 — ngân sách/cảnh báo | Thanh phần trăm ngân sách và badge thông báo trên trang chủ | Minh họa thông tin ngân sách; chưa có quy trình thiết lập/gửi cảnh báo |
| UC11 — nhắc thanh toán            | Mục “Lời nhắc” trên trang chủ                                 | Vị trí chức năng, chưa có màn hình/xử lý tương ứng                    |
| UC13 — quy đổi ngoại tệ         | Mục “Quy đổi tiền tệ” trên trang chủ                        | Vị trí chức năng, chưa có luồng quy đổi                                   |
| UC14 — dashboard                    | /                                                                    | Tổng thu, chi, chênh lệch theo kỳ và ngân sách mẫu                         |
| UC16 — báo cáo                    | /reports                                                             | Tổng hợp mẫu theo tuần/tháng và cơ cấu thu/chi                             |
| UC18–UC20 — vận hành             | /admin                                                               | Các tab tỷ giá, sao lưu và thao tác quản trị mô phỏng                    |

Chưa thấy màn hình đầy đủ tương ứng với quản lý tài khoản tiền UC03, danh mục UC04, điều chỉnh UC07, quản lý khoản định kỳ UC10, đề xuất UC12, mục tiêu UC15 và so sánh kỳ UC17.

### 9.2 Những quyết định giao diện đã thể hiện trong mã

- Bốn mục điều hướng chính là Trang chủ, Báo cáo, Lịch sử và Tôi.
- Thanh điều hướng được dùng chung và đánh dấu mục đang mở.
- Trang chủ cho chọn ngày hoặc tháng; báo cáo cho chọn tuần hoặc tháng và thu hoặc chi.
- Lịch sử có trạng thái “Chưa có giao dịch nào”.
- Đăng ký/đăng nhập có thông báo lỗi và nút hiện/ẩn mật khẩu.
- Báo cáo sử dụng biểu đồ vòng cùng danh sách danh mục để thể hiện tỷ lệ.
- Màu và CSS dùng chung giúp tổ chức định dạng giữa các trang; có CSS riêng cho từng nhóm màn hình.

### 9.3 Sản phẩm đầu ra của bước giao diện

Đã có mã giao diện cụ thể để đối chiếu với thiết kế nghiệp vụ. Chưa tìm thấy bộ wireframe, bản thiết kế Figma hoặc sơ đồ user flow riêng trong bộ tài liệu đã xác nhận. Vì vậy, kết quả được ghi nhận ở đây là giao diện được hiện thực bằng mã nguồn.

Giới hạn quan trọng của bước này: một nút xuất hiện trên màn hình mới cho thấy vị trí thao tác đã được bố trí. Muốn xác nhận một Use Case được hiện thực, còn phải kiểm tra xử lý, dữ liệu và các nhánh nghiệp vụ.

## 10. Giai đoạn lập trình và hiện thực hóa thiết kế

### 10.1 Cấu trúc phần đã triển khai

CNPM_524 sử dụng Next.js, React và TypeScript. Các trang nằm trong app; components chứa thành phần dùng chung, lib có bảng màu và vị trí đọc người dùng, styles chứa CSS từng màn hình.

Một số thành phần cụ thể:

| Thành phần                 | Vai trò đã hiện thực                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- |
| app/page.tsx                 | Chọn kỳ, tra dữ liệu mẫu, tính thu trừ chi và hiển thị ngân sách mẫu |
| app/reports/page.tsx         | Chọn bộ dữ liệu, tính tổng/tỷ lệ và tạo biểu đồ bằng CSS            |
| app/history/page.tsx         | Cấu trúc giao dịch, cộng thu/chi và trạng thái danh sách rỗng            |
| app/register/page.tsx        | Kiểm tra bỏ trống, mật khẩu ngắn và xác nhận không khớp                |
| app/login/page.tsx           | Kiểm tra bỏ trống và chuyển trang                                            |
| app/lib/session.ts           | Hàm dự kiến đọc phiên, hiện luôn trả về null                            |
| app/components/BottomNav.tsx | Điều hướng giữa các trang và đánh dấu trang hiện tại                  |
| app/admin/page.tsx           | Chuyển tab, dữ liệu mẫu và trạng thái chờ giả lập                       |

### 10.2 Trường hợp UC16 từ thiết kế sang mã

Thiết kế UC16 mô tả:

**Chọn kỳ → kiểm tra khoảng thời gian → lấy giao dịch → tính tổng → hiển thị; có nhánh kỳ sai và không có dữ liệu.**

Mã hiện tại có:

**Chọn tuần/tháng → chọn bộ dữ liệu mẫu đã khai báo → cộng các danh mục → tính chênh lệch/tỷ lệ → hiển thị.**

Phần đã hiện thực gồm lựa chọn chế độ, phép cộng tổng, chênh lệch, tỷ lệ và trình bày báo cáo. Phần chưa hiện thực theo thiết kế gồm nhận khoảng thời gian tùy chọn, kiểm tra khoảng thời gian đó, lấy giao dịch từ nơi lưu trữ qua bộ xử lý và phản hồi đầy đủ các nhánh thiết kế.

Đây là ví dụ rõ để phân biệt mức độ hoàn thành: có thể ghi nhận “đã lập trình phần giao diện và tổng hợp trên dữ liệu mẫu của UC16”, chưa nên ghi “UC16 đã hoàn thành toàn bộ”.

### 10.3 Trường hợp UC01 từ thiết kế sang mã

Tài liệu yêu cầu tạo tài khoản bằng email chưa tồn tại, xác thực và 2FA nếu bật. Main UC còn nhắc đến tạo phiên.

Mã đăng ký hiện kiểm tra các trường bắt buộc, độ dài mật khẩu tối thiểu và xác nhận trùng nhau; sau đó chuyển sang đăng nhập. Mã đăng nhập kiểm tra có nhập tài khoản/mật khẩu rồi chuyển sang hồ sơ. Hàm đọc người dùng luôn trả về null.

Như vậy, phần hiện thực mới bao gồm form và kiểm tra nhập liệu ở giao diện. Các bước kiểm tra email trùng, tạo tài khoản, xác thực, 2FA và phiên chưa được xác nhận trong repository này.

### 10.4 Trường hợp UC07 từ thiết kế sang mã

UC07 đã có mô tả nghiệp vụ và cặp sơ đồ khá chi tiết. Tuy nhiên, chưa thấy mã thực hiện quyền thao tác, bút toán đảo, giao dịch thay thế và lưu đồng thời trong CNPM_524.

Kết quả đúng để tổng hợp là: **đã có thiết kế hành vi của UC07; chưa có bằng chứng hiện thực nghiệp vụ đó trong bản sản phẩm được kiểm tra.**

### 10.5 Theo dõi thay đổi trong quá trình phát triển

Lịch sử Git có các mốc tạo frontend, chuyển ứng dụng về thư mục gốc, cập nhật trang chủ/báo cáo/chuyển kỳ và đổi giao diện màu xanh cùng metadata web. Đây là bằng chứng có quá trình chỉnh sửa mã qua các lần lưu phiên bản.

Chưa có đủ bằng chứng để từ các commit đó suy ra nhóm đã chia sprint, review chéo, chạy CI/CD hoặc hoàn thành toàn bộ nhiệm vụ theo bảng phân công.

## 11. Giai đoạn đối chiếu thiết kế và sản phẩm

Ở giai đoạn này, đặt các tài liệu cạnh nhau để kiểm tra cùng một chức năng có được mô tả và hiện thực nhất quán hay không.

### 11.1 Bảng liên kết xuyên suốt của bài

| Yêu cầu          | Use Case   | Thiết kế chi tiết đã có                               | Phần sản phẩm hiện tại                | Kết luận trong phạm vi nguồn đã đọc                               |
| ------------------ | ---------- | ----------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| UR-F01, SR-F04     | UC05       | Ảnh UC05; Activity–Sequence ghi chi kết hợp cảnh báo  | Nút Ghi giao dịch                        | Có phân tích/thiết kế; chưa có luồng nhập và lưu               |
| UR-F04, SR-F13–15 | UC08–UC09 | Bảng UC, ảnh ngân sách, cặp sơ đồ kết hợp ghi chi | Thanh ngân sách và số thông báo mẫu | Có thiết kế; phần giao diện hiện mới minh họa                     |
| UR-F01, SR-F08     | UC07       | Use Case, Activity và Sequence                             | Chưa thấy chức năng tương ứng       | Đã thiết kế; chưa xác nhận hiện thực                             |
| UR-F05, SR-F17     | UC11       | Use Case, Activity và Sequence                             | Mục Lời nhắc                            | Đã thiết kế; chưa có xử lý lịch nhắc                            |
| UR-F09, SR-F22     | UC16       | Bảng UC và cặp sơ đồ báo cáo                        | Trang reports với dữ liệu mẫu          | Hiện thực một phần giao diện/tổng hợp                              |
| UR-F10, SR-F01–02 | UC01       | Bảng UC, ảnh đăng ký/đăng nhập/2FA; Main UC         | Form đăng ký/đăng nhập               | Có giao diện; chưa có xác thực thật                                |
| UR-F07, SR-F20     | UC14       | Bảng UC nêu dashboard; ảnh UC14 bị lệch nội dung      | Trang chủ                                 | Có tổng quan mẫu; chưa đủ nội dung tài sản ròng trong yêu cầu |
| UR-F03             | UC17       | Bảng UC và ảnh gộp                                      | Chưa thấy chức năng so sánh thực sự | Thiếu SR liên quan; chưa xác nhận hiện thực                        |
| SR-F10, SR-F24–25 | UC18–UC20 | Bảng vận hành và ảnh gộp                              | Quản trị mô phỏng                      | Chưa có đồng bộ/sao lưu/khôi phục thật được xác nhận        |

### 11.2 Những điểm tài liệu cần thống nhất

Các điểm dưới đây được tìm thấy khi đọc nguồn, không phải thay đổi đã thực hiện vào sơ đồ.

| Vị trí                            | Nội dung quan sát                                                                                                              | Việc cần làm khi hoàn thiện bài                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| UC.docx                             | Không có UC02; UC17 chưa có SR tương ứng                                                                                  | Giữ đúng mã hiện có; bổ sung hoặc giải thích khoảng trống sau khi nhóm xác nhận    |
| UC03.png và UC04.png               | Ghi “xóa”, trong khi bảng UC ghi “ngừng sử dụng”                                                                        | Chốt nghiệp vụ là xóa hay vô hiệu hóa; phản ánh thống nhất vào dữ liệu và xử lý |
| UC08-09.png, UC10-11.png            | Actor ghi “Tour Guide”                                                                                                         | Đổi về tác nhân đúng của bài sau khi xác nhận                                          |
| UC07.png                            | Lặp “Chọn giao dịch”, quan hệ chưa rõ                                                                                    | Đối chiếu với mô tả và hai sơ đồ chi tiết để làm sạch hình                        |
| UC10-11.png                         | Nhánh dưới lặp tên quản lý khoản định kỳ                                                                              | Làm rõ phần quản lý khoản và phần nhận nhắc                                             |
| UC13.png                            | Nội dung là xem đề xuất khoản đăng ký định kỳ, trùng chủ đề UC12 và khác UC13 quy đổi ngoại tệ trong bảng | Tìm lại hoặc xuất lại đúng sơ đồ UC13                                                   |
| UC14.png                            | Nội dung là nhắc thanh toán khoản định kỳ, khác UC14 dashboard trong bảng                                              | Thay đúng hình hoặc sửa mã sau khi đối chiếu bản gốc                                   |
| Cặp file UC6-9                     | Tên file không khớp nhóm UC05 + UC09 trong Main UC                                                                           | Dùng đúng tên nghiệp vụ và thống nhất mã                                                |
| Activity ghi chi và bảng/Sequence | “Vượt” so với “đạt hoặc vượt”                                                                                        | Chốt điều kiện tại đúng ngưỡng                                                           |
| UC11 Sequence                       | Chưa tách rõ nhánh thành công/lỗi, thiếu tác nhân kích hoạt được nêu trong Main UC                               | Làm rõ luồng và các thành phần                                                             |
| UC07 Activity và Sequence          | Một số nhánh xác nhận/lỗi lưu chỉ có ở Activity                                                                        | Đồng bộ phạm vi hành vi giữa hai sơ đồ                                                   |
| README và trang chủ               | Ngưỡng 80%/100% so với đổi màu trên 70%/90%                                                                               | Thống nhất quy tắc; không coi đổi màu là đã có dịch vụ cảnh báo                    |

Các ảnh còn có quan hệ include/extend và đường nối cần được rà lại. Bản tổng hợp ghi nhận ý nghĩa nghiệp vụ đọc được, không chứng nhận toàn bộ ký hiệu UML đã chính xác.

## 12. Giai đoạn thiết kế kiểm thử và thẩm định

### 12.1 Kiểm thử lấy đầu vào từ đâu trong bài này

Các nhánh trong Activity và Sequence chính là nguồn để xác định trường hợp phải kiểm tra. Nếu sơ đồ đã thiết kế xử lý “không hợp lệ”, “không có dữ liệu”, “không đủ quyền” hoặc “lưu thất bại”, thì khi có phần hiện thực tương ứng phải có cách kiểm tra các nhánh đó.

Ví dụ UC16 có ba tình huống chính:

1. Khoảng thời gian sai: trả lỗi, yêu cầu chọn lại.
2. Khoảng thời gian đúng nhưng không có giao dịch: hiện trạng thái không có dữ liệu.
3. Khoảng thời gian đúng và có giao dịch: tính tổng và hiển thị báo cáo.

Như vậy, thiết kế kiểm thử không chỉ là thử bấm nút xem trang có mở hay không; nó còn kiểm tra các điều kiện đã cam kết trong thiết kế nghiệp vụ.

### 12.2 Những trường hợp kiểm tra suy ra từ thiết kế của nhóm

Bảng này được tổng hợp mới từ các sơ đồ để chỉ ra đầu ra cần có ở bước kiểm thử. Nó không phải bộ test đã được nhóm chạy và đạt.

| Nghiệp vụ         | Trường hợp cần kiểm tra                                     | Kết quả theo ý định thiết kế                                              |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Ghi chi             | Dữ liệu không hợp lệ                                        | Báo lỗi, không đi tiếp nhánh lưu thành công                             |
| Ghi chi/ngân sách | Dữ liệu hợp lệ và dưới ngưỡng                           | Ghi nhận và trả kết quả thành công                                        |
| Ghi chi/ngân sách | Bằng ngưỡng hoặc vượt ngưỡng                             | Xử lý theo quy tắc ngưỡng đã thống nhất; tạo/gửi cảnh báo khi thỏa |
| UC07                | Người dùng không có quyền hoặc giao dịch hết hiệu lực | Từ chối thao tác                                                              |
| UC07                | Dữ liệu điều chỉnh sai                                      | Báo lỗi, yêu cầu nhập lại                                                  |
| UC07                | Người dùng không xác nhận                                  | Dừng thao tác                                                                  |
| UC07                | Hủy hợp lệ                                                    | Ghi bút toán đảo, giữ liên kết giao dịch gốc                            |
| UC07                | Điều chỉnh hợp lệ                                           | Có phần đảo, giao dịch thay thế và các liên kết                        |
| UC07                | Lưu thất bại                                                  | Hoàn tác thay đổi liên quan theo thiết kế                                 |
| UC11                | Chưa tới giờ, khoản dừng hoặc đã gửi thành công       | Không thuộc danh sách phải gửi trong lần đó                              |
| UC11                | Khoản còn hoạt động và tới giờ, chưa gửi thành công  | Tạo, gửi và ghi kết quả nhắc                                               |
| UC11                | Gửi lỗi                                                        | Ghi nhận lỗi; cơ chế thử lại cần đặc tả trước khi chốt kết quả    |
| UC16                | Kỳ không hợp lệ                                              | Báo lỗi và yêu cầu chọn lại                                               |
| UC16                | Kỳ hợp lệ, dữ liệu rỗng                                    | Hiện thông báo không có dữ liệu                                           |
| UC16                | Kỳ hợp lệ, có giao dịch                                     | Tổng thu, tổng chi và chênh lệch đúng                                     |
| UC01                | Email đã tồn tại, tài khoản sai hoặc 2FA không hợp lệ  | Cần hoàn thiện đặc tả nhánh thất bại và kiểm tra theo đó            |

### 12.3 Trạng thái kiểm thử thực tế

Trong lần tổng hợp này đã đọc tài liệu, xem các ảnh sơ đồ và đối chiếu mã nguồn. Chưa chạy frontend, build, lint, API, cơ sở dữ liệu hoặc kiểm thử toàn bộ hệ thống. Chưa tìm thấy bằng chứng pipeline CI/CD và kết quả kiểm thử toàn đồ án trong bộ nguồn đã xác nhận.

Vì vậy, có thể ghi nhận “đã có cơ sở để thiết kế kiểm thử từ các sơ đồ”, chưa thể ghi nhận “đã kiểm thử đạt các nghiệp vụ trên”.

### 12.4 Khi phát hiện sai lệch thì quay lại bước nào

- Sai tên hoặc phạm vi chức năng: quay lại yêu cầu và bảng Use Case.
- Thiếu nhánh nghiệp vụ: bổ sung đặc tả và Activity.
- Chưa rõ phần nào chịu trách nhiệm: bổ sung Sequence và thiết kế thành phần.
- Không lưu được các quan hệ cần có: bổ sung thiết kế dữ liệu.
- Mã chưa đáp ứng thiết kế: bổ sung hoặc sửa phần hiện thực.
- Thiết kế đã thay đổi do nhóm thống nhất yêu cầu mới: cập nhật bảng yêu cầu, sơ đồ và tiêu chí kiểm thử liên quan.

Đây là cách dùng các kết quả của bài để hoàn thiện lẫn nhau, thay vì xem mỗi tài liệu là một bài làm độc lập.

## 13. Ví dụ nối toàn bộ quá trình bằng UC07

UC07 là ví dụ tiêu biểu vì bộ tài liệu đã có mô tả, Activity và Sequence, đồng thời nêu những ràng buộc dữ liệu cụ thể.

### Bước 1 Xác định nhu cầu

Người dùng cần hủy hoặc điều chỉnh một giao dịch đã ghi nhận. Bảng liên kết nhu cầu này với UR-F01 và SR-F08.

### Bước 2 Đặt thành Use Case

Tài liệu đặt tên UC07 “Hủy hoặc điều chỉnh giao dịch”, mô tả xác nhận thao tác, ghi bút toán đảo và liên kết giao dịch gốc.

Kết quả ở bước này là xác định được một mục tiêu nghiệp vụ và phạm vi của nó.

### Bước 3 Làm rõ quy trình bằng Activity

Activity bổ sung những điều bảng tóm tắt chưa trình bày hết: kiểm tra quyền, kiểm tra hiệu lực, phân biệt hủy với sửa, kiểm tra nội dung mới, xác nhận, lưu đồng thời và hoàn tác nếu lỗi.

Kết quả là biết đường đi của từng tình huống, không chỉ biết tên chức năng.

### Bước 4 Phân công trách nhiệm bằng Sequence

Sequence đặt người dùng, giao diện, bộ xử lý và Database vào cùng một trình tự trao đổi. Bộ xử lý lấy bản gốc và kiểm tra; Database nhận các thay đổi; giao diện nhận kết quả để hiển thị.

Kết quả là biết phần nào cần được lập trình để thực hiện từng hành vi.

### Bước 5 Rút ra nhu cầu thiết kế dữ liệu

Dữ liệu phải thể hiện được bản gốc, phần đảo, giao dịch thay thế nếu có và liên kết giữa chúng. Các thay đổi liên quan phải được lưu nhất quán theo ý định “lưu đồng thời”.

Bộ nguồn chưa có schema để xác nhận cách nhóm đã biến các yêu cầu này thành bảng và ràng buộc cụ thể.

### Bước 6 Đối chiếu phần hiện thực

Chưa thấy mã UC07 trong CNPM_524. Vì vậy, hiện có thể xác nhận phần phân tích và thiết kế, còn bước lập trình/tích hợp chưa được chứng minh trong repository này.

### Bước 7 Xác định kiểm thử cần có

Từ Activity suy ra các trường hợp: thiếu quyền, giao dịch không còn hiệu lực, dữ liệu sai, không xác nhận, hủy thành công, điều chỉnh thành công và lưu lỗi. Kết quả kiểm thử phải đối chiếu cả trạng thái dữ liệu, không chỉ thông báo trên giao diện.

Chuỗi liên kết của chính bài này là:

**UR-F01 / SR-F08 → UC07 → Activity UC07 → Sequence UC07 → yêu cầu liên kết và lưu dữ liệu → phần lập trình cần hiện thực → các trường hợp kiểm thử.**

## 14. Ví dụ nối thiết kế với sản phẩm bằng UC16

UC16 phù hợp để hiểu khoảng cách giữa bản thiết kế và bản giao diện đã lập trình.

| Bước                | Bằng chứng trong bài                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Nhu cầu              | Xem báo cáo theo UR-F09, SR-F22                                                                        |
| Use Case              | UC16: xem tổng thu, tổng chi và chênh lệch theo kỳ                                                 |
| Activity              | Chọn kỳ, kiểm tra, lấy dữ liệu, xử lý rỗng, tính tổng và hiển thị                          |
| Sequence              | Giao diện gửi yêu cầu; controller kiểm tra/tổng hợp; Database trả giao dịch                     |
| Giao diện            | Trang /reports có Tuần/Tháng, Thu nhập/Chi tiêu, tổng và biểu đồ                               |
| Mã xử lý hiện có | Cộng amount, tính difference, tỷ lệ và conic-gradient trên dữ liệu mẫu                          |
| Phần chưa nối      | Nguồn giao dịch thật, controller/API, khoảng thời gian tùy chọn và nhánh kiểm tra tương ứng |
| Kiểm thử cần có   | Đúng kỳ, đúng dữ liệu, đúng tổng, dữ liệu rỗng và kỳ không hợp lệ                      |

Kết quả của giai đoạn thiết kế là biết một báo cáo đầy đủ phải làm gì và các phần phối hợp ra sao. Kết quả hiện thực hiện tại mới đáp ứng một phần phía giao diện. Việc đặt hai kết quả cạnh nhau giúp xác định công việc tiếp theo cụ thể, thay vì đánh giá chung chung là “đã có trang báo cáo”.

## 15. Tổng kết các sản phẩm nhóm đã có theo giai đoạn

### Đã có nguồn để xác nhận

1. Đề tài, phạm vi chức năng và bảng phân công trong README.
2. Danh mục 19 Use Case có mã, actor và liên kết yêu cầu trong UC.docx.
3. Bộ 14 ảnh Use Case, trong đó có các ảnh cần sửa hoặc xuất lại.
4. Danh sách năm luồng nghiệp vụ ưu tiên cần thiết kế sâu.
5. Bốn Activity Diagram và bốn Sequence Diagram cho bốn luồng nghiệp vụ.
6. Các ý định thiết kế quan trọng: kiểm tra quyền, giữ lịch sử điều chỉnh, lưu đồng thời, kiểm tra kỳ, xử lý không có dữ liệu và lưu kết quả gửi nhắc.
7. Mã giao diện của các màn hình người dùng/quản trị và một số xử lý trên dữ liệu mẫu.
8. Lịch sử thay đổi mã nguồn bằng Git.

### Chưa có đủ nguồn để xác nhận trong bộ bài đang đọc

- Hồ sơ khảo sát, toàn văn SRS và bộ yêu cầu phi chức năng.
- Đặc tả đầy đủ từng Use Case, sơ đồ lớp, ERD, schema và từ điển dữ liệu.
- Cặp sơ đồ chi tiết đăng nhập 2FA được nêu trong Main UC.
- Thiết kế API đầy đủ và backend đã tích hợp với frontend này.
- Kết quả kiểm thử toàn đồ án, CI/CD và triển khai vận hành thật.
- Nhật ký thực hiện, thứ tự thời gian các giai đoạn và đóng góp thực tế của từng người ngoài bảng phân công.

Các mục chưa tìm thấy không có nghĩa chắc chắn nhóm chưa từng làm; chúng chỉ chưa nằm trong nguồn được cung cấp hoặc xác nhận ở đây.

## 16. Danh mục nguồn của bản tổng hợp

### Tài liệu phân tích

- [UC.docx — bảng Use Case, yêu cầu liên quan và Main UC](<C:/Users/anh/Downloads/Dự án CNPM CKI/Usecase&UML/UC.docx>)
- [Thư mục ảnh Use Case](<C:/Users/anh/Downloads/Dự án CNPM CKI/Usecase&UML>)

### Thiết kế hoạt động và tương tác

| Nghiệp vụ                               | Activity                                                                                         | Sequence                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Ghi khoản chi và cảnh báo ngân sách | [Ảnh hoạt động](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC6-9_Activity_Diagram.png>) | [Ảnh tương tác](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC6-9_sequenceDiagram.png>) |
| Hủy/điều chỉnh giao dịch UC07        | [Ảnh hoạt động](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC07_Activity Diagram.png>)  | [Ảnh tương tác](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC07_Sequence Diagram.png>) |
| Nhắc thanh toán UC11                    | [Ảnh hoạt động](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC11_ActivityDiagram.png>)   | [Ảnh tương tác](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC11_SequenceDiagram.png>)  |
| Báo cáo UC16                            | [Ảnh hoạt động](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC16_Activity Diagram.png>)  | [Ảnh tương tác](<C:/Users/anh/Downloads/Dự án CNPM CKI/Diagram/UC16_Sequent Diagram.png>)  |

### Phần hiện thực

- [README của đồ án](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/README.md)
- [Cấu hình công nghệ](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/package.json)
- [Trang chủ](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/page.tsx)
- [Báo cáo](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/reports/page.tsx)
- [Lịch sử](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/history/page.tsx)
- [Đăng ký](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/register/page.tsx)
- [Đăng nhập](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/login/page.tsx)
- [Hàm đọc phiên người dùng](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/lib/session.ts)
- [Quản trị](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/admin/page.tsx)
- [Điều hướng dùng chung](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/components/BottomNav.tsx)

Bộ PDF “Giữa kỳ -CNPM-VI.pdf” được kiểm tra là tài liệu ôn tập trắc nghiệm, không phải đề giao đồ án hay bằng chứng nhóm đã thực hiện các giai đoạn. Các bài thử nghiệm riêng và tài liệu của môn khác không được gộp thành kết quả của sản phẩm trong bản tổng hợp này.
