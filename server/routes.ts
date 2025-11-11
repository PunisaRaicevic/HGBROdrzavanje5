import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { processRecurringTasks } from "./services/recurringTaskProcessor";
import { initializeSocket, notifyWorkers, notifyTaskUpdate } from "./socket";
import { z } from "zod";

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["admin", "operater", "sef", "radnik", "serviser", "recepcioner", "menadzer"]),
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional()
});

const updateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  email: z.string().email().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum(["admin", "operater", "sef", "radnik", "serviser", "recepcioner", "menadzer"]).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional()
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Admin authorization middleware
function requireAdmin(req: any, res: any, next: any) {
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
  
  // Initialize Socket.IO for real-time notifications
  initializeSocket(server);
  console.log('[INIT] Socket.IO initialized for real-time notifications');
  // Authentication endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      console.log('Login attempt for:', username);

      if (!username || !password) {
        return res.status(400).json({ 
          error: "Username and password are required" 
        });
      }

      // Query user from database by username
      const user = await storage.getUserByUsername(username);

      if (!user || !user.is_active) {
        console.log('User not found:', username);
        return res.status(401).json({ 
          error: "Invalid username or password" 
        });
      }
      console.log('User found, checking password...');

      // Check if password is plaintext or bcrypt hash
      const isBcryptHash = user.password_hash?.startsWith('$2a$') || 
                          user.password_hash?.startsWith('$2b$') || 
                          user.password_hash?.startsWith('$2y$');
      
      let isValidPassword = false;

      if (isBcryptHash) {
        // Password is already hashed - use bcrypt.compare
        isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Password (hashed) valid:', isValidPassword);
      } else {
        // Password is plaintext - compare directly
        isValidPassword = password === user.password_hash;
        console.log('Password (plaintext) valid:', isValidPassword);
        
        // If valid, hash it and update in database for security
        if (isValidPassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const updated = await storage.updateUser(user.id, { password_hash: hashedPassword });
          
          if (updated) {
            console.log('✅ Plaintext password converted to bcrypt hash for user:', username);
          } else {
            console.error('⚠️ Failed to update password hash');
          }
        }
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: "Invalid username or password" 
        });
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ error: "Internal server error" });
        }

        // Set session data after regeneration
        req.session.userId = user.id;
        req.session.userRole = user.role;

        // Save session before sending response
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.status(500).json({ error: "Internal server error" });
          }

          // Return user data (without password hash)
          const { password_hash, ...userWithoutPassword } = user;
          
          res.json({ 
            user: userWithoutPassword 
          });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: "Internal server error" 
      });
    }
  });

  // Get current user session
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(req.session.userId);
      
      if (!user || !user.is_active) {
        // Clear invalid session
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Session invalid" });
      }

      // Refresh session activity
      req.session.touch();

      // Return user data (without password hash)
      const { password_hash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Admin: Get all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove password hashes from response
      const usersWithoutPasswords = users.map(({ password_hash, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Create new user
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      // Validate input with Zod
      const validationResult = createUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }

      const userData = validationResult.data;

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: "User with this email already exists" });
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user with only validated fields
      const newUser = await storage.createUser({
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department || null,
        phone: userData.phone || null,
        password_hash: hashedPassword,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Update user
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Validate input with Zod
      const validationResult = updateUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }

      const validatedData = validationResult.data;
      const updates: any = {};

      // Only include validated fields that were provided
      if (validatedData.username !== undefined) updates.username = validatedData.username;
      if (validatedData.email !== undefined) updates.email = validatedData.email;
      if (validatedData.full_name !== undefined) updates.full_name = validatedData.full_name;
      if (validatedData.role !== undefined) updates.role = validatedData.role;
      if (validatedData.department !== undefined) updates.department = validatedData.department;
      if (validatedData.phone !== undefined) updates.phone = validatedData.phone;
      if (validatedData.is_active !== undefined) updates.is_active = validatedData.is_active;

      // If password is being updated, hash it
      if (validatedData.password) {
        updates.password_hash = await bcrypt.hash(validatedData.password, 10);
      }

      const updatedUser = await storage.updateUser(id, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get tasks
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's own tasks/complaints
  app.get("/api/tasks/my", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const tasks = await storage.getTasksByUserId(userId);
      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new task/complaint
  app.post("/api/tasks", requireAuth, async (req, res) => {
    console.log('📥 [POST /api/tasks] Request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { 
        title, 
        description, 
        hotel, 
        blok, 
        soba, 
        priority, 
        images,
        status,
        assigned_to,
        assigned_to_name,
        is_recurring,
        recurrence_pattern,
        recurrence_end_date
      } = req.body;

      // Get user info from session
      const sessionUserId = req.session.userId;
      if (!sessionUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserById(sessionUserId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userId = user.id;
      const userName = user.full_name;
      const userDepartment = user.department || 'N/A';

      // Validation - only require task details, not user info
      if (!title || !description || !hotel || !blok) {
        return res.status(400).json({ 
          error: "Missing required fields (title, description, hotel, blok)" 
        });
      }

      // Construct location string
      const locationParts = [hotel, blok];
      if (soba) locationParts.push(soba);
      const location = locationParts.join(', ');

      // Prepare task data
      const taskData: any = {
        title,
        description,
        location,
        room_number: soba || null,
        priority: priority || 'normal',
        status: status || 'new',
        created_by: userId,
        created_by_name: userName,
        created_by_department: userDepartment,
        images: images || null
      };

      // Add assignment data if provided
      if (assigned_to) {
        taskData.assigned_to = assigned_to;
        taskData.assigned_to_name = assigned_to_name;
      }

      // Add recurring data if provided
      if (is_recurring !== undefined) {
        taskData.is_recurring = is_recurring;
        taskData.recurrence_pattern = recurrence_pattern || 'once';
        if (recurrence_end_date) {
          taskData.recurrence_end_date = recurrence_end_date;
        }
        // Set next occurrence for recurring tasks
        if (is_recurring && recurrence_pattern !== 'once') {
          taskData.next_occurrence = new Date();
        }
      }

      // Create task
      const task = await storage.createTask(taskData);

      // Fetch user role from database for task history
      const creator = await storage.getUserById(userId);
      const userRole = creator?.role || 'unknown';

      // Create task history entry
      await storage.createTaskHistory({
        task_id: task.id,
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        action: 'task_created',
        status_to: status || 'new',
        notes: description,
        assigned_to: assigned_to || null,
        assigned_to_name: assigned_to_name || null
      });

      res.json({ task });
    } catch (error) {
      console.error('❌ [ERROR] Error creating task:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Request body:', req.body);
      res.status(500).json({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update task status/assignment
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        status, 
        assigned_to, 
        assigned_to_name, 
        worker_report,
        worker_images,
        external_company_name,
        receipt_confirmed_at
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Task ID is required" });
      }

      // Get authenticated user from session
      const sessionUser = await storage.getUserById(req.session.userId);
      if (!sessionUser) {
        return res.status(401).json({ error: "Invalid session" });
      }

      // Get current task to record history
      const currentTask = await storage.getTaskById(id);

      if (!currentTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Update task
      const updateData: any = {};
      
      // Add status to update only if provided
      if (status !== undefined) {
        updateData.status = status;
      }
      
      // Normalize assigned_to: remove all spaces for consistent storage
      // Treat empty string as explicit clear
      if (assigned_to !== undefined) {
        updateData.assigned_to = assigned_to ? assigned_to.replace(/\s/g, '') : null;
      }
      
      // Treat empty string as explicit clear for assigned_to_name
      if (assigned_to_name !== undefined) {
        updateData.assigned_to_name = assigned_to_name || null;
      }
      
      if (worker_report) updateData.worker_report = worker_report;
      
      // Handle worker_images: allow explicit clearing if empty array is sent
      if (worker_images !== undefined) {
        updateData.worker_images = worker_images.length > 0 ? worker_images : [];
      }

      // Handle external company assignment
      if (external_company_name !== undefined) {
        updateData.external_company_name = external_company_name || null;
      }

      // Track receipt confirmation when worker confirms receipt
      if (receipt_confirmed_at) {
        // Authorization: Only assigned worker can confirm receipt
        const assignedIds = currentTask?.assigned_to 
          ? currentTask.assigned_to.split(',').map(id => id.trim()) 
          : [];
        
        if (!assignedIds.includes(sessionUser.id)) {
          return res.status(403).json({ error: "Only assigned worker can confirm receipt" });
        }
        
        // Use session user data (not client-supplied)
        updateData.receipt_confirmed_at = new Date(receipt_confirmed_at);
        updateData.receipt_confirmed_by = sessionUser.id;
        updateData.receipt_confirmed_by_name = sessionUser.full_name;
      }

      // Clear receipt confirmation when task is reassigned or unassigned
      // (mirrors completion-field reset logic)
      if (assigned_to !== undefined) {
        const normalizedCurrentAssignment = currentTask?.assigned_to?.replace(/\s/g, '') || null;
        const normalizedNewAssignment = assigned_to ? assigned_to.replace(/\s/g, '') : null;
        
        // Clear if assignment changed (reassigned to different workers or cleared)
        if (normalizedCurrentAssignment !== normalizedNewAssignment) {
          updateData.receipt_confirmed_at = null;
          updateData.receipt_confirmed_by = null;
          updateData.receipt_confirmed_by_name = null;
        }
      }

      // Clear receipt confirmation if status explicitly changes away from assigned_to_radnik
      if (status !== undefined && status !== 'assigned_to_radnik' && currentTask?.status === 'assigned_to_radnik') {
        updateData.receipt_confirmed_at = null;
        updateData.receipt_confirmed_by = null;
        updateData.receipt_confirmed_by_name = null;
      }

      // Track who completed the task and when (only on transition to completed)
      if (status === 'completed' && currentTask?.status !== 'completed') {
        updateData.completed_at = new Date();
        updateData.completed_by = sessionUser.id;
        updateData.completed_by_name = sessionUser.full_name;
      }
      
      // Clear completed timestamp if moving away from completed status
      if (status !== 'completed' && currentTask?.status === 'completed') {
        updateData.completed_at = null;
        updateData.completed_by = null;
        updateData.completed_by_name = null;
      }

      const task = await storage.updateTask(id, updateData);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Create history entry using session user data
      // Determine action type and message
      let actionMessage = null;
      
      if (receipt_confirmed_at) {
        // Worker confirmed receipt of task
        actionMessage = `Receipt confirmed by ${sessionUser.full_name}`;
      } else if (worker_report) {
        // Worker submitted a report
        if (status === 'completed') {
          actionMessage = `Completed: ${worker_report}`;
        } else if (status === 'returned_to_sef') {
          actionMessage = `Returned to Supervisor: ${worker_report}`;
        } else if (status === 'returned_to_operator') {
          actionMessage = `Returned to Operator: ${worker_report}`;
        }
      } else if (assigned_to !== undefined) {
        // Operator assigned/cleared technicians
        actionMessage = assigned_to 
          ? `Assigned to ${assigned_to_name || 'technician(s)'}` 
          : 'Cleared technician assignment';
      }

      await storage.createTaskHistory({
        task_id: id,
        user_id: sessionUser.id,
        user_name: sessionUser.full_name,
        user_role: sessionUser.role,
        action: 'status_changed',
        status_from: currentTask?.status,
        status_to: status || currentTask.status,
        notes: actionMessage,
        assigned_to: updateData.assigned_to !== undefined ? updateData.assigned_to : currentTask.assigned_to,
        assigned_to_name: updateData.assigned_to_name !== undefined ? updateData.assigned_to_name : currentTask.assigned_to_name
      });

      // Send real-time notification via Socket.IO when task is assigned to worker(s)
      if (assigned_to && (status === 'assigned_to_radnik' || status === 'with_sef')) {
        notifyWorkers(assigned_to, task);
      }

      // Broadcast task update to all clients
      notifyTaskUpdate(id, status);

      res.json({ task });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get technicians (serviser and radnik roles)
  app.get("/api/technicians", async (req, res) => {
    try {
      const technicians = await storage.getTechnicians();
      res.json({ technicians });
    } catch (error) {
      console.error('Error fetching technicians:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Manual trigger for cron job (for testing)
  app.post("/api/cron/trigger-now", async (req, res) => {
    try {
      console.log('[MANUAL TRIGGER] Triggering recurring tasks processing NOW...');
      
      const result = await processRecurringTasks();
      res.json({ message: 'Manual trigger executed', result });
    } catch (error) {
      console.error('[MANUAL TRIGGER] Error:', error);
      res.status(500).json({ error: 'Failed to trigger cron job' });
    }
  });

  // Process recurring tasks (cron job endpoint)
  app.post("/api/cron/process-recurring-tasks", async (req, res) => {
    try {
      const result = await processRecurringTasks();
      res.json(result);
    } catch (error) {
      console.error('[CRON] Error in process-recurring-tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return server;
}
