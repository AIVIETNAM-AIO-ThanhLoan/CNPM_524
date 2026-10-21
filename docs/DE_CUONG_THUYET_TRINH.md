# Tài liệu thuyết trình đầy đủ — Sản phẩm Chi Tiêu

Lưu ý: tài liệu này được soạn theo cách hiểu ban đầu là chuẩn bị kịch bản trình bày. Theo yêu cầu đã làm rõ, tài liệu cần dùng là [Tổng hợp quy trình thực hiện đồ án](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/docs/TONG_HOP_QUY_TRINH_DO_AN.md), dựa trên bộ Use Case và UML của nhóm.

Đối chiếu mã nguồn CNPM_524 ngày 16/10/2026. Tài liệu không giới hạn thời lượng; người trình bày tự chọn phần cần sử dụng. Đây là nội dung và lời nói để chuẩn bị bài báo cáo, chưa phải file PowerPoint.

## Cách sử dụng tài liệu

- Phần A là nội dung trình bày chính, có ý đưa lên slide, lời nói và giải thích cách làm.
- Phần B là kịch bản demo với thao tác và kết quả mong đợi.
- Phần C là kế hoạch kiểm thử để nhóm thực hiện trước buổi báo cáo.
- Phần D là câu hỏi phản biện và cách trả lời.
- Phần E là bảng nguồn để mở đúng mã khi cần chứng minh.

Các nhận xét chỉ áp dụng cho mã nguồn trong CNPM_524. Backend, tài liệu phân tích hoặc kết quả kiểm thử ở nơi khác chưa được kiểm tra. Những mục “đề xuất” là hướng làm tiếp, không phải công việc đã hoàn thành.

# A. Nội dung trình bày chính

## 1. Giới thiệu đề tài

**Ý đưa lên slide**

- Tên giao diện: Chi Tiêu.
- Tên đề tài trong README: Personal Wealth & Expense Tracker.
- Mục tiêu: hỗ trợ theo dõi thu chi, ngân sách và mục tiêu tài chính cá nhân.
- Phạm vi bản hiện tại: giao diện và các tương tác minh họa.

**Lời trình bày gợi ý**

“Kính chào thầy/cô và các bạn. Nhóm em xin trình bày sản phẩm Chi Tiêu, một ứng dụng quản lý tài chính cá nhân. Mục tiêu của sản phẩm là giúp người dùng theo dõi các khoản thu, khoản chi và xem tình hình sử dụng tiền theo từng khoảng thời gian.

Trong bài trình bày, nhóm em sẽ giới thiệu bài toán, những phần đã triển khai, cách tổ chức và xử lý trong chương trình, sau đó demo bản hiện tại. Cuối cùng, nhóm sẽ nêu những phần còn thiếu và hướng tích hợp tiếp theo.”

## 2. Bài toán mà sản phẩm hướng đến

**Ý đưa lên slide**

- Cần biết trong một kỳ đã thu và chi bao nhiêu.
- Cần biết khoản chi tập trung vào danh mục nào.
- Cần một nơi xem lại giao dịch và theo dõi ngân sách.

**Lời trình bày gợi ý**

“Bài toán nhóm đặt ra là làm sao giúp người dùng theo dõi tình hình thu chi một cách có hệ thống. Ví dụ, khi nhìn vào tổng chi trong tháng, người dùng còn cần biết tiền đã được dùng cho ăn uống, tiền nhà, đi lại hay học tập.

Vì vậy, giao diện được chia thành các màn hình có mục đích cụ thể. Trang chủ cung cấp cái nhìn tổng quan. Báo cáo thể hiện cơ cấu thu chi theo danh mục. Lịch sử là nơi dự kiến hiển thị từng giao dịch. Phần tài khoản là nơi phục vụ việc đăng nhập và quản lý thông tin người dùng.”

**Giới hạn của nhận định**

Đây là mô tả bài toán và mục tiêu sản phẩm. Chưa có dữ liệu khảo sát hay đo lường hiệu quả để khẳng định sản phẩm đã giúp người dùng tiết kiệm một tỷ lệ tiền cụ thể.

## 3. Yêu cầu và phạm vi sản phẩm

**Ý đưa lên slide**

| Nhóm yêu cầu trong README | Mục tiêu |
| --- | --- |
| Tài khoản, ví và danh mục | Tổ chức người dùng và nguồn tiền |
| Giao dịch và báo cáo | Ghi nhận, tổng hợp, xem lại thu chi |
| Đa tiền tệ | Quy đổi và lưu tỷ giá áp dụng |
| Ngân sách | Theo dõi hạn mức và cảnh báo |
| Khoản định kỳ | Theo dõi thanh toán và nhắc đến hạn |
| Mục tiêu tài chính | Theo dõi tiến độ tiết kiệm |

**Lời trình bày gợi ý**

“Trong định hướng ban đầu, hệ thống có các nhóm chức năng về tài khoản, ví, giao dịch, báo cáo, ngân sách và những tiện ích như quy đổi tiền tệ hay nhắc thanh toán. Tuy nhiên, mức độ triển khai của từng nhóm hiện chưa giống nhau.

Trong bản mã nguồn đang trình bày, phần rõ nhất là các trang giao diện, điều hướng và xử lý số liệu minh họa. Vì vậy, khi báo cáo kết quả, nhóm sẽ chỉ rõ chức năng nào đã có tương tác và chức năng nào mới có vị trí trên giao diện hoặc đang là yêu cầu dự kiến.”

**Cách diễn đạt trạng thái**

- “Có trong mã nguồn”: đã có trang, thành phần hoặc xử lý tương ứng; chưa mặc nhiên chứng minh chạy đúng trên mọi thiết bị.
- “Dữ liệu mẫu”: dữ liệu được khai báo trực tiếp trong chương trình.
- “Mô phỏng”: có phản hồi giao diện nhưng chưa thực hiện nghiệp vụ thật.
- “Dự kiến”: chưa có triển khai tương ứng trong phạm vi đã khảo sát.

## 4. Phân công công việc của nhóm

**Bảng phân công đang có trong README**

| Thành viên | Công việc được phân công | Bằng chứng cần bổ sung khi báo cáo đóng góp |
| --- | --- | --- |
| Anh | Giao diện, dashboard, ngân sách và biểu mẫu giao dịch | Màn hình, mã nguồn hoặc thay đổi cụ thể đã làm |
| Tín | API giao dịch, quy đổi tiền tệ và cảnh báo ngân sách | API, cách chạy, đầu vào/đầu ra và kết quả kiểm tra |
| Loan | Cơ sở dữ liệu sổ kép, xác thực, bảo mật và sao lưu | Thiết kế dữ liệu, mã triển khai, kịch bản kiểm tra |
| Linh | Kiểm thử sổ kép, API và tích hợp CI/CD | Test case, kết quả chạy, cấu hình và lần chạy pipeline |

**Lời trình bày gợi ý**

“Nhóm phân chia công việc theo các phần của sản phẩm: giao diện, API và nghiệp vụ, dữ liệu và xác thực, cuối cùng là kiểm thử và tích hợp. Bảng này thể hiện trách nhiệm theo tài liệu dự án. Khi trình bày đóng góp thực tế, mỗi thành viên sẽ gắn phần việc của mình với sản phẩm bàn giao cụ thể.”

Chưa có đủ bằng chứng để khẳng định từng thành viên đã hoàn thành toàn bộ nhiệm vụ. Không gán tên tác giả cho một file chỉ dựa vào bảng phân công.

## 5. Kết quả hiện tại của sản phẩm

**Ý đưa lên slide**

