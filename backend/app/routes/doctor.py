from flask import Blueprint, jsonify, request, g
from bson import ObjectId
from datetime import datetime, timedelta
from app.extensions import mongo_db
from app.services.scheduler_service import SchedulerService  # ✅ THÊM AUTO SLOTS
import jwt
from app.config import JWT_SECRET_KEY

# ✅ FIX: Thêm OPTIONS bypass
def auth_required(f):
    from functools import wraps
    @wraps(f)
    def _w(*args, **kwargs):
        # ✅ CHO PHÉP OPTIONS REQUEST ĐI QUA (PREFLIGHT)
        if request.method == "OPTIONS":
            return "", 204
        
        auth = request.headers.get("Authorization", "")
        token = auth.split(" ", 1)[1] if auth.startswith("Bearer ") else None
        if not token:
            return jsonify({"error": "Thiếu token"}), 401
        try:
            g.user = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token hết hạn"}), 401
        except Exception:
            return jsonify({"error": "Token không hợp lệ"}), 401
        return f(*args, **kwargs)
    return _w

def role_required(*roles):
    roles = {r.lower() for r in roles}
    def deco(f):
        from functools import wraps
        @wraps(f)
        def _w(*args, **kwargs):
            # ✅ CHO PHÉP OPTIONS REQUEST ĐI QUA
            if request.method == "OPTIONS":
                return "", 204
            
            role = (getattr(g, "user", {}) or {}).get("role", "").lower()
            if role not in roles:
                return jsonify({"error": "Không có quyền truy cập"}), 403
            return f(*args, **kwargs)
        return _w
    return deco

doctor_bp = Blueprint("doctor", __name__)

def as_json(doc):
    if not doc:
        return None
    d = dict(doc)
    d["_id"] = str(d["_id"])
    return d


DAY_NAMES = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]

DAY_ABBR_MAP = {
    "mon": "monday",
    "monday": "monday",
    "tue": "tuesday",
    "tues": "tuesday",
    "tuesday": "tuesday",
    "wed": "wednesday",
    "weds": "wednesday",
    "wednesday": "wednesday",
    "thu": "thursday",
    "thur": "thursday",
    "thurs": "thursday",
    "thursday": "thursday",
    "fri": "friday",
    "friday": "friday",
    "sat": "saturday",
    "saturday": "saturday",
    "sun": "sunday",
    "sunday": "sunday",
}


def _default_working_hours_map():
    """Return default working hours (Mon-Fri 09:00-17:00)."""
    default = {}
    for idx, day in enumerate(DAY_NAMES):
        if idx < 5:
            default[day] = {"start": "09:00", "end": "17:00"}
        else:
            default[day] = None
    return default


def _normalize_working_hours_input(raw):
    """
    Normalize incoming working_hours payload (legacy or new format)
    into unified map: {day: {"start": "..", "end": ".."} | None}
    """
    normalized = {day: None for day in DAY_NAMES}
    if not raw:
        return _default_working_hours_map()

    # Legacy format: {"days": [...], "start": "..", "end": ".."}
    if isinstance(raw, dict) and "days" in raw and raw.get("start") and raw.get("end"):
        start = str(raw.get("start")).strip()
        end = str(raw.get("end")).strip()
        if start and end:
            for entry in raw.get("days", []):
                key = str(entry or "").strip().lower()
                norm_key = DAY_ABBR_MAP.get(key, key)
                if norm_key in normalized:
                    normalized[norm_key] = {"start": start, "end": end}
        return normalized

    # New format: {day: {start, end}}
    for day in DAY_NAMES:
        val = raw.get(day) if isinstance(raw, dict) else None
        if isinstance(val, dict):
            start = str(val.get("start") or "").strip()
            end = str(val.get("end") or "").strip()
            if start and end:
                normalized[day] = {"start": start, "end": end}
    return normalized


