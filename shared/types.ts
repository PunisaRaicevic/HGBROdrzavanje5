// Database types for hotel task management

export type UserRole = 'admin' | 'recepcioner' | 'operater' | 'radnik' | 'sef' | 'serviser' | 'menadzer';
export type Department = 'recepcija' | 'restoran' | 'bazen' | 'domacinstvo' | 'tehnicka' | 'eksterni';
export type Priority = 'urgent' | 'normal' | 'can_wait';
export type TaskStatus = 
  | 'new' 
  | 'with_operator' 
  | 'assigned_to_radnik' 
  | 'with_sef' 
  | 'with_external' 
  | 'returned_to_operator' 
  | 'returned_to_sef' 
  | 'completed' 
  | 'cancelled';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  department: Department;
  phone?: string;
  company_name?: string;
  is_active: boolean;
  first_login: boolean;
  notification_preference: 'instant' | 'hourly' | 'daily';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  location?: string;
  room_number?: string;
  priority: Priority;
  status: TaskStatus;
  created_by: string;
  created_by_name: string;
  created_by_department: string;
  operator_id?: string;
  operator_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_type?: 'radnik' | 'serviser';
  receipt_confirmed_at?: string;
  receipt_confirmed_by?: string;
  receipt_confirmed_by_name?: string;
  sef_id?: string;
  sef_name?: string;
  external_company_id?: string;
  external_company_name?: string;
  deadline_at?: string;
  is_overdue: boolean;
  estimated_arrival_time?: string;
  actual_arrival_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  time_spent_minutes: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancelled_by_name?: string;
  cancellation_reason?: string;
  images?: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  next_occurrence?: string;
  parent_task_id?: string;
  worker_report?: string;
  worker_images?: string[];
}

export interface Notification {
  id: string;
  user_id: string;
  task_id?: string;
  title: string;
  message: string;
  type: 'task_created' | 'task_assigned' | 'task_returned' | 'task_completed' | 'info' | 'warning';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

export interface TaskTimeline {
  id: string;
  task_id: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  action_type: string;
  action_description: string;
}

export interface ExternalCompany {
  id: string;
  company_name: string;
  service_type: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  average_rating: number;
  total_jobs: number;
  is_active: boolean;
  created_at: string;
}
