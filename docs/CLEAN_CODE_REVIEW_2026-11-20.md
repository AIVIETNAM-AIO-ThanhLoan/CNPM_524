# Rà soát clean code — 20/11/2026

Phạm vi: toàn bộ `app/`, `scripts/`, `tests/` và `public/sw.js` trên nhánh `anh`. Đợt này chỉ dọn code, không đổi chức năng. Người dùng không thấy khác biệt nào trên giao diện.

## Hiện trạng trước khi sửa

- `eslint` và `tsc --noEmit` đều sạch.
- Không có `any`, `@ts-ignore`, `TODO/FIXME`; `console.log` chỉ nằm trong `scripts/`.
- Không có module hay export chết. Chỉ có 8 type/hằng được export nhưng chỉ dùng trong chính file đó (ví dụ `isTheme`), chưa đáng sửa.
- Các vấn đề còn lại thuộc về kích thước file và sự lặp lại, nên đợt này chỉ xử lý phần ít rủi ro nhất.

## Đã sửa và lý do

### 1. Gom `formatMoney` về một chỗ

- **Vấn đề:** cùng một hàm `amount.toLocaleString('vi-VN') + 'đ'` bị viết lại ở 5 file: `home-client.tsx`, `history-client.tsx`, `reports-client.tsx`, `gold-client.tsx` và `calendar-report.tsx` (tên là `money`). Muốn đổi cách hiển thị tiền phải sửa 5 nơi, và rất dễ sót một nơi.
- **Cách sửa:** thêm một `formatMoney` vào `app/lib/client-api.ts`, nơi đã chứa `formatDate` và `dateKey`. Xóa 5 bản copy và import hàm dùng chung. Kết quả hiển thị giữ nguyên, ví dụ `1.500.000đ`.
- **Cố ý không gộp:**
  - `app/offline/offline-overview.tsx` dùng `Intl` kiểu tiền tệ (ra `100.000 ₫`) và nhận tham số `currency`, nên khác định dạng.
  - `app/lib/assistant.ts` chạy phía server và có làm tròn.
  - Gộp hai nơi này sẽ làm đổi cách hiển thị.

### 2. `public/sw.js`: không để một URL lạ làm hỏng cả service worker

- **Vấn đề:** hàm tìm tài nguyên offline gọi `decodeURIComponent` mà không bắt lỗi. Nếu một đường dẫn chunk có ký tự `%` không hợp lệ, hàm ném `URIError`. Bước này chạy trong `install`, nên service worker sẽ cài đặt thất bại và ứng dụng mất khả năng dùng offline. Đã tái hiện lỗi này trên bản `sw.js` trước khi sửa.
- **Cách sửa:** thêm hàm `normalizeSegment` bọc `try/catch`. Gặp chuỗi không giải mã được thì giữ nguyên đoạn đó. Đường dẫn bình thường vẫn được chuẩn hóa như cũ (`a%20b.js` giữ nguyên, `100%.js` không còn gây lỗi).
- Chưa tăng `CACHE` vì bản `v10` đã được nâng sẵn trong thay đổi chưa commit.

### 3. Nối test offline vào `package.json`

- **Vấn đề:** `tests/offline-hydration.mjs` chưa có trong `package.json` hay tài liệu, nên rất dễ bị quên.
- **Cách sửa:** thêm script `npm run test:offline-hydration`. Test cần dev server đang chạy (mặc định `http://localhost:3000`, đổi bằng biến `PWA_TEST_ORIGIN`) và trình duyệt Edge. API dùng dữ liệu giả, không ghi database.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npx eslint` | đạt, không có lỗi hay cảnh báo |
| `npx tsc --noEmit` | đạt |
| `node --check public/sw.js` | đạt |
| Chạy thử hàm chuẩn hóa lấy từ `sw.js` thật với `a%20b.js` và `100%.js` | đạt, không còn ném lỗi |
| Tìm lại bản copy `toLocaleString('vi-VN') + 'đ'` còn sót | chỉ còn định nghĩa duy nhất trong `client-api.ts` |
| `npm run test:offline-hydration` trên trình duyệt thật | **chưa chạy**: dev server không phục vụ trang trong phiên này. Nên chạy `npm run dev` rồi chạy script trước khi commit |

Chưa chạy `test:voice` hay `test:browser`, vì `VoiceAssistant.tsx` không bị sửa. Các màn hình dùng `formatMoney` chưa được mở bằng trình duyệt trong đợt này. Tính đúng đắn dựa vào type-check và việc hàm mới giống hệt các bản cũ.

## Chưa làm và lý do

- **Tách `VoiceAssistant.tsx`**: khi rà soát file có 333 dòng và khoảng 103 điểm rẽ nhánh; sau khi merge PR #33 của `loan` file dài 390 dòng. Đây là phần có rủi ro làm hỏng trợ lý giọng nói, cần chạy `npm run test:voice` trước và sau khi tách. Nên làm riêng khi còn thời gian.
- **Các component lớn khác:** `scan/page.tsx`, `transaction-form.tsx`, `budgets-client.tsx`, `currency-client.tsx`, `home-client.tsx`, `reports-client.tsx`.
- **Chưa có formatter** (Prettier, Biome hoặc `.editorconfig`). Thụt lề đang lẫn 2 và 4 khoảng trắng; comment lẫn tiếng Việt và tiếng Anh.
- **Style và màu cố định trong `VoiceAssistant`** (27 style inline, mã màu hex không đổi theo theme) đã được `loan` chuyển sang `app/styles/voice.css` trong PR #33. Sau khi merge, file không còn style inline hay mã màu cố định, nên mục này không cần xử lý nữa.
