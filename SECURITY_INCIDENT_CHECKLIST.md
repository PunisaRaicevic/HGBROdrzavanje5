# 🚨 FIREBASE CREDENTIALS SECURITY INCIDENT - ACTION CHECKLIST

## ⚠️ KRITIČNO: Google će deaktivirati vaše Firebase credentials!

**Izloženi key**: `3da29cd068cc4223984663a9ae51e4e0c37daaf0`
**Status**: Detektovan na GitHub-u, Google će ga uskoro deaktivirati

---

## ✅ COMPLETED (BY REPLIT AGENT)

- [x] Obrisani lokalni credentials fajlovi iz `attached_assets/` (2 fajla obrisana)
- [x] Verifikovan `.gitignore` (već pokriva credentials)
- [x] Verifikovano da aplikacija koristi env variables (sigurno!)
- [x] **NOVI CREDENTIALS USPEŠNO PRIMENJENI!**
  - Novi key ID: `3dc3d1aa4a9142c78bf1114e340648dc4cb69487`
  - Replit Secrets ažurirani (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  - Server restartovan
  - Firebase Admin SDK inicijalizovan ✅
  - **STATUS**: Push notifikacije spremne za testiranje!

---

## ✅ STEPS 1-3: COMPLETED!

### ~~1. ROTIRAJTE FIREBASE CREDENTIALS~~ ✅ DONE
- [x] Novi key generisan: `3dc3d1aa4a9142c78bf1114e340648dc4cb69487`

### ~~2. AŽURIRAJTE REPLIT SECRETS~~ ✅ DONE
- [x] FIREBASE_PROJECT_ID ažuriran
- [x] FIREBASE_CLIENT_EMAIL ažuriran
- [x] FIREBASE_PRIVATE_KEY ažuriran

### ~~3. RESTARTUJTE REPLIT SERVER~~ ✅ DONE
- [x] Server restartovan
- [x] Firebase Admin SDK uspešno inicijalizovan
- [x] Log potvrđuje: `✅ Firebase Admin SDK uspešno inicijalizovan`
- [x] Log potvrđuje: `📱 FCM Project: hgbtapp`

---

## 🟡 REMAINING ACTIONS (YOU MUST DO)

### 4. OBRIŠITE CREDENTIALS SA GITHUB-A (15 min) - **KRITIČNO!**

**⚠️ KRITIČNO: Čak i ako obrišete fajl, on ostaje u Git history!**

#### Opcija A: BFG Repo-Cleaner (BRŽE)
```bash
# 1. Instalirajte BFG (na vašem računaru)
brew install bfg  # macOS
# ili preuzmite sa: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Klonirajte repo
git clone --mirror https://github.com/PunisaRaicevic/HGBROdrzavanje5.git

# 3. Obrišite credentials iz history-ja
bfg --delete-files "*service-account*" HGBROdrzavanje5.git

# 4. Expire reflog i garbage collect
cd HGBROdrzavanje5.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 5. Force push (PAŽLJIVO!)
git push --force
```

#### Opcija B: Kontaktirajte GitHub Support (JEDNOSTAVNIJE)
```
1. Idite na: https://support.github.com/contact
2. Odaberite "Security" → "Sensitive data removal"
3. Navedite:
   - Repo: PunisaRaicevic/HGBROdrzavanje5
   - Fajlovi: attached_assets/*service-account*.txt
   - Commit: a2c5e04c05256b262fd638ff64a09ee243fd69dc
4. GitHub će očistiti history za vas (može trajati 1-2 dana)
```

---

### 5. PROVERITE FIREBASE AKTIVNOST (10 min)

**Idite na Firebase Console:**
```
https://console.firebase.google.com/project/hgbtapp
```

**Proverite:**
1. **Cloud Messaging** → Pogledajte broj poslanih notifikacija (da li je normalan?)
2. **Usage** → Proverite neobičnu aktivnost
3. **Audit Logs** → Potražite nepoznate IP adrese

**Ako vidite sumnjive aktivnosti:**
- Odmah deaktivirajte stari key
- Promenite sve credentials
- Kontaktirajte Firebase Support

---

### 6. TESTIRAJTE PUSH NOTIFIKACIJE (5 min)

Nakon što restartujete server sa novim credentials:

1. Kreirajte novi zadatak u aplikaciji
2. Dodelite ga korisniku (npr. Milica)
3. Proverite da li korisnik dobija push notifikaciju
4. Proverite log u Replit-u:
   ```
   📥 Webhook primljen: ...
   📱 Pronađeno X aktivnih tokena za korisnika ...
   ✅ FCM push notifikacija uspešno poslata: ...
   ```

---

## 📋 VERIFICATION CHECKLIST

Proverite sve ove stavke:

- [ ] Novi Firebase key generisan u Console
- [ ] Replit Secrets ažurirani (sva 3)
- [ ] Server restartovan i log pokazuje `✅ Firebase Admin SDK uspešno inicijalizovan`
- [ ] Test push notifikacija radi
- [ ] GitHub repo očišćen (credentials obrisani iz history-ja)
- [ ] Firebase Audit Logs provereni (nema sumnjive aktivnosti)
- [ ] Stari key deaktiviran u Firebase Console (nakon što je novi testiran)

---

## 🚨 IF SOMETHING GOES WRONG

**Push notifikacije ne rade nakon rotiranja:**
1. Proverite da li su Secrets tačno kopirani (bez dodatnih space-ova)
2. Proverite da li je `FIREBASE_PRIVATE_KEY` CELA vrednost sa `\n`
3. Pogledajte Replit log za greške
4. Restartujte server ponovo

**Stari key još nije deaktiviran:**
- Google ga deaktivira automatski (može trajati do 24h)
- Možete ručno deaktivirati u Firebase Console → Service Accounts → Keys → Delete old key

**Trebate pomoć:**
- Kontaktirajte Firebase Support: https://firebase.google.com/support
- Kontaktirajte GitHub Support: https://support.github.com/contact

---

## ✅ WHEN YOU'RE DONE

Javite Replit Agentu: "Credentials su rotirani, testirajmo push notifikacije!"

Agent će verifikovati da sve radi i potvrditi da je security incident rešen.

---

**Last updated**: 2025-11-25
**Incident**: Firebase service account key exposed on GitHub
**Status**: Waiting for user action (credential rotation)
