/**
 * Script to fix scheduled_for dates for existing recurring child tasks
 * Each child task should have scheduled_for set based on its position in the recurrence sequence
 */

import { supabase } from '../lib/supabase';
import { calculateNextOccurrence, type RecurrencePattern } from '../utils/recurrence';

interface Task {
  id: string;
  parent_task_id: string | null;
  created_at: string;
  scheduled_for: string | null;
}

interface ParentTask {
  id: string;
  recurrence_pattern: string;
  created_at: string;
}

async function fixScheduledForDates() {
  console.log('🔧 Starting scheduled_for date fix...\n');

  try {
    // 1. Get all parent tasks with their recurrence patterns
    const { data: parentTasks, error: parentError } = await supabase
      .from('tasks')
      .select('id, recurrence_pattern, created_at')
      .eq('is_recurring', true)
      .is('parent_task_id', null);

    if (parentError) {
      console.error('❌ Error fetching parent tasks:', parentError);
      return;
    }

    console.log(`📋 Found ${parentTasks?.length || 0} parent recurring tasks\n`);

    let totalUpdated = 0;

    // 2. For each parent task, get and fix its child tasks
    for (const parent of parentTasks || []) {
      console.log(`\n🔄 Processing parent task: ${parent.id}`);
      console.log(`   Pattern: ${parent.recurrence_pattern}`);

      // Get all child tasks for this parent, ordered by created_at
      const { data: children, error: childError } = await supabase
        .from('tasks')
        .select('id, parent_task_id, created_at, scheduled_for')
        .eq('parent_task_id', parent.id)
        .order('created_at', { ascending: true });

      if (childError) {
        console.error(`   ❌ Error fetching children:`, childError);
        continue;
      }

      if (!children || children.length === 0) {
        console.log(`   ℹ️  No child tasks found`);
        continue;
      }

      console.log(`   📦 Found ${children.length} child tasks`);

      // 3. Calculate correct scheduled_for for each child
      let currentDate = new Date(parent.created_at);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const correctScheduledFor = currentDate.toISOString();

        // Update the child task with correct scheduled_for
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ scheduled_for: correctScheduledFor })
          .eq('id', child.id);

        if (updateError) {
          console.error(`   ❌ Error updating child ${i + 1}:`, updateError);
        } else {
          const oldDate = child.scheduled_for ? new Date(child.scheduled_for).toISOString().split('T')[0] : 'null';
          const newDate = currentDate.toISOString().split('T')[0];
          console.log(`   ✅ Child ${i + 1}: ${oldDate} → ${newDate}`);
          totalUpdated++;
        }

        // Calculate next occurrence for the next child
        currentDate = calculateNextOccurrence(currentDate, parent.recurrence_pattern as RecurrencePattern);
      }
    }

    console.log(`\n✅ Fix complete! Updated ${totalUpdated} child tasks.`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixScheduledForDates()
  .then(() => {
    console.log('\n🎉 Script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
