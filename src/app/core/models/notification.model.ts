export type NotificationType =
  | 'accrual_reminder'
  | 'ocr_pending'
  | 'budget_alert'
  | 'system'
  | 'invoice_due_soon'
  | 'invoice_overdue'
  | 'expense_approval_pending';

export type NotificationChannel = 'email' | 'inapp' | 'sms';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  isRead: boolean;
  scheduledFor?: string;
  sentAt?: string;
  createdAt?: string;
}
