import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server for real-time notifications
 * @param server - HTTP server instance
 */
export function initializeSocket(server: Server): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // In production, specify your domain
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] Client connected: ${socket.id}`);

    // When worker logs in, they join a room with their user ID
    socket.on('worker:join', (userId: string) => {
      console.log(`[SOCKET.IO] Worker joined room: ${userId}`);
      socket.join(`user:${userId}`);
      
      // Acknowledge connection
      socket.emit('worker:connected', { userId, socketId: socket.id });
    });

    // When worker logs out or leaves
    socket.on('worker:leave', (userId: string) => {
      console.log(`[SOCKET.IO] Worker left room: ${userId}`);
      socket.leave(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[SOCKET.IO] Server initialized and ready');
  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit notification to specific worker(s) when task is assigned
 * FULL TASK PAYLOAD - Send complete task data for instant UI updates
 * @param workerIds - Comma-separated user IDs or single user ID
 * @param task - Complete task data (NOT partial!)
 */
export function notifyWorkers(workerIds: string, task: Record<string, any>) {
  if (!io) {
    console.error('[SOCKET.IO] ERROR: Not initialized, cannot send notification. Missing io instance!');
    return;
  }

  // Handle multiple workers (comma-separated IDs, already normalized without spaces)
  const ids = workerIds.split(',').map(id => id.trim()).filter(id => id);
  
  if (ids.length === 0) {
    console.warn('[SOCKET.IO] No worker IDs provided, skipping notification');
    return;
  }
  
  console.log(`[SOCKET.IO] Sending FULL task payload to ${ids.length} worker(s): ${ids.join(', ')}`);
  
  ids.forEach(userId => {
    const room = `user:${userId}`;
    console.log(`[SOCKET.IO] Emitting task:assigned to room: ${room}`);
    
    // ✅ SEND COMPLETE TASK OBJECT - All fields for instant UI rendering!
    io!.to(room).emit('task:assigned', {
      // Core task identification
      id: task.id,
      taskId: task.id, // Keep for backward compatibility
      
      // Task content
      title: task.title,
      description: task.description,
      location: task.location,
      hotel: task.hotel,
      blok: task.blok,
      soba: task.soba,
      room_number: task.room_number,
      
      // Priority and status
      priority: task.priority,
      status: task.status,
      
      // Assignment fields - CRITICAL for filtering!
      assigned_to: task.assigned_to,           // ✅ REQUIRED by WorkerDashboard filter
      assigned_to_name: task.assigned_to_name,
      assigned_to_type: task.assigned_to_type,
      
      // Creator fields
      created_by: task.created_by,
      created_by_name: task.created_by_name,
      created_by_department: task.created_by_department,
      assignedBy: task.created_by_name, // Keep for backward compatibility
      
      // Operator/Supervisor fields
      operator_id: task.operator_id,
      operator_name: task.operator_name,
      sef_id: task.sef_id,
      sef_name: task.sef_name,
      
      // External company
      external_company_id: task.external_company_id,
      external_company_name: task.external_company_name,
      
      // Timing fields
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed_at: task.completed_at,
      deadline_at: task.deadline_at,
      estimated_arrival_time: task.estimated_arrival_time,
      actual_arrival_time: task.actual_arrival_time,
      estimated_completion_time: task.estimated_completion_time,
      actual_completion_time: task.actual_completion_time,
      time_spent_minutes: task.time_spent_minutes,
      
      // Worker fields
      worker_report: task.worker_report,
      worker_images: task.worker_images,
      receipt_confirmed_at: task.receipt_confirmed_at,
      
      // Media
      images: task.images,
      
      // Flags
      is_overdue: task.is_overdue,
      is_recurring: task.is_recurring,
      recurrence_pattern: task.recurrence_pattern,
      recurrence_end_date: task.recurrence_end_date,
      
      // Timestamp for event ordering
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Emit task update notification
 * FULL TASK PAYLOAD - Send complete task data for instant UI updates
 * @param task - Complete updated task data (NOT partial!)
 */
export function notifyTaskUpdate(task: Record<string, any>) {
  if (!io) return;
  
  console.log(`[SOCKET.IO] Broadcasting FULL task update: ${task.id} -> ${task.status}`);
  
  // ✅ SEND COMPLETE TASK OBJECT - All fields for instant UI rendering!
  io.emit('task:updated', {
    // Core task identification
    id: task.id,
    taskId: task.id, // Keep for backward compatibility
    
    // All task fields (same as task:assigned)
    title: task.title,
    description: task.description,
    location: task.location,
    hotel: task.hotel,
    blok: task.blok,
    soba: task.soba,
    room_number: task.room_number,
    priority: task.priority,
    status: task.status,
    assigned_to: task.assigned_to,
    assigned_to_name: task.assigned_to_name,
    assigned_to_type: task.assigned_to_type,
    created_by: task.created_by,
    created_by_name: task.created_by_name,
    created_by_department: task.created_by_department,
    operator_id: task.operator_id,
    operator_name: task.operator_name,
    sef_id: task.sef_id,
    sef_name: task.sef_name,
    external_company_id: task.external_company_id,
    external_company_name: task.external_company_name,
    created_at: task.created_at,
    updated_at: task.updated_at,
    completed_at: task.completed_at,
    deadline_at: task.deadline_at,
    estimated_arrival_time: task.estimated_arrival_time,
    actual_arrival_time: task.actual_arrival_time,
    estimated_completion_time: task.estimated_completion_time,
    actual_completion_time: task.actual_completion_time,
    time_spent_minutes: task.time_spent_minutes,
    worker_report: task.worker_report,
    worker_images: task.worker_images,
    receipt_confirmed_at: task.receipt_confirmed_at,
    images: task.images,
    is_overdue: task.is_overdue,
    is_recurring: task.is_recurring,
    recurrence_pattern: task.recurrence_pattern,
    recurrence_end_date: task.recurrence_end_date,
    timestamp: new Date().toISOString()
  });
}
