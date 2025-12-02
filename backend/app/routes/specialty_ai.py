# backend/app/routes/specialty_ai.py
"""
API routes for Specialty AI Assistant
"""

from flask import Blueprint, request, jsonify
from app.services.specialty_ai_service import SpecialtyAIService

specialty_ai_bp = Blueprint('specialty_ai', __name__)

@specialty_ai_bp.route('/suggest', methods=['POST'])
@specialty_ai_bp.route('/suggestions', methods=['POST'])
def get_ai_suggestions():
    """
    Get AI suggestions for examination
    
    POST /api/specialty-ai/suggest (or /suggestions)
    Body: {
        "specialty": "internal|obstetric|pediatric",
        "chief_complaint": "triệu chứng chính",
        "history_present_illness": "bệnh sử",
        "symptoms": "triệu chứng chính" (legacy),
        "patient_info": {"age": 30, "gender": "male", ...},
        "vital_signs": {"blood_pressure": "120/80", ...}
    }
    """
    try:
        data = request.get_json()
        
        specialty = data.get('specialty', 'internal')
        # Support both 'symptoms' (legacy) and 'chief_complaint' (new)
        symptoms = data.get('chief_complaint') or data.get('symptoms', '')
        history = data.get('history_present_illness', '')
        patient_info = data.get('patient_info')
        vital_signs = data.get('vital_signs')
        
        # Combine symptoms and history for better context
        if history:
            symptoms = f"{symptoms}\n\nBệnh sử: {history}"
        
        if not symptoms:
            return jsonify({
                "status": "error",
                "message": "Vui lòng cung cấp triệu chứng"
            }), 400
        
        # Call AI service (now sync, no need asyncio)
        result = SpecialtyAIService.get_suggestions(
            specialty=specialty,
            symptoms=symptoms,
            patient_info=patient_info,
            vital_signs=vital_signs
        )
        
        if result.get('success'):
            return jsonify({
                "status": "success",
                "data": result
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": result.get('error', 'Không thể lấy gợi ý')
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@specialty_ai_bp.route('/quick-suggestions/<specialty>/<template_id>', methods=['GET'])
def get_quick_suggestions(specialty, template_id):
    """
    Get predefined quick suggestions for common cases
    
    GET /api/specialty-ai/quick-suggestions/internal/cardiac_checkup
    """
    try:
        result = SpecialtyAIService.get_quick_suggestions(specialty, template_id)
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
