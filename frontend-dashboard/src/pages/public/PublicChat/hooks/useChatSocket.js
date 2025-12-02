import { useEffect } from 'react';
import socket from '../../../../services/socket';
import { normalizeSender } from '../utils/messageHelpers';
import { showBrowserNotification, flashTitle } from '../utils/notificationHelpers';

export const useChatSocket = ({ 
  activeConv, 
  user, 
  setMessages, 
  setTyping, 
  typingTimeoutRef, 
  scrollToBottom 
}) => {
  useEffect(() => {
    if (!activeConv) return;

    // Join conversation room với format: room:conversation_id
    const roomName = `room:${activeConv._id}`;
    socket.emit('join_room', { room: roomName });
    console.log(`🔌 Joined socket room: ${roomName}`);

    // Handle new messages
    const handleNewMessage = (data) => {
      console.log("📨 Socket received message:", data);
      
      if (data.conversation_id === activeConv._id) {
        const newMessage = {
          id: data.message_id || data._id || Date.now().toString(),
          role: normalizeSender(data, activeConv, user),
          text: data.text || data.message,
          timestamp: new Date(data.timestamp || data.created_at).toISOString()
        };
        
        const isActiveConv = data.conversation_id === activeConv._id;
        if (!isActiveConv || document.hidden) {
          showBrowserNotification('Bạn có tin nhắn mới', newMessage.text || 'Tin nhắn mới');
          flashTitle('Tin nhắn mới');
        }
        
        setMessages(prev => {
          // Check if message already exists by ID
          const exists = prev.some(msg => msg.id === newMessage.id);
          
          if (exists) {
            console.log("🔄 Duplicate message detected (by ID), skipping");
            return prev;
          }
          
          console.log("✅ Adding new message:", newMessage);
          return [...prev, newMessage];
        });
        
        scrollToBottom();
      }
    };

    // Handle typing indicators
    const handleTyping = (data) => {
      if (data.conv_id === activeConv._id && 
          (data.sender || '').toLowerCase() !== (user.role || '').toLowerCase()) {
        setTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);
      }
    };

    // Handle message deleted
    const handleMessageDeleted = (data) => {
      console.log("🗑️ Socket received message_deleted:", data);
      if (data.conversation_id === activeConv._id) {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        console.log(`✅ Message ${data.message_id} removed from UI`);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("message_deleted", handleMessageDeleted);
      
      // Leave room
      socket.emit('leave_room', { room: roomName });
      console.log(`🔌 Left socket room: ${roomName}`);
    };
  }, [activeConv, user, setMessages, setTyping, typingTimeoutRef, scrollToBottom]);

  const emitTyping = (convId, userRole) => {
    if (!convId) return;
    socket.emit('typing', {
      conv_id: convId,
      sender: userRole || 'patient'
    });
  };

  return { emitTyping };
};
