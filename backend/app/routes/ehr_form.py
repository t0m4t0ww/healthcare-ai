# backend/app/routes/ehr_form.py
"""
EHR Form API - Endpoint để tạo và validate form khám theo chuyên khoa
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime
from app.middlewares.auth import auth_required, get_current_user
from app.utils.responses import success, fail
from app.utils.ehr_schema import create_ehr_form, EHRSchemaValidator
from app.utils.doctor_helpers import get_doctor_oid_from_user
from app.extensions import mongo_db

ehr_form_bp = Blueprint("ehr_form", __name__)


@ehr_form_bp.route("/form/create", methods=["POST"])
@auth_required(roles=["doctor", "admin"])
def create_form():
    """
    Tạo form khám bệnh theo chuyên khoa
    
    POST /api/ehr/form/create
    Body: {
        "specialty": "internal | obstetric | pediatric",
        "partial_data": {...} (optional)
    }
    
    Response: {
        "record": {...},
        "is_valid": bool,
        "warnings": [...]
    }
    """
    try:
        data = request.get_json()
        specialty = data.get("specialty", "").strip().lower()
        partial_data = data.get("partial_data", {})
        
        if not specialty:
            return fail("Missing specialty", 400)
        
        # Tạo form với schema validator
        result = create_ehr_form(specialty, partial_data)
        
        return success(result, "Form created successfully")
        
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        print(f"❌ Error creating form: {e}")
        return fail(f"Server error: {str(e)}", 500)


@ehr_form_bp.route("/form/validate", methods=["POST"])
@auth_required(roles=["doctor", "admin"])
def validate_form():
    """
    Validate form khám bệnh
    
    POST /api/ehr/form/validate
    Body: {
        "record": {...}
    }
    
    Response: {
        "is_valid": bool,
        "warnings": [...]
    }
    """
    try:
        data = request.get_json()
        record = data.get("record", {})
        
        if not record:
            return fail("Missing record data", 400)
        
        # Validate
        validator = EHRSchemaValidator()
        is_valid, warnings = validator.validate_record(record)
        
        return success({
            "is_valid": is_valid,
            "warnings": warnings
        }, "Validation complete")
        
    except Exception as e:
        print(f"❌ Error validating form: {e}")
        return fail(f"Server error: {str(e)}", 500)


@ehr_form_bp.route("/form/schema/<specialty>", methods=["GET"])
@auth_required(roles=["doctor", "admin", "patient"])
def get_schema(specialty):
    """
    Lấy schema mẫu theo chuyên khoa
    
    GET /api/ehr/form/schema/internal
    GET /api/ehr/form/schema/obstetric
    GET /api/ehr/form/schema/pediatric
    """
    try:
        specialty = specialty.strip().lower()
        
        if specialty not in EHRSchemaValidator.VALID_SPECIALTIES:
            return fail(f"Invalid specialty. Must be one of: {EHRSchemaValidator.VALID_SPECIALTIES}", 400)
        
        # Tạo empty schema
        validator = EHRSchemaValidator()
        record = validator.create_ehr_record(specialty, None)
        
        return success({
            "specialty": specialty,
            "schema": record,
            "description": f"Schema for {specialty} examination"
        }, "Schema retrieved")
        
    except Exception as e:
        print(f"❌ Error getting schema: {e}")
        return fail(f"Server error: {str(e)}", 500)


@ehr_form_bp.route("/form/save", methods=["POST"])
@auth_required(roles=["doctor", "admin"])
def save_form():
    """
    Lưu form khám bệnh vào EHR
    
    POST /api/ehr/form/save
    Body: {
        "patient_id": "...",
        "appointment_id": "..." (optional),
        "record": {...}
    }
    """
    try:
        user = get_current_user()
        data = request.get_json()
        
        patient_id = data.get("patient_id", "").strip()
        appointment_id = data.get("appointment_id", "").strip()
        record = data.get("record", {})
        
        if not patient_id:
            return fail("Missing patient_id", 400)
        
        if not record:
            return fail("Missing record data", 400)
        
        # Validate record
        validator = EHRSchemaValidator()
        is_valid, warnings = validator.validate_record(record)
        
        if not is_valid:
            return fail(f"Invalid record: {'; '.join(warnings)}", 400)
        
        # Fill placeholders
        record = validator.fill_placeholders(record)
        
        # Get doctor_id from doctors collection (not users._id)
        doctor_id = get_doctor_oid_from_user(user)
        
        # Prepare EHR document
        ehr_doc = {
            "patient_id": ObjectId(patient_id),
            "doctor_id": doctor_id,
            "record_type": record["specialty"],
            "visit_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            
            # Common exam
            "chief_complaint": record["common_exam"]["chief_complaint"],
            "vital_signs": record["common_exam"]["vital_signs"],
            "diagnosis": {
                "primary": record["common_exam"]["diagnosis"],
                "secondary": []
            },
            
            # Specialty exam
            "specialty_exam": record["specialty_exam"],
            
            # Prescriptions
            "prescription": record["prescriptions"],
            
            # Follow up
            "follow_up_notes": record["follow_up"],
            "follow_up_required": bool(record["follow_up"])
        }
        
        # Add appointment_id if provided
        if appointment_id:
            ehr_doc["appointment_id"] = ObjectId(appointment_id)
        
        # Insert to database
        result = mongo_db.ehr_records.insert_one(ehr_doc)
        
        # Update appointment if linked
        if appointment_id:
            mongo_db.appointments.update_one(
                {"_id": ObjectId(appointment_id)},
                {
                    "$set": {
                        "status": "completed",
                        "ehr_record_id": result.inserted_id,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return success({
            "ehr_id": str(result.inserted_id),
            "warnings": warnings
        }, "EHR saved successfully")
        
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        print(f"❌ Error saving form: {e}")
        import traceback
        traceback.print_exc()
        return fail(f"Server error: {str(e)}", 500)
