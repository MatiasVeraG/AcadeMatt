import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, User, Loader2, Plus, BookOpen, Archive } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = ({ onSelectConversation, currentView = 'conversations' }) => {
  const { currentUser, createConversation, archiveConversation } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewConsultationModal, setShowNewConsultationModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [archivingId, setArchivingId] = useState(null);

  const suggestedTopics = [
    'Differential Calculus', 'Linear Algebra', 'Physics I',
    'Organic Chemistry', 'Python Programming', 'Statistics',
  ];

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    const q = query(collection(db, 'conversations'), where('studentId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      setConversations(all);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading conversations:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const visibleConversations = conversations.filter(c => {
    if (currentView === 'history') return c.archivedForStudent === true;
    return !c.archivedForStudent;
  });

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
      alert('Error creating the consultation. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (e, conversationId) => {
    e.stopPropagation();
    setArchivingId(conversationId);
    try {
      await archiveConversation(conversationId);
    } catch (err) {
      console.error('Error archiving:', err);
    } finally {
      setArchivingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending:   { text: 'Buscando tutor...', color: 'bg-yellow-100 text-yellow-800' },
      assigned:  { text: 'Activa',            color: 'bg-green-100 text-green-800'  },
      completed: { text: 'Completada',         color: 'bg-gray-100 text-gray-600'   },
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {currentView === 'history' ? 'History' : 'My Consultations'}
            </h2>
            <p className="text-sm text-gray-500">
              {visibleConversations.length} consulta{visibleConversations.length !== 1 ? 's' : ''}
              {currentView === 'history' ? ' archivadas' : ' activas'}
            </p>
          </div>
          {currentView === 'conversations' && (
            <button
              onClick={() => setShowNewConsultationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Consultation</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
            </div>
          ) : visibleConversations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {currentView === 'history' ? 'You have no archived consultations' : 'You have no active consultations'}
              </p>
              {currentView === 'conversations' && (
                <p className="text-gray-500 text-sm mt-1">Click "New Consultation" to get started</p>
              )}
            </div>
          ) : (
            visibleConversations.map((convo) => (
              <div key={convo.id} className="relative">
                <button
                  onClick={() => onSelectConversation(convo.id)}
                  className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:border-academic-blue hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {convo.tutorName || 'Tutor asignado'}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {convo.studentUnread > 0 && (
                            <span className="bg-academic-blue text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                              {convo.studentUnread > 99 ? '99+' : convo.studentUnread}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(convo.status).color}`}>
                            {getStatusBadge(convo.status).text}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-academic-blue font-medium mb-1">{convo.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(convo.lastMessageAt || convo.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Archive button — only in "My Consultations" view */}
                {currentView === 'conversations' && (
                  <button
                    onClick={(e) => handleArchive(e, convo.id)}
                    disabled={archivingId === convo.id}
                    title="Archive conversation"
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {archivingId === convo.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Archive className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal New Consultation */}
      {showNewConsultationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">New Consultation</h2>
              <p className="text-gray-600">Describe your academic need</p>
            </div>

            <form onSubmit={handleCreateConsultation} className="space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  Which subject do you need help with?
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g. Differential Calculus, Physics I, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Or choose a common topic:</p>
                <div className="grid grid-cols-2 gap-3">
                  {suggestedTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSubject(topic)}
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowNewConsultationModal(false); setSubject(''); }}
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
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Buscando tutor...</span></>
                  ) : 'Start Consultation'}
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