| Màn hình/hạng mục | Đã có trong mã nguồn | Phần còn giới hạn |
| --- | --- | --- |
| Trang chủ | Thu, chi, chênh lệch; chọn ngày/tháng; chuyển kỳ; thanh ngân sách | Dữ liệu mẫu, ngày khởi tạo cố định |
| Báo cáo | Chọn tuần/tháng, thu/chi; tính tổng, tỷ lệ; biểu đồ vòng | Hai bộ dữ liệu mẫu; nút kỳ trước/sau chưa xử lý |
| Lịch sử | Cấu trúc giao dịch, tính tổng, danh sách và trạng thái trống | Mảng dữ liệu hiện rỗng; chưa tìm kiếm/lọc thật |
| Đăng ký | Nhập thông tin, hiện/ẩn mật khẩu, kiểm tra dữ liệu | Chưa tạo tài khoản trên hệ thống |
| Đăng nhập | Nhập thông tin, hiện/ẩn mật khẩu, kiểm tra bỏ trống | Chưa xác thực; chưa tạo phiên |
| Hồ sơ | Trạng thái khách, liên kết đăng nhập/đăng ký, thông tin cài đặt | Chưa có giao diện người dùng đã đăng nhập; cài đặt chỉ hiển thị |
| Điều hướng | Thanh điều hướng dùng chung, đánh dấu trang đang mở | Nút QR chưa có xử lý |
| Quản trị | Bốn tab: tổng quan, tỷ giá, người dùng, sao lưu | Dữ liệu mẫu và các thao tác giả lập |
| Cấu hình web trên di động | Manifest, icon, metadata | Chưa xác nhận cài đặt hoặc hoạt động offline |

**Lời trình bày gợi ý**

“Nhóm đã xây dựng được các màn hình chính của ứng dụng và kết nối điều hướng giữa chúng. Một số phần có xử lý trực tiếp như chuyển kỳ trên trang chủ, chuyển chế độ báo cáo, tính tỷ lệ danh mục và kiểm tra dữ liệu form.

Dữ liệu hiện tại được dùng để minh họa hoạt động của giao diện. Các phần xác thực, lưu giao dịch, đồng bộ tỷ giá và sao lưu chưa kết nối với hệ thống xử lý thật trong bản mã nguồn này.”

## 6. Công nghệ và vai trò trong chương trình

**Ý đưa lên slide**

| Công nghệ | Khai báo trong package.json | Vai trò thể hiện trong dự án |
| --- | --- | --- |
| Next.js | 16.3.8 | Cấu trúc các trang, layout, điều hướng và metadata |
| React / React DOM | 19.2.8 | Thành phần giao diện và trạng thái tương tác |
| TypeScript | ^5 | Mô tả kiểu dữ liệu như giao dịch, danh mục và người dùng |
| Tailwind CSS | ^4 | Các lớp định dạng, đặc biệt ở trang quản trị |
| CSS riêng | Các file app/styles | Bố cục, màu, nút, biểu đồ và thanh điều hướng |
| Lucide React | ^1.52.0 | Icon cho điều hướng và chức năng |
| ESLint | ^9 | Lệnh kiểm tra mã được cấu hình trong dự án |

Các mục có dấu ^ là ràng buộc phiên bản trong package.json, không phải xác nhận phiên bản đang được cài trên máy.

**Lời trình bày gợi ý**

“Về công nghệ, dự án hiện sử dụng Next.js cùng React và TypeScript. Next.js tổ chức các trang trong thư mục app. React quản lý những phần thay đổi theo thao tác người dùng. TypeScript giúp mô tả rõ dữ liệu mà từng màn hình sử dụng.

Giao diện được định dạng bằng CSS riêng và các lớp Tailwind. Icon được lấy từ Lucide React. Nhóm cũng có cấu hình lệnh kiểm tra mã bằng ESLint, nhưng kết quả kiểm tra cần được báo cáo dựa trên lần chạy thực tế.”

**Nếu được hỏi tại sao dùng các công nghệ này**

Có thể giải thích lợi ích nhìn thấy ở cách triển khai: trang được chia rõ ràng, thanh điều hướng được tái sử dụng, kiểu dữ liệu có tên và các lựa chọn giao diện được quản lý bằng trạng thái. Lý do nhóm lựa chọn ban đầu chưa được ghi nhận đầy đủ; không tự nhận đã khảo sát hay benchmark nhiều công nghệ nếu chưa có tài liệu.

## 7. Cách tổ chức mã nguồn

**Sơ đồ thư mục để đưa lên slide**

```text
app/
  layout.tsx              Khung trang và metadata chung
  page.tsx                Trang chủ
  reports/page.tsx        Báo cáo
  history/page.tsx        Lịch sử giao dịch
  profile/page.tsx        Hồ sơ
  login/page.tsx          Đăng nhập
  register/page.tsx       Đăng ký
  admin/page.tsx          Quản trị
  components/             Thành phần giao diện dùng chung
  lib/                    Kiểu người dùng, hàm phiên và bảng màu
  styles/                 CSS cho từng nhóm màn hình
  globals.css             Kiểu giao diện chung
  manifest.ts             Cấu hình ứng dụng web
public/
  icon.svg                Biểu tượng ứng dụng
```

**Lời trình bày gợi ý**

“Chương trình được chia theo màn hình để dễ tìm và chỉnh sửa. Ví dụ, phần báo cáo nằm ở trang reports, còn đăng ký và đăng nhập có trang riêng. Những phần dùng lại, như thanh điều hướng, được tách thành thành phần chung.

Cách tổ chức này giúp khi cần thay đổi thanh điều hướng, nhóm sửa ở một nơi rồi các trang dùng thành phần đó cùng nhận thay đổi. Những màu dùng chung cũng được gom lại, còn CSS đặc thù của từng màn hình được để riêng.”

**Giải thích sâu hơn khi cần**

- BottomNav chứa đường dẫn Trang chủ, Báo cáo, Lịch sử và Tôi.
- Thành phần đọc đường dẫn hiện tại để đánh dấu mục đang chọn.
- ColorPair mô tả màu nền và màu chữ; colorAt chọn màu theo vị trí danh mục và lặp lại khi hết bảng màu.
- getCurrentUser là vị trí dự kiến đọc thông tin phiên; hiện trả về null.
- Tổ chức theo màn hình hiện tại chưa chứng minh hệ thống đã có kiến trúc nhiều dịch vụ hoặc đầy đủ các lớp backend.

## 8. Luồng dữ liệu và tương tác hiện tại

**Luồng đưa lên slide**

```text
Người dùng chọn chế độ hoặc tab
              ↓
React cập nhật trạng thái đang chọn
              ↓
Trang chọn bộ dữ liệu mẫu tương ứng
              ↓
Tính tổng, chênh lệch hoặc tỷ lệ
              ↓
Hiển thị số tiền, danh mục và biểu đồ
```

**Lời trình bày gợi ý**

“Hiện tại, xử lý chủ yếu nằm trong giao diện. Khi người dùng chọn một chế độ, chương trình cập nhật trạng thái, chọn dữ liệu tương ứng, tính toán rồi hiển thị lại. Ví dụ, khi chuyển báo cáo từ tháng sang tuần, chương trình chọn bộ dữ liệu tuần để tính tổng và tỷ lệ.

Trong luồng này chưa có bước gọi API để lấy hoặc lưu giao dịch. Vì vậy, thay đổi tab trên giao diện không có nghĩa là đang truy vấn cơ sở dữ liệu.”

**Trạng thái được dùng để làm gì?**

Trạng thái có thể hiểu là “lựa chọn hiện tại mà màn hình cần nhớ”. Trang chủ nhớ đang xem ngày hay tháng và kỳ nào; báo cáo nhớ tuần hay tháng và thu hay chi; form nhớ nội dung các ô nhập và có hiện mật khẩu hay không. Chưa có cơ chế lưu các lựa chọn này thành dữ liệu tài khoản trong bản hiện tại.

