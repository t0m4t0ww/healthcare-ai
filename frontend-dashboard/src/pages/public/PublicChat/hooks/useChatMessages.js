import { useState, useCallback } from 'react';
import { message } from 'antd';
import { 
  sendMessage as sendMessageAPI, 
  chatAI, 
  getConversation,
  uploadFile
} from '../../../../services/chatService';
import { formatMessage, normalizeSender } from '../utils/messageHelpers';

const normalizeMessageText = (text = '') => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const useChatMessages = ({ 
  user, 
  activeConv, 
  chatMode,
  consentGiven,
  setMessages, 
  scrollToBottom 
}) => {
  const [isSending, setIsSending] = useState(false);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    
    try {
      console.log(`📥 Loading messages for conversation: ${convId}`);
      const response = await getConversation(convId);
      const conv = response.data.data;
      
      if (conv && conv.messages) {
        const formattedMessages = conv.messages.map(msg => ({
          id: msg._id || msg.id || msg.message_id,
          role: normalizeSender(msg, conv, user),
          text: normalizeMessageText(msg.text || msg.message),
          timestamp: new Date(msg.created_at || msg.timestamp).toISOString(),
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_type: msg.file_type
        }));
        
        setMessages(formattedMessages);
        console.log(`✅ Loaded ${formattedMessages.length} messages`);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      message.error('Không thể tải tin nhắn');
    }
  }, [user, setMessages, scrollToBottom]);

  // Send a message
  const sendMessage = useCallback(async (text, convId) => {
    if (!text.trim() || !convId || isSending) return false;

    setIsSending(true);
    const tempId = `tmp-${Date.now()}`;
    
    try {
      console.log(`📤 Sending message to conversation: ${convId}`);
      
      // Prepare message data
      const messageBody = {
        content: text.trim(),
        role: user.role || 'patient',
        sender: user.role || 'patient',
        ...(chatMode === 'ai' && { 
          with_ehr_context: consentGiven,
          consent_timestamp: consentGiven ? new Date().toISOString() : null
        })
      };

      // Optimistic update with temporary ID
      const tempMessage = {
        id: tempId,
        role: messageBody.role.toLowerCase(),
        text: normalizeMessageText(messageBody.content),
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      requestAnimationFrame(() => scrollToBottom());
      
      // Send to backend with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30s timeout
      );
      
      const requestPromise = chatMode === 'ai' 
        ? chatAI(convId, { message: messageBody.content })
        : sendMessageAPI(convId, messageBody);
      
      const response = await Promise.race([requestPromise, timeoutPromise]);
      const serverMessage = response.data.data || response.data;
      
      // Handle response based on chat mode
      if (chatMode === 'ai') {
        // For AI mode: Keep user message, add AI response
        // First, update temp message with confirmed ID (if server returned user message)
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, id: serverMessage.user_message_id || msg.id }
            : msg
        ));
        
        // Then add AI response as a new message
        if (serverMessage && serverMessage.text) {
          const aiMessage = {
            id: serverMessage.message_id || serverMessage._id || `ai-${Date.now()}`,
            role: 'ai',
            text: normalizeMessageText(serverMessage.text),
            timestamp: new Date(serverMessage.timestamp || serverMessage.created_at).toISOString()
          };
          setMessages(prev => [...prev, aiMessage]);
        } else {
          throw new Error('AI không phản hồi');
        }
      } else {
        // For doctor mode: Replace temp message with server message
        if (serverMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempId 
              ? {
                  id: serverMessage._id || serverMessage.message_id || serverMessage.id,
                  role: normalizeSender(serverMessage, activeConv, user),
                  text: normalizeMessageText(serverMessage.text || serverMessage.content || serverMessage.message),
                  timestamp: new Date(serverMessage.created_at || serverMessage.timestamp).toISOString()
                }
              : msg
          ));
        }
      }
      
      requestAnimationFrame(() => scrollToBottom());
      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Better error messages
      const errorMsg = error.message === 'Request timeout'
        ? 'Yêu cầu quá lâu. Vui lòng thử lại.'
        : error.response?.status === 503
        ? 'AI đang quá tải. Vui lòng thử lại sau.'
        : error.response?.status === 500
        ? 'Lỗi server. Vui lòng thử lại.'
        : 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối.';
      
      message.error({
        content: errorMsg,
        duration: 5
      });
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      return false;
    } finally {
      setIsSending(false);
    }
  }, [user, chatMode, consentGiven, activeConv, isSending, setMessages, scrollToBottom]);

  // Send message with file attachment
  const sendMessageWithFile = useCallback(async (text, file, convId) => {
    if (!convId || isSending) return false;
    if (!text.trim() && !file) return false;

    setIsSending(true);
    const tempId = `tmp-${Date.now()}`;
    
    try {
      console.log(`📤 Sending message with file to conversation: ${convId}`);
      
      let fileInfo = null;
      
      // Upload file first if provided
      if (file) {
        message.loading({ content: 'Đang upload file...', key: 'upload', duration: 0 });
        const uploadResponse = await uploadFile(file, {
          conversation_id: convId,
          uploaded_by: user.user_id || user._id
        });
        
        const uploadData = uploadResponse.data.data || uploadResponse.data;
        fileInfo = {
          file_url: uploadData.file_url,
          file_name: uploadData.filename || file.name,
          file_type: uploadData.file_type || file.type
        };
        
        message.success({ content: 'Upload thành công!', key: 'upload', duration: 2 });
        console.log('✅ File uploaded:', fileInfo);
      }
      
      // Prepare message data
      const messageBody = {
        content: text.trim() || `[${fileInfo?.file_name || 'File đính kèm'}]`,
        role: user.role || 'patient',
        sender: user.role || 'patient',
        ...(fileInfo && {
          file_url: fileInfo.file_url,
          file_name: fileInfo.file_name,
          file_type: fileInfo.file_type
        })
      };

      // Optimistic update with temporary ID
      const tempMessage = {
        id: tempId,
        role: messageBody.role.toLowerCase(),
        text: messageBody.content,
        timestamp: new Date().toISOString(),
        ...(fileInfo && {
          file_url: fileInfo.file_url,
          file_name: fileInfo.file_name,
          file_type: fileInfo.file_type
        })
      };
      
      setMessages(prev => [...prev, tempMessage]);
      requestAnimationFrame(() => scrollToBottom());
      
      // Send to backend
      const response = await sendMessageAPI(convId, messageBody);
      const serverMessage = response.data.data || response.data;
      
      // Replace temp message with server message
      if (serverMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? {
                id: serverMessage._id || serverMessage.message_id || serverMessage.id,
                role: normalizeSender(serverMessage, activeConv, user),
                text: serverMessage.text || serverMessage.content || serverMessage.message,
                timestamp: new Date(serverMessage.created_at || serverMessage.timestamp).toISOString(),
                file_url: serverMessage.file_url,
                file_name: serverMessage.file_name,
                file_type: serverMessage.file_type
              }
            : msg
        ));
      }
      
      requestAnimationFrame(() => scrollToBottom());
      console.log('✅ Message with file sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending message with file:', error);
      
      const errorMsg = error.response?.status === 413
        ? 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.'
        : error.response?.data?.error || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
      
      message.error({
        content: errorMsg,
        duration: 5,
        key: 'upload'
      });
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      return false;
    } finally {
      setIsSending(false);
    }
  }, [user, activeConv, isSending, setMessages, scrollToBottom]);

  return {
    loadMessages,
    sendMessage,
    sendMessageWithFile,
    isSending
  };
};
