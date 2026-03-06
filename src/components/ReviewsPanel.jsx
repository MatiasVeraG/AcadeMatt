import React, { useState, useEffect } from 'react';
import { Star, X, Loader2, Quote } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 3600000) return `hace ${Math.max(1, Math.floor(diff / 60000))}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  if (diff < 2592000000) return `hace ${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}

const ReviewsPanel = ({ onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // NOTE: no compound orderBy+where — just fetch latest 50 reviews, sort client-side
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q,
      snap => {
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      },
      err => {
        console.error('Error cargando reseñas:', err);
        setIsLoading(false);
      }
    );
    return unsub;
  }, []);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Reseñas de estudiantes</h2>
            {avg && (
              <div className="flex items-center gap-2 mt-1">
                <StarDisplay rating={Math.round(parseFloat(avg))} />
                <span className="text-sm font-semibold text-gray-700">{avg}</span>
                <span className="text-sm text-gray-400">· {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-academic-blue" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Quote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aún no hay reseñas</p>
              <p className="text-sm mt-1">Sé el primero en dejar tu experiencia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-gray-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-academic-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {r.studentName?.charAt(0)?.toUpperCase() || 'E'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.studentName}</p>
                        <p className="text-xs text-gray-400">
                          {r.subject && <span className="mr-1">{r.subject} ·</span>}
                          {r.tutorName && <span>con {r.tutorName} · </span>}
                          {timeAgo(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <StarDisplay rating={r.rating} />
                  </div>
                  {r.text && (
                    <p className="text-sm text-gray-600 leading-relaxed pl-10">"{r.text}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewsPanel;
