# 🔐 Upravljanje Lozinkama - Vodič

## 📋 Pregled

Sistem sada podržava **dva načina** za postavljanje lozinki u Supabase:

### ✅ **Način 1: Direktno Ubacivanje Običnog Teksta (PREPORUČENO)**
- Najjednostavniji način!
- Ubaci običan tekst u Supabase (npr. `password123`)
- Aplikacija će **automatski hash-ovati** lozinku pri prvom loginu
- Bezbedno i praktično

### ✅ **Način 2: Korišćenje Hash Generatora**
- Za maksimalnu bezbednost
- Generiši bcrypt hash pa ga ubaci u Supabase
- Korisna za batch import korisnika

---

## 🚀 Način 1: Direktno Ubacivanje (Jednostavno)

### Koraci:

1. **Otvori Supabase**
   - Idi na svoju Supabase bazu podataka
   - Otvori tabelu `users`

2. **Ubaci Običan Tekst**
   ```
   Kolona: password_hash
   Vrednost: password123
   ```

3. **Loguj se u Aplikaciju**
   ```
   Email: korisnik@hotel.me
   Lozinka: password123
   ```

4. **Automatsko Hash-ovanje**
   - Pri prvom loginu, aplikacija detektuje plaintext
   - Automatski hash-uje lozinku sa bcrypt
   - Ažurira bazu sa sigurnim hash-om
   - Sledeći put će koristiti hash za validaciju

---

## 🔧 Način 2: Hash Generator (Napredni)

### Pokretanje Generatora:

```bash
npx tsx scripts/generate-password-hash.ts <tvoja-lozinka>
```

### Primer:

```bash
npx tsx scripts/generate-password-hash.ts mojPassword123
```

### Izlaz:

```
🔐 Generisanje bcrypt hash-a...

✅ Hash generisan uspešno!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lozinka: mojPassword123
Hash:    $2a$10$XyZ123AbC456...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Kopiraj gornji hash i ubaci ga u Supabase kolonu "password_hash"
```

### Koraci:

1. **Generiši Hash**
   ```bash
   npx tsx scripts/generate-password-hash.ts novaLozinka123
   ```

2. **Kopiraj Hash**
   - Kopiraj ceo hash (počinje sa `$2a$10$...`)

3. **Ubaci u Supabase**
   ```
   Kolona: password_hash
   Vrednost: $2a$10$XyZ123AbC456... (kopirani hash)
   ```

4. **Gotovo!**
   - Korisnik može odmah da se loguje

---

## 🔍 Kako Sistem Radi

### Detekcija Tipa Lozinke:

```typescript
// Sistem proverava da li je lozinka već hash
const isBcryptHash = password_hash?.startsWith('$2a$') || 
                     password_hash?.startsWith('$2b$') || 
                     password_hash?.startsWith('$2y$');

if (isBcryptHash) {
  // Hash-ovana lozinka - koristi bcrypt.compare()
  isValid = await bcrypt.compare(inputPassword, password_hash);
} else {
  // Plaintext lozinka - uporedi direktno
  isValid = inputPassword === password_hash;
  
  // Ako je validna, automatski hash-uj
  if (isValid) {
    const hash = await bcrypt.hash(inputPassword, 10);
    // Ažuriraj u bazi
  }
}
```

---

## 📝 Primeri Upotrebe

### Primer 1: Novi Korisnik (Plaintext)

```sql
-- U Supabase SQL Editor
INSERT INTO users (email, password_hash, role, department_id, is_active)
VALUES ('marko@hotel.me', 'marko123', 'radnik', 1, true);
```

✅ Pri prvom loginu: `marko123` → automatski postaje `$2a$10$...`

---

### Primer 2: Batch Import (Hash Generator)

```bash
# Generiši hash-ove za sve korisnike
npx tsx scripts/generate-password-hash.ts password1
npx tsx scripts/generate-password-hash.ts password2
npx tsx scripts/generate-password-hash.ts password3
```

```sql
-- Ubaci sve sa hash-ovima
INSERT INTO users VALUES
  ('user1@hotel.me', '$2a$10$hash1...', ...),
  ('user2@hotel.me', '$2a$10$hash2...', ...),
  ('user3@hotel.me', '$2a$10$hash3...', ...);
```

---

### Primer 3: Resetovanje Lozinke

**Brzi način:**
```sql
UPDATE users 
SET password_hash = 'novaSifra123' 
WHERE email = 'korisnik@hotel.me';
```
✅ Automatski hash-uje pri sledećem loginu

**Sigurni način:**
```bash
npx tsx scripts/generate-password-hash.ts novaSifra123
# Kopiraj hash...
```
```sql
UPDATE users 
SET password_hash = '$2a$10$copied_hash...' 
WHERE email = 'korisnik@hotel.me';
```

---

## 🛡️ Bezbednost

### Automatsko Hash-ovanje:
- ✅ Svaka plaintext lozinka se automatski hash-uje pri prvom loginu
- ✅ Hash se odmah čuva u bazu
- ✅ Sledeći login koristi siguran bcrypt hash
- ✅ Plaintext nikad ne ostaje u bazi nakon uspešnog logina

### Bcrypt Parametri:
```typescript
bcrypt.hash(password, 10) // 10 rounds (salt)
```

### Hash Format:
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 │  │  │                                                  │
 │  │  └─ Salt (22 chars)                                │
 │  └─── Rounds (10)                                      │
 └────── Algoritam (2a = bcrypt)                          └─ Hash (31 chars)
```

---

## 💡 FAQ

### Q: Mogu li imati i plaintext i hash lozinke u istoj bazi?
**A:** Da! Sistem automatski detektuje tip i obrađuje ih pravilno.

### Q: Da li se plaintext odmah briše iz baze?
**A:** Da, pri prvom uspešnom loginu, plaintext se zamenjuje sa bcrypt hash-om.

### Q: Šta ako unesem pogrešan plaintext?
**A:** Login neće raditi. Jednostavno ažuriraj vrednost u Supabase.

### Q: Mogu li da vidim plaintext lozinke nakon što se hash-uju?
**A:** Ne, bcrypt je jednosmerna enkripcija. Zapamti lozinke ili koristi plaintext metodu.

### Q: Koji način je bolji?
**A:** Plaintext (Način 1) za brzo testiranje, Hash Generator (Način 2) za produkciju.

---

## 📞 Podrška

Ako imaš problema:
1. Proveri da li je `password_hash` kolona TEXT tip u Supabase
2. Proveri da li je korisnik `is_active = true`
3. Proveri console logove aplikacije
4. Testiraj sa poznatim kredencijalima

---

**Sretno sa upravljanjem lozinkama!** 🎉
