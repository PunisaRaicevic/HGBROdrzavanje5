import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { processRecurringTasks, ensureChildTasksExist } from "./services/recurringTaskProcessor";
import { initializeSocket, notifyWorkers, notifyTaskUpdate } from "./socket";
import { z } from "zod";
import { generateToken, verifyToken, extractTokenFromHeader } from "./auth";
import { sendOneSignalToUser } from "./services/onesignal";
// --- NOVI IMPORTI ZA NOTIFIKACIJE ---
import { sendPushNotification } from "./services/notificationService";

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum([
    "admin",
    "operater",
    "sef",
    "radnik",
    "serviser",
    "recepcioner",
    "menadzer",
  ]),
  job_title: z.string().optional(), 
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

const updateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email().optional(),
  password: z.string().min(4, "Password must be at least 4 characters").optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum([
      "admin",
      "operater",
      "sef",
      "radnik",
      "serviser",
      "recepcioner",
      "menadzer",
    ]).optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Authentication middleware
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  // Initialize session if it doesn't exist
  if (!req.session) {
    req.session = {};
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.session.userId = payload.userId;
      req.session.userRole = payload.role;
      req.session.username = payload.username;
      req.session.fullName = payload.fullName;
      console.log(`[AUTH] User authenticated via JWT: ${payload.userId}`);
      return next();
    }
  }

  if (req.session.userId) {
    console.log(`[AUTH] User authenticated via session: ${req.session.userId}`);
    return next();
  }

  console.log('[AUTH] Authentication failed - no token or session');
  return res.status(401).json({ error: "Authentication required" });
}

