import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Hero from './components/Hero';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import PaymentsPanel from './components/PaymentsPanel';
import ConversationList from './components/ConversationList';

const PROTECTED_ROUTES = ['/admin', '/tutor', '/marketplace'];

const normalizePath = (path = '/') => {
  if (!path) return '/';
  const [pathname] = path.split('?');
  return pathname === '' ? '/' : pathname;
};

function App() {
  const { currentUser, userRole, getRouteByRole } = useAuth();
  const [routePath, setRoutePath] = useState(() => normalizePath(window.location.pathname));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  // 'conversations' | 'history' | 'payments'
  const [currentView, setCurrentView] = useState('conversations');

  const navigateTo = useCallback((path, replace = false) => {
    const normalized = normalizePath(path);
    if (normalized === routePath) return;

    if (replace) {
      window.history.replaceState({}, '', normalized);
    } else {
      window.history.pushState({}, '', normalized);
    }
    setRoutePath(normalized);
  }, [routePath]);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      if (routePath !== '/' && routePath !== '/login') {
        navigateTo('/login', true);
      }
      return;
    }

    if (!userRole) return;

    const expectedPath = getRouteByRole(userRole);
    if (routePath === '/' || routePath === '/login') {
      navigateTo(expectedPath, true);
      return;
    }

    if (PROTECTED_ROUTES.includes(routePath) && routePath !== expectedPath) {
      navigateTo(expectedPath, true);
    }
  }, [currentUser, userRole, routePath, getRouteByRole, navigateTo]);

  const handleOpenAdminPanel = () => setIsAdminPanelOpen(true);
  const handleCloseAdminPanel = () => setIsAdminPanelOpen(false);

  const handleStartConsultation = () => {
    if (currentUser && userRole) {
      navigateTo(getRouteByRole(userRole));
    } else {
      navigateTo('/login');
    }
  };

  const handleAuthSuccess = (redirectPath) => {
    navigateTo(redirectPath || '/marketplace', true);
  };

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  const handleChangeView = (view) => {
    setCurrentView(view);
    setCurrentConversationId(null);
  };

  const handleShowPaymentModal = (checkoutUrl) => {
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    }
    // If no checkoutUrl, do nothing — the backend always provides one.
  };

  // Brief loading spinner while currentUser is set but userRole hasn't resolved yet
  // (the window between onAuthStateChanged firing and fetchUserRole completing).
  if (currentUser && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-academic-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (routePath === '/login') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} onBack={() => navigateTo('/')} />;
  }

  if (!currentUser && routePath === '/') {
    return <Hero onStartConsultation={handleStartConsultation} />;
  }

  if (!currentUser || !PROTECTED_ROUTES.includes(routePath)) {
    return null;
  }

  // Si está autenticado y en una ruta protegida
  if (currentUser) {
    return (
      <div className="min-h-screen">
        <div className="min-h-screen flex">
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            onOpenAdminPanel={handleOpenAdminPanel}
            currentView={currentView}
            onChangeView={handleChangeView}
          />

          {/* WhatsApp Web-style two-panel layout */}
          <div className="flex flex-1 h-screen overflow-hidden">

            {/* Left panel — hidden on mobile when a chat is open */}
            <div className={`h-full flex-shrink-0 ${currentConversationId ? 'hidden md:flex' : 'flex'}`}>
              {currentView === 'payments' ? (
                /* Payments: full-width, no left panel */
                null
              ) : (
                <ConversationList
                  selectedId={currentConversationId}
                  onSelect={handleSelectConversation}
                  currentView={currentView}
                />
              )}
            </div>

            {/* Right panel */}
            <main className="flex-1 h-full overflow-hidden">
              {currentView === 'payments' ? (
                <PaymentsPanel />
              ) : currentConversationId ? (
                <Chat
                  conversationId={currentConversationId}
                  onShowPaymentModal={handleShowPaymentModal}
                  onBack={() => setCurrentConversationId(null)}
                />
              ) : (
                /* Empty state — desktop only (on mobile the list takes full width) */
                <div className="hidden md:flex items-center justify-center h-full bg-slate-50">
                  <div className="text-center text-slate-400">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-['Inter']">Select a conversation to get started</p>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        {isAdminPanelOpen && (
          <AdminPanel onClose={handleCloseAdminPanel} />
        )}
      </div>
    );
  }

  return null;
}

export default App;
