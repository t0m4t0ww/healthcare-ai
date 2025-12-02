// src/context/ChatWidgetContext.js - Global Chat Widget State Management
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useAuth } from "./AuthContext";

// Initial State
const initialState = {
  isOpen: false,
  isMinimized: false,
  unreadCount: 0,
  activeConversation: null,
  messages: [],
  chatMode: 'ai', // 'ai' hoặc 'doctor'
  isLoading: false,
  isTyping: false,
  showBubble: false,
  bubbleMessage: '',
  notifications: []
};

// Action Types
const ChatWidgetActionTypes = {
  TOGGLE_WIDGET: 'TOGGLE_WIDGET',
  OPEN_WIDGET: 'OPEN_WIDGET',
  CLOSE_WIDGET: 'CLOSE_WIDGET',
  MINIMIZE_WIDGET: 'MINIMIZE_WIDGET',
  MAXIMIZE_WIDGET: 'MAXIMIZE_WIDGET',
  SET_CHAT_MODE: 'SET_CHAT_MODE',
  SET_ACTIVE_CONVERSATION: 'SET_ACTIVE_CONVERSATION',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_MESSAGES: 'SET_MESSAGES',
  INCREMENT_UNREAD: 'INCREMENT_UNREAD',
  CLEAR_UNREAD: 'CLEAR_UNREAD',
  SET_LOADING: 'SET_LOADING',
  SET_TYPING: 'SET_TYPING',
  SHOW_BUBBLE: 'SHOW_BUBBLE',
  HIDE_BUBBLE: 'HIDE_BUBBLE',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  RESET_WIDGET: 'RESET_WIDGET'
};

// Reducer
const chatWidgetReducer = (state, action) => {
  switch (action.type) {
    case ChatWidgetActionTypes.TOGGLE_WIDGET:
      return {
        ...state,
        isOpen: !state.isOpen,
        unreadCount: !state.isOpen ? 0 : state.unreadCount,
        isMinimized: false
      };

    case ChatWidgetActionTypes.OPEN_WIDGET:
      return {
        ...state,
        isOpen: true,
        unreadCount: 0,
        isMinimized: false,
        showBubble: false
      };

    case ChatWidgetActionTypes.CLOSE_WIDGET:
      return {
        ...state,
        isOpen: false,
        isMinimized: false
      };

    case ChatWidgetActionTypes.MINIMIZE_WIDGET:
      return {
        ...state,
        isMinimized: true
      };

    case ChatWidgetActionTypes.MAXIMIZE_WIDGET:
      return {
        ...state,
        isMinimized: false
      };

    case ChatWidgetActionTypes.SET_CHAT_MODE:
      return {
        ...state,
        chatMode: action.payload,
        messages: [], // Clear messages khi đổi mode
        activeConversation: null
      };

    case ChatWidgetActionTypes.SET_ACTIVE_CONVERSATION:
      return {
        ...state,
        activeConversation: action.payload
      };

    case ChatWidgetActionTypes.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1
      };

    case ChatWidgetActionTypes.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload
      };

    case ChatWidgetActionTypes.INCREMENT_UNREAD:
      return {
        ...state,
        unreadCount: state.unreadCount + 1
      };

    case ChatWidgetActionTypes.CLEAR_UNREAD:
      return {
        ...state,
        unreadCount: 0
      };

    case ChatWidgetActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case ChatWidgetActionTypes.SET_TYPING:
      return {
        ...state,
        isTyping: action.payload
      };

    case ChatWidgetActionTypes.SHOW_BUBBLE:
      return {
        ...state,
        showBubble: true,
        bubbleMessage: action.payload?.message || 'Bạn có câu hỏi về sức khỏe không?'
      };

    case ChatWidgetActionTypes.HIDE_BUBBLE:
      return {
        ...state,
        showBubble: false,
        bubbleMessage: ''
      };

    case ChatWidgetActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };

    case ChatWidgetActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case ChatWidgetActionTypes.RESET_WIDGET:
      return initialState;

    default:
      return state;
  }
};

// Context
const ChatWidgetContext = createContext();

