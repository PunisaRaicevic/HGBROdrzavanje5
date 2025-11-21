# Supabase Setup Instructions

## 1. Uklanjanje Constraint-a za Prilagođene Intervale Ponavljanja

Da biste omogućili prilagođene intervale ponavljanja zadataka (npr. "svaka 3 dana", "svaka 4 meseca"), potrebno je ukloniti postojeći check constraint na `recurrence_pattern` koloni.

### Koraci:

1. Idite na Supabase Dashboard
2. Otvorite SQL Editor
3. Izvršite sledeći SQL:

```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_pattern_check;
```

4. Kliknite "Run" ili pritisnite Ctrl+Enter

### Provera da li je uspešno:

Nakon izvršavanja SQL-a, pokušajte da kreirate zadatak sa prilagođenim intervalom ponavljanja.

### Šta omogućava ova promena:

- **Pre**: Samo standardni intervali (dnevno, nedeljno, mesečno, godišnje)
- **Posle**: Prilagođeni intervali (svaka 3 dana, svaka 4 meseca, itd.)

### Format skladištenja:

Prilagođeni intervali se skladište u formatu: `{broj}_{jedinica}`

Primeri:
- `3_days` - svaka 3 dana
- `2_weeks` - svake 2 nedelje
- `4_months` - svaka 4 meseca
- `2_years` - svake 2 godine

---

## 2. Dodavanje Polja za Praćenje Ko Je Završio Zadatak

Da bi sistem mogao da prikaže ko je završio zadatak, potrebno je dodati `completed_by` i `completed_by_name` kolone u `tasks` tabelu.

### Koraci:

1. Idite na Supabase Dashboard
2. Otvorite SQL Editor
3. Izvršite sledeći SQL:

```sql
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS completed_by VARCHAR,
  ADD COLUMN IF NOT EXISTS completed_by_name TEXT;
```

4. Kliknite "Run" ili pritisnite Ctrl+Enter

### Šta omogućava ova promena:

- **Pre**: Sistem nije beležio ko je tačno završio zadatak
- **Posle**: Sistem beleži ID i ime korisnika koji je označio zadatak kao završen

### Gde se koristi:

- ComplaintSubmissionDashboard: Prikazuje ime osobe koja je završila prijavljeni problem
- Task history: Omogućava tačno praćenje ko je završio svaki zadatak
