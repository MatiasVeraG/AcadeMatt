import React, { useState } from 'react';
import { BookOpen, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StartConsultation = ({ onConsultationCreated }) => {
  const { createConversation } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const conversationId = await createConversation(subject);
      onConsultationCreated(conversationId);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-academic-blue to-blue-700 rounded-full mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Iniciar Nueva Consulta
          </h2>
          <p className="text-gray-600">
            Describe tu necesidad académica y te conectaremos con el mejor tutor disponible
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!subject.trim() || isCreating}
            className="w-full bg-gradient-to-r from-academic-blue to-blue-700 text-white px-6 py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando tutor disponible...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5" />
                Iniciar Consulta
              </>
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">🤖 Sistema Inteligente:</span> Usamos asignación por capacidad para conectarte 
            con el tutor más disponible, garantizando respuestas rápidas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StartConsultation;
