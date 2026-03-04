import React from 'react';
import { CheckCircle, DollarSign } from 'lucide-react';

const ProposalCard = ({ onAccept }) => {
  const proposalDetails = {
    service: 'Asesoría en Cálculo Diferencial',
    description: 'Resolución completa de ejercicios de derivadas e integrales con explicación paso a paso. Incluye:'
      + ' • Resolución de 5 ejercicios\n'
      + ' • Explicación detallada\n'
      + ' • Material de apoyo en PDF\n'
      + ' • Seguimiento post-entrega',
    price: 25.00,
    deliveryTime: '24 horas',
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-xl border-2 border-academic-blue/20 max-w-md animate-slideIn">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-academic-blue rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">MA</span>
        </div>
        <div>
          <div className="font-semibold text-gray-800">Matías</div>
          <div className="text-xs text-gray-500">Tutor académico</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Propuesta de Servicio
        </h3>
        
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Servicio:</div>
            <div className="font-bold text-academic-blue">{proposalDetails.service}</div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-600 mb-1">Detalles:</div>
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {proposalDetails.description}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <div>
              <div className="text-sm text-gray-600">Tiempo de entrega</div>
              <div className="font-semibold text-gray-800">{proposalDetails.deliveryTime}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Precio total</div>
              <div className="text-3xl font-bold text-academic-blue flex items-center gap-1">
                <DollarSign className="w-7 h-7" />
                {proposalDetails.price.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onAccept}
        className="w-full bg-gradient-to-r from-academic-blue to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-6 h-6" />
        Aceptar y Pagar
      </button>

      <p className="text-xs text-center text-gray-500 mt-3">
        ✓ Pago seguro • ✓ Garantía de satisfacción • ✓ Soporte incluido
      </p>
    </div>
  );
};

export default ProposalCard;
