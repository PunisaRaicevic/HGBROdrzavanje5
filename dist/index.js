// server/index.ts
import express2 from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, or, and, sql as sql2 } from "drizzle-orm";

// shared/schema.ts
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  full_name: text("full_name").notNull(),
  role: varchar("role").notNull(),
  department: text("department"),
  phone: varchar("phone"),
  password_hash: text("password_hash").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  shift: text("shift"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
var tasks = pgTable("tasks", {
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
  recurrence_end_date: timestamp("recurrence_end_date", { withTimezone: true }),
  next_occurrence: timestamp("next_occurrence", { withTimezone: true }),
  parent_task_id: varchar("parent_task_id"),
  worker_report: text("worker_report"),
  worker_images: text("worker_images").array()
});
var task_history = pgTable("task_history", {
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
  assigned_to_name: text("assigned_to_name")
});
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(),
  task_id: varchar("task_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  read_at: timestamp("read_at", { withTimezone: true })
});
var usersRelations = relations(users, ({ many }) => ({
  createdTasks: many(tasks, { relationName: "created_by" }),
  notifications: many(notifications),
  taskHistoryChanges: many(task_history)
}));
var tasksRelations = relations(tasks, ({ one, many }) => ({
  creator: one(users, {
    fields: [tasks.created_by],
    references: [users.id],
    relationName: "created_by"
  }),
  parentTask: one(tasks, {
    fields: [tasks.parent_task_id],
    references: [tasks.id],
    relationName: "recurring_tasks"
  }),
  childTasks: many(tasks, { relationName: "recurring_tasks" }),
  history: many(task_history),
  notifications: many(notifications)
}));
var taskHistoryRelations = relations(task_history, ({ one }) => ({
  task: one(tasks, {
    fields: [task_history.task_id],
    references: [tasks.id]
  }),
  user: one(users, {
    fields: [task_history.user_id],
    references: [users.id]
  })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.user_id],
    references: [users.id]
  }),
  task: one(tasks, {
    fields: [notifications.task_id],
    references: [tasks.id]
  })
}));
var insertUserSchema = createInsertSchema(users);
var insertTaskSchema = createInsertSchema(tasks);
var insertTaskHistorySchema = createInsertSchema(task_history);
var insertNotificationSchema = createInsertSchema(notifications);

// server/storage.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
var client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require"
});
var db = drizzle(client);
var DrizzleStorage = class {
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  async getUserById(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async createUser(userData) {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }
  async updateUser(id, data) {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0];
  }
  async getUsers() {
    return await db.select().from(users).orderBy(desc(users.created_at));
  }
  async getTechnicians() {
    return await db.select().from(users).where(
      and(
        or(eq(users.role, "serviser"), eq(users.role, "radnik")),
        eq(users.is_active, true)
      )
    ).orderBy(users.full_name);
  }
  async getTasks() {
    return await db.select().from(tasks).orderBy(desc(tasks.created_at));
  }
  async getTaskById(id) {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }
  async getTasksByUserId(userId) {
    return await db.select().from(tasks).where(eq(tasks.created_by, userId)).orderBy(desc(tasks.created_at));
  }
  async getRecurringTasks() {
    return await db.select().from(tasks).where(
      and(
        eq(tasks.is_recurring, true),
        sql2`${tasks.next_occurrence} IS NOT NULL`,
        sql2`${tasks.recurrence_pattern} != 'once'`
      )
    );
  }
  async createTask(taskData) {
    const result = await db.insert(tasks).values(taskData).returning();
    return result[0];
  }
  async updateTask(id, data) {
    const result = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return result[0];
  }
  async deleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  async createTaskHistory(historyData) {
    const result = await db.insert(task_history).values(historyData).returning();
    return result[0];
  }
  async getTaskHistory(taskId) {
    return await db.select().from(task_history).where(eq(task_history.task_id, taskId)).orderBy(desc(task_history.timestamp));
  }
  async createNotification(notificationData) {
    const result = await db.insert(notifications).values(notificationData).returning();
    return result[0];
  }
  async getUserNotifications(userId) {
    return await db.select().from(notifications).where(eq(notifications.user_id, userId)).orderBy(desc(notifications.created_at));
  }
  async markNotificationAsRead(id) {
    await db.update(notifications).set({ is_read: true, read_at: /* @__PURE__ */ new Date() }).where(eq(notifications.id, id));
  }
  async markAllNotificationsAsRead(userId) {
    await db.update(notifications).set({ is_read: true, read_at: /* @__PURE__ */ new Date() }).where(eq(notifications.user_id, userId));
  }
};
var storage = new DrizzleStorage();

