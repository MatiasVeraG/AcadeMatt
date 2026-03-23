import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Clock, Timer, Loader2,
  CheckCircle, XCircle, MinusCircle,
  Filter, X, Archive
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import AvailabilityToggle from './AvailabilityToggle';

// Subject to color mapping
const SUBJECT_COLORS = [
  { keys: ['física', 'fisic', 'mecánic', 'termod', 'óptic'],                           bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-400',    dot: 'bg-red-500'    },
  { keys: ['cálculo', 'calculo', 'derivad', 'integral', 'límite', 'limite'],           bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-400',   dot: 'bg-blue-500'   },
  { keys: ['álgebra', 'algebra', 'matri', 'vector', 'linear'],                         bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400', dot: 'bg-purple-500' },
  { keys: ['química', 'quimic', 'orgáni', 'inorgáni'],                                 bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-400',  dot: 'bg-green-500'  },
  { keys: ['estadíst', 'estadist', 'probab', 'distribuc'],                             bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', dot: 'bg-yellow-500' },
  { keys: ['programac', 'código', 'codigo', 'python', 'java', 'js', 'software'],       bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-400',   dot: 'bg-cyan-500'   },
  { keys: ['geometr', 'trigono'],                                                       bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-400', dot: 'bg-orange-500' },
];
const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', dot: 'bg-gray-400' };

function getSubjectColor(subject) {
  if (!subject) return DEFAULT_COLOR;
  const lower = subject.toLowerCase();
  return SUBJECT_COLORS.find(c => c.keys.some(k => lower.includes(k))) ?? DEFAULT_COLOR;
}

function formatRelative(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.max(0, Math.floor(diff / 60000))}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Urgency timer
function UrgencyTimer({ createdAt, hasOffer }) {
  const [minutesElapsed, setMinutesElapsed] = useState(0);

  useEffect(() => {
    const start = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    const tick = () => setMinutesElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000)));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [createdAt]);

  if (hasOffer) return null;

  const colorClass =
    minutesElapsed >= 10 ? 'bg-red-100 text-red-600' :
    minutesElapsed >= 5  ? 'bg-yellow-100 text-yellow-600' :
                           'bg-green-100 text-green-600';

  const label = minutesElapsed < 60
    ? `${minutesElapsed}m`
    : `${Math.floor(minutesElapsed / 60)}h ${minutesElapsed % 60}m`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      <Timer className="w-3 h-3" />
      {label}
    </span>
  );
}

// Closing status modal
const CLOSING_OPTIONS = [
  { status: 'successful',   label: 'Exitosa',      desc: 'Se entregó todo en tiempo y forma',  Icon: CheckCircle,  color: 'text-green-600', hover: 'hover:bg-green-50 border-green-200' },
  { status: 'failed',       label: 'Fallida',      desc: 'No se pudo entregar lo acordado',    Icon: XCircle,      color: 'text-red-600',   hover: 'hover:bg-red-50 border-red-200'     },
  { status: 'not_realized', label: 'Not completed', desc: 'Sin acuerdo — sin pago',             Icon: MinusCircle,  color: 'text-gray-500',  hover: 'hover:bg-gray-50 border-gray-200'   },
];

function ClosingModal({ conversationId, onCancel, onClosed }) {
  const { closeConversation } = useAuth();
  const [isClosing, setIsClosing] = useState(false);

  const handleSelect = async (closingStatus) => {
    setIsClosing(true);
    try {
      await closeConversation(conversationId, closingStatus);
      onClosed();
    } catch (e) {
      console.error('Error cerrando consulta:', e);
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Finish consultation</h3>
        <p className="text-sm text-gray-500 mb-4">¿Cómo resultó esta consulta?</p>
        <div className="space-y-2">
          {CLOSING_OPTIONS.map(({ status, label, desc, Icon, color, hover }) => (
            <button
              key={status}
              disabled={isClosing}
              onClick={() => handleSelect(status)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border ${hover} transition-all text-left disabled:opacity-50`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
              <div>
                <div className={`text-sm font-semibold ${color}`}>{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
            </button>
          ))}
        </div>
        {isClosing && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Cerrando...
          </div>
        )}
        <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Kanban card
function KanbanCard({ conversation, onOpen, onCloseRequest, onArchive }) {
  const color = getSubjectColor(conversation.subject);
  const hasOffer = conversation.offerStatus === 'paid';

  const closingBadge =
    conversation.closingStatus === 'successful'   ? { label: 'Exitosa',      cls: 'bg-green-100 text-green-700' } :
    conversation.closingStatus === 'failed'        ? { label: 'Fallida',      cls: 'bg-red-100 text-red-700'     } :
    conversation.closingStatus === 'not_realized'  ? { label: 'Not completed', cls: 'bg-gray-100 text-gray-600'   } :
    null;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${color.border} shadow-sm hover:shadow-md transition-shadow p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {conversation.studentName || 'Estudiante'}
          </p>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${color.bg} ${color.text}`}>
            {conversation.subject || 'Sin materia'}
          </span>
        </div>
        {conversation.tutorUnread > 0 && (
          <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 min-w-[22px] text-center">
            {conversation.tutorUnread > 99 ? '99+' : conversation.tutorUnread}
          </span>
        )}
      </div>

      {/* Last message preview */}
      {conversation.lastMessageText && (
        <p className="text-xs text-gray-500 italic line-clamp-2 bg-gray-50 rounded px-2 py-1.5 border border-gray-100">
          "{conversation.lastMessageText}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <UrgencyTimer createdAt={conversation.createdAt} hasOffer={hasOffer} />
          {closingBadge && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${closingBadge.cls}`}>
              {closingBadge.label}
            </span>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelative(conversation.lastMessageAt || conversation.createdAt)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {conversation.status !== 'completed' && (
            <button
              onClick={e => { e.stopPropagation(); onCloseRequest(conversation.id); }}
              className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 border border-red-200 transition-colors"
            >
              Finalizar
            </button>
          )}
          {onArchive && (
            <button
              onClick={e => { e.stopPropagation(); onArchive(conversation.id); }}
              title="Archive"
              className="text-xs p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onOpen(conversation.id)}
            className="text-xs px-3 py-1 rounded bg-academic-blue text-white hover:bg-blue-700 transition-colors"
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  );
}

// Kanban column
function KanbanColumn({ title, dotColor, cards, onOpen, onCloseRequest }) {
  return (
    <div className="flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden w-80 max-h-full flex-shrink-0">
      {/* Column header */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-xs">No consultations</p>
          </div>
        ) : (
          cards.map(c => (
            <KanbanCard
              key={c.id}
              conversation={c}
              onOpen={onOpen}
              onCloseRequest={onCloseRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Filter bar
function FilterBar({ conversations, filters, setFilters }) {
  const subjects = [...new Set(conversations.map(c => c.subject).filter(Boolean))].sort();

  return (
    <div className="flex flex-wrap gap-1 items-center bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm">
      <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />

      <select
        value={filters.subject}
        onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
        className="border-0 bg-transparent text-gray-600 cursor-pointer focus:ring-0 focus:outline-none text-sm"
      >
        <option value="">Todas las materias</option>
        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <select
        value={filters.date}
        onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        className="border-0 bg-transparent text-gray-600 cursor-pointer focus:ring-0 focus:outline-none text-sm"
      >
        <option value="">Todas las fechas</option>
        <option value="today">Hoy</option>
        <option value="week">Esta semana</option>
        <option value="month">Este mes</option>
      </select>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <select
        value={filters.payment}
        onChange={e => setFilters(f => ({ ...f, payment: e.target.value }))}
        className="border-0 bg-transparent text-gray-600 cursor-pointer focus:ring-0 focus:outline-none text-sm"
      >
        <option value="">All payments</option>
        <option value="unpaid">Sin pagar</option>
        <option value="paid">Pagado</option>
      </select>

      {(filters.subject || filters.date || filters.payment) && (
        <button
          onClick={() => setFilters({ subject: '', date: '', payment: '' })}
          className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <X className="w-3 h-3" /> Limpiar
        </button>
      )}
    </div>
  );
}

function applyFilters(conversations, filters) {
  return conversations.filter(c => {
    if (filters.subject && c.subject !== filters.subject) return false;
    if (filters.payment === 'paid'   && c.offerStatus !== 'paid') return false;
    if (filters.payment === 'unpaid' && c.offerStatus === 'paid')  return false;
    if (filters.date) {
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      const now = new Date();
      if (filters.date === 'today' && date.toDateString() !== now.toDateString()) return false;
      if (filters.date === 'week'  && date < new Date(now.getTime() - 7  * 86400000)) return false;
      if (filters.date === 'month' && date < new Date(now.getTime() - 30 * 86400000)) return false;
    }
    return true;
  });
}

// Main KanbanDashboard
const KANBAN_TABS = [
  { id: 'pending',  title: 'Pending',    dotColor: 'bg-yellow-400' },
  { id: 'active',   title: 'In Progress',    dotColor: 'bg-blue-500'   },
  { id: 'finished', title: 'Finalizados',   dotColor: 'bg-green-500'  },
];

const KanbanDashboard = ({ onSelectConversation }) => {
  const { currentUser, userRole, archiveConversation } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState(null);
  const [filters, setFilters] = useState({ subject: '', date: '', payment: '' });
  const [activeTab, setActiveTab] = useState('pending');
  const [archivingId, setArchivingId] = useState(null);

  useEffect(() => {
    if (!currentUser || (userRole !== 'tutor' && userRole !== 'admin')) return;
    setIsLoading(true);

    // NOTE: no orderBy + where compound — sorts client-side to avoid composite index requirement.
    const q = userRole === 'admin'
      ? query(collection(db, 'conversations'))
      : query(
          collection(db, 'conversations'),
          where('tutorId', '==', currentUser.uid)
        );

    const unsub = onSnapshot(q,
      snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return tb - ta;
          });
        setConversations(sorted);
        setIsLoading(false);
      },
      err => {
        console.error('Error en KanbanDashboard:', err);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [currentUser, userRole]);

  const handleArchive = async (conversationId) => {
    setArchivingId(conversationId);
    try {
      await archiveConversation(conversationId);
    } catch (err) {
      console.error('Error archivando:', err);
    } finally {
      setArchivingId(null);
    }
  };

  if (userRole !== 'tutor' && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Tutors only access</p>
      </div>
    );
  }

  const filtered = applyFilters(conversations, filters);

  const columnCards = {
    pending:  filtered.filter(c => c.status !== 'completed' && c.offerStatus !== 'paid' && !c.archivedForTutor),
    active:   filtered.filter(c => c.status !== 'completed' && c.offerStatus === 'paid'  && !c.archivedForTutor),
    finished: filtered.filter(c => c.status === 'completed' && !c.archivedForTutor),
  };

  const tabCards = columnCards[activeTab] || [];

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">My Consultations</h2>
            <p className="text-sm text-gray-500">
              {conversations.length} consulta{conversations.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          {userRole === 'tutor' && <AvailabilityToggle />}
        </div>
        <FilterBar conversations={conversations} filters={filters} setFilters={setFilters} />
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
        <div className="flex gap-0">
          {KANBAN_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-academic-blue text-academic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.dotColor}`} />
              {tab.title}
              <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                activeTab === tab.id
                  ? 'bg-academic-blue/10 text-academic-blue'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {columnCards[tab.id].length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-3">
            {tabCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <MessageSquare className="w-10 h-10 mb-2" />
                <p className="text-sm">No consultations in this category</p>
              </div>
            ) : (
              tabCards.map(c => (
                <KanbanCard
                  key={c.id}
                  conversation={c}
                  onOpen={onSelectConversation}
                  onCloseRequest={setClosingId}
                  onArchive={activeTab === 'finished' ? handleArchive : undefined}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Closing modal */}
      {closingId && (
        <ClosingModal
          conversationId={closingId}
          onCancel={() => setClosingId(null)}
          onClosed={() => setClosingId(null)}
        />
      )}
    </div>
  );
};

export default KanbanDashboard;

