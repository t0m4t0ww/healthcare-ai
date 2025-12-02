/**
 * Centralized Toast Notification Service
 * Unified interface cho tất cả toast notifications trong app
 * Sử dụng react-toastify với consistent styling
 */

import { toast as toastify } from 'react-toastify';

// Consistent configuration
const DEFAULT_CONFIG = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Color scheme - consistent với design system
const TOAST_TYPES = {
  success: {
    icon: '✓',
    className: 'toast-success'
  },
  error: {
    icon: '✕',
    className: 'toast-error'
  },
  warning: {
    icon: '⚠',
    className: 'toast-warning'
  },
  info: {
    icon: 'ℹ',
    className: 'toast-info'
  },
  loading: {
    icon: '⏳',
    className: 'toast-loading'
  }
};

class ToastService {
  /**
   * Show success toast
   * @param {string} message - Message to display
   * @param {object} options - Additional options
   */
  success(message, options = {}) {
    return toastify.success(message, {
      ...DEFAULT_CONFIG,
      ...options,
      className: 'toast-success',
    });
  }

  /**
   * Show error toast
   * @param {string} message - Message to display
   * @param {object} options - Additional options
   */
  error(message, options = {}) {
    return toastify.error(message, {
      ...DEFAULT_CONFIG,
      autoClose: 5000, // Longer for errors
      ...options,
      className: 'toast-error',
    });
  }

  /**
   * Show warning toast
   * @param {string} message - Message to display
   * @param {object} options - Additional options
   */
  warning(message, options = {}) {
    return toastify.warning(message, {
      ...DEFAULT_CONFIG,
      ...options,
      className: 'toast-warning',
    });
  }

  /**
   * Show info toast
   * @param {string} message - Message to display
   * @param {object} options - Additional options
   */
  info(message, options = {}) {
    return toastify.info(message, {
      ...DEFAULT_CONFIG,
      autoClose: 3000, // Shorter for info
      ...options,
      className: 'toast-info',
    });
  }

  /**
   * Show loading toast (use promise for auto-update)
   * @param {string} message - Message to display
   * @param {object} options - Additional options
   */
  loading(message, options = {}) {
    return toastify.loading(message, {
      ...DEFAULT_CONFIG,
      autoClose: false,
      closeButton: false,
      ...options,
      className: 'toast-loading',
    });
  }

  /**
   * Update existing toast
   * @param {string|number} toastId - ID of toast to update
   * @param {object} options - Update options
   */
  update(toastId, options = {}) {
    return toastify.update(toastId, {
      ...DEFAULT_CONFIG,
      ...options,
    });
  }

  /**
   * Dismiss specific toast
   * @param {string|number} toastId - ID of toast to dismiss
   */
  dismiss(toastId) {
    toastify.dismiss(toastId);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    toastify.dismiss();
  }

  /**
   * Show promise-based toast (auto update on resolve/reject)
   * @param {Promise} promise - Promise to track
   * @param {object} messages - Messages for pending, success, error states
   * @param {object} options - Additional options
   */
  async promise(promise, messages = {}, options = {}) {
    const {
      pending = 'Đang xử lý...',
      success = 'Thành công!',
      error = 'Có lỗi xảy ra!'
    } = messages;

    return toastify.promise(
      promise,
      {
        pending: {
          render: pending,
          ...DEFAULT_CONFIG,
          ...options,
        },
        success: {
          render: success,
          ...DEFAULT_CONFIG,
          ...options,
        },
        error: {
          render: ({ data }) => {
            // Extract error message if available
            const errorMessage = data?.response?.data?.message || 
                                data?.response?.data?.error || 
                                data?.message || 
                                error;
            return errorMessage;
          },
          ...DEFAULT_CONFIG,
          autoClose: 5000,
          ...options,
        }
      }
    );
  }

  /**
   * Convenience method for API call toast
   * @param {Promise} apiCall - API call promise
   * @param {string} action - Action description (e.g., "Lưu dữ liệu")
   */
  async apiCall(apiCall, action = 'Xử lý') {
    return this.promise(apiCall, {
      pending: `Đang ${action.toLowerCase()}...`,
      success: `${action} thành công!`,
      error: `${action} thất bại!`
    });
  }

  /**
   * Show validation error
   * @param {string|object} errors - Validation errors
   */
  validationError(errors) {
    if (typeof errors === 'string') {
      return this.error(errors);
    }
    
    if (typeof errors === 'object') {
      const firstError = Object.values(errors)[0];
      if (Array.isArray(firstError)) {
        return this.error(firstError[0]);
      }
      return this.error(firstError);
    }
    
    return this.error('Vui lòng kiểm tra lại thông tin');
  }

  /**
   * Show network error
   */
  networkError() {
    return this.error('Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.', {
      autoClose: 6000
    });
  }

  /**
   * Show permission error
   */
  permissionError() {
    return this.error('Bạn không có quyền thực hiện thao tác này.', {
      autoClose: 5000
    });
  }

  /**
   * Show custom toast with full control
   * @param {string} message - Message to display
   * @param {object} options - Full toast options
   */
  custom(message, options = {}) {
    return toastify(message, {
      ...DEFAULT_CONFIG,
      ...options,
    });
  }
}

// Export singleton instance
const toast = new ToastService();
export default toast;

// Named exports for convenience
export const {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  apiCall,
  validationError,
  networkError,
  permissionError,
} = toast;