// server/routes.ts
import bcrypt from "bcryptjs";

// server/utils/recurrence.ts
function parseCustomPattern(pattern) {
  if (["once", "daily", "weekly", "monthly", "yearly"].includes(pattern)) {
    return null;
  }
  const parts = pattern.split("_");
  if (parts.length !== 2) {
    return null;
  }
  const interval = parseInt(parts[0], 10);
  const unit = parts[1];
  if (isNaN(interval) || interval <= 0) {
    return null;
  }
  if (!["days", "weeks", "months", "years"].includes(unit)) {
    return null;
  }
  return { interval, unit };
}
function calculateNextOccurrence(currentDate, pattern) {
  const nextDate = new Date(currentDate);
  const originalDay = nextDate.getDate();
  const customPattern = parseCustomPattern(pattern);
  if (customPattern) {
    const { interval, unit } = customPattern;
    switch (unit) {
      case "days":
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case "weeks":
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case "months": {
        const targetMonth = nextDate.getMonth() + interval;
        const targetYear = nextDate.getFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = targetMonth % 12;
        nextDate.setMonth(normalizedMonth, 1);
        nextDate.setFullYear(targetYear);
        const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        const dayToSet = Math.min(originalDay, lastDayOfMonth);
        nextDate.setDate(dayToSet);
        break;
      }
      case "years": {
        const originalMonth = nextDate.getMonth();
        const targetYear = nextDate.getFullYear() + interval;
        if (originalMonth === 1 && originalDay === 29) {
          const isLeapYear = targetYear % 4 === 0 && targetYear % 100 !== 0 || targetYear % 400 === 0;
          if (isLeapYear) {
            nextDate.setFullYear(targetYear, 1, 29);
          } else {
            nextDate.setFullYear(targetYear, 1, 28);
          }
        } else {
          nextDate.setFullYear(targetYear);
        }
        break;
      }
    }
    return nextDate;
  }
  switch (pattern) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly": {
      const targetMonth = nextDate.getMonth() + 1;
      const targetYear = nextDate.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      nextDate.setMonth(normalizedMonth, 1);
      nextDate.setFullYear(targetYear);
      const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const dayToSet = Math.min(originalDay, lastDayOfMonth);
      nextDate.setDate(dayToSet);
      break;
    }
    case "yearly": {
      const originalMonth = nextDate.getMonth();
      const targetYear = nextDate.getFullYear() + 1;
      if (originalMonth === 1 && originalDay === 29) {
        const isLeapYear = targetYear % 4 === 0 && targetYear % 100 !== 0 || targetYear % 400 === 0;
        if (isLeapYear) {
          nextDate.setFullYear(targetYear, 1, 29);
        } else {
          nextDate.setFullYear(targetYear, 1, 28);
        }
      } else {
        nextDate.setFullYear(targetYear);
      }
      break;
    }
    case "once":
    default:
      return currentDate;
  }
  return nextDate;
}
function shouldProcessRecurringTask(nextOccurrence, recurrenceEndDate) {
  if (!nextOccurrence) {
    return false;
  }
  const now = /* @__PURE__ */ new Date();
  const nextDate = new Date(nextOccurrence);
  if (nextDate > now) {
    return false;
  }
  if (recurrenceEndDate) {
    const endDate = new Date(recurrenceEndDate);
    if (nextDate > endDate) {
      return false;
    }
  }
  return true;
}
function shouldContinueRecurrence(nextOccurrence, recurrenceEndDate) {
  if (!recurrenceEndDate) {
    return true;
  }
  const endDate = new Date(recurrenceEndDate);
  return nextOccurrence <= endDate;
}

