import React, { useState } from 'react';
import ReviewsPanel from './ReviewsPanel';

const Hero = ({ onStartConsultation }) => {
  const [showReviews, setShowReviews] = useState(false);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      <div className="max-w-3xl text-center">
        <h1 className="text-6xl md:text-8xl font-light mb-8 leading-tight text-gray-900 tracking-tight">
          Tu éxito académico a un chat de distancia
        </h1>
        <p className="text-lg md:text-xl mb-12 text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
          Conecta con expertos académicos en tiempo real. Obtén ayuda personalizada para tus proyectos, tareas y dudas académicas.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={onStartConsultation}
            className="bg-academic-blue text-white px-12 py-4 rounded-full text-base font-medium hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            Iniciar Consulta
          </button>
          <button
            onClick={() => setShowReviews(true)}
            className="px-8 py-4 rounded-full text-base font-medium border border-gray-300 text-gray-600 hover:border-academic-blue hover:text-academic-blue transition-all"
          >
            ⭐ Reseñas
          </button>
        </div>
      </div>

      {showReviews && <ReviewsPanel onClose={() => setShowReviews(false)} />}
    </div>
  );
};

export default Hero;