## 9. Trang chủ: xem tổng quan thu chi

**Ý đưa lên slide**

- Chọn xem theo tháng hoặc ngày.
- Chuyển kỳ bằng hai nút mũi tên.
- Hiển thị tổng thu, tổng chi và chênh lệch.
- Hiển thị tỷ lệ ngân sách mẫu khi xem tháng.

**Lời trình bày gợi ý**

“Trang chủ là nơi người dùng xem nhanh tình hình thu chi. Phía trên có lựa chọn tháng hoặc ngày. Khi chuyển kỳ, chương trình lấy dữ liệu tương ứng và cập nhật ba giá trị: thu, chi và còn lại.

Trong bản hiện tại, giá trị còn lại được tính bằng thu trừ chi của kỳ đang xem. Khi xem theo tháng, giao diện còn có thanh thể hiện tỷ lệ ngân sách đã sử dụng. Các số liệu ở đây là dữ liệu minh họa được khai báo trong mã nguồn.”

**Cách xử lý cụ thể**

1. Biến viewMode xác định đang xem tháng hay ngày.
2. Ngày được chuyển thành khóa YYYY-MM hoặc YYYY-MM-DD.
3. Chương trình tra bản ghi theo khóa trong monthRecords hoặc dayRecords.
4. Nếu không có bản ghi, chương trình dùng số 0.
5. Chênh lệch = thu − chi.
6. Số tiền được định dạng theo vi-VN và thêm ký hiệu đ.

**Số liệu mẫu để giải thích khi demo**

| Kỳ | Thu | Chi | Chênh lệch | Ngân sách hiển thị |
| --- | ---: | ---: | ---: | ---: |
| Tháng 10/2026 | 12.000.000đ | 7.450.000đ | 4.550.000đ | 62% |
| Tháng 9/2026 | 11.000.000đ | 8.200.000đ | 2.800.000đ | 84% |
| Ngày 13/10/2026 | 0đ | 350.000đ | −350.000đ | Không hiển thị thanh ngân sách |

**Điểm cần hiểu để trả lời chính xác**

- “Còn lại” hiện là chênh lệch thu chi trong kỳ, chưa phải số dư ví vì chưa xét số dư đầu kỳ.
- Phần trăm ngân sách được khai báo sẵn; chương trình chưa tính từ hạn mức ngân sách được lưu.
- Màu ngân sách: đến 70% dùng màu bình thường; trên 70% đến 90% dùng màu cảnh báo; trên 90% dùng màu báo động.
- Ngày khởi tạo đang cố định ở tháng 10/2026 và ngày 13/10/2026.
- Số thông báo chưa đọc là giá trị mẫu 3.
- Các nút Ghi giao dịch, QR, quy đổi, giá vàng, lời nhắc, tin nhắn và thông báo chưa có xử lý nghiệp vụ trong trang này. Ô tìm kiếm cũng chưa lọc dữ liệu.

## 10. Báo cáo: tổng hợp theo danh mục

**Ý đưa lên slide**

- Chọn báo cáo tuần hoặc tháng.
- Chọn xem thu nhập hoặc chi tiêu.
- Tính tổng, chênh lệch và tỷ lệ danh mục.
- Biểu diễn cơ cấu bằng biểu đồ vòng.

**Lời trình bày gợi ý**

“Màn hình báo cáo giúp người dùng xem cơ cấu thu chi. Nhóm bố trí hai lựa chọn độc lập: khoảng thời gian là tuần hoặc tháng, và loại dữ liệu là thu nhập hoặc chi tiêu.

Từ danh sách danh mục, chương trình cộng các khoản tiền để ra tổng. Sau đó lấy số tiền từng danh mục chia cho tổng để ra tỷ lệ. Tỷ lệ này vừa được hiển thị bằng số, vừa được dùng để tạo các phần màu trên biểu đồ vòng.”

**Cách xử lý cụ thể**

1. Chọn monthPeriod hoặc weekPeriod theo chế độ.
2. Hàm sumOf cộng amount của từng danh mục.
3. Tính totalIncome, totalExpense và difference.
4. Chọn danh sách thu hoặc chi theo tab.
5. Tính tỷ lệ = amount / total × 100; nếu tổng bằng 0 thì tỷ lệ là 0.
6. Cộng dồn tỷ lệ để xác định điểm bắt đầu và kết thúc của từng cung màu.
7. Dùng CSS conic-gradient tạo vòng màu; phần rỗng ở giữa chứa tổng tiền.
8. Danh sách dưới biểu đồ dùng cùng cách chọn màu để đối chiếu với từng cung.

**Ví dụ dữ liệu chi tháng 10/2026**

| Danh mục | Số tiền | Tỷ lệ làm tròn một chữ số |
| --- | ---: | ---: |
| Ăn uống | 3.200.000đ | 43,0% |
| Tiền nhà | 1.750.000đ | 23,5% |
| Đi lại | 1.500.000đ | 20,1% |
| Học tập | 1.000.000đ | 13,4% |
| Tổng | 7.450.000đ | 100,0% |

Thu tháng 10 gồm lương 10.000.000đ và thưởng 2.000.000đ. Bộ dữ liệu tuần có tổng chi 2.350.000đ, tổng thu 2.000.000đ và chênh lệch −350.000đ.

**Giới hạn**

Báo cáo hiện có hai bộ dữ liệu mẫu. Hai mũi tên kỳ trước và kỳ sau chưa được gắn xử lý, dù nút chuyển Tuần/Tháng đã có. Chưa có chức năng mở chi tiết một danh mục hay xuất báo cáo trong mã nguồn được khảo sát.

## 11. Lịch sử giao dịch

**Ý đưa lên slide**

- Mỗi giao dịch có mã, tiêu đề, thời gian, số tiền và icon.
- Số dương biểu diễn thu; số âm biểu diễn chi trong kiểu dữ liệu trang này.
- Có xử lý danh sách rỗng.

**Lời trình bày gợi ý**

“Màn hình lịch sử được chuẩn bị để hiển thị từng giao dịch. Mỗi giao dịch có các thông tin như nội dung, thời gian và số tiền. Chương trình dựa vào dấu của số tiền để tách thu và chi, sau đó cộng thành tổng.

Hiện danh sách giao dịch đang rỗng nên màn hình hiển thị thông báo chưa có giao dịch. Đây là một trạng thái đã được xử lý trong giao diện. Bước tiếp theo là kết nối màn hình này với dữ liệu giao dịch thực sự được lưu.”

**Cách tính**

- Tổng thu: lọc giao dịch có amount > 0 rồi cộng amount.
- Tổng chi: lọc giao dịch có amount < 0 rồi cộng giá trị tuyệt đối.
- Danh sách rỗng: hiện lời hướng dẫn thay vì một vùng trống không có giải thích.

**Lưu ý khi demo**

Trang chủ và báo cáo có dữ liệu mẫu độc lập, còn lịch sử rỗng. Không giải thích rằng các khoản đang thấy trên báo cáo đã được lưu vào lịch sử. Ô tìm kiếm, nút lọc và nhãn tháng trên trang lịch sử chưa tạo thành chức năng lọc theo kỳ hoàn chỉnh.

## 12. Đăng ký, đăng nhập và hồ sơ

**Ý đưa lên slide**

- Form đăng ký: họ tên, tài khoản, mật khẩu và xác nhận.
- Form đăng nhập: tài khoản và mật khẩu.
- Hiện/ẩn mật khẩu và thông báo lỗi nhập liệu.
- Hồ sơ hiện hiển thị trạng thái chưa đăng nhập.

**Lời trình bày gợi ý**