// Admin authorization middleware
async function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.session.userId = payload.userId;
      req.session.userRole = payload.role;
      req.session.username = payload.username;
      req.session.fullName = payload.fullName;

      if (payload.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      return next();
    }
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Middleware to log ALL requests to /api/users/fcm-token
  app.use("/api/users/fcm-token", (req, res, next) => {
    console.log(`[MIDDLEWARE] SVEPOSTUPAK NA /api/users/fcm-token - Method: ${req.method}, IP: ${req.ip}`);
    console.log(`[MIDDLEWARE] Auth header: ${req.headers.authorization ? "EXISTS" : "MISSING"}`);
    console.log(`[MIDDLEWARE] Body: ${JSON.stringify(req.body)}`);
    next();
  });

  initializeSocket(server);
  console.log("[INIT] Socket.IO initialized for real-time notifications");

  // Supabase Webhook - Task assigned notification (MULTI-RECIPIENT SUPPORT)
  app.post("/api/webhooks/tasks", async (req, res) => {
    try {
      // Verify webhook secret
      const webhookSecret = req.headers['x-supabase-webhook-secret'];
      const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;

      if (!expectedSecret || webhookSecret !== expectedSecret) {
        console.error('❌ Unauthorized webhook access - invalid secret');
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const webhookData = req.body;
      console.log('📥 Webhook primljen:', JSON.stringify(webhookData, null, 2));

      const newRecord = webhookData.record;
      if (!newRecord) {
        console.error('❌ Missing record in webhook data');
        return res.status(400).json({ error: 'Missing record data' });
      }

      // IMPORTANT: Skip notification for future scheduled tasks (recurring task children)
      // These will be notified by the daily scheduler at 8:00 AM on their scheduled date
      if (newRecord.scheduled_for) {
        const scheduledDate = new Date(newRecord.scheduled_for);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        
        if (scheduledDate > today) {
          console.log(`⏰ Zadatak ${newRecord.id} je zakazan za ${newRecord.scheduled_for} - notifikacija ce biti poslana tog dana u 8h`);
          return res.status(200).json({ 
            message: 'Scheduled task - notification will be sent on scheduled date',
            scheduled_for: newRecord.scheduled_for
          });
        }
      }

      const assignedTo = newRecord.assigned_to;
      const taskTitle = newRecord.title || 'Novi zadatak!';
      const taskDescription = newRecord.description || 'Imate novi zadatak.';
      const taskId = newRecord.id;

      if (!assignedTo) {
        console.warn('⚠️ Missing recipient ID - skipping notification');
        return res.status(200).json({ message: 'No recipient for notification' });
      }

      // Support multiple recipients (comma-separated IDs)
      const recipientUserIds = assignedTo.split(',').map((id: string) => id.trim()).filter(Boolean);

      if (recipientUserIds.length === 0) {
        console.warn('⚠️ No valid recipient IDs after parsing - skipping notification');
        return res.status(200).json({ message: 'No recipients for notification' });
      }

      console.log(`📨 Slanje notifikacija za ${recipientUserIds.length} radnika: ${recipientUserIds.join(', ')}`);

      // Send FCM notifications to ALL recipients
      const { sendPushToAllUserDevices } = await import('./services/firebase');
      
      let totalSent = 0;
      let totalFailed = 0;

      for (const userId of recipientUserIds) {
        const result = await sendPushToAllUserDevices(
          userId,
          taskTitle,
          taskDescription.substring(0, 200),
          taskId,
          'urgent'
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }

      console.log(`✅ Webhook processed: ${totalSent} sent, ${totalFailed} failed (${recipientUserIds.length} recipients)`);
      res.status(200).json({ 
        message: 'Webhook processed', 
        sent: totalSent, 
        failed: totalFailed,
        recipients: recipientUserIds.length
      });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Authentication endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("Login attempt for:", username);

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user || !user.is_active) {
        console.log("User not found:", username);
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isBcryptHash =
        user.password_hash?.startsWith("$2a$") ||
        user.password_hash?.startsWith("$2b$") ||
        user.password_hash?.startsWith("$2y$");

      let isValidPassword = false;

      if (isBcryptHash) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        isValidPassword = password === user.password_hash;
        if (isValidPassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await storage.updateUser(user.id, { password_hash: hashedPassword });
        }
      }

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Internal server error" });
        }

        req.session.userId = user.id;
        req.session.userRole = user.role;

        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Internal server error" });
          }

          const jwtToken = generateToken({
            userId: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name,
          });

          const { password_hash, ...userWithoutPassword } = user;

          res.json({
            user: userWithoutPassword,
            token: jwtToken,
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user session
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      let userId: string | undefined;

      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          userId = payload.userId;
          req.session.userId = payload.userId;
          req.session.userRole = payload.role;
          req.session.username = payload.username;
          req.session.fullName = payload.fullName;
        }
      } else if (req.session.userId) {
        userId = req.session.userId;
      }

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(userId);

      if (!user || !user.is_active) {
        if (!token && req.session.userId) {
          req.session.destroy(() => {});
        }
        return res.status(401).json({ error: "Session invalid" });
      }

      if (!token && req.session.userId) {
        req.session.touch();
      }

      const { password_hash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Register OneSignal Player ID
  app.post("/api/users/onesignal-player-id", requireAuth, async (req, res) => {
    try {
      const { playerId } = req.body;

      if (!playerId || typeof playerId !== "string") {
        return res.status(400).json({ error: "Valid Player ID is required" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase
        .from('users')
        .update({ onesignal_player_id: playerId })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      console.log(`✅ OneSignal Player ID registered for user ${userId}`);
      res.json({ success: true, message: "OneSignal Player ID registered successfully" });
    } catch (error) {
      console.error("Error registering OneSignal Player ID:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register FCM Token - Save to user_device_tokens table
  app.post("/api/users/fcm-token", async (req, res) => {
    console.log('[FCM TOKEN ENDPOINT] === START ===');
    
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    let userId: string | null = null;
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }
    
    if (!userId) {
      console.error('[FCM TOKEN ENDPOINT] No valid JWT token');
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { fcmToken, token: bodyToken, platform } = req.body;
      const tokenValue = fcmToken || bodyToken;

      if (!tokenValue) {
        console.error('[FCM TOKEN ENDPOINT] No token in body');
        return res.status(400).json({ error: "Token required" });
      }

      const detectedPlatform = platform || 'web';
      console.log(`[FCM TOKEN ENDPOINT] Saving FCM token for user ${userId} on platform ${detectedPlatform}, token length: ${tokenValue.length}`);
      
      // Koristi novu saveDeviceToken metodu
      const deviceToken = await storage.saveDeviceToken({
        user_id: userId,
        fcm_token: tokenValue,
        platform: detectedPlatform
      });
      
      console.log(`[FCM TOKEN ENDPOINT] Token saved successfully, device ID: ${deviceToken.id}`);

      console.log(`[FCM TOKEN ENDPOINT] SUCCESS! Token stored in user_device_tokens table`);
      console.log('[FCM TOKEN ENDPOINT] === END ===');
      res.json({ 
        success: true, 
        userId,
        tokenId: deviceToken.id,
        message: "FCM token registered successfully"
      });
    } catch (error) {
      console.error('[FCM TOKEN ENDPOINT] CATCH ERROR:', error);
      res.status(500).json({ error: "Internal server error", details: String(error) });
    }
  });

  // Debug Logger
  app.post("/api/debug/log", (req, res) => {
    try {
      const { level, args, timestamp, platform } = req.body;
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📱';
      console.log(`${prefix} [APP ${platform?.toUpperCase() || 'UNKNOWN'}] [${timestamp}]:`, ...args);
      res.json({ ok: true });
    } catch (error) {
      res.json({ ok: false });
    }
  });

  // Admin: Get all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password_hash, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create new user
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validationResult = createUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const userData = validationResult.data;
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = await storage.createUser({
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        job_title: userData.job_title || null,
        department: userData.department || null,
        phone: userData.phone || null,
        password_hash: hashedPassword,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
      });

      const { password_hash, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Update user
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validationResult = updateUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const validatedData = validationResult.data;
      const updates: any = {};

      if (validatedData.username !== undefined) updates.username = validatedData.username;
      if (validatedData.email !== undefined) updates.email = validatedData.email;
      if (validatedData.full_name !== undefined) updates.full_name = validatedData.full_name;
      if (validatedData.role !== undefined) updates.role = validatedData.role;
      if (validatedData.job_title !== undefined) updates.job_title = validatedData.job_title;
      if (validatedData.department !== undefined) updates.department = validatedData.department;
      if (validatedData.phone !== undefined) updates.phone = validatedData.phone;
      if (validatedData.is_active !== undefined) updates.is_active = validatedData.is_active;

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

  // Admin: Deactivate user
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.session.userId;

      if (id === currentUserId) {
        return res.status(400).json({ error: "Ne možete deaktivirati svoj nalog dok ste prijavljeni." });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen." });
      }

      const deactivated = await storage.deleteUser(id);

      if (!deactivated) {
        return res.status(500).json({ error: "Nije moguće deaktivirati korisnika." });
      }

      console.log(`[USER DEACTIVATE] User ${user.full_name} (${id}) deactivated by admin ${currentUserId}`);

      res.json({ success: true, message: "Korisnik je uspešno deaktiviran." });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  function calculateAssignmentPath(history: any[]): string {
    if (!history || history.length === 0) return "";

    const names: string[] = [];
    let lastAddedName: string | null = null;

    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sortedHistory.length; i++) {
      const entry = sortedHistory[i];
      if (entry.action === "task_created") continue;

      const statusTo = entry.status_to;

      if (statusTo === "assigned_to_radnik" || statusTo === "with_external") {
        if (entry.user_name && entry.user_name !== lastAddedName) {
          names.push(entry.user_name);
          lastAddedName = entry.user_name;
        }
        if (entry.assigned_to_name && entry.assigned_to_name !== lastAddedName) {
          names.push(entry.assigned_to_name);
          lastAddedName = entry.assigned_to_name;
        }
      } else if (statusTo === "returned_to_sef" || statusTo === "returned_to_operator") {
        if (entry.user_name && entry.user_name !== lastAddedName) {
          names.push(entry.user_name);
          lastAddedName = entry.user_name;
        }
        for (let j = i + 1; j < sortedHistory.length; j++) {
          const nextEntry = sortedHistory[j];
          if (nextEntry.status_to !== statusTo) {
            if (nextEntry.user_name && nextEntry.user_name !== lastAddedName) {
              names.push(nextEntry.user_name);
              lastAddedName = nextEntry.user_name;
            }
            break;
          }
        }
      } else if (statusTo === "with_operator" || statusTo === "with_sef") {
        if (entry.user_name && entry.user_name !== lastAddedName) {
          names.push(entry.user_name);
          lastAddedName = entry.user_name;
        }
      } else if (statusTo === "completed") {
        if (entry.user_name && entry.user_name !== lastAddedName) {
          names.push(entry.user_name);
          lastAddedName = entry.user_name;
        }
      }
    }
    return names.join(" → ");
  }

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const taskIds = tasks.map((task) => task.id);
      const allHistories = await storage.getTaskHistoriesForTasks(taskIds);

      const historiesByTaskId = new Map<string, any[]>();
      for (const history of allHistories) {
        if (!historiesByTaskId.has(history.task_id)) {
          historiesByTaskId.set(history.task_id, []);
        }
        historiesByTaskId.get(history.task_id)!.push(history);
      }

      const tasksWithPaths = tasks.map((task) => ({
        ...task,
        assignment_path: calculateAssignmentPath(historiesByTaskId.get(task.id) || []),
      }));

      res.json({ tasks: tasksWithPaths });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  function extractReturnReasons(history: any[]): Array<{ user_name: string; reason: string; timestamp: string }> {
    const reasons: Array<{ user_name: string; reason: string; timestamp: string }> = [];
    for (const entry of history) {
      if ((entry.status_to === "returned_to_sef" || entry.status_to === "returned_to_operator") && entry.notes) {
        const match = entry.notes.match(/Returned to (?:Supervisor|Operator):\s*([\s\S]+)/);
        if (match && match[1]) {
          reasons.push({
            user_name: entry.user_name || "Unknown",
            reason: match[1].trim(),
            timestamp: entry.timestamp,
          });
        }
      }
    }
    return reasons.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  app.get("/api/tasks/:id/history", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getTaskHistory(id);
      const return_reasons = extractReturnReasons(history);
      res.json({ history, return_reasons });
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tasks/my", requireAuth, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "User ID is required" });

      const tasks = await storage.getTasksByUserId(userId);
      res.json({ tasks });
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    console.log("📥 [POST /api/tasks] Request received");
    try {
      const {
        title, description, hotel, blok, soba, priority, userId, userName, userDepartment,
        images, status, assigned_to, assigned_to_name, is_recurring, recurrence_pattern, recurrence_start_date,
      } = req.body;

      if (!title || !description || !hotel || !blok || !userId || !userName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const locationParts = [hotel, blok];
      if (soba) locationParts.push(soba);
      const location = locationParts.join(", ");

      const taskData: any = {
        title, description, location,
        room_number: soba || null,
        priority: priority || "normal",
        status: status || "new",
        created_by: userId,
        created_by_name: userName,
        created_by_department: userDepartment || null,
        images: images || null,
      };

      if (assigned_to) {
        taskData.assigned_to = assigned_to;
        taskData.assigned_to_name = assigned_to_name;
      }

      if (is_recurring !== undefined) {
        taskData.is_recurring = is_recurring;
        taskData.recurrence_pattern = recurrence_pattern || "once";
        if (recurrence_start_date) taskData.recurrence_start_date = recurrence_start_date;
        if (is_recurring && recurrence_pattern !== "once") {
          taskData.next_occurrence = recurrence_start_date || new Date();
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
        assigned_to_name: assigned_to_name || null,
      });

      if (is_recurring && recurrence_pattern && recurrence_pattern !== 'once' && assigned_to) {
        try {
          await ensureChildTasksExist(task);
        } catch (childError) {
          console.error('[RECURRING] Error creating child tasks:', childError);
        }
      }

      res.json({ task });
    } catch (error) {
      console.error("❌ [ERROR] Error creating task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // Update task status/assignment
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status, assigned_to, assigned_to_name, worker_report,
        worker_images, external_company_name, receipt_confirmed_at,
        title, description, hotel, blok, soba, room_number, priority, images,
        is_recurring, recurrence_pattern, recurrence_week_days, recurrence_month_days,
        recurrence_year_dates, execution_hour, execution_minute,
      } = req.body;

      if (!id) return res.status(400).json({ error: "Task ID is required" });

      const sessionUser = await storage.getUserById(req.session.userId);
      if (!sessionUser) return res.status(401).json({ error: "Invalid session" });

      const currentTask = await storage.getTaskById(id);
      if (!currentTask) return res.status(404).json({ error: "Task not found" });

      const updateData: any = {};

      // Basic task details (only sef and admin can edit)
      const isEditingDetails = title !== undefined || description !== undefined || hotel !== undefined || 
          blok !== undefined || soba !== undefined || room_number !== undefined || 
          priority !== undefined || images !== undefined;
      const isEditingRecurrence = is_recurring !== undefined || recurrence_pattern !== undefined ||
          recurrence_week_days !== undefined || recurrence_month_days !== undefined ||
          recurrence_year_dates !== undefined || execution_hour !== undefined || execution_minute !== undefined;
      
      if (isEditingDetails || isEditingRecurrence) {
        if (sessionUser.role !== 'sef' && sessionUser.role !== 'admin') {
          return res.status(403).json({ error: "Only supervisors and admins can edit task details" });
        }
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        // Note: hotel, blok, soba are not separate columns in DB - only location exists
        if (room_number !== undefined) updateData.room_number = room_number;
        if (priority !== undefined) updateData.priority = priority;
        if (images !== undefined) updateData.images = images;
        // Update location based on hotel+blok+soba from request body
        if (hotel !== undefined && blok !== undefined) {
          updateData.location = soba ? `${hotel}, ${blok}, Soba ${soba}` : `${hotel}, ${blok}`;
        }
        if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
        if (recurrence_pattern !== undefined) updateData.recurrence_pattern = recurrence_pattern;
        if (recurrence_week_days !== undefined) updateData.recurrence_week_days = recurrence_week_days;
        if (recurrence_month_days !== undefined) updateData.recurrence_month_days = recurrence_month_days;
        if (recurrence_year_dates !== undefined) updateData.recurrence_year_dates = recurrence_year_dates;
        if (execution_hour !== undefined) updateData.execution_hour = execution_hour;
        if (execution_minute !== undefined) updateData.execution_minute = execution_minute;
      }

      if (status !== undefined) updateData.status = status;
      if (assigned_to !== undefined) {
        updateData.assigned_to = assigned_to ? assigned_to.replace(/\s/g, "") : null;
      }
      if (assigned_to_name !== undefined) updateData.assigned_to_name = assigned_to_name || null;
      if (worker_report) updateData.worker_report = worker_report;
      if (worker_images !== undefined) updateData.worker_images = worker_images.length > 0 ? worker_images : [];
      if (external_company_name !== undefined) updateData.external_company_name = external_company_name || null;

      if (receipt_confirmed_at) {
        const assignedIds = currentTask?.assigned_to ? currentTask.assigned_to.split(",").map((id) => id.trim()) : [];
        if (!assignedIds.includes(sessionUser.id)) {
          return res.status(403).json({ error: "Only assigned worker can confirm receipt" });
        }
        updateData.receipt_confirmed_at = new Date(receipt_confirmed_at);
        updateData.receipt_confirmed_by = sessionUser.id;
        updateData.receipt_confirmed_by_name = sessionUser.full_name;
      }

      if (assigned_to !== undefined) {
        const normalizedCurrentAssignment = currentTask?.assigned_to?.replace(/\s/g, "") || null;
        const normalizedNewAssignment = assigned_to ? assigned_to.replace(/\s/g, "") : null;
        if (normalizedCurrentAssignment !== normalizedNewAssignment) {
          updateData.receipt_confirmed_at = null;
          updateData.receipt_confirmed_by = null;
          updateData.receipt_confirmed_by_name = null;
        }
      }

      if (status !== undefined && status !== "assigned_to_radnik" && currentTask?.status === "assigned_to_radnik") {
        updateData.receipt_confirmed_at = null;
        updateData.receipt_confirmed_by = null;
        updateData.receipt_confirmed_by_name = null;
      }

      if (status === "completed" && currentTask?.status !== "completed") {
        updateData.completed_at = new Date();
        updateData.completed_by = sessionUser.id;
        updateData.completed_by_name = sessionUser.full_name;
      }

      if (status !== "completed" && currentTask?.status === "completed") {
        updateData.completed_at = null;
        updateData.completed_by = null;
        updateData.completed_by_name = null;
      }

      const task = await storage.updateTask(id, updateData);
      if (!task) return res.status(404).json({ error: "Task not found" });

      let actionMessage = null;
      if (receipt_confirmed_at) actionMessage = `Receipt confirmed by ${sessionUser.full_name}`;
      else if (worker_report) {
        if (status === "completed") actionMessage = `Completed: ${worker_report}`;
        else if (status === "returned_to_sef") actionMessage = `Returned to Supervisor: ${worker_report}`;
        else if (status === "returned_to_operator") actionMessage = `Returned to Operator: ${worker_report}`;
      } else if (assigned_to !== undefined) {
        actionMessage = assigned_to ? `Assigned to ${assigned_to_name || "technician(s)"}` : "Cleared technician assignment";
      }

      await storage.createTaskHistory({
        task_id: id,
        user_id: sessionUser.id,
        user_name: sessionUser.full_name,
        user_role: sessionUser.role,
        action: "status_changed",
        status_from: currentTask?.status,
        status_to: status || currentTask.status,
        notes: actionMessage,
        assigned_to: updateData.assigned_to !== undefined ? updateData.assigned_to : currentTask.assigned_to,
        assigned_to_name: updateData.assigned_to_name !== undefined ? updateData.assigned_to_name : currentTask.assigned_to_name,
      });

      // POSTOJEĆA LOGIKA ZA NOTIFIKACIJE KOD DODELJIVANJA (Ostaje jer radi)
      if (assigned_to && (status === "assigned_to_radnik" || status === "with_sef")) {
        notifyWorkers(assigned_to, task);
        const workerIds = assigned_to.split(",").map((id: string) => id.trim());

        for (const workerId of workerIds) {
          // Koristimo postojeći OneSignal servis (ili možeš zameniti sa novim, svejedno je)
          sendOneSignalToUser(
            workerId,
            `Nova reklamacija #${task.id.slice(0, 8)}`,
            `${task.location || task.title} - ${task.priority === "urgent" ? "HITNO" : task.description || "Kliknite za detalje"}`,
            task.id,
            task.priority as "urgent" | "normal" | "can_wait"
          ).catch((error) => {
            console.error(`⚠️ Greška pri slanju OneSignal push-a radniku ${workerId}:`, error);
          });
        }
      }

      notifyTaskUpdate(task);
      res.json({ task });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "Task ID is required" });

      const sessionUser = await storage.getUserById(req.session.userId);
      if (!sessionUser) return res.status(401).json({ error: "Invalid session" });

      if (sessionUser.role !== 'sef' && sessionUser.role !== 'admin') {
        return res.status(403).json({ error: "Only supervisors and admins can delete tasks" });
      }

      const task = await storage.getTaskById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const isRecurringTemplate = task.is_recurring && !task.parent_task_id;
      let deletedChildCount = 0;

      if (isRecurringTemplate) {
        const childTasks = await storage.getChildTasksByParentId(id);
        const finalizedStatuses = ['completed', 'cancelled'];
        const pendingChildTasks = childTasks.filter(child => !finalizedStatuses.includes(child.status));

        for (const childTask of pendingChildTasks) {
          await storage.createTaskHistory({
            task_id: childTask.id,
            user_id: sessionUser.id,
            user_name: sessionUser.full_name,
            user_role: sessionUser.role,
            action: "task_deleted",
            status_to: "deleted",
            notes: `Child task auto-deleted due to recurring template deletion by ${sessionUser.full_name}`,
          });
          await storage.deleteTask(childTask.id);
          deletedChildCount++;
        }
      }

      await storage.createTaskHistory({
        task_id: id,
        user_id: sessionUser.id,
        user_name: sessionUser.full_name,
        user_role: sessionUser.role,
        action: "task_deleted",
        status_to: "deleted",
        notes: `Task deleted by ${sessionUser.full_name}${isRecurringTemplate ? ` (recurring template, ${deletedChildCount} future tasks deleted)` : task.parent_task_id ? ' (recurring instance)' : ''}`,
      });

      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully", deletedChildTasks: deletedChildCount });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get technicians
  app.get("/api/technicians", requireAuth, async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json({ technicians });
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cron jobs
  app.post("/api/cron/trigger-now", requireAdmin, async (req, res) => {
    try {
      const result = await processRecurringTasks();
      res.json({ message: "Manual trigger executed", result });
    } catch (error) {
      console.error("[MANUAL TRIGGER] Error:", error);
      res.status(500).json({ error: "Failed to trigger cron job" });
    }
  });

  app.post("/api/cron/process-recurring-tasks", requireAdmin, async (req, res) => {
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