import React from 'react';
import { MessageSquare, CreditCard, History, X, Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsPanel from './NotificationsPanel';

const Sidebar = ({ isOpen, setIsOpen, onOpenAdminPanel, currentView, onChangeView }) => {
  const { currentUser, logout, userRole } = useAuth();

  const menuItems = [
    { icon: MessageSquare, label: 'Mis Consultas', view: 'conversations' },
    { icon: CreditCard, label: 'Pagos', view: 'payments' },
    { icon: History, label: 'Historial', view: 'history' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return currentUser?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const getRoleBadge = () => {
    const badges = {
      student: { label: 'Estudiante', color: 'bg-blue-100 text-blue-700' },
      tutor: { label: 'Tutor', color: 'bg-green-100 text-green-700' },
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' }
    };
    return badges[userRole] || badges.student;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-academic-blue text-white p-3 rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 
        transition-transform duration-300 z-40 w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 mt-12 md:mt-0">
            <MessageSquare className="w-8 h-8 text-academic-blue" />
            <h2 className="text-2xl font-bold text-gray-800">AcadeMatt</h2>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.view}
                onClick={() => { onChangeView(item.view); setIsOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${currentView === item.view
                    ? 'bg-academic-blue text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}

            {/* Notifications — solo visible para tutores */}
            {(userRole === 'tutor' || userRole === 'admin') && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <NotificationsPanel userId={currentUser?.uid} />
              </div>
            )}

            {/* Admin Panel Button - Solo visible para admins */}
            {userRole === 'admin' && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <button
                  onClick={onOpenAdminPanel}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-700 hover:to-purple-900 shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Panel Admin</span>
                </button>
              </>
            )}
          </nav>

          {/* User info */}
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-academic-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getUserInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">
                    {currentUser?.displayName || 'Usuario'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentUser?.email}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getRoleBadge().color}`}>
                    {getRoleBadge().label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
