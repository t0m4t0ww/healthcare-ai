// src/constants/ehrTemplates.js
/**
 * Quick Templates cho từng chuyên khoa
 * Giúp bác sĩ điền form nhanh với các case thường gặp
 */

import { SPECIALTIES } from '../utils/ehrFormSchema';

export const INTERNAL_TEMPLATES = {
  CARDIAC_CHECKUP: {
    id: 'cardiac_checkup',
    name: 'Khám định kỳ tim mạch',
    icon: '❤️',
    description: 'Khám sức khỏe tim mạch định kỳ',
    data: {
      cardiovascular: 'Nhịp tim đều, không tiếng thổi bất thường. Huyết áp ổn định.',
      respiratory: 'Phổi trong sạch, không ran',
      labs: ['ECG', 'Xét nghiệm lipid máu', 'Đường huyết'],
      imaging: []
    }
  },
  DIABETES_CHECKUP: {
    id: 'diabetes_checkup',
    name: 'Khám đái tháo đường',
    icon: '🩸',
    description: 'Theo dõi bệnh nhân đái tháo đường',
    data: {
      endocrine: 'Theo dõi đái tháo đường type 2',
      cardiovascular: 'Kiểm tra biến chứng tim mạch',
      urinary: 'Kiểm tra chức năng thận',
      labs: ['Đường huyết lúc đói', 'HbA1c', 'Chức năng thận', 'Lipid máu'],
      imaging: []
    }
  },
  HYPERTENSION_CHECKUP: {
    id: 'hypertension_checkup',
    name: 'Khám tăng huyết áp',
    icon: '🫀',
    description: 'Theo dõi bệnh nhân tăng huyết áp',
    data: {
      cardiovascular: 'Huyết áp cao, cần theo dõi điều trị. Kiểm tra tim, mạch máu.',
      respiratory: 'Phổi bình thường',
      labs: ['Điện tim', 'Siêu âm tim', 'Lipid máu', 'Chức năng thận'],
      imaging: ['X-quang ngực']
    }
  },
  GENERAL_CHECKUP: {
    id: 'general_checkup',
    name: 'Khám tổng quát',
    icon: '🏥',
    description: 'Khám sức khỏe tổng quát',
    data: {
      respiratory: 'Hô hấp bình thường',
      cardiovascular: 'Tim mạch ổn định',
      gastrointestinal: 'Tiêu hóa tốt',
      urinary: 'Tiết niệu bình thường',
      endocrine: 'Nội tiết ổn định',
      labs: ['Xét nghiệm máu tổng quát', 'Nước tiểu'],
      imaging: []
    }
  }
};

export const OBSTETRIC_TEMPLATES = {
  NORMAL_PREGNANCY: {
    id: 'normal_pregnancy',
    name: 'Thai nghén bình thường',
    icon: '🤰',
    description: 'Khám thai định kỳ không có biến chứng',
    data: {
      gravida: 1,
      para: 0,
      fhr_bpm: 140,
      presentation: 'Đầu',
      blood_pressure: '110/70',
      edema: 'Không',
      obstetric_ultrasound: 'Thai phát triển bình thường theo tuổi thai. Nhau thai vị trí bình thường. Lượng nước ối bình thường.'
    }
  },
  FIRST_PRENATAL: {
    id: 'first_prenatal',
    name: 'Khám thai lần đầu',
    icon: '👶',
    description: 'Khám thai lần đầu tiên',
    data: {
      gravida: 1,
      para: 0,
      fhr_bpm: null,
      presentation: 'Chưa xác định',
      blood_pressure: '',
      edema: 'Không',
      obstetric_ultrasound: 'Cần siêu âm xác định tuổi thai, vị trí thai, tim thai.'
    }
  },
  HIGH_RISK_PREGNANCY: {
    id: 'high_risk_pregnancy',
    name: 'Thai nghén nguy cơ cao',
    icon: '⚠️',
    description: 'Thai phụ có yếu tố nguy cơ',
    data: {
      gravida: null,
      para: null,
      fhr_bpm: null,
      presentation: '',
      blood_pressure: '',
      edema: '',
      obstetric_ultrasound: 'Cần theo dõi sát: Siêu âm doppler, NST, đánh giá chức năng nhau thai.'
    }
  },
  POSTPARTUM_CHECKUP: {
    id: 'postpartum_checkup',
    name: 'Khám sau sinh',
    icon: '🍼',
    description: 'Khám sức khỏe sau sinh',
    data: {
      gravida: null,
      para: 1,
      fhr_bpm: null,
      presentation: 'N/A',
      blood_pressure: '',
      edema: '',
      obstetric_ultrasound: 'Kiểm tra tử cung co hồi, vết mổ (nếu có), không tàn dư nhau.'
    }
  }
};

