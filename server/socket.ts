import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import type { RequestHandler } from 'express';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server for real-time notifications
 * @param server - HTTP server instance
 * @param sessionMiddleware - Express session middleware for authentication
 */
export function initializeSocket(server: Server, sessionMiddleware: RequestHandler): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // In production, specify your domain
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Inject session middleware into Socket.IO engine for session access
  io.engine.use(sessionMiddleware);

  // Authentication middleware - verify user is logged in
  io.use((socket, next) => {
    const req = socket.request as any;
    
    // Call session middleware to populate req.session
    sessionMiddleware(req, {} as any, (err?: any) => {
      if (err) {
        console.error('[SOCKET.IO] Session middleware error:', err);
        return next(new Error('Session error'));
      }

      // Check if user is authenticated
      if (!req.session?.userId) {
        console.warn('[SOCKET.IO] Unauthenticated socket connection attempt');
        return next(new Error('Authentication required'));
      }

      console.log(`[SOCKET.IO] Authenticated socket connection for user: ${req.session.userId}`);
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = (socket.request as any).session?.userId;
    console.log(`[SOCKET.IO] Client connected: ${socket.id} (User: ${userId})`);

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
 * @param workerIds - Comma-separated user IDs or single user ID
 * @param task - Task data
 */
export function notifyWorkers(workerIds: string, task: any) {
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
  
  console.log(`[SOCKET.IO] Sending notification to ${ids.length} worker(s): ${ids.join(', ')}`);
  
  ids.forEach(userId => {
    const room = `user:${userId}`;
    console.log(`[SOCKET.IO] Emitting task:assigned to room: ${room}`);
    io!.to(room).emit('task:assigned', {
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      location: task.location,
      hotel: task.hotel,
      blok: task.blok,
      soba: task.soba,
      assignedBy: task.created_by_name,
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Emit task update notification
 * @param taskId - Task ID
 * @param status - New status
 */
export function notifyTaskUpdate(taskId: string, status: string) {
  if (!io) return;
  
  console.log(`[SOCKET.IO] Broadcasting task update: ${taskId} -> ${status}`);
  io.emit('task:updated', { taskId, status, timestamp: new Date().toISOString() });
}
