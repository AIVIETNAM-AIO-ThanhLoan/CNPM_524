# Docker development trên Windows

Môi trường này dùng cho lập trình hằng ngày: Next.js development server, MariaDB 11.4 và reminder worker. Database Docker bắt đầu mới, tách khỏi XAMPP. Không cần cài Node.js hay bật XAMPP trên máy để chạy bằng Docker; cần Docker Desktop đang chạy Linux containers và Docker Compose hỗ trợ Watch (`sync+restart`, `initial_sync`; Compose 2.32 trở lên).

## Khởi động lần đầu

Mở PowerShell tại thư mục dự án:

```powershell
Copy-Item .env.docker.example .env.docker
```

Chỉ sao chép lần đầu. Đặt `DB_PASSWORD` và `DB_SETUP_PASSWORD` thành hai mật khẩu ngẫu nhiên khác nhau trong `.env.docker`; không dùng `CHANGE_ME`. Có thể tạo từng mật khẩu bằng PowerShell rồi lưu trực tiếp vào file:

```powershell
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $bytes = New-Object byte[] 32
    $rng.GetBytes($bytes)
    [BitConverter]::ToString($bytes).Replace('-', '')
} finally {
    $rng.Dispose()
}
```

`.env.docker` được Git bỏ qua, chỉ dùng để Compose truyền biến môi trường. File này và `.env.local` không được đưa vào image hay đồng bộ vào container. Không thay `.env.local` đang dùng cho XAMPP. Khi sửa mật khẩu trong file, tài khoản đã có trong database không tự đổi; cần đổi mật khẩu trong MariaDB cho khớp. Không xóa volume chỉ để đổi cấu hình.

```powershell
docker compose --env-file .env.docker up --build --watch
```

