import { useEffect, useCallback } from 'react';

/**
 * Hook for requesting notification permissions
 */
export const useNotificationPermission = () => {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);
};

/**
 * Show browser notification
 */
export const showBrowserNotification = (title, body) => {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    const notification = new Notification(title, {
      body,
      renotify: false,
      tag: Date.now().toString()
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Notification error:', error);
  }
};

/**
 * Flash page title with message
 */
export const flashTitle = (message, duration = 2000) => {
  if (!document.hidden) return;
  
  const oldTitle = document.title;
  document.title = `🔔 ${message}`;
  
  setTimeout(() => {
    document.title = oldTitle;
  }, duration);
};
