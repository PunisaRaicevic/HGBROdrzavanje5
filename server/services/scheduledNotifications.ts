/**
 * Service for sending scheduled notifications for recurring tasks
 * Sends notifications at 8:00 AM for tasks scheduled for that day
 */

import { storage } from '../storage';
import { sendPushToAllUserDevices } from './firebase';

let lastNotificationDate: string | null = null;

/**
 * Check if notifications have already been sent today
 */
function hasNotifiedToday(): boolean {
  const today = new Date().toISOString().split('T')[0];
  return lastNotificationDate === today;
}

/**
 * Mark that notifications have been sent today
 */
function markNotifiedToday(): void {
  lastNotificationDate = new Date().toISOString().split('T')[0];
}

/**
 * Get tasks scheduled for today that need notifications
 */
export async function getTasksScheduledForToday(): Promise<any[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tasks = await storage.getTasksScheduledBetween(
      today.toISOString(),
      tomorrow.toISOString()
    );
    
    return tasks.filter((task: any) => 
      task.status === 'assigned_to_radnik' && 
      task.assigned_to &&
      task.parent_task_id
    );
  } catch (error) {
    console.error('[SCHEDULED NOTIFICATIONS] Error getting scheduled tasks:', error);
    return [];
  }
}

/**
 * Send notifications for all tasks scheduled for today
 */
export async function sendScheduledNotifications(): Promise<{sent: number, failed: number}> {
  console.log('[SCHEDULED NOTIFICATIONS] Checking for tasks scheduled today...');
  
  if (hasNotifiedToday()) {
    console.log('[SCHEDULED NOTIFICATIONS] Already sent notifications today, skipping');
    return { sent: 0, failed: 0 };
  }
  
  const tasks = await getTasksScheduledForToday();
  
  if (tasks.length === 0) {
    console.log('[SCHEDULED NOTIFICATIONS] No tasks scheduled for today');
    markNotifiedToday();
    return { sent: 0, failed: 0 };
  }
  
  console.log(`[SCHEDULED NOTIFICATIONS] Found ${tasks.length} tasks scheduled for today`);
  
  let totalSent = 0;
  let totalFailed = 0;
  
  for (const task of tasks) {
    try {
      const recipientUserIds = task.assigned_to.split(',').map((id: string) => id.trim()).filter(Boolean);
      
      for (const userId of recipientUserIds) {
        const result = await sendPushToAllUserDevices(
          userId,
          task.title || 'Zakazani zadatak',
          task.description?.substring(0, 200) || 'Imate zakazani zadatak za danas.',
          task.id,
          task.priority || 'normal'
        );
        
        totalSent += result.sent;
        totalFailed += result.failed;
        
        console.log(`[SCHEDULED NOTIFICATIONS] Task ${task.id}: sent=${result.sent}, failed=${result.failed}`);
      }
    } catch (error) {
      console.error(`[SCHEDULED NOTIFICATIONS] Error sending notification for task ${task.id}:`, error);
      totalFailed++;
    }
  }
  
  markNotifiedToday();
  console.log(`[SCHEDULED NOTIFICATIONS] Completed: ${totalSent} sent, ${totalFailed} failed`);
  
  return { sent: totalSent, failed: totalFailed };
}

/**
 * Check if it's time to send scheduled notifications (8:00 AM)
 */
export function isNotificationTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  return hour === 8 && minute >= 0 && minute < 15;
}

/**
 * Run the scheduled notification check
 * Should be called periodically (e.g., every 15 minutes)
 */
export async function runScheduledNotificationCheck(): Promise<void> {
  if (isNotificationTime() && !hasNotifiedToday()) {
    console.log('[SCHEDULED NOTIFICATIONS] It is 8:00 AM - sending scheduled notifications');
    await sendScheduledNotifications();
  }
}
