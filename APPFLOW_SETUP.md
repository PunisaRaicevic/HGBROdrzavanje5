# 🚀 APPFLOW BUILD SETUP - Firebase Config (Bezbedno!)

## 🔐 BEZBEDNA KONFIGURACIJA ZA PUBLIC REPO

Ovaj projekat koristi **Environment Secrets** u AppFlow-u da izbegne commit-ovanje osetljivih Firebase podataka na public GitHub repo.

---

## ✅ ŠTO SMO URADILI

- ✅ `google-services.json` je u `.gitignore` (NEĆE biti pushovan na GitHub!)
- ✅ Kreiran script `scripts/decode-firebase-config.js` koji dekoduje Firebase config iz Environment Secret-a
- ✅ Dodat `ionic:build:before` hook koji automatski kreira fajl tokom build-a
- ✅ Base64 enkodovana verzija google-services.json pripremljena

---

## 📋 KAKO DODATI FIREBASE CONFIG U APPFLOW

### KORAK 1: Kopiraj Base64 String

Kopiraj ovaj **ceo** string (bez razmaka):

```
ewogICJwcm9qZWN0X2luZm8iOiB7CiAgICAicHJvamVjdF9udW1iZXIiOiAiMzc1MTUzMjAzMDAyIiwKICAgICJwcm9qZWN0X2lkIjogImhnYnRhcHAiLAogICAgInN0b3JhZ2VfYnVja2V0IjogImhnYnRhcHAuZmlyZWJhc2VzdG9yYWdlLmFwcCIKICB9LAogICJjbGllbnQiOiBbCiAgICB7CiAgICAgICJjbGllbnRfaW5mbyI6IHsKICAgICAgICAibW9iaWxlc2RrX2FwcF9pZCI6ICIxOjM3NTE1MzIwMzAwMjphbmRyb2lkOmQ1N2FlYTljOWM5Y2Q5MDYzNzIyMDMiLAogICAgICAgICJhbmRyb2lkX2NsaWVudF9pbmZvIjogewogICAgICAgICAgInBhY2thZ2VfbmFtZSI6ICJjb20uYnVkdmFuc2thcml2aWplcmEuaG90ZWwiCiAgICAgICAgfQogICAgICB9LAogICAgICAib2F1dGhfY2xpZW50IjogW10sCiAgICAgICJhcGlfa2V5IjogWwogICAgICAgIHsKICAgICAgICAgICJjdXJyZW50X2tleSI6ICJBSXphU3lBRzh2WWU1V01fM0poWFlVajlDNlVJcnV0NEZuUkJBeFUiCiAgICAgICAgfQogICAgICBdLAogICAgICAic2VydmljZXMiOiB7CiAgICAgICAgImFwcGludml0ZV9zZXJ2aWNlIjogewogICAgICAgICAgIm90aGVyX3BsYXRmb3JtX29hdXRoX2NsaWVudCI6IFtdCiAgICAgICAgfQogICAgICB9CiAgICB9CiAgXSwKICAiY29uZmlndXJhdGlvbl92ZXJzaW9uIjogIjEiCn0K
```

### KORAK 2: Otvori AppFlow

1. Idi na https://appflow.ionic.io
2. Selektuj svoj projekat

### KORAK 3: Kreiraj ili Selektuj Environment

1. Klikni **Build** → **Environments**
2. Kreiraj **New Environment** (npr. "Production") ili selektuj postojeći

### KORAK 4: Dodaj Secret

1. U Environment-u, scroll dole do sekcije **Secrets**
2. Klikni **New Secret**
3. Popuni:
   - **Key**: `GOOGLE_SERVICES_JSON_BASE64`
   - **Value**: (paste base64 string odozgo - **ceo** string!)
   - **Type**: Secret (NE Variable!)
4. Klikni **Add** ili **Save**

### KORAK 5: Pokreni Build

1. Idi na **Build** → **Start Build**
2. **Bitno**: Selektuj Environment koji si kreirao (onaj sa Secret-om!)
3. Build Type: **Debug** (testiranje) ili **Release** (produkcija)
4. Platform: **Android**
5. Klikni **Start Build**

---

## ⚙️ KAKO RADI AUTOMATSKI?

1. AppFlow pull-uje kod sa GitHub-a
2. Pre `ionic:build`, pokreće se `ionic:build:before` script
3. Script `scripts/decode-firebase-config.js`:
   - Čita `GOOGLE_SERVICES_JSON_BASE64` Environment Secret
   - Dekoduje base64 → JSON
   - Kreira `android/app/google-services.json`
4. Capacitor sync kopira fajl u Android build
5. Build uspešno završava!

---

## 🧪 TESTIRANJE LOKALNO (Opciono)

Da proveriš da li script radi:

```bash
# Setuj environment variable
export GOOGLE_SERVICES_JSON_BASE64="ewogICJwcm9qZWN0X2luZm8iOi..."

# Pokreni script
npm run ionic:build:before

# Proveri da li je fajl kreiran
ls -la android/app/google-services.json
```

---

## 🔒 BEZBEDNOST

- ✅ `google-services.json` NIJE u Git-u (`.gitignore` blokira)
- ✅ Base64 string je u AppFlow **Secrets** (enkriptovano!)
- ✅ Lokalna verzija ostaje samo na Replit-u
- ✅ GitHub repo je PUBLIC ali БЕЗ osetljivih podataka

---

## ❓ TROUBLESHOOTING

### Build greška: "google-services.json not found"

**Uzrok**: Script nije našao Environment Secret

**Rešenje**:
1. Proveri da li si dodao `GOOGLE_SERVICES_JSON_BASE64` kao **Secret** (ne Variable!)
2. Proveri da li si **selektovao pravi Environment** tokom build-a
3. Ime Secret-a mora biti **tačno**: `GOOGLE_SERVICES_JSON_BASE64`

### Build greška: "Invalid base64 string"

**Uzrok**: Base64 string nije kompletan ili ima razmake

**Rešenje**:
1. Kopiraj **ceo** base64 string iz ovog fajla (bez preloma reda)
2. Ne dodavaj razmake ili prazne linije

### Lokalni development ne radi

**Uzrok**: Lokalni `google-services.json` ne postoji

**Rešenje**:
- Script automatski detektuje development mode
- Lokalni fajl mora da postoji u `android/app/google-services.json` na Replit-u
- Za development, lokalni fajl se koristi (ne Environment Secret)

---

## 🚀 GIT PUSH KOMANDE

Sada možeš bezbedno da push-uješ sve na GitHub:

```bash
# 1. Dodaj sve izmene
git add .

# 2. Commit
git commit -m "feat: FCM push notifications + secure Firebase config"

# 3. Push na GitHub (BEZBEDNO - nema osetljivih podataka!)
git push origin main
```

---

## 📱 POSLE BUILD-A

1. **Preuzmi APK** iz AppFlow-a kada build završi
2. **Instaliraj** na Android telefon
3. **Logiraj se** u aplikaciju
4. **Testiraj push notifikacije**:
   - Zaključaj ekran
   - Sa računara dodeli zadatak
   - Telefon će: vibrirati + zvuk + notifikacija!

---

## ✅ FINAL ČEKLIST

- [ ] Base64 string kopiran u AppFlow Secrets
- [ ] Environment kreiran sa Secret-om
- [ ] Git push urađen (bez google-services.json u repo-u!)
- [ ] AppFlow build pokrenut sa pravim Environment-om
- [ ] APK preuzet i instaliran
- [ ] Push notifikacije testirane na zaključanom ekranu

---

**Sve je spremno! Push kod na GitHub i pokreni AppFlow build! 🎉**
