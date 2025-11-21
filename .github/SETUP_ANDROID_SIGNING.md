# Android Signing Setup for GitHub Actions

## 🔐 Kreiranje Android Keystore-a

### Korak 1: Generiši keystore fajl

Pokreni ovu komandu na svom računaru (ne na Replit-u):

```bash
keytool -genkey -v -keystore my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Upitaće te za:**
- **Keystore password:** Kreiraj jaku lozinku (zapamti je!)
- **Key password:** Može biti ista kao keystore password
- **Ime i prezime, organizacija, grad, država:** Unesi svoje podatke

**VAŽNO:** Čuvaj ovaj `.keystore` fajl na sigurnom mestu! Ako ga izgubiš, ne možeš update-ovati aplikaciju na Google Play!

---

### Korak 2: Konvertuj keystore u Base64

```bash
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("my-release-key.keystore")) | Set-Clipboard

# macOS/Linux
base64 -i my-release-key.keystore | pbcopy     # macOS (kopira u clipboard)
base64 -i my-release-key.keystore              # Linux (prikaže output)
```

Kopiraj ovaj Base64 string - trebace ti za GitHub Secrets.

---

### Korak 3: Dodaj Secrets na GitHub

1. Idi na tvoj GitHub repozitorijum: **https://github.com/PunisaRaicevic/HGBRTehnickaSluzba**
2. **Settings → Secrets and variables → Actions**
3. Klikni **"New repository secret"**

Dodaj sledeće secrets:

| Secret Name | Vrednost |
|-------------|----------|
| `ANDROID_KEYSTORE_FILE` | Base64 string keystore fajla (iz Koraka 2) |
| `ANDROID_KEYSTORE_PASSWORD` | Lozinka keystore-a |
| `ANDROID_KEY_ALIAS` | `my-key-alias` (ili šta god si izabrao) |
| `ANDROID_KEY_PASSWORD` | Lozinka key-a (obično ista kao keystore password) |

---

### Korak 4: Push kod na GitHub

```bash
git add .
git commit -m "Add GitHub Actions for Android builds"
git push origin main
```

GitHub Actions će automatski:
- Build-ovati **Debug APK** (za testiranje) - uvek
- Build-ovati **Release AAB** (za Google Play) - samo ako su secrets konfigurisani

---

## 📦 Download Build Artifakata

### Nakon svakog push-a:

1. Idi na **Actions** tab na GitHub-u
2. Klikni na najnoviji workflow run
3. Scroll dole do **Artifacts** sekcije
4. Download:
   - `app-debug-XXXXXX.apk` - za testiranje na telefonu
   - `app-release-XXXXXX.aab` - za upload na Google Play

---

## 📱 Instalacija APK-a na Telefon

### Opcija 1: Direct Download
1. Download APK sa GitHub Actions
2. Prebaci na telefon (email, USB, cloud)
3. Instaliraj (omogući "Install from unknown sources")

### Opcija 2: QR Kod Link
1. Upload APK na neki cloud (Google Drive, Dropbox)
2. Kreiraj share link
3. Koristi https://www.qr-code-generator.com/ da napraviš QR kod
4. Skenuj QR kodom i instaliraj

---

## 🚀 Upload na Google Play Store

### Priprema:

1. Kreiraj **Google Play Developer Account** ($25 jednokratno)
   - https://play.google.com/console/signup

2. **Kreiraj novu aplikaciju** u Play Console

3. Popuni **Store listing**:
   - App name: Hotel Maintenance
   - Description: Aplikacija za upravljanje hotelskim održavanjem
   - Screenshots (bar 2)
   - Icon (512x512 PNG)

### Upload Release Build:

1. Download **`app-release.aab`** sa GitHub Actions
2. Idi na **Play Console → Your App → Release → Production**
3. Klikni **"Create new release"**
4. Upload `app-release.aab`
5. Popuni "Release notes"
6. **Submit for review**

Google će pregledati aplikaciju (1-7 dana) i onda će biti dostupna na Play Store!

---

## 🔄 Automatski Release sa Git Tags

Kada želiš da release-uješ novu verziju:

```bash
# Označi verziju
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions će automatski kreirati **GitHub Release** sa APK i AAB priloženim!

---

## 🆘 Troubleshooting

### "Build failed: Signing failed"
- Proveri da li si pravilno copy/paste-ovao Base64 keystore
- Proveri da li su passwords tačni

### "Permission denied: gradlew"
Dodaj execute permission:
```bash
chmod +x android/gradlew
git add android/gradlew
git commit -m "Fix gradlew permissions"
git push
```

### "Build timeout"
- Besplatni GitHub Actions ima 2000 minuta mesečno
- Jedan build traje ~5-10 minuta
- To je ~200-400 buildova mesečno potpuno besplatno!

---

## 💡 Tips

- **Debug builds** su veliki (~50MB) - samo za testiranje
- **Release builds** (.aab) su optimizovani (~10-20MB)
- AAB format je obavezan za Google Play od 2021
- Čuvaj keystore fajl - bez njega ne možeš update-ovati app!