“Ở phần tài khoản, nhóm đã triển khai form và các bước kiểm tra dữ liệu nhập. Với đăng ký, chương trình kiểm tra thông tin bắt buộc, độ dài mật khẩu và việc xác nhận mật khẩu có trùng nhau hay không. Người dùng cũng có thể bật hoặc tắt hiển thị mật khẩu.

Hiện tại, khi form hợp lệ, chương trình chuyển sang trang tiếp theo. Phần này mới thể hiện luồng giao diện; chưa có API tạo tài khoản, kiểm tra mật khẩu hay tạo phiên đăng nhập.”

**Luồng đăng ký hiện tại**

```text
Bấm Đăng ký
    ↓
Thiếu họ tên, tài khoản hoặc mật khẩu? → Hiện lỗi
    ↓ Không
Mật khẩu dưới 6 ký tự? → Hiện lỗi
    ↓ Không
Xác nhận mật khẩu không trùng? → Hiện lỗi
    ↓ Không
Chuyển sang trang Đăng nhập
```

**Luồng đăng nhập hiện tại**

```text
Bấm Đăng nhập
    ↓
Thiếu tài khoản hoặc mật khẩu? → Hiện lỗi
    ↓ Không
Chuyển sang trang Hồ sơ
    ↓
Hàm đọc người dùng vẫn trả về null
    ↓
Hồ sơ tiếp tục hiển thị trạng thái chưa đăng nhập
```

**Phần chưa có**

- Chưa xác minh định dạng và quyền sở hữu email/số điện thoại.
- Chưa có lưu tài khoản, băm mật khẩu hoặc xác thực phía máy chủ.
- Chưa có tạo/hủy phiên đăng nhập hay phân quyền thật.
- Nút Google chưa có xử lý đăng nhập/đăng ký.
- Tiếng Việt và VND trong hồ sơ là thông tin hiển thị, chưa phải cài đặt có thể thay đổi.

Độ dài tối thiểu 6 ký tự là quy tắc form hiện tại; không dùng riêng quy tắc này để khẳng định hệ thống đã bảo mật.

## 13. Giao diện quản trị

**Ý đưa lên slide**

| Tab | Nội dung đang thể hiện |
| --- | --- |
| Tổng quan | Các chỉ số mẫu và trạng thái dịch vụ minh họa |
| Tỷ giá | Bảng tiền tệ và nút đồng bộ |
| Người dùng | Danh sách mẫu và vị trí các thao tác quản lý |
| Sao lưu | Bản sao lưu mẫu và vị trí các thao tác phục hồi |

**Lời trình bày gợi ý**

“Bên cạnh giao diện người dùng, nhóm có trang quản trị để thể hiện các nhóm chức năng vận hành dự kiến. Người xem có thể chuyển giữa các tab tổng quan, tỷ giá, người dùng và sao lưu.

Trong bản hiện tại, các dữ liệu này là dữ liệu minh họa. Nút đồng bộ tỷ giá và tạo bản sao lưu có trạng thái đang xử lý rồi hiện thông báo, nhưng chưa gọi dịch vụ bên ngoài hoặc tạo bản sao lưu thật.”

**Giải thích cách mô phỏng**

- Biến activeTab quyết định phần nội dung nào đang được hiển thị.
- Khi bấm đồng bộ, syncingRate được đặt thành true; sau 1,5 giây được đặt lại false và hiện thông báo.
- Khi bấm sao lưu, backupRunning được đặt thành true; sau 2 giây được đặt lại false và hiện thông báo.
- Trong lúc chờ, nút tương ứng bị vô hiệu hóa.
- Các mốc thời gian trên là thời gian chờ được đặt trong mã, không phải số đo hiệu năng.

Các dòng “Healthy (42ms)”, PostgreSQL, 2FA, tên file sao lưu và ExchangeRate-API trên giao diện không chứng minh backend tương ứng đang hoạt động. Chưa có cơ chế kiểm tra quyền quản trị trong mã nguồn đã khảo sát.

## 14. Thiết kế giao diện và cấu hình thiết bị di động

**Ý đưa lên slide**

- Các trang người dùng có bố cục và thanh điều hướng chung.
- Màu sắc phân biệt thu, chi và danh mục.
- Có biểu tượng, tên ứng dụng và manifest.
- Cần kiểm thử thêm trên thiết bị thật.

**Lời trình bày gợi ý**

“Về giao diện, các màn hình người dùng dùng chung cấu trúc trang và thanh điều hướng ở phía dưới. Trang đang mở được đánh dấu để người dùng biết mình đang ở đâu. Các khoản thu, chi và danh mục được phân biệt bằng màu và icon.

Dự án cũng có manifest, biểu tượng và metadata để cấu hình cách ứng dụng xuất hiện trên thiết bị di động. Tuy nhiên, phần này cần được kiểm thử trên thiết bị thật, và chưa có cơ chế offline trong mã nguồn được khảo sát.”

**Chi tiết có thể dùng để giải thích cách làm**

- Thanh điều hướng được cố định phía dưới; CSS có cộng vùng an toàn ở đáy thiết bị.
- Trang có khoảng trống phía dưới để dành chỗ cho thanh điều hướng.
- Các trang người dùng sử dụng tông xanh trong CSS hiện tại.
- Có aria-label trên nhiều nút chỉ dùng icon, ví dụ chuyển kỳ hoặc quét QR; chưa có kết quả kiểm thử khả năng tiếp cận toàn bộ ứng dụng.
- Manifest khai báo tên Chi Tiêu, ngôn ngữ vi, trang bắt đầu / và chế độ hiển thị standalone.

Manifest và metadata chưa đồng nghĩa với khả năng lưu dữ liệu hay sử dụng offline. Một số comment và metadata màu còn giữ giá trị màu cũ; cần xem giao diện chạy thực tế trước khi khẳng định mọi màn hình đã đồng nhất.

## 15. Cách phát triển thể hiện qua mã nguồn và lịch sử Git

**Ý đưa lên slide**

- Tạo ứng dụng giao diện.
- Điều chỉnh cấu trúc đặt ứng dụng ở gốc repository.
- Bổ sung giao diện trang chủ, báo cáo và chuyển ngày/tháng.
- Điều chỉnh màu và metadata ứng dụng web.

**Lời trình bày gợi ý**

“Qua lịch sử thay đổi hiện có, có thể thấy giao diện đã được bổ sung và điều chỉnh theo từng bước. Các thay đổi gần đây tập trung vào cấu trúc thư mục, trang chủ, báo cáo, điều hướng thời gian và màu giao diện.

Về cách tổ chức hiện tại, nhóm tách các màn hình, tái sử dụng phần giao diện chung, rồi bổ sung các xử lý tương tác cho từng trang. Khi tích hợp backend, nhóm cần tiếp tục thống nhất dữ liệu đầu vào và kết quả trả về giữa các phần.”

**Bằng chứng Git đang thấy**

| Commit | Nội dung tiêu đề commit |
| --- | --- |
| 50cc835 | Add frontend app for personal expense tracker |
| 5d7e878 | Move app from cnpm/ to repository root |
| 8ceacf5 | Update home and reports UI, add day and month navigation |
| be48cb6 | Switch to light blue theme and add mobile web app metadata |

Đây là các mốc chọn lọc theo tiêu đề commit, không phải lịch sử đầy đủ hay bằng chứng về người thực hiện từng phần. Chưa có tài liệu xác nhận nhóm đã áp dụng Scrum, chia sprint, review chéo hoặc chạy CI/CD; chỉ bổ sung các nội dung đó khi nhóm có bằng chứng.

## 16. Đánh giá kết quả và phần cần hoàn thiện

**Ý đưa lên slide**

