import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, ArrowLeft, DollarSign, TrendingUp, X, Tag, CheckCircle, XCircle, MinusCircle, Paperclip, Download, FileText, Image, Clock } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import ProposalCard from './ProposalCard';
import ReviewModal from './ReviewModal';
import TaskUpload from './TaskUpload';

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileMessageBubble = ({ fileName, fileType, fileSize, fileURL, light }) => {
  const isImage = fileType?.startsWith('image/');
  const Icon = isImage ? Image : FileText;
  const textColor = light ? 'text-white' : 'text-gray-800';
  const subColor = light ? 'text-blue-100' : 'text-gray-500';
  const iconBg = light ? 'bg-white/20' : 'bg-academic-blue/10';
  const iconColor = light ? 'text-white' : 'text-academic-blue';
  const btnClass = light
    ? 'flex items-center gap-1 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 transition-colors'
    : 'flex items-center gap-1 text-xs font-semibold text-academic-blue bg-academic-blue/10 hover:bg-academic-blue/20 rounded-lg px-2 py-1 transition-colors';

  return (
    <div className="flex items-center gap-3 min-w-[180px] max-w-[260px]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${textColor}`}>{fileName}</p>
        <p className={`text-xs ${subColor}`}>{formatBytes(fileSize)}</p>
      </div>
      <a
        href={fileURL}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className={btnClass}
        title="Descargar"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};

const Chat = ({ conversationId, onShowPaymentModal, onBack }) => {
  const { sendMessage, currentUser, userRole, createOffer, closeConversation } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Offer state — full history, sorted by createdAt
  const [allOffers, setAllOffers] = useState([]);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTaskUpload, setShowTaskUpload] = useState(false);

  const messagesEndRef = useRef(null);

  // Listen to the conversation document to get its subject and metadata in real-time
  const [conversation, setConversation] = useState(null);
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) setConversation({ id: snap.id, ...snap.data() });
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Show review modal for students when their conversation is closed as successful or failed
  useEffect(() => {
    if (
      userRole === 'student' &&
      conversation?.status === 'completed' &&
      (conversation?.closingStatus === 'successful' || conversation?.closingStatus === 'failed') &&
      !conversation?.reviewSubmitted
    ) {
      // Small delay so the chat UI settles before the modal pops
      const t = setTimeout(() => setShowReviewModal(true), 800);
      return () => clearTimeout(t);
    }
  }, [conversation?.status, conversation?.closingStatus, conversation?.reviewSubmitted, userRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset unread count for the current user when the chat is opened
  useEffect(() => {
    if (!conversationId || !currentUser || !userRole) return;
    const unreadField = userRole === 'student' ? 'studentUnread' : 'tutorUnread';
    updateDoc(doc(db, 'conversations', conversationId), { [unreadField]: 0 }).catch(() => {});
  }, [conversationId, currentUser, userRole]);

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

  // Listen for all offers on this conversation in real-time
  useEffect(() => {
    if (!conversationId) return;

    const offersQuery = query(
      collection(db, 'offers'),
      where('conversationId', '==', conversationId)
    );

    const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
      const offersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      offersData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setAllOffers(offersData);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Most recent relevant offer (used by header badge)
  const activeOffer = allOffers.find(o => o.status === 'pending') ||
                      allOffers.find(o => o.status === 'paid') ||
                      null;

  // Chronologically sorted merge of messages and offer events
  const chatItems = useMemo(() => {
    const normalize = (ts) => {
      if (!ts) return 0;
      if (typeof ts === 'string') return new Date(ts).getTime();
      if (ts.toDate) return ts.toDate().getTime();
      return 0;
    };
    const items = [
      ...messages.map(m => ({ ...m, _type: 'message', _ts: normalize(m.timestamp) })),
      ...allOffers.map(o => ({ ...o, _type: 'offer', _ts: normalize(o.createdAt) })),
    ];
    return items.sort((a, b) => a._ts - b._ts);
  }, [messages, allOffers]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(conversationId, inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
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
      alert('Please enter a valid price');
      return;
    }

    setIsCreatingOffer(true);
    try {
      await createOffer(conversationId, amount, offerDescription);
      setShowOfferForm(false);
      setOfferAmount('');
      setOfferDescription('');
    } catch (error) {
      console.error('Error creating offer:', error);
      alert(`Failed to create offer: ${error.message}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const closeOfferForm = () => {
    setShowOfferForm(false);
    setOfferAmount('');
    setOfferDescription('');
  };

  const handleCloseConversation = async (closingStatus) => {
    setIsClosing(true);
    try {
      await closeConversation(conversationId, closingStatus);
      setShowCloseConfirm(false);
    } catch (error) {
      console.error('Error closing consultation:', error);
      alert('Failed to close the consultation. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return 'SY';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-[#e6eff5] px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{conversation?.subject || 'Academic Consultation'}</h2>
            <p className="text-sm text-gray-500">Live Chat</p>
          </div>

          {/* Offer status badge */}
          {activeOffer?.status === 'pending' && (
            <span className="ml-auto flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
              <DollarSign className="w-3 h-3" />
              Pending offer
            </span>
          )}
          {activeOffer?.status === 'paid' && (
            <span className="ml-auto flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              ✅ Payment confirmed
            </span>
          )}

          {/* Cerrar Consulta - solo para tutor/admin cuando no está cerrada */}
          {(userRole === 'tutor' || userRole === 'admin') && conversation?.status !== 'completed' && (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Close Consultation
            </button>
          )}

          {conversation?.status === 'completed' && (
            <span className="ml-auto flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Closed
            </span>
          )}
        </div>
      </div>

      {/* 7-day archive notice — shown for students when conversation is completed */}
      {userRole === 'student' && conversation?.status === 'completed' && (() => {
        const completedAt = conversation.completedAt ? new Date(conversation.completedAt) : null;
        const daysLeft = completedAt
          ? Math.max(0, 7 - Math.floor((Date.now() - completedAt.getTime()) / 86400000))
          : 7;
        return (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-sm text-amber-800">
            <Clock className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>
              This consultation is closed. Files will be deleted in{' '}
              <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
            </span>
          </div>
        );
      })()}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-4 bg-white">
        {chatItems.map((item) => {
          // ── Offer card (inline, at its chronological position) ──────────────
          if (item._type === 'offer') {
            const { id, status, amount, tutorEarnings } = item;

            if (userRole === 'student') {
              if (status === 'pending') {
                return (
                  <div key={`offer-${id}`} className="flex justify-start">
                    <div className="flex gap-2 w-full max-w-[85%] md:max-w-[70%]">
                      <div className="w-8 h-8 flex-shrink-0" />
                      <ProposalCard offer={item} onAccept={onShowPaymentModal} />
                    </div>
                  </div>
                );
              }
              if (status === 'paid') {
                return (
                  <div key={`offer-${id}`} className="flex justify-start">
                    <div className="max-w-[85%] md:max-w-[70%] bg-green-50 border border-green-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <p className="text-green-700 font-semibold text-sm">✅ Payment confirmed — ${amount?.toFixed(2)} USD</p>
                      <p className="text-xs text-green-600 mt-1">The tutoring session has been enabled.</p>
                    </div>
                  </div>
                );
              }
              if (status === 'cancelled') {
                return (
                  <div key={`offer-${id}`} className="flex justify-center">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full italic">Offer cancelled — ${amount?.toFixed(2)} USD</span>
                  </div>
                );
              }
            }

            if (userRole === 'tutor') {
              if (status === 'pending') {
                return (
                  <div key={`offer-${id}`} className="flex justify-end">
                    <div className="max-w-[85%] md:max-w-[70%] bg-yellow-50 border border-yellow-200 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
                      <p className="text-xs text-yellow-700 font-semibold mb-2 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Offer sent to student
                      </p>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Price</div>
                          <div className="font-bold text-gray-800">${amount?.toFixed(2)} USD</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">You receive (−10% fee)</div>
                          <div className="font-bold text-green-700">${tutorEarnings?.toFixed(2)} USD</div>
                        </div>
                      </div>
                      <p className="text-xs text-yellow-600 mt-2 italic">⏳ Waiting for student payment…</p>
                    </div>
                  </div>
                );
              }
              if (status === 'paid') {
                return (
                  <div key={`offer-${id}`} className="flex justify-end">
                    <div className="max-w-[85%] md:max-w-[70%] bg-green-50 border border-green-200 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm">
                      <p className="text-xs text-green-700 font-semibold mb-2">✅ Payment confirmed</p>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Amount paid</div>
                          <div className="font-bold text-gray-800">${amount?.toFixed(2)} USD</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Your net earnings</div>
                          <div className="font-bold text-green-700">${tutorEarnings?.toFixed(2)} USD</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (status === 'cancelled') {
                return (
                  <div key={`offer-${id}`} className="flex justify-end">
                    <div className="max-w-[85%] md:max-w-[70%] bg-gray-50 border border-gray-200 rounded-2xl rounded-tr-none px-3 py-2 shadow-sm">
                      <p className="text-xs text-gray-400 italic">❌ Offer cancelled — ${amount?.toFixed(2)} USD</p>
                    </div>
                  </div>
                );
              }
            }
            return null;
          }

          // ── Regular message ─────────────────────────────────────────────────
          const message = item;
          const isCurrentUser = message.senderId === currentUser?.uid;
          const isSystem = message.senderRole === 'system';

          return (
            <div
              key={message.id}
              className={`flex ${isSystem ? 'justify-center' : isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={isSystem ? '' : 'max-w-[85%] md:max-w-[70%]'}>
                {isSystem && (
                  <div className="text-center">
                    <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-xs inline-block font-['Inter']">
                      {message.text}
                    </span>
                  </div>
                )}

                {!isSystem && !isCurrentUser && (
                  <div className="inline-flex flex-col items-start">
                    <div className="px-6 py-4 bg-indigo-100 rounded-tl-[32px] rounded-tr-[32px] rounded-br-[32px] inline-flex items-center">
                      {message.fileURL ? (
                        <FileMessageBubble fileName={message.fileName} fileType={message.fileType} fileSize={message.fileSize} fileURL={message.fileURL} />
                      ) : (
                        <p className="text-zinc-900 text-xs font-normal" style={{ fontFamily: "'Inter', sans-serif" }}>{message.text}</p>
                      )}
                    </div>
                    <span className="pl-2 pt-1 text-slate-400 text-xs font-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}

                {!isSystem && isCurrentUser && (
                  <div className="inline-flex flex-col items-end">
                    <div className="px-6 py-4 bg-blue-600 rounded-tl-[32px] rounded-tr-[32px] rounded-bl-[32px] inline-flex items-center">
                      {message.fileURL ? (
                        <FileMessageBubble fileName={message.fileName} fileType={message.fileType} fileSize={message.fileSize} fileURL={message.fileURL} light />
                      ) : (
                        <p className="text-slate-50 text-xs font-normal" style={{ fontFamily: "'Inter', sans-serif" }}>{message.text}</p>
                      )}
                    </div>
                    <span className="pr-2 pt-1 text-slate-400 text-xs font-normal" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation modal for closing conversation */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCloseConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">How did this consultation go?</h3>
              <p className="text-sm text-gray-500 mt-1">Choose the outcome to archive it. This action cannot be undone.</p>
            </div>
            <div className="space-y-2">
              <button
                disabled={isClosing}
                onClick={() => handleCloseConversation('successful')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-green-200 hover:bg-green-50 transition-all text-left disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-green-700">Successful</div>
                  <div className="text-xs text-gray-400">Everything was delivered on time</div>
                </div>
              </button>
              <button
                disabled={isClosing}
                onClick={() => handleCloseConversation('failed')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:bg-red-50 transition-all text-left disabled:opacity-50"
              >
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-red-600">Failed</div>
                  <div className="text-xs text-gray-400">Unable to deliver as agreed</div>
                </div>
              </button>
              <button
                disabled={isClosing}
                onClick={() => handleCloseConversation('not_realized')}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all text-left disabled:opacity-50"
              >
                <MinusCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-600">Not completed</div>
                  <div className="text-xs text-gray-400">No agreement — no payment</div>
                </div>
              </button>
            </div>
            {isClosing && (
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Closing...
              </div>
            )}
            <button onClick={() => setShowCloseConfirm(false)} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Upload Panel */}
      {showTaskUpload && conversation?.status !== 'completed' && (
        <TaskUpload
          conversationId={conversationId}
          onUploaded={() => setTimeout(() => setShowTaskUpload(false), 1800)}
          onCancel={() => setShowTaskUpload(false)}
        />
      )}

      {/* Offer Creation Form — slides in above the input area for tutors */}
      {userRole === 'tutor' && showOfferForm && (
        <div className="bg-white border-t border-gray-200 px-4 md:px-6 py-4">
          <form onSubmit={handleCreateOffer} className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-academic-blue" />
                Create Payment Offer
              </h3>
              <button type="button" onClick={closeOfferForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 items-start">
              {/* Price input */}
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Price (USD)</label>
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
                    <div className="text-xs text-gray-500">You receive</div>
                    <div className="font-bold text-green-700 text-lg">
                      ${(parseFloat(offerAmount) * 0.9).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">−10% fee</div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Service description (optional)
              </label>
              <input
                type="text"
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                placeholder="e.g. Full resolution with step-by-step explanation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-academic-blue text-gray-800 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeOfferForm}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingOffer || !offerAmount}
                className="flex-1 py-2 bg-gradient-to-r from-academic-blue to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isCreatingOffer ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                ) : (
                  <><DollarSign className="w-4 h-4" /> {allOffers.some(o => o.status === 'pending') ? 'Replace Offer' : 'Send Offer'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 md:px-6 py-4">
        <div className="flex gap-2 items-center max-w-4xl mx-auto bg-slate-50 rounded-[24px] px-4 py-2 border border-slate-200">
          {/* Attach file button */}
          {conversation?.status !== 'completed' && !showTaskUpload && (
            <button
              onClick={() => { setShowTaskUpload(true); setShowOfferForm(false); }}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-[#9fa7be] hover:text-[#3D64FD] transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {/* "Crear Oferta" shortcut for tutors */}
          {userRole === 'tutor' && !showOfferForm && conversation?.status !== 'completed' && (
            <button
              onClick={() => setShowOfferForm(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full hover:bg-green-100 transition-colors text-xs font-semibold whitespace-nowrap"
              title="Create payment offer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Create Offer
            </button>
          )}

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={conversation?.status === 'completed' ? 'Consultation closed' : 'Type your message here ...'}
            disabled={conversation?.status === 'completed'}
            className="flex-1 bg-transparent px-2 py-1 focus:outline-none resize-none min-h-[28px] max-h-[120px] text-[11px] text-[#9fa7be] placeholder:text-[#9fa7be] disabled:cursor-not-allowed"
            style={{ fontFamily: "'Inter', sans-serif" }}
            rows="1"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending || conversation?.status === 'completed'}
            className="flex-shrink-0 w-[24px] h-[24px] bg-[#3D64FD] rounded-full flex items-center justify-center shadow-[0px_2.824px_11.294px_0px_rgba(217,217,217,0.32)] hover:bg-[#2148c0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : (
              <Send className="w-3 h-3 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Review modal — shown to students after a successful/failed consultation */}
      {showReviewModal && conversation && (
        <ReviewModal
          conversation={conversation}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default Chat;
