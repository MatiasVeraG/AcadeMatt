import React from 'react';

const Hero = ({ onStartConsultation }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      <div className="max-w-3xl text-center">
        <h1 className="text-6xl md:text-8xl font-light mb-8 leading-tight text-gray-900 tracking-tight">
          Tu éxito académico a un chat de distancia
        </h1>
        <p className="text-lg md:text-xl mb-12 text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
          Conecta con expertos académicos en tiempo real. Obtén ayuda personalizada para tus proyectos, tareas y dudas académicas.
        </p>
        <button 
          onClick={onStartConsultation}
          className="bg-academic-blue text-white px-12 py-4 rounded-full text-base font-medium hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl"
        >
          Iniciar Consulta
        </button>
      </div>
    </div>
  );
};

export default Hero;