| Kết quả hiện tại | Phần cần tiếp tục |
| --- | --- |
| Có các màn hình chính và điều hướng | Tích hợp một luồng nghiệp vụ xuyên suốt |
| Có tính toán tổng và tỷ lệ trên dữ liệu mẫu | Đọc dữ liệu đã lưu từ cùng nguồn |
| Có kiểm tra form phía giao diện | Kiểm tra và xác thực phía máy chủ |
| Có trang quản trị mô phỏng | Kết nối dịch vụ và kiểm soát quyền |
| Có cấu hình web cho di động | Kiểm tra thiết bị và nhu cầu offline thực tế |

**Lời trình bày gợi ý**

“Kết quả hiện tại giúp nhóm thể hiện cấu trúc màn hình và cách người dùng tương tác với sản phẩm. Các phép tổng hợp và tỷ lệ đã có xử lý trên dữ liệu mẫu, và các form đã có kiểm tra nhập liệu cơ bản.

Phần cần hoàn thiện tiếp theo là đưa các màn hình vào cùng một luồng dữ liệu thật. Khi người dùng ghi một giao dịch, giao dịch đó cần được lưu, xuất hiện trong lịch sử và cập nhật đúng lên trang chủ cũng như báo cáo.”

**Những điểm chưa thống nhất cần biết**

1. README còn ghi trạng thái phân tích và thiết kế, trong khi mã giao diện đã có triển khai.
2. README nêu ngưỡng cảnh báo ngân sách 80% và 100%; trang chủ hiện đổi màu ở mức vượt 70% và 90%. Hai quy tắc này chưa được thống nhất và chưa có dịch vụ gửi cảnh báo.
3. Dữ liệu trang chủ và báo cáo được khai báo riêng; lịch sử đang rỗng.
4. Tỷ lệ ngân sách và số thông báo là giá trị mẫu.
5. Đăng nhập hợp lệ về mặt bỏ trống vẫn dẫn đến hồ sơ chưa đăng nhập.

Đây là các điểm quan sát từ mã nguồn; đề cương không thay đổi chương trình để che đi những giới hạn này.

## 17. Hướng hoàn thiện và tiêu chí hoàn thành

Đây là kế hoạch đề xuất để nhóm thảo luận, chưa phải tiến độ đã cam kết.

| Ưu tiên | Công việc | Dấu hiệu có thể kiểm chứng là đã hoàn thành |
| --- | --- | --- |
| 1 | Xác thực và phiên đăng nhập | Tài khoản hợp lệ đăng nhập được; sai mật khẩu bị từ chối; đăng xuất hủy phiên |
| 2 | Ghi giao dịch và lưu dữ liệu | Giao dịch hợp lệ được lưu; dữ liệu không hợp lệ bị từ chối; tải lại vẫn còn |
| 3 | Đồng bộ các màn hình | Một giao dịch mới xuất hiện đúng trong lịch sử, tổng quan và báo cáo |
| 4 | Ngân sách | Có hạn mức thật, công thức tỷ lệ rõ và ngưỡng được thống nhất |
| 5 | Quản trị | Người không có quyền bị chặn; thao tác trả kết quả từ xử lý thật |
| 6 | Kiểm thử và đóng gói demo | Có kết quả kiểm tra được ghi lại và chạy được trên máy trình chiếu |

**Lời trình bày gợi ý**

“Hướng tiếp theo nhóm đề xuất là ưu tiên luồng sử dụng cốt lõi. Trước hết là xác thực người dùng và lưu được giao dịch. Sau đó, các màn hình cần cùng đọc dữ liệu đó để bảo đảm số liệu thống nhất. Khi luồng cơ bản đã ổn định, nhóm tiếp tục tích hợp ngân sách và các chức năng mở rộng theo yêu cầu đã thống nhất.”

Không đưa ngày hoàn thành hoặc tỷ lệ phần trăm tiến độ nếu nhóm chưa xác nhận.

## 18. Lời kết

“Qua phần trình bày, nhóm em đã giới thiệu mục tiêu của sản phẩm Chi Tiêu, các màn hình hiện có và cách chương trình xử lý tương tác, tổng hợp số tiền và biểu diễn báo cáo.

Bản hiện tại đã có phần giao diện và các xử lý minh họa, còn phần xác thực, lưu trữ và tích hợp nghiệp vụ cần tiếp tục hoàn thiện. Nhóm đề xuất tập trung vào luồng đăng nhập, ghi giao dịch và xem lại dữ liệu để tạo thành một chức năng sử dụng xuyên suốt. Nhóm em xin cảm ơn thầy/cô và các bạn đã theo dõi.”

# B. Kịch bản demo chi tiết

Kết quả dưới đây là kết quả mong đợi suy ra từ mã nguồn, CHƯA ĐƯỢC XÁC NHẬN bằng chạy trình duyệt trong lần chuẩn bị tài liệu này.

## B1. Chuẩn bị trước khi demo

1. Cài các gói dự án và chạy ứng dụng theo hướng dẫn README. Các lệnh dự án là npm install và npm run dev.
2. Dùng địa chỉ mà ứng dụng thực tế thông báo; README hướng dẫn mặc định http://localhost:3000.
3. Mở trước các trang cần dùng: trang chủ, báo cáo, lịch sử, hồ sơ và đăng ký.
4. Tự chạy qua toàn bộ kịch bản một lần, gồm cả thao tác quay lại trạng thái ban đầu.
5. Chuẩn bị ảnh chụp hoặc video từ chính bản đã chạy nếu cần phương án dự phòng. Hiện CHƯA CÓ ảnh/video demo được tạo trong lần soạn tài liệu này.
6. Đóng dữ liệu cá nhân không liên quan trên màn hình trình chiếu.

Nếu ứng dụng chưa chạy được, mô tả demo bằng mã nguồn và ảnh đã có, đồng thời nói rõ chưa trình diễn trực tiếp. Không ghi trạng thái “đã kiểm thử đạt” chỉ vì đã đọc code.

## B2. Mở đầu demo

**Lời nói:**

“Sau đây nhóm em sẽ demo các tương tác hiện có. Các số liệu tài chính đang là dữ liệu mẫu, dùng để minh họa cách giao diện chọn kỳ, tổng hợp và hiển thị.”

## B3. Trang chủ

| Bước | Thao tác | Kết quả mong đợi | Lời giải thích |
| --- | --- | --- | --- |
| 1 | Mở mới trang chủ | Tháng 10/2026; thu 12 triệu; chi 7,45 triệu; còn lại 4,55 triệu; ngân sách 62% | Đây là bản ghi mẫu của tháng 10 |
| 2 | Bấm Tháng trước | Tháng 9/2026; thu 11 triệu; chi 8,2 triệu; còn lại 2,8 triệu; ngân sách 84% | Lựa chọn tháng đổi và dữ liệu được tra theo khóa tháng |
| 3 | Bấm Tháng trước lần nữa | Tháng 8/2026 với các giá trị 0 | Bộ dữ liệu mẫu không có bản ghi tháng này |
| 4 | Bấm Tháng sau hai lần | Quay về tháng 10/2026 | Kiểm tra thao tác quay lại |
| 5 | Chọn Ngày | 13/10/2026; thu 0; chi 350.000đ; chênh lệch −350.000đ | Chuyển sang bộ dữ liệu ngày |
| 6 | Bấm Ngày sau | 14/10/2026, các giá trị 0 và thông báo chưa có giao dịch | Minh họa trường hợp chưa có dữ liệu mẫu |
| 7 | Bấm Ngày trước rồi chọn Tháng | Quay lại các lựa chọn trước đó trong lần mở trang | Hai lựa chọn ngày và tháng được giữ riêng trong trạng thái của trang |

Không diễn giải số 0 ở kỳ không có bản ghi là kết quả xác minh tài khoản thật không phát sinh giao dịch.

## B4. Báo cáo

