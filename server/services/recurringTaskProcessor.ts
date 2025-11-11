/**
 * Service for processing recurring tasks
 * Extracted as a separate module to avoid HTTP calls within the same server
 */

import { storage } from '../storage';
import { 
  calculateNextOccurrence, 
  shouldProcessRecurringTask,
  shouldContinueRecurrence,
  type RecurrencePattern 
} from '../utils/recurrence';

export interface ProcessingResult {
  taskId: string;
  status: 'success' | 'error';
  newTaskId?: string;
  nextOccurrence?: string;
  message?: string;
  error?: string;
}

export interface ProcessingStats {
  processed: number;
  total: number;
  results: ProcessingResult[];
}

/**
 * Process all recurring tasks that are due
 * @returns Statistics about processing
 */
export async function processRecurringTasks(): Promise<ProcessingStats> {
  console.log('[CRON] Processing recurring tasks...');
  
  // Fetch all recurring tasks that need processing
  const recurringTasks = await storage.getRecurringTasks();

  if (!recurringTasks || recurringTasks.length === 0) {
    console.log('[CRON] No recurring tasks found');
    return { processed: 0, total: 0, results: [], message: 'No recurring tasks to process' } as any;
  }

  console.log(`[CRON] Found ${recurringTasks.length} recurring tasks`);

  let processedCount = 0;
  const results: ProcessingResult[] = [];

  for (const task of recurringTasks) {
    // Normalize to Date objects for recurrence helpers
    const nextOccurrenceDate = task.next_occurrence 
      ? (task.next_occurrence instanceof Date ? task.next_occurrence : new Date(task.next_occurrence))
      : null;
    const recurrenceEndDate = task.recurrence_end_date
      ? (task.recurrence_end_date instanceof Date ? task.recurrence_end_date : new Date(task.recurrence_end_date))
      : null;

    // Check if this task should be processed
    if (!shouldProcessRecurringTask(
      nextOccurrenceDate ? nextOccurrenceDate.toISOString() : null,
      recurrenceEndDate ? recurrenceEndDate.toISOString() : null
    )) {
      continue;
    }

    try {
      // Create new task instance
      const newTaskData = {
        title: task.title,
        description: task.description,
        location: task.location,
        room_number: task.room_number,
        priority: task.priority,
        status: 'assigned_to_radnik',
        created_by: task.created_by,
        created_by_name: task.created_by_name,
        created_by_department: task.created_by_department,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name,
        images: task.images,
        parent_task_id: task.id,
        is_recurring: false, // The instance itself is not recurring
        recurrence_pattern: 'once',
      };

      const newTask = await storage.createTask(newTaskData);

      // Create task history for the new instance
      await storage.createTaskHistory({
        task_id: newTask.id,
        changed_by: task.created_by,
        changed_by_name: task.created_by_name,
        new_status: 'assigned_to_radnik',
        notes: `Auto-generated from recurring task ${task.id}`,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name,
      });

      // Calculate next occurrence
      const currentOccurrence = nextOccurrenceDate || new Date();
      const nextOccurrence = calculateNextOccurrence(
        currentOccurrence,
        task.recurrence_pattern as RecurrencePattern
      );

      // Check if we should continue recurrence
      const continueRecurrence = shouldContinueRecurrence(
        nextOccurrence,
        recurrenceEndDate ? recurrenceEndDate.toISOString() : null
      );

      if (continueRecurrence) {
        // Update parent task with new next_occurrence (convert Date to ISO string for Supabase)
        await storage.updateTask(task.id, { next_occurrence: nextOccurrence.toISOString() } as any);

        results.push({
          taskId: task.id,
          status: 'success',
          newTaskId: newTask.id,
          nextOccurrence: nextOccurrence.toISOString(),
        });
      } else {
        // Recurrence has ended, clear next_occurrence
        await storage.updateTask(task.id, { next_occurrence: null } as any);

        results.push({
          taskId: task.id,
          status: 'success',
          newTaskId: newTask.id,
          message: 'Recurrence ended',
        });
      }

      processedCount++;
      console.log(`[CRON] Processed recurring task ${task.id} -> created ${newTask.id}`);
    } catch (error) {
      console.error(`[CRON] Error processing task ${task.id}:`, error);
      results.push({
        taskId: task.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log(`[CRON] Finished processing. Created ${processedCount} new tasks`);
  
  return {
    processed: processedCount,
    total: recurringTasks.length,
    results,
  };
}
