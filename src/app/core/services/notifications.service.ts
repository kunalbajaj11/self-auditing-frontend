import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { NotificationItem, NotificationType, NotificationChannel } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private readonly api: ApiService) {}

  listNotifications(filters?: Record<string, any>): Observable<NotificationItem[]> {
    return this.api.get<NotificationItem[]>('/notifications', filters);
  }

  createNotification(payload: {
    title: string;
    message: string;
    type: NotificationType;
    channel: NotificationChannel;
    userId?: string;
    scheduledFor?: string;
  }): Observable<NotificationItem> {
    return this.api.post<NotificationItem>('/notifications', payload);
  }

  markAsRead(id: string, isRead: boolean): Observable<NotificationItem> {
    return this.api.patch<NotificationItem>(`/notifications/${id}/read`, {
      isRead,
    });
  }
}
