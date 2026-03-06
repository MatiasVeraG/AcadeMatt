import React, { useState } from 'react';
import { Star, Send, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ReviewModal = ({ conversation, onClose }) => {
  const { submitReview } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await submitReview(conversation.id, {
        rating,
        text,
        tutorId: conversation.tutorId,
        tutorName: conversation.tutorName,
        subject: conversation.subject,
        closingStatus: conversation.closingStatus,
      });
      setDone(true);
    } catch (err) {
      console.error('Error enviando reseña:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {done ? (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">🎉</div>
            <h3 className="text-lg font-bold text-gray-800">¡Gracias por tu reseña!</h3>
            <p className="text-sm text-gray-500">Tu opinión ayuda a otros estudiantes a encontrar los mejores tutores.</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-academic-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">¿Cómo fue tu experiencia?</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Consulta: <span className="font-medium text-gray-700">{conversation.subject}</span>
                  {conversation.tutorName && (
                    <> · con <span className="font-medium text-gray-700">{conversation.tutorName}</span></>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star rating */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Calificación</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hovered || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][rating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Comentario <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={600}
                  rows={3}
                  placeholder="Cuéntanos cómo fue la sesión..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-blue focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 text-right">{text.length}/600</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Ahora no
                </button>
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 py-2.5 bg-academic-blue text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar reseña
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
