// constants/specialties.js
import { Stethoscope, Heart, Baby } from 'lucide-react';

export const SPECIALTIES = {
  general_medicine: {
    code: 'general_medicine',
    name: 'Nội tổng quát',
    icon: Stethoscope,
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    features: ['xray_upload'],
    vitals: ['blood_pressure', 'heart_rate', 'temperature', 'spo2', 'weight', 'height']
  },
  obstetrics: {
    code: 'obstetrics',
    name: 'Sản phụ khoa',
    icon: Heart,
    color: 'pink',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    features: ['pregnancy_tracking'],
    vitals: ['blood_pressure', 'weight', 'fetal_heart_rate', 'fundal_height']
  },
  pediatrics: {
    code: 'pediatrics',
    name: 'Nhi khoa',
    icon: Baby,
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    features: ['growth_chart'],
    vitals: ['height', 'weight', 'temperature', 'heart_rate', 'head_circumference']
  }
};

export const SPECIALTY_LIST = Object.values(SPECIALTIES);

export const VALID_SPECIALTIES = ['general_medicine', 'obstetrics', 'pediatrics'];

export const VITAL_LABELS = {
  blood_pressure: 'Huyết áp',
  heart_rate: 'Nhịp tim',
  temperature: 'Nhiệt độ',
  spo2: 'SpO2',
  weight: 'Cân nặng',
  height: 'Chiều cao',
  fetal_heart_rate: 'Nhịp tim thai',
  fundal_height: 'Chiều cao tử cung',
  head_circumference: 'Vòng đầu'
};

export const VITAL_UNITS = {
  blood_pressure: 'mmHg',
  heart_rate: 'bpm',
  temperature: '°C',
  spo2: '%',
  weight: 'kg',
  height: 'cm',
  fetal_heart_rate: 'bpm',
  fundal_height: 'cm',
  head_circumference: 'cm'
};

export const REQUIRED_VITALS = {
  general_medicine: ['blood_pressure', 'temperature'],
  obstetrics: ['blood_pressure', 'weight'],
  pediatrics: ['height', 'weight']
};

export const getSpecialtyConfig = (code) => {
  return SPECIALTIES[code] || SPECIALTIES.general_medicine;
};

export const getSpecialtyColor = (code) => {
  const config = getSpecialtyConfig(code);
  return {
    bg: config.bgColor,
    text: config.textColor,
    border: config.borderColor,
    color: config.color
  };
};

export const getRequiredVitals = (code) => {
  return REQUIRED_VITALS[code] || REQUIRED_VITALS.general_medicine;
};