// server/services/recurringTaskProcessor.ts
async function processRecurringTasks() {
  console.log("[CRON] Processing recurring tasks...");
  const recurringTasks = await storage.getRecurringTasks();
  if (!recurringTasks || recurringTasks.length === 0) {
    console.log("[CRON] No recurring tasks found");
    return { processed: 0, total: 0, results: [], message: "No recurring tasks to process" };
  }
  console.log(`[CRON] Found ${recurringTasks.length} recurring tasks`);
  let processedCount = 0;
  const results = [];
  for (const task of recurringTasks) {
    const nextOccurrenceDate = task.next_occurrence ? task.next_occurrence instanceof Date ? task.next_occurrence : new Date(task.next_occurrence) : null;
    const recurrenceEndDate = task.recurrence_end_date ? task.recurrence_end_date instanceof Date ? task.recurrence_end_date : new Date(task.recurrence_end_date) : null;
    if (!shouldProcessRecurringTask(nextOccurrenceDate, recurrenceEndDate)) {
      continue;
    }
    try {
      const newTaskData = {
        title: task.title,
        description: task.description,
        location: task.location,
        room_number: task.room_number,
        priority: task.priority,
        status: "assigned_to_radnik",
        created_by: task.created_by,
        created_by_name: task.created_by_name,
        created_by_department: task.created_by_department,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name,
        images: task.images,
        parent_task_id: task.id,
        is_recurring: false,
        // The instance itself is not recurring
        recurrence_pattern: "once"
      };
      const newTask = await storage.createTask(newTaskData);
      await storage.createTaskHistory({
        task_id: newTask.id,
        changed_by: task.created_by,
        changed_by_name: task.created_by_name,
        new_status: "assigned_to_radnik",
        notes: `Auto-generated from recurring task ${task.id}`,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name
      });
      const currentOccurrence = nextOccurrenceDate || /* @__PURE__ */ new Date();
      const nextOccurrence = calculateNextOccurrence(
        currentOccurrence,
        task.recurrence_pattern
      );
      const continueRecurrence = shouldContinueRecurrence(
        nextOccurrence,
        recurrenceEndDate
      );
      if (continueRecurrence) {
        await storage.updateTask(task.id, { next_occurrence: nextOccurrence });
        results.push({
          taskId: task.id,
          status: "success",
          newTaskId: newTask.id,
          nextOccurrence: nextOccurrence.toISOString()
        });
      } else {
        await storage.updateTask(task.id, { next_occurrence: null });
        results.push({
          taskId: task.id,
          status: "success",
          newTaskId: newTask.id,
          message: "Recurrence ended"
        });
      }
      processedCount++;
      console.log(`[CRON] Processed recurring task ${task.id} -> created ${newTask.id}`);
    } catch (error) {
      console.error(`[CRON] Error processing task ${task.id}:`, error);
      results.push({
        taskId: task.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  console.log(`[CRON] Finished processing. Created ${processedCount} new tasks`);
  return {
    processed: processedCount,
    total: recurringTasks.length,
    results
  };
}

// server/socket.ts
import { Server as SocketIOServer } from "socket.io";
var io = null;
function initializeSocket(server) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      // In production, specify your domain
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
  });
  io.on("connection", (socket) => {
    console.log(`[SOCKET.IO] Client connected: ${socket.id}`);
    socket.on("worker:join", (userId) => {
      console.log(`[SOCKET.IO] Worker joined room: ${userId}`);
      socket.join(`user:${userId}`);
      socket.emit("worker:connected", { userId, socketId: socket.id });
    });
    socket.on("worker:leave", (userId) => {
      console.log(`[SOCKET.IO] Worker left room: ${userId}`);
      socket.leave(`user:${userId}`);
    });
    socket.on("disconnect", () => {
      console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
    });
  });
  console.log("[SOCKET.IO] Server initialized and ready");
  return io;
}
function notifyWorkers(workerIds, task) {
  if (!io) {
    console.error("[SOCKET.IO] ERROR: Not initialized, cannot send notification. Missing io instance!");
    return;
  }
  const ids = workerIds.split(",").map((id) => id.trim()).filter((id) => id);
  if (ids.length === 0) {
    console.warn("[SOCKET.IO] No worker IDs provided, skipping notification");
    return;
  }
  console.log(`[SOCKET.IO] Sending notification to ${ids.length} worker(s): ${ids.join(", ")}`);
  ids.forEach((userId) => {
    const room = `user:${userId}`;
    console.log(`[SOCKET.IO] Emitting task:assigned to room: ${room}`);
    io.to(room).emit("task:assigned", {
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      location: task.location,
      hotel: task.hotel,
      blok: task.blok,
      soba: task.soba,
      assignedBy: task.created_by_name,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
}
function notifyTaskUpdate(taskId, status) {
  if (!io) return;
  console.log(`[SOCKET.IO] Broadcasting task update: ${taskId} -> ${status}`);
  io.emit("task:updated", { taskId, status, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
}

// server/routes.ts
import { z } from "zod";
var createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["admin", "operater", "sef", "radnik", "serviser", "recepcioner", "menadzer"]),
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional()
});
var updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum(["admin", "operater", "sef", "radnik", "serviser", "recepcioner", "menadzer"]).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional()
});
function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
async function registerRoutes(app2) {
  const server = createServer(app2);
  initializeSocket(server);
  console.log("[INIT] Socket.IO initialized for real-time notifications");
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt for:", email);
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required"
        });
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !user.is_active) {
        console.log("User not found:", email);
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }
      console.log("User found, checking password...");
      const isBcryptHash = user.password_hash?.startsWith("$2a$") || user.password_hash?.startsWith("$2b$") || user.password_hash?.startsWith("$2y$");
      let isValidPassword = false;
      if (isBcryptHash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log("Password (hashed) valid:", isValidPassword);
      } else {
        isValidPassword = password === user.password_hash;
        console.log("Password (plaintext) valid:", isValidPassword);
        if (isValidPassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const updated = await storage.updateUser(user.id, { password_hash: hashedPassword });
          if (updated) {
            console.log("\u2705 Plaintext password converted to bcrypt hash for user:", email);
          } else {
            console.error("\u26A0\uFE0F Failed to update password hash");
          }
        }
      }
      if (!isValidPassword) {
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Internal server error" });
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Internal server error" });
          }
          const { password_hash, ...userWithoutPassword } = user;
          res.json({
            user: userWithoutPassword
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUserById(req.session.userId);
      if (!user || !user.is_active) {
        req.session.destroy(() => {
        });
        return res.status(401).json({ error: "Session invalid" });
      }
      req.session.touch();
      const { password_hash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const usersWithoutPasswords = users2.map(({ password_hash, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validationResult = createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: validationResult.error.errors[0].message
        });
      }
      const userData = validationResult.data;
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser({
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department || null,
        phone: userData.phone || null,
        password_hash: hashedPassword,
        is_active: userData.is_active !== void 0 ? userData.is_active : true
      });
      const { password_hash, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validationResult = updateUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: validationResult.error.errors[0].message
        });
      }
      const validatedData = validationResult.data;
      const updates = {};
      if (validatedData.email !== void 0) updates.email = validatedData.email;
      if (validatedData.full_name !== void 0) updates.full_name = validatedData.full_name;
      if (validatedData.role !== void 0) updates.role = validatedData.role;
      if (validatedData.department !== void 0) updates.department = validatedData.department;
      if (validatedData.phone !== void 0) updates.phone = validatedData.phone;
      if (validatedData.is_active !== void 0) updates.is_active = validatedData.is_active;
      if (validatedData.password) {
        updates.password_hash = await bcrypt.hash(validatedData.password, 10);
      }
      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password_hash, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getTasks();
      res.json({ tasks: tasks2 });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/tasks/my", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const tasks2 = await storage.getTasksByUserId(userId);
      res.json({ tasks: tasks2 });
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    console.log("\u{1F4E5} [POST /api/tasks] Request received");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    try {
      const {
        title,
        description,
        hotel,
        blok,
        soba,
        priority,
        userId,
        userName,
        userDepartment,
        images,
        status,
        assigned_to,
        assigned_to_name,
        is_recurring,
        recurrence_pattern,
        recurrence_end_date
      } = req.body;
      if (!title || !description || !hotel || !blok || !userId || !userName || !userDepartment) {
        return res.status(400).json({
          error: "Missing required fields"
        });
      }
      const locationParts = [hotel, blok];
      if (soba) locationParts.push(soba);
      const location = locationParts.join(", ");
      const taskData = {
        title,
        description,
        location,
        room_number: soba || null,
        priority: priority || "normal",
        status: status || "new",
        created_by: userId,
        created_by_name: userName,
        created_by_department: userDepartment,
        images: images || null
      };
      if (assigned_to) {
        taskData.assigned_to = assigned_to;
        taskData.assigned_to_name = assigned_to_name;
      }
      if (is_recurring !== void 0) {
        taskData.is_recurring = is_recurring;
        taskData.recurrence_pattern = recurrence_pattern || "once";
        if (recurrence_end_date) {
          taskData.recurrence_end_date = recurrence_end_date;
        }
        if (is_recurring && recurrence_pattern !== "once") {
          taskData.next_occurrence = /* @__PURE__ */ new Date();
        }
      }
      const task = await storage.createTask(taskData);
      const creator = await storage.getUserById(userId);
      const userRole = creator?.role || "unknown";
      await storage.createTaskHistory({
        task_id: task.id,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action: "task_created",
        status_to: status || "new",
        notes: description,
        assigned_to: assigned_to || null,
        assigned_to_name: assigned_to_name || null
      });
      res.json({ task });
    } catch (error) {
      console.error("\u274C [ERROR] Error creating task:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Request body:", req.body);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        assigned_to,
        assigned_to_name,
        user_id,
        user_name,
        worker_report,
        worker_images,
        external_company_name
      } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const currentTask = await storage.getTaskById(id);
      const updateData = { status };
      if (assigned_to !== void 0) {
        updateData.assigned_to = assigned_to ? assigned_to.replace(/\s/g, "") : null;
      }
      if (assigned_to_name !== void 0) {
        updateData.assigned_to_name = assigned_to_name || null;
      }
      if (worker_report) updateData.worker_report = worker_report;
      if (worker_images !== void 0) {
        updateData.worker_images = worker_images.length > 0 ? worker_images : [];
      }
      if (external_company_name !== void 0) {
        updateData.external_company_name = external_company_name || null;
      }
      if (status === "completed" && currentTask?.status !== "completed") {
        updateData.completed_at = /* @__PURE__ */ new Date();
        if (user_id && user_name) {
          updateData.completed_by = user_id;
          updateData.completed_by_name = user_name;
        }
      }
      if (status !== "completed" && currentTask?.status === "completed") {
        updateData.completed_at = null;
        updateData.completed_by = null;
        updateData.completed_by_name = null;
      }
      const task = await storage.updateTask(id, updateData);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (user_id && user_name) {
        const updater = await storage.getUserById(user_id);
        const userRole = updater?.role || "unknown";
        let actionMessage = null;
        if (worker_report) {
          if (status === "completed") {
            actionMessage = `Completed: ${worker_report}`;
          } else if (status === "returned_to_sef") {
            actionMessage = `Returned to Supervisor: ${worker_report}`;
          } else if (status === "returned_to_operator") {
            actionMessage = `Returned to Operator: ${worker_report}`;
          }
        } else if (assigned_to !== void 0) {
          actionMessage = assigned_to ? `Assigned to ${assigned_to_name || "technician(s)"}` : "Cleared technician assignment";
        }
        await storage.createTaskHistory({
          task_id: id,
          user_id,
          user_name,
          user_role: userRole,
          action: "status_changed",
          status_from: currentTask?.status,
          status_to: status,
          notes: actionMessage,
          assigned_to: updateData.assigned_to || null,
          assigned_to_name: updateData.assigned_to_name || null
        });
      }
      if (assigned_to && (status === "assigned_to_radnik" || status === "with_sef")) {
        notifyWorkers(assigned_to, task);
      }
      notifyTaskUpdate(id, status);
      res.json({ task });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json({ technicians });
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/cron/trigger-now", async (req, res) => {
    try {
      console.log("[MANUAL TRIGGER] Triggering recurring tasks processing NOW...");
      const result = await processRecurringTasks();
      res.json({ message: "Manual trigger executed", result });
    } catch (error) {
      console.error("[MANUAL TRIGGER] Error:", error);
      res.status(500).json({ error: "Failed to trigger cron job" });
    }
  });
  app2.post("/api/cron/process-recurring-tasks", async (req, res) => {
    try {
      const result = await processRecurringTasks();
      res.json(result);
    } catch (error) {
      console.error("[CRON] Error in process-recurring-tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  return server;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    proxy: {
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/cron.ts
var CRON_INTERVAL = 15 * 60 * 1e3;
var cronInterval = null;
async function runRecurringTasksJob() {
  try {
    console.log("[CRON SCHEDULER] Triggering recurring tasks processing...");
    const result = await processRecurringTasks();
    console.log("[CRON SCHEDULER] Result:", result);
    if (result.processed > 0) {
      console.log(`[CRON SCHEDULER] \u2705 Created ${result.processed} new task(s)`);
    } else {
      console.log("[CRON SCHEDULER] No tasks to process");
    }
  } catch (error) {
    console.error("[CRON SCHEDULER] Error processing recurring tasks:", error);
  }
}
function startCronScheduler() {
  if (cronInterval) {
    console.log("[CRON SCHEDULER] Already running");
    return;
  }
  console.log(`[CRON SCHEDULER] Starting... Will run every ${CRON_INTERVAL / 1e3 / 60} minutes`);
  setTimeout(() => {
    runRecurringTasksJob();
  }, 5e3);
  cronInterval = setInterval(() => {
    runRecurringTasksJob();
  }, CRON_INTERVAL);
  console.log("[CRON SCHEDULER] \u2705 Started successfully");
}

// server/index.ts
var app = express2();
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("FATAL: SESSION_SECRET must be set and at least 32 characters long");
  console.error("Generate a strong secret with: openssl rand -base64 32");
  process.exit(1);
}
var PgSession = ConnectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);
app.use(express2.json({
  limit: "50mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false, limit: "50mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    startCronScheduler();
  });
})();
