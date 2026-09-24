ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS room_access_enabled boolean NOT NULL DEFAULT true;