export const PEDIATRIC_TEMPLATES = {
  NEWBORN_CHECKUP: {
    id: 'newborn_checkup',
    name: 'Khám sơ sinh',
    icon: '👼',
    description: 'Khám em bé sơ sinh 0-1 tháng',
    data: {
      guardian_name: '',
      growth: {
        weight_kg: 3.5,
        height_cm: 50,
        head_circumference_cm: 35
      },
      nutrition: 'Bú sữa mẹ hoàn toàn',
      immunization_status: 'BCG, Viêm gan B (liều 1)',
      development: 'Phản xạ sơ sinh bình thường: bú, nắm, giật mình',
      main_symptoms: ''
    }
  },
  SIX_MONTH_CHECKUP: {
    id: 'six_month_checkup',
    name: 'Khám 6 tháng tuổi',
    icon: '🧸',
    description: 'Khám phát triển 6 tháng',
    data: {
      guardian_name: '',
      growth: {
        weight_kg: 7.5,
        height_cm: 67,
        head_circumference_cm: 43
      },
      nutrition: 'Ăn dặm + sữa mẹ',
      immunization_status: 'Đầy đủ mũi 6 tháng (DPT, Polio, Hib, Viêm gan B)',
      development: 'Ngồi có tựa, lật được, cầm đồ vật, phát ra âm thanh',
      main_symptoms: ''
    }
  },
  ONE_YEAR_CHECKUP: {
    id: 'one_year_checkup',
    name: 'Khám 1 tuổi',
    icon: '🎂',
    description: 'Khám phát triển 1 năm tuổi',
    data: {
      guardian_name: '',
      growth: {
        weight_kg: 9.5,
        height_cm: 75,
        head_circumference_cm: 46
      },
      nutrition: 'Ăn đủ 3 bữa chính + 2 bữa phụ, uống sữa',
      immunization_status: 'Đầy đủ mũi 12 tháng (Sởi - Rubella, Thủy đậu)',
      development: 'Biết đi, nói 2-3 từ đơn giản, nhận diện người thân',
      main_symptoms: ''
    }
  },
  SICK_CHILD: {
    id: 'sick_child',
    name: 'Khám trẻ ốm',
    icon: '🤒',
    description: 'Khám trẻ có triệu chứng bệnh',
    data: {
      guardian_name: '',
      growth: {
        weight_kg: null,
        height_cm: null,
        head_circumference_cm: null
      },
      nutrition: '',
      immunization_status: '',
      development: '',
      main_symptoms: 'Sốt, ho, khó thở...'
    }
  },
  MALNUTRITION_FOLLOWUP: {
    id: 'malnutrition_followup',
    name: 'Theo dõi suy dinh dưỡng',
    icon: '📊',
    description: 'Theo dõi trẻ suy dinh dưỡng',
    data: {
      guardian_name: '',
      growth: {
        weight_kg: null,
        height_cm: null,
        head_circumference_cm: null
      },
      nutrition: 'Cần tư vấn dinh dưỡng, bổ sung vi chất',
      immunization_status: '',
      development: 'Đánh giá chậm phát triển nếu có',
      main_symptoms: 'Cân nặng không tăng hoặc giảm, thiếu vi chất'
    }
  }
};

// Export all templates by specialty
export const TEMPLATES_BY_SPECIALTY = {
  [SPECIALTIES.INTERNAL]: INTERNAL_TEMPLATES,
  [SPECIALTIES.OBSTETRIC]: OBSTETRIC_TEMPLATES,
  [SPECIALTIES.PEDIATRIC]: PEDIATRIC_TEMPLATES
};

// Get templates for a specific specialty
export const getTemplatesForSpecialty = (specialty) => {
  return TEMPLATES_BY_SPECIALTY[specialty] || {};
};

// Get template by ID
export const getTemplateById = (specialty, templateId) => {
  const templates = getTemplatesForSpecialty(specialty);
  return Object.values(templates).find(t => t.id === templateId);
};
