# backend/app/constants/specialties.py
"""
Constants cho hệ thống 3 chuyên khoa
"""

SPECIALTIES = {
    "general_medicine": {
        "code": "general_medicine",
        "name": "Nội tổng quát",
        "name_en": "General Medicine",
        "icon": "🩺",
        "vitals": ["blood_pressure", "heart_rate", "temperature", "spo2", "weight", "height"],
        "features": ["xray_analysis"],
        "allows_xray": True,
        "description": "Khám và điều trị các bệnh nội khoa tổng quát"
    }
}

VALID_SPECIALTIES = ["general_medicine"]

# Required vitals cho từng chuyên khoa (chỉ 2 vitals bắt buộc)
REQUIRED_VITALS = {
    "general_medicine": ["blood_pressure", "temperature"]
}

# Optional vitals
OPTIONAL_VITALS = {
    "general_medicine": ["heart_rate", "spo2", "weight", "height"]
}

# Vital labels (Vietnamese)
VITAL_LABELS = {
    "blood_pressure": "Huyết áp",
    "heart_rate": "Nhịp tim",
    "temperature": "Nhiệt độ",
    "spo2": "SpO2",
    "weight": "Cân nặng",
    "height": "Chiều cao"
}

# Vital units
VITAL_UNITS = {
    "blood_pressure": "mmHg",
    "heart_rate": "bpm",
    "temperature": "°C",
    "spo2": "%",
    "weight": "kg",
    "height": "cm"
}

def get_specialty_config(specialty_code):
    """Get specialty configuration"""
    return SPECIALTIES.get(specialty_code, SPECIALTIES["general_medicine"])

def get_required_vitals(specialty_code):
    """Get required vitals for specialty"""
    return REQUIRED_VITALS.get(specialty_code, REQUIRED_VITALS["general_medicine"])

def validate_specialty(specialty_code):
    """Validate if specialty code is valid"""
    return specialty_code in VALID_SPECIALTIES
