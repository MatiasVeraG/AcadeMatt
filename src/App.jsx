import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Hero from './components/Hero';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import TutorDashboard from './components/TutorDashboard';
import StudentDashboard from './components/StudentDashboard';
import PaymentsPanel from './components/PaymentsPanel';
import KanbanDashboard from './components/KanbanDashboard';

function App() {
  const { currentUser, userRole } = useAuth();
  const [showApp, setShowApp] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  // 'conversations' | 'history' | 'payments'
  const [currentView, setCurrentView] = useState('conversations');

  // Sync app visibility with Firebase auth state.
  // This also fixes the page-reload bug: when Firebase restores the session,
  // currentUser and userRole will both be set and we auto-navigate to the app.
  useEffect(() => {
    if (currentUser && userRole) {
      setShowApp(true);
      setShowAuth(false);
    } else if (!currentUser) {
      setShowApp(false);
      setShowAuth(false);
    }
  }, [currentUser, userRole]);

  const handleOpenAdminPanel = () => setIsAdminPanelOpen(true);
  const handleCloseAdminPanel = () => setIsAdminPanelOpen(false);

  const handleStartConsultation = () => {
    if (currentUser) {
      setShowApp(true);
    } else {
      setShowAuth(true);
    }
  };

  // Don't force showApp here — the useEffect will set it once userRole resolves,
  // preventing the race condition where the dashboard renders before the role is known.
  const handleAuthSuccess = () => {
    setShowAuth(false);
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

  // Si está autenticado y quiere ver el app
  if (currentUser && showApp) {
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
          
          <main className="flex-1 h-screen overflow-hidden">
            {currentConversationId ? (
              <Chat
                conversationId={currentConversationId}
                onShowPaymentModal={handleShowPaymentModal}
                onBack={() => setCurrentConversationId(null)}
              />
            ) : currentView === 'payments' ? (
              <PaymentsPanel />
            ) : userRole === 'student' ? (
              <StudentDashboard
                onSelectConversation={handleSelectConversation}
              />
            ) : (userRole === 'tutor' || userRole === 'admin') ? (
              currentView === 'history' ? (
                <TutorDashboard
                  onSelectConversation={handleSelectConversation}
                  mode="history"
                />
              ) : (
                <KanbanDashboard
                  onSelectConversation={handleSelectConversation}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Cargando...</p>
              </div>
            )}
          </main>
        </div>

        {isAdminPanelOpen && (
          <AdminPanel onClose={handleCloseAdminPanel} />
        )}
      </div>
    );
  }

  // Si debe mostrar autenticación
  if (showAuth) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Landing page por defecto
  return <Hero onStartConsultation={handleStartConsultation} />;
}

export default App;
