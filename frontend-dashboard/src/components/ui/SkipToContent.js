// src/components/ui/SkipToContent.js - Skip to main content link
import React from 'react';

export const SkipToContent = () => {
  const handleSkip = (e) => {
    e.preventDefault();
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
      // Remove tabindex after focus
      setTimeout(() => main.removeAttribute('tabindex'), 100);
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg transition-all"
      aria-label="Bỏ qua đến nội dung chính"
    >
      Bỏ qua đến nội dung chính
    </a>
  );
};

export default SkipToContent;
