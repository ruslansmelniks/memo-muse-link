import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export const useNativeApp = () => {
  useEffect(() => {
    const initializeNativeApp = async () => {
      if (!Capacitor.isNativePlatform()) return;

      // Status bar can fail on some OS versions; never block splash hide on it
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
      } catch (error) {
        console.log('StatusBar init:', error);
      }

      try {
        // Let the browser paint the first frame before hiding native splash (reduces black flash)
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        await SplashScreen.hide({
          fadeOutDuration: 500,
        });
      } catch (error) {
        console.log('SplashScreen.hide:', error);
      }
    };

    initializeNativeApp();

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      document.documentElement.classList.add('native-ios');
      return () => document.documentElement.classList.remove('native-ios');
    }
  }, []);

  const showSplash = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await SplashScreen.show({
        autoHide: true,
        fadeInDuration: 300,
        fadeOutDuration: 500,
        showDuration: 2000
      });
    } catch (error) {
      console.log('Show splash error:', error);
    }
  };

  const setStatusBarStyle = async (style: 'light' | 'dark') => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await StatusBar.setStyle({ 
        style: style === 'light' ? Style.Light : Style.Dark 
      });
    } catch (error) {
      console.log('Status bar style error:', error);
    }
  };

  const hideStatusBar = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await StatusBar.hide();
    } catch (error) {
      console.log('Hide status bar error:', error);
    }
  };

  const showStatusBar = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await StatusBar.show();
    } catch (error) {
      console.log('Show status bar error:', error);
    }
  };

  return {
    showSplash,
    setStatusBarStyle,
    hideStatusBar,
    showStatusBar
  };
};
