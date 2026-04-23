import { supabase } from '../lib/supabase';
import { uploadIfBase64, isBase64Image } from '../lib/imageStorage';

interface TaskRow {
  id: string;
  created_by: string | null;
  assigned_to: string | null;
  images: string[] | null;
  worker_images: string[] | null;
}

async function migrateArray(
  arr: string[] | null,
  folder: string,
): Promise<{ urls: string[] | null; converted: number }> {
  if (!arr || arr.length === 0) return { urls: arr, converted: 0 };
  let converted = 0;
  const out: string[] = [];
  for (const item of arr) {
    if (isBase64Image(item)) {
      const url = await uploadIfBase64(item, folder);
      if (url !== item) converted++;
      out.push(url);
    } else {
      out.push(item);
    }
  }
  return { urls: out, converted };
}

async function fetchTaskIdsWithBase64(): Promise<string[]> {
  console.log('Fetching all task IDs (lightweight)...');
  const ids = new Set<string>();
  const pageSize = 500;
  let from = 0;
  while (true) {
    console.log(`  fetching range ${from}-${from + pageSize - 1}...`);
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('  ERROR:', error);
      throw error;
    }
    if (!data || data.length === 0) break;
    console.log(`  got ${data.length} ids`);
    data.forEach((r: any) => ids.add(r.id));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Total ${ids.size} task IDs collected`);
  return Array.from(ids);
}

async function fetchTaskOne(id: string): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, created_by, assigned_to, images, worker_images')
    .eq('id', id)
    .single();
  if (error) {
    console.error(`fetch task ${id} error:`, error.message);
    return null;
  }
  return data as TaskRow;
}

async function main() {
  console.log('=== MIGRATION: Base64 -> Supabase Storage ===');
  const ids = await fetchTaskIdsWithBase64();
  console.log(`Loaded ${ids.length} task IDs with potential images`);

  let totalConverted = 0;
  let updatedTasks = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const t = await fetchTaskOne(id);
      if (!t) { errors++; continue; }

      const hasReporterB64 = (t.images || []).some(isBase64Image);
      const hasWorkerB64 = (t.worker_images || []).some(isBase64Image);
      if (!hasReporterB64 && !hasWorkerB64) { skipped++; continue; }

      const reporter = await migrateArray(t.images, `reporter/${t.created_by || 'unknown'}`);
      const worker = await migrateArray(t.worker_images, `worker/${t.assigned_to || 'unknown'}`);

      const update: any = {};
      if (hasReporterB64) update.images = reporter.urls;
      if (hasWorkerB64) update.worker_images = worker.urls;

      const { error } = await supabase.from('tasks').update(update).eq('id', t.id);
      if (error) throw error;

      totalConverted += reporter.converted + worker.converted;
      updatedTasks++;

      if (i % 10 === 0 || reporter.converted + worker.converted > 0) {
        console.log(
          `[${i + 1}/${ids.length}] ${t.id.slice(0, 8)} - reporter: +${reporter.converted}, worker: +${worker.converted} (total converted: ${totalConverted})`,
        );
      }
    } catch (err: any) {
      errors++;
      console.error(`[${i + 1}/${ids.length}] task ${id} FAILED:`, err.message || err);
    }
  }

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Tasks updated: ${updatedTasks}`);
  console.log(`Tasks skipped (already URLs): ${skipped}`);
  console.log(`Images converted: ${totalConverted}`);
  console.log(`Errors: ${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
