import React from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import ChatbotPage from './pages/ChatbotPage';
import ReferralPage from './pages/ReferralPage';
import AssemblyBoothsPage from './pages/AssemblyBoothsPage';
import Navbar from './components/Navbar';
import AdminPortal from './pages/AdminPortal';

const MainAppContent = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isAdminRoute = currentPath.startsWith('/admin') || !!admin;
  const isReferralRoute = currentPath.startsWith('/r/');
  const isAssemblyBoothsRoute = currentPath === '/assembly-booths' || currentPath === '/assemblies';

  // 1. Render Admin Portal if URL starts with /admin or admin is logged in
  if (isAdminRoute) {
    return (
      <div
        className="admin-app-shell"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0f',
          width: '100%',
          maxWidth: '100vw',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        <style>{`
          /* ── Desktop (≥1024px): show outer navbar, add content padding ── */
          @media (min-width: 1024px) {
            .admin-outer-navbar-wrap { display: block !important; }
            .admin-portal-content    { padding: 20px 24px !important; }
          }
          /* ── Mobile / tablet (<1024px): hide outer navbar completely ── */
          @media (max-width: 1023px) {
            .admin-outer-navbar-wrap { display: none !important; }
            .admin-portal-content    { padding: 0 !important; width: 100vw !important; max-width: 100vw !important; overflow-x: hidden !important; }
            .admin-app-shell         { overflow-x: hidden !important; }
          }
        `}</style>

        {/* Outer navbar — desktop only */}
        <div className="admin-outer-navbar-wrap" style={{ flexShrink: 0 }}>
          <Navbar activeTab="admin" setActiveTab={() => {}} />
        </div>

        {/* Main content — dashboards control their own layout on mobile */}
        <main
          className="admin-portal-content"
          style={{
            flex: 1,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <AdminPortal />
        </main>
      </div>
    );
  }

  // 2. Render Referral Handler if URL is /r/:ntCode
  if (isReferralRoute) {
    return <ReferralPage />;
  }

  // 3. Render Assembly Booths Page if URL is /assembly-booths or /assemblies
  if (isAssemblyBoothsRoute) {
    return <AssemblyBoothsPage />;
  }

  // 4. Render New Conversational Automation User Portal
  return (
    <LanguageProvider>
      <ChatbotPage />
    </LanguageProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
};

export default App;
