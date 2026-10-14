export type ColorPair = { bg: string; fg: string };

// Bảng màu cho danh mục, biểu đồ và icon chức năng.
// Màu chủ đạo burgundy vẫn dùng cho nút, tab đang chọn và thanh điều hướng.
// Màu vàng dùng chữ wine vì chữ trắng trên nền vàng khó đọc.
export const CATEGORY_COLORS: ColorPair[] = [
  { bg: '#E0533D', fg: '#ffffff' }, // đỏ cam
  { bg: '#F28C28', fg: '#ffffff' }, // cam
  { bg: '#F2B134', fg: '#4a0e1c' }, // vàng
  { bg: '#3DA35D', fg: '#ffffff' }, // xanh lá
  { bg: '#1B9AAA', fg: '#ffffff' }, // xanh ngọc
  { bg: '#3A7BD5', fg: '#ffffff' }, // xanh dương
  { bg: '#7E57C2', fg: '#ffffff' }, // tím
  { bg: '#E0609A', fg: '#ffffff' }, // hồng
];

// Lấy màu theo vị trí, lặp lại khi hết bảng màu
export const colorAt = (index: number): ColorPair =>
  CATEGORY_COLORS[index % CATEGORY_COLORS.length];
