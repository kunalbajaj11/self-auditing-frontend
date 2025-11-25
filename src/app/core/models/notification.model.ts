export type NotificationType =
  | 'accrual_reminder'
  | 'ocr_pending'
  | 'budget_alert'
  | 'system';

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
