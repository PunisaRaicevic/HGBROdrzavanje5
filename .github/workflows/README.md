# GitHub Actions Workflows

## build-android.yml
Automatski build-uje Android APK i AAB svaki put kada se push-uje kod.

**Triggeri:**
- Push na main/develop branch
- Git tags (v*)
- Manual workflow dispatch

**Outputi:**
- Debug APK (uvek)
- Release AAB (ako su secrets konfigurisani)

## build-ios.yml
Automatski build-uje iOS IPA (opciono, zahteva Apple Developer Account).

**Triggeri:**
- Push na main branch
- Git tags (v*)
- Manual workflow dispatch

**Outputi:**
- iOS IPA (ako su signing secrets konfigurisani)
