import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budvanskarivijera.hotel',
  appName: 'Hotel Maintenance',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    cleartext: true
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
