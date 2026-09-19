import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { SidebarProvider } from './context/SidebarContext';
import { NavigationRefreshListener, TikTokLoader } from './components/ui/TikTokLoader';

// Layout Components
import { AppLayout } from './components/layout/AppLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { HomePage } from './pages/HomePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { VideosPage } from './pages/VideosPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { CreatorProfilePage } from './pages/CreatorProfilePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { SearchPage } from './pages/SearchPage';
import { PricingPage } from './pages/PricingPage';
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

// Auth & Onboarding Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';

// Dashboard Pages
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { DashboardProducts } from './pages/dashboard/DashboardProducts';
import { DashboardVideos } from './pages/dashboard/DashboardVideos';
import { DashboardStore } from './pages/dashboard/DashboardStore';
import { DashboardAnalytics } from './pages/dashboard/DashboardAnalytics';
import { DashboardSubscription } from './pages/dashboard/DashboardSubscription';
import { DashboardProfile } from './pages/dashboard/DashboardProfile';
import { DashboardSettings } from './pages/dashboard/DashboardSettings';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <TikTokLoader fullPage size="md" message="Connexion à votre espace ManuX..." />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <SidebarProvider>
          <BrowserRouter>
            <NavigationRefreshListener />
            <Routes>
              {/* Standalone Auth Routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

              {/* Master App Layout with Persistent Topbar & Sidebar on all pages */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:slug" element={<ProductDetailPage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/videos/:slug" element={<VideoDetailPage />} />
                <Route path="/creators" element={<CreatorsPage />} />
                <Route path="/creators/:username" element={<CreatorProfilePage />} />
                <Route path="/creators/:username/store" element={<CreatorProfilePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/category/:slug" element={<CategoryDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Onboarding */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardOverview />} />
                  <Route path="products" element={<DashboardProducts />} />
                  <Route path="videos" element={<DashboardVideos />} />
                  <Route path="store" element={<DashboardStore />} />
                  <Route path="analytics" element={<DashboardAnalytics />} />
                  <Route path="subscription" element={<DashboardSubscription />} />
                  <Route path="profile" element={<DashboardProfile />} />
                  <Route path="settings" element={<DashboardSettings />} />
                  <Route path="draft" element={<Navigate to="/onboarding" replace />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