def _sync_doctor_slots_with_schedule(doc, horizon_days=30):
    doctor_oid = doc.get("_id")
    if not doctor_oid:
        return

    working_hours_map = doc.get("shift") or {}
    # ✅ Lấy lịch ngoại lệ từ DB
    specific_schedule = doc.get("specific_schedule") or {} 
    
    slot_duration = int(doc.get("slot_duration") or 30)

    today = datetime.utcnow().date()
    for offset in range(horizon_days):
        current_date = today + timedelta(days=offset)
        date_str = current_date.strftime("%Y-%m-%d") # Key để tra cứu: "2025-11-27"
        day_name = DAY_NAMES[current_date.weekday()]
        
        # --- LOGIC QUYẾT ĐỊNH GIỜ LÀM ---
        config = None
        
        # 1. Ưu tiên check lịch cụ thể trước
        if date_str in specific_schedule:
            spec = specific_schedule[date_str]
            # Nếu set "off": true thì config = None (nghĩa là nghỉ)
            if spec.get("off") is True:
                config = None 
            else:
                # Nếu có giờ cụ thể
                config = spec 
        else:
            # 2. Nếu không có lịch cụ thể, dùng lịch tuần mặc định
            config = working_hours_map.get(day_name)
        # --------------------------------

        # Xóa slot cũ (Available/Hold) của ngày này để tạo lại
        day_start = datetime.combine(current_date, datetime.min.time())
        mongo_db.time_slots.delete_many({
            "doctor_id": doctor_oid,
            "date": day_start,
            "status": {"$in": ["available", "hold", "Available"]}
        })

        # Nếu có config giờ làm thì tạo slot
        if config and config.get("start") and config.get("end"):
            try:
                SchedulerService.generate_time_slots(
                    doctor_id=str(doctor_oid),
                    date=date_str,
                    working_hours={
                        "start": config["start"],
                        "end": config["end"],
                        "break": config.get("break", []),
                    },
                    slot_duration=slot_duration,
                )
            except Exception as e:
                print(f"⚠️ Failed to regenerate slots for {current_date}: {e}")

def _doctor_to_response(doc):
    if not doc:
        return None
    return {
        "_id": str(doc["_id"]),
        "id": str(doc["_id"]),
        "name": doc.get("full_name") or doc.get("name", ""),
        "full_name": doc.get("full_name") or doc.get("name", ""),
        "license_no": doc.get("license_no", ""),
        "issuing_authority": doc.get("issuing_authority", ""),
        "department": doc.get("department", ""),
        "specialty": doc.get("specialty", ""),
        "subspecialty": doc.get("subspecialty", ""),
        "years_of_experience": doc.get("years_of_experience", 0),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "gender": doc.get("gender", "male"),
        "date_of_birth": doc.get("date_of_birth", ""),
        "status": doc.get("status", "active"),
        "role": doc.get("role", "doctor"),
        "shift": doc.get("shift", {}),
        "working_hours": doc.get("shift", {}),
        "specific_schedule": doc.get("specific_schedule", {}),
        "on_call": doc.get("on_call", False),
        "qualifications": doc.get("qualifications", []),
        "languages": doc.get("languages", ["Tiếng Việt"]),
        "bio": doc.get("bio", "Bác sĩ chuyên khoa giàu kinh nghiệm"),
        "avatar": doc.get("avatar", "👨‍⚕️"),
        "rating": doc.get("rating", 4.8),
        "reviews": doc.get("reviews", 0),
        "consultation_fee": doc.get("consultation_fee", 500000),
        "price": doc.get("consultation_fee", 500000),
        "slot_duration": doc.get("slot_duration", 30),
        "accepting_new_patients": bool(
            doc.get(
                "accepting_new_patients",
                (doc.get("status") or "active") not in {"paused", "inactive"},
            )
        ),
        "created_at": doc.get("created_at", datetime.utcnow()).isoformat()
        if isinstance(doc.get("created_at"), datetime)
        else doc.get("created_at"),
        "updated_at": doc.get("updated_at", datetime.utcnow()).isoformat()
        if isinstance(doc.get("updated_at"), datetime)
        else doc.get("updated_at"),
    }


def _find_doctor_for_current_user():
    """Resolve doctor record for the currently authenticated user."""
    user_claims = getattr(g, "user", {}) or {}
    doctor = None
    user_id = user_claims.get("user_id") or user_claims.get("sub")
    email = (user_claims.get("email") or "").strip().lower()

    search_conditions = []
    if user_id:
        search_conditions.append({"user_id": user_id})
        if ObjectId.is_valid(user_id):
            user_oid = ObjectId(user_id)
            search_conditions.append({"user_id": user_oid})
            search_conditions.append({"_id": user_oid})
    if email:
        search_conditions.append({"email": email})

    for condition in search_conditions:
        doctor = mongo_db.doctors.find_one(condition)
        if doctor:
            break

    if doctor and user_id and not doctor.get("user_id"):
        try:
            value = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id
            mongo_db.doctors.update_one({"_id": doctor["_id"]}, {"$set": {"user_id": value}})
            doctor["user_id"] = value
        except Exception:
            pass

    return doctor

