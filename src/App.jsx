import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Hero from './components/Hero';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import PaymentModal from './components/PaymentModal';
import AdminPanel from './components/AdminPanel';
import TutorDashboard from './components/TutorDashboard';
import StudentDashboard from './components/StudentDashboard';

function App() {
  const { currentUser, userRole } = useAuth();
  const [showApp, setShowApp] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(25.00);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  const handleShowPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleOpenAdminPanel = () => {
    setIsAdminPanelOpen(true);
  };

  const handleCloseAdminPanel = () => {
    setIsAdminPanelOpen(false);
  };

  const handleStartConsultation = () => {
    if (currentUser) {
      setShowApp(true);
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowApp(true);
  };

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  // Si está autenticado y quiere ver el app
  if (currentUser && showApp) {
    return (
      <div className="min-h-screen">
        <div className="min-h-screen flex">
          <Sidebar 
            isOpen={isSidebarOpen} 
            setIsOpen={setIsSidebarOpen}
            onOpenAdminPanel={handleOpenAdminPanel}
          />
          
          <main className="flex-1 h-screen overflow-hidden">
            {currentConversationId ? (
              <Chat 
                conversationId={currentConversationId}
                onShowPaymentModal={handleShowPaymentModal}
                onBack={() => setCurrentConversationId(null)}
              />
            ) : userRole === 'student' ? (
              <StudentDashboard onSelectConversation={handleSelectConversation} />
            ) : (userRole === 'tutor' || userRole === 'admin') ? (
              <TutorDashboard onSelectConversation={handleSelectConversation} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Cargando...</p>
              </div>
            )}
          </main>
        </div>

        <PaymentModal 
          isOpen={isPaymentModalOpen} 
          onClose={handleClosePaymentModal}
          amount={paymentAmount}
        />

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
