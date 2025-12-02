// frontend-dashboard/src/utils/accessibility.js
/**
 * Accessibility (a11y) utilities
 */

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' (default) or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Focus trap for modals
 * @param {HTMLElement} element - Modal element
 * @returns {Function} - Cleanup function
 */
export const createFocusTrap = (element) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  firstFocusable?.focus();
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Generate unique ID for accessibility
 * @param {string} prefix - ID prefix
 * @returns {string} - Unique ID
 */
export const generateA11yId = (prefix = 'a11y') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if element is keyboard accessible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
export const isKeyboardAccessible = (element) => {
  const tag = element.tagName.toLowerCase();
  const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
  
  if (interactiveTags.includes(tag)) return true;
  
  const hasTabIndex = element.hasAttribute('tabindex');
  const hasRole = element.hasAttribute('role');
  const hasOnClick = element.onclick !== null;
  
  return hasTabIndex && (hasRole || hasOnClick);
};

/**
 * Add keyboard navigation to element
 * @param {HTMLElement} element - Element to make keyboard accessible
 * @param {Function} onClick - Click handler
 */
export const makeKeyboardAccessible = (element, onClick) => {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
  
  if (!element.hasAttribute('role')) {
    element.setAttribute('role', 'button');
  }
  
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  });
};
