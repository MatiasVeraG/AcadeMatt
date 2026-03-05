import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowLeft, DollarSign, TrendingUp, X, Tag } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ProposalCard from './ProposalCard';

const Chat = ({ conversationId, onShowPaymentModal, onBack }) => {
  const { sendMessage, currentUser, userRole, createOffer } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Offer state
  const [activeOffer, setActiveOffer] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to messages in real-time
  useEffect(() => {
    if (!conversationId) return;

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Listen for offers on this conversation in real-time
  useEffect(() => {
    if (!conversationId) return;

    const offersQuery = query(
      collection(db, 'offers'),
      where('conversationId', '==', conversationId)
    );

    const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
      if (!snapshot.empty) {
        const offerDoc = snapshot.docs[0];
        setActiveOffer({ id: offerDoc.id, ...offerDoc.data() });
      } else {
        setActiveOffer(null);
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(conversationId, inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar el mensaje. Intenta nuevamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (isCreatingOffer) return;

    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) {
      alert('Por favor ingresa un precio válido');
      return;
    }

    setIsCreatingOffer(true);
    try {
      await createOffer(conversationId, amount, offerDescription);
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferDescription('');
    } catch (error) {
      console.error('Error creando oferta:', error);
      alert(`Error al crear la oferta: ${error.message}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const closeOfferForm = () => {
    setShowOfferForm(false);
    setOfferAmount('');
    setOfferDescription('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate();
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return 'SY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800">Consulta Académica</h2>
            <p className="text-sm text-gray-500">Chat en Tiempo Real</p>
          </div>

          {/* Offer status badge */}
          {activeOffer?.status === 'pending' && (
            <span className="ml-auto flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
              <DollarSign className="w-3 h-3" />
              Oferta pendiente
            </span>
          )}
          {activeOffer?.status === 'paid' && (
            <span className="ml-auto flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              ✅ Pago confirmado
            </span>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUser?.uid;
          const isSystem = message.senderRole === 'system';

          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[85%] md:max-w-[70%]">
                {isSystem && (
                  <div className="text-center">
                    <span className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm inline-block">
                      {message.text}
                    </span>
                  </div>
                )}

                {!isSystem && !isCurrentUser && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-academic-blue rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {getInitials(message.senderName)}
                    </div>
                    <div>
                      <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                        <p className="text-xs text-gray-500 font-semibold mb-1">{message.senderName}</p>
                        <p className="text-gray-800">{message.text}</p>
                      </div>
                      <span className="text-xs text-gray-400 ml-2 mt-1 block">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                )}

                {!isSystem && isCurrentUser && (
                  <div>
                    <div className="bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
                      <p>{message.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 mr-2 mt-1 block text-right">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ProposalCard — shown to the student when there is a pending offer */}
        {activeOffer?.status === 'pending' && userRole === 'student' && (
          <div className="flex justify-start">
            <div className="flex gap-2 w-full max-w-[85%] md:max-w-[70%]">
              <div className="w-8 h-8 flex-shrink-0" />
              <ProposalCard offer={activeOffer} onAccept={onShowPaymentModal} />
            </div>
          </div>
        )}

        {/* Offer-sent card — visible to the tutor while awaiting payment */}
        {activeOffer?.status === 'pending' && userRole === 'tutor' && (
          <div className="flex justify-end">
            <div className="max-w-[85%] md:max-w-[70%] bg-yellow-50 border border-yellow-200 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
              <p className="text-xs text-yellow-700 font-semibold mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Oferta enviada al estudiante
              </p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500">Precio</div>
                  <div className="font-bold text-gray-800">${activeOffer.amount?.toFixed(2)} USD</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Recibes (−10% comisión)</div>
                  <div className="font-bold text-green-700">${activeOffer.tutorEarnings?.toFixed(2)} USD</div>
                </div>
              </div>
              <p className="text-xs text-yellow-600 mt-2 italic">⏳ Esperando pago del estudiante…</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Offer Creation Form — slides in above the input area for tutors */}
      {userRole === 'tutor' && !activeOffer && showOfferForm && (
        <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
          <form onSubmit={handleCreateOffer} className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-academic-blue" />
                Crear Oferta de Pago
              </h3>
              <button type="button" onClick={closeOfferForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 items-start">
              {/* Price input */}
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Precio (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue text-gray-800"
                  />
                </div>
              </div>

              {/* Earnings preview */}
              {parseFloat(offerAmount) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="text-xs text-gray-500">Recibes</div>
                    <div className="font-bold text-green-700 text-lg">
                      ${(parseFloat(offerAmount) * 0.9).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">−10% comisión</div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Descripción del servicio (opcional)
              </label>
              <input
                type="text"
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="Ej: Resolución completa con explicación paso a paso"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue text-gray-800 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeOfferForm}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingOffer || !offerAmount}
                className="flex-1 py-2 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isCreatingOffer ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creando…</>
                ) : (
                  <><DollarSign className="w-4 h-4" /> Enviar Oferta</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          {/* "Crear Oferta" shortcut button for tutors */}
          {userRole === 'tutor' && !activeOffer && !showOfferForm && (
            <button
              onClick={() => setShowOfferForm(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl hover:bg-green-100 transition-colors text-sm font-semibold whitespace-nowrap"
              title="Crear oferta de pago"
            >
              <DollarSign className="w-4 h-4" />
              Crear Oferta
            </button>
          )}

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe tu duda académica..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-academic-blue resize-none min-h-[50px] max-h-[120px]"
            rows="1"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="bg-gradient-to-r from-academic-blue to-blue-700 text-white p-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Presiona Enter para enviar • Shift + Enter para nueva línea
        </p>
      </div>
    </div>
  );
};

export default Chat;
