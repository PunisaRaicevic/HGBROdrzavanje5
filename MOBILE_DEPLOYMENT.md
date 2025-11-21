# 📱 Ionic AppFlow Mobile Deployment Guide

## Setup Instructions

### 1. **Environment Variables u AppFlow**

U Ionic AppFlow dashboard-u, dodajte sledeće environment variables:

**Build** → **Environments** → **Shared Values**

```
VITE_SUPABASE_URL=https://dxgfgppdtgrgzxneludd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Z2ZncHBkdGdyZ3p4bmVsdWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODIxODgsImV4cCI6MjA3Nzc1ODE4OH0.EKu3ny1pr_-Hp0UH9Jhcb9lETfPwLivbHD_Kls32XIA
VITE_API_URL=https://your-replit-app-url.repl.co
```

**VAŽNO:** Zamenite `VITE_API_URL` sa stvarnom Replit URL adresom vašeg backend servera!

### 2. **Pronaći Replit URL**

1. Otvorite Replit projekat
2. Pokrenite aplikaciju (`Start application` workflow)
3. URL je prikazan u Webview-u (obično `https://xxxxx.repl.co` ili `https://project-name-username.replit.app`)

**Primer:**
```
VITE_API_URL=https://hotel-maintenance-app-punisaraicevic.replit.app
```

### 3. **Kreiranje Build-a u AppFlow**

1. **Build** → **New Build**
2. **Platform**: Android
3. **Build Type**: Release
4. **Target**: Android (API 34+)
5. **Commit**: Latest
6. **Environment**: Production (sa postavljenim env variables)

### 4. **Download APK**

Nakon što build završi (~5-15 minuta):
1. Kliknite na build u listi
2. Download `.apk` fajl
3. Prebacite na Android telefon
4. Instalirajte aplikaciju

---

## Testiranje

### Na telefonu:
1. Omogućite "Install from unknown sources" u Settings
2. Instalirajte APK
3. Otvorite aplikaciju
4. Pokušajte da se prijavite

### Native Features:
- ✅ **Haptic Feedback** - Vibracija pri task assignment-u
- ✅ **Native Notifications** - Zvuk + notifikacija
- ✅ **Camera** - Foto upload za task-ove

---

## Troubleshooting

### **Problem: Aplikacija ne može da se poveže sa serverom**

**Provera:**
```bash
# Testirajte da li server radi
curl https://your-replit-url.repl.co/api/auth/login

# Trebalo bi da vrati: {"error":"Email and password are required"}
```

**Rešenje:**
- Proverite da li je `VITE_API_URL` ispravno postavljen u AppFlow environment variables
- Proverite da li Replit aplikacija radi (Start application workflow)
- Proverite da li je Replit URL dostupan javno (ne spava li se)

### **Problem: "Invalid email or password"**

**Rešenje:**
- Proverite da li korisnik postoji u Supabase bazi
- Proverite da li je `VITE_SUPABASE_URL` ispravan
- Proverite da li je `VITE_SUPABASE_ANON_KEY` ispravan

### **Problem: Notifications ne rade**

**Rešenje:**
- Dozvole za notifikacije moraju biti odobrene u Android Settings
- Aplikacija će tražiti dozvolu pri prvom pokretanju

---

## Production Checklist

- [ ] VITE_API_URL postavljen u AppFlow
- [ ] VITE_SUPABASE_URL postavljen u AppFlow
- [ ] VITE_SUPABASE_ANON_KEY postavljen u AppFlow
- [ ] Replit aplikacija radi i dostupna je javno
- [ ] Build uspešno završen u AppFlow
- [ ] APK testiran na fizičkom uređaju
- [ ] Login funkcioniše
- [ ] Native features rade (haptics, notifications)

---

## Napredne Opcije

### iOS Build (.ipa)

Za iOS build, potrebno je:
1. Apple Developer nalog ($99/godišnje)
2. Signing Certificate i Provisioning Profile
3. Build Target: iOS u AppFlow

### CI/CD Automation

AppFlow podržava automatske build-ove na svaki push na GitHub:
1. **Automate** tab u AppFlow
2. Connect GitHub branch
3. Enable automatic builds
