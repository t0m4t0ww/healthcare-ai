# backend/app/services/specialty_ai_service.py
"""
AI Assistant cho từng chuyên khoa
Cung cấp gợi ý thông minh dựa trên specialty và symptoms
"""

from typing import Dict, List, Optional
from app.services.gemini_service import gemini_chat
import json

class SpecialtyAIService:
    """Service for specialty-specific AI assistance"""
    
    SPECIALTY_PROMPTS = {
        "internal": """Bạn là Trợ lý AI chuyên khoa Nội tổng quát với chuyên môn về:
- Tim mạch (cardiovascular)
- Hô hấp (respiratory) 
- Tiêu hóa (gastrointestinal)
- Tiết niệu (urinary)
- Nội tiết (endocrine)

Nhiệm vụ: Dựa vào triệu chứng bệnh nhân, đề xuất:
1. Các xét nghiệm cần làm (labs)
2. Chẩn đoán sơ bộ có thể (preliminary diagnosis)
3. Các loại thuốc thường dùng (medications)

Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp.""",

        "obstetric": """Bạn là Trợ lý AI chuyên khoa Sản phụ khoa với chuyên môn về:
- Thai nghén (pregnancy)
- Sinh nở (delivery)
- Chăm sóc sau sinh (postpartum)
- Siêu âm sản khoa (obstetric ultrasound)

Nhiệm vụ: Dựa vào thông tin thai phụ, đề xuất:
1. Các xét nghiệm cần làm (prenatal tests)
2. Đánh giá nguy cơ (risk assessment)
3. Lời khuyên chăm sóc (care recommendations)
4. Thời điểm khám lại (follow-up schedule)

Trả lời bằng tiếng Việt, chú ý an toàn mẹ và bé.""",

        "pediatric": """Bạn là Trợ lý AI chuyên khoa Nhi với chuyên môn về:
- Phát triển trẻ em (child development)
- Dinh dưỡng (nutrition)
- Tiêm chủng (immunization)
- Bệnh thường gặp ở trẻ (common pediatric diseases)

Nhiệm vụ: Dựa vào thông tin trẻ, đề xuất:
1. Đánh giá tăng trưởng (growth assessment)
2. Lịch tiêm chủng cần bổ sung (immunization needed)
3. Tư vấn dinh dưỡng (nutrition advice)
4. Xét nghiệm nếu cần (recommended tests)

Trả lời bằng tiếng Việt, dễ hiểu cho phụ huynh."""
    }
    
    @staticmethod
    def get_specialty_prompt(specialty: str) -> str:
        """Get the system prompt for a specialty"""
        return SpecialtyAIService.SPECIALTY_PROMPTS.get(
            specialty.lower(), 
            SpecialtyAIService.SPECIALTY_PROMPTS["internal"]
        )
    
    @staticmethod
    def get_suggestions(
        specialty: str,
        symptoms: str,
        patient_info: Optional[Dict] = None,
        vital_signs: Optional[Dict] = None
    ) -> Dict:
        """
        Get AI suggestions for examination based on specialty and symptoms
        (Using sync gemini_chat function)
        
        Args:
            specialty: Chuyên khoa (internal, obstetric, pediatric)
            symptoms: Triệu chứng chính
            patient_info: Thông tin bệnh nhân (tuổi, giới tính, tiền sử...)
            vital_signs: Dấu hiệu sinh tồn
            
        Returns:
            Dict with suggestions for labs, diagnosis, medications
        """
        system_prompt = SpecialtyAIService.get_specialty_prompt(specialty)
        
        # Build context
        context = f"Triệu chứng: {symptoms}\n"
        
        if patient_info:
            age = patient_info.get("age", "N/A")
            gender = patient_info.get("gender", "N/A")
            context += f"Bệnh nhân: {age} tuổi, giới tính {gender}\n"
            
            if "medical_history" in patient_info:
                context += f"Tiền sử: {patient_info['medical_history']}\n"
        
        if vital_signs:
            context += f"Dấu hiệu sinh tồn: {vital_signs}\n"
        
        # Build prompt
        user_prompt = f"""{context}

Hãy đề xuất:
1. **Xét nghiệm cần làm** (3-5 xét nghiệm quan trọng nhất)
2. **Chẩn đoán sơ bộ** (2-3 chẩn đoán có thể)
3. **Thuốc đề xuất** (Nhóm thuốc, không cần liều cụ thể)
4. **Lưu ý đặc biệt** (Nếu có)

Format trả lời JSON:
{{
  "labs": ["xét nghiệm 1", "xét nghiệm 2", ...],
  "diagnosis": ["chẩn đoán 1", "chẩn đoán 2"],
  "medications": ["thuốc/nhóm thuốc 1", "thuốc 2"],
  "notes": "Lưu ý đặc biệt..."
}}"""
        
        try:
            # Call gemini_chat function directly
            response = gemini_chat(
                user_prompt=user_prompt,
                system=system_prompt,
                temperature=0.3,
                max_tokens=1000
            )
            
            # Parse response (json already imported at top)
            # Try to extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            suggestions = json.loads(response_text)
            
            return {
                "success": True,
                "specialty": specialty,
                "suggestions": suggestions
            }
            
        except json.JSONDecodeError:
            # Fallback: return raw text
            return {
                "success": True,
                "specialty": specialty,
                "suggestions": {
                    "labs": [],
                    "diagnosis": [],
                    "medications": [],
                    "notes": response
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "suggestions": {
                    "labs": [],
                    "diagnosis": [],
                    "medications": [],
                    "notes": "Không thể lấy gợi ý từ AI"
                }
            }
    
    @staticmethod
    def get_quick_suggestions(specialty: str, template_id: str) -> Dict:
        """
        Get predefined suggestions for common cases (no AI call needed)
        """
        QUICK_SUGGESTIONS = {
            "internal": {
                "cardiac_checkup": {
                    "labs": ["ECG", "Xét nghiệm lipid máu", "Troponin (nếu đau ngực)"],
                    "diagnosis": ["Theo dõi sức khỏe tim mạch", "Tăng lipid máu"],
                    "medications": ["Statin (nếu cholesterol cao)", "Aspirin (nếu có chỉ định)"],
                    "notes": "Tư vấn chế độ ăn ít mặn, ít béo"
                },
                "diabetes_checkup": {
                    "labs": ["Đường huyết lúc đói", "HbA1c", "Chức năng thận", "Lipid máu"],
                    "diagnosis": ["Đái tháo đường type 2", "Kiểm tra biến chứng"],
                    "medications": ["Metformin", "Insulin (nếu cần)", "Statin"],
                    "notes": "Theo dõi đường huyết tại nhà, kiểm tra mắt định kỳ"
                }
            },
            "obstetric": {
                "normal_pregnancy": {
                    "labs": ["Siêu âm thai", "Xét nghiệm nước tiểu", "Hemoglobin"],
                    "diagnosis": ["Thai nghén bình thường"],
                    "medications": ["Acid folic", "Sắt", "Canxi"],
                    "notes": "Khám thai định kỳ theo lịch, nghỉ ngơi đầy đủ"
                },
                "first_prenatal": {
                    "labs": ["Siêu âm xác định tuổi thai", "Nhóm máu", "HIV, HBsAg, VDRL", "Rubella"],
                    "diagnosis": ["Thai nghén lần đầu"],
                    "medications": ["Acid folic 5mg", "Vitamin tổng hợp cho bà bầu"],
                    "notes": "Tư vấn chế độ ăn, tránh thuốc không an toàn"
                }
            },
            "pediatric": {
                "newborn_checkup": {
                    "labs": ["Sàng lọc sơ sinh", "Nhóm máu"],
                    "diagnosis": ["Khám sơ sinh bình thường"],
                    "medications": ["Vitamin K (tiêm)", "Vitamin D (uống)"],
                    "notes": "Tư vấn nuôi con bằng sữa mẹ, chăm sóc rốn"
                },
                "six_month_checkup": {
                    "labs": ["Hemoglobin (thiếu máu)"],
                    "diagnosis": ["Phát triển bình thường 6 tháng"],
                    "medications": ["Vitamin D", "Sắt (nếu thiếu máu)"],
                    "notes": "Bắt đầu ăn dặm, tiếp tục tiêm chủng"
                }
            }
        }
        
        suggestions = QUICK_SUGGESTIONS.get(specialty, {}).get(template_id, {
            "labs": [],
            "diagnosis": [],
            "medications": [],
            "notes": ""
        })
        
        return {
            "success": True,
            "specialty": specialty,
            "template_id": template_id,
            "suggestions": suggestions
        }
