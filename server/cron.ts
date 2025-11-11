/**
 * Cron job system for processing recurring tasks
 * Runs every 15 minutes to check and create new task instances
 */

import { processRecurringTasks } from './services/recurringTaskProcessor';

const CRON_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

let cronInterval: NodeJS.Timeout | null = null;

/**
 * Execute the recurring tasks processing
 */
async function runRecurringTasksJob() {
  try {
    console.log('[CRON SCHEDULER] Triggering recurring tasks processing...');
    
    const result = await processRecurringTasks();
    
    console.log('[CRON SCHEDULER] Result:', result);
    
    if (result.processed > 0) {
      console.log(`[CRON SCHEDULER] ✅ Created ${result.processed} new task(s)`);
    } else {
      console.log('[CRON SCHEDULER] No tasks to process');
    }
  } catch (error) {
    console.error('[CRON SCHEDULER] Error processing recurring tasks:', error);
  }
}

/**
 * Start the cron job scheduler
 */
export function startCronScheduler() {
  if (cronInterval) {
    console.log('[CRON SCHEDULER] Already running');
    return;
  }

  console.log(`[CRON SCHEDULER] Initializing... Will run every ${CRON_INTERVAL / 1000 / 60} minutes`);
  
  // ✅ DON'T run immediately on startup in production
  // Let health checks pass first, then wait for the first scheduled interval
  
  // Run every 15 minutes (first run will be after 15 minutes)
  cronInterval = setInterval(async () => {
    await runRecurringTasksJob();
  }, CRON_INTERVAL);

  console.log('[CRON SCHEDULER] ✅ Scheduler initialized (first run in 15 minutes)');
}

/**
 * Stop the cron job scheduler
 */
export function stopCronScheduler() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[CRON SCHEDULER] Stopped');
  }
}

/**
 * Manually trigger recurring tasks processing
 */
export async function triggerManually() {
  console.log('[CRON SCHEDULER] Manual trigger requested');
  await runRecurringTasksJob();
}
