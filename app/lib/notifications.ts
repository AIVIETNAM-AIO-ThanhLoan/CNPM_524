import { PALETTE } from './colors';

export type NotificationKind = 'budget' | 'income' | 'reminder';

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

// TODO: lấy thông báo từ database theo người dùng. Hiện là dữ liệu mẫu.
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    kind: 'budget',
    title: 'Ngân sách ăn uống sắp vượt',
    body: 'Bạn đã dùng 84% ngân sách tháng này.',
    time: '10 phút trước',
    read: false,
  },
  {
    id: 2,
    kind: 'income',
    title: 'Đã nhận tiền lương',
    body: 'Lương tháng 10 đã được cộng vào ví, 10.000.000đ.',
    time: 'Hôm nay, 08:30',
    read: false,
  },
  {
    id: 3,
    kind: 'reminder',
    title: 'Nhắc thanh toán tiền nhà',
    body: 'Hạn thanh toán tiền nhà là ngày 15/10.',
    time: 'Hôm qua',
    read: false,
  },
  {
    id: 4,
    kind: 'income',
    title: 'Thưởng đã được ghi nhận',
    body: 'Khoản thưởng 2.000.000đ đã được thêm vào thu nhập.',
    time: '05/10/2026',
    read: true,
  },
];

export const unreadCount = (items: AppNotification[]) =>
  items.filter((n) => !n.read).length;

// Màu cho từng loại thông báo, lấy từ bảng màu đề xuất
export const KIND_COLOR: Record<NotificationKind, string> = {
  budget: PALETTE.warning,
  income: PALETTE.income,
  reminder: PALETTE.indigo,
};
