# backend/app/routes/ehr.py
from flask import Blueprint, request, jsonify, send_file
from bson import ObjectId
from datetime import datetime
from io import BytesIO
import os
from werkzeug.utils import secure_filename
from app.middlewares.auth import auth_required, get_current_user
from app.services.ehr_service import EHRService, log_ehr_access, clean_for_json
from app.services.pdf_service import EHRPDFService
from app.extensions import mongo_db
from app.utils.responses import success, fail
from app.utils.doctor_helpers import get_doctor_oid_from_user

ehr_bp = Blueprint("ehr", __name__)

# =============== EHR RECORDS API ===============
class EHRModel:
    @staticmethod
    def validate_ehr_record(data: dict):
        """Raise ValueError nếu thiếu field bắt buộc."""
        if not isinstance(data, dict):
            raise ValueError("data phải là dict")

        # bắt buộc tối thiểu: patient_id, doctor_id
        missing = []
        for k in ("patient_id", "doctor_id"):
            if not data.get(k):
                missing.append(k)
        if missing:
            raise ValueError(f"Thiếu trường bắt buộc: {', '.join(missing)}")

        # kiểm tra ObjectId hợp lệ
        try:
            ObjectId(data["patient_id"])
            ObjectId(data["doctor_id"])
        except Exception:
            raise ValueError("patient_id/doctor_id không phải ObjectId hợp lệ")

        # (tuỳ chọn) kiểm tra vital_signs, prescription… nếu muốn chặt hơn

    @staticmethod
    def get_next_version(patient_id: str) -> int:
        """Lấy version kế tiếp cho 1 bệnh nhân (append-only)."""
        try:
            pid = ObjectId(patient_id)
        except Exception:
            # ehr_service.py sẽ catch lỗi này
            raise ValueError("Invalid patient_id")

        latest = mongo_db.ehr_records.find_one(
            {"patient_id": pid},
            sort=[("version", -1)],
            projection={"version": 1}
        )
        return (latest.get("version", 0) + 1) if latest else 1

    @staticmethod
    def get_allowed_fields_by_role(role: str) -> dict:
        """
        Trả về projection cho Mongo tuỳ theo role:
        - patient: ẩn internal_notes
        - doctor/admin: xem đầy đủ
        """
        role = (role or "").lower()
        base = {
            "patient_id": 1, "doctor_id": 1, "appointment_id": 1,
            "version": 1, "created_by": 1, "created_at": 1,
            "consent_snapshot": 1, "record_type": 1,
            "vital_signs": 1, "chief_complaint": 1,
            "diagnosis": 1, "symptoms": 1,
            "prescription": 1, "procedures": 1,
            "lab_results": 1, "attachments": 1,
            "doctor_notes": 1, "follow_up_required": 1,
            "follow_up_date": 1, "follow_up_notes": 1,
        }
        if role in ("doctor", "admin"):
            base["internal_notes"] = 1
        # patient thì không expose internal_notes
        return base
    
