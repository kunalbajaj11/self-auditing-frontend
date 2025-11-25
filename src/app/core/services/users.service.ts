import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthUser, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly api: ApiService) {}

  listUsers(): Observable<AuthUser[]> {
    return this.api.get<AuthUser[]>('/users');
  }

  createUser(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
  }): Observable<AuthUser> {
    return this.api.post<AuthUser>('/users', payload);
  }

  updateUser(id: string, payload: Partial<AuthUser>): Observable<AuthUser> {
    return this.api.patch<AuthUser>(`/users/${id}`, payload);
  }

  updateStatus(id: string, status: 'active' | 'inactive'): Observable<AuthUser> {
    return this.api.patch<AuthUser>(`/users/${id}/status`, { status });
  }

  getUserLimitInfo(): Observable<{
    currentCount: number;
    maxUsers: number | null;
    planType: string;
  }> {
    return this.api.get<{
      currentCount: number;
      maxUsers: number | null;
      planType: string;
    }>('/users/limit-info');
  }
}