| Bước | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Chọn Báo cáo ở thanh điều hướng | Mặc định tháng và tab Chi tiêu; tổng chi 7.450.000đ |
| 2 | Chỉ vào danh mục Ăn uống | 3.200.000đ, khoảng 43,0%; màu đối chiếu với biểu đồ |
| 3 | Chọn Thu nhập | Tổng thu 12.000.000đ; Lương khoảng 83,3%, Thưởng khoảng 16,7% |
| 4 | Chọn Tuần | Tổng thu 2.000.000đ, tổng chi 2.350.000đ, chênh lệch −350.000đ |
| 5 | Chọn Chi tiêu | Các khoản 900.000đ, 600.000đ, 550.000đ và 300.000đ; tổng 2.350.000đ |
| 6 | Chọn Tháng | Quay về danh mục chi tháng 10/2026 |

**Lời nói:**

“Các số trên biểu đồ được tính từ danh sách danh mục. Khi em đổi tab hoặc chế độ, danh sách đầu vào thay đổi nên tổng và tỷ lệ cũng thay đổi. Trong bản này chưa có bước lấy dữ liệu từ máy chủ.”

Không bấm mũi tên kỳ trước/sau để chứng minh chức năng chuyển kỳ báo cáo, vì hai nút này chưa có xử lý.

## B5. Lịch sử và hồ sơ

1. Mở Lịch sử: dự kiến thấy tổng thu 0đ, tổng chi 0đ và thông báo “Chưa có giao dịch nào”.
2. Giải thích danh sách ở trang này hiện rỗng; các số ở trang chủ và báo cáo chưa được lấy từ cùng danh sách.
3. Mở Tôi: dự kiến thấy trạng thái chưa đăng nhập, liên kết đăng nhập/đăng ký, ngôn ngữ Tiếng Việt và tiền tệ VND.
4. Mở Tạo tài khoản để chuyển sang phần kiểm tra form.

## B6. Đăng ký

Chỉ dùng thông tin giả cho demo. Các giá trị dưới đây là dữ liệu thử, không phải tài khoản thật.

| Bước | Dữ liệu/thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Bấm đăng ký khi các trường rỗng | Thông báo yêu cầu nhập đầy đủ thông tin |
| 2 | Họ tên: Người dùng demo; tài khoản: demo@example.com; mật khẩu và xác nhận: abc | Thông báo mật khẩu phải có ít nhất 6 ký tự |
| 3 | Mật khẩu: Demo123!; xác nhận: Demo456! | Thông báo mật khẩu xác nhận không khớp |
| 4 | Bấm icon mắt | Nội dung mật khẩu và xác nhận hiện/ẩn theo trạng thái chung |
| 5 | Đổi cả hai trường thành Demo123! rồi gửi | Chuyển sang trang đăng nhập; chưa có tài khoản được lưu |

**Lời nói:**

“Ví dụ này thể hiện thứ tự kiểm tra dữ liệu trên giao diện. Khi có lỗi, chương trình dừng ở bước tương ứng và hiện thông báo. Khi các kiểm tra đều qua, trang chuyển sang đăng nhập. Phần tạo tài khoản thật sẽ cần được nối với backend.”

## B7. Đăng nhập

1. Gửi form rỗng: dự kiến hiện yêu cầu nhập tài khoản và mật khẩu.
2. Nhập demo@example.com và Demo123! rồi gửi: dự kiến chuyển sang Hồ sơ.
3. Nói rõ Hồ sơ vẫn báo chưa đăng nhập vì getCurrentUser hiện trả về null.

**Lời nói:**

“Ở đây việc chuyển trang mới thể hiện luồng giao diện. Ứng dụng chưa xác thực mật khẩu và chưa tạo phiên, nên màn hình hồ sơ vẫn ở trạng thái khách.”

Không giới thiệu bước 2 là “đăng nhập thành công”.

## B8. Quản trị — phần demo tùy chọn

Chỉ dùng khi cần giới thiệu phạm vi giao diện quản trị.

1. Mở đường dẫn /admin.
2. Chuyển qua các tab để minh họa bố cục chức năng.
3. Nếu bấm đồng bộ, nói trước rằng nút đang mô phỏng bằng khoảng chờ 1,5 giây.
4. Nếu bấm tạo bản sao lưu, nói trước rằng khoảng chờ 2 giây và thông báo chưa tạo file thật.

Không sử dụng các chỉ số, tốc độ, số người dùng hoặc dung lượng sao lưu mẫu làm kết quả vận hành của nhóm.

## B9. Kết thúc demo

“Qua phần demo, nhóm đã trình bày các thao tác lựa chọn trên giao diện, cách hiển thị số liệu và kiểm tra form. Để hoàn thiện nghiệp vụ, bước tiếp theo là kết nối các màn hình với dữ liệu và phiên đăng nhập thật.”

# C. Kiểm thử và chuẩn bị minh chứng

## C1. Trạng thái đã kiểm tra khi soạn tài liệu

| Nội dung | Trạng thái |
| --- | --- |
| Đọc các trang chính, dữ liệu mẫu và xử lý sự kiện | ĐÃ ĐỐI CHIẾU MÃ NGUỒN |
| Kiểm tra phép tính trong các ví dụ của tài liệu | Có đối chiếu số liệu mẫu; không thay thế kiểm thử ứng dụng |
| Cài thư viện, chạy build và lint | CHƯA CHẠY |
| Chạy ứng dụng và kiểm tra trình duyệt | CHƯA CHẠY |
| Kiểm thử điện thoại, cài đặt và offline | CHƯA CHẠY |
| API, cơ sở dữ liệu và các phần ở repo khác | CHƯA CÓ BẰNG CHỨNG TRONG PHẠM VI NÀY |
| Bộ kiểm thử tự động nghiệp vụ | CHƯA THẤY TRONG CÁC FILE ĐÃ KHẢO SÁT |

## C2. Bảng test case nhóm có thể dùng

Đây là danh sách kiểm tra đề xuất. Chỉ đổi trạng thái sau khi thực hiện và ghi nhận kết quả thực tế.

| Mã | Trường hợp | Kết quả mong đợi | Thực tế hiện ghi nhận |
| --- | --- | --- | --- |
| TC01 | Mở trang chủ | Hiển thị tháng 10 và số liệu mẫu tương ứng | CHƯA CHẠY |
| TC02 | Tháng 10 → tháng 9 → tháng 10 | Nhãn kỳ và số liệu đổi đúng, quay lại đúng | CHƯA CHẠY |
| TC03 | Chọn kỳ chưa có bản ghi | Hiển thị số 0, không lỗi trang | CHƯA CHẠY |
| TC04 | Ngày 13 → ngày 14 → ngày 13 | Có dữ liệu → trạng thái trống → có dữ liệu | CHƯA CHẠY |
| TC05 | Báo cáo Chi tiêu → Thu nhập → Chi tiêu | Tổng, danh mục và biểu đồ cùng đổi | CHƯA CHẠY |
| TC06 | Báo cáo Tháng → Tuần → Tháng | Tổng và kỳ đúng với từng bộ dữ liệu mẫu | CHƯA CHẠY |
| TC07 | Mở Lịch sử khi danh sách rỗng | Tổng bằng 0 và hiện lời hướng dẫn | CHƯA CHẠY |
| TC08 | Đăng ký thiếu trường bắt buộc | Báo lỗi, không chuyển trang | CHƯA CHẠY |
| TC09 | Đăng ký mật khẩu dưới 6 ký tự | Báo lỗi độ dài | CHƯA CHẠY |
| TC10 | Xác nhận mật khẩu không trùng | Báo lỗi xác nhận | CHƯA CHẠY |
| TC11 | Hiện mật khẩu rồi ẩn lại | Hai trạng thái hiển thị đổi đúng | CHƯA CHẠY |
| TC12 | Đăng ký qua kiểm tra form | Chuyển sang đăng nhập; không coi là đã lưu tài khoản | CHƯA CHẠY |
| TC13 | Đăng nhập với các trường rỗng | Báo lỗi | CHƯA CHẠY |
| TC14 | Đăng nhập có dữ liệu rồi xem hồ sơ | Chuyển trang nhưng vẫn là khách, đúng giới hạn hiện tại | CHƯA CHẠY |
| TC15 | Điều hướng đủ bốn mục rồi quay lại | Đường dẫn và mục được đánh dấu đúng | CHƯA CHẠY |
| TC16 | Chuyển qua bốn tab quản trị | Hiện đúng phần nội dung đang chọn | CHƯA CHẠY |
| TC17 | Bấm nút mô phỏng đồng bộ/sao lưu | Nút chờ, bị vô hiệu hóa rồi trở lại bình thường | CHƯA CHẠY |
| TC18 | Xem ở kích thước điện thoại và máy chiếu | Nội dung đọc được, không bị thanh điều hướng che khuất | CHƯA CHẠY |

