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
      // Safety: if the web bundle fails to load, don't hang forever on splash.
      // We still call `SplashScreen.hide()` from JS for a smooth transition when things are healthy.
      launchAutoHide: true,
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
