import React, { useState } from 'react';
import { X, CreditCard, Lock, CheckCircle } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, amount }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Simular procesamiento de pago
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Auto-cerrar después del éxito
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 3000);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-slideIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Lock className="w-6 h-6 text-academic-blue" />
            Pago Seguro
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h3>
              <p className="text-gray-600">Tu consulta ha sido confirmada</p>
            </div>
          ) : (
            <>
              {/* Monto */}
              <div className="bg-gradient-to-br from-academic-blue to-blue-700 rounded-xl p-6 text-white mb-6">
                <div className="text-sm opacity-90 mb-1">Total a pagar</div>
                <div className="text-4xl font-bold">${amount?.toFixed(2) || '0.00'}</div>
                <div className="text-sm opacity-75 mt-2">USD</div>
              </div>

              {/* Método de pago */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Método de pago
                </label>
                <div className="space-y-3">
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'stripe' 
                        ? 'border-academic-blue bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 ${paymentMethod === 'stripe' ? 'text-academic-blue' : 'text-gray-400'}`} />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-800">Tarjeta de Crédito/Débito</div>
                      <div className="text-xs text-gray-500">Procesado por Stripe</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      paymentMethod === 'paypal' 
                        ? 'border-academic-blue bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                      paymentMethod === 'paypal' ? 'bg-academic-blue text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      P
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-800">PayPal</div>
                      <div className="text-xs text-gray-500">Pago rápido y seguro</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Información de tarjeta simulada */}
              {paymentMethod === 'stripe' && (
                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder="Número de tarjeta"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
                    defaultValue="4242 4242 4242 4242"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
                      defaultValue="12/25"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue"
                      defaultValue="123"
                    />
                  </div>
                </div>
              )}

              {/* Botón de pago */}
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-academic-blue to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Confirmar Pago
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Encriptado SSL
                </span>
                <span>•</span>
                <span>Pago 100% seguro</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