Khi ghi kết quả, bổ sung thiết bị/trình duyệt, ngày chạy, ảnh hoặc video và lỗi gặp phải. Test case cho bản mô phỏng không chứng minh xác thực, lưu dữ liệu hay sao lưu thật đã hoạt động.

## C3. Kiểm tra mã và bản build

Dự án có các lệnh npm run lint và npm run build. Chạy và ghi lại kết quả trước khi báo cáo. Nếu build hoặc lint lỗi, lưu thông báo lỗi và cách xử lý thực tế. Build thành công chỉ là một loại minh chứng; các thao tác trên giao diện vẫn cần được thử riêng.

## C4. Bảng đóng góp thực tế để nhóm tự hoàn thiện

| Thành viên | Sản phẩm bàn giao thực tế | Bằng chứng | Kết quả kiểm tra |
| --- | --- | --- | --- |
| Anh | CHƯA XÁC NHẬN CHI TIẾT | CHƯA ĐIỀN | CHƯA ĐIỀN |
| Tín | CHƯA XÁC NHẬN CHI TIẾT | CHƯA ĐIỀN | CHƯA ĐIỀN |
| Loan | CHƯA XÁC NHẬN CHI TIẾT | CHƯA ĐIỀN | CHƯA ĐIỀN |
| Linh | CHƯA XÁC NHẬN CHI TIẾT | CHƯA ĐIỀN | CHƯA ĐIỀN |

Nếu đã có tài liệu yêu cầu, use case, sơ đồ dữ liệu hoặc API ở nơi khác, bổ sung đúng phiên bản và chỉ rõ phần nào đã được hiện thực hóa. Trong bản repository đang kiểm tra chưa có đủ các tài liệu đó để mô tả thành kết quả hoàn tất.

# D. Câu hỏi phản biện và câu trả lời gợi ý

## 1. Nhóm đã làm được gì cụ thể?

“Trong bản hiện tại, nhóm có các màn hình người dùng và quản trị, điều hướng dùng chung, thao tác chuyển kỳ ở trang chủ, chuyển chế độ báo cáo, tính tổng và tỷ lệ, cùng kiểm tra dữ liệu form. Dữ liệu đang là mẫu và phần backend chưa được tích hợp trong bản mã nguồn này.”

Có thể mở bảng kết quả ở mục A5 để trả lời từng phần.

## 2. Sản phẩm đã dùng thực tế được chưa?

“Bản hiện tại phù hợp để trình diễn giao diện và một số tương tác. Để dùng như ứng dụng quản lý thu chi thực tế, cần hoàn thiện xác thực, lưu giao dịch và đồng bộ dữ liệu giữa các màn hình.”

## 3. Dữ liệu đang lưu ở đâu? Tải lại trang có mất không?

“Các số liệu minh họa đang nằm trực tiếp trong mã nguồn. Chúng không phải giao dịch do người dùng nhập và lưu. Trang chưa có luồng tạo giao dịch, nên chưa có dữ liệu nhập để kiểm chứng khả năng giữ lại sau khi tải lại. Các trạng thái tương tác không có cơ chế lưu bền được triển khai ở đây.”

## 4. Có database chưa? Đang dùng PostgreSQL đúng không?

“Trong repository đang trình bày chưa thấy kết nối cơ sở dữ liệu. PostgreSQL xuất hiện trong nội dung mô phỏng trên trang quản trị, nên riêng nhãn đó chưa chứng minh cơ sở dữ liệu đã được triển khai.”

Nếu thành viên có backend riêng, bổ sung câu trả lời bằng bằng chứng từ phần đó.

## 5. API nằm ở đâu?

“Trong mã frontend đã kiểm tra chưa có các lệnh gọi API để xử lý xác thực hay giao dịch. Giao diện hiện lấy dữ liệu từ các giá trị được khai báo trực tiếp. Phần API nếu ở repository khác cần được giới thiệu riêng cùng trạng thái tích hợp.”

## 6. Chương trình có phải microservices không?

“Bản mã nguồn đang trình bày là ứng dụng giao diện Next.js. Những dòng tên service trên màn hình quản trị là nội dung mô phỏng; chưa đủ bằng chứng để nói các dịch vụ độc lập đã chạy và giao tiếp với nhau.”

## 7. Đã triển khai sổ cái kép chưa?

“README có đề cập định hướng sổ cái kép, nhưng trong bản hiện tại chưa thấy logic ghi bút toán kép. Phép tính thu trừ chi đang dùng trên giao diện chỉ là phép tổng hợp và chưa chứng minh đã có hệ thống sổ kép.”

## 8. Vì sao trang chủ có số tiền mà lịch sử lại trống?

“Vì các trang hiện dùng những bộ dữ liệu riêng để minh họa. Trang chủ có các bản ghi tổng hợp mẫu, còn danh sách lịch sử đang rỗng. Việc cho các trang cùng đọc một nguồn giao dịch là phần cần tích hợp tiếp.”

## 9. Số ‘còn lại’ có phải số dư tài khoản không?

“Hiện đây là tổng thu trừ tổng chi trong kỳ đang chọn. Chương trình chưa cộng số dư đầu kỳ hay đọc số dư ví, nên cần hiểu là chênh lệch thu chi trong kỳ.”

## 10. Tỷ lệ ngân sách 62% được tính như thế nào?

“Trong bản hiện tại, 62% là dữ liệu mẫu được khai báo sẵn, chưa được tính từ một hạn mức lưu trong cơ sở dữ liệu. Giao diện dùng giá trị đó để hiển thị độ dài và màu thanh ngân sách.”

## 11. Cảnh báo ngân sách dùng ngưỡng nào?

“README nêu 80% và 100%, trong khi phần đổi màu hiện tại dùng điều kiện vượt 70% và 90%. Nhóm cần thống nhất quy tắc trước khi triển khai nghiệp vụ. Hiện chưa có dịch vụ gửi cảnh báo; đang có đổi màu giao diện.”

## 12. Biểu đồ là ảnh hay được tính?

“Biểu đồ được tạo từ dữ liệu danh mục. Chương trình tính tổng, chia số tiền từng danh mục cho tổng, rồi tạo các cung màu bằng CSS. Khi đổi bộ dữ liệu, tỷ lệ và màu hiển thị được dựng lại.”

## 13. Nếu không có khoản thu hoặc chi thì sao?

“Phần tính tỷ lệ báo cáo có nhánh xử lý tổng bằng 0 để tránh chia cho 0. Trang lịch sử cũng có trạng thái danh sách rỗng. Đó là các xử lý có trong mã; việc kiểm tra hiển thị thực tế từng trường hợp vẫn cần được thực hiện.”

## 14. Đăng ký hợp lệ có tạo tài khoản thật không?