@ehr_bp.route("/patient/records", methods=["GET"])
@auth_required(roles=["patient"])
def get_patient_records():
    """
    Lấy danh sách records của patient đang đăng nhập
    Query params:
        - type (optional: consultation, checkup, emergency...)
        - doctor_id (optional)
        - start_date, end_date (optional)
        - search (optional)
        - page, limit
    """
    user = get_current_user()
    
    # ✅ FIX: Xác định patient_id đúng
    # Nếu user login bằng patients collection → user_id chính là patients._id
    # Nếu user login bằng users collection → cần tìm patients._id từ users.patient_id
    user_id = user["user_id"]
    patient_id = None
    
    print(f"\n{'='*60}")
    print(f"📋 GET PATIENT RECORDS")
    print(f"   user_id from token: {user_id}")
    print(f"   role: {user.get('role')}")
    
    try:
        user_oid = ObjectId(user_id)
        
        # Try 1: Check if this is directly a patient record
        patient = mongo_db.patients.find_one({"_id": user_oid})
        if patient:
            patient_id = str(patient["_id"])
            print(f"   ✅ Found patient directly: {patient_id}")
        else:
            # Try 2: Check if user has patient_id reference
            user_record = mongo_db.users.find_one({"_id": user_oid})
            if user_record and user_record.get("patient_id"):
                patient_id = str(user_record["patient_id"])
                print(f"   ✅ Found patient via users.patient_id: {patient_id}")
            else:
                # Try 3: Find patient by user_id reference
                patient = mongo_db.patients.find_one({"user_id": user_oid})
                if patient:
                    patient_id = str(patient["_id"])
                    print(f"   ✅ Found patient via patients.user_id: {patient_id}")
        
        if not patient_id:
            print(f"   ❌ Patient record not found!")
            print(f"{'='*60}\n")
            return fail("Không tìm thấy hồ sơ bệnh nhân. Vui lòng hoàn thiện profile trước.", 404)
        
        print(f"   🔍 Querying EHR records with patient_id: {patient_id}")
        
    except Exception as e:
        print(f"   ❌ Error determining patient_id: {e}")
        print(f"{'='*60}\n")
        return fail(str(e), 500)
    
    filters = {
        "type": request.args.get("type"),
        "doctor_id": request.args.get("doctor_id"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "search": request.args.get("search")
    }
    
    # Remove None values
    filters = {k: v for k, v in filters.items() if v}
    
    try:
        records = EHRService.get_patient_records(
            patient_id=patient_id,
            filters=filters,
            role=user["role"]
        )
        
        print(f"   ✅ Found {len(records)} records")
        print(f"{'='*60}\n")
        
        # Stats
        stats = EHRService.get_patient_stats(patient_id)
        
        # ✅ Clean stats for JSON serialization
        cleaned_stats = clean_for_json(stats) if stats else {}
        
        # Pagination
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        start = (page - 1) * limit
        end = start + limit
        
        # ✅ Clean records for JSON serialization (records are already cleaned in service, but double-check)
        cleaned_records = [clean_for_json(r) for r in records[start:end]]
        
        return success({
            "data": cleaned_records,
            "total": len(records),
            "page": page,
            "limit": limit,
            "stats": cleaned_stats
        })
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*60}\n")
        return fail(str(e), 500)