Mở [http://localhost:3000](http://localhost:3000), đăng ký tài khoản mới và đăng nhập. Lần đầu cần tải image và dependencies qua Internet; Next.js cũng tải Google Fonts khi biên dịch giao diện.

Thứ tự khởi động: `db` healthy → `db-setup` chạy migration thành công → `app` và `worker` chạy. Setup lỗi sẽ chặn khởi động app/worker; đọc logs và sửa nguyên nhân trước khi thử lại. Nếu container cũ vẫn chạy từ phiên trước, dừng app/worker trước khi chạy migration.

App dùng cổng 3000; database không mở cổng ra Windows nên không xung đột MySQL của XAMPP. Nếu cổng app đang bận, dừng server Next.js cũ hoặc đổi đồng thời `APP_PORT` và `APP_ORIGIN` trong `.env.docker`, ví dụ `3001` và `http://localhost:3001`.

## Sửa code và quản lý container

Compose Watch đồng bộ code vào filesystem Linux trong container: Next.js tự cập nhật khi sửa `app`/`public`; thay đổi cấu hình Next.js, TypeScript hoặc PostCSS sẽ khởi động lại app. Worker khởi động lại khi sửa `scripts`, `app/lib` hoặc `database`. `node_modules` và `.next` của Windows không được mount vào container. Đổi `package.json` hoặc `package-lock.json` sẽ rebuild app/worker với `npm ci`.

Watch chỉ chạy khi terminal Watch còn hoạt động. `Ctrl+C` dừng phiên đang chạy. Có thể dùng terminal thứ hai:

```powershell
docker compose --env-file .env.docker ps -a
docker compose --env-file .env.docker logs --tail 100 app worker db-setup
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker down
```

`stop` và `down` giữ dữ liệu trong named volume `cnpm-524_db-data`. Chạy lại lệnh `up --build --watch` để tiếp tục. `down --volumes` **xóa database Docker**; chỉ dùng khi chủ động muốn reset toàn bộ dữ liệu sau khi đã sao lưu.

Nếu đã sửa code lúc Watch tắt, `--build` đưa code mới vào image. Khi cần cập nhật dependencies và image cho các lệnh quản trị, dùng:

```powershell
docker compose --env-file .env.docker build
```

Sau khi sửa `.env.docker`, dừng và chạy lại Compose để áp dụng biến mới. Không dùng `docker compose config` để chia sẻ cấu hình: lệnh đó có thể in credentials; dùng `config --quiet` để kiểm tra cấu hình.

### Schema và migration

Đồng bộ file SQL không tự áp dụng migration. Khi có migration mới hoặc sửa script setup, dừng phiên Watch, rồi:

```powershell
docker compose --env-file .env.docker stop app worker
docker compose --env-file .env.docker build
docker compose --env-file .env.docker run --rm db-setup
docker compose --env-file .env.docker up --build --watch
```

Setup có thể chạy lại và giữ nguyên dữ liệu. Không sửa migration đã áp dụng hoặc checksum để ép chạy. MariaDB DDL tự commit; nếu migration lỗi giữa chừng, kiểm tra trạng thái thực tế trước khi chạy lại.

## Kiểm thử và công cụ database

Service `db-setup` cũng dùng cho các lệnh quản trị một lần; chỉ service này nhận credentials quản trị. App và worker luôn dùng tài khoản DML riêng. Các lệnh `run` dùng code đã build trong image, nên build lại trước khi kiểm tra các thay đổi mới:

```powershell
docker compose --env-file .env.docker build
docker compose --env-file .env.docker run --rm db-setup npm run lint
docker compose --env-file .env.docker run --rm db-setup sh -c 'npx next typegen && npx tsc --noEmit'
docker compose --env-file .env.docker run --rm db-setup npm run test:integration
```

Integration tests tạo database/user tạm và tự dọn chúng; không ghi vào database Docker chính hoặc XAMPP. Có thể chạy cùng app đang mở. Bộ browser tests cần cài Chromium và thư viện hệ thống của Playwright trong container kiểm thử riêng; không có sẵn trong development image này.

Sao lưu:

```powershell
docker compose --env-file .env.docker run --rm db-setup npm run db:backup
```

File SQL và checksum nằm trên Windows trong `backups/docker`. Thư mục này được mount chỉ vào container quản trị, được Git và image build bỏ qua. Không tự đặt lịch sao lưu trong cấu hình development.

Khôi phục thử vào database riêng, thay tên file bằng bản sao lưu thực tế:

```powershell
docker compose --env-file .env.docker run --rm db-setup npm run db:restore -- --file backups/cnpm_524_docker-YYYYMMDD-HHMMSS.sql --target cnpm_524_docker_restore_test
```

Database đích đã có dữ liệu cần `--replace`. Khôi phục vào database chính cần dừng app/worker, thêm `--overwrite-main` và nhập đúng tên database trong terminal; công cụ sẽ sao lưu trước khi ghi đè. Dùng `docker compose run` với terminal tương tác, không thêm `-T`. Không thay các bước xác nhận của script.

## Các tính năng tùy chọn và giới hạn

- Để trống AI keys: tính năng AI báo chưa cấu hình; các chức năng tài chính vẫn chạy.
- Để trống VAPID keys: worker vẫn tạo nhắc nhở trong app, chưa gửi Web Push. Cấu hình keys trong `.env.docker` rồi khởi động lại để bật Push.
- Chỉ truy cập trên máy qua localhost. Truy cập bằng điện thoại, domain, HTTPS và deploy production cần cấu hình riêng; xem [PWA deployment](PWA_DEPLOYMENT.md).
- Đây là `next dev`; dùng production build và checklist PWA riêng để kết luận khả năng cài đặt/offline trên thiết bị thật. Nếu trình duyệt đang giữ service worker từ bản chạy cũ, bỏ đăng ký service worker trong DevTools rồi tải lại khi debug giao diện.
- Không có CI/CD, reverse proxy hoặc production image trong thay đổi này.
