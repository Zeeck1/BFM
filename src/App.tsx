// src/App.tsx

import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AuthModal } from "./components/AuthModal";
import { WelcomeAlertModal } from "./components/WelcomeAlertModal";
import { AppLayout } from "./components/AppLayout";
import { LinkSearchPage } from "./pages/LinkSearchPage";
import { OurServicePage } from "./pages/OurServicePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SharedListPage } from "./pages/SharedListPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { WishlistPage } from "./pages/WishlistPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setAuthOpen(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  function openAuth() {
    setAuthOpen(true);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout user={user} onSignIn={openAuth} />}>
          <Route index element={<LinkSearchPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="our-service" element={<OurServicePage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="s/:shareId" element={<SharedListPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <WelcomeAlertModal open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />
    </BrowserRouter>
  );
}
