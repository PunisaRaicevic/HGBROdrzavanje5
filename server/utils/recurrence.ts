/**
 * Utility functions for handling recurring task date calculations
 * 
 * Recurrence patterns:
 * - "X_years" = X times per year (uses recurrence_year_dates)
 * - "X_months" = X times per month (uses recurrence_month_days)
 * - "X_weeks" = X times per week (uses recurrence_week_days)
 * - "X_days" = every X days (traditional interval)
 * - "daily", "weekly", "monthly", "yearly" = standard patterns
 */

export type RecurrencePattern = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | string;

export interface RecurrenceYearDate {
  month: number;
  day: number;
}

export interface DetailedRecurrence {
  recurrence_week_days?: number[] | null;
  recurrence_month_days?: number[] | null;
  recurrence_year_dates?: RecurrenceYearDate[] | null;
  execution_hour?: number | null;
  execution_minute?: number | null;
}

/**
 * Parse custom recurrence pattern (e.g., "3_days", "4_months", "3_years")
 * @param pattern - The recurrence pattern string
 * @returns Object with count and unit
 */
function parseCustomPattern(pattern: string): { count: number; unit: 'days' | 'weeks' | 'months' | 'years' } | null {
  if (['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(pattern)) {
    return null;
  }
  
  const parts = pattern.split('_');
  if (parts.length !== 2) {
    return null;
  }
  
  const count = parseInt(parts[0], 10);
  const unit = parts[1] as 'days' | 'weeks' | 'months' | 'years';
  
  if (isNaN(count) || count <= 0) {
    return null;
  }
  
  if (!['days', 'weeks', 'months', 'years'].includes(unit)) {
    return null;
  }
  
  return { count, unit };
}

/**
 * Set time on a date based on execution_hour and execution_minute
 */
function setExecutionTime(date: Date, hour?: number | null, minute?: number | null): Date {
  const result = new Date(date);
  if (hour !== undefined && hour !== null) {
    result.setHours(hour);
  }
  if (minute !== undefined && minute !== null) {
    result.setMinutes(minute);
  }
  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
}

/**
 * Calculate ALL scheduled dates for a recurring task using detailed recurrence info
 * @param startDate - The start date for recurrence
 * @param pattern - The recurrence pattern (e.g., "3_years", "2_weeks")
 * @param details - Detailed recurrence info (specific days/dates)
 * @param maxDates - Maximum number of dates to generate
 * @returns Array of scheduled dates
 */
export function calculateScheduledDates(
  startDate: Date,
  pattern: RecurrencePattern,
  details: DetailedRecurrence,
  maxDates: number = 8
): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  const customPattern = parseCustomPattern(pattern);
  
  if (!customPattern) {
    // Standard patterns - use traditional interval-based calculation
    let currentDate = new Date(startDate);
    for (let i = 0; i < maxDates; i++) {
      if (i > 0) {
        currentDate = calculateNextOccurrenceSimple(currentDate, pattern);
      }
      if (currentDate >= now) {
        dates.push(setExecutionTime(currentDate, details.execution_hour, details.execution_minute));
      }
    }
    return dates;
  }
  
  const { count, unit } = customPattern;
  
  // For "X times per period" patterns, we need specific dates
  if (unit === 'years' && details.recurrence_year_dates && details.recurrence_year_dates.length > 0) {
    // X times per year - use recurrence_year_dates
    const yearDates = details.recurrence_year_dates;
    const startYear = now.getFullYear();
    
    for (let yearOffset = 0; yearOffset < 5 && dates.length < maxDates; yearOffset++) {
      const year = startYear + yearOffset;
      for (const dateInfo of yearDates) {
        if (dates.length >= maxDates) break;
        const date = new Date(year, dateInfo.month - 1, dateInfo.day);
        date.setHours(details.execution_hour ?? 9, details.execution_minute ?? 0, 0, 0);
        if (date >= now) {
          dates.push(date);
        }
      }
    }
    return dates.slice(0, maxDates);
  }
  
  if (unit === 'months' && details.recurrence_month_days && details.recurrence_month_days.length > 0) {
    // X times per month - use recurrence_month_days
    const monthDays = details.recurrence_month_days;
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    
    for (let monthOffset = 0; monthOffset < 12 && dates.length < maxDates; monthOffset++) {
      const month = currentMonth + monthOffset;
      const year = currentYear + Math.floor(month / 12);
      const normalizedMonth = month % 12;
      
      for (const day of monthDays) {
        if (dates.length >= maxDates) break;
        const lastDayOfMonth = new Date(year, normalizedMonth + 1, 0).getDate();
        const safeDay = Math.min(day, lastDayOfMonth);
        const date = new Date(year, normalizedMonth, safeDay);
        date.setHours(details.execution_hour ?? 9, details.execution_minute ?? 0, 0, 0);
        if (date >= now) {
          dates.push(date);
        }
      }
    }
    return dates.slice(0, maxDates);
  }
  
  if (unit === 'weeks' && details.recurrence_week_days && details.recurrence_week_days.length > 0) {
    // X times per week - use recurrence_week_days (0=Sunday, 1=Monday, etc.)
    const weekDays = details.recurrence_week_days;
    let currentDate = new Date(now);
    currentDate.setHours(details.execution_hour ?? 9, details.execution_minute ?? 0, 0, 0);
    
    for (let dayOffset = 0; dayOffset < 60 && dates.length < maxDates; dayOffset++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      
      if (weekDays.includes(dayOfWeek)) {
        dates.push(new Date(date));
      }
    }
    return dates.slice(0, maxDates);
  }
  
  // Fallback: treat as interval-based (every X days/weeks/months/years)
  let currentDate = new Date(startDate);
  for (let i = 0; i < maxDates; i++) {
    if (i > 0) {
      currentDate = calculateNextOccurrenceSimple(currentDate, pattern);
    }
    if (currentDate >= now) {
      dates.push(setExecutionTime(currentDate, details.execution_hour, details.execution_minute));
    }
  }
  return dates;
}

