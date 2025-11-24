-- DIREKTAN TEST: Pronađi korisnika i update-uj fcm_token kolonu
-- Pokrenite ovo u Supabase SQL Editor

-- Prvo: Pronađite korisnika "aleksandar"
SELECT id, username, full_name, fcm_token 
FROM public.users 
WHERE username = 'aleksandar';

-- Drugo: Direktno update-ujte fcm_token za "aleksandar"
UPDATE public.users 
SET fcm_token = 'TEST_TOKEN_12345' 
WHERE username = 'aleksandar'
RETURNING id, username, fcm_token;

-- Treće: Provjerite da li je update uspio
SELECT id, username, fcm_token 
FROM public.users 
WHERE username = 'aleksandar';

-- Četvrto: Provjerite RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Peto: Provjerite sve RLS policy-je
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
