import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ProposalCard from './ProposalCard';

const Chat = ({ conversationId, onShowPaymentModal, onBack }) => {
  const { sendMessage, currentUser, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!conversationId) return;

    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        messagesData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messagesData);

      // Detectar si hay una propuesta en los mensajes
      const hasProposal = messagesData.some(msg => 
        msg.text && msg.text.includes('propuesta')
      );
      if (hasProposal && messagesData.length > 3) {
        setShowProposal(true);
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
              <div className={`max-w-[85%] md:max-w-[70%]`}>
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

        {/* Proposal Card */}
        {showProposal && (
          <div className="flex justify-start">
            <div className="flex gap-2 w-full max-w-[85%] md:max-w-[70%]">
              <div className="w-8 h-8 flex-shrink-0"></div>
              <ProposalCard onAccept={onShowPaymentModal} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
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
