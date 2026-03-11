import React, { useState, useEffect } from 'react';
import {
  Plus, Loader2, MessageSquare,
  BookOpen, Archive, MoveRight,
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

// ── Compact availability toggle for tutors ────────────────────────────────────
function CompactAvailabilityToggle() {
  const { currentUser, setAvailability } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getDoc(doc(db, 'users', currentUser.uid))
      .then(d => { if (d.exists()) setIsAvailable(d.data().available || false); })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [currentUser]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const next = !isAvailable;
      await setAvailability(next);
      setIsAvailable(next);
    } catch {
      alert('Failed to update availability.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isAvailable ? 'Available — click to disable' : 'Unavailable — click to enable'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        isAvailable ? 'bg-green-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isAvailable ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const ConversationList = ({ selectedId, onSelect, currentView }) => {
  const {
    currentUser, userRole,
    createConversation, archiveConversation,
    moveToInProgress, closeConversation,
  } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consultas');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [archivingId, setArchivingId] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const TOPICS = [
    'Differential Calculus', 'Linear Algebra', 'Physics I',
    'Organic Chemistry', 'Python Programming', 'Statistics',
  ];

  // ── Firestore listener ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !userRole) return;
    setIsLoading(true);
    const q =
      userRole === 'student'
        ? query(collection(db, 'conversations'), where('studentId', '==', currentUser.uid))
        : userRole === 'admin'
        ? query(collection(db, 'conversations'))
        : query(collection(db, 'conversations'), where('tutorId', '==', currentUser.uid));

    return onSnapshot(
      q,
      snap => {
        setConversations(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return tb - ta;
            }),
        );
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
  }, [currentUser, userRole]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = conversations.filter(c => {
    if (userRole === 'student') {
      if (currentView === 'history') { if (!c.archivedForStudent) return false; }
      else { if (c.archivedForStudent) return false; }
    } else {
      if (currentView === 'history') { if (!c.archivedForTutor) return false; }
      else {
        if (c.archivedForTutor) return false;
        if (activeTab === 'consultas' && (c.inProgressForTutor || c.status === 'completed')) return false;
        if (activeTab === 'inprogress' && !c.inProgressForTutor) return false;
      }
    }
    return true;
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getName = c =>
    userRole === 'student' ? (c.tutorName || 'Assigned tutor') : (c.studentName || 'Student');

  const getInitials = name =>
    (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getUnread = c =>
    (userRole === 'student' ? c.studentUnread : c.tutorUnread) || 0;

  const formatTime = ts => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleCreate = async e => {
    e.preventDefault();
    if (!newSubject.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const id = await createConversation(newSubject);
      setShowNewModal(false);
      setNewSubject('');
      onSelect(id);
    } catch {
      alert('Failed to create consultation.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (id, closingStatus) => {
    setIsArchiving(true);
    try {
      await closeConversation(id, closingStatus);
      await archiveConversation(id);
      setArchivingId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsArchiving(false);
    }
  };

  const isTutorView = userRole === 'tutor' || userRole === 'admin';
  const showTabs = isTutorView && currentView !== 'history';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border-r border-slate-400/25 flex flex-col w-96 h-full flex-shrink-0">

      {/* Header */}
      <div className="pl-6 pr-3 py-4 border-b border-slate-400/50 flex items-center justify-between">
        <span className="text-black text-sm font-semibold font-['Inter']">
          {currentView === 'history' ? 'History' : 'All Messages'}
        </span>
        <div className="flex items-center gap-3">
          {isTutorView && currentView !== 'history' && <CompactAvailabilityToggle />}
          {userRole === 'student' && currentView !== 'history' && (
            <button
              onClick={() => setShowNewModal(true)}
              title="New consultation"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Tutor tabs */}
      {showTabs && (
        <div className="flex border-b border-slate-400/25">
          {[
            { id: 'consultas',  label: 'Active'      },
            { id: 'inprogress', label: 'In Progress'  },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors font-['Inter'] ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm font-['Inter']">No conversations</p>
            {userRole === 'student' && currentView !== 'history' && (
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-3 text-xs text-blue-600 hover:underline font-['Inter']"
              >
                Start a new consultation
              </button>
            )}
          </div>
        ) : (
          filtered.map(conv => {
            const name    = getName(conv);
            const unread  = getUnread(conv);
            const isSelected = selectedId === conv.id;

            return (
              <div
                key={conv.id}
                className={`relative group border-b border-slate-400/25 transition-colors ${
                  isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                }`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  className="w-full pl-6 pr-10 py-4 flex items-start gap-4 text-left"
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                      conv.status === 'completed' ? 'bg-slate-400' : 'bg-blue-600'
                    }`}
                  >
                    {getInitials(name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-black text-base font-medium font-['Inter'] truncate">
                        {name}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {unread > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                        <span className="text-slate-400 text-xs font-['Inter']">
                          {formatTime(conv.lastMessageAt || conv.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-zinc-600 text-xs font-['Inter'] truncate">
                      {conv.subject || 'No subject'}
                    </p>
                  </div>
                </button>

                {/* Hover actions — tutors */}
                {isTutorView && currentView !== 'history' && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                    {activeTab === 'consultas' && (
                      <button
                        onClick={() => moveToInProgress(conv.id)}
                        title="Move to In Progress"
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {activeTab === 'inprogress' && (
                      <button
                        onClick={() => setArchivingId(conv.id)}
                        title="Archive"
                        className="p-1.5 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Hover actions — students (only when conversation is completed) */}
                {userRole === 'student' && currentView !== 'history' && conv.status === 'completed' && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex">
                    <button
                      onClick={() => archiveConversation(conv.id)}
                      title="Archive"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Archive modal — tutors */}
      {archivingId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setArchivingId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">Archive consultation</h3>
            <p className="text-sm text-gray-500 mb-4">How did this consultation go?</p>
            <div className="space-y-2">
              {[
                { status: 'successful',   label: 'Successful',    desc: 'Everything was delivered on time',  textColor: 'text-green-600',  border: 'border-green-200',  hover: 'hover:bg-green-50'  },
                { status: 'failed',       label: 'Failed',        desc: 'Unable to deliver as agreed',       textColor: 'text-red-600',    border: 'border-red-200',    hover: 'hover:bg-red-50'    },
                { status: 'not_realized', label: 'Not completed', desc: 'No agreement — no payment',         textColor: 'text-gray-500',   border: 'border-gray-200',   hover: 'hover:bg-gray-50'   },
              ].map(opt => (
                <button
                  key={opt.status}
                  disabled={isArchiving}
                  onClick={() => handleArchive(archivingId, opt.status)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border ${opt.border} ${opt.hover} transition-all text-left disabled:opacity-50`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${opt.textColor}`}>{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {isArchiving && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Archiving...
              </div>
            )}
            <button
              onClick={() => setArchivingId(null)}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New consultation modal — students */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full mb-4">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">New Consultation</h2>
              <p className="text-gray-500 text-sm mt-1">What subject do you need help with?</p>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Topic or subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. Differential Calculus, Physics I..."
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Suggested topics:</p>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewSubject(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                        newSubject === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newSubject.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : 'Start Consultation'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationList;
