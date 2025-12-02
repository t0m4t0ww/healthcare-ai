/**
 * Antd Message Wrapper
 * Wrap antd message API để sử dụng centralized toast service
 * Giúp migration từ antd message sang toast service dễ dàng
 */

import toast from './toastService';

/**
 * Wrapper for antd's message API
 * Provides same interface but uses toast service internally
 */
const messageWrapper = {
  success: (content, duration = 3) => {
    const options = duration !== 3 ? { autoClose: duration * 1000 } : {};
    return toast.success(content, options);
  },

  error: (content, duration = 3) => {
    const options = duration !== 3 ? { autoClose: duration * 1000 } : {};
    return toast.error(content, options);
  },

  warning: (content, duration = 3) => {
    const options = duration !== 3 ? { autoClose: duration * 1000 } : {};
    return toast.warning(content, options);
  },

  info: (content, duration = 3) => {
    const options = duration !== 3 ? { autoClose: duration * 1000 } : {};
    return toast.info(content, options);
  },

  loading: (content, duration = 0) => {
    return toast.loading(content, {
      autoClose: duration > 0 ? duration * 1000 : false
    });
  },

  // Support for object-style config (antd compatibility)
  config: (options) => {
    // This is for global config, can be implemented if needed
    console.log('Message config:', options);
  },

  destroy: (messageKey) => {
    if (messageKey) {
      toast.dismiss(messageKey);
    } else {
      toast.dismissAll();
    }
  }
};

export default messageWrapper;
