# backend/app/routes/consultation.py
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from datetime import datetime, timedelta
from app.middlewares.auth import auth_required, get_current_user
from app.extensions import mongo_db, socketio
from app.utils.responses import success, fail
from app.services.ehr_service import EHRService
from app.services.notification_service import NotificationService
from app.services.yolo_service import infer as yolo_infer
from app.utils.doctor_helpers import get_doctor_oid_from_user
from app.services.email_service import send_consultation_completed_email

consultation_bp = Blueprint("consultation", __name__)

# =============== CONSULTATION WORKFLOW ===============

@consultation_bp.route("/start", methods=["POST"])
@auth_required(roles=["doctor"])
def start_consultation():
    """
    Bắt đầu consultation workflow
    Body: {
        "appointment_id": str (required),
        "pre_visit_data": {
            "reason_for_visit": str,
            "symptoms_description": str,
            "symptom_onset": str,
            "symptom_severity": str (mild/moderate/severe),
            "previous_treatments": str,
            "medications_taken": str
        }
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    if not data.get("appointment_id"):
        return fail("Thiếu appointment_id", 400)
    
    try:
        # Get appointment
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(data["appointment_id"])})
        if not appointment:
            return fail("Appointment không tồn tại", 404)
        
        # ✅ FIX: Get doctor_id from doctors collection (not users._id)
        # Map users._id → doctors._id using helper function
        doctor_oid = get_doctor_oid_from_user(user)
        
        # Check authorization - chỉ doctor được assign
        apt_doctor_id = appointment["doctor_id"]
        
        print(f"🔍 Authorization check:")
        print(f"  - Appointment doctor_id: {apt_doctor_id} (doctors._id)")
        print(f"  - Current user_id: {user['user_id']} (users._id)")
        print(f"  - Mapped doctor_id: {doctor_oid} (doctors._id)")
        print(f"  - Match: {apt_doctor_id == doctor_oid}")
        
        if apt_doctor_id != doctor_oid:
            return fail(f"Bạn không phải bác sĩ của cuộc hẹn này", 403)
        
        # Check appointment status - accept booked, scheduled, confirmed
        valid_statuses = ["booked", "scheduled", "confirmed"]
        if appointment["status"] not in valid_statuses:
            return fail(f"Appointment phải ở trạng thái {valid_statuses} (hiện tại: {appointment['status']})", 400)
        
        # Get patient info
        patient = mongo_db.patients.find_one({"_id": appointment["patient_id"]})
        if not patient:
            return fail("Patient không tồn tại", 404)
        
        # Get doctor specialty from multiple sources
        doctor = mongo_db.users.find_one({"_id": ObjectId(user["user_id"])})
        
        # Try multiple fields for specialty
        specialty = (
            doctor.get("doctor_profile", {}).get("specialization") or 
            doctor.get("specialization") or 
            doctor.get("specialty") or 
            "internal_medicine"  # Default fallback
        )
        
        print(f"👨‍⚕️ Doctor {doctor.get('email')} specialty: {specialty}")
        
        # Use the doctor_id we already got from authorization check
        doctor_id = doctor_oid
        
        # Create consultation session
        consultation_doc = {
            "appointment_id": appointment["_id"],
            "patient_id": appointment["patient_id"],
            "doctor_id": doctor_id,
            "specialty": specialty,
            "status": "in_progress",  # in_progress, completed, cancelled
            "current_step": 1,  # 1-7
            "started_at": datetime.utcnow(),
            "completed_at": None,
            
            # Step data
            "pre_visit_data": data.get("pre_visit_data", {}),
            "vital_signs": {},
            "chief_complaint": "",
            "examination_data": {},
            "specialty_data": {},
            "soap_data": {
                "subjective": "",
                "objective": "",
                "assessment": "",
                "plan": ""
            },
            "prescription": [],
            "follow_up": {},
            
            # Metadata
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo_db.consultations.insert_one(consultation_doc)
        
        # Update appointment - keep status as "booked", just add consultation_id
        mongo_db.appointments.update_one(
            {"_id": appointment["_id"]},
            {
                "$set": {
                    "consultation_id": result.inserted_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Return consultation session
        consultation_doc["_id"] = str(result.inserted_id)
        consultation_doc["appointment_id"] = str(consultation_doc["appointment_id"])
        consultation_doc["patient_id"] = str(consultation_doc["patient_id"])
        consultation_doc["doctor_id"] = str(consultation_doc["doctor_id"])
        
        # Add patient info
        consultation_doc["patient_info"] = {
            "name": patient.get("full_name", ""),
            "dob": patient.get("date_of_birth", ""),
            "gender": patient.get("gender", ""),
            "phone": patient.get("phone", ""),
            "address": patient.get("address", ""),
            "medical_history": patient.get("medical_history", ""),
            "allergies_medications": patient.get("allergies_medications", ""),
            "current_medications": patient.get("current_medications", ""),
            "chronic_conditions": patient.get("chronic_conditions", "")
        }
        
        # ✅ Emit socket event for consultation started
        try:
            socketio.emit("consultation_updated", {
                "consultation_id": str(result.inserted_id),
                "appointment_id": str(appointment["_id"]),
                "patient_id": str(appointment["patient_id"]),
                "doctor_id": str(consultation_doc["doctor_id"]),
                "status": "in_progress",
                "current_step": 1,
                "started_at": datetime.utcnow().isoformat()
            })
            print("✅ Consultation started socket event emitted")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        return success(consultation_doc, message="Đã bắt đầu consultation", status_code=201)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@consultation_bp.route("/<consultation_id>", methods=["GET"])
@auth_required(roles=["doctor"])
def get_consultation(consultation_id):
    """Lấy thông tin consultation session"""
    user = get_current_user()
    
    try:
        consultation = mongo_db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            return fail("Consultation không tồn tại", 404)
        
        # Check authorization
        doctor_oid = get_doctor_oid_from_user(user)
        if consultation["doctor_id"] != doctor_oid:
            return fail("Bạn không có quyền xem consultation này", 403)
        
        # Convert ObjectIds
        consultation["_id"] = str(consultation["_id"])
        consultation["appointment_id"] = str(consultation["appointment_id"])
        consultation["patient_id"] = str(consultation["patient_id"])
        consultation["doctor_id"] = str(consultation["doctor_id"])
        
        # Get patient info
        patient = mongo_db.patients.find_one({"_id": ObjectId(str(consultation["patient_id"]))})
        if patient:
            consultation["patient_info"] = {
                "name": patient.get("full_name", ""),
                "dob": patient.get("date_of_birth", ""),
                "gender": patient.get("gender", ""),
                "phone": patient.get("phone", ""),
                "address": patient.get("address", ""),
                "medical_history": patient.get("medical_history", ""),
                "allergies_medications": patient.get("allergies_medications", ""),
                "allergies_food": patient.get("allergies_food", ""),
                "current_medications": patient.get("current_medications", ""),
                "chronic_conditions": patient.get("chronic_conditions", "")
            }
        
        return success(consultation)
    
    except Exception as e:
        return fail(str(e), 500)


@consultation_bp.route("/<consultation_id>/step", methods=["PUT"])
@auth_required(roles=["doctor"])
def update_step(consultation_id):
    """
    Cập nhật step hiện tại
    Body: {
        "step": int (1-7),
        "data": {
            // Step-specific data
        }
    }
    
    Steps:
    1. Pre-visit Intake (administrative + symptoms)
    2. Vital Signs
    3. Chief Complaint & History
    4. Physical Examination
    5. Specialty-specific Exam
    6. Assessment & Plan (SOAP)
    7. Prescription & Follow-up
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    if "step" not in data:
        return fail("Thiếu field 'step'", 400)
    
    step = data["step"]
    if step not in range(1, 8):
        return fail("Step phải từ 1-7", 400)
    
    try:
        consultation = mongo_db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            return fail("Consultation không tồn tại", 404)
        
        # Check authorization
        doctor_oid = get_doctor_oid_from_user(user)
        if consultation["doctor_id"] != doctor_oid:
            return fail("Bạn không có quyền cập nhật consultation này", 403)
        
        # Check status
        if consultation["status"] != "in_progress":
            return fail("Consultation không ở trạng thái in_progress", 400)
        
        # Get specialty
        specialty = consultation.get("specialty", "general_medicine")
        
        # Validate and update based on step
        update_data = {"updated_at": datetime.utcnow(), "current_step": step}
        step_data = data.get("data", {})
        
        if step == 1:
            # Pre-visit intake
            update_data["pre_visit_data"] = step_data
        
        elif step == 2:
            # Vital signs - VALIDATE
            validate_vital_signs(step_data)
            update_data["vital_signs"] = step_data
        
        elif step == 3:
            # Chief complaint
            if not step_data.get("chief_complaint"):
                return fail("Thiếu chief_complaint", 400)
            update_data["chief_complaint"] = step_data.get("chief_complaint", "")
            update_data["history_present_illness"] = step_data.get("history_present_illness", "")
            update_data["review_of_systems"] = step_data.get("review_of_systems", {})
        
        elif step == 4:
            # Physical examination
            update_data["examination_data"] = step_data
        
        elif step == 5:
            # Specialty-specific exam
            validated_specialty_data = validate_specialty_data(specialty, step_data)
            update_data["specialty_data"] = validated_specialty_data
        
        elif step == 6:
            # SOAP Assessment
            if not step_data.get("assessment") or not step_data.get("plan"):
                return fail("Thiếu assessment hoặc plan", 400)
            update_data["soap_data"] = {
                "subjective": step_data.get("subjective", ""),
                "objective": step_data.get("objective", ""),
                "assessment": step_data.get("assessment", ""),
                "plan": step_data.get("plan", "")
            }
        
        elif step == 7:
            # Prescription & follow-up
            print(f"   📋 Processing step 7: Prescription & Follow-up")
            print(f"   prescription data:", step_data.get("prescription"))
            print(f"   follow_up data:", step_data.get("follow_up"))
            
            if "prescription" in step_data:
                print(f"   ✅ Validating prescription...")
                try:
                    validate_prescription(step_data["prescription"])
                    update_data["prescription"] = step_data["prescription"]
                    print(f"   ✅ Prescription valid")
                except Exception as e:
                    print(f"   ❌ Prescription validation failed: {e}")
                    raise
            
            if "follow_up" in step_data:
                update_data["follow_up"] = step_data["follow_up"]
                print(f"   ✅ Follow-up data saved")
        
        # Update consultation
        mongo_db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {"$set": update_data}
        )
        
        # ✅ Emit socket event for consultation step update
        try:
            socketio.emit("consultation_updated", {
                "consultation_id": consultation_id,
                "appointment_id": str(consultation["appointment_id"]),
                "patient_id": str(consultation["patient_id"]),
                "doctor_id": str(consultation["doctor_id"]),
                "current_step": step,
                "updated_at": datetime.utcnow().isoformat()
            })
            print(f"✅ Consultation step {step} updated socket event emitted")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        return success({"step": step, "updated": True})
    
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@consultation_bp.route("/save", methods=["POST"])
@auth_required(roles=["doctor"])
def save_consultation():
    """
    Lưu consultation (draft) - Simplified version
    Body: {
        "consultation_id": str (optional, nếu đã có),
        "appointment_id": str (required nếu chưa có consultation_id),
        "vital_signs": {...},
        "chief_complaint": str,
        "history_present_illness": str,
        "examination_notes": str,
        "diagnosis_primary": str,
        "diagnosis_icd10": str,
        "diagnosis_notes": str,
        "treatment_plan": str,
        "medications": [...],
        "follow_up_required": bool,
        "follow_up_date": str,
        "follow_up_notes": str,
        "doctor_notes": str
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    consultation_id = data.get("consultation_id")
    appointment_id = data.get("appointment_id")
    
    if not consultation_id and not appointment_id:
        return fail("Thiếu consultation_id hoặc appointment_id", 400)
    
    try:
        doctor_oid = get_doctor_oid_from_user(user)
        
        # If consultation_id provided, update existing
        if consultation_id:
            consultation = mongo_db.consultations.find_one({"_id": ObjectId(consultation_id)})
            if not consultation:
                return fail("Consultation không tồn tại", 404)
            
            # Check authorization
            if consultation["doctor_id"] != doctor_oid:
                return fail("Bạn không có quyền cập nhật consultation này", 403)
            
            # Update consultation
            update_data = {
                "vital_signs": data.get("vital_signs", {}),
                "chief_complaint": data.get("chief_complaint", ""),
                "history_present_illness": data.get("history_present_illness", ""),
                "examination_data": {
                    "general_appearance": data.get("general_appearance", ""),
                    "examination_notes": data.get("examination_notes", "")
                },
                "diagnosis": {
                    "primary": data.get("diagnosis_primary", ""),
                    "icd10": data.get("diagnosis_icd10", ""),
                    "notes": data.get("diagnosis_notes", "")
                },
                "treatment_plan": data.get("treatment_plan", ""),
                "prescription": data.get("medications", []),
                "follow_up": {
                    "required": data.get("follow_up_required", False),
                    "date": data.get("follow_up_date", ""),
                    "notes": data.get("follow_up_notes", "")
                },
                "doctor_notes": data.get("doctor_notes", ""),
                "status": data.get("status", "in_progress"),
                "updated_at": datetime.utcnow()
            }
            
            mongo_db.consultations.update_one(
                {"_id": ObjectId(consultation_id)},
                {"$set": update_data}
            )
            
            return success({
                "consultation_id": consultation_id,
                "message": "Đã lưu bản nháp"
            })
        
        # If no consultation_id, start new consultation
        else:
            appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
            if not appointment:
                return fail("Appointment không tồn tại", 404)
            
            # Check authorization
            if appointment["doctor_id"] != doctor_oid:
                return fail("Bạn không phải bác sĩ của cuộc hẹn này", 403)
            
            # Create new consultation
            consultation_doc = {
                "appointment_id": appointment["_id"],
                "patient_id": appointment["patient_id"],
                "doctor_id": doctor_oid,
                "specialty": data.get("specialty", "general_medicine"),
                "status": "in_progress",
                "vital_signs": data.get("vital_signs", {}),
                "chief_complaint": data.get("chief_complaint", ""),
                "history_present_illness": data.get("history_present_illness", ""),
                "examination_data": {
                    "general_appearance": data.get("general_appearance", ""),
                    "examination_notes": data.get("examination_notes", "")
                },
                "diagnosis": {
                    "primary": data.get("diagnosis_primary", ""),
                    "icd10": data.get("diagnosis_icd10", ""),
                    "notes": data.get("diagnosis_notes", "")
                },
                "treatment_plan": data.get("treatment_plan", ""),
                "prescription": data.get("medications", []),
                "follow_up": {
                    "required": data.get("follow_up_required", False),
                    "date": data.get("follow_up_date", ""),
                    "notes": data.get("follow_up_notes", "")
                },
                "doctor_notes": data.get("doctor_notes", ""),
                "started_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = mongo_db.consultations.insert_one(consultation_doc)
            new_id = str(result.inserted_id)
            
            # Update appointment with consultation_id
            mongo_db.appointments.update_one(
                {"_id": appointment["_id"]},
                {"$set": {"consultation_id": result.inserted_id, "updated_at": datetime.utcnow()}}
            )
            
            return success({
                "consultation_id": new_id,
                "message": "Đã tạo và lưu consultation"
            })
    
    except Exception as e:
        print(f"Error saving consultation: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@consultation_bp.route("/complete", methods=["POST"])
@auth_required(roles=["doctor"])
def complete_consultation_simple():
    """
    Hoàn thành consultation - Simplified version
    Body: {
        "consultation_id": str (optional),
        "appointment_id": str (required),
        "vital_signs": {...},
        "chief_complaint": str (required),
        "history_present_illness": str,
        "examination_notes": str,
        "diagnosis_primary": str (required),
        "diagnosis_icd10": str,
        "diagnosis_notes": str,
        "treatment_plan": str,
        "medications": [...],
        "follow_up_required": bool,
        "follow_up_date": str,
        "follow_up_notes": str,
        "doctor_notes": str
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    consultation_id = data.get("consultation_id")
    appointment_id = data.get("appointment_id")
    
    if not appointment_id:
        return fail("Thiếu appointment_id", 400)
    
    # Validate required fields
    if not data.get("chief_complaint"):
        return fail("Thiếu triệu chứng chính (chief_complaint)", 400)
    if not data.get("diagnosis_primary"):
        return fail("Thiếu chẩn đoán chính (diagnosis_primary)", 400)
    
    try:
        doctor_oid = get_doctor_oid_from_user(user)
        
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            return fail("Appointment không tồn tại", 404)
        
        # Check authorization
        if appointment["doctor_id"] != doctor_oid:
            return fail("Bạn không phải bác sĩ của cuộc hẹn này", 403)
        
        # Prepare consultation data
        consultation_data = {
            "appointment_id": appointment["_id"],
            "patient_id": appointment["patient_id"],
            "doctor_id": doctor_oid,
            "specialty": data.get("specialty", "general_medicine"),
            "status": "completed",
            "vital_signs": data.get("vital_signs", {}),
            "chief_complaint": data.get("chief_complaint", ""),
            "history_present_illness": data.get("history_present_illness", ""),
            "examination_data": {
                "general_appearance": data.get("general_appearance", ""),
                "examination_notes": data.get("examination_notes", "")
            },
            "diagnosis": {
                "primary": data.get("diagnosis_primary", ""),
                "icd10": data.get("diagnosis_icd10", ""),
                "notes": data.get("diagnosis_notes", "")
            },
            "treatment_plan": data.get("treatment_plan", ""),
            "prescription": data.get("medications", []),
            "follow_up": {
                "required": data.get("follow_up_required", False),
                "date": data.get("follow_up_date", ""),
                "notes": data.get("follow_up_notes", "")
            },
            "doctor_notes": data.get("doctor_notes", ""),
            "completed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Update or create consultation
        if consultation_id:
            mongo_db.consultations.update_one(
                {"_id": ObjectId(consultation_id)},
                {"$set": consultation_data}
            )
            final_consultation_id = consultation_id
        else:
            consultation_data["started_at"] = datetime.utcnow()
            consultation_data["created_at"] = datetime.utcnow()
            result = mongo_db.consultations.insert_one(consultation_data)
            final_consultation_id = str(result.inserted_id)
        
        # Update appointment status to completed
        mongo_db.appointments.update_one(
            {"_id": appointment["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "consultation_id": ObjectId(final_consultation_id),
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Create EHR record
        try:
            ehr_data = {
                "patient_id": appointment["patient_id"],
                "doctor_id": doctor_oid,
                "appointment_id": appointment["_id"],
                "consultation_id": ObjectId(final_consultation_id),
                "visit_date": appointment.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                "visit_type": "consultation",
                "chief_complaint": data.get("chief_complaint", ""),
                "diagnosis": data.get("diagnosis_primary", ""),
                "treatment": data.get("treatment_plan", ""),
                "medications": data.get("medications", []),
                "notes": data.get("doctor_notes", ""),
                "created_at": datetime.utcnow()
            }
            mongo_db.ehr_records.insert_one(ehr_data)
        except Exception as ehr_err:
            print(f"⚠️ Failed to create EHR record: {ehr_err}")
        
        # Send notifications to patient
        try:
            patient = mongo_db.patients.find_one({"_id": appointment["patient_id"]})
            doctor = mongo_db.doctors.find_one({"_id": doctor_oid})
            doctor_name = doctor.get("full_name", "Bác sĩ") if doctor else "Bác sĩ"
            
            # 1. Notification: Consultation completed
            NotificationService.send_consultation_completed(
                patient_id=appointment["patient_id"],
                doctor_name=doctor_name,
                appointment_date=appointment.get("date", "")
            )
            
            # 2. Notification: Mời đánh giá bác sĩ
            NotificationService.send_rating_request(
                patient_id=appointment["patient_id"],
                doctor_name=doctor_name,
                appointment_id=str(appointment["_id"]),
                appointment_date=appointment.get("date", "")
            )
            
        except Exception as notif_err:
            print(f"⚠️ Failed to send notifications: {notif_err}")
        
        # ✅ Send consultation completed email to patient
        print(f"📧 [complete_consultation_simple] ========== STARTING EMAIL PROCESS ==========")
        import sys
        sys.stdout.flush()
        
        try:
            if not patient:
                print(f"⚠️ [complete_consultation_simple] Patient not found for email sending")
            else:
                patient_email = patient.get("email")
                patient_name = patient.get("full_name") or patient.get("name", "Bệnh nhân")
                
                print(f"📧 [complete_consultation_simple] Patient email: {patient_email}, Full name: {patient_name}")
                
                if not patient_email:
                    print(f"⚠️ [complete_consultation_simple] Patient {patient_name} has no email address")
                else:
                    # Get appointment date
                    appointment_date = ""
                    apt_date = appointment.get("date") or appointment.get("appointment_date")
                    if apt_date:
                        if isinstance(apt_date, str):
                            appointment_date = apt_date
                        else:
                            appointment_date = apt_date.strftime("%Y-%m-%d") if hasattr(apt_date, 'strftime') else str(apt_date)
                    
                    # Get diagnosis and prescription
                    diagnosis = data.get("diagnosis_primary", "")
                    prescription = data.get("medications", [])
                    specialty = data.get("specialty", "general_medicine")
                    
                    print(f"📧 [complete_consultation_simple] Doctor: {doctor_name}, Specialty: {specialty}")
                    print(f"📧 [complete_consultation_simple] Appointment date: {appointment_date}")
                    print(f"📧 [complete_consultation_simple] Diagnosis: {diagnosis}")
                    print(f"📧 [complete_consultation_simple] Prescription items: {len(prescription) if prescription else 0}")
                    
                    # Prepare appointment data for email
                    appointment_data = {
                        "doctor_name": doctor_name,
                        "specialty": specialty,
                        "date": appointment_date,
                        "diagnosis": diagnosis,
                        "prescription": prescription
                    }
                    
                    print(f"📧 [complete_consultation_simple] Sending completion email to {patient_email}")
                    print(f"📧 [complete_consultation_simple] Appointment data: {appointment_data}")
                    
                    email_sent = send_consultation_completed_email(
                        to=patient_email,
                        full_name=patient_name,
                        appointment_data=appointment_data,
                        patient_id=str(appointment["patient_id"]),
                        appointment_id=str(appointment["_id"]),
                        ehr_record_id=None
                    )
                    
                    if email_sent:
                        print(f"✅ [complete_consultation_simple] Completion email sent successfully to {patient_email}")
                    else:
                        print(f"❌ [complete_consultation_simple] Failed to send completion email to {patient_email}")
        except Exception as email_error:
            import traceback
            print(f"❌ [complete_consultation_simple] Email sending error (non-blocking): {email_error}")
            traceback.print_exc()
        
        return success({
            "consultation_id": final_consultation_id,
            "appointment_id": str(appointment["_id"]),
            "message": "Đã hoàn thành phiên khám"
        })
    
    except Exception as e:
        print(f"Error completing consultation: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@consultation_bp.route("/<consultation_id>/complete", methods=["POST"])
@auth_required(roles=["doctor"])
def complete_consultation(consultation_id):
    """
    Hoàn thành consultation và tạo EHR record (OLD VERSION - deprecated)
    Body: {
        "send_notification": bool (default: true),
        "schedule_follow_up": bool (default: false)
    }
    """
    print(f"\n{'='*60}")
    print(f"🏁 COMPLETE CONSULTATION REQUEST")
    print(f"   consultation_id: {consultation_id}")
    
    user = get_current_user()
    data = request.get_json() or {}
    
    print(f"   user_id: {user['user_id']}")
    print(f"   role: {user.get('role')}")
    print(f"   data: {data}")
    
    try:
        consultation = mongo_db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            print(f"   ❌ Consultation not found")
            print(f"{'='*60}\n")
            return fail("Consultation không tồn tại", 404)
        
        print(f"   ✅ Found consultation: {consultation.get('status')}")
        
        # Check authorization
        doctor_oid = get_doctor_oid_from_user(user)
        if consultation["doctor_id"] != doctor_oid:
            print(f"   ❌ Authorization failed")
            print(f"{'='*60}\n")
            return fail("Bạn không có quyền hoàn thành consultation này", 403)
        
        print(f"   ✅ Authorization passed")
        
        # Check status
        if consultation["status"] != "in_progress":
            return fail("Consultation không ở trạng thái in_progress", 400)
        
        # Validate required data - make it more flexible
        missing_fields = []
        
        if not consultation.get("vital_signs") or not consultation.get("vital_signs", {}).get("blood_pressure"):
            missing_fields.append("Vital Signs (blood_pressure)")
        if not consultation.get("chief_complaint"):
            missing_fields.append("Chief Complaint")
        if not consultation.get("soap_data", {}).get("assessment") and not consultation.get("soap_data", {}).get("plan"):
            missing_fields.append("SOAP Assessment hoặc Plan")
        
        if missing_fields:
            return fail(f"Chưa nhập đủ thông tin bắt buộc: {', '.join(missing_fields)}", 400)
        
        # Build SOAP notes for EHR
        soap = consultation.get("soap_data", {})
        pre_visit = consultation.get("pre_visit_data", {})
        
        # Subjective (triệu chứng từ bệnh nhân)
        subjective_text = f"""
CHIEF COMPLAINT: {consultation.get('chief_complaint', '')}

HISTORY OF PRESENT ILLNESS:
{consultation.get('history_present_illness', '')}

PATIENT REPORTED SYMPTOMS:
- Reason: {pre_visit.get('reason_for_visit', '')}
- Description: {pre_visit.get('symptoms_description', '')}
- Onset: {pre_visit.get('symptom_onset', '')}
- Severity: {pre_visit.get('symptom_severity', '')}
- Previous treatments: {pre_visit.get('previous_treatments', '')}

ADDITIONAL SUBJECTIVE NOTES:
{soap.get('subjective', '')}
        """.strip()
        
        # Objective (dữ liệu khách quan từ bác sĩ)
        vitals = consultation.get("vital_signs", {})
        exam = consultation.get("examination_data", {})
        specialty_data = consultation.get("specialty_data", {})
        
        objective_text = f"""
VITAL SIGNS:
- BP: {vitals.get('blood_pressure', 'N/A')}
- HR: {vitals.get('heart_rate', 'N/A')} bpm
- RR: {vitals.get('respiratory_rate', 'N/A')} /min
- Temp: {vitals.get('temperature', 'N/A')} °C
- SpO2: {vitals.get('oxygen_saturation', 'N/A')} %
- Weight: {vitals.get('weight', 'N/A')} kg
- Height: {vitals.get('height', 'N/A')} cm

PHYSICAL EXAMINATION:
{exam.get('general_appearance', '')}
{exam.get('examination_notes', '')}

SPECIALTY EXAMINATION:
{format_specialty_data(consultation.get('specialty', ''), specialty_data)}

ADDITIONAL OBJECTIVE NOTES:
{soap.get('objective', '')}
        """.strip()
        
        # Create EHR record
        ehr_data = {
            "patient_id": str(consultation["patient_id"]),
            "doctor_id": str(consultation["doctor_id"]),
            "appointment_id": str(consultation["appointment_id"]),
            "record_type": "consultation",
            
            # Clinical data
            "vital_signs": vitals,
            "chief_complaint": consultation.get("chief_complaint", ""),
            
            "diagnosis": {
                "primary": soap.get("assessment", ""),
                "differential": [],
                "icd_codes": []
            },
            
            "symptoms": [pre_visit.get("symptoms_description", "")],
            
            "prescription": consultation.get("prescription", []),
            
            "doctor_notes": f"""
=== SOAP NOTE ===

SUBJECTIVE:
{subjective_text}

OBJECTIVE:
{objective_text}

ASSESSMENT:
{soap.get('assessment', '')}

PLAN:
{soap.get('plan', '')}
            """.strip(),
            
            "follow_up_required": consultation.get("follow_up", {}).get("required", False),
            "follow_up_date": consultation.get("follow_up", {}).get("date"),
            "follow_up_notes": consultation.get("follow_up", {}).get("notes", ""),
            
            # Specialty-specific data
            "specialty_exam": specialty_data,
            
            # Attachments (X-ray results, etc.)
            "attachments": specialty_data.get("attachments", [])
        }
        
        # Create EHR via service (will auto-update appointment to completed)
        ehr_record = EHRService.create_record(
            data=ehr_data,
            created_by_id=user["user_id"]
        )
        
        # Update consultation status
        mongo_db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "ehr_record_id": ObjectId(ehr_record["_id"]),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # ✅ Emit socket event for consultation completion
        try:
            socketio.emit("consultation_updated", {
                "consultation_id": consultation_id,
                "appointment_id": str(consultation["appointment_id"]),
                "patient_id": str(consultation["patient_id"]),
                "doctor_id": str(consultation["doctor_id"]),
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
                "ehr_id": str(ehr_record["_id"])
            })
            print("✅ Consultation completed socket event emitted")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        # Send notification to patient
        if data.get("send_notification", True):
            try:
                NotificationService.send_consultation_completed(
                    patient_id=str(consultation["patient_id"]),
                    doctor_name=user.get("name", "Bác sĩ"),
                    appointment_date=consultation.get("started_at")
                )
            except Exception as e:
                print(f"⚠️ Failed to send notification: {e}")
        
        # ✅ Send consultation completed email to patient
        try:
            # Get patient information
            patient = mongo_db.patients.find_one({"_id": consultation["patient_id"]})
            if patient:
                patient_email = patient.get("email")
                patient_name = patient.get("full_name") or patient.get("name", "Bệnh nhân")
                
                if patient_email:
                    # Get appointment for date
                    appointment = mongo_db.appointments.find_one({"_id": consultation["appointment_id"]})
                    appointment_date = ""
                    if appointment:
                        apt_date = appointment.get("date") or appointment.get("appointment_date")
                        if apt_date:
                            if isinstance(apt_date, str):
                                appointment_date = apt_date
                            else:
                                appointment_date = apt_date.strftime("%Y-%m-%d") if hasattr(apt_date, 'strftime') else str(apt_date)
                    
                    # Get diagnosis and prescription from consultation or ehr_record
                    diagnosis = ""
                    prescription = []
                    
                    # Try to get from SOAP data first
                    soap_data = consultation.get("soap_data", {})
                    if soap_data.get("assessment"):
                        diagnosis = soap_data.get("assessment", "")
                    
                    # Try to get from diagnosis field
                    if not diagnosis and consultation.get("diagnosis"):
                        diag_obj = consultation.get("diagnosis", {})
                        if isinstance(diag_obj, dict):
                            diagnosis = diag_obj.get("primary", "") or diag_obj.get("notes", "")
                        else:
                            diagnosis = str(diag_obj)
                    
                    # Get prescription
                    prescription = consultation.get("prescription", [])
                    if not prescription and ehr_record:
                        prescription = ehr_record.get("prescription", [])
                    
                    # Get doctor name and specialty
                    doctor_name = user.get("name") or user.get("full_name") or "Bác sĩ"
                    specialty = consultation.get("specialty", "general_medicine")
                    
                    # Prepare appointment data for email
                    appointment_data = {
                        "doctor_name": doctor_name,
                        "specialty": specialty,
                        "date": appointment_date,
                        "diagnosis": diagnosis,
                        "prescription": prescription
                    }
                    
                    print(f"📧 [complete_consultation] Preparing to send completion email to {patient_email}")
                    email_sent = send_consultation_completed_email(
                        to=patient_email,
                        full_name=patient_name,
                        appointment_data=appointment_data,
                        patient_id=str(consultation["patient_id"]),
                        appointment_id=str(consultation["appointment_id"]),
                        ehr_record_id=ehr_record.get("_id") if ehr_record else None
                    )
                    
                    if email_sent:
                        print(f"✅ [complete_consultation] Completion email sent to {patient_email}")
                    else:
                        print(f"⚠️ [complete_consultation] Failed to send completion email to {patient_email}")
                else:
                    print(f"⚠️ [complete_consultation] Patient {patient_name} has no email address")
            else:
                print(f"⚠️ [complete_consultation] Patient not found for email sending")
        except Exception as email_error:
            import traceback
            print(f"❌ [complete_consultation] Email sending error (non-blocking): {email_error}")
            traceback.print_exc()
        
        # Schedule follow-up appointment if needed
        if data.get("schedule_follow_up", False) and consultation.get("follow_up", {}).get("required"):
            try:
                schedule_follow_up_appointment(
                    patient_id=str(consultation["patient_id"]),
                    doctor_id=str(consultation["doctor_id"]),
                    follow_up_date=consultation.get("follow_up", {}).get("date"),
                    notes=consultation.get("follow_up", {}).get("notes", "")
                )
            except Exception as e:
                print(f"⚠️ Failed to schedule follow-up: {e}")
        
        return success({
            "consultation_id": consultation_id,
            "ehr_record_id": ehr_record["_id"],
            "status": "completed"
        }, message="Đã hoàn thành consultation và tạo EHR record")
    
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


# =============== XRAY ANALYSIS (for general_medicine) ===============

@consultation_bp.route("/<consultation_id>/analyze-xray", methods=["POST"])
@auth_required(roles=["doctor"])
def analyze_xray(consultation_id):
    """
    Phân tích X-ray cho general medicine
    Body: {
        "file_id": str (file đã upload)
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    if not data.get("file_id"):
        return fail("Thiếu file_id", 400)
    
    try:
        consultation = mongo_db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            return fail("Consultation không tồn tại", 404)
        
        # Check authorization
        doctor_oid = get_doctor_oid_from_user(user)
        if consultation["doctor_id"] != doctor_oid:
            return fail("Bạn không có quyền", 403)
        
        # Get file info
        file_doc = mongo_db.files.find_one({"_id": ObjectId(data["file_id"])})
        if not file_doc:
            return fail("File không tồn tại", 404)
        
        # Analyze X-ray using AI (YOLO model)
        analysis_result = yolo_infer(file_doc["file_path"])
        
        # Update specialty_data with X-ray result
        mongo_db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {
                "$set": {
                    "specialty_data.xray_analysis": {
                        "file_id": data["file_id"],
                        "file_path": file_doc["file_path"],
                        "ai_prediction": analysis_result.get("prediction", ""),
                        "confidence": analysis_result.get("confidence", 0),
                        "analyzed_at": datetime.utcnow()
                    },
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return success(analysis_result)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


# =============== HELPER FUNCTIONS ===============

def validate_vital_signs(data):
    """Validate vital signs data"""
    required = ["blood_pressure", "heart_rate", "temperature"]
    for field in required:
        if field not in data or not data[field]:
            raise ValueError(f"Thiếu vital sign: {field}")
    
    # Validate ranges
    hr = int(data.get("heart_rate", 0))
    if hr < 40 or hr > 200:
        raise ValueError("Heart rate không hợp lệ (40-200 bpm)")
    
    temp = float(data.get("temperature", 0))
    if temp < 35 or temp > 42:
        raise ValueError("Temperature không hợp lệ (35-42°C)")


def validate_specialty_data(specialty, data):
    """Validate specialty-specific examination data"""
    if specialty == "obstetrics":
        # Sản phụ khoa - required pregnancy data
        if "pregnancy_week" not in data:
            raise ValueError("Thiếu pregnancy_week cho Sản phụ khoa")
        
        week = int(data.get("pregnancy_week", 0))
        if week < 0 or week > 42:
            raise ValueError("Tuần thai không hợp lệ (0-42)")
    
    elif specialty == "pediatrics":
        # Nhi khoa - required growth data
        if "age_months" not in data:
            raise ValueError("Thiếu age_months cho Nhi khoa")
        
        age = int(data.get("age_months", 0))
        if age < 0 or age > 216:  # 0-18 years
            raise ValueError("Tuổi không hợp lệ (0-216 tháng)")
    
    return data


def validate_prescription(prescription):
    """Validate prescription array"""
    if not isinstance(prescription, list):
        raise ValueError("Prescription phải là array")
    
    for rx in prescription:
        required = ["drug_name", "dosage", "frequency", "duration"]
        for field in required:
            if field not in rx or not rx[field]:
                raise ValueError(f"Prescription thiếu field: {field}")


def format_specialty_data(specialty, data):
    """Format specialty data for SOAP note"""
    if specialty == "obstetrics":
        return f"""
OBSTETRIC EXAMINATION:
- Tuần thai: {data.get('pregnancy_week', 'N/A')}
- Chiều cao tử cung: {data.get('fundal_height', 'N/A')} cm
- Nhịp tim thai: {data.get('fetal_heart_rate', 'N/A')} bpm
- Vị trí thai: {data.get('fetal_position', 'N/A')}
- Tiểu đường thai kỳ: {data.get('gestational_diabetes', 'Không')}
- Tiền sản giật: {data.get('preeclampsia_risk', 'Không')}
        """.strip()
    
    elif specialty == "pediatrics":
        return f"""
PEDIATRIC EXAMINATION:
- Tuổi: {data.get('age_months', 'N/A')} tháng
- Cân nặng: {data.get('weight_percentile', 'N/A')} percentile
- Chiều cao: {data.get('height_percentile', 'N/A')} percentile
- BMI: {data.get('bmi_percentile', 'N/A')} percentile
- Phát triển: {data.get('developmental_milestones', 'Bình thường')}
- Tiêm chủng: {data.get('vaccination_status', 'Đầy đủ')}
        """.strip()
    
    elif specialty == "general_medicine":
        xray = data.get("xray_analysis", {})
        if xray:
            return f"""
GENERAL MEDICINE EXAMINATION:
- X-quang phổi: {xray.get('ai_prediction', 'N/A')}
- Độ tin cậy AI: {xray.get('confidence', 0)*100:.1f}%
- Phân tích: {xray.get('notes', '')}
            """.strip()
        return "No specific examination data"
    
    return ""


def schedule_follow_up_appointment(patient_id, doctor_id, follow_up_date, notes):
    """Tự động tạo appointment follow-up"""
    if not follow_up_date:
        return
    
    # Parse date
    if isinstance(follow_up_date, str):
        follow_up_date = datetime.fromisoformat(follow_up_date.replace("Z", "+00:00"))
    
    # Create appointment
    appointment_doc = {
        "patient_id": ObjectId(patient_id),
        "doctor_id": ObjectId(doctor_id),
        "appointment_date": follow_up_date,
        "appointment_time": follow_up_date.strftime("%H:%M"),
        "status": "pending",  # Chờ patient xác nhận
        "reason": f"Tái khám: {notes}",
        "is_follow_up": True,
        "created_at": datetime.utcnow()
    }
    
    mongo_db.appointments.insert_one(appointment_doc)
