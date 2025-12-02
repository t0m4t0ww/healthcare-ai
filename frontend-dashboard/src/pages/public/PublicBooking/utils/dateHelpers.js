// ✅ Local YYYY-MM-DD (không lệch UTC)
export const toLocalISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Format date to Vietnamese
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });  
};

// Format date short (dd/mm/yyyy)
export const formatDateShort = (dateStr) => {
  if (!dateStr) return 'N/A';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

// Format time
export const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A';
  return timeStr;
};

// Get days in month
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// Get first day of month (0 = Sunday)
// Receives month as 1-12 (not 0-11)
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month - 1, 1).getDay();
};

// Check if date is today
export const isToday = (dateInput) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Convert to Date object if string
  let date;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateInput);
  }
  date.setHours(0, 0, 0, 0);
  
  return date.getTime() === today.getTime();
};

// Check if date is in past
export const isPast = (dateInput) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Convert to Date object if string
  let date;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateInput);
  }
  date.setHours(0, 0, 0, 0);
  
  return date < today;
};

// Get month dates array
export const getMonthDates = (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  const dates = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    dates.push(toLocalISODate(d));
  }
  
  return dates;
};

// Get next 7 days
export const getNext7Days = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    dates.push(toLocalISODate(d));
  }
  return dates;
};

// Format countdown time (mm:ss)
export const formatCountdown = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Format currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};
