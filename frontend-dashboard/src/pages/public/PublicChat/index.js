// src/pages/public/PublicChat/index.js - Refactored version
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";
import {
  Send, Paperclip, Image, X, User, Stethoscope,
  ArrowLeft, CheckCircle2, AlertCircle, Loader2, File,
  Bot, Star, MessageCircle, Trash2, Shield, Lock, MoreVertical,
  ArrowDown
} from "lucide-react";
import { message, Popconfirm } from "antd";
import { useAuth } from "../../../context/AuthContext";
import { setAuthToken } from "../../../services/chatService";
import appointmentServices from "../../../services/appointmentServices";

// Hooks
import { useChatState } from "./hooks/useChatState";
import { useChatSocket } from "./hooks/useChatSocket";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatConversations } from "./hooks/useChatConversations";
import { useDoctorSelection } from "./hooks/useDoctorSelection";

// Utils
import { useNotificationPermission } from "./utils/notificationHelpers";
import { fmtVietnam } from "./utils/dateFormatters";

// Constants
import { CHAT_MODES } from "./constants";

export default function PublicChat() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isDoctor, isPatient } = useAuth();
  
  // Initialize all state
  const state = useChatState();
  const {
    chatMode, setChatMode,
    conversations, setConversations,
    activeConv, setActiveConv,
    messages, setMessages,
    inputMessage, setInputMessage,
    isLoading,
    isSending,
    showAttachMenu, setShowAttachMenu,
    showConsentModal, setShowConsentModal,
    consentGiven, setConsentGiven,
    pendingAIMessage, setPendingAIMessage,
    showAIWarningModal, setShowAIWarningModal,
    aiBannerDismissed, setAiBannerDismissed,
    typing, setTyping,
    messagesEndRef,
    fileInputRef,
    typingTimeoutRef,
    scrollToBottom
  } = state;
  
  // File attachment state
  const [selectedFile, setSelectedFile] = React.useState(null);
  const messagesContainerRef = React.useRef(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  
  // Guard to prevent double render of consent modal
  const consentModalShownRef = React.useRef(false);

  // Doctor selection
  const {
    availableDoctors,
    selectedDoctor,
    showDoctorSelector,
    openDoctorSelector,
    closeDoctorSelector,
    handleDoctorSelect: handleDoctorSelectBase,
    setSelectedDoctor
  } = useDoctorSelection();

  // Messages
  const { loadMessages, sendMessage, sendMessageWithFile, isSending: isSendingMessage } = useChatMessages({
    user,
    activeConv,
    chatMode,
    consentGiven,
    setMessages,
    scrollToBottom
  });

  // Conversations
  const { 
    isLoading: loadingConversations,
    loadConversations, 
    createNewConversation, 
    deleteConversation,
    startNewConversation
  } = useChatConversations({
    user,
    isPatient,
    chatMode,
    selectedDoctor,
    conversations, // Pass current conversations
    activeConv, // Pass active conversation
    setConversations,
    setActiveConv,
    setMessages,
    setSelectedDoctor,
    setConsentGiven,
    loadMessages
  });

  // Socket
  const { emitTyping } = useChatSocket({
    activeConv,
    user,
    setMessages,
    setTyping,
    typingTimeoutRef,
    scrollToBottom
  });

  // Request notification permission
  useNotificationPermission();

  // Setup auth token for chatService when user changes
  useEffect(() => {
    if (user) {
      const token = user.token || localStorage.getItem('token');
      if (token) {
        setAuthToken(token);
      }
    }
  }, [user]);

  // Reset state when mode changes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    setActiveConv(null);
    setSelectedDoctor(null);
    setMessages([]);
    setConsentGiven(false);
    setAiBannerDismissed(false);
    consentModalShownRef.current = false; // Reset guard when mode changes
    
    loadConversations();
  }, [chatMode, isAuthenticated]);

  // Auto-scroll when messages change (only for new messages, not history load)
  useEffect(() => {
    if (messages.length > 0 && activeConv) {
      // Use timeout to let DOM update first
      const timeoutId = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, activeConv]); // Only trigger on messages count change

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      setShowScrollButton(distanceToBottom > 160);
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeConv, messages.length]);

  // Handle appointmentId from query params
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (appointmentId && isAuthenticated) {
      handleAppointmentLink(appointmentId);
    }
  }, [searchParams, isAuthenticated]);

  // Auto-load AI conversation when switching to AI mode
  useEffect(() => {
    if (chatMode === CHAT_MODES.AI && isPatient && conversations.length > 0) {
      const aiConv = conversations.find(c => c.mode === 'ai');
      if (aiConv && !activeConv) {
        setActiveConv(aiConv);
        loadMessages(aiConv._id);
      }
    }
  }, [chatMode, conversations, isPatient]);

  // Handle appointment linking
  const handleAppointmentLink = async (appointmentId) => {
    try {
      const appointment = await appointmentServices.getAppointmentDetails(appointmentId);
      
      const existingConv = conversations.find(
        c => c.doctor_id === appointment.doctor_id && c.mode === 'doctor'
      );
      
      if (existingConv) {
        setActiveConv(existingConv);
        await loadMessages(existingConv._id);
      } else {
        const doctor = availableDoctors.find(d => d._id === appointment.doctor_id);
        if (doctor) {
          setSelectedDoctor(doctor);
          await createNewConversation();
        }
        message.success('Đã tạo cuộc trò chuyện với bác sĩ');
      }
    } catch (error) {
      console.error('Error linking appointment:', error);
      message.error('Không thể tạo cuộc trò chuyện');
    }
  };

  // Handlers
  const handleModeChange = (newMode) => {
    setChatMode(newMode);
  };

  const handleConversationSelect = async (conv) => {
    setActiveConv(conv);
    await loadMessages(conv._id);
  };

  const handleBannerDismiss = () => {
    setAiBannerDismissed(true);
  };

  const handleScrollToBottomClick = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  // Delete message handler
  const handleDeleteMessage = async (messageId) => {
    try {
      const { deleteMessage } = await import('../../../services/chatService');
      await deleteMessage(messageId);
      // Message will be removed via socket event
      console.log(`✅ Message ${messageId} deleted`);
    } catch (error) {
      console.error('Error deleting message:', error);
      message.error('Không thể xóa tin nhắn');
    }
  };

  const handleStartNewConversation = async () => {
    // For AI mode with patient, check if conversation already exists
    if (chatMode === CHAT_MODES.AI && isPatient) {
      const existingAIConv = conversations.find(c => c.mode === 'ai');
      if (existingAIConv) {
        // Already have AI conversation, just activate it
        setActiveConv(existingAIConv);
        await loadMessages(existingAIConv._id);
        message.info('Đã mở cuộc trò chuyện AI hiện có');
        return;
      }
      // Show warning modal for first time
      setShowAIWarningModal(true);
      return;
    }
    
    // For doctor mode
    if (chatMode === CHAT_MODES.DOCTOR) {
      startNewConversation();
      openDoctorSelector();
    } else if (chatMode === CHAT_MODES.AI && !isPatient) {
      // Doctors can create AI conversation directly
      await createNewConversation();
    }
  };
  
  const handleAIWarningAccept = async () => {
    setShowAIWarningModal(false);
    await createNewConversation();
  };
  
  const handleAIWarningDecline = () => {
    setShowAIWarningModal(false);
  };

  const handleDoctorSelect = async (doctor) => {
    console.log('🎯 Doctor selected:', doctor.name);
    
    // Close modal first for better UX
    closeDoctorSelector();
    
    // Create conversation immediately with selected doctor
    await createNewConversation(doctor);
    
    // Also update selectedDoctor state for any other uses
    handleDoctorSelectBase(doctor);
  };

  const handleDeleteClick = async (convId) => {
    await deleteConversation(convId);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    
    // Must have text or file
    if (!inputMessage.trim() && !selectedFile) return;
    if (isSendingMessage) return;
    
    if (!activeConv) {
      await createNewConversation();
      setTimeout(() => handleSendMessage(), 500);
      return;
    }

    // AI mode doesn't support file attachments
    if (chatMode === CHAT_MODES.AI && selectedFile) {
      message.warning('Chat AI không hỗ trợ gửi file. Vui lòng chỉ gửi văn bản.');
      return;
    }

    // Check consent for AI mode
    if (chatMode === CHAT_MODES.AI && !consentGiven && messages.length === 0) {
      // Prevent double trigger
      if (consentModalShownRef.current || showConsentModal) {
        return;
      }
      consentModalShownRef.current = true;
      setPendingAIMessage(inputMessage.trim());
      setShowConsentModal(true);
      return;
    }

    // Clear input immediately to prevent double send
    const messageToSend = inputMessage.trim();
    const fileToSend = selectedFile;
    setInputMessage('');
    setSelectedFile(null);
    
    let success;
    if (fileToSend) {
      // Send with file attachment
      success = await sendMessageWithFile(messageToSend, fileToSend, activeConv._id);
    } else {
      // Send text only
      success = await sendMessage(messageToSend, activeConv._id);
    }
    
    if (!success) {
      // Restore message and file if sending failed
      setInputMessage(messageToSend);
      setSelectedFile(fileToSend);
    }
  };

  const handleConsentAccept = async () => {
    try {
      consentModalShownRef.current = false; // Reset guard
      setConsentGiven(true);
      setShowConsentModal(false);
      
      if (pendingAIMessage) {
        setInputMessage(pendingAIMessage);
        setPendingAIMessage('');
        
        setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} };
          handleSendMessage(fakeEvent);
        }, 100);
      }
      
      message.success('Đã xác nhận đồng ý chia sẻ thông tin');
    } catch (error) {
      console.error('Failed to save consent:', error);
      message.error('Không thể lưu đồng ý');
    }
  };

  const handleConsentDecline = () => {
    consentModalShownRef.current = false; // Reset guard
    setShowConsentModal(false);
    setPendingAIMessage('');
    message.info('Bạn có thể chat mà không chia sẻ hồ sơ y tế');
  };

  const handleTyping = () => {
    if (!activeConv) return;
    emitTyping(activeConv._id, user.role);
  };

  const applySuggestion = (text) => {
    setInputMessage(text);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors lg:hidden">
                <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tư vấn sức khỏe</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {chatMode === CHAT_MODES.AI ? 'AI trợ lý y tế' : 'Chat với bác sĩ'}
                </p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
              <button
                onClick={() => handleModeChange(CHAT_MODES.AI)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  chatMode === CHAT_MODES.AI
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot size={20} />
                  AI
                </div>
              </button>
              <button
                onClick={() => handleModeChange(CHAT_MODES.DOCTOR)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  chatMode === CHAT_MODES.DOCTOR
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Stethoscope size={20} />
                  Bác sĩ
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className={`grid gap-6 min-h-[calc(100vh-140px)] ${
          chatMode === CHAT_MODES.AI ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
        }`}>
          {/* Sidebar - Conversation List (Hidden for AI mode) */}
          {chatMode !== CHAT_MODES.AI && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-md">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cuộc trò chuyện</h2>
                  <button
                    onClick={handleStartNewConversation}
                    className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
                  >
                    <MessageCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingConversations ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle size={32} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Chưa có cuộc trò chuyện nào</p>
                    <button
                      onClick={handleStartNewConversation}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all duration-200"
                    >
                      Bắt đầu trò chuyện
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv._id}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        activeConv?._id === conv._id
                          ? chatMode === CHAT_MODES.AI
                            ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                      }`}
                      onClick={() => handleConversationSelect(conv)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1">
                            {conv.title || 'Cuộc trò chuyện'}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {conv.last_message || 'Bắt đầu trò chuyện...'}
                          </p>
                        </div>
                        {activeConv?._id === conv._id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(conv._id);
                            }}
                            className="p-2 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Main Chat Area */}
          <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-md ${
            chatMode === CHAT_MODES.AI ? '' : 'lg:col-span-8'
          }`}>
            {!activeConv ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  {chatMode === CHAT_MODES.AI ? (
                    <Bot size={64} className="text-purple-500" />
                  ) : (
                    <Stethoscope size={64} className="text-emerald-500" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {chatMode === CHAT_MODES.AI ? 'AI Trợ lý Y tế' : 'Tư vấn Bác sĩ'}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
                  {chatMode === CHAT_MODES.AI
                    ? 'Đặt câu hỏi về sức khỏe và nhận tư vấn từ AI'
                    : 'Kết nối với bác sĩ để được tư vấn trực tiếp'}
                </p>
                <button
                  onClick={handleStartNewConversation}
                  className={`px-8 py-4 ${
                    chatMode === CHAT_MODES.AI
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  } text-white rounded-xl font-semibold shadow-md transition-all duration-200`}
                >
                  Bắt đầu trò chuyện
                </button>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className={`p-6 border-b ${
                  chatMode === CHAT_MODES.AI
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${
                        chatMode === CHAT_MODES.AI
                          ? 'bg-purple-600'
                          : 'bg-emerald-600'
                      } rounded-xl flex items-center justify-center text-white text-2xl`}>
                        {chatMode === CHAT_MODES.AI ? '🤖' : '👨‍⚕️'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {activeConv.title || 'Cuộc trò chuyện'}
                        </h3>
                        <p className={`text-sm ${
                          chatMode === CHAT_MODES.AI ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'
                        } font-medium`}>
                          {chatMode === CHAT_MODES.AI ? 'AI Assistant' : 'Bác sĩ'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(activeConv._id)}
                      className="p-3 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Disclaimer Banner - inline, dismissible */}
                {chatMode === CHAT_MODES.AI && !aiBannerDismissed && (
                  <div className="px-6 pt-4">
                    <div className="flex flex-wrap items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle size={16} className="text-amber-500" />
                        Lưu ý: AI chỉ mang tính tham khảo, triệu chứng nặng hãy đến bệnh viện.
                      </div>
                      <span className="text-xs text-amber-700 dark:text-amber-200">
                        Không tự ý đổi đơn thuốc theo lời khuyên AI.
                      </span>
                      <button
                        onClick={handleBannerDismiss}
                        className="ml-auto px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-100 rounded-full hover:bg-amber-100/70 dark:hover:bg-amber-800/50 transition-colors"
                      >
                        Đã hiểu
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 relative">
                  <div
                    ref={messagesContainerRef}
                    className="absolute inset-0 overflow-y-auto p-6 space-y-6"
                  >
                    {messages.map((msg) => {
                      const isMyMessage = msg.role === 'patient' || msg.role === user.role;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className="flex items-start gap-2">
                          {/* Delete button (only for my messages) */}
                          {isMyMessage && (
                            <Popconfirm
                              title="Xóa tin nhắn"
                              description="Tin nhắn này sẽ bị xóa vĩnh viễn. Bạn có chắc chứ?"
                              okText="Xóa"
                              cancelText="Giữ lại"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteMessage(msg.id)}
                            >
                              <button
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all mt-1"
                                title="Xóa tin nhắn"
                              >
                                <Trash2 size={16} className="text-red-500" />
                              </button>
                            </Popconfirm>
                          )}
                          
                          <div
                            className={`max-w-[85%] lg:max-w-[70%] ${
                              isMyMessage
                                ? chatMode === CHAT_MODES.AI
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                            } rounded-2xl p-4 shadow-sm`}
                          >
                        {/* File attachment preview */}
                        {msg.file_url && (
                          <div className="mb-2">
                            {msg.file_type?.startsWith('image/') ? (
                              <a 
                                href={`http://localhost:8000${msg.file_url}?token=${user?.token || localStorage.getItem('token') || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={`http://localhost:8000${msg.file_url}?token=${user?.token || localStorage.getItem('token') || ''}`}
                                  alt={msg.file_name || 'Attached image'}
                                  className="max-w-full rounded-xl border-2 border-white/20 hover:border-white/40 transition-colors"
                                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                                />
                              </a>
                            ) : (
                              <a 
                                href={`http://localhost:8000${msg.file_url}?token=${user?.token || localStorage.getItem('token') || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-3 rounded-xl ${
                                  isMyMessage
                                    ? 'bg-white/20 hover:bg-white/30'
                                    : 'bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'
                                } transition-colors`}
                              >
                                <File size={20} className={isMyMessage ? 'text-white' : 'text-slate-600 dark:text-slate-300'} />
                                <span className="text-sm flex-1 truncate">
                                  {msg.file_name || 'File đính kèm'}
                                </span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        <p className="whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {String(msg.text || '').trim()}
                        </p>
                        <p className={`text-xs mt-2 ${
                          isMyMessage
                            ? 'text-white/70'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {fmtVietnam.format(new Date(msg.timestamp))}
                        </p>
                      </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing/Sending indicator - Enhanced */}
                  {(typing || isSendingMessage) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-2">
                            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          {isSendingMessage && chatMode === CHAT_MODES.AI && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">AI đang phân tích...</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                  </div>
                  {showScrollButton && (
                    <button
                      type="button"
                      onClick={handleScrollToBottomClick}
                      className="absolute bottom-6 right-6 p-3 rounded-full shadow-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-slate-600 transition-colors"
                      aria-label="Scroll to latest message"
                    >
                      <ArrowDown size={18} />
                    </button>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        disabled={chatMode === CHAT_MODES.DOCTOR && !activeConv}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Paperclip size={20} className="text-slate-600 dark:text-slate-400" />
                      </button>

                      <AnimatePresence>
                        {showAttachMenu && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-2 min-w-48"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowAttachMenu(false);
                              }}
                              className="flex items-center gap-3 w-full p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              <Image size={18} className="text-emerald-500" />
                              Hình ảnh y tế
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                fileInputRef.current?.click();
                                setShowAttachMenu(false);
                              }}
                              className="flex items-center gap-3 w-full p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              <File size={18} className="text-blue-500" />
                              File đính kèm
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (max 10MB)
                            if (file.size > 10 * 1024 * 1024) {
                              message.error('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
                              e.target.value = '';
                              return;
                            }
                            
                            // Check if AI mode
                            if (chatMode === CHAT_MODES.AI) {
                              message.warning('Chat AI không hỗ trợ gửi file. Vui lòng chuyển sang chat với bác sĩ.');
                              e.target.value = '';
                              return;
                            }
                            
                            setSelectedFile(file);
                            message.success(`Đã chọn file: ${file.name}`);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>

                    <div className="flex-1 relative">
                      {/* File preview */}
                      {selectedFile && (
                        <div className="mb-2 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                          <File size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">
                            {selectedFile.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </span>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          >
                            <X size={16} className="text-red-500" />
                          </button>
                        </div>
                      )}
                      
                      <textarea
                        value={inputMessage}
                        onChange={(e) => {
                          setInputMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder={
                          isSendingMessage
                            ? chatMode === CHAT_MODES.AI 
                              ? "Đang xử lý và chờ AI trả lời..." 
                              : "Đang gửi tin nhắn..."
                            : chatMode === CHAT_MODES.AI
                              ? "Hỏi AI về sức khỏe..."
                              : activeConv
                                ? "Nhập tin nhắn tư vấn..."
                                : "Chọn bác sĩ để bắt đầu chat..."
                        }
                        disabled={isSendingMessage || (chatMode === CHAT_MODES.DOCTOR && !activeConv) || !isAuthenticated}
                        className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                        rows="1"
                        style={{
                          minHeight: '48px',
                          maxHeight: '120px',
                          resize: 'none'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={(!inputMessage.trim() && !selectedFile) || isSendingMessage || (chatMode === CHAT_MODES.DOCTOR && !activeConv) || !isAuthenticated}
                      className={`p-3 ${
                        chatMode === CHAT_MODES.AI
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                      } text-white rounded-2xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isSendingMessage ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </form>

                  {/* Quick Actions */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {chatMode === CHAT_MODES.AI ? (
                        <>
                          <button 
                            onClick={() => applySuggestion("Phân tích triệu chứng đau đầu và sốt nhẹ")}
                            className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                          >
                            Phân tích triệu chứng
                          </button>
                          <button 
                            onClick={() => applySuggestion("Tư vấn về thuốc và liều dùng")}
                            className="px-3 py-1.5 text-xs bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors"
                          >
                            Tư vấn thuốc
                          </button>
                        </>
                      ) : isPatient && activeConv ? (
                        <>
                          <button 
                            onClick={() => applySuggestion("Tôi bị đau đầu và sốt nhẹ")}
                            className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                          >
                            Đau đầu sốt
                          </button>
                          <button 
                            onClick={() => applySuggestion("Tôi muốn được tư vấn về kết quả xét nghiệm")}
                            className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                          >
                            Kết quả xét nghiệm
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {chatMode === CHAT_MODES.DOCTOR && !activeConv && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600" />
                        <span className="text-sm text-amber-700">
                          Chọn bác sĩ để bắt đầu tư vấn
                        </span>
                        <button
                          onClick={openDoctorSelector}
                          className="ml-auto px-3 py-1 bg-amber-200 text-amber-800 rounded-lg text-xs hover:bg-amber-300 transition-colors"
                        >
                          Chọn bác sĩ
                        </button>
                      </div>
                    </div>
                  )}

                  {chatMode === CHAT_MODES.AI && (
                    <div className="mt-3 text-center text-xs text-slate-500">
                      <span>⚠️ AI chỉ tư vấn tham khảo, không thay thế chẩn đoán y tế</span>
                    </div>
                  )}

                  {!isAuthenticated && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2 justify-center">
                        <AlertCircle size={16} className="text-blue-600" />
                        <span className="text-sm text-blue-700">
                          Vui lòng đăng nhập để sử dụng chat
                        </span>
                        <Link
                          to="/login"
                          className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                        >
                          Đăng nhập
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Selector Modal */}
      <AnimatePresence>
        {showDoctorSelector && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Close modal if clicking backdrop
              if (e.target === e.currentTarget) {
                closeDoctorSelector();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Chọn Bác Sĩ</h2>
                    <p className="text-emerald-100">Chọn bác sĩ để bắt đầu tư vấn</p>
                  </div>
                  <button
                    onClick={closeDoctorSelector}
                    className="p-3 hover:bg-white/20 rounded-2xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(80vh-200px)]">
                {availableDoctors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="animate-spin text-slate-400 mb-4" size={48} />
                    <p className="text-slate-600">Đang tải danh sách bác sĩ...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableDoctors.map((doctor) => (
                      <motion.button
                        key={doctor._id || doctor.id}
                        type="button"
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🖱️ Clicked doctor:', doctor.name);
                          handleDoctorSelect(doctor);
                        }}
                        className="w-full text-left bg-white border-2 border-slate-200 rounded-3xl p-6 cursor-pointer hover:border-emerald-500 hover:shadow-xl transition-all duration-300 active:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-lg">
                            {doctor.avatar_url ? (
                              <img 
                                src={doctor.avatar_url} 
                                alt={doctor.name}
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              <User size={32} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">
                              {doctor.name || 'Bác sĩ'}
                            </h3>
                            <p className="text-emerald-600 font-semibold mb-2 truncate">
                              {doctor.specialty || doctor.doctor_profile?.specialization || 'Bác sĩ đa khoa'}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                {doctor.rating || 4.8}
                              </span>
                              <span>•</span>
                              <span>{doctor.experience_years || doctor.years_of_experience || doctor.experience || 0} năm KN</span>
                            </div>
                          </div>
                          <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consent Modal for AI RAG - Only render once */}
      {showConsentModal && (
        <AnimatePresence mode="wait">
          <motion.div
            key="consent-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Shield size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Đồng ý chia sẻ thông tin</h2>
                  <p className="text-purple-100">Để AI tư vấn chính xác hơn</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <AlertCircle size={20} />
                    AI sẽ sử dụng thông tin của bạn để:
                  </h3>
                  <ul className="space-y-2 text-blue-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>Phân tích lịch sử khám bệnh và kết quả xét nghiệm</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>Đưa ra tư vấn phù hợp với tình trạng sức khỏe hiện tại</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>Nhận diện các yếu tố nguy cơ và đưa ra cảnh báo kịp thời</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                    <Shield size={20} />
                    Cam kết bảo mật:
                  </h3>
                  <ul className="space-y-2 text-emerald-700 text-sm">
                    <li className="flex items-start gap-2">
                      <Lock size={14} className="mt-1 flex-shrink-0" />
                      <span>Dữ liệu được mã hóa end-to-end</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock size={14} className="mt-1 flex-shrink-0" />
                      <span>Không chia sẻ với bên thứ ba</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock size={14} className="mt-1 flex-shrink-0" />
                      <span>Tuân thủ tiêu chuẩn bảo mật y tế HIPAA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock size={14} className="mt-1 flex-shrink-0" />
                      <span>Bạn có thể thu hồi đồng ý bất cứ lúc nào</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                  <strong>Lưu ý:</strong> AI chỉ cung cấp tư vấn tham khảo, không thay thế ý kiến của bác sĩ. 
                  Nếu không đồng ý, bạn vẫn có thể chat với AI mà không chia sẻ hồ sơ y tế.
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleConsentDecline}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Không đồng ý
                </button>
                <button
                  onClick={handleConsentAccept}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
                >
                  Đồng ý và tiếp tục
                </button>
              </div>
            </div>
          </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* AI Warning Modal - Only for patients */}
      {showAIWarningModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden"
          >
            <div className="p-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Lưu ý quan trọng về Chat AI</h2>
                  <p className="text-amber-100">Vui lòng đọc kỹ trước khi sử dụng</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-6">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Bot size={20} />
                    AI Tư Vấn Y Tế - Chỉ Mang Tính Tham Khảo
                  </h3>
                  <ul className="space-y-2 text-blue-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>AI cung cấp thông tin y tế tổng quát, không thay thế chẩn đoán của bác sĩ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>Không sử dụng AI để tự điều trị hoặc thay đổi đơn thuốc</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-1 flex-shrink-0" />
                      <span>Với triệu chứng nghiêm trọng, hãy đến bệnh viện ngay lập tức</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <Lock size={20} />
                    Bảo Mật Thông Tin
                  </h3>
                  <ul className="space-y-2 text-red-700">
                    <li className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                      <span className="font-semibold">Bạn chỉ có thể tạo 1 cuộc trò chuyện AI duy nhất</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                      <span className="font-semibold">Tất cả tin nhắn sẽ tự động xóa khi bạn đăng xuất</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-1 flex-shrink-0" />
                      <span>Điều này đảm bảo thông tin y tế của bạn được bảo mật tuyệt đối</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                    <Shield size={20} />
                    Sử Dụng An Toàn
                  </h3>
                  <ul className="space-y-2 text-emerald-700 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-1 flex-shrink-0" />
                      <span>AI được đào tạo trên dữ liệu y tế đáng tin cậy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-1 flex-shrink-0" />
                      <span>Dữ liệu được mã hóa và không chia sẻ với bên thứ ba</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-1 flex-shrink-0" />
                      <span>Nếu cần tư vấn chuyên sâu, vui lòng chat với bác sĩ thật</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleAIWarningDecline}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Để sau
                </button>
                <button
                  onClick={handleAIWarningAccept}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg"
                >
                  Tôi đã hiểu, tiếp tục
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
