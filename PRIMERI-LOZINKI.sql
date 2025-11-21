-- ═══════════════════════════════════════════════════════════════════════════
-- PRIMERI POSTAVLJANJA LOZINKI U SUPABASE
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 🔐 NAČIN 1: DIREKTNO UBACIVANJE OBIČNOG TEKSTA (PREPORUČENO)
-- ───────────────────────────────────────────────────────────────────────────

-- Primer 1: Novi korisnik sa plaintext lozinkom
INSERT INTO users (email, password_hash, role, department_id, full_name, is_active)
VALUES (
  'test@hotel.me',
  'password123',                    -- ✅ Običan tekst!
  'radnik',
  1,
  'Test Korisnik',
  true
);

-- Primer 2: Resetovanje lozinke na plaintext
UPDATE users 
SET password_hash = 'novaSifra456'  -- ✅ Običan tekst!
WHERE email = 'aleksandar@hotel.me';

-- Primer 3: Batch insert sa plaintext lozinkama
INSERT INTO users (email, password_hash, role, department_id, full_name, is_active)
VALUES 
  ('marko@hotel.me', 'marko123', 'radnik', 1, 'Marko Petrović', true),
  ('ana@hotel.me', 'ana456', 'recepcioner', 2, 'Ana Jovanović', true),
  ('petar@hotel.me', 'petar789', 'sef', 1, 'Petar Nikolić', true);


-- ───────────────────────────────────────────────────────────────────────────
-- 🔧 NAČIN 2: KORIŠĆENJE BCRYPT HASH-A
-- ───────────────────────────────────────────────────────────────────────────

-- Korak 1: Generiši hash koristeći Node.js skriptu
--   npx tsx scripts/generate-password-hash.ts mojPassword123

-- Korak 2: Ubaci generisani hash u Supabase

-- Primer 4: Insert sa bcrypt hash-om
INSERT INTO users (email, password_hash, role, department_id, full_name, is_active)
VALUES (
  'hashed@hotel.me',
  '$2b$10$pR8/N5DSnL.qGo9dw4bnq.wJSAkmNQfBoTyMM/uFarRDQZHfDXW/G',  -- Hash za 'testPassword123'
  'operater',
  3,
  'Hash Korisnik',
  true
);

-- Primer 5: Update sa bcrypt hash-om
UPDATE users 
SET password_hash = '$2b$10$AnotherHashExample...'
WHERE email = 'marko@hotel.me';


-- ───────────────────────────────────────────────────────────────────────────
-- 📊 PROVERA TRENUTNOG STANJA LOZINKI
-- ───────────────────────────────────────────────────────────────────────────

-- Proveri sve korisnike i tip njihovih lozinki
SELECT 
  email,
  full_name,
  CASE 
    WHEN password_hash LIKE '$2a$%' THEN '🔒 Bcrypt Hash (2a)'
    WHEN password_hash LIKE '$2b$%' THEN '🔒 Bcrypt Hash (2b)'
    WHEN password_hash LIKE '$2y$%' THEN '🔒 Bcrypt Hash (2y)'
    ELSE '📝 Plaintext (će biti hash-ovano pri loginu)'
  END as password_type,
  LEFT(password_hash, 30) || '...' as password_preview
FROM users
WHERE is_active = true
ORDER BY email;


-- ───────────────────────────────────────────────────────────────────────────
-- 🛠️ KORISNE QUERY-e ZA UPRAVLJANJE
-- ───────────────────────────────────────────────────────────────────────────

-- Pronađi sve korisnike sa plaintext lozinkama
SELECT email, full_name, password_hash
FROM users
WHERE NOT (
  password_hash LIKE '$2a$%' OR 
  password_hash LIKE '$2b$%' OR 
  password_hash LIKE '$2y$%'
)
AND is_active = true;

-- Pronađi sve korisnike sa bcrypt hash-ovanim lozinkama
SELECT email, full_name, LEFT(password_hash, 30) || '...' as hash_preview
FROM users
WHERE (
  password_hash LIKE '$2a$%' OR 
  password_hash LIKE '$2b$%' OR 
  password_hash LIKE '$2y$%'
)
AND is_active = true;

-- Proveri koliko korisnika ima koji tip lozinke
SELECT 
  CASE 
    WHEN password_hash LIKE '$2%' THEN 'Bcrypt Hash'
    ELSE 'Plaintext'
  END as password_type,
  COUNT(*) as count
FROM users
WHERE is_active = true
GROUP BY password_type;


-- ───────────────────────────────────────────────────────────────────────────
-- 📋 TESTIRANJE LOGIN-A
-- ───────────────────────────────────────────────────────────────────────────

-- Test korisnici za login testiranje:

-- 1. Plaintext lozinka (password123):
--    Email: test@hotel.me
--    Lozinka: password123

-- 2. Bcrypt hash lozinka (testPassword123):
--    Email: hashed@hotel.me
--    Lozinka: testPassword123

-- 3. Postojeći korisnik (password123):
--    Email: aleksandar@hotel.me
--    Lozinka: password123


-- ───────────────────────────────────────────────────────────────────────────
-- 🚨 NAPOMENE
-- ───────────────────────────────────────────────────────────────────────────

/*
1. AUTOMATSKO HASH-OVANJE:
   - Svaka plaintext lozinka se automatski hash-uje pri PRVOM uspešnom loginu
   - Nakon toga, u bazi će biti bcrypt hash umesto plaintext-a
   
2. BEZBEDNOST:
   - Plaintext lozinke su sigurne samo PRIVREMENO
   - Sistem ih automatski konvertuje u bcrypt hash
   - Nakon konverzije, nemoguće je videti original lozinku
   
3. PREPORUKE:
   - Za produkciju: koristi hash generator
   - Za testiranje/development: koristi plaintext
   - Za batch import: generiši hash-ove unapred
   
4. FORMAT HASH-A:
   $2a$10$... ili $2b$10$... = bcrypt hash
   Sve ostalo = plaintext (biće hash-ovano)
*/


-- ═══════════════════════════════════════════════════════════════════════════
-- KRAJ PRIMERA
-- ═══════════════════════════════════════════════════════════════════════════
