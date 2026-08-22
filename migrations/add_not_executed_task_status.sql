ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check,
  ADD CONSTRAINT tasks_status_check CHECK (
    status = ANY (
      ARRAY[
        'new'::text,
        'with_operator'::text,
        'assigned_to_radnik'::text,
        'with_sef'::text,
        'with_external'::text,
        'returned_to_operator'::text,
        'returned_to_sef'::text,
        'not_executed'::text,
        'completed'::text,
        'cancelled'::text,
        'in_progress'::text,
        'accepted'::text,
        'rejected'::text
      ]
    )
  );