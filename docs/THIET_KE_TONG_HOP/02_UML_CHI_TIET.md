# UML gốc của nhóm

Ảnh dưới đây lấy trực tiếp từ `sources/design/Diagram`, không vẽ lại. Mô tả giúp đọc và đối chiếu thiết kế gốc với mã hiện tại.

[Bảng Use Case gốc](sources/design/Usecase&UML/UC.docx) · [Danh mục UC và API](01_DANH_MUC_USE_CASE.md) · [ERD và dữ liệu](03_ERD_VA_TU_DIEN_DU_LIEU.md)

## Tra cứu nhanh

| Nghiệp vụ | Activity gốc | Sequence gốc |
|---|---|---|
| UC05 kết hợp UC08/UC09 | [Mở ảnh](<sources/design/Diagram/UC6-9_Activity_Diagram.png>) | [Mở ảnh](<sources/design/Diagram/UC6-9_sequenceDiagram.png>) |
| UC07 | [Mở ảnh](<sources/design/Diagram/UC07_Activity Diagram.png>) | [Mở ảnh](<sources/design/Diagram/UC07_Sequence Diagram.png>) |
| UC11, sử dụng dữ liệu UC10 | [Mở ảnh](<sources/design/Diagram/UC11_ActivityDiagram.png>) | [Mở ảnh](<sources/design/Diagram/UC11_SequenceDiagram.png>) |
| UC16 | [Mở ảnh](<sources/design/Diagram/UC16_Activity Diagram.png>) | [Mở ảnh](<sources/design/Diagram/UC16_Sequent Diagram.png>) |

## 1. Ghi khoản chi và cảnh báo ngân sách

**Phạm vi:** UC05 kết hợp UC08/UC09.

**Luồng nghiệp vụ:** Nhập khoản chi → kiểm tra dữ liệu → lưu → cập nhật mức sử dụng ngân sách → xét ngưỡng → thông báo hoặc hiển thị thành công.

**Các thành phần phối hợp:** Client gửi khoản chi tới phần giao dịch; phần giao dịch lưu dữ liệu rồi yêu cầu phần ngân sách kiểm tra. Phần ngân sách đọc cấu hình, gửi và lưu lịch sử cảnh báo khi thỏa điều kiện.

**Điểm cần đối chiếu:** Tên file gốc ghi UC6-9, nhưng Main UC trong UC.docx mô tả UC05 + UC09, dùng cấu hình UC08. Activity ghi vượt ngưỡng, còn bảng UC và Sequence ghi đạt/vượt; nhóm cần chốt điều kiện bằng đúng ngưỡng. Mã hiện có luồng ghi sổ, chưa có gửi cảnh báo thật.

### Activity

![Activity gốc UC05 kết hợp UC08/UC09](<sources/design/Diagram/UC6-9_Activity_Diagram.png>)

### Sequence

![Sequence gốc UC05 kết hợp UC08/UC09](<sources/design/Diagram/UC6-9_sequenceDiagram.png>)

## 2. Hủy hoặc điều chỉnh giao dịch

**Phạm vi:** UC07.

**Luồng nghiệp vụ:** Chọn giao dịch → kiểm tra quyền/hiệu lực → chọn hủy hoặc nhập nội dung sửa → kiểm tra dữ liệu → xác nhận → ghi bút toán đảo → nếu sửa thì ghi giao dịch thay thế → liên kết và lưu đồng thời → trả kết quả; lưu lỗi thì hoàn tác.

**Các thành phần phối hợp:** Người dùng → Giao diện → Bộ xử lý giao dịch → Database. Bộ xử lý lấy giao dịch gốc, kiểm tra quyền/dữ liệu rồi ghi bản đảo và phần thay thế nếu có.

**Điểm cần đối chiếu:** Activity có nhánh không xác nhận và lỗi lưu/hoàn tác, còn Sequence chưa thể hiện riêng đầy đủ các nhánh này. Schema và API hiện chưa có nghiệp vụ đảo/thay thế; ảnh thể hiện thiết kế đích của nhóm.

### Activity

![Activity gốc UC07](<sources/design/Diagram/UC07_Activity Diagram.png>)

### Sequence

![Sequence gốc UC07](<sources/design/Diagram/UC07_Sequence Diagram.png>)

## 3. Nhắc khoản thanh toán đến hạn

**Phạm vi:** UC11, sử dụng dữ liệu UC10.

**Luồng nghiệp vụ:** Đến thời điểm kiểm tra → lấy khoản còn hoạt động và lịch nhắc → lọc khoản đến hạn, chưa gửi thành công → tạo nội dung → gửi → ghi nhận kết quả.

**Các thành phần phối hợp:** NhacNhoController lấy danh sách từ Database, tạo nội dung gửi Client và lưu kết quả/thời gian; ảnh cũng có phần ghi nhận lỗi.

**Điểm cần đối chiếu:** Bảng Main UC nêu bộ lập lịch và dịch vụ thông báo, nhưng Sequence gốc chưa tách rõ hai thành phần này hoặc các nhánh thành công/thất bại. Mã mới có bảng recurring_transactions, chưa có scheduler/lịch sử gửi đầy đủ.

### Activity

![Activity gốc UC11, sử dụng dữ liệu UC10](<sources/design/Diagram/UC11_ActivityDiagram.png>)

### Sequence

![Sequence gốc UC11, sử dụng dữ liệu UC10](<sources/design/Diagram/UC11_SequenceDiagram.png>)

## 4. Xem báo cáo thu chi theo kỳ

**Phạm vi:** UC16.

**Luồng nghiệp vụ:** Chọn kỳ → kiểm tra khoảng thời gian → lấy giao dịch → nếu rỗng thì thông báo; nếu có thì tính tổng thu, tổng chi và chênh lệch → hiển thị.

**Các thành phần phối hợp:** Người dùng → Giao diện → Báo cáo Controller → Database. Controller kiểm tra khoảng thời gian/bộ lọc, lấy dữ liệu, xử lý rỗng và trả kết quả tổng hợp.

**Điểm cần đối chiếu:** Mã hiện có GET /api/finance và hàm finance. Transfer được loại khỏi tổng thu/chi. Từ khóa q lọc danh sách lịch sử, còn tổng/breakdown vẫn tính toàn kỳ; lịch sử hiện tối đa 200 dòng.

### Activity

![Activity gốc UC16](<sources/design/Diagram/UC16_Activity Diagram.png>)

### Sequence

![Sequence gốc UC16](<sources/design/Diagram/UC16_Sequent Diagram.png>)

## Phần đăng nhập 2FA

UC.docx có đề cập thiết kế đăng nhập 2FA trong Main UC, nhưng bộ Diagram hiện chưa có cặp Activity–Sequence tương ứng. Đăng nhập/phiên đã có mã; 2FA chưa được hiện thực. Không bổ sung một sơ đồ tự tạo vào bộ ảnh gốc.
