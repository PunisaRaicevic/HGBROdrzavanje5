BEGIN;
LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;
CREATE SEQUENCE IF NOT EXISTS public.tasks_task_number_seq;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_number integer;
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id)
    + COALESCE((SELECT max(task_number) FROM public.tasks), 0) AS number
  FROM public.tasks WHERE task_number IS NULL
)
UPDATE public.tasks t SET task_number = numbered.number
FROM numbered WHERE t.id = numbered.id;
SELECT setval('public.tasks_task_number_seq',
  GREATEST(COALESCE((SELECT max(task_number) FROM public.tasks), 0) + 1, 1), false);
ALTER SEQUENCE public.tasks_task_number_seq OWNED BY public.tasks.task_number;
ALTER TABLE public.tasks ALTER COLUMN task_number SET DEFAULT nextval('public.tasks_task_number_seq');
ALTER TABLE public.tasks ALTER COLUMN task_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_task_number_unique ON public.tasks(task_number);
COMMIT;