import { db } from "./db";
import { eq, desc, asc, inArray, isNotNull, ne, and } from "drizzle-orm";
import { 
  users,
  tasks,
  task_history,
  notifications,
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
  getUsers(): Promise<User[]>;
  getTechnicians(): Promise<User[]>;
  
  getTasks(): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksByUserId(userId: string): Promise<Task[]>;
  getRecurringTasks(): Promise<Task[]>;
  createTask(task: Partial<InsertTask>): Promise<Task>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  
  createTaskHistory(history: Partial<InsertTaskHistory>): Promise<TaskHistory>;
  getTaskHistory(taskId: string): Promise<TaskHistory[]>;
  
  createNotification(notification: Partial<InsertNotification>): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
}

export class DrizzleStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Username field doesn't exist in schema, returning undefined
    return undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    const result = await db.insert(users).values(userData as any).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.created_at));
  }

  async getTechnicians(): Promise<User[]> {
    return await db.select().from(users)
      .where(inArray(users.role, ['serviser', 'radnik']))
      .orderBy(asc(users.full_name));
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.created_at));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async getTasksByUserId(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.created_by, userId))
      .orderBy(desc(tasks.created_at));
  }

  async getRecurringTasks(): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.is_recurring, true),
        isNotNull(tasks.next_occurrence),
        ne(tasks.recurrence_pattern, 'once')
      ));
  }

  async createTask(taskData: Partial<InsertTask>): Promise<Task> {
    const result = await db.insert(tasks).values(taskData as any).returning();
    return result[0];
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async createTaskHistory(historyData: Partial<InsertTaskHistory>): Promise<TaskHistory> {
    const result = await db.insert(task_history).values(historyData as any).returning();
    return result[0];
  }

  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    return await db.select().from(task_history)
      .where(eq(task_history.task_id, taskId))
      .orderBy(desc(task_history.timestamp));
  }

  async createNotification(notificationData: Partial<InsertNotification>): Promise<Notification> {
    const result = await db.insert(notifications).values(notificationData as any).returning();
    return result[0];
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ is_read: true, read_at: new Date() } as any)
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ is_read: true, read_at: new Date() } as any)
      .where(eq(notifications.user_id, userId));
  }
}

export const storage = new DrizzleStorage();
