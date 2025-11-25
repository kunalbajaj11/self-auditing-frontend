import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { SubscriptionPlan } from '../models/plan.model';

@Injectable({ providedIn: 'root' })
export class PlansService {
  constructor(private readonly api: ApiService) {}

  listPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>('/plans');
  }

  createPlan(plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.api.post<SubscriptionPlan>('/plans', plan);
  }

  updatePlan(id: string, plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.api.patch<SubscriptionPlan>(`/plans/${id}`, plan);
  }

  deletePlan(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/plans/${id}`);
  }
}
