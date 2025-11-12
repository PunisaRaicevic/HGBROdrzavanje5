import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budvanskarivijera.hotel',
  appName: 'HGBR Tehnička Služba',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
    // UKLONI server.url! - Neka koristi lokalne build-ovane fajlove
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      quality: 90,
      allowEditing: false,
      resultType: 'uri'
    },
    Haptics: {}
  }
};

export default config;