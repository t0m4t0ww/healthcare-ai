// 
export const API_BASE =
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_API_BASE)) ||
  (typeof window !== 'undefined' &&
    window.__ENV__ &&
    window.__ENV__.API_BASE) ||
  'http://localhost:8000';
