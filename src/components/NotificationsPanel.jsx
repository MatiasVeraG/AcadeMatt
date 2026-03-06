import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const NotificationsPanel = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [userId]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const handleOpen = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) markAllRead();
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = typeof ts === 'string' ? new Date(ts) : ts.toDate?.() ?? new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          isOpen ? 'bg-academic-blue text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="font-medium">Notificaciones</span>
        {unreadCount > 0 && (
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
            isOpen ? 'bg-white text-academic-blue' : 'bg-red-100 text-red-600'
          }`}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-72 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="font-semibold text-gray-800 text-sm">Notificaciones</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Sin notificaciones
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                    !n.read ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
