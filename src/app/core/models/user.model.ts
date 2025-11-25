export type UserRole = 'superadmin' | 'admin' | 'accountant' | 'approver' | 'auditor' | 'employee';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: {
    id: string;
    name: string;
  } | null;
  status?: 'active' | 'inactive';
  lastLogin?: string;
  phone?: string;
}
