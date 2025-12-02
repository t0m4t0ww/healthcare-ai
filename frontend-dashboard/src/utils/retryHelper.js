/**
 * Retry Helper - Utility for retrying failed API calls
 * Giúp cải thiện UX khi có lỗi network tạm thời
 */

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Custom function to determine if should retry
 * @returns {Promise} - Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      // Retry on network errors or 5xx server errors
      return (
        !error.response || 
        error.response.status >= 500 || 
        error.code === 'ECONNABORTED' ||
        error.message === 'Network Error'
      );
    }
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * 2, maxDelay);
      
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
    }
  }

  throw lastError;
};

/**
 * Retry with linear backoff (fixed delay between retries)
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise} - Result of the function
 */
export const retryWithFixedDelay = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries}`);
    }
  }

  throw lastError;
};

/**
 * Wrap an API service method with retry logic
 * @param {Function} apiMethod - API method to wrap
 * @param {Object} retryOptions - Options for retry logic
 * @returns {Function} - Wrapped function with retry logic
 */
export const withRetry = (apiMethod, retryOptions = {}) => {
  return async (...args) => {
    return retryWithBackoff(() => apiMethod(...args), retryOptions);
  };
};

/**
 * Common retry configurations for different scenarios
 */
export const RETRY_CONFIGS = {
  // For critical operations that must succeed
  CRITICAL: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 15000
  },
  
  // For standard API calls
  STANDARD: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000
  },
  
  // For quick operations that should fail fast
  FAST_FAIL: {
    maxRetries: 1,
    initialDelay: 500,
    maxDelay: 1000
  },
  
  // For background operations that can tolerate delays
  BACKGROUND: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000
  }
};

export default {
  retryWithBackoff,
  retryWithFixedDelay,
  withRetry,
  RETRY_CONFIGS
};
