import React from 'react';
import { Mail, CreditCard, Clock, X, Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationsPanel from './NotificationsPanel';

const Sidebar = ({ isOpen, setIsOpen, onOpenAdminPanel, currentView, onChangeView }) => {
  const { currentUser, logout, userRole } = useAuth();

  const menuItems = [
    { icon: Mail,       label: 'My Chats',  view: 'conversations' },
    { icon: CreditCard, label: 'Payments',  view: 'payments' },
    { icon: Clock,      label: 'History',   view: 'history' },
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
      student: { label: 'Student',  color: 'bg-blue-100 text-blue-700' },
      tutor:   { label: 'Tutor',    color: 'bg-green-100 text-green-700' },
      admin:   { label: 'Admin',    color: 'bg-purple-100 text-purple-700' },
    };
    return badges[userRole] || badges.student;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-[#2148c0] text-white p-3 rounded-lg shadow-lg"
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
        fixed md:sticky top-0 left-0 h-screen bg-white
        border-r border-[#e6eff5]
        transition-transform duration-300 z-40 w-[250px] flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="h-[100px] flex items-center pl-[38px] shrink-0">
          <span
            className="text-[#2148c0] text-[36px] font-bold tracking-[-0.2927px] leading-normal"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            AcadeMatt
          </span>
        </div>

        {/* Top separator */}
        <div className="h-px bg-[#e6eff5] mx-0 shrink-0" />

        {/* Nav */}
        <nav className="flex flex-col mt-0 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => { onChangeView(item.view); setIsOpen(false); }}
                className="relative flex items-center h-[64px] w-full text-left group"
              >
                {/* Active left bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[6px] h-[60px] bg-[#2148c0] rounded-br-[10px] rounded-tr-[10px]" />
                )}
                <item.icon
                  className="absolute w-[25px] h-[25px]"
                  style={{ left: '44px', color: active ? '#2148c0' : '#b1b1b1' }}
                />
                <span
                  className="absolute text-[18px] font-medium leading-normal"
                  style={{
                    left: '95px',
                    color: active ? '#2148c0' : '#b1b1b1',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Notifications — tutors/admins only */}
          {(userRole === 'tutor' || userRole === 'admin') && (
            <div className="border-t border-[#e6eff5] mt-2 pt-2 px-4">
              <NotificationsPanel userId={currentUser?.uid} />
            </div>
          )}

          {/* Admin Panel — admins only */}
          {userRole === 'admin' && (
            <>
              <div className="border-t border-[#e6eff5] my-4 mx-4" />
              <button
                onClick={onOpenAdminPanel}
                className="mx-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white hover:from-purple-700 hover:to-purple-900 shadow-lg transition-all"
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium text-[15px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Panel Admin</span>
              </button>
            </>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="shrink-0 px-4 pb-6 space-y-2">
          <div className="border-t border-[#e6eff5] mb-3" />
          <div className="flex items-center gap-3 px-2">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-9 h-9 rounded-lg object-cover" />
            ) : (
              <div className="w-9 h-9 bg-[#2148c0] rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {getUserInitials()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {currentUser?.displayName || 'User'}
              </div>
              <div className="text-xs text-gray-500 truncate">{currentUser?.email}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getRoleBadge().color}`}>
                {getRoleBadge().label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
