import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, User, Loader2, Plus, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = ({ onSelectConversation }) => {
  const { getUserConversations, createConversation } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewConsultationModal, setShowNewConsultationModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const suggestedTopics = [
    'Cálculo Diferencial',
    'Álgebra Lineal',
    'Física I',
    'Química Orgánica',
    'Programación en Python',
    'Estadística'
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convos = await getUserConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConsultation = async (e) => {
    e.preventDefault();
    if (!subject.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const conversationId = await createConversation(subject);
      setShowNewConsultationModal(false);
      setSubject('');
      onSelectConversation(conversationId);
    } catch (error) {
      console.error('Error creando consulta:', error);
      alert('Error al crear la consulta. Intenta nuevamente.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTopicClick = (topic) => {
    setSubject(topic);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} min`;
    }
    
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    }
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Buscando tutor...', color: 'bg-yellow-100 text-yellow-800' },
      assigned: { text: 'Activa', color: 'bg-green-100 text-green-800' },
      completed: { text: 'Completada', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Mis Consultas</h2>
            <p className="text-sm text-gray-500">Historial de conversaciones</p>
          </div>
          <button
            onClick={() => setShowNewConsultationModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Nueva Consulta</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Conversations List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No tienes consultas aún</p>
              <p className="text-gray-500 text-sm mt-1">
                Haz clic en "Nueva Consulta" para comenzar
              </p>
            </div>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:border-academic-blue hover:shadow-md transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {convo.tutorName || 'Tutor asignado'}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(convo.status).color}`}>
                        {getStatusBadge(convo.status).text}
                      </span>
                    </div>
                    
                    <p className="text-sm text-academic-blue font-medium mb-1">
                      {convo.subject}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(convo.lastMessageAt || convo.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Refresh Button */}
        {!isLoading && conversations.length > 0 && (
          <button
            onClick={loadConversations}
            className="mt-6 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Actualizar Lista
          </button>
        )}
      </div>

      {/* Modal Nueva Consulta */}
      {showNewConsultationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Nueva Consulta
              </h2>
              <p className="text-gray-600">
                Describe tu necesidad académica
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateConsultation} className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  ¿En qué materia necesitas ayuda?
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Cálculo Diferencial, Física I, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              {/* Suggested Topics */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  O selecciona un tema común:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {suggestedTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicClick(topic)}
                      disabled={isCreating}
                      className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-all text-left ${
                        subject === topic
                          ? 'border-academic-blue bg-blue-50 text-academic-blue'
                          : 'border-gray-200 hover:border-academic-blue hover:bg-gray-50'
                      } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{topic}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewConsultationModal(false);
                    setSubject('');
                  }}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!subject.trim() || isCreating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Buscando tutor...</span>
                    </>
                  ) : (
                    'Iniciar Consulta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
