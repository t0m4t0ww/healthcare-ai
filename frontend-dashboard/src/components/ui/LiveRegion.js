// src/components/ui/LiveRegion.js - ARIA live regions for screen readers
import React from 'react';

/**
 * LiveRegion - Announces dynamic content changes to screen readers
 * 
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' (default) | 'assertive' (interrupts)
 * @param {boolean} atomic - Announce entire region (default: true)
 * @param {boolean} relevant - What changes to announce
 */
export const LiveRegion = ({ 
  message, 
  priority = 'polite',
  atomic = true,
  relevant = 'additions text'
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic ? 'true' : 'false'}
      aria-relevant={relevant}
      className="sr-only"
    >
      {message}
    </div>
  );
};

/**
 * PoliteAnnouncer - Non-interrupting announcements (default for most cases)
 */
export const PoliteAnnouncer = ({ children }) => (
  <LiveRegion message={children} priority="polite" />
);

/**
 * AssertiveAnnouncer - Immediate interrupting announcements (errors, urgent info)
 */
export const AssertiveAnnouncer = ({ children }) => (
  <LiveRegion message={children} priority="assertive" />
);

/**
 * StatusMessage - For status updates and info messages
 */
export const StatusMessage = ({ children }) => (
  <div role="status" aria-live="polite" className="sr-only">
    {children}
  </div>
);

/**
 * AlertMessage - For important alerts and errors
 */
export const AlertMessage = ({ children }) => (
  <div role="alert" aria-live="assertive" className="sr-only">
    {children}
  </div>
);

export default LiveRegion;
