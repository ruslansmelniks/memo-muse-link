import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.thoughtspark',
  appName: 'ThoughtSpark',
  webDir: 'dist',
  server: {
    ...(serverUrl ? { url: serverUrl, cleartext: true } : {}),
    allowNavigation: [
      'accounts.google.com',
      '*.google.com',
      'zlwzuoigrrxwfqsgwuaz.supabase.co',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      // Hide splash only from JS after the web app loads — avoids black screen gap if bundle loads slowly
      launchAutoHide: false,
      launchFadeOutDuration: 500,
      backgroundColor: '#FAF9F6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      // In Capacitor: 'light' = light background (dark text), 'dark' = dark background (light text)
      style: 'light',
      backgroundColor: '#FAF9F6'
    }
  }
};

export default config;
