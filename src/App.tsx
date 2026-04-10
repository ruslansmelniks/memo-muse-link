import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { MiniAudioPlayer } from "@/components/MiniAudioPlayer";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNativeApp } from "@/hooks/useNativeApp";
import Index from "./pages/Index";
import MemoPage from "./pages/MemoPage";
import ProfilePage from "./pages/ProfilePage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import SupportPage from "./pages/SupportPage";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

const NativeTabRouterBridge = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNativeTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      const tab = customEvent.detail?.tab;
      if (!tab) return;

      // Index only listens for this event while mounted under `/app`.
      // When the user is on a standalone route (like `/privacy`), the native tab bar would appear "stuck".
      // Persist the tab and route back into the app shell.
      try {
        sessionStorage.setItem("nativeTab", tab);
      } catch {
        // ignore storage errors
      }
      navigate("/app");
    };

    window.addEventListener("nativeTabChange", handleNativeTabChange as EventListener);
    return () => window.removeEventListener("nativeTabChange", handleNativeTabChange as EventListener);
  }, [navigate]);

  return null;
};

const NativeEntryRoute = () => {
  const isNative =
    typeof window !== "undefined" &&
    // Capacitor injects `window.Capacitor` in native shells.
    // We avoid importing Capacitor here to keep this component pure-Router.
    Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

  // Native app should start in the app shell, not the marketing landing page.
  if (isNative) return <Navigate to="/app" replace />;
  return <LandingPage />;
};

const AppContent = () => {
  // Initialize native app features (splash screen, status bar)
  useNativeApp();
  
  return (
    <>
      <OfflineBanner />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NativeTabRouterBridge />
        <Routes>
          <Route path="/" element={<NativeEntryRoute />} />
          <Route path="/app" element={<Index />} />
          <Route path="/memo/:id" element={<MemoPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/app/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/app/terms" element={<TermsOfService />} />
          <Route path="/app/support" element={<SupportPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MiniAudioPlayer />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AudioPlayerProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
