/**
 * Utility functions for handling recurring task date calculations
 */

export type RecurrencePattern = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | string;

/**
 * Parse custom recurrence pattern (e.g., "3_days", "4_months")
 * @param pattern - The recurrence pattern string
 * @returns Object with interval and unit, or null if it's a standard pattern
 */
function parseCustomPattern(pattern: string): { interval: number; unit: 'days' | 'weeks' | 'months' | 'years' } | null {
  if (['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(pattern)) {
    return null;
  }
  
  const parts = pattern.split('_');
  if (parts.length !== 2) {
    return null;
  }
  
  const interval = parseInt(parts[0], 10);
  const unit = parts[1] as 'days' | 'weeks' | 'months' | 'years';
  
  if (isNaN(interval) || interval <= 0) {
    return null;
  }
  
  if (!['days', 'weeks', 'months', 'years'].includes(unit)) {
    return null;
  }
  
  return { interval, unit };
}

/**
 * Calculate the next occurrence date based on recurrence pattern
 * Handles edge cases like month overflow and leap years correctly
 * Supports custom intervals like "3_days", "4_months", etc.
 * @param currentDate - The current occurrence date
 * @param pattern - The recurrence pattern (daily, weekly, monthly, yearly, or custom like "3_days")
 * @returns The next occurrence date
 */
export function calculateNextOccurrence(
  currentDate: Date,
  pattern: RecurrencePattern
): Date {
  const nextDate = new Date(currentDate);
  const originalDay = nextDate.getDate();
  
  // Try to parse as custom pattern first
  const customPattern = parseCustomPattern(pattern);
  if (customPattern) {
    const { interval, unit } = customPattern;
    
    switch (unit) {
      case 'days':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      
      case 'weeks':
        nextDate.setDate(nextDate.getDate() + (interval * 7));
        break;
      
      case 'months': {
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
      
      case 'years': {
        const originalMonth = nextDate.getMonth();
        const targetYear = nextDate.getFullYear() + interval;
        
        if (originalMonth === 1 && originalDay === 29) {
          const isLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
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

  // Handle standard patterns
  switch (pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    
    case 'monthly': {
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
    
    case 'yearly': {
      const originalMonth = nextDate.getMonth();
      const targetYear = nextDate.getFullYear() + 1;
      
      if (originalMonth === 1 && originalDay === 29) {
        const isLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
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
    
    case 'once':
    default:
      return currentDate;
  }

  return nextDate;
}

/**
 * Check if a recurring task should be processed now
 * @param nextOccurrence - The scheduled next occurrence date
 * @param recurrenceStartDate - Optional start date for recurrence (task won't run before this date)
 * @returns true if the task should be processed
 */
export function shouldProcessRecurringTask(
  nextOccurrence: string | null,
  recurrenceStartDate: string | null
): boolean {
  if (!nextOccurrence) {
    return false;
  }

  const now = new Date();
  const nextDate = new Date(nextOccurrence);

  // Check if next occurrence has passed (it's time to process)
  if (nextDate > now) {
    return false;
  }

  // Check if the task has started yet
  // Task won't run before the start date
  if (recurrenceStartDate) {
    const startDate = new Date(recurrenceStartDate);
    // Only process if we've reached or passed the start date
    if (now < startDate) {
      return false;
    }
  }

  return true;
}

/**
 * Check if recurrence should continue
 * Recurring tasks continue indefinitely until manually deleted
 * @param nextOccurrence - The next occurrence date
 * @returns true (always continues until manually deleted)
 */
export function shouldContinueRecurrence(
  nextOccurrence: Date
): boolean {
  // No end date - tasks continue indefinitely until manually deleted by supervisor
  return true;
}
