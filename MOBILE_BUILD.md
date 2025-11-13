# 📱 Mobilna Aplikacija - Build Uputstvo

## Ikona Aplikacije

### ✅ Podešeno
Ikona je uspešno konfigurisana i spremna za AppFlow build:

- **Source ikona**: `assets/icon-only.png` (1024x1024px)
- **Generisane ikone**: Android mipmap folderi za sve rezolucije
- **Alat**: @capacitor/assets

### Android Ikone
Generisane ikone su smeštene u:
```
android/app/src/main/res/
├── mipmap-ldpi/
├── mipmap-mdpi/
├── mipmap-hdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/
```

## 🚀 Build Proces na Ionic AppFlow

### 1. Commit i Push na GitHub
Prvo commit-uj sledeće promene na GitHub:
- `assets/` folder (icon-only.png i icon-foreground.png)
- `android/app/src/main/res/mipmap-*/` folderi (sve generisane ikone)
- `MOBILE_BUILD.md` i `replit.md` (dokumentacija)

### 2. Build na AppFlow
1. Otvori [Ionic AppFlow](https://dashboard.ionicframework.com/)
2. Otvori projekt "HGBR Tehnička Služba"
3. Navigiraj na **Build** → **New Build**
4. Odaberi:
   - **Platform**: Android
   - **Build Type**: Release
   - **Commit**: Latest (ili specifičan commit)
5. Klikni **Start Build**

### 3. AppFlow Konfiguracija

**OBAVEZNO - Proveri Build Stack:**
U AppFlow-u, idi na **Build** → **Settings** → **Build Stack** i osiguraj da je podešeno:
- **Build Stack**: Node 20 (ili noviji)

Aplikacija **MORA koristiti Node 20+** jer koristi moderne JavaScript feature-e:
- Built-in `fetch()`
- `structuredClone()`
- Top-level `await`

Ako koristiš Node 18, build će **PASTI** sa ReferenceError!

**Environment Variables:**
U AppFlow-u, pod **Settings** → **Environments**, osiguraj da postoje:

```
VITE_API_URL=https://HGBRTehnickaSluzba.replit.app
```

### 4. Download APK
Nakon uspešnog build-a:
1. Klikni na build broj
2. Download **app-release.apk**
3. Instaliraj na Android uređaj

## 🔄 Ažuriranje Ikone

Ako želiš promeniti ikonu:

```bash
# 1. Zameni source ikonu (mora biti 1024x1024px kvadrat!)
cp nova-ikona.png assets/icon-only.png
cp nova-ikona.png assets/icon-foreground.png

# 2. Regeneriši sve rezolucije
npx capacitor-assets generate --iconBackgroundColor '#ffffff' --android

# 3. Sync sa Capacitor projektom
npx cap sync

# 4. Commit i push fajlove:
# - assets/ (icon-only.png, icon-foreground.png)
# - android/app/src/main/res/mipmap-*/ (sve generisane ikone)
```

## 📦 Trenutna Ikona

Trenutna ikona sadrži šarene geometrijske oblike koji predstavljaju hotel management sistem:
- **Plava figura**: Osoba/radnik
- **Crveno srce**: Briga o gostu
- **Zelena alat**: Tehnička služba
- **Žuto sunce**: Pozitivno iskustvo

## 🛠️ Tehnički Detalji

### Capacitor Konfiguracija
```typescript
// capacitor.config.ts
{
  appId: 'com.budvanskarivijera.hotel',
  appName: 'HGBR Tehnička Služba',
  webDir: 'dist/public',
  plugins: { ... }
}
```

### Build Command (lokalno testiranje)
```bash
# Build frontend i backend
npm run build:full

# Sync sa Android projektom
npx cap sync

# Pokreni na Android emulatoru
npx cap run android
```

## 📝 Napomene

- **Ikona dimenzije**: 1024x1024px PNG (preporučeno)
- **Background**: Bela pozadina (#ffffff)
- **Android 12+**: Koristi adaptive icon sistem
- **AppFlow**: Automatski generiše sve potrebne rezolucije
- **Commit required**: Sve promene moraju biti commit-ovane za AppFlow build

---

Kreirano: **13. Novembar 2025**