# backend/app/routes/doctor.py

@doctor_bp.route("/doctors", methods=["GET", "OPTIONS"])
def get_doctors():
    """✅ Lấy danh sách bác sĩ"""
    if request.method == "OPTIONS":
        return "", 204
    
    specialty = request.args.get("specialty")
    search = request.args.get("search")
    
    try:
        query = {}
        
        if specialty and specialty != "all":
            query["specialty"] = {"$regex": specialty, "$options": "i"}
        
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"specialty": {"$regex": search, "$options": "i"}},
                {"department": {"$regex": search, "$options": "i"}}
            ]
        
        # ✅ Fetch all doctors
        cursor = mongo_db.doctors.find(query).sort("full_name", 1)
        
        result = []
        for doc in cursor:
            # ✅ Convert ObjectId to string
            doctor_id = str(doc["_id"])
            full_name = doc.get("full_name") or doc.get("name", "")
            
            doctor_data = {
                "_id": doctor_id,
                "id": doctor_id,
                "name": full_name,  # ✅ CRITICAL
                "full_name": full_name,
                "license_no": doc.get("license_no", ""),
                "issuing_authority": doc.get("issuing_authority", ""),
                "specialty": doc.get("specialty", ""),
                "subspecialty": doc.get("subspecialty", ""),
                "department": doc.get("department", ""),
                "years_of_experience": doc.get("years_of_experience", 0),
                "qualifications": doc.get("qualifications", []),
                "languages": doc.get("languages", []),
                "email": doc.get("email", ""),
                "phone": doc.get("phone", ""),
                "gender": doc.get("gender", "male"),
                "date_of_birth": doc.get("date_of_birth", ""),  # ✅ dd/mm/yyyy
                "status": doc.get("status", "active"),
                "role": doc.get("role", "doctor"),
                "shift": doc.get("shift", {}),
                "on_call": doc.get("on_call", False),
                "avatar": doc.get("avatar", "👨‍⚕️"),
                "rating": doc.get("rating", 4.8),
                "reviews": doc.get("reviews", 0),
                "experience": doc.get("years_of_experience", 0),
                "price": doc.get("consultation_fee", 500000),
                "consultation_fee": doc.get("consultation_fee", 500000),
                "bio": doc.get("bio", "Bác sĩ chuyên khoa giàu kinh nghiệm"),
                "working_hours": doc.get("shift", {}),
                "specific_schedule": doc.get("specific_schedule", {}),
            }
            
            result.append(doctor_data)
        
        print(f"✅ Returning {len(result)} doctors")
        return jsonify(result), 200
    
    except Exception as e:
        print(f"❌ Get doctors error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@doctor_bp.route("/doctor/me", methods=["GET", "OPTIONS"])
@auth_required
@role_required("doctor", "admin")
def get_my_doctor_profile():
    """Doctor self-service profile endpoint."""
    if request.method == "OPTIONS":
        return "", 204

    doctor = _find_doctor_for_current_user()
    if not doctor:
        return (
            jsonify(
                {
                    "error": "Không tìm thấy hồ sơ bác sĩ cho tài khoản này. Vui lòng liên hệ quản trị viên.",
                }
            ),
            404,
        )

    return jsonify(_doctor_to_response(doctor)), 200


@doctor_bp.route("/doctors/<doctor_id>", methods=["GET", "OPTIONS"])
def get_doctor_details(doctor_id):
    """✅ PUBLIC: Lấy chi tiết 1 bác sĩ"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        oid = ObjectId(doctor_id)
    except Exception:
        return jsonify({"error": "Invalid doctor_id"}), 400
    
    try:
        doctor = mongo_db.doctors.find_one({"_id": oid})
        if not doctor:
            return jsonify({"error": "Bác sĩ không tồn tại"}), 404
        
        result = {
            "_id": str(doctor["_id"]),  
            "id": str(doctor["_id"]),
            "name": doctor.get("full_name") or doctor.get("name", ""),
            "specialty": doctor.get("specialty", ""),
            "department": doctor.get("department", ""),
            "avatar": doctor.get("avatar", "👨‍⚕️"),
            "rating": doctor.get("rating", 4.8),
            "reviews": doctor.get("reviews", 0),
            "experience": doctor.get("years_of_experience", 0),
            "price": doctor.get("consultation_fee", 500000),
            "bio": doctor.get("bio", "Bác sĩ chuyên khoa giàu kinh nghiệm"),
            "qualifications": doctor.get("qualifications", []),
            "languages": doctor.get("languages", ["Tiếng Việt"]),
            "phone": doctor.get("phone", ""),
            "email": doctor.get("email", ""),
            "gender": doctor.get("gender", "male"),
            "date_of_birth": doctor.get("date_of_birth", ""),  # ✅ dd/mm/yyyy
            "working_hours": doctor.get("shift", {}),
            "specific_schedule": doctor.get("specific_schedule", {}),
            "license_no": doctor.get("license_no", ""),
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        print(f"Error fetching doctor details: {e}")
        return jsonify({"error": str(e)}), 500

@doctor_bp.route("/doctors/<id>", methods=["DELETE", "OPTIONS"])
@auth_required
@role_required("admin")  # ✅ CHỈ ADMIN MỚI ĐƯỢC XÓA
def delete_doctor(id):
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "invalid id"}), 400

    # Tìm doctor trước khi xóa để lấy thông tin
    doctor = mongo_db.doctors.find_one({"_id": oid})
    if not doctor:
        return jsonify({"error": "not found"}), 404
    
    doctor_email = doctor.get("email")
    doctor_user_id = doctor.get("user_id")
    
    # ✅ 1. Xóa user account nếu có (từ users collection)
    if doctor_user_id:
        try:
            user_oid = ObjectId(doctor_user_id) if isinstance(doctor_user_id, str) else doctor_user_id
            mongo_db.users.delete_one({"_id": user_oid})
            print(f"✅ Deleted user account: {doctor_user_id}")
        except Exception as e:
            print(f"⚠️ Error deleting user account: {e}")
    
    # ✅ 2. Xóa user account theo email (nếu không có user_id nhưng có email trùng)
    if doctor_email:
        try:
            mongo_db.users.delete_many({"email": doctor_email.lower().strip()})
            print(f"✅ Deleted user accounts with email: {doctor_email}")
        except Exception as e:
            print(f"⚠️ Error deleting user by email: {e}")
    
    # ✅ 3. Xóa doctor record (HARD DELETE)
    res = mongo_db.doctors.delete_one({"_id": oid})
    if res.deleted_count == 0:
        return jsonify({"error": "not found"}), 404
    
    # ✅ Emit socket event for real-time update
    try:
        from app.extensions import socketio
        socketio.emit("doctor_deleted", {
            "doctor_id": id,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        })
        print(f"📡 Socket: doctor_deleted - {id}")
    except Exception as socket_err:
        print(f"⚠️ Socket emit error: {socket_err}")
    
    return jsonify({"ok": True, "message": "Đã xóa bác sĩ hoàn toàn khỏi database"})


# ============================================
# ✅ CREATE DOCTOR - TỰ ĐỘNG TẠO SLOTS
# ============================================
@doctor_bp.route("/doctors", methods=["POST", "OPTIONS"])
@auth_required
@role_required("doctor", "admin")
def create_doctor():
    """✅ Tạo bác sĩ mới + TỰ ĐỘNG TẠO TIME SLOTS"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        body = request.get_json(force=True) or {}
        print(f"📦 Received payload: {body}")
        
        # ✅ Validate required fields
        full_name = (body.get("full_name") or body.get("name") or "").strip()
        license_no = (body.get("license_no") or "").strip()
        department = (body.get("department") or "").strip()
        specialty = (body.get("specialty") or "").strip()
        
        if not full_name:
            return jsonify({"error": "Thiếu tên bác sĩ"}), 400
        if not license_no:
            return jsonify({"error": "Thiếu số CCHN"}), 400
        if not department:
            return jsonify({"error": "Thiếu khoa"}), 400
        if not specialty:
            return jsonify({"error": "Thiếu chuyên khoa"}), 400
        
        # ✅ Check email duplicate
        email = (body.get("email") or "").strip().lower()
        if email:
            existed = mongo_db.doctors.find_one({"email": email})
            if existed:
                return jsonify({"error": "Email bác sĩ đã tồn tại"}), 409
        
        # ✅ Normalize working hours input
        working_hours_payload = body.get("working_hours") or body.get("shift")
        shift = _normalize_working_hours_input(working_hours_payload)
        
        # ✅ Create document
        slot_duration = int(body.get("slot_duration") or 30)

        doc = {
            "full_name": full_name,
            "license_no": license_no,
            "issuing_authority": (body.get("issuing_authority") or "").strip(),
            "department": department,
            "specialty": specialty,
            "subspecialty": (body.get("subspecialty") or "").strip(),
            "years_of_experience": int(body.get("years_of_experience") or 0),
            "email": email,
            "phone": (body.get("phone") or "").strip(),
            "gender": body.get("gender", "male"),
            "date_of_birth": (body.get("date_of_birth") or "").strip(),  # ✅ dd/mm/yyyy format
            "status": body.get("status", "active"),
            "role": body.get("role", "doctor"),
            "shift": shift,
            "on_call": bool(body.get("on_call", False)),
            "qualifications": body.get("qualifications") or [],
            "languages": body.get("languages") or ["Tiếng Việt"],
            "bio": body.get("bio") or "Bác sĩ chuyên khoa giàu kinh nghiệm",
            "avatar": body.get("avatar", "👨‍⚕️"),
            "rating": 4.8,
            "reviews": 0,
            "consultation_fee": int(body.get("consultation_fee") or body.get("price") or 500000),
            "slot_duration": slot_duration,
            "accepting_new_patients": bool(body.get("accepting_new_patients", True)),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        # ✅ Insert to database
        result = mongo_db.doctors.insert_one(doc)
        inserted_id = result.inserted_id
        
        print(f"💾 Inserted doctor with ID: {inserted_id}")
        
        # ✅ Emit socket event for real-time update
        try:
            from app.extensions import socketio
            socketio.emit("doctor_created", {
                "doctor_id": str(inserted_id),
                "name": full_name,
                "specialty": specialty,
                "license_no": license_no,
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            })
            print(f"📡 Socket: doctor_created - {license_no}")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        # ============================================
        # ✅ TỰ ĐỘNG TẠO TIME SLOTS (NẾU ĐƯỢC YÊU CẦU)
        # ============================================
        auto_generate_slots = body.get("auto_generate_slots", True)
        slots_info = {"slots_created": 0, "message": ""}
        
        if auto_generate_slots:
            try:
                num_days = int(body.get("slots_duration_days", 30))
                
                # Gọi service để tạo slots
                from datetime import timedelta
                today = datetime.now()
                slots_created_total = 0
                
                # Tạo slots cho num_days ngày dựa trên working hours theo từng ngày
                for day_offset in range(num_days):
                    current_date = today + timedelta(days=day_offset)
                    date_str = current_date.strftime("%Y-%m-%d")
                    
                    day_name = DAY_NAMES[current_date.weekday()]
                    day_config = shift.get(day_name)
                    if not day_config or not day_config.get("start") or not day_config.get("end"):
                        continue
                    
                    # Tạo slots cho ngày này
                    try:
                        slot_ids = SchedulerService.generate_time_slots(
                            doctor_id=str(inserted_id),  
                            date=date_str,
                            working_hours={
                                "start": day_config["start"],
                                "end": day_config["end"],
                                "break": day_config.get("break", ["12:00", "13:00"])
                            },
                            slot_duration=slot_duration
                        )
                        slots_created_total += len(slot_ids)
                    except Exception as e:
                        print(f"⚠️  Error generating slots for {date_str}: {e}")
                        continue
                
                slots_info = {
                    "slots_created": slots_created_total,
                    "message": f"Đã tạo {slots_created_total} slots cho {num_days} ngày tới"
                }
                
                print(f"✅ Auto-generated {slots_created_total} slots")
                
            except Exception as slot_error:
                print(f"⚠️  Error auto-generating slots: {slot_error}")
                import traceback
                traceback.print_exc()
                slots_info = {
                    "slots_created": 0,
                    "message": f"Lỗi tạo slots: {str(slot_error)}"
                }
        
        # ✅ CRITICAL: Convert ObjectId to string IMMEDIATELY
        doc["_id"] = inserted_id
        response = _doctor_to_response(doc) or {}
        response["slots_info"] = slots_info  # ✅ THÊM THÔNG TIN SLOTS
        
        print(f"✅ Returning response: {response['name']} (ID: {response['_id']})")
        print(f"✅ Slots info: {slots_info}")
        
        return jsonify(response), 201
        
    except Exception as e:
        print(f"❌ Create doctor exception: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@doctor_bp.route("/doctors/<id>", methods=["PATCH", "OPTIONS"])
@auth_required
@role_required("doctor", "admin")
def patch_doctor(id):
    """✅ Cập nhật thông tin bác sĩ & Xử lý logic Tạm dừng nhận bệnh"""
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "invalid id"}), 400

    body = request.get_json(force=True) or {}
    
    # Flag để kiểm tra xem có cần cập nhật slot không
    working_hours_payload = body.get("working_hours")
    working_hours_updated = working_hours_payload is not None
    
    # Flag kiểm tra trạng thái nhận bệnh
    new_accepting_status = body.get("accepting_new_patients") # True/False hoặc None

    allowed = {
        "full_name", "name", "license_no", "issuing_authority", 
        "department", "specialty", "subspecialty",
        "years_of_experience", "qualifications", "languages", 
        "email", "phone", "gender", "date_of_birth",
        "shift", "working_hours", "on_call", "status", "role",
        "bio", "avatar", "consultation_fee", "price", "slot_duration",
        "accepting_new_patients","specific_schedule"
    }
    
    upd = {}
    for k, v in body.items():
        if k in allowed:
            if k == "email" and isinstance(v, str):
                upd[k] = v.strip().lower()
            elif k == "price":
                upd["consultation_fee"] = int(v)
            elif k == "working_hours" or k == "shift":
                upd["shift"] = _normalize_working_hours_input(v)
                working_hours_updated = True
            elif k in ("years_of_experience", "consultation_fee"):
                upd[k] = int(v) if v else 0
            elif k == "slot_duration":
                upd[k] = int(v) if v else 30
            elif k == "accepting_new_patients":
                # Logic: Nếu user gửi lên, ta update.
                # Lưu ý: Nếu user gửi status="paused", ta cũng nên set cái này thành False
                upd[k] = bool(v)
            elif k == "status":
                upd[k] = v
                # Đồng bộ status với accepting_new_patients
                if v in ["paused", "inactive", "banned"]:
                    upd["accepting_new_patients"] = False
                    new_accepting_status = False # Trigger logic xóa slot
            elif k == "specific_schedule":
                upd[k] = v
                working_hours_updated = True 
            else:
                upd[k] = v
    if not upd:
        return jsonify({"error": "no valid fields"}), 400

    # Check email duplicate
    if "email" in upd and upd["email"]:
        ex = mongo_db.doctors.find_one({"email": upd["email"], "_id": {"$ne": oid}})
        if ex:
            return jsonify({"error": "Email bác sĩ đã tồn tại"}), 409
    
    upd["updated_at"] = datetime.utcnow()
    
    # --- LOGIC MỚI: XỬ LÝ KHI TẠM DỪNG NHẬN BỆNH ---
    # Nếu bác sĩ tắt nhận bệnh (False) -> Xóa hết slot AVAILABLE trong tương lai
    if new_accepting_status is False:
        try:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            # Xóa slot available từ hôm nay trở đi
            del_result = mongo_db.time_slots.delete_many({
                "doctor_id": oid,
                "date": {"$gte": today_start},
                "status": {"$in": ["available", "hold", "Available"]} # Chỉ xóa slot trống, KHÔNG xóa slot đã book
            })
            print(f"🚫 Doctor paused: Deleted {del_result.deleted_count} future available slots.")
        except Exception as e:
            print(f"⚠️ Error clearing slots for paused doctor: {e}")

    # Thực hiện update vào DB
    res = mongo_db.doctors.update_one({"_id": oid}, {"$set": upd})
    
    if res.matched_count == 0:
        return jsonify({"error": "not found"}), 404

    doc = mongo_db.doctors.find_one({"_id": oid})
    
    # Chỉ regenerate slot nếu update giờ làm VÀ bác sĩ ĐANG NHẬN BỆNH
    # Nếu đang tạm dừng (accepting_new_patients == False) thì không tạo slot mới
    is_active = doc.get("accepting_new_patients", True) and doc.get("status") == "active"
    
    if working_hours_updated and is_active:
        _sync_doctor_slots_with_schedule(doc)
    
    # Emit socket
    try:
        from app.extensions import socketio
        socketio.emit("doctor_updated", {
            "doctor_id": id,
            "name": doc.get("full_name"),
            "is_active": is_active, # Gửi trạng thái về client để update UI realtime
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        })
    except Exception as socket_err:
        print(f"⚠️ Socket emit error: {socket_err}")
    
    resp = _doctor_to_response(doc)
    return jsonify(resp), 200