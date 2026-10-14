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

// Bảng màu đề xuất: maroon là thương hiệu, còn lại mang nghĩa riêng
export const PALETTE = {
  brand: '#3C98E6', // nút chính, tab đang chọn, thẻ tổng quan
  income: '#1F9D6B', // thu
  expense: '#E4572E', // chi
  warning: '#E0A526', // ngân sách sắp vượt (70–90%)
  alert: '#C62828', // ngân sách vượt 90%
  teal: '#14A3A3', // quy đổi tiền tệ
  gold: '#C98A10', // giá vàng
  indigo: '#6D52C9', // chia tiền nhóm
};

// Biến thể sáng hơn của màu thu/chi để đọc được trên nền maroon
export const ON_BRAND = {
  income: '#8FE8BC',
  expense: '#FFB9A6',
};

// Màu thanh ngân sách trên thẻ xanh: xanh mint khi còn ổn, vàng và đỏ khi sắp vượt hoặc đã vượt
export const BUDGET_ON_BRAND = {
  ok: '#8FE8BC',
  warning: '#FFD166',
  alert: '#FF7A6B',
};
