import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.thoughtspark',
  appName: 'ThoughtSpark',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: true
        }
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    }
  }
};

export default config;
