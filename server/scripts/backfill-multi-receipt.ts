import { supabase } from '../lib/supabase';

async function main() {
  console.log('Trazim sve zadatke koji imaju vise dodjeljenih majstora...');

  const { data: tasks, error: tErr } = await supabase
    .from('tasks')
    .select('id, assigned_to, assigned_to_name, receipt_confirmed_by, receipt_confirmed_by_name, receipt_confirmed_at, completed_by, completed_by_name')
    .not('assigned_to', 'is', null);

  if (tErr) {
    console.error('Greska pri citanju tasks:', tErr);
    process.exit(1);
  }

  const multiTasks = (tasks || []).filter((t: any) => {
    const ids = (t.assigned_to || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    return ids.length > 1;
  });

  console.log(`Nadjeno ${multiTasks.length} zadataka sa vise majstora. Citam istoriju...`);

  const taskIds = multiTasks.map((t: any) => t.id);
  const historyByTask = new Map<string, Array<{ user_id: string; user_name: string; timestamp: string }>>();

  const BATCH = 200;
  for (let i = 0; i < taskIds.length; i += BATCH) {
    const batch = taskIds.slice(i, i + BATCH);
    const { data: history, error: hErr } = await supabase
      .from('task_history')
      .select('task_id, user_id, user_name, notes, timestamp')
      .in('task_id', batch)
      .ilike('notes', 'Receipt confirmed%')
      .order('timestamp', { ascending: true });

    if (hErr) {
      console.error('Greska pri citanju istorije:', hErr);
      continue;
    }

    for (const entry of history || []) {
      const arr = historyByTask.get(entry.task_id) || [];
      arr.push({ user_id: entry.user_id, user_name: entry.user_name, timestamp: entry.timestamp });
      historyByTask.set(entry.task_id, arr);
    }
  }

  let updated = 0;
  let skipped = 0;
  const PAR = 20;
  for (let i = 0; i < multiTasks.length; i += PAR) {
    const chunk = multiTasks.slice(i, i + PAR);
    await Promise.all(
      chunk.map(async (task: any) => {
        const entries = historyByTask.get(task.id) || [];

        const existingIds = new Set<string>();
        const existingNames = new Map<string, string>();
        if (task.receipt_confirmed_by) {
          (task.receipt_confirmed_by as string).split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => existingIds.add(id));
        }
        if (task.receipt_confirmed_by_name) {
          (task.receipt_confirmed_by_name as string).split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => existingNames.set(n.toLowerCase(), n));
        }

        const orderedIds: string[] = [];
        const orderedNames: string[] = [];
        const seen = new Set<string>();

        for (const e of entries) {
          if (!seen.has(e.user_id)) {
            seen.add(e.user_id);
            orderedIds.push(e.user_id);
            orderedNames.push(e.user_name);
          }
        }

        for (const id of existingIds) {
          if (!seen.has(id)) {
            seen.add(id);
            orderedIds.push(id);
          }
        }
        for (const [lc, n] of existingNames) {
          const alreadyHave = orderedNames.some((on) => on.toLowerCase() === lc);
          if (!alreadyHave) orderedNames.push(n);
        }

        if (task.completed_by && !seen.has(task.completed_by)) {
          orderedIds.push(task.completed_by);
          if (task.completed_by_name) orderedNames.push(task.completed_by_name);
          seen.add(task.completed_by);
        }

        if (orderedIds.length <= 1) {
          skipped++;
          return;
        }

        const newBy = orderedIds.join(',');
        const newName = orderedNames.join(', ');

        if (newBy === (task.receipt_confirmed_by || '') && newName === (task.receipt_confirmed_by_name || '')) {
          skipped++;
          return;
        }

        const updateData: any = {
          receipt_confirmed_by: newBy,
          receipt_confirmed_by_name: newName,
        };
        if (!task.receipt_confirmed_at && entries.length > 0) {
          updateData.receipt_confirmed_at = entries[0].timestamp;
        }

        const { error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', task.id);
        if (error) console.error(`Greska za ${task.id}:`, error);
        else {
          updated++;
          console.log(`  [${task.id.slice(0, 8)}] ${newName}`);
        }
      }),
    );
  }

  console.log(`\nGotovo. Obnovljeno: ${updated}. Preskoceno (vec OK ili samo jedan potvrdio): ${skipped}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
