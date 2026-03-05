import React from 'react';
import { CheckCircle, DollarSign, TrendingUp } from 'lucide-react';

/**
 * ProposalCard — shown to the student when the tutor has created a paid offer.
 *
 * Props:
 *   offer       — Firestore offer document { tutorName, amount, tutorEarnings,
 *                  description, subject, checkoutUrl, status }
 *   onAccept(checkoutUrl) — called when the student clicks "Aceptar y Pagar"
 */
const ProposalCard = ({ offer, onAccept }) => {
  if (!offer) return null;

  const { tutorName, amount, description, subject, checkoutUrl } = offer;
  const initial = tutorName?.charAt(0)?.toUpperCase() || 'T';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-xl border-2 border-academic-blue/20 max-w-md animate-slideIn w-full">
      {/* Tutor identity */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-academic-blue rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">{initial}</span>
        </div>
        <div>
          <div className="font-semibold text-gray-800">{tutorName || 'Tutor'}</div>
          <div className="text-xs text-gray-500">Tutor académico</div>
        </div>
      </div>

      {/* Offer details */}
      <div className="bg-white rounded-xl p-5 mb-4 shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Propuesta de Servicio
        </h3>

        <div className="space-y-3">
          {subject && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Servicio:</div>
              <div className="font-bold text-academic-blue">{subject}</div>
            </div>
          )}

          {description && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-1">Detalles:</div>
              <div className="text-sm text-gray-700 leading-relaxed">{description}</div>
            </div>
          )}

          {/* Price */}
          <div className="pt-3 border-t border-gray-200 text-right">
            <div className="text-sm text-gray-500 mb-1">Precio total</div>
            <div className="text-3xl font-bold text-academic-blue flex items-center justify-end gap-1">
              <DollarSign className="w-7 h-7" />
              {amount?.toFixed(2)}
              <span className="text-base font-normal text-gray-500 ml-1">USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => onAccept(checkoutUrl)}
        className="w-full bg-gradient-to-r from-academic-blue to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition-all flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-6 h-6" />
        Aceptar y Pagar
      </button>

      <p className="text-xs text-center text-gray-500 mt-3">
        ✓ Pago seguro con Lemon Squeezy &nbsp;•&nbsp; ✓ Garantía de satisfacción
      </p>
    </div>
  );
};

export default ProposalCard;
