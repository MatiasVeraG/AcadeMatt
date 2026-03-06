import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { CreditCard, TrendingUp, Loader2, DollarSign } from 'lucide-react';

const PaymentsPanel = () => {
  const { currentUser, userRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Students see their purchases; tutors/admins see their earnings.
    const field = userRole === 'student' ? 'studentId' : 'tutorId';
    const q = query(
      collection(db, 'offers'),
      where(field, '==', currentUser.uid),
      where('status', '==', 'paid'),
      orderBy('paidAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [currentUser, userRole]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = typeof ts === 'string' ? new Date(ts) : ts.toDate?.() ?? new Date(ts);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isTutor = userRole === 'tutor' || userRole === 'admin';

  const totalAmount = payments.reduce(
    (sum, p) => sum + (isTutor ? (p.tutorEarnings ?? 0) : (p.amount ?? 0)),
    0
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">Historial de Pagos</h2>
        <p className="text-sm text-gray-500">
          {isTutor ? 'Tus ganancias confirmadas' : 'Tus pagos realizados'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Total card */}
        {!isLoading && payments.length > 0 && (
          <div className="bg-gradient-to-r from-academic-blue to-blue-700 rounded-xl p-5 text-white flex items-center gap-4">
            {isTutor ? (
              <TrendingUp className="w-10 h-10 opacity-80 flex-shrink-0" />
            ) : (
              <CreditCard className="w-10 h-10 opacity-80 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm opacity-80">{isTutor ? 'Total ganado (neto)' : 'Total pagado'}</p>
              <p className="text-3xl font-bold">${totalAmount.toFixed(2)} <span className="text-base font-normal opacity-75">USD</span></p>
              <p className="text-xs opacity-60 mt-0.5">{payments.length} transacción{payments.length !== 1 ? 'es' : ''}</p>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sin pagos registrados</p>
            <p className="text-gray-400 text-sm mt-1">
              {isTutor ? 'Aquí aparecerán tus ganancias confirmadas.' : 'Aquí aparecerán tus pagos a tutores.'}
            </p>
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{payment.description || payment.subject || 'Asesoría Académica'}</p>
                  <p className="text-sm text-academic-blue mt-0.5">{payment.subject}</p>
                  {isTutor ? (
                    <p className="text-xs text-gray-500 mt-1">Estudiante · ID: {payment.studentId?.slice(0, 8)}…</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Tutor: {payment.tutorName}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(payment.paidAt)}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  {isTutor ? (
                    <>
                      <p className="text-lg font-bold text-green-700">${payment.tutorEarnings?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">neto</p>
                      <p className="text-xs text-gray-400">(total: ${payment.amount?.toFixed(2)})</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-gray-800">${payment.amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">USD</p>
                    </>
                  )}
                  <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    Confirmado
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentsPanel;
