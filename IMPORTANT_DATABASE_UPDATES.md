# 🚨 VAŽNE PROMENE U BAZI PODATAKA

## 📋 Šta je Urađeno:

### 1. **Multi-Technician Assignment Support** ✅
- Sada možete dodeliti **više majstora** na jedan zadatak
- Frontend već podržava selekciju više majstora
- Backend prima comma-separated IDs

### 2. **Operator Dashboard Button Fix** ✅  
- Dugmad "Pošalji Šefu" / "Pošalji Majstoru" sada se prikazuju i kada se zadatak vrati operateru
- Statusi koji prikazuju dugmad: `new`, `with_operator`, `returned_to_operator`

### 3. **Worker Report & Images** ✅
- Majstori mogu da dodaju izveštaje i slike kada završe zadatak
- Backend čuva `worker_report` i `worker_images`

---

## ⚠️ OBAVEZNO: Pokrenite SQL Migraciju u Supabase

### Koraci:

1. **Otvorite Supabase Dashboard**
   - Idite na: https://supabase.com/dashboard
   - Odaberite vaš projekat
   - Kliknite na **SQL Editor** (levi meni)

2. **Kopirajte i Pokrenite SQL**
   - Otvorite fajl: `supabase_migrations/01_multi_technician_support.sql`
   - **Kopirajte SVE** iz fajla
   - **Nalepite** u SQL Editor u Supabase
   - Kliknite **RUN** (ili F5)

3. **Proverite Rezultate**
   - U SQL Editor, pokrenite verification queries sa kraja SQL fajla:
   
   ```sql
   -- Proverite tipove kolona
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'tasks' 
     AND column_name IN ('assigned_to', 'assigned_to_name', 'worker_report', 'worker_images');
   
   -- Proverite RLS policies
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename = 'tasks' AND policyname = 'Radnici view assigned tasks';
   ```

4. **Očekivani Rezultati:**
   - `assigned_to` → tip: **text** (ne UUID)
   - `assigned_to_name` → tip: **text**
   - `worker_report` → tip: **text**
   - `worker_images` → tip: **text[]** (array)
   - RLS policy "Radnici view assigned tasks" → treba da postoji

---

## 🧪 Kako Testirati:

### Test 1: Multi-Technician Assignment

1. **Ulogujte se kao Operator** (aleksandar@hotel.me / password123)
2. Kliknite na novi zadatak
3. Kliknite **"Pošalji Majstoru"**
4. **Izaberite 2 ili 3 majstora** (npr. Jovan, Marko)
5. Kliknite **"Pošalji Majstorima (2)"** ili (3)
6. ✅ Zadatak bi trebalo da se deli između svih izabranih majstora

### Test 2: Worker Sees Multi-Assigned Task

1. **Ulogujte se kao Radnik 1** (jovan@hotel.me / password123)
2. Proverite da li vidite zadatak u "Active Tasks"
3. **Ulogujte se kao Radnik 2** (drugi majstor koga ste izabrali)
4. ✅ Oba majstora bi trebalo da vide isti zadatak

### Test 3: Operator Buttons After Return

1. **Ulogujte se kao Radnik** (jovan@hotel.me / password123)
2. Otvorite zadatak i kliknite **"Return to Supervisor"**
3. Unesite razlog i submit
4. **Ulogujte se kao Operator** (aleksandar@hotel.me / password123)
5. ✅ Trebalo bi da vidite dugmad "Pošalji Šefu" / "Pošalji Majstoru" za vraćeni zadatak

---

## 📝 Tehnički Detalji:

### Format Skladištenja:

- **assigned_to**: `"uuid1,uuid2,uuid3"` (comma-separated UUIDs)
- **assigned_to_name**: `"Jovan Petrović, Marko Jovanović, Stefan Nikolić"` (comma-separated imena)

### RLS Policy:

Novi policy koristi `string_to_array()` da parsira comma-separated IDs:

```sql
CREATE POLICY "Radnici view assigned tasks" ON tasks
  FOR SELECT
  USING (
    auth.uid()::text = ANY(
      string_to_array(
        COALESCE(REPLACE(assigned_to, ' ', ''), ''), 
        ','
      )
    )
  );
```

---

## 🐛 Ako Imate Problema:

### Problem: "Ne vidim dugmad u Operator Dashboard"
- **Rešenje**: Proverite da li su zadaci u statusu 'new', 'with_operator', ili 'returned_to_operator'

### Problem: "Ne mogu da dodelim više majstora"
- **Rešenje**: Pokrenite SQL migraciju. Kolona `assigned_to` mora biti TEXT tip, ne UUID.

### Problem: "Majstor ne vidi zadatak"
- **Rešenje**: 
  1. Proverite da li je RLS policy pravilno kreiran
  2. Pokrenite verification query gore
  3. Proverite da li je majstor stvarno selektovan (pogledajte assigned_to u bazi)

---

## 📞 Test Nalozi:

| Email                    | Password     | Rola        |
|--------------------------|--------------|-------------|
| aleksandar@hotel.me      | password123  | Operator    |
| milica@hotel.me          | password123  | Recepcioner |
| petar@hotel.me           | password123  | Sef         |
| jovan@hotel.me           | password123  | Radnik      |

---

## ✅ Checklist Pre Testiranja:

- [ ] Pokrenuo sam SQL migraciju u Supabase
- [ ] Proverio sam da su nove kolone kreirane
- [ ] Proverio sam da je RLS policy kreiran
- [ ] Server je restartovan (`npm run dev`)
- [ ] Otvoren browser na http://localhost:5000

---

**Ako sve radi kako treba, možete nastaviti sa korišćenjem sistema!** 🎉
