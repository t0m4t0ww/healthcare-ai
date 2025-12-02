export const CHAT_MODES = {
  AI: 'ai',
  DOCTOR: 'doctor'
};

export const MESSAGE_ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  AI: 'ai',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

export const AI_QUICK_ACTIONS = [
  {
    label: "Phân tích triệu chứng",
    text: "Phân tích triệu chứng đau đầu và sốt nhẹ"
  },
  {
    label: "Tư vấn thuốc",
    text: "Tư vấn về thuốc và liều dùng"
  }
];

export const DOCTOR_QUICK_ACTIONS = [
  {
    label: "Đau đầu sốt",
    text: "Tôi bị đau đầu và sốt nhẹ"
  },
  {
    label: "Kết quả xét nghiệm",
    text: "Tôi muốn được tư vấn về kết quả xét nghiệm"
  }
];