@ehr_bp.route("/admin/patient-records", methods=["GET"])
@auth_required(roles=["admin"])
def admin_get_patient_records():
    """
    Admin: Lấy danh sách hồ sơ bệnh án (có thể lọc theo bệnh nhân, bác sĩ, loại...)
    Query params:
        - patient_id (optional)
        - type, doctor_id, start_date, end_date, search (optional)
    """
    from collections import Counter

    patient_id = (request.args.get("patient_id") or "").strip()

    filters = {
        "type": request.args.get("type"),
        "doctor_id": request.args.get("doctor_id"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "search": request.args.get("search")
    }
    filters = {k: v for k, v in filters.items() if v}

    try:
        if patient_id:
            records = EHRService.get_patient_records(
                patient_id=patient_id,
                filters=filters,
                role="admin"
            )
            stats = EHRService.get_patient_stats(patient_id)
        else:
            query = {}
            if "type" in filters:
                query["record_type"] = filters["type"]
            if "doctor_id" in filters:
                try:
                    query["doctor_id"] = ObjectId(filters["doctor_id"])
                except Exception:
                    return fail("doctor_id không hợp lệ", 400)
            if "start_date" in filters and "end_date" in filters:
                try:
                    start = datetime.fromisoformat(filters["start_date"])
                    end = datetime.fromisoformat(filters["end_date"])
                    query["created_at"] = {"$gte": start, "$lte": end}
                except Exception:
                    pass
            if "search" in filters:
                search_term = filters["search"]
                query["$or"] = [
                    {"chief_complaint": {"$regex": search_term, "$options": "i"}},
                    {"diagnosis.primary": {"$regex": search_term, "$options": "i"}},
                    {"doctor_notes": {"$regex": search_term, "$options": "i"}}
                ]

            cursor = mongo_db.ehr_records.find(query).sort("created_at", -1)
            records = list(cursor)

            doctor_cache = {}
            patient_cache = {}

            for record in records:
                pid = record.get("patient_id")
                did = record.get("doctor_id")

                if isinstance(pid, ObjectId):
                    pid_str = str(pid)
                else:
                    pid_str = pid
                    try:
                        pid = ObjectId(pid)
                    except Exception:
                        pid = None
                record["patient_id"] = pid_str

                if isinstance(did, ObjectId):
                    did_str = str(did)
                else:
                    did_str = did
                    try:
                        did = ObjectId(did)
                    except Exception:
                        did = None
                record["doctor_id"] = did_str

                if "appointment_id" in record and isinstance(record["appointment_id"], ObjectId):
                    record["appointment_id"] = str(record["appointment_id"])

                record["_id"] = str(record["_id"])

                if did and did_str not in doctor_cache:
                    doctor = mongo_db.doctors.find_one({"_id": did})
                    if doctor:
                        doctor_cache[did_str] = {
                            "full_name": doctor.get("full_name", ""),
                            "name": doctor.get("full_name", ""),
                            "specialty": doctor.get("specialty", ""),
                            "subspecialty": doctor.get("subspecialty", ""),
                            "avatar": doctor.get("avatar_url", "")
                        }
                    else:
                        doctor_cache[did_str] = {}
                record["doctor_info"] = doctor_cache.get(did_str, {})

                if pid and pid_str not in patient_cache:
                    patient = mongo_db.patients.find_one({"_id": pid})
                    if patient:
                        patient_cache[pid_str] = {
                            "name": patient.get("full_name") or patient.get("name", ""),
                            "dob": patient.get("date_of_birth", ""),
                            "gender": patient.get("gender", ""),
                            "phone": patient.get("phone", ""),
                            "email": patient.get("email", ""),
                            "mrn": patient.get("mrn", "")
                        }
                    else:
                        patient_cache[pid_str] = {}
                record["patient_info"] = patient_cache.get(pid_str, {})

            type_counts = Counter(record.get("record_type", "other") for record in records)
            stats = {
                "total": len(records),
                "by_type": dict(type_counts),
                "latest_visit": records[0].get("created_at") if records else None
            }

        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", len(records) or 1))
        start = (page - 1) * limit
        end = start + limit

        return success({
            "data": records[start:end],
            "total": len(records),
            "page": page,
            "limit": limit,
            "stats": stats
        })
    except ValueError as ve:
        return fail(str(ve), 400)
    except Exception as e:
        print(f"❌ admin_get_patient_records error: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@ehr_bp.route("/records/<record_id>", methods=["GET"])
@auth_required()
def get_record_details(record_id):
    """
    Lấy chi tiết 1 record
    Authorization: patient (owner) hoặc doctor (assigned) hoặc admin
    """
    user = get_current_user()
    
    try:
        # Get record
        record = mongo_db.ehr_records.find_one({"_id": ObjectId(record_id)})
        if not record:
            return fail("Record không tồn tại", 404)
        
        # Authorization check
        is_patient = str(record["patient_id"]) == user["user_id"]
        doctor_oid = get_doctor_oid_from_user(user)
        is_doctor = record["doctor_id"] == doctor_oid
        is_admin = user["role"] == "admin"
        
        if not (is_patient or is_doctor or is_admin):
            return fail("Bạn không có quyền xem record này", 403)
        
        # Get full details
        record_data = EHRService.get_record_by_id(record_id, role=user["role"])
        
        # Log access
        log_ehr_access(record_id, user["user_id"], action="VIEW")
        
        return success(record_data)
    
    except Exception as e:
        return fail(str(e), 500)


@ehr_bp.route("/records/<record_id>/timeline", methods=["GET"])
@auth_required()
def get_record_timeline(record_id):
    """
    Lấy timeline (tất cả versions) của record
    """
    user = get_current_user()
    
    try:
        # Get record để check authorization
        record = mongo_db.ehr_records.find_one({"_id": ObjectId(record_id)})
        if not record:
            return fail("Record không tồn tại", 404)
        
        # Authorization check
        is_patient = str(record["patient_id"]) == user["user_id"]
        doctor_oid = get_doctor_oid_from_user(user)
        is_doctor = record["doctor_id"] == doctor_oid
        is_admin = user["role"] == "admin"
        
        if not (is_patient or is_doctor or is_admin):
            return fail("Bạn không có quyền xem timeline", 403)
        
        # Get timeline
        timeline = EHRService.get_record_timeline(str(record["patient_id"]))
        
        return success(timeline)
    
    except Exception as e:
        return fail(str(e), 500)


@ehr_bp.route("/records", methods=["POST"])
@auth_required(roles=["doctor", "admin"])
def create_record():
    """
    Tạo EHR record mới (chỉ doctor/admin)
    Body: {
        "patient_id": str (required),
        "appointment_id": str (optional),
        "vital_signs": {...},
        "chief_complaint": str,
        "diagnosis": {...},
        "symptoms": [...],
        "prescription": [...],
        "procedures": [...],
        "doctor_notes": str,
        "internal_notes": str,
        "follow_up_required": bool,
        "follow_up_date": str,
        "record_type": str
    }
    """
    data = request.get_json() or {}
    user = get_current_user()
    
    if not data.get("patient_id"):
        return fail("Thiếu patient_id", 400)
    
    # Determine doctor_id
    if user["role"] == "admin":
        if not data.get("doctor_id"):
            return fail("Thiếu doctor_id", 400)
        doctor_id = str(data["doctor_id"])
        data["doctor_id"] = doctor_id
    else:
        doctor_oid = get_doctor_oid_from_user(user)
        doctor_id = str(doctor_oid)
        data["doctor_id"] = doctor_id
    
    try:
        record = EHRService.create_record(
            data=data,
            created_by_id=user["user_id"]
        )
        
        # Log creation
        log_ehr_access(str(record["_id"]), user["user_id"], action="CREATE")
        
        # ✅ Emit socket event for real-time updates
        try:
            from app.extensions import socketio
            socketio.emit("ehr_record_created", {
                "record_id": str(record["_id"]),
                "patient_id": data.get("patient_id"),
                "doctor_id": str(doctor_id),
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            })
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        return success(record, message="Đã tạo record thành công", status_code=201)
    
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@ehr_bp.route("/records/<record_id>", methods=["PUT"])
@auth_required(roles=["doctor", "admin"])
def update_record(record_id):
    """
    Cập nhật record (tạo version mới - append-only)
    Body: {
        "update_reason": str (required),
        ...fields to update...
    }
    """
    data = request.get_json() or {}
    user = get_current_user()
    
    if not data.get("update_reason"):
        return fail("Thiếu update_reason", 400)
    
    try:
        # Check authorization
        record = mongo_db.ehr_records.find_one({"_id": ObjectId(record_id)})
        if not record:
            return fail("Record không tồn tại", 404)
        
        # Only assigned doctor or admin can update
        doctor_oid = get_doctor_oid_from_user(user)
        if user["role"] != "admin" and record["doctor_id"] != doctor_oid:
            return fail("Bạn không có quyền cập nhật record này", 403)
        
        # Update (create new version)
        updated_record = EHRService.update_record(
            record_id=record_id,
            updates=data,
            updated_by_id=user["user_id"]
        )
        
        # Log update
        log_ehr_access(record_id, user["user_id"], action="EDIT")
        
        return success(updated_record, message="Đã cập nhật record thành công")
    
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        return fail(str(e), 500)


@ehr_bp.route("/records/<record_id>", methods=["DELETE"])
@auth_required(roles=["admin"])
def delete_record(record_id):
    """
    Admin: Xóa hồ sơ bệnh án (hard delete)
    """
    user = get_current_user()
    try:
        oid = ObjectId(record_id)
    except Exception:
        return fail("record_id không hợp lệ", 400)

    record = mongo_db.ehr_records.find_one({"_id": oid})
    if not record:
        return fail("Record không tồn tại", 404)

    try:
        mongo_db.ehr_records.delete_one({"_id": oid})

        # Nếu appointment tham chiếu tới record này, bỏ liên kết
        appointment_id = record.get("appointment_id")
        if appointment_id:
            try:
                mongo_db.appointments.update_one(
                    {"_id": appointment_id},
                    {"$unset": {"ehr_record_id": ""}}
                )
            except Exception as appt_err:
                print(f"⚠️ Không thể cập nhật appointment khi xóa EHR: {appt_err}")

        log_ehr_access(record_id, user["user_id"], action="DELETE")
        return success({"record_id": record_id}, message="Đã xóa hồ sơ bệnh án")
    except Exception as e:
        print(f"❌ Delete EHR record error: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


# =============== PRESCRIPTIONS API ===============

@ehr_bp.route("/prescriptions", methods=["GET"])
@auth_required(roles=["patient"])
def get_patient_prescriptions():
    """
    Lấy danh sách đơn thuốc của patient
    Query params:
        - status (optional)
        - start_date, end_date (optional)
    """
    user = get_current_user()
    
    try:
        # Get records có prescription
        records = EHRService.get_patient_records(
            patient_id=user["user_id"],
            role=user["role"]
        )
        
        # Extract prescriptions
        prescriptions = []
        for record in records:
            if record.get("prescription") and len(record["prescription"]) > 0:
                prescriptions.append({
                    "record_id": record["_id"],
                    "date": record.get("created_at"),
                    "doctor": record.get("doctor_info", {}),
                    "prescription": record["prescription"],
                    "diagnosis": record.get("diagnosis", {}),
                    "follow_up": record.get("follow_up_date")
                })
        
        return success(prescriptions)
    
    except Exception as e:
        return fail(str(e), 500)


# =============== TEST RESULTS API ===============

@ehr_bp.route("/test-results", methods=["GET"])
@auth_required(roles=["patient"])
def get_test_results():
    """
    Lấy danh sách kết quả xét nghiệm
    """
    user = get_current_user()
    
    try:
        # Get records có lab_results
        records = EHRService.get_patient_records(
            patient_id=user["user_id"],
            role=user["role"]
        )
        
        # Extract lab results
        test_results = []
        for record in records:
            if record.get("lab_results") and len(record["lab_results"]) > 0:
                for test in record["lab_results"]:
                    test_results.append({
                        "record_id": record["_id"],
                        "date": record.get("created_at"),
                        "doctor": record.get("doctor_info", {}),
                        "test_name": test.get("name", ""),
                        "result": test.get("result", ""),
                        "status": test.get("status", "completed"),
                        "notes": test.get("notes", "")
                    })
        
        return success(test_results)
    
    except Exception as e:
        return fail(str(e), 500)


# =============== SEARCH API ===============

@ehr_bp.route("/patients/<patient_id>/search", methods=["POST"])
@auth_required()
def search_records(patient_id):
    """
    Tìm kiếm trong records
    Body: {
        "query": str (required)
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    if not data.get("query"):
        return fail("Thiếu query", 400)
    
    # Authorization: chỉ patient (owner) hoặc admin
    if user["role"] != "admin" and user["user_id"] != patient_id:
        return fail("Bạn không có quyền tìm kiếm records này", 403)
    
    try:
        results = EHRService.search_records(
            patient_id=patient_id,
            search_query=data["query"]
        )
        
        return success(results)
    
    except Exception as e:
        return fail(str(e), 500)


# =============== ANALYTICS API ===============

@ehr_bp.route("/patients/<patient_id>/insights", methods=["GET"])
@auth_required()
def get_health_insights(patient_id):
    """
    Lấy health insights của patient
    Query params:
        - timeframe (optional: 3months, 6months, 1year, all)
    """
    user = get_current_user()
    
    # Authorization
    if user["role"] != "admin" and user["user_id"] != patient_id:
        return fail("Bạn không có quyền xem insights này", 403)
    
    try:
        # Get stats
        stats = EHRService.get_patient_stats(patient_id)
        
        # Get recent records
        recent_records = EHRService.get_patient_records(
            patient_id=patient_id,
            filters={},
            role=user["role"]
        )[:5]  # Latest 5 records
        
        insights = {
            "stats": stats,
            "recent_visits": recent_records,
            "health_score": 85,  # TODO: Calculate based on records
            "recommendations": [
                "Khám sức khỏe định kỳ mỗi 6 tháng",
                "Theo dõi huyết áp thường xuyên",
                "Duy trì chế độ ăn uống lành mạnh"
            ]
        }
        
        return success(insights)
    
    except Exception as e:
        return fail(str(e), 500)


@ehr_bp.route("/patients/<patient_id>/trends", methods=["GET"])
@auth_required()
def get_health_trends(patient_id):
    """
    Lấy xu hướng sức khỏe (vital signs over time)
    Query params:
        - metrics (optional: blood_pressure,weight,heart_rate)
        - period (optional: daily, weekly, monthly)
    """
    user = get_current_user()
    
    # Authorization
    if user["role"] != "admin" and user["user_id"] != patient_id:
        return fail("Bạn không có quyền xem trends này", 403)
    
    try:
        # Get all records
        records = EHRService.get_patient_records(
            patient_id=patient_id,
            filters={},
            role=user["role"]
        )
        
        # Extract vital signs trends
        trends = {
            "blood_pressure": [],
            "weight": [],
            "heart_rate": [],
            "temperature": []
        }
        
        for record in records:
            vitals = record.get("vital_signs", {})
            date = record.get("created_at")
            
            if vitals.get("blood_pressure"):
                trends["blood_pressure"].append({
                    "date": date,
                    "value": vitals["blood_pressure"]
                })
            
            if vitals.get("weight"):
                trends["weight"].append({
                    "date": date,
                    "value": vitals["weight"]
                })
            
            if vitals.get("heart_rate"):
                trends["heart_rate"].append({
                    "date": date,
                    "value": vitals["heart_rate"]
                })
            
            if vitals.get("temperature"):
                trends["temperature"].append({
                    "date": date,
                    "value": vitals["temperature"]
                })
        
        return success(trends)
    
    except Exception as e:
        return fail(str(e), 500)


# =============== AUDIT LOG API ===============

@ehr_bp.route("/records/<record_id>/audit-log", methods=["GET"])
@auth_required(roles=["admin"])
def get_record_audit_log(record_id):
    """
    Lấy audit log của record (chỉ admin)
    """
    try:
        logs = list(
            mongo_db.audit_logs.find({"record_id": ObjectId(record_id)})
            .sort("timestamp", -1)
            .limit(100)
        )
        
        # Populate user info
        for log in logs:
            log["_id"] = str(log["_id"])
            log["record_id"] = str(log["record_id"])
            log["accessed_by"] = str(log["accessed_by"])
            
            user = mongo_db.users.find_one(
                {"_id": ObjectId(log["accessed_by"])},
                {"name": 1, "email": 1, "role": 1}
            )
            if user:
                log["user_info"] = {
                    "name": user.get("name", ""),
                    "email": user.get("email", ""),
                    "role": user.get("role", "")
                }
        
        return success(logs)
    
    except Exception as e:
        return fail(str(e), 500)



# =============== PDF DOWNLOAD API ===============

@ehr_bp.route("/records/<record_id>/pdf", methods=["GET"])
@auth_required()
def download_record_pdf(record_id):
    """
    Tải PDF của EHR record
    GET /api/ehr/records/<record_id>/pdf
    """
    user = get_current_user()
    
    try:
        # Validate ObjectId
        try:
            oid = ObjectId(record_id)
        except:
            return fail("Invalid record_id", 400)
        
        # Get record with full patient and doctor info
        record = EHRService.get_record_by_id(record_id, user["role"])
        
        if not record:
            return fail("Record không tồn tại", 404)
        
        # Authorization check - Convert ObjectId to string for comparison
        patient_id_in_record = str(record.get("patient_id")) if record.get("patient_id") else None
        doctor_id = str(record.get("doctor_id")) if record.get("doctor_id") else None
        user_id = str(user["user_id"])
        
        # Check if user is the patient owner
        # User might be: 1) direct patient, 2) user with patient_id ref, 3) patient with user_id ref
        is_patient = False
        if user["role"] == "patient":
            try:
                user_oid = ObjectId(user_id)
                # Direct match
                if patient_id_in_record == user_id:
                    is_patient = True
                else:
                    # Check if user has patient_id reference
                    user_record = mongo_db.users.find_one({"_id": user_oid})
                    if user_record and str(user_record.get("patient_id")) == patient_id_in_record:
                        is_patient = True
                    else:
                        # Check if patient has user_id reference
                        patient_record = mongo_db.patients.find_one({"_id": ObjectId(patient_id_in_record)})
                        if patient_record and str(patient_record.get("user_id")) == user_id:
                            is_patient = True
            except Exception as e:
                print(f"[PDF Auth] Error checking patient ownership: {e}")
        
        is_doctor = doctor_id == user_id
        is_admin = user["role"] == "admin"
        
        # Debug log
        print(f"[PDF Auth Check] user_id={user_id}, role={user['role']}, patient_id_in_record={patient_id_in_record}, doctor_id={doctor_id}")
        print(f"[PDF Auth Check] is_patient={is_patient}, is_doctor={is_doctor}, is_admin={is_admin}")
        
        if not (is_patient or is_doctor or is_admin):
            return fail("Bạn không có quyền tải PDF này", 403)
        
        # Convert ObjectId to string for PDF generation
        if "_id" in record and isinstance(record["_id"], ObjectId):
            record["_id"] = str(record["_id"])
        if "patient_id" in record and isinstance(record["patient_id"], ObjectId):
            record["patient_id"] = str(record["patient_id"])
        if "doctor_id" in record and isinstance(record["doctor_id"], ObjectId):
            record["doctor_id"] = str(record["doctor_id"])
        
        # Generate PDF with detailed error handling
        try:
            pdf_bytes = EHRPDFService.build_ehr_pdf(record)
        except Exception as pdf_err:
            print(f"❌ PDF Generation Error: {pdf_err}")
            import traceback
            traceback.print_exc()
            return fail(f"Lỗi tạo PDF: {str(pdf_err)}", 500)
        
        # Create buffer
        buffer = BytesIO(pdf_bytes)
        buffer.seek(0)
        
        # Get patient name for filename (support both naming conventions)
        patient_info = record.get("patient_info", {})
        patient_name = patient_info.get("full_name") or patient_info.get("name") or "patient"
        # Sanitize filename
        safe_name = "".join(c if c.isalnum() or c in (' ', '_') else '_' for c in patient_name)
        filename = f"phieu-kham-{safe_name}_{record_id[:8]}.pdf"
        
        # Log download
        log_ehr_access(record_id, user_id, action="DOWNLOAD_PDF")
        
        # Return PDF file
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        print(f"❌ Download PDF Error: {e}")
        import traceback
        traceback.print_exc()
        return fail(f"Không thể tải PDF: {str(e)}", 500)


# =============== LEGACY PDF EXPORT API (keep for backward compatibility) ===============

@ehr_bp.route("/records/<record_id>/export-pdf", methods=["POST"])
@auth_required()
def export_record_pdf(record_id):
    """
    Xuất record ra PDF (legacy endpoint)
    Redirects to GET /records/<record_id>/pdf
    """
    return download_record_pdf(record_id)


# =============== UPLOAD PDF AND CREATE EHR RECORD ===============

@ehr_bp.route("/upload-pdf", methods=["POST"])
@auth_required(roles=["patient", "doctor", "admin"])
def upload_pdf_record():
    """
    Upload PDF file và tạo EHR record từ PDF
    POST /api/ehr/upload-pdf
    Form data:
        - file: PDF file
        - title: (optional) Tiêu đề hồ sơ
        - notes: (optional) Ghi chú
    """
    user = get_current_user()
    
    try:
        # Check if file is present
        if 'file' not in request.files:
            return fail("Thiếu file PDF", 400)
        
        file = request.files['file']
        if file.filename == '':
            return fail("Chưa chọn file", 400)
        
        # Check file extension
        if not file.filename.lower().endswith('.pdf'):
            return fail("Chỉ chấp nhận file PDF", 400)
        
        # Get metadata
        title = request.form.get('title', file.filename.replace('.pdf', ''))
        notes = request.form.get('notes', '')
        
        # Get patient_id
        if user["role"] == "patient":
            patient_id = user.get("patient_id") or user.get("user_id")
        else:
            patient_id = request.form.get('patient_id')
            if not patient_id:
                return fail("Thiếu patient_id", 400)
        
        try:
            patient_oid = ObjectId(patient_id)
        except:
            return fail("patient_id không hợp lệ", 400)
        
        # Verify patient exists
        patient = mongo_db.patients.find_one({"_id": patient_oid})
        if not patient:
            return fail("Bệnh nhân không tồn tại", 404)
        
        # Get doctor_id (use system doctor or current user if doctor)
        doctor_id = None
        if user["role"] == "doctor":
            doctor_id = get_doctor_oid_from_user(user)
        else:
            # Use a default system doctor or create placeholder
            system_doctor = mongo_db.doctors.find_one({"email": "system@healthcare.ai"})
            if system_doctor:
                doctor_id = system_doctor["_id"]
            else:
                # Create placeholder doctor for uploaded records
                doctor_id = ObjectId()  # Will be set to patient's default doctor
        
        # Save file
        upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'ehr_pdfs')
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = secure_filename(f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        
        # Create file record in database
        file_doc = {
            "filename": file.filename,
            "stored_filename": filename,
            "file_path": filepath,
            "file_type": "application/pdf",
            "file_size": file_size,
            "uploaded_by": ObjectId(user["user_id"]),
            "uploaded_at": datetime.utcnow(),
            "status": "active"
        }
        file_result = mongo_db.files.insert_one(file_doc)
        file_id = file_result.inserted_id
        
        # Get next version for patient
        latest = mongo_db.ehr_records.find_one(
            {"patient_id": patient_oid},
            sort=[("version", -1)]
        )
        version = (latest.get("version", 0) + 1) if latest else 1
        
        # Create EHR record
        ehr_doc = {
            "patient_id": patient_oid,
            "doctor_id": doctor_id,
            "version": version,
            "record_type": "uploaded_pdf",
            "visit_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "chief_complaint": title,
            "doctor_notes": notes,
            "attachments": [{
                "file_id": str(file_id),
                "filename": file.filename,
                "file_type": "application/pdf",
                "file_size": file_size,
                "uploaded_at": datetime.utcnow()
            }],
            "is_uploaded": True,
            "uploaded_by": ObjectId(user["user_id"])
        }
        
        ehr_result = mongo_db.ehr_records.insert_one(ehr_doc)
        
        # Get created record with populated data
        record = mongo_db.ehr_records.find_one({"_id": ehr_result.inserted_id})
        record["_id"] = str(record["_id"])
        record["patient_id"] = str(record["patient_id"])
        record["doctor_id"] = str(record["doctor_id"])
        
        return success({
            "record": record,
            "file_id": str(file_id),
            "message": "Upload PDF và tạo hồ sơ thành công"
        }, status_code=201)
        
    except Exception as e:
        print(f"❌ Upload PDF Error: {e}")
        import traceback
        traceback.print_exc()
        return fail(f"Không thể upload PDF: {str(e)}", 500)