“Chưa. Form hiện kiểm tra dữ liệu rồi chuyển sang trang đăng nhập. Việc lưu tài khoản và xử lý thông tin xác thực chưa có trong bản này.”

## 15. Vì sao đăng nhập rồi vẫn báo chưa đăng nhập?

“Vì form hiện chỉ kiểm tra bỏ trống rồi chuyển trang. Hàm đọc người dùng đang luôn trả về null, nên trang hồ sơ vẫn hiển thị trạng thái khách. Cần tích hợp xác thực và phiên để hoàn thiện luồng này.”

## 16. Đã có bảo mật và phân quyền chưa?

“Chưa có bằng chứng triển khai xác thực và phân quyền thật trong repository hiện tại. Kiểm tra form chỉ giúp phản hồi dữ liệu nhập ở giao diện, chưa thay thế việc kiểm tra ở máy chủ. Trang quản trị cũng chưa có kiểm tra quyền truy cập trong phần mã đã khảo sát.”

## 17. Sao lưu và đồng bộ tỷ giá có thật không?

“Hiện hai thao tác được giả lập bằng khoảng chờ rồi hiện thông báo. Chưa có bước gọi API tỷ giá hoặc tạo file sao lưu. Nhóm cần nối chúng với xử lý thật trước khi báo cáo là chức năng hoàn thành.”

## 18. Đã có QR, đăng nhập Google hoặc tìm kiếm chưa?

“Các thành phần giao diện đã xuất hiện, nhưng chưa có xử lý tương ứng trong mã hiện tại. Vì vậy, nhóm chưa đưa chúng vào danh sách nghiệp vụ đã hoàn thành.”

## 19. Có chụp hóa đơn hay nhập bằng giọng nói chưa?

“Trong mã nguồn CNPM_524 đang trình bày chưa thấy chức năng chụp hóa đơn hoặc nhập giọng nói. Nếu nhóm có thử nghiệm ở nơi khác, cần giới thiệu đó là phần riêng và chứng minh mức độ tích hợp vào sản phẩm.”

## 20. Có dùng offline trên điện thoại được không?

“Dự án đã có manifest và metadata cho ứng dụng web. Tuy nhiên, chưa thấy cơ chế service worker hoặc lưu dữ liệu offline trong repository được khảo sát, và chưa có kết quả chạy thử offline trên thiết bị thật.”

## 21. Vì sao chọn React và TypeScript?

“Trong cách triển khai hiện tại, React giúp chia giao diện thành thành phần và cập nhật màn hình theo trạng thái. TypeScript giúp khai báo rõ cấu trúc dữ liệu như giao dịch và danh mục. Đây là các lợi ích đang thể hiện trong mã nguồn.”

Không tự nhận đây là kết quả so sánh hiệu năng với công nghệ khác nếu nhóm chưa thực hiện so sánh đó.

## 22. Nhóm áp dụng quy trình phát triển nào?

“Có thể trình bày những bước và minh chứng thực tế của nhóm như phân công, thiết kế, triển khai, chỉnh sửa và kiểm tra. Riêng repository hiện tại thể hiện phân công trong README và các thay đổi qua Git; chưa có đủ bằng chứng để xác nhận một quy trình Scrum hay CI/CD hoàn chỉnh.”

Đây là phần cần nhóm bổ sung từ hoạt động thực tế, tránh nói quy trình lý thuyết như thể đã thực hiện đầy đủ.

## 23. Đã kiểm thử đạt những gì?

“Nhóm sẽ báo cáo theo bảng test case và kết quả đã chạy. Trong phạm vi chuẩn bị tài liệu này mới có đối chiếu mã nguồn, chưa có kết quả chạy build, lint, trình duyệt hoặc thiết bị.”

Sau khi nhóm kiểm thử, thay câu trả lời bằng kết quả cụ thể: chạy ở đâu, trường hợp nào đạt, trường hợp nào lỗi và bằng chứng kèm theo.

## 24. Khó khăn lớn nhất là gì?

Chưa có nhật ký để xác nhận trải nghiệm thực tế của từng thành viên. Có thể nói về vấn đề kỹ thuật đang nhìn thấy:

“Vấn đề cần giải quyết tiếp theo là thống nhất nguồn dữ liệu và hoàn thiện luồng xuyên suốt. Hiện các màn hình có cấu trúc hiển thị, nhưng chưa cùng sử dụng dữ liệu giao dịch đã lưu. Khi tích hợp cần bảo đảm một thay đổi được phản ánh đúng ở lịch sử, tổng quan và báo cáo.”

Nếu muốn kể khó khăn đã gặp và cách khắc phục, dùng một lỗi hoặc quyết định có thật của nhóm.

## 25. Nếu có thêm thời gian, nhóm ưu tiên gì?

“Nhóm đề xuất ưu tiên đăng nhập thật, lưu một giao dịch và cho giao dịch đó xuất hiện thống nhất trên các màn hình. Đây là luồng cốt lõi có thể kiểm chứng được trước khi mở rộng thêm tiện ích.”

# E. Nguồn đối chiếu và gợi ý mở mã khi trình bày

Các liên kết dưới đây dẫn tới file thật trong workspace. Chỉ nên mở đoạn liên quan để giải thích, tránh cuộn qua toàn bộ file trong lúc nói.

| Muốn chứng minh | Nguồn |
| --- | --- |
| Mục tiêu, phạm vi và phân công | [README](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/README.md) |
| Công nghệ, phiên bản khai báo và lệnh chạy | [Cấu hình dự án](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/package.json) |
| Dữ liệu mẫu và xử lý trang chủ | [Trang chủ](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/page.tsx:30) |
| Tính tổng và tạo biểu đồ | [Báo cáo](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/reports/page.tsx:59) |
| Danh sách rỗng và tổng hợp giao dịch | [Lịch sử](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/history/page.tsx:13) |
| Kiểm tra form đăng ký | [Đăng ký](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/register/page.tsx:19) |
| Kiểm tra form đăng nhập | [Đăng nhập](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/login/page.tsx:17) |
| Phiên người dùng chưa được triển khai | [Hàm đọc người dùng](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/lib/session.ts) |
| Trạng thái khách và cài đặt hiển thị | [Hồ sơ](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/profile/page.tsx) |
| Điều hướng dùng chung | [BottomNav](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/components/BottomNav.tsx) |
| Bảng màu danh mục | [Màu dùng chung](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/lib/colors.ts) |
| Mô phỏng đồng bộ và sao lưu | [Quản trị](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/admin/page.tsx:19) |
| Tên, biểu tượng và chế độ hiển thị | [Manifest](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/manifest.ts) |
| Layout và metadata | [Khung ứng dụng](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/layout.tsx) |
| Bố cục và định dạng chung | [CSS chung](D:/code/01_HocTap/HK05/502045_CongNghePhanMem/99_NopBai_Final/CNPM_524/app/globals.css) |

## Gợi ý chọn nội dung khi tự canh thời gian

- Muốn trình bày tổng quan: ưu tiên A1–A5, A16–A18 và demo B3–B6.
- Muốn giải thích kỹ cách làm: thêm A6–A12, đặc biệt luồng dữ liệu, xử lý ngày/tháng và biểu đồ.
- Giảng viên quan tâm quy trình nhóm: dùng A4, A15 và bảng đóng góp C4 sau khi điền minh chứng thật.
- Giảng viên hỏi chất lượng sản phẩm: dùng C và trả lời theo kết quả thực tế.
- Phần quản trị, cấu hình di động và câu hỏi D là nội dung mở rộng để chọn khi cần.

Không cần đưa nguyên văn lời nói hoặc toàn bộ câu hỏi lên slide. Slide giữ các ý chính; lời giải thích và chi tiết mã dùng làm ghi chú để tập trình bày.
