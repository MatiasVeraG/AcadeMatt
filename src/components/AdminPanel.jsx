import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, RefreshCw, AlertCircle, CheckCircle, X, Star, MessageSquare, UserCheck } from 'lucide-react';

const AdminPanel = ({ onClose }) => {
  const { getAllUsers, updateUserRole, setDefaultTutor, getDefaultTutor, currentUser, userRole, getUserConversations, adminAssignTutor } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [defaultTutorId, setDefaultTutorId] = useState(null);
  const [selectedDefault, setSelectedDefault] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [convFilter, setConvFilter] = useState('all');
  const [assigningConv, setAssigningConv] = useState(null);
  const [convTutorSelections, setConvTutorSelections] = useState({});

  useEffect(() => {
    loadUsers();
    getDefaultTutor().then(id => {
      setDefaultTutorId(id);
      setSelectedDefault(id || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'conversations') loadConversations();
  }, [tab]);

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const list = await getUserConversations();
      list.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      setConversations(list);
      // init selector defaults
      const defaults = {};
      list.forEach(c => { defaults[c.id] = c.tutorId || ''; });
      setConvTutorSelections(prev => ({ ...defaults, ...prev }));
    } catch (err) {
      setError('Error al cargar conversaciones: ' + err.message);
    } finally {
      setLoadingConvs(false);
    }
  };

  const handleAssignTutor = async (conversationId) => {
    const tutorId = convTutorSelections[conversationId];
    if (!tutorId) return;
    try {
      setAssigningConv(conversationId);
      setError('');
      setSuccess('');
      const result = await adminAssignTutor(conversationId, tutorId);
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, tutorId: result.tutorId, tutorName: result.tutorName, status: 'assigned' }
          : c
      ));
      setSuccess(`Tutor asignado: ${result.tutorName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al asignar tutor: ' + err.message);
    } finally {
      setAssigningConv(null);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending:   'bg-yellow-100 text-yellow-700 border-yellow-300',
      assigned:  'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      failed:    'bg-red-100 text-red-700 border-red-300',
    };
    return map[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const usersList = await getAllUsers();
      // Ordenar: admins primero, luego tutores, luego estudiantes
      const sorted = usersList.sort((a, b) => {
        const roleOrder = { admin: 0, tutor: 1, student: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });
      setUsers(sorted);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser.uid) {
      setError('You cannot change your own role');
      return;
    }

    try {
      setUpdating(userId);
      setError('');
      setSuccess('');
      
      await updateUserRole(userId, newRole);
      
      // Actualizar la lista local
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setSuccess('Role updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update role: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveDefaultTutor = async () => {
    try {
      setSavingDefault(true);
      setError('');
      await setDefaultTutor(selectedDefault || null);
      setDefaultTutorId(selectedDefault || null);
      setSuccess('Backup tutor updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save backup tutor: ' + err.message);
    } finally {
      setSavingDefault(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      student: { label: 'Student', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      tutor: { label: 'Tutor', color: 'bg-green-100 text-green-700 border-green-300' },
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700 border-purple-300' }
    };
    return badges[role] || badges.student;
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return '👑';
    if (role === 'tutor') return '👨‍🏫';
    return '🎓';
  };

  // Verificar que el usuario actual es admin
  if (userRole !== 'admin') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center mb-2">Access Denied</h2>
          <p className="text-gray-600 text-center mb-6">
            Only administrators can access this panel.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-4 shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Admin Panel</h2>
              <p className="text-purple-100 text-sm">User role management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'users'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios
          </button>
          <button
            onClick={() => setTab('conversations')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'conversations'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Conversaciones
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && <>

          {/* Default Tutor Selector */}
          <div className="mb-6 border border-yellow-200 bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-800">Backup Tutor</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              If no tutors are available, new consultations are automatically assigned to this tutor.
            </p>
            <div className="flex gap-2">
              <select
                value={selectedDefault}
                onChange={(e) => setSelectedDefault(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">— No backup tutor —</option>
                {users.filter(u => u.role === 'tutor' || u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email}{u.id === defaultTutorId ? ' ⭐ (actual)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveDefaultTutor}
                disabled={savingDefault || selectedDefault === (defaultTutorId || '')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {savingDefault ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>

          {/* Refresh + Search */}
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span className="font-medium">{users.length} registered users</span>
              </div>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No registered users</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.filter(u => !search.trim() || (u.email || '').toLowerCase().includes(search.trim().toLowerCase())).map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {user.displayName?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">
                          {user.displayName || 'No name'}
                          {user.id === currentUser.uid && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          Registered: {new Date(user.createdAt).toLocaleDateString('en-US')}
                        </div>
                      </div>
                    </div>

                    {/* Role Selector */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-2xl">{getRoleIcon(user.role)}</span>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updating === user.id || user.id === currentUser.uid}
                        className={`px-3 py-2 border rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${getRoleBadge(user.role).color}`}
                      >
                        <option value="student">🎓 Student</option>
                        <option value="tutor">👨‍🏫 Tutor</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                      {updating === user.id && (
                        <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </> /* end users tab */}

          {/* ── CONVERSATIONS TAB ── */}
          {tab === 'conversations' && (
            <>
              {/* Filters */}
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">{conversations.length} conversaciones</span>
                  </div>
                  <button
                    onClick={loadConversations}
                    disabled={loadingConvs}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingConvs ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por asignatura o alumno..."
                    value={convSearch}
                    onChange={e => setConvSearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <select
                    value={convFilter}
                    onChange={e => setConvFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="assigned">Asignados</option>
                    <option value="completed">Completados</option>
                  </select>
                </div>
              </div>

              {loadingConvs ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">Cargando conversaciones...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay conversaciones</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations
                    .filter(c => {
                      const matchStatus = convFilter === 'all' || c.status === convFilter;
                      const q = convSearch.trim().toLowerCase();
                      const matchSearch = !q ||
                        (c.subject || '').toLowerCase().includes(q) ||
                        (c.studentName || '').toLowerCase().includes(q);
                      return matchStatus && matchSearch;
                    })
                    .map(conv => {
                      const tutors = users.filter(u => u.role === 'tutor' || u.role === 'admin');
                      const selectedTutorId = convTutorSelections[conv.id] ?? (conv.tutorId || '');
                      const isDirty = selectedTutorId !== (conv.tutorId || '');
                      return (
                        <div key={conv.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col gap-3">
                            {/* Conv info */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-800 truncate">{conv.subject || 'Sin asignatura'}</div>
                                <div className="text-sm text-gray-500">Alumno: {conv.studentName || conv.studentId}</div>
                                {conv.tutorName && (
                                  <div className="text-sm text-gray-500">Tutor actual: <span className="font-medium text-blue-700">{conv.tutorName}</span></div>
                                )}
                                <div className="text-xs text-gray-400">{new Date(conv.createdAt).toLocaleString('es-ES')}</div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full border font-medium flex-shrink-0 ${getStatusBadge(conv.status)}`}>
                                {conv.status}
                              </span>
                            </div>

                            {/* Assign row */}
                            <div className="flex gap-2">
                              <select
                                value={selectedTutorId}
                                onChange={e => setConvTutorSelections(prev => ({ ...prev, [conv.id]: e.target.value }))}
                                disabled={assigningConv === conv.id}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
                              >
                                <option value="">— Sin tutor —</option>
                                {tutors.map(t => (
                                  <option key={t.id} value={t.id}>{t.displayName || t.email}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssignTutor(conv.id)}
                                disabled={!selectedTutorId || !isDirty || assigningConv === conv.id}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {assigningConv === conv.id
                                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                                  : <UserCheck className="w-4 h-4" />}
                                Asignar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Información sobre roles:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Estudiante:</strong> Puede crear consultas y realizar pagos</li>
                <li>• <strong>Tutor:</strong> Todo lo de estudiante + recibir consultas y crear propuestas</li>
                <li>• <strong>Admin:</strong> Control total del sistema</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
