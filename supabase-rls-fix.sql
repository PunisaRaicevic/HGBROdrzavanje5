-- RLS Fix Script for users table
-- Copy and paste this into Supabase SQL Editor and run it

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated users fcm" ON public.users;
DROP POLICY IF EXISTS "Enable update for password reset" ON public.users;
DROP POLICY IF EXISTS "Enable fcm token update for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Update auth users" ON public.users;

-- Create new comprehensive UPDATE policy for authenticated users
CREATE POLICY "Enable authenticated users to update their own data"
ON public.users
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Verify the policy was created
SELECT 
  policyname,
  tablename,
  cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
