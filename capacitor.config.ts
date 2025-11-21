import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budvanskarivijera.hotel',
  appName: 'HGBR Tehnička Služba',
  webDir: 'dist/public', // <--- OVO MORA BITI 'dist/public' zbog tvog vite.config.ts
  server: {
    androidScheme: 'https'
    // OBAVEZNO: NEMA 'url' linije. Ovo osigurava da je aplikacija Native.
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