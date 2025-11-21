import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budvanskarivijera.hotel',
  appName: 'HGBR Tehnička Služba',
  webDir: 'dist/public', 
  server: {
    androidScheme: 'https',
    cleartext: true
    // ❌ OBAVEZNO: Ovde NE SME biti linija 'url': '...'
    // Ako postoji 'url', OBRISI JE! To je ono što kvari sve.
  },
  plugins: {
    Camera: {
      quality: 90,
      allowEditing: false,
      resultType: 'uri'
    },
    Haptics: {},
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;