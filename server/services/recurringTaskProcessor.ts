/**
 * Service for processing recurring tasks
 * Extracted as a separate module to avoid HTTP calls within the same server
 */

import { storage } from '../storage';
import { 
  calculateNextOccurrence,
  calculateScheduledDates,
  shouldProcessRecurringTask,
  shouldContinueRecurrence,
  type RecurrencePattern,
  type DetailedRecurrence
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
 * Number of child tasks to maintain in advance for each recurring template
 * For weekly tasks: 8 tasks = ~2 months
 * For monthly tasks: 8 tasks = ~8 months
 */
const TASKS_TO_MAINTAIN = 8;

/**
 * Ensure that a recurring template has enough child tasks created in advance
 * Creates multiple child tasks up to TASKS_TO_MAINTAIN
 * Uses detailed recurrence info (specific days/dates) when available
 * @param templateTask - The recurring template task
 * @returns Number of new child tasks created
 */
export async function ensureChildTasksExist(templateTask: any): Promise<number> {
  try {
    // Get existing child tasks for this template (only non-completed/non-cancelled)
    const existingChildren = await storage.getChildTasksByParentId(templateTask.id);
    const activeChildren = existingChildren.filter(
      (child: any) => child.status !== 'completed' && child.status !== 'cancelled'
    );
    
    const existingCount = activeChildren.length;
    const tasksToCreate = TASKS_TO_MAINTAIN - existingCount;
    
    if (tasksToCreate <= 0) {
      console.log(`[RECURRING] Template ${templateTask.id} already has ${existingCount} child tasks`);
      return 0;
    }
    
    console.log(`[RECURRING] Creating ${tasksToCreate} child tasks for template ${templateTask.id}`);
    
    // Build detailed recurrence info from template
    const details: DetailedRecurrence = {
      recurrence_week_days: templateTask.recurrence_week_days,
      recurrence_month_days: templateTask.recurrence_month_days,
      recurrence_year_dates: templateTask.recurrence_year_dates,
      execution_hour: templateTask.execution_hour,
      execution_minute: templateTask.execution_minute,
    };
    
    // Get already scheduled dates to avoid duplicates
    const existingDates = new Set(
      activeChildren
        .filter((c: any) => c.scheduled_for)
        .map((c: any) => new Date(c.scheduled_for).toISOString().split('T')[0])
    );
    
    // Calculate scheduled dates using detailed recurrence
    const startDate = new Date(templateTask.next_occurrence || templateTask.recurrence_start_date || new Date());
    const scheduledDates = calculateScheduledDates(
      startDate,
      templateTask.recurrence_pattern as RecurrencePattern,
      details,
      TASKS_TO_MAINTAIN + existingCount + 10 // Get extra to account for filtering
    );
    
    // Filter out dates that already have child tasks
    const newDates = scheduledDates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      return !existingDates.has(dateStr);
    }).slice(0, tasksToCreate);
    
    let createdCount = 0;
    
    // Create child tasks for each scheduled date
    for (const scheduledDate of newDates) {
      const newTaskData = {
        title: templateTask.title,
        description: templateTask.description,
        location: templateTask.location,
        room_number: templateTask.room_number,
        priority: templateTask.priority,
        status: 'assigned_to_radnik',
        created_by: templateTask.created_by,
        created_by_name: templateTask.created_by_name,
        created_by_department: templateTask.created_by_department,
        assigned_to: templateTask.assigned_to,
        assigned_to_name: templateTask.assigned_to_name,
        images: templateTask.images,
        parent_task_id: templateTask.id,
        is_recurring: false,
        recurrence_pattern: templateTask.recurrence_pattern,
        scheduled_for: scheduledDate.toISOString(),
      };
      
      const newTask = await storage.createTask(newTaskData);
      
      await storage.createTaskHistory({
        task_id: newTask.id,
        user_id: templateTask.created_by,
        user_name: templateTask.created_by_name || 'System',
        user_role: 'system',
        action: 'task_created',
        status_to: 'assigned_to_radnik',
        notes: `Auto-generated from recurring template ${templateTask.id}`,
        assigned_to: templateTask.assigned_to,
        assigned_to_name: templateTask.assigned_to_name,
      });
      
      createdCount++;
      console.log(`[RECURRING] Created child task ${newTask.id} scheduled for ${scheduledDate.toISOString()}`);
    }
    
    // Update template's next_occurrence
    if (newDates.length > 0) {
      const lastDate = newDates[newDates.length - 1];
      const nextOccurrence = calculateNextOccurrence(lastDate, templateTask.recurrence_pattern as RecurrencePattern, details);
      await storage.updateTask(templateTask.id, { next_occurrence: nextOccurrence.toISOString() } as any);
    }
    
    return createdCount;
  } catch (error) {
    console.error(`[RECURRING] Error ensuring child tasks for template ${templateTask.id}:`, error);
    return 0;
  }
}

/**
 * Process all recurring tasks that are due
 * @returns Statistics about processing
 */
export async function processRecurringTasks(): Promise<ProcessingStats> {
  console.log('[CRON] Processing recurring tasks...');
  
  // Fetch all recurring tasks
  const recurringTasks = await storage.getRecurringTasks();

  if (!recurringTasks || recurringTasks.length === 0) {
    console.log('[CRON] No recurring tasks found');
    return { processed: 0, total: 0, results: [] };
  }

  console.log(`[CRON] Found ${recurringTasks.length} recurring tasks`);

  let processedCount = 0;
  const results: ProcessingResult[] = [];

  // Ensure each recurring template has enough child tasks
  for (const task of recurringTasks) {
    try {
      const createdCount = await ensureChildTasksExist(task);
      
      if (createdCount > 0) {
        results.push({
          taskId: task.id,
          status: 'success',
          message: `Created ${createdCount} child tasks`,
        });
        processedCount += createdCount;
      }
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
