import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, User, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import AvailabilityToggle from './AvailabilityToggle';

const TutorDashboard = ({ onSelectConversation, mode = 'active' }) => {
  const { currentUser, userRole } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || (userRole !== 'tutor' && userRole !== 'admin')) return;
    setIsLoading(true);
    // NOTE: no orderBy + where compound — sorts client-side to avoid composite index requirement.
    let q;
    if (userRole === 'admin') {
      q = query(collection(db, 'conversations'));
    } else if (mode === 'history') {
      q = query(
        collection(db, 'conversations'),
        where('tutorId', '==', currentUser.uid),
        where('status', '==', 'completed')
      );
    } else {
      q = query(
        collection(db, 'conversations'),
        where('tutorId', '==', currentUser.uid),
        where('status', '==', 'assigned')
      );
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      setConversations(sorted);
      setIsLoading(false);
    }, (error) => {
      console.error('Error cargando conversaciones:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, userRole, mode]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    // Menos de 1 hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} min`;
    }
    
    // Menos de 24 horas
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    }
    
    // Más de 24 horas
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (userRole !== 'tutor' && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Acceso solo para tutores</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">
          {mode === 'history' ? 'Historial de Consultas' : 'Mis Consultas'}
        </h2>
        <p className="text-sm text-gray-500">
          {mode === 'history' ? 'Consultas completadas' : 'Conversaciones asignadas'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Availability Toggle */}
        {userRole === 'tutor' && (
          <div className="mb-6">
            <AvailabilityToggle />
          </div>
        )}

        {/* Conversations List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No tienes conversaciones asignadas</p>
              <p className="text-sm text-gray-400 mt-1">
                Activa tu disponibilidad para recibir consultas
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-academic-blue transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {conversation.studentName?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {conversation.studentName || 'Estudiante'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {conversation.tutorUnread > 0 && (
                          <span className="bg-academic-blue text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {conversation.tutorUnread > 99 ? '99+' : conversation.tutorUnread}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-academic-blue font-medium mb-1">
                      {conversation.subject}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conversation.createdAt).toLocaleDateString('es-ES')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        conversation.status === 'assigned' 
                          ? 'bg-green-100 text-green-700'
                          : conversation.status === 'completed'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {conversation.status === 'assigned' ? 'Activa' :
                         conversation.status === 'completed' ? 'Finalizada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default TutorDashboard;
