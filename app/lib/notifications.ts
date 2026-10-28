import { PALETTE } from './colors';
export type NotificationKind = 'budget' | 'income' | 'reminder';
export type AppNotification = { id: string; kind: NotificationKind; title: string; body: string; time: string; read: boolean };
export const KIND_COLOR: Record<NotificationKind, string> = { budget: PALETTE.warning, income: PALETTE.income, reminder: PALETTE.indigo };
