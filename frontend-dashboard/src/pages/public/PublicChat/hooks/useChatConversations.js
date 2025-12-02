import { useState, useCallback } from 'react';
import { message } from 'antd';
import { 
  listConversations, 
  createConversation, 
  deleteConversation 
} from '../../../../services/chatService';
import { CHAT_MODES } from '../constants';

export const useChatConversations = ({ 
  user,
  isPatient,
  chatMode, 
  selectedDoctor,
  conversations, // Add this to receive current conversations
  activeConv, // Add this to check active conversation
  setConversations, 
  setActiveConv,
  setMessages,
  setSelectedDoctor,
  setConsentGiven,
  loadMessages 
}) => {
  const [isLoading, setIsLoading] = useState(true);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log(`📥 Loading conversations for mode: ${chatMode}`);
      const response = await listConversations();
      const allConversations = response.data.data || [];
      
      // Filter conversations based on chat mode
      const filteredConversations = allConversations.filter(conv => {
        if (chatMode === CHAT_MODES.AI) {
          return conv.mode === 'ai';
        } else {
          return conv.mode === 'patient' || conv.mode === 'doctor';
        }
      });
      
      setConversations(filteredConversations);
      console.log(`✅ Loaded ${filteredConversations.length} conversations`);
    } catch (error) {
      console.error('Error loading conversations:', error);
      message.error('Không thể tải danh sách hội thoại');
    } finally {
      setIsLoading(false);
    }
  }, [user, chatMode, setConversations]);

  // Create new conversation
  const createNewConversation = useCallback(async (doctorOverride = null) => {
    try {
      // Check if AI conversation already exists (patient can only have 1)
      if (chatMode === CHAT_MODES.AI && isPatient) {
        const existingAI = conversations.find(c => c.mode === 'ai');
        if (existingAI) {
          console.log('✅ AI conversation already exists, using existing one');
          setActiveConv(existingAI);
          await loadMessages(existingAI._id);
          message.info('Đã mở cuộc trò chuyện AI hiện có');
          return existingAI;
        }
      }
      
      // Use doctorOverride if provided, otherwise use selectedDoctor
      const doctor = doctorOverride || selectedDoctor;
      
      if (chatMode === CHAT_MODES.DOCTOR && !doctor) {
        console.warn('⚠️ No doctor selected for doctor chat mode');
        return null;
      }

      // Check if conversation already exists with this doctor
      if (chatMode === CHAT_MODES.DOCTOR && doctor) {
        const existing = conversations.find(
          c => c.doctor_id === (doctor._id || doctor.id) && 
               c.mode === 'doctor' && 
               c.status !== 'archived'
        );
        
        if (existing) {
          console.log('✅ Reusing existing conversation:', existing);
          setActiveConv(existing);
          await loadMessages(existing._id);
          setSelectedDoctor(null);
          message.info('Đã mở cuộc trò chuyện hiện có');
          return existing;
        }
      }

      // ✅ Use patient_id for chat conversations
      const patientId = isPatient ? (user.patient_id || user.id || user._id) : null;

      const payload = {
        mode: chatMode,
        title: chatMode === CHAT_MODES.AI 
          ? "Chat với AI" 
          : `Chat với ${doctor?.name || "Bác sĩ"}`,
        patient_id: patientId,
        doctor_id: chatMode === CHAT_MODES.DOCTOR ? (doctor?._id || doctor?.id) : null
      };

      console.log(`🆕 Creating new ${chatMode} conversation with doctor:`, doctor?.name);
      const response = await createConversation(payload);
      const newConv = response.data.data;
      
      // Check if server returned existing conversation (for AI mode)
      if (response.data.message === "Đã tồn tại cuộc trò chuyện với AI" || response.data.conversation) {
        const existingConv = response.data.conversation || newConv;
        console.log('✅ Reusing existing AI conversation:', existingConv);
        
        // Update conversations list if not already there
        const alreadyInList = conversations.some(c => c._id === existingConv._id);
        if (!alreadyInList) {
          setConversations(prev => [existingConv, ...prev]);
        }
        
        setActiveConv(existingConv);
        await loadMessages(existingConv._id);
        message.info('Đã mở cuộc trò chuyện AI hiện có');
        return existingConv;
      }
      
      setConversations(prev => [newConv, ...prev]);
      setActiveConv(newConv);
      setMessages([]);
      setSelectedDoctor(null);
      
      message.success('Đã tạo cuộc trò chuyện mới');
      console.log("✅ Created new conversation:", newConv);
      return newConv;
    } catch (error) {
      console.error('Error creating conversation:', error);
      message.error('Không thể tạo cuộc trò chuyện');
      return null;
    }
  }, [user, isPatient, chatMode, selectedDoctor, conversations, setConversations, setActiveConv, setMessages, setSelectedDoctor, loadMessages]);

  // Delete conversation
  const deleteConversationHandler = useCallback(async (convId) => {
    try {
      console.log(`🗑️ Deleting conversation: ${convId}`);
      await deleteConversation(convId);
      
      // Remove from list
      setConversations(prev => prev.filter(c => c._id !== convId));
      
      // Reset if this was active conversation
      if (activeConv?._id === convId) {
        setActiveConv(null);
        setMessages([]);
      }
      
      message.success('Đã xóa cuộc trò chuyện');
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      message.error('Không thể xóa cuộc trò chuyện');
      return false;
    }
  }, [activeConv, setConversations, setActiveConv, setMessages]);

  // Start new conversation (reset state)
  const startNewConversation = useCallback(() => {
    setActiveConv(null);
    setMessages([]);
    setSelectedDoctor(null);
    setConsentGiven(false);
  }, [setActiveConv, setMessages, setSelectedDoctor, setConsentGiven]);

  return {
    isLoading,
    loadConversations,
    createNewConversation,
    deleteConversation: deleteConversationHandler,
    startNewConversation
  };
};
