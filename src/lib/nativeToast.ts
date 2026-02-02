import { Capacitor } from "@capacitor/core";
import { toast as webToast } from "sonner";

type ToastOptions = {
  description?: string;
  duration?: number;
  dismissible?: boolean;
};

// Native iOS toast duration (brief, native feel)
const NATIVE_DURATION = 1.5;
// Web toast duration (slightly longer since it's less native feeling)
const WEB_DURATION = 2000;

const getNativeToast = () =>
  (window as typeof window & {
    Capacitor?: { Plugins?: { NativeToast?: { show?: (opts: { title: string; description?: string; duration?: number; style?: string }) => void } } };
  }).Capacitor?.Plugins?.NativeToast;

const isNativeIos = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

const showNative = (title: string, description?: string, duration?: number, style?: string) => {
  const nativeToast = getNativeToast();
  if (!nativeToast?.show) return false;
  nativeToast.show({
    title,
    description,
    duration: duration ?? NATIVE_DURATION,
    style,
  });
  return true;
};

// Web toast with native-like behavior (brief, no close button)
const showWeb = (
  type: "info" | "success" | "error" | "warning",
  title: string,
  options?: ToastOptions
) => {
  const fn = webToast[type];
  return fn(title, {
    duration: options?.duration ?? WEB_DURATION,
    // Only show description if explicitly provided, keep it minimal
    description: options?.description,
  });
};

export const toast = {
  info: (title: string, options?: ToastOptions) =>
    isNativeIos() && showNative(title, options?.description, options?.duration, "info")
      ? undefined
      : showWeb("info", title, options),
  success: (title: string, options?: ToastOptions) =>
    isNativeIos() && showNative(title, options?.description, options?.duration, "success")
      ? undefined
      : showWeb("success", title, options),
  error: (title: string, options?: ToastOptions) =>
    isNativeIos() && showNative(title, options?.description, options?.duration, "error")
      ? undefined
      : showWeb("error", title, options),
  warning: (title: string, options?: ToastOptions) =>
    isNativeIos() && showNative(title, options?.description, options?.duration, "warning")
      ? undefined
      : showWeb("warning", title, options),
};
