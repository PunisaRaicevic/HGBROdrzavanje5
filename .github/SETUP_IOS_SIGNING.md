# iOS Signing Setup for GitHub Actions (Opciono)

## 🍎 Preduslov: Apple Developer Account

**TROŠKOVI:** $99/godišnje

1. Registruj se na https://developer.apple.com
2. Plati $99 članarinu
3. Sačekaj odobrenje (obično 24-48h)

---

## 📱 iOS Build NIJE OBAVEZAN

Za razliku od Android-a, iOS build proces je komplikovaniji i skuplji.

**Alternativa:** Koristi samo Android verziju ili izbuildi iOS lokalno na Mac-u.

---

## 🔐 Kreiranje iOS Sertifikata (za GitHub Actions)

### Korak 1: Generiši Signing Certificate

1. Otvori **Keychain Access** na Mac-u
2. **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Unesi email i ime, selektuj "Saved to disk"
4. Save kao `CertificateSigningRequest.certSigningRequest`

### Korak 2: Kreiraj Certificate na Apple Developer Portal

1. Idi na https://developer.apple.com/account/resources/certificates
2. Klikni **"+"** da dodaš novi sertifikat
3. Izaberi **"iOS Distribution"** (za App Store)
4. Upload `CertificateSigningRequest.certSigningRequest`
5. Download sertifikat (`.cer` fajl)

### Korak 3: Konvertuj u .p12

1. Double-click na `.cer` fajl (dodaje se u Keychain)
2. Otvori **Keychain Access**
3. Nađi certificate u "My Certificates"
4. Right-click → **Export "Your Certificate Name"**
5. Save kao `certificate.p12`
6. Unesi password (zapamti ga!)

### Korak 4: Konvertuj u Base64

```bash
base64 -i certificate.p12 | pbcopy
```

---

## 📋 Kreiranje Provisioning Profile

### Korak 1: Registruj App ID

1. https://developer.apple.com/account/resources/identifiers
2. **"+"** → **App IDs**
3. **Bundle ID:** `com.budvanskarivijera.hotel` (mora se poklapati sa `capacitor.config.ts`)
4. Capabilities: Push Notifications (ako koristiš)
5. **Continue → Register**

### Korak 2: Kreiraj Provisioning Profile

1. https://developer.apple.com/account/resources/profiles
2. **"+"** → **App Store** (za produkciju) ili **Ad Hoc** (za testiranje)
3. Izaberi App ID koji si kreirao
4. Izaberi Certificate
5. (Za Ad Hoc) Registruj device-e za testiranje
6. Download profil (`.mobileprovision`)

### Korak 3: Konvertuj u Base64

```bash
base64 -i profile.mobileprovision | pbcopy
```

---

## 🔑 Dodaj Secrets na GitHub

1. **Settings → Secrets and variables → Actions**
2. Dodaj:

| Secret Name | Vrednost |
|-------------|----------|
| `IOS_CERTIFICATE` | Base64 string `.p12` fajla |
| `IOS_CERTIFICATE_PASSWORD` | Password `.p12` fajla |
| `IOS_PROVISIONING_PROFILE` | Base64 string `.mobileprovision` fajla |

---

## 🚀 Build & Deploy

### Automatski Build:

```bash
git add .
git commit -m "Add iOS signing"
git push origin main
```

GitHub Actions će build-ovati `.ipa` fajl.

### Download IPA:

1. **Actions** tab na GitHub-u
2. Download artifact `app-ios-XXXXXX`

---

## 📲 Testiranje iOS App-a

### Opcija 1: TestFlight (preporučeno)

1. Upload IPA na **App Store Connect**
2. Dodaj beta testere
3. Testuj aplikaciju pre release-a

### Opcija 2: Direct Install (samo za Ad Hoc builds)

1. Koristi **installonair.com** ili **diawi.com**
2. Upload IPA
3. Share link za instalaciju

---

## 🏪 Upload na App Store

1. Upload IPA na **App Store Connect**
2. Popuni metadata (screenshots, description)
3. Submit for review
4. Sačekaj Apple review (1-7 dana)

---

## 💰 Ukupni Troškovi (iOS)

- Apple Developer Account: **$99/godišnje**
- GitHub Actions (macOS runner): **Besplatno** (3000 minuta/mesec za privatne repo)

**TIP:** Ako nemaš Mac, možeš iznajmiti cloud Mac za $10-20/mesec samo za buildove.

---

## 🆘 Da li mi TREBA iOS verzija?

**NE, ako:**
- Tvoji korisnici imaju samo Android telefone
- Želiš da uštediš $99 godišnje
- Ne želiš komplikacije sa Apple review procesom

**DA, ako:**
- Imaš korisnike sa iPhone-ovima
- Želiš maksimalnu pokrivenost
- Imaš budžet za Apple Developer account

**Za većinu hotel aplikacija, Android verzija je dovoljna!** 🏨📱
