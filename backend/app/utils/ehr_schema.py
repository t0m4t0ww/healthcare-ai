# backend/app/utils/ehr_schema.py
"""
EHR Schema Validator - Medical Examination Form Agent
Chuẩn hóa và validate form khám bệnh theo chuyên khoa
"""

from typing import Dict, List, Any, Optional
from datetime import datetime

class EHRSchemaValidator:
    """Agent để tạo, chuẩn hóa và validate form EHR theo chuyên khoa"""
    
    VALID_SPECIALTIES = ["internal"]
    
    @staticmethod
    def get_base_schema() -> Dict[str, Any]:
        """Cấu trúc cơ bản cho mọi chuyên khoa"""
        return {
            "specialty": "",
            "common_exam": {
                "chief_complaint": "",
                "subjective": "",
                "vital_signs": {
                    "temperature": None,
                    "heart_rate": None,
                    "blood_pressure": "",
                    "respiratory_rate": None,
                    "spo2": None,
                    "weight": None,
                    "height": None
                },
                "general_exam": "",
                "diagnosis": ""
            },
            "specialty_exam": {},
            "prescriptions": [],
            "follow_up": ""
        }
    
    @staticmethod
    def get_internal_schema() -> Dict[str, Any]:
        """Schema cho Nội tổng quát"""
        return {
            "respiratory": "",
            "cardiovascular": "",
            "gastrointestinal": "",
            "urinary": "",
            "endocrine": "",
            "labs": [],
            "imaging": []
        }
    

    
    @staticmethod
    def create_ehr_record(specialty: str, partial_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Tạo record EHR hoàn chỉnh theo chuyên khoa
        
        Args:
            specialty: "internal" | "obstetric" | "pediatric"
            partial_data: Dữ liệu có sẵn (optional)
            
        Returns:
            Dict: EHR record hoàn chỉnh
        """
        if specialty not in EHRSchemaValidator.VALID_SPECIALTIES:
            raise ValueError(f"Invalid specialty. Must be one of: {EHRSchemaValidator.VALID_SPECIALTIES}")
        
        # Tạo base structure
        ehr_record = EHRSchemaValidator.get_base_schema()
        ehr_record["specialty"] = specialty
        
        # Thêm specialty_exam tương ứng
        if specialty == "internal":
            ehr_record["specialty_exam"]["internal"] = EHRSchemaValidator.get_internal_schema()
        
        # Merge partial data nếu có
        if partial_data:
            ehr_record = EHRSchemaValidator._merge_data(ehr_record, partial_data)
        
        return ehr_record
    
    @staticmethod
    def _merge_data(base: Dict, partial: Dict) -> Dict:
        """Merge partial data vào base structure"""
        for key, value in partial.items():
            if key in base:
                if isinstance(base[key], dict) and isinstance(value, dict):
                    base[key] = EHRSchemaValidator._merge_data(base[key], value)
                else:
                    base[key] = value
        return base
    
    @staticmethod
    def validate_record(record: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate EHR record
        
        Returns:
            (is_valid, warnings): Tuple[bool, List[str]]
        """
        warnings = []
        
        # Check specialty
        specialty = record.get("specialty", "")
        if specialty not in EHRSchemaValidator.VALID_SPECIALTIES:
            return False, [f"Invalid specialty: {specialty}"]
        
        # Check required fields
        if not record.get("common_exam", {}).get("chief_complaint"):
            warnings.append("Missing chief_complaint")
        
        if not record.get("common_exam", {}).get("diagnosis"):
            warnings.append("Missing diagnosis")
        
        # Validate specialty-specific data
        specialty_exam = record.get("specialty_exam", {})
        
        if specialty == "internal":
            if "internal" not in specialty_exam:
                warnings.append("Missing internal exam data")
        
        # Check vital signs
        vital_signs = record.get("common_exam", {}).get("vital_signs", {})
        if not vital_signs.get("blood_pressure"):
            warnings.append("Missing blood_pressure")
        
        is_valid = len(warnings) == 0
        return is_valid, warnings
    
    @staticmethod
    def fill_placeholders(record: Dict[str, Any]) -> Dict[str, Any]:
        """Điền placeholder cho các field rỗng"""
        # Common exam
        common = record.get("common_exam", {})
        if not common.get("diagnosis"):
            common["diagnosis"] = "Chưa cập nhật"
        if not common.get("general_exam"):
            common["general_exam"] = "Chưa khám"
        
        # Specialty exam placeholders
        specialty = record.get("specialty", "")
        specialty_exam = record.get("specialty_exam", {})
        
        if specialty == "internal" and "internal" in specialty_exam:
            internal = specialty_exam["internal"]
            for key in ["respiratory", "cardiovascular", "gastrointestinal", "urinary", "endocrine"]:
                if not internal.get(key):
                    internal[key] = "Không có bất thường"
        
        return record


def create_ehr_form(specialty: str, partial_data: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Helper function - Main entry point
    
    Args:
        specialty: "internal" | "obstetric" | "pediatric"
        partial_data: Dữ liệu người dùng đã nhập
        
    Returns:
        Dict: EHR record chuẩn, sẵn sàng lưu MongoDB
    """
    validator = EHRSchemaValidator()
    
    # Tạo structure
    ehr_record = validator.create_ehr_record(specialty, partial_data)
    
    # Fill placeholders
    ehr_record = validator.fill_placeholders(ehr_record)
    
    # Validate
    is_valid, warnings = validator.validate_record(ehr_record)
    
    # Return với metadata
    return {
        "record": ehr_record,
        "is_valid": is_valid,
        "warnings": warnings,
        "created_at": datetime.utcnow().isoformat()
    }
