import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  full_name: text("full_name").notNull(),
  role: varchar("role").notNull(), // Sistemska uloga (admin, operater, radnik, etc.)
  job_title: text("job_title"), // Zanimanje/pozicija u hotelu (Recepcioner, Kuvar, Tehničar, etc.)
  department: text("department"),
  phone: varchar("phone"),
  password_hash: text("password_hash").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  shift: text("shift"),
  push_token: text("push_token"),
  onesignal_player_id: text("onesignal_player_id"),
  fcm_token: text("fcm_token"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  room_number: varchar("room_number"),
  priority: varchar("priority").notNull(),
  status: varchar("status").notNull(),
  created_by: varchar("created_by").notNull(),
  created_by_name: text("created_by_name").notNull(),
  created_by_department: text("created_by_department").notNull(),
  operator_id: varchar("operator_id"),
  operator_name: text("operator_name"),
  assigned_to: text("assigned_to"),
  assigned_to_name: text("assigned_to_name"),
  assigned_to_type: varchar("assigned_to_type"),
  receipt_confirmed_at: timestamp("receipt_confirmed_at", { withTimezone: true }),
  receipt_confirmed_by: varchar("receipt_confirmed_by"),
  receipt_confirmed_by_name: text("receipt_confirmed_by_name"),
  sef_id: varchar("sef_id"),
  sef_name: text("sef_name"),
  external_company_id: varchar("external_company_id"),
  external_company_name: text("external_company_name"),
  deadline_at: timestamp("deadline_at", { withTimezone: true }),
  is_overdue: boolean("is_overdue").notNull().default(false),
  estimated_arrival_time: timestamp("estimated_arrival_time", { withTimezone: true }),
  actual_arrival_time: timestamp("actual_arrival_time", { withTimezone: true }),
  estimated_completion_time: timestamp("estimated_completion_time", { withTimezone: true }),
  actual_completion_time: timestamp("actual_completion_time", { withTimezone: true }),
  time_spent_minutes: integer("time_spent_minutes").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completed_at: timestamp("completed_at", { withTimezone: true }),
  completed_by: varchar("completed_by"),
  completed_by_name: text("completed_by_name"),
  images: text("images").array(),
  is_recurring: boolean("is_recurring").notNull().default(false),
  recurrence_pattern: varchar("recurrence_pattern").default("once"),
  recurrence_start_date: timestamp("recurrence_start_date", { withTimezone: true }),
  next_occurrence: timestamp("next_occurrence", { withTimezone: true }),
  parent_task_id: varchar("parent_task_id"),
  scheduled_for: timestamp("scheduled_for", { withTimezone: true }),
  worker_report: text("worker_report"),
  worker_images: text("worker_images").array(),
});

export const task_history = pgTable("task_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  task_id: varchar("task_id").notNull(),
  user_id: varchar("user_id").notNull(),
  user_name: text("user_name").notNull(),
  user_role: text("user_role").notNull(),
  action: text("action").notNull(),
  original_message: text("original_message"),
  notes: text("notes"),
  status_from: varchar("status_from"),
  status_to: varchar("status_to"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  assigned_to: text("assigned_to"),
  assigned_to_name: text("assigned_to_name"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  task_id: varchar("task_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  read_at: timestamp("read_at", { withTimezone: true }),
});

// Relations
// Note: tasks.assigned_to is a TEXT field with comma-separated user IDs, not a foreign key
// Similarly, assigned_to_name, operator_name, sef_name, etc. are denormalized text fields
export const usersRelations = relations(users, ({ many }) => ({
  createdTasks: many(tasks, { relationName: "created_by" }),
  notifications: many(notifications),
  taskHistoryChanges: many(task_history),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tasks.created_by],
    references: [users.id],
    relationName: "created_by",
  }),
  parentTask: one(tasks, {
    fields: [tasks.parent_task_id],
    references: [tasks.id],
    relationName: "recurring_tasks",
  }),
  childTasks: many(tasks, { relationName: "recurring_tasks" }),
  history: many(task_history),
  notifications: many(notifications),
}));

export const taskHistoryRelations = relations(task_history, ({ one }) => ({
  task: one(tasks, {
    fields: [task_history.task_id],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [task_history.user_id],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [notifications.task_id],
    references: [tasks.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertTaskHistorySchema = createInsertSchema(task_history);
export const insertNotificationSchema = createInsertSchema(notifications);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTaskHistory = z.infer<typeof insertTaskHistorySchema>;
export type TaskHistory = typeof task_history.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
