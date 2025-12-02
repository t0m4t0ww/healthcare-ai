import { useState, useRef } from 'react';
import { CHAT_MODES } from '../constants';

export const useChatState = () => {
  // Chat mode and conversations - Load from localStorage or default to AI
  const [chatMode, setChatModeState] = useState(() => {
    const savedMode = localStorage.getItem('chatMode');
    return savedMode && Object.values(CHAT_MODES).includes(savedMode) 
      ? savedMode 
      : CHAT_MODES.AI;
  });
  
  // Wrapper to save to localStorage when chatMode changes
  const setChatMode = (mode) => {
    setChatModeState(mode);
    localStorage.setItem('chatMode', mode);
  };
  
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Doctor selection
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorSelector, setShowDoctorSelector] = useState(false);
  
  // Appointment linking
  const [linkedAppointment, setLinkedAppointment] = useState(null);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  
  // UI state
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [typing, setTyping] = useState(false);
  
  // Consent for AI RAG
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [pendingAIMessage, setPendingAIMessage] = useState('');
  
  // AI Warning modal (before creating AI conversation)
  const [showAIWarningModal, setShowAIWarningModal] = useState(false);
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  };

  return {
    // State
    chatMode, setChatMode,
    conversations, setConversations,
    activeConv, setActiveConv,
    messages, setMessages,
    availableDoctors, setAvailableDoctors,
    selectedDoctor, setSelectedDoctor,
    showDoctorSelector, setShowDoctorSelector,
    linkedAppointment, setLinkedAppointment,
    loadingAppointment, setLoadingAppointment,
    inputMessage, setInputMessage,
    isLoading, setIsLoading,
    isSending, setIsSending,
    showAttachMenu, setShowAttachMenu,
    showSuggestions, setShowSuggestions,
    aiSuggestions, setAiSuggestions,
    loadingSuggestions, setLoadingSuggestions,
    typing, setTyping,
    showConsentModal, setShowConsentModal,
    consentGiven, setConsentGiven,
    pendingAIMessage, setPendingAIMessage,
    showAIWarningModal, setShowAIWarningModal,
    aiBannerDismissed, setAiBannerDismissed,
    
    // Refs
    messagesEndRef,
    fileInputRef,
    typingTimeoutRef,
    
    // Methods
    scrollToBottom
  };
};
