import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { EmailVerificationBanner } from './EmailVerificationBanner';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { useSidebar } from '../../context/SidebarContext';

export const AppLayout: React.FC = () => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-950 flex flex-col pt-16">
      {/* Persistent Fixed Topbar on ALL pages */}
      <Navbar />

      {/* Email Verification Banner (dismissible, yellow, under topbar) */}
      <EmailVerificationBanner />

      <div className="flex-1 flex pb-16 sm:pb-0 min-w-0">
        {/* Persistent YouTube-style Sidebar on ALL pages */}
        <AppSidebar />

        {/* Main Content Area responsive with sidebar margin */}
        <main
          className={`flex-1 transition-all duration-200 ease-in-out min-w-0 ${
            isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Unified Master Mobile Bottom Tabs (5 items: Accueil, Produits, Créer, Dashboard, Plus) */}
      <MobileNav />
    </div>
  );
};
