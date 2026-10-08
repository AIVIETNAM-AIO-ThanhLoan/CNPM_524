export type CurrentUser = {
  id: string;
  name: string;
  account: string; // số điện thoại hoặc email
};

// TODO: thay bằng đọc phiên đăng nhập thật (cookie hoặc database) khi có backend.
// Hiện luôn trả về null, nên các trang hiển thị giao diện chưa đăng nhập.
export function getCurrentUser(): CurrentUser | null {
  return null;
}
