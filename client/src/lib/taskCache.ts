import { queryClient } from './queryClient';
import type { TaskStatus, Priority } from '@shared/types';

export interface Task {
  id: string;
  title: string;
  assignedBy: string;
  priority: Priority;
  location: string;
  status: TaskStatus;
  description: string;
  receivedAt: Date;
  completedAt?: Date | null;
  reporterName?: string;
  reporterImages?: string[];
  worker_report?: string;
  receipt_confirmed_at?: string;
  needsHydration?: boolean;
}

interface TasksResponse {
  tasks: Task[];
}

interface PartialTaskData {
  taskId?: string;
  id?: string;
  title?: string;
  location?: string;
  priority?: Priority;
  status?: TaskStatus;
  description?: string;
  [key: string]: any;
}

export function normalizeTask(taskData: PartialTaskData, needsHydration = false): Partial<Task> {
  const id = taskData.id || taskData.taskId;
  
  if (!id) {
    console.warn('[TASK CACHE] Cannot normalize task without ID:', taskData);
    return {};
  }

  const normalized: Partial<Task> = {
    id,
    needsHydration,
  };

  if (taskData.title) normalized.title = taskData.title;
  if (taskData.location) normalized.location = taskData.location;
  if (taskData.priority) normalized.priority = taskData.priority;
  if (taskData.status) normalized.status = taskData.status;
  if (taskData.description) normalized.description = taskData.description;
  if (taskData.assignedBy) normalized.assignedBy = taskData.assignedBy;
  if (taskData.reporterName) normalized.reporterName = taskData.reporterName;
  if (taskData.reporterImages) normalized.reporterImages = taskData.reporterImages;
  if (taskData.worker_report) normalized.worker_report = taskData.worker_report;
  if (taskData.receipt_confirmed_at) normalized.receipt_confirmed_at = taskData.receipt_confirmed_at;
  
  if (taskData.receivedAt) {
    normalized.receivedAt = typeof taskData.receivedAt === 'string' 
      ? new Date(taskData.receivedAt) 
      : taskData.receivedAt;
  } else if (needsHydration) {
    normalized.receivedAt = new Date();
  }
  
  if (taskData.completedAt) {
    normalized.completedAt = typeof taskData.completedAt === 'string'
      ? new Date(taskData.completedAt)
      : taskData.completedAt;
  }

  return normalized;
}

export function mergeTaskData(existing: Task, incoming: Partial<Task>): Task {
  return {
    ...existing,
    ...incoming,
    needsHydration: incoming.needsHydration ?? existing.needsHydration,
  };
}

export function upsertTaskInCache(
  taskData: PartialTaskData,
  options: { markForHydration?: boolean; prepend?: boolean } = {}
): void {
  // AUTO-DETECT if payload is complete based on critical fields
  // If socket payload has assigned_to, it's likely a FULL task object
  const isCompletePayload = Boolean(
    taskData.assigned_to && 
    taskData.status && 
    taskData.created_by_name
  );
  
  // Override markForHydration if payload is complete
  const shouldHydrate = isCompletePayload ? false : (options.markForHydration ?? true);
  const { prepend = false } = options;
  
  const taskId = taskData.id || taskData.taskId;
  if (!taskId) {
    console.warn('[TASK CACHE] Cannot upsert task without ID');
    return;
  }

  console.log('[TASK CACHE] Upserting task:', taskId, { 
    isCompletePayload, 
    shouldHydrate, 
    prepend,
    hasAssignedTo: Boolean(taskData.assigned_to),
    hasStatus: Boolean(taskData.status)
  });

  queryClient.setQueryData<TasksResponse>(['/api/tasks'], (oldData) => {
    if (!oldData) {
      const newTask = normalizeTask(taskData, shouldHydrate) as Task;
      console.log('[TASK CACHE] Creating new cache with task:', newTask);
      return { tasks: [newTask] };
    }

    const existingIndex = oldData.tasks.findIndex(t => t.id === taskId);
    
    if (existingIndex !== -1) {
      const existingTask = oldData.tasks[existingIndex];
      const normalizedData = normalizeTask(taskData, shouldHydrate);
      const updatedTask = mergeTaskData(existingTask, normalizedData as Partial<Task>);
      
      const newTasks = [...oldData.tasks];
      newTasks[existingIndex] = updatedTask;
      
      console.log('[TASK CACHE] Updated existing task:', taskId);
      return { tasks: newTasks };
    } else {
      const newTask = normalizeTask(taskData, shouldHydrate) as Task;
      const newTasks = prepend 
        ? [newTask, ...oldData.tasks]
        : [...oldData.tasks, newTask];
      
      console.log('[TASK CACHE] Added new task:', taskId, 'at', prepend ? 'start' : 'end');
      return { tasks: newTasks };
    }
  });
}

export function removeTaskFromCache(taskId: string): void {
  console.log('[TASK CACHE] Removing task:', taskId);
  
  queryClient.setQueryData<TasksResponse>(['/api/tasks'], (oldData) => {
    if (!oldData) return oldData;
    
    return {
      tasks: oldData.tasks.filter(t => t.id !== taskId)
    };
  });
}

export function scheduleBackgroundHydration(delayMs = 2000): void {
  console.log('[TASK CACHE] Scheduling background hydration in', delayMs, 'ms');
  
  setTimeout(() => {
    const currentData = queryClient.getQueryData<TasksResponse>(['/api/tasks']);
    
    if (!currentData) return;
    
    const needsHydrationTasks = currentData.tasks.filter(t => t.needsHydration);
    
    if (needsHydrationTasks.length > 0) {
      console.log('[TASK CACHE] Hydrating', needsHydrationTasks.length, 'tasks');
      
      queryClient.refetchQueries({ 
        queryKey: ['/api/tasks'],
        type: 'active'
      });
    }
  }, delayMs);
}

export function optimisticUpdateTask(
  taskId: string,
  updates: Partial<Task>
): { rollback: () => void } {
  const previousData = queryClient.getQueryData<TasksResponse>(['/api/tasks']);
  
  console.log('[TASK CACHE] Optimistic update:', taskId, updates);
  
  queryClient.setQueryData<TasksResponse>(['/api/tasks'], (oldData) => {
    if (!oldData) return oldData;
    
    return {
      tasks: oldData.tasks.map(task =>
        task.id === taskId
          ? mergeTaskData(task, updates)
          : task
      )
    };
  });
  
  return {
    rollback: () => {
      console.log('[TASK CACHE] Rolling back optimistic update for:', taskId);
      if (previousData) {
        queryClient.setQueryData(['/api/tasks'], previousData);
      }
    }
  };
}