/**
 * Simple next occurrence calculation (interval-based, for fallback)
 */
function calculateNextOccurrenceSimple(currentDate: Date, pattern: RecurrencePattern): Date {
  const nextDate = new Date(currentDate);
  const originalDay = nextDate.getDate();
  
  const customPattern = parseCustomPattern(pattern);
  if (customPattern) {
    const { count, unit } = customPattern;
    
    switch (unit) {
      case 'days':
        nextDate.setDate(nextDate.getDate() + count);
        break;
      
      case 'weeks':
        nextDate.setDate(nextDate.getDate() + (count * 7));
        break;
      
      case 'months': {
        const targetMonth = nextDate.getMonth() + count;
        const targetYear = nextDate.getFullYear() + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;
        
        nextDate.setMonth(normalizedMonth, 1);
        nextDate.setFullYear(targetYear);
        
        const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        const dayToSet = Math.min(originalDay, lastDayOfMonth);
        nextDate.setDate(dayToSet);
        break;
      }
      
      case 'years': {
        const originalMonth = nextDate.getMonth();
        const targetYear = nextDate.getFullYear() + count;
        
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
 * Calculate the next occurrence date based on recurrence pattern
 * This is the main function used by the recurring task processor
 */
export function calculateNextOccurrence(
  currentDate: Date,
  pattern: RecurrencePattern,
  details?: DetailedRecurrence
): Date {
  if (details) {
    const scheduledDates = calculateScheduledDates(currentDate, pattern, details, 2);
    if (scheduledDates.length > 0) {
      const futureDate = scheduledDates.find(d => d > currentDate);
      if (futureDate) {
        return futureDate;
      }
    }
  }
  
  return calculateNextOccurrenceSimple(currentDate, pattern);
}

/**
 * Check if a recurring task should be processed now
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

  if (nextDate > now) {
    return false;
  }

  if (recurrenceStartDate) {
    const startDate = new Date(recurrenceStartDate);
    if (now < startDate) {
      return false;
    }
  }

  return true;
}

/**
 * Check if recurrence should continue
 */
export function shouldContinueRecurrence(nextOccurrence: Date): boolean {
  return true;
}

/**
 * Get human-readable label for recurrence pattern
 */
export function getRecurrenceLabel(pattern: string): string {
  const customPattern = parseCustomPattern(pattern);
  
  if (customPattern) {
    const { count, unit } = customPattern;
    switch (unit) {
      case 'years':
        return `${count} puta godišnje`;
      case 'months':
        return `${count} puta mjesečno`;
      case 'weeks':
        return `${count} puta nedjeljno`;
      case 'days':
        if (count === 1) return 'Dnevno';
        return `Svaka ${count} dana`;
    }
  }
  
  switch (pattern) {
    case 'daily': return 'Dnevno';
    case 'weekly': return 'Nedjeljno';
    case 'monthly': return 'Mjesečno';
    case 'yearly': return 'Godišnje';
    case 'once': return 'Jednokratno';
    default: return pattern;
  }
}
