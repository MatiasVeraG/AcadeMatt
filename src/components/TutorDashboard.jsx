import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Clock, Loader2,
  CheckCircle, XCircle, MinusCircle,
  MoveRight, Archive, CreditCard, DollarSign, TrendingUp,
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import AvailabilityToggle from './AvailabilityToggle';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRelative(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `Hace ${Math.max(0, Math.floor(diff / 60000))} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── Archive + Close Modal ─────────────────────────────────────────────────────
const CLOSING_OPTIONS = [
  { status: 'successful',   label: 'Exitosa',      desc: 'Se entregó todo en tiempo y forma',  Icon: CheckCircle,  color: 'text-green-600', hover: 'hover:bg-green-50 border-green-200' },
  { status: 'failed',       label: 'Fallida',      desc: 'No se pudo entregar lo acordado',    Icon: XCircle,      color: 'text-red-600',   hover: 'hover:bg-red-50 border-red-200'     },
  { status: 'not_realized', label: 'No realizada', desc: 'Sin acuerdo — sin pago',             Icon: MinusCircle,  color: 'text-gray-500',  hover: 'hover:bg-gray-50 border-gray-200'   },
];

function ArchiveModal({ conversationId, onCancel, onArchived }) {
  const { closeConversation, archiveConversation } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelect = async (closingStatus) => {
    setIsProcessing(true);
    try {
      await closeConversation(conversationId, closingStatus);
      await archiveConversation(conversationId);
      onArchived();
    } catch (e) {
      console.error('Error archivando consulta:', e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Archivar consulta</h3>
        <p className="text-sm text-gray-500 mb-4">
          Esto cierra y archiva la consulta. El alumno podrá dejar una reseña. ¿Cómo resultó?
        </p>
        <div className="space-y-2">
          {CLOSING_OPTIONS.map(({ status, label, desc, Icon, color, hover }) => (
            <button
              key={status}
              disabled={isProcessing}
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
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Archivando...
          </div>
        )}
        <button onClick={onCancel} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Conversation Card ─────────────────────────────────────────────────────────
function ConvCard({ conv, onOpen, onMoveToInProgress, onArchiveRequest }) {
  const statusColor =
    conv.status === 'assigned'  ? 'bg-green-100 text-green-700' :
    conv.status === 'completed' ? 'bg-gray-100 text-gray-600'   :
                                  'bg-yellow-100 text-yellow-700';
  const statusLabel =
    conv.status === 'assigned'  ? 'Activa'    :
    conv.status === 'completed' ? 'Finalizada': 'Pendiente';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
          {conv.studentName?.charAt(0).toUpperCase() || 'S'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 truncate">{conv.studentName || 'Estudiante'}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {conv.tutorUnread > 0 && (
                <span className="bg-academic-blue text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {conv.tutorUnread > 99 ? '99+' : conv.tutorUnread}
                </span>
              )}
              <span className="text-xs text-gray-400">{formatRelative(conv.lastMessageAt || conv.createdAt)}</span>
            </div>
          </div>
          <p className="text-sm text-academic-blue font-medium mb-2 truncate">{conv.subject}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
            {conv.closingStatus === 'successful'   && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Exitosa</span>}
            {conv.closingStatus === 'failed'        && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Fallida</span>}
            {conv.closingStatus === 'not_realized'  && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">No realizada</span>}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 justify-end">
        {onMoveToInProgress && (
          <button
            onClick={() => onMoveToInProgress(conv.id)}
            className="text-xs flex items-center gap-1 px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <MoveRight className="w-3.5 h-3.5" />
            En Proceso
          </button>
        )}
        {onArchiveRequest && (
          <button
            onClick={() => onArchiveRequest(conv.id)}
            className="text-xs flex items-center gap-1 px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            Archivar
          </button>
        )}
        <button
          onClick={() => onOpen(conv.id)}
          className="text-xs px-3 py-1.5 bg-academic-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Abrir
        </button>
      </div>
    </div>
  );
}

// ── All Payments Panel (admin only) ───────────────────────────────────────────
function AllPaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'offers'),
      where('status', '==', 'paid'),
      orderBy('paidAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return unsub;
  }, []);

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const formatDate = ts => {
    if (!ts) return '';
    const d = typeof ts === 'string' ? new Date(ts) : ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {payments.length > 0 && (
        <div className="bg-gradient-to-r from-academic-blue to-blue-700 rounded-xl p-5 text-white flex items-center gap-4">
          <TrendingUp className="w-10 h-10 opacity-80 flex-shrink-0" />
          <div>
            <p className="text-sm opacity-80">Total transacciones</p>
            <p className="text-3xl font-bold">${total.toFixed(2)} <span className="text-base font-normal opacity-75">USD</span></p>
            <p className="text-xs opacity-60 mt-0.5">{payments.length} pago{payments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Sin pagos registrados</p>
        </div>
      ) : (
        payments.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{p.subject || 'Consulta'}</p>
              <p className="text-xs text-gray-500">
                {p.studentName || 'Estudiante'} → {p.tutorName || 'Tutor'}
              </p>
              <p className="text-xs text-gray-400">{formatDate(p.paidAt)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-green-700">${p.amount?.toFixed(2)} USD</p>
              <p className="text-xs text-gray-400">Tutor: ${p.tutorEarnings?.toFixed(2)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab configurations ────────────────────────────────────────────────────────
const TUTOR_TABS = [
  { id: 'consultas',  label: 'Consultas',  dotColor: 'bg-blue-500'   },
  { id: 'inprogress', label: 'En Proceso', dotColor: 'bg-orange-500' },
];

const ADMIN_TABS = [
  { id: 'consultas',  label: 'Consultas',  dotColor: 'bg-blue-500'   },
  { id: 'pagos',      label: 'Pagos',      dotColor: 'bg-green-500'  },
  { id: 'inprogress', label: 'En Proceso', dotColor: 'bg-orange-500' },
  { id: 'historial',  label: 'Historial',  dotColor: 'bg-gray-400'   },
];

// ── Main Component ────────────────────────────────────────────────────────────
const TutorDashboard = ({ onSelectConversation, currentView = 'conversations' }) => {
  const { currentUser, userRole, moveToInProgress } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consultas');
  const [archivingId, setArchivingId] = useState(null);

  useEffect(() => {
    if (!currentUser || (userRole !== 'tutor' && userRole !== 'admin')) return;
    setIsLoading(true);
    const q = userRole === 'admin'
      ? query(collection(db, 'conversations'))
      : query(collection(db, 'conversations'), where('tutorId', '==', currentUser.uid));

    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      setConversations(sorted);
      setIsLoading(false);
    }, err => {
      console.error('Error en TutorDashboard:', err);
      setIsLoading(false);
    });
    return unsub;
  }, [currentUser, userRole]);

  const handleMoveToInProgress = async (conversationId) => {
    try {
      await moveToInProgress(conversationId);
    } catch (e) {
      console.error('Error al mover a En Proceso:', e);
    }
  };

  if (userRole !== 'tutor' && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Acceso solo para tutores</p>
      </div>
    );
  }

  // For tutors, the sidebar "Historial" view shows archived convs directly
  const isTutorHistorial = userRole === 'tutor' && currentView === 'history';

  const tabs = userRole === 'admin' ? ADMIN_TABS : TUTOR_TABS;

  const grouped = {
    consultas:  conversations.filter(c => !c.archivedForTutor && !c.inProgressForTutor && c.status !== 'completed'),
    inprogress: conversations.filter(c => !c.archivedForTutor && c.inProgressForTutor === true),
    historial:  conversations.filter(c => c.archivedForTutor === true),
  };

  const tabConvs = grouped[activeTab] ?? [];

  // Tutor historial view (activated via sidebar "Historial")
  if (isTutorHistorial) {
    const historial = grouped.historial;
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Historial</h2>
          <p className="text-sm text-gray-500">{historial.length} consulta{historial.length !== 1 ? 's' : ''} archivadas</p>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-3">
              {historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <MessageSquare className="w-10 h-10 mb-2" />
                  <p className="text-sm">Sin consultas archivadas</p>
                </div>
              ) : (
                historial.map(conv => (
                  <ConvCard
                    key={conv.id}
                    conv={conv}
                    onOpen={onSelectConversation}
                    onMoveToInProgress={null}
                    onArchiveRequest={null}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Mis Consultas</h2>
            <p className="text-sm text-gray-500">
              {conversations.length} consulta{conversations.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          {userRole === 'tutor' && <AvailabilityToggle />}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 -mb-[1px]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-academic-blue text-academic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tab.dotColor}`} />
              {tab.label}
              {tab.id !== 'pagos' && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                  activeTab === tab.id
                    ? 'bg-academic-blue/10 text-academic-blue'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {grouped[tab.id]?.length ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'pagos' ? (
        <AllPaymentsPanel />
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-3">
            {tabConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                <MessageSquare className="w-10 h-10 mb-2" />
                <p className="text-sm">Sin consultas en esta sección</p>
              </div>
            ) : (
              tabConvs.map(conv => (
                <ConvCard
                  key={conv.id}
                  conv={conv}
                  onOpen={onSelectConversation}
                  onMoveToInProgress={activeTab === 'consultas' ? handleMoveToInProgress : null}
                  onArchiveRequest={activeTab === 'inprogress' ? setArchivingId : null}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Archive modal */}
      {archivingId && (
        <ArchiveModal
          conversationId={archivingId}
          onCancel={() => setArchivingId(null)}
          onArchived={() => setArchivingId(null)}
        />
      )}
    </div>
  );
};

export default TutorDashboard;

