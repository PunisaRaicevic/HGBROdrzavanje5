import { supabase } from '../lib/supabase';

async function main() {
  console.log('Trazim zadatke kojima nedostaje receipt_confirmed_at...');

  const { data: tasks, error: tErr } = await supabase
    .from('tasks')
    .select('id')
    .is('receipt_confirmed_at', null)
    .neq('status', 'cancelled')
    .neq('status', 'new')
    .neq('status', 'pending');

  if (tErr) {
    console.error('Greska pri citanju tasks:', tErr);
    process.exit(1);
  }

  const taskIds = (tasks || []).map((t) => t.id);
  console.log(`Nadjeno ${taskIds.length} kandidata. Citam istoriju...`);

  // Citaj sve "Receipt confirmed" zapise iz istorije u batch-evima (1000 ID-eva po pozivu)
  const historyMap = new Map<string, { user_id: string; user_name: string; action: string; timestamp: string }>();
  const BATCH = 200;
  for (let i = 0; i < taskIds.length; i += BATCH) {
    const batch = taskIds.slice(i, i + BATCH);
    const { data: history, error: hErr } = await supabase
      .from('task_history')
      .select('task_id, user_id, user_name, action, notes, timestamp')
      .in('task_id', batch)
      .ilike('notes', 'Receipt confirmed%')
      .order('timestamp', { ascending: false });

    if (hErr) {
      console.error('Greska pri citanju istorije:', hErr);
      continue;
    }

    for (const entry of history || []) {
      // Posto je sortirano descending, prvi koji vidimo za svaki task_id je najnoviji
      if (!historyMap.has(entry.task_id)) {
        historyMap.set(entry.task_id, entry as any);
      }
    }
  }

  console.log(`Pronadjeno ${historyMap.size} zadataka sa potvrdom u istoriji.`);

  let updated = 0;
  const entries = Array.from(historyMap.entries());
  // Paralelno azuriraj u grupama od 20
  const PAR = 20;
  for (let i = 0; i < entries.length; i += PAR) {
    const chunk = entries.slice(i, i + PAR);
    await Promise.all(
      chunk.map(async ([taskId, entry]) => {
        const match = ((entry as any).notes || '').match(/Receipt confirmed by (.+)$/i);
        const confirmedName = match ? match[1].trim() : entry.user_name;
        const { error } = await supabase
          .from('tasks')
          .update({
            receipt_confirmed_at: entry.timestamp,
            receipt_confirmed_by: entry.user_id,
            receipt_confirmed_by_name: confirmedName,
          })
          .eq('id', taskId);
        if (error) console.error(`Greska za ${taskId}:`, error);
        else updated++;
      }),
    );
    if ((i + PAR) % 200 === 0) console.log(`  ...obnovljeno ~${updated}`);
  }

  console.log(`\nGotovo. Obnovljeno: ${updated}. Bez istorije potvrde: ${taskIds.length - historyMap.size}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
