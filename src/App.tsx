import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize native app features (splash screen, status bar)
  useNativeApp();
  
  return (
    <>
      <OfflineBanner />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/memo/:id" element={<MemoPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
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
