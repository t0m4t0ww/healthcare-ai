export const fmtVietnam = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Ho_Chi_Minh', // UTC+7 Vietnam timezone
});

export const formatMessageTime = (timestamp) => {
  try {
    // Debug: log raw timestamp
    console.log('🕐 Timestamp raw:', timestamp);
    const date = new Date(timestamp);
    console.log('🕐 Date object:', date.toISOString(), '| Vietnam:', fmtVietnam.format(date));
    return fmtVietnam.format(date);
  } catch (e) {
    console.error('❌ Date format error:', e);
    return '';
  }
};