// Provider Component
export const ChatWidgetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatWidgetReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Actions
  const actions = {
    toggleWidget: () => dispatch({ type: ChatWidgetActionTypes.TOGGLE_WIDGET }),
    
    openWidget: () => dispatch({ type: ChatWidgetActionTypes.OPEN_WIDGET }),
    
    closeWidget: () => dispatch({ type: ChatWidgetActionTypes.CLOSE_WIDGET }),
    
    minimizeWidget: () => dispatch({ type: ChatWidgetActionTypes.MINIMIZE_WIDGET }),
    
    maximizeWidget: () => dispatch({ type: ChatWidgetActionTypes.MAXIMIZE_WIDGET }),
    
    setChatMode: (mode) => dispatch({ 
      type: ChatWidgetActionTypes.SET_CHAT_MODE, 
      payload: mode 
    }),
    
    setActiveConversation: (conversation) => dispatch({
      type: ChatWidgetActionTypes.SET_ACTIVE_CONVERSATION,
      payload: conversation
    }),
    
    addMessage: (message) => dispatch({
      type: ChatWidgetActionTypes.ADD_MESSAGE,
      payload: message
    }),
    
    setMessages: (messages) => dispatch({
      type: ChatWidgetActionTypes.SET_MESSAGES,
      payload: messages
    }),
    
    incrementUnread: () => dispatch({ type: ChatWidgetActionTypes.INCREMENT_UNREAD }),
    
    clearUnread: () => dispatch({ type: ChatWidgetActionTypes.CLEAR_UNREAD }),
    
    setLoading: (loading) => dispatch({
      type: ChatWidgetActionTypes.SET_LOADING,
      payload: loading
    }),
    
    setTyping: (typing) => dispatch({
      type: ChatWidgetActionTypes.SET_TYPING,
      payload: typing
    }),
    
    showBubble: (message, options = {}) => dispatch({
      type: ChatWidgetActionTypes.SHOW_BUBBLE,
      payload: { message, ...options }
    }),
    
    hideBubble: () => dispatch({ type: ChatWidgetActionTypes.HIDE_BUBBLE }),
    
    addNotification: (notification) => {
      const id = Date.now().toString();
      dispatch({
        type: ChatWidgetActionTypes.ADD_NOTIFICATION,
        payload: { id, ...notification }
      });
      
      // Auto remove sau 5s
      setTimeout(() => {
        actions.removeNotification(id);
      }, 5000);
    },
    
    removeNotification: (id) => dispatch({
      type: ChatWidgetActionTypes.REMOVE_NOTIFICATION,
      payload: id
    }),
    
    resetWidget: () => dispatch({ type: ChatWidgetActionTypes.RESET_WIDGET })
  };

  // Auto-show bubble khi user vào trang mới
  useEffect(() => {
    if (!isAuthenticated || state.isOpen) return;

    const showBubbleTimer = setTimeout(() => {
      // Random messages cho bubble
      const bubbleMessages = [
        "Bạn có câu hỏi về sức khỏe không? 🤖",
        "AI trợ lý sẵn sàng hỗ trợ bạn! 💊", 
        "Cần tư vấn về kết quả khám không? 👩‍⚕️",
        "Đặt lịch tái khám dễ dàng tại đây! 📅"
      ];
      
      const randomMessage = bubbleMessages[Math.floor(Math.random() * bubbleMessages.length)];
      actions.showBubble(randomMessage);
    }, 8000); // 8s sau khi load trang

    return () => clearTimeout(showBubbleTimer);
  }, [isAuthenticated, state.isOpen]);

  // Persist chat mode vào localStorage
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const savedMode = localStorage.getItem(`chatMode_${user.id}`);
      if (savedMode && savedMode !== state.chatMode) {
        actions.setChatMode(savedMode);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      localStorage.setItem(`chatMode_${user.id}`, state.chatMode);
    }
  }, [state.chatMode, isAuthenticated, user]);

  // Cleanup khi logout
  useEffect(() => {
    if (!isAuthenticated) {
      actions.resetWidget();
    }
  }, [isAuthenticated]);

  const value = {
    ...state,
    ...actions,
    // Computed values
    canShowWidget: isAuthenticated && user?.role === 'patient',
    hasUnread: state.unreadCount > 0,
    isAIMode: state.chatMode === 'ai',
    isDoctorMode: state.chatMode === 'doctor'
  };

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
    </ChatWidgetContext.Provider>
  );
};

// Hook để sử dụng context
export const useChatWidget = () => {
  const context = useContext(ChatWidgetContext);
  if (!context) {
    throw new Error('useChatWidget must be used within ChatWidgetProvider');
  }
  return context;
};

export default ChatWidgetContext;