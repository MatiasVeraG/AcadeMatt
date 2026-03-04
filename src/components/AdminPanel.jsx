import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';

const AdminPanel = ({ onClose }) => {
  const { getAllUsers, updateUserRole, currentUser, userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

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
      setError('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser.uid) {
      setError('No puedes cambiar tu propio rol');
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
      
      setSuccess(`Rol actualizado exitosamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Error al actualizar rol: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      student: { label: 'Estudiante', color: 'bg-blue-100 text-blue-700 border-blue-300' },
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
          <h2 className="text-2xl font-bold text-center mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 text-center mb-6">
            Solo los administradores pueden acceder a este panel.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Panel de Administración</h2>
              <p className="text-purple-100 text-sm">Gestión de roles de usuarios</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
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

          {/* Refresh Button */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-5 h-5" />
              <span className="font-medium">{users.length} usuarios registrados</span>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
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
                          {user.displayName || 'Sin nombre'}
                          {user.id === currentUser.uid && (
                            <span className="ml-2 text-xs text-gray-500">(Tú)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        <div className="text-xs text-gray-400">
                          Registrado: {new Date(user.createdAt).toLocaleDateString('es-ES')}
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
                        <option value="student">🎓 Estudiante</option>
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
