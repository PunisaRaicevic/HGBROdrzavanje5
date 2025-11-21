import { supabase } from "./lib/supabase";
import { 
  type User, 
  type InsertUser,
  type Task,
  type InsertTask,
  type TaskHistory,
  type InsertTaskHistory,
  type Notification,
  type InsertNotification
} from "@shared/schema";

export interface IStorage {
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: Partial<InsertUser>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsers(): Promise<User[]>;
  getTechnicians(): Promise<User[]>;
  
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksByUserId(userId: string): Promise<Task[]>;
  getRecurringTasks(): Promise<Task[]>;
  getChildTasksByParentId(parentId: string): Promise<Task[]>;
  createTask(task: Partial<InsertTask>): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  
  createTaskHistory(history: Partial<InsertTaskHistory>): Promise<TaskHistory>;
  getTaskHistory(taskId: string): Promise<TaskHistory[]>;
  getTaskHistoriesForTasks(taskIds: string[]): Promise<TaskHistory[]>;
  
  createNotification(notification: Partial<InsertNotification>): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data as User;
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data as User;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const { data: updated, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return updated as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    // Soft delete: mark user as inactive instead of deleting
    // This preserves all foreign key references in tasks and task_history
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('[STORAGE] Error deactivating user:', error);
      return false;
    }
    return true;
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as User[];
  }

  async getTechnicians(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['serviser', 'radnik'])
      .eq('is_active', true)
      .order('full_name', { ascending: true });
    
    if (error) throw error;
    return (data || []) as User[];
  }

  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Task[];
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return data as Task;
  }

  async getTasksByUserId(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Task[];
  }

  async getRecurringTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .not('next_occurrence', 'is', null)
      .neq('recurrence_pattern', 'once');
    
    if (error) throw error;
    return (data || []) as Task[];
  }

  async getChildTasksByParentId(parentId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', parentId);
    
    if (error) throw error;
    return (data || []) as Task[];
  }

  async createTask(taskData: Partial<InsertTask>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const { data: updated, error } = await supabase
      .from('tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return updated as Task;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async createTaskHistory(historyData: Partial<InsertTaskHistory>): Promise<TaskHistory> {
    const { data, error } = await supabase
      .from('task_history')
      .insert(historyData)
      .select()
      .single();
    
    if (error) throw error;
    return data as TaskHistory;
  }

  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const { data, error } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return (data || []) as TaskHistory[];
  }

  async getTaskHistoriesForTasks(taskIds: string[]): Promise<TaskHistory[]> {
    if (taskIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('task_history')
      .select('*')
      .in('task_id', taskIds)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    return (data || []) as TaskHistory[];
  }

  async createNotification(notificationData: Partial<InsertNotification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    
    if (error) throw error;
    return data as Notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Notification[];
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId);
    
    if (error) throw error;
  }
}

export const storage = new SupabaseStorage();
