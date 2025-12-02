from flask import Blueprint, jsonify, request, g
from bson import ObjectId
from datetime import datetime, date
from app.extensions import mongo_db
from flask_cors import cross_origin
from pymongo.errors import DuplicateKeyError
import bcrypt
import re
import random
import string

# ✅ IMPORT TỪ MIDDLEWARE
from app.middlewares.auth import auth_required

patient_bp = Blueprint("patient", __name__)

# ===================== Helpers & Regex =====================
PHONE_VN = re.compile(r'^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9\d)\d{7}$')

def generate_mrn():
    """
    Generate unique MRN (Medical Record Number) with format:
    PT-YYYYMMDD-XXXX
    Example: PT-20251104-A7B3
    
    Logic:
    - PT: Patient prefix
    - YYYYMMDD: Current date
    - XXXX: 4 random alphanumeric characters (uppercase)
    """
    date_str = datetime.now().strftime("%Y%m%d")
    
    # Generate 4 random characters (letters + numbers)
    random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    
    mrn = f"PT-{date_str}-{random_suffix}"
    
    # Check uniqueness (retry if exists)
    max_retries = 10
    for _ in range(max_retries):
        existing = mongo_db.patients.find_one({"mrn": mrn})
        if not existing:
            return mrn
        # Regenerate if duplicate
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        mrn = f"PT-{date_str}-{random_suffix}"
    
    # Fallback: use timestamp + random
    timestamp = int(datetime.now().timestamp() * 1000)
    return f"PT-{date_str}-{timestamp % 10000:04d}"

def _parse_iso_date_or_none(s):
    if not s:
        return None
    # hỗ trợ cả datetime/date object
    if isinstance(s, datetime):
        return s
    if isinstance(s, date):
        return datetime(s.year, s.month, s.day)
    # mọi trường hợp khác: ép thành string
    s = str(s).strip()
    try:
        # nhận "YYYY-MM-DD" hoặc full ISO
        return datetime.fromisoformat(s)
    except Exception:
        # fallback: chấp nhận "DD/MM/YYYY"
        try:
            return datetime.strptime(s, "%d/%m/%Y")
        except Exception:
            return None

# ===================== Utils =====================
def as_json(doc):
    if not doc:
        return None
    d = dict(doc)
    
    # Convert ObjectId to string
    if "_id" in d:
        d["_id"] = str(d["_id"])
    if "user_id" in d and d["user_id"]:
        d["user_id"] = str(d["user_id"])
    
    # ✅ FIX: Remove bytes fields (password_hash) - không trả về password cho client
    fields_to_remove = ["password_hash", "password"]
    for field in fields_to_remove:
        d.pop(field, None)
    
    # ✅ FIX: Convert datetime to ISO string
    for key, value in list(d.items()):
        if isinstance(value, datetime):
            d[key] = value.isoformat()
        elif isinstance(value, date):
            d[key] = value.isoformat()
        elif isinstance(value, bytes):
            # Convert bytes to string or remove
            d.pop(key, None)
    
    return d

def _default_password_from_dob(dob_str: str) -> str:
    """
    dob_str: "dd/mm/yyyy" hoặc ISO "yyyy-mm-dd"
    return: "ddmmyy" (6 số) - VD: "150195" cho 15/01/1995
    """
    if not dob_str:
        return "010170"  # 01/01/1970
    dob_str = dob_str.strip()
    try:
        if "/" in dob_str:
            dt = datetime.strptime(dob_str, "%d/%m/%Y")
        else:
            # "yyyy-mm-dd" hoặc "yyyy-mm-ddTHH:MM:SS"
            dt = datetime.fromisoformat(dob_str[:10])
        return dt.strftime("%d%m%y")  # ✅ Đổi từ %Y thành %y (2 chữ số năm)
    except Exception:
        return "010170"

# ===================== ROUTES =====================

@patient_bp.route("/patients", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['doctor', 'admin'])
def get_patients():
    """Get all patients (default: only active)"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        # ?include_inactive=1|true để lấy cả đã vô hiệu hoá
        include_inactive = str(request.args.get("include_inactive", "")).lower() in ("1", "true", "yes")

        query = {}
        if not include_inactive:
            # Chỉ hiện active (chưa bị xoá mềm)
            query["$and"] = [
                {"$or": [{"is_active": {"$exists": False}}, {"is_active": True}]},
                {"$or": [{"deleted_at": {"$exists": False}}, {"deleted_at": None}]}
            ]

        # ✅ FIX: Không sort theo created_at vì có patient cũ có created_at là string, gây lỗi 500
        # Sort theo _id thay thế (ObjectId chứa timestamp tạo)
        cur = mongo_db.patients.find(query).sort("_id", -1)
        
        # ✅ ADD: Calculate is_online status for each patient
        patients = []
        for p in cur:
            patient_data = as_json(p)
            
            # ✅ Check online status: Try patient's own last_activity first, then user's
            last_activity = p.get("last_activity")  # Check in patients collection first
            
            if not last_activity and p.get("user_id"):
                # Fallback: Check in users collection if user_id exists
                user = mongo_db.users.find_one({"_id": p["user_id"]})
                if user:
                    last_activity = user.get("last_activity")
            
            # Calculate is_online based on last_activity
            if last_activity and isinstance(last_activity, datetime):
                time_diff = (datetime.utcnow() - last_activity).total_seconds()
                patient_data["is_online"] = time_diff < 300  # 5 minutes
            else:
                patient_data["is_online"] = False
            
            patients.append(patient_data)
        
        return jsonify(patients)
    
    except Exception as e:
        # Log error chi tiết
        import traceback
        print("❌ Error in get_patients():")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Error message: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

@patient_bp.route("/patients/<patient_id>", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['doctor', 'admin', 'patient'])
def get_patient_detail(patient_id):
    """Get patient detail by ID"""
    try:
        oid = ObjectId(patient_id)
    except Exception:
        return jsonify({"error": "patient_id không hợp lệ"}), 400

    p = mongo_db.patients.find_one({"_id": oid})
    if not p:
        return jsonify({"error": "Không tìm thấy bệnh nhân"}), 404

    # Thêm thông tin user account nếu có
    result = as_json(p)
    
    # ✅ CHECK ONLINE STATUS: Try patient's own last_activity first, then user's
    last_activity = p.get("last_activity")  # Check in patients collection first
    
    if p.get("user_id"):
        user = mongo_db.users.find_one({"_id": p["user_id"]})
        if user:
            result["has_account"] = True
            result["must_change_password"] = user.get("must_change_password", False)
            
            # Fallback to user's last_activity if patient doesn't have one
            if not last_activity:
                last_activity = user.get("last_activity")
        else:
            result["has_account"] = False
    else:
        result["has_account"] = False
    
    # Calculate is_online based on last_activity (from either collection)
    if last_activity and isinstance(last_activity, datetime):
        time_diff = (datetime.utcnow() - last_activity).total_seconds()
        result["is_online"] = time_diff < 300  # 5 minutes
    else:
        result["is_online"] = False

    return jsonify(result)

@patient_bp.route("/patients", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["POST","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['doctor', 'admin'])
def create_patient():
    """
    ✅ Tạo patient + tự động tạo user account
    Password mặc định = ddmmyyyy từ DOB
    """
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json(force=True) or {}

        # ---- Extract & normalize ----
        name = str((data.get("name") or data.get("full_name") or "")).strip()
        email = str((data.get("email") or "")).strip().lower()
        dob_raw = (data.get("dob") or data.get("date_of_birth") or "")
        dob = str(dob_raw).strip() if dob_raw is not None else ""
        mrn = str((data.get("mrn") or "")).strip()

        # ✅ AUTO-GENERATE MRN if not provided
        if not mrn:
            mrn = generate_mrn()
            print(f"✅ Auto-generated MRN: {mrn}")

        if not name:
            return jsonify({"error": "Thiếu họ tên"}), 400
        if not email:
            return jsonify({"error": "Thiếu email"}), 400
        if not dob:
            return jsonify({"error": "Thiếu ngày sinh"}), 400

        # ---- MRN duplicate ----
        if mongo_db.patients.find_one({"mrn": mrn, "is_active": {"$ne": False}}):
            return jsonify({"error": "MRN đã tồn tại"}), 409

        # ---- Email duplicate trong patients (chặn trước khi insert) ----
        existing_patient = mongo_db.patients.find_one({"email": email, "is_active": {"$ne": False}})
        if existing_patient:
            return jsonify({"error": "Email đã tồn tại cho một bệnh nhân khác"}), 409

        # ---- User account (email unique) ----
        user_id = None
        existing_user = mongo_db.users.find_one({"email": email})

        if not existing_user:
            # tạo user mới với mật khẩu mặc định = dob
            raw_pwd = _default_password_from_dob(dob)
            pwd_hash = bcrypt.hashpw(raw_pwd.encode("utf-8"), bcrypt.gensalt())
            pwd_hash_str = pwd_hash.decode("utf-8") if isinstance(pwd_hash, (bytes, bytearray)) else str(pwd_hash)

            user_doc = {
                "email": email,
                "name": name,
                "role": "patient",
                "password_hash": pwd_hash_str,
                "must_change_password": True,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            try:
                user_id = mongo_db.users.insert_one(user_doc).inserted_id
            except DuplicateKeyError:
                # Phòng race-condition unique index users.email
                return jsonify({"error": "Email đã tồn tại cho một tài khoản khác"}), 409
        else:
            if existing_user.get("role") != "patient":
                return jsonify({"error": "Email đã dùng cho tài khoản khác"}), 409
            user_id = existing_user["_id"]

        # ---- emergency_contact & insurance ----
        _ec_in = data.get("emergency_contact") or {}
        ins_in = data.get("insurance") or {}
        if not isinstance(_ec_in, dict):
            _ec_in = {}
        if not isinstance(ins_in, dict):
            ins_in = {}

        emergency_contact = {
            "name": str((_ec_in.get("name") or "")).strip(),
            "phone": str((_ec_in.get("phone") or "")).strip(),
            "relationship": str((_ec_in.get("relationship") or "")).strip(),
        }
        if emergency_contact["phone"] and not PHONE_VN.match(emergency_contact["phone"]):
            return jsonify({"error": "SĐT khẩn cấp không hợp lệ"}), 400

        insurance = {
            "provider": str((ins_in.get("provider") or "")).strip(),
            "number": str((ins_in.get("number") or "")).strip(),
            "expiry_date": _parse_iso_date_or_none(ins_in.get("expiry_date") or ""),
        }

        # ---- Patient document - EHR đầy đủ theo chuẩn y khoa ----
        patient_doc = {
            # ===== THÔNG TIN HÀNH CHÍNH =====
            "mrn": mrn,
            "full_name": name,
            "name": name,
            "email": email,
            "dob": dob,
            "date_of_birth": dob,  # alias
            "gender": data.get("gender", "male"),
            "phone": data.get("phone", ""),
            "address": data.get("address", ""),
            "citizen_id": data.get("citizen_id", ""),  # CCCD/CMND
            "insurance_bhyt": data.get("insurance_bhyt", ""),  # Số thẻ BHYT
            "occupation": data.get("occupation", ""),  # Nghề nghiệp
            
            # ===== TIỀN SỬ & THÓI QUEN (Patient tự điền) =====
            "medical_history": data.get("medical_history", ""),  # Tiền sử bệnh lý
            "chronic_conditions": data.get("chronic_conditions", ""),  # Bệnh mãn tính
            "past_surgeries": data.get("past_surgeries", ""),  # Phẫu thuật đã qua
            
            # Dị ứng (chi tiết: thuốc/thực phẩm/môi trường)
            "allergies": data.get("allergies", []),  # legacy array
            "allergies_medications": data.get("allergies_medications", ""),
            "allergies_food": data.get("allergies_food", ""),
            "allergies_environment": data.get("allergies_environment", ""),  # Phấn hoa, bụi...
            
            "current_medications": data.get("current_medications", ""),  # Thuốc đang dùng
            "vaccination_history": data.get("vaccination_history", ""),  # Lịch sử tiêm chủng
            "family_history": data.get("family_history", ""),  # Tiền sử gia đình
            
            # Thói quen sống
            "smoking_status": data.get("smoking_status", ""),  # never/former/current
            "alcohol_consumption": data.get("alcohol_consumption", ""),  # never/occasional/regular
            "exercise_frequency": data.get("exercise_frequency", ""),  # never/rarely/sometimes/often/daily
            
            # ===== DẤU HIỆU SINH TỒN (Vital Signs) - Patient có thể tự cập nhật =====
            "vital_signs": data.get("vital_signs", {
                "date": None,  # Ngày đo
                "blood_pressure_systolic": None,  # Huyết áp tâm thu (mmHg)
                "blood_pressure_diastolic": None,  # Huyết áp tâm trương (mmHg)
                "heart_rate": None,  # Nhịp tim (lần/phút)
                "temperature": None,  # Nhiệt độ (°C)
                "respiratory_rate": None,  # Nhịp thở (lần/phút)
                "spo2": None,  # SpO2 (%)
                "height": data.get("height"),  # Chiều cao (cm)
                "weight": data.get("weight"),  # Cân nặng (kg)
                "bmi": None  # BMI (tự tính)
            }),
            
            # ===== LÝ DO KHÁM / TRIỆU CHỨNG (Chief Complaint) - Patient điền =====
            "chief_complaint": data.get("chief_complaint", {
                "onset_date": None,  # Thời điểm khởi phát
                "main_symptom": "",  # Triệu chứng chính
                "associated_symptoms": "",  # Triệu chứng kèm theo
                "pain_scale": None,  # Mức độ đau (0-10)
                "aggravating_factors": "",  # Yếu tố làm tăng
                "relieving_factors": ""  # Yếu tố làm giảm
            }),
            
            # ===== KHÁM LÂM SÀNG (Clinical Examination) - BÁC SĨ điền =====
            "clinical_examination": data.get("clinical_examination", {
                "general": "",  # Toàn thân
                "respiratory": "",  # Hô hấp
                "cardiovascular": "",  # Tim mạch
                "gastrointestinal": "",  # Tiêu hóa
                "musculoskeletal": "",  # Cơ xương khớp
                "neurological": "",  # Thần kinh
                "skin": ""  # Da - niêm mạc
            }),
            
            # ===== CẬN LÂM SÀNG (Diagnostic Tests) - BÁC SĨ điền =====
            "diagnostic_tests": data.get("diagnostic_tests", {
                "blood_count": "",  # Công thức máu
                "liver_function": "",  # Men gan (AST/ALT)
                "blood_glucose": "",  # Đường huyết / HbA1c
                "kidney_function": "",  # Chức năng thận (Creatinine)
                "lipid_profile": "",  # Lipid máu (LDL/HDL/TG)
                "imaging": []  # Chẩn đoán hình ảnh: [{type, date, result, files}]
            }),
            
            # ===== CHẨN ĐOÁN (ICD-10) - BÁC SĨ điền =====
            "diagnosis": data.get("diagnosis", {
                "icd10_code": "",  # Mã ICD-10
                "disease_name": "",  # Tên bệnh
                "notes": ""  # Ghi chú
            }),
            
            # ===== ĐIỀU TRỊ (Treatment) - BÁC SĨ điền =====
            "treatment": data.get("treatment", {
                "medications": [],  # [{name, dosage, frequency, duration, instructions}]
                "additional_tests": "",  # Chỉ định xét nghiệm bổ sung
                "follow_up_date": None,  # Hẹn tái khám
                "follow_up_notes": ""  # Ghi chú tái khám
            }),
            
            # ===== GHI CHÚ BÁC SĨ / TƯ VẤN - BÁC SĨ điền =====
            "doctor_notes": data.get("doctor_notes", {
                "lifestyle_advice": "",  # Khuyến nghị chế độ ăn - ngủ - vận động
                "warning_signs": "",  # Dấu hiệu cần quay lại ngay
                "general_notes": ""  # Ghi chú chung
            }),
            
            # ===== LEGACY FIELDS (tương thích ngược) =====
            "blood_type": data.get("blood_type", ""),
            "height": data.get("height"),
            "height_cm": data.get("height_cm") or data.get("height"),
            "weight": data.get("weight"),
            "weight_kg": data.get("weight_kg") or data.get("weight"),
            "comorbidities": data.get("comorbidities", []),
            
            # ===== NESTED OBJECTS =====
            "emergency_contact": emergency_contact,
            "insurance": insurance,
            
            # ===== METADATA =====
            "notes": data.get("notes", ""),
            "status": data.get("status", "Đang theo dõi"),
            "is_active": data.get("is_active", True),
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Insert patients + bắt DuplicateKeyError (unique index email/mrn nếu có)
        try:
            pid = mongo_db.patients.insert_one(patient_doc).inserted_id
        except DuplicateKeyError as e:
            # Phân biệt lỗi theo key
            msg = str(e)
            if "email" in msg:
                return jsonify({"error": "Email đã tồn tại cho một bệnh nhân khác"}), 409
            if "mrn" in msg:
                return jsonify({"error": "MRN đã tồn tại"}), 409
            return jsonify({"error": "Dữ liệu trùng lặp"}), 409

        # ✅ Emit socket event for real-time update
        try:
            from app.extensions import socketio
            socketio.emit("patient_created", {
                "patient_id": str(pid),
                "mrn": mrn,
                "name": name,
                "email": email,
                "timestamp": datetime.utcnow().isoformat() + 'Z'
            })
            print(f"📡 Socket: patient_created - {mrn}")
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")

        # ---- return OK (không trả password) ----
        return jsonify({
            "id": str(pid),
            "user_id": str(user_id),
            "mrn": mrn,
            "full_name": name,
            "email": email,
            "must_change_password": True,
            "message": "Đã tạo bệnh nhân & tài khoản (mật khẩu mặc định = ngày sinh ddmmyy)"
        }), 201

    except Exception as e:
        import traceback
        print("Create patient error:", e)
        traceback.print_exc()
        return jsonify({"error": "Lỗi hệ thống khi tạo bệnh nhân"}), 500


@patient_bp.route("/patients/<patient_id>", methods=["PATCH", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["PATCH","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['doctor', 'admin', 'patient'])
def update_patient(patient_id):
    """Update patient - ❌ KHÔNG CHO SỬA EMAIL
    ✅ Patient có thể tự cập nhật thông tin của mình
    """
    # 1) Parse ID
    try:
        oid = ObjectId(patient_id)
    except Exception:
        return jsonify({"error": "patient_id không hợp lệ"}), 400

    # 2) Lấy body
    data = request.get_json(force=True) or {}

    # 3) Tìm patient hiện có
    p = mongo_db.patients.find_one({"_id": oid})
    if not p:
        return jsonify({"error": "Không tìm thấy bệnh nhân"}), 404

    # ✅ 4) Authorization check: Patient chỉ được sửa thông tin của chính họ, Admin có quyền cao nhất
    current_user = getattr(g, "user", {}) or {}
    current_role = current_user.get("role")
    current_user_id = current_user.get("user_id") or current_user.get("sub")
    
    # ✅ Admin có quyền chỉnh sửa mọi thông tin, kể cả email
    is_admin = current_role == "admin"
    
    if current_role == "patient" and not is_admin:
        # Patient chỉ được cập nhật thông tin của chính họ
        patient_user_id = p.get("user_id")
        
        # Convert to string for comparison
        patient_user_id_str = str(patient_user_id) if patient_user_id else None
        current_user_id_str = str(current_user_id) if current_user_id else None
        
        if patient_user_id_str != current_user_id_str:
            return jsonify({"error": "Bạn chỉ có thể cập nhật thông tin của chính mình"}), 403
        
        # ❌ Patient không được sửa email
        if "email" in data:
            data.pop("email")
    # ✅ Admin có thể sửa email - không cần pop

    # 4) White-list field mức 1 (tránh ghi rác) - EHR đầy đủ theo chuẩn y khoa
    allowed = {
        # ===== THÔNG TIN HÀNH CHÍNH =====
        "full_name", "name", "gender", "dob", "date_of_birth", "phone", "address",
        "mrn", "status", "is_active", "notes",
        "citizen_id",        # CCCD/CMND
        "occupation",        # Nghề nghiệp
        "insurance_bhyt",    # Số thẻ BHYT
        
        # ===== TIỀN SỬ & THÓI QUEN =====
        "medical_history", "chronic_conditions", "past_surgeries",
        "allergies", "allergies_medications", "allergies_food", "allergies_environment",
        "current_medications",
        "vaccination_history",
        "family_history",
        "smoking_status", "alcohol_consumption", "exercise_frequency",
        
        # ===== DẤU HIỆU SINH TỒN =====
        "vital_signs",  # nested object
        
        # ===== LÝ DO KHÁM / TRIỆU CHỨNG =====
        "chief_complaint",  # nested object
        
        # ===== KHÁM LÂM SÀNG (Bác sĩ điền) =====
        "clinical_examination",  # nested object
        
        # ===== CẬN LÂM SÀNG (Bác sĩ điền) =====
        "diagnostic_tests",  # nested object
        
        # ===== CHẨN ĐOÁN (Bác sĩ điền) =====
        "diagnosis",  # nested object
        
        # ===== ĐIỀU TRỊ (Bác sĩ điền) =====
        "treatment",  # nested object
        
        # ===== GHI CHÚ BÁC SĨ =====
        "doctor_notes",  # nested object
        
        # ===== LEGACY FIELDS =====
        "blood_type", "height", "height_cm", "weight", "weight_kg",
        "comorbidities",
        
        # ===== NESTED OBJECTS =====
        "emergency_contact", "insurance"
    }

    # 5) Gom các field đơn giản (trừ các nested objects)
    updates = {
        k: v for k, v in data.items()
        if k in allowed
        and k not in {
            "emergency_contact", "insurance", 
            "vital_signs", "chief_complaint", "clinical_examination",
            "diagnostic_tests", "diagnosis", "treatment", "doctor_notes"
        }
        and v is not None
    }
    
    # 6) Cập nhật nested objects - vital_signs
    if isinstance(data.get("vital_signs"), dict):
        vs = data["vital_signs"]
        for key in ["date", "blood_pressure_systolic", "blood_pressure_diastolic", 
                    "heart_rate", "temperature", "respiratory_rate", "spo2", "height", "weight", "bmi"]:
            if key in vs:
                updates[f"vital_signs.{key}"] = vs[key]
    
    # 7) Cập nhật nested objects - chief_complaint
    if isinstance(data.get("chief_complaint"), dict):
        cc = data["chief_complaint"]
        for key in ["onset_date", "main_symptom", "associated_symptoms", 
                    "pain_scale", "aggravating_factors", "relieving_factors"]:
            if key in cc:
                updates[f"chief_complaint.{key}"] = cc[key]
    
    # 8) Cập nhật nested objects - clinical_examination (Bác sĩ)
    if isinstance(data.get("clinical_examination"), dict):
        ce = data["clinical_examination"]
        for key in ["general", "respiratory", "cardiovascular", "gastrointestinal",
                    "musculoskeletal", "neurological", "skin"]:
            if key in ce:
                updates[f"clinical_examination.{key}"] = ce[key]
    
    # 9) Cập nhật nested objects - diagnostic_tests (Bác sĩ)
    if isinstance(data.get("diagnostic_tests"), dict):
        dt = data["diagnostic_tests"]
        for key in ["blood_count", "liver_function", "blood_glucose", 
                    "kidney_function", "lipid_profile", "imaging"]:
            if key in dt:
                updates[f"diagnostic_tests.{key}"] = dt[key]
    
    # 10) Cập nhật nested objects - diagnosis (Bác sĩ)
    if isinstance(data.get("diagnosis"), dict):
        dg = data["diagnosis"]
        for key in ["icd10_code", "disease_name", "notes"]:
            if key in dg:
                updates[f"diagnosis.{key}"] = dg[key]
    
    # 11) Cập nhật nested objects - treatment (Bác sĩ)
    if isinstance(data.get("treatment"), dict):
        tm = data["treatment"]
        for key in ["medications", "additional_tests", "follow_up_date", "follow_up_notes"]:
            if key in tm:
                updates[f"treatment.{key}"] = tm[key]
    
    # 12) Cập nhật nested objects - doctor_notes (Bác sĩ)
    if isinstance(data.get("doctor_notes"), dict):
        dn = data["doctor_notes"]
        for key in ["lifestyle_advice", "warning_signs", "general_notes"]:
            if key in dn:
                updates[f"doctor_notes.{key}"] = dn[key]

    # 13) Cập nhật từng phần cho emergency_contact
    if isinstance(data.get("emergency_contact"), dict):
        ec = data["emergency_contact"]
        if "name" in ec:
            updates["emergency_contact.name"] = (ec.get("name") or "").strip()
        if "phone" in ec:
            phone_val = (ec.get("phone") or "").strip()
            if phone_val and not PHONE_VN.match(phone_val):
                return jsonify({"error": "SĐT khẩn cấp không hợp lệ"}), 400
            updates["emergency_contact.phone"] = phone_val
        if "relationship" in ec:
            updates["emergency_contact.relationship"] = (ec.get("relationship") or "").strip()

    # 14) Cập nhật từng phần cho insurance (parse expiry)
    if isinstance(data.get("insurance"), dict):
        ins = data["insurance"]
        if "provider" in ins:
            updates["insurance.provider"] = (ins.get("provider") or "").strip()
        if "number" in ins:
            updates["insurance.number"] = (ins.get("number") or "").strip()
        if "expiry_date" in ins:
            updates["insurance.expiry_date"] = _parse_iso_date_or_none(ins.get("expiry_date") or "")

    if not updates:
        return jsonify({"error": "No valid fields"}), 400

    # 15) Đóng dấu thời gian & update
    updates["updated_at"] = datetime.utcnow()
    mongo_db.patients.update_one({"_id": oid}, {"$set": updates})

    # 16) Đồng bộ tên sang users nếu đổi
    if p.get("user_id") and (("name" in data) or ("full_name" in data)):
        new_name = (data.get("full_name") or data.get("name") or "").strip()
        if new_name:
            mongo_db.users.update_one(
                {"_id": p["user_id"]},
                {"$set": {"name": new_name, "updated_at": datetime.utcnow()}}
            )

    # ✅ Emit socket event for real-time update
    try:
        from app.extensions import socketio
        socketio.emit("patient_updated", {
            "patient_id": patient_id,
            "mrn": p.get("mrn"),
            "name": updates.get("full_name") or updates.get("name") or p.get("full_name"),
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        })
        print(f"📡 Socket: patient_updated - {patient_id}")
    except Exception as socket_err:
        print(f"⚠️ Socket emit error: {socket_err}")

    # 17) Trả về bản mới    # 10) Trả về bản mới
    new_p = mongo_db.patients.find_one({"_id": oid})
    return jsonify(as_json(new_p))

@patient_bp.route("/patients/<patient_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["DELETE","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(roles=["admin"])  # ✅ CHỈ ADMIN MỚI ĐƯỢC XÓA
def delete_patient(patient_id):                     
    if request.method == "OPTIONS":
        return "", 204

    from bson import ObjectId
    try:
        oid = ObjectId(patient_id)                  
    except Exception:
        return jsonify({"error": "ID không hợp lệ"}), 400

    patient = mongo_db.patients.find_one({"_id": oid})
    if not patient:
        return jsonify({"error": "Không tìm thấy bệnh nhân"}), 404

    # ✅ HARD DELETE - Xóa hoàn toàn khỏi database
    patient_email = patient.get("email")
    patient_user_id = patient.get("user_id")
    
    # 1. Xóa user account nếu có (từ users collection)
    if patient_user_id:
        try:
            user_oid = ObjectId(patient_user_id) if isinstance(patient_user_id, str) else patient_user_id
            mongo_db.users.delete_one({"_id": user_oid})
            print(f"✅ Deleted user account: {patient_user_id}")
        except Exception as e:
            print(f"⚠️ Error deleting user account: {e}")
    
    # 2. Xóa user account theo email (nếu không có user_id nhưng có email trùng)
    if patient_email:
        try:
            mongo_db.users.delete_many({"email": patient_email.lower().strip()})
            print(f"✅ Deleted user accounts with email: {patient_email}")
        except Exception as e:
            print(f"⚠️ Error deleting user by email: {e}")
    
    # 3. Xóa patient record
    result = mongo_db.patients.delete_one({"_id": oid})
    
    if result.deleted_count == 0:
        return jsonify({"error": "Không thể xóa bệnh nhân"}), 500
    
    # ✅ Emit socket event for real-time update
    try:
        from app.extensions import socketio
        socketio.emit("patient_deleted", {
            "patient_id": patient_id,
            "mrn": patient.get("mrn"),
            "name": patient.get("full_name"),
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        })
        print(f"📡 Socket: patient_deleted - {patient_id}")
    except Exception as socket_err:
        print(f"⚠️ Socket emit error: {socket_err}")
    
    return jsonify({"message": "Đã xóa bệnh nhân hoàn toàn khỏi database"})

# ================== Other endpoints ==================

@patient_bp.route("/appointments/patient", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['patient'])
def get_patient_appointments():
    """Get appointments for logged-in patient"""
    user_claims = getattr(g, "user", {}) or {}
    patient_id_raw = user_claims.get("sub") or user_claims.get("user_id")

    if not patient_id_raw:
        return jsonify({"error": "Thiếu patient ID trong token"}), 400

    try:
        pid_oid = ObjectId(patient_id_raw)
    except Exception:
        pid_oid = None

    # ✅ Tăng limit mặc định lên 1000 để hiển thị tất cả lịch khám
    limit = int(request.args.get("limit", 1000))
    query = {"$or": [{"patient_id": patient_id_raw}]}
    if pid_oid:
        query["$or"].append({"patient_id": pid_oid})

    cur = mongo_db.appointments.find(query).sort([("date", -1), ("time", -1)]).limit(limit)

    def to_doc(a):
        return {
            "id": str(a.get("_id")),
            "date": a.get("date"),
            "time": a.get("time"),
            "status": a.get("status", "PENDING"),
            "type": a.get("type"),
            "reason": a.get("reason"),
            "doctor": {
                "id": str(a.get("doctor_id")) if a.get("doctor_id") else None,
                "name": a.get("doctor_name"),
                "specialty": a.get("doctor_specialty"),
            }
        }

    return jsonify([to_doc(x) for x in cur])

@patient_bp.route("/specialties", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
def get_specialties():
    """Public endpoint - get specialties list"""
    try:
        cur = mongo_db.specialties.find(
            {"code": {"$in": ["general_medicine", "obstetrics", "pediatrics"]}}, 
            {"_id": 0}
        ).sort("name", 1)
        items = list(cur)
        if not items:
            items = [
                {"code": "general_medicine", "name": "Nội tổng quát", "icon": "🩺"},
                {"code": "obstetrics", "name": "Sản phụ khoa", "icon": "🤰"},
                {"code": "pediatrics", "name": "Nhi khoa", "icon": "👶"},
            ]
        return jsonify(items)
    except Exception:
        return jsonify([
            {"code": "general_medicine", "name": "Nội tổng quát", "icon": "🩺"},
            {"code": "obstetrics", "name": "Sản phụ khoa", "icon": "🤰"},
            {"code": "pediatrics", "name": "Nhi khoa", "icon": "👶"},
        ])


@patient_bp.route("/patients/my-patients", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['doctor'])
def get_my_patients():
    """
    Lấy danh sách bệnh nhân đã đặt lịch với doctor này
    Query params:
        - doctor_id: ID của doctor (optional - will use current user's ID)
    """
    print(f"\n{'='*60}")
    print(f"🔍 GET MY PATIENTS - START")
    print(f"   Method: {request.method}")
    print(f"{'='*60}")
    
    if request.method == "OPTIONS":
        print(f"   Handling OPTIONS request")
        return jsonify({"status": "ok"}), 200
    
    # ✅ FIX: Đổi từ g.user sang g.current_user (đúng với auth middleware)
    user_claims = getattr(g, "current_user", {}) or {}
    user_id = user_claims.get("user_id")
    
    print(f"   user_claims: {user_claims}")
    print(f"   user_id: {user_id}")
    
    if not user_id:
        print(f"   ❌ No user_id found!")
        return jsonify({"error": "Không thể xác định user_id"}), 400
    
    # ✅ FIX: Tìm doctor record bằng user_id
    try:
        print(f"   Looking for doctor with user_id: {user_id}")
        doctor = mongo_db.doctors.find_one({"user_id": ObjectId(user_id)})
        
        if not doctor:
            print(f"   ❌ Doctor not found for user_id: {user_id}")
            return jsonify({"error": "Không tìm thấy thông tin bác sĩ"}), 404
        
        doctor_oid = doctor["_id"]
        print(f"   ✅ Doctor found: {doctor.get('full_name')}, _id: {doctor_oid}")
    except Exception as e:
        print(f"   ❌ Exception finding doctor: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Lỗi: {str(e)}"}), 400
    
    print(f"\n{'='*60}")
    print(f"📋 GET MY PATIENTS")
    print(f"   user_id (from token): {user_id}")
    print(f"   doctor_id (from doctors collection): {doctor_oid}")
    print(f"{'='*60}")
    
    try:
        # ✅ FIX: Appointments lưu doctors._id trong doctor_id field
        # Nên dùng doctor_oid (doctors._id) để query, không phải user_id (users._id)
        print(f"   🔍 Querying appointments with doctor_id: {doctor_oid}")
        
        # Debug: Check all appointments first
        all_appointments = list(mongo_db.appointments.find().limit(5))
        print(f"   📋 Sample appointments (first 5):")
        for apt in all_appointments:
            print(f"      - _id: {apt.get('_id')}, doctor_id: {apt.get('doctor_id')} (type: {type(apt.get('doctor_id')).__name__})")
        
        # ✅ Query by doctor_oid (doctors._id which is stored in appointment's doctor_id field)
        appointments = list(mongo_db.appointments.find({"doctor_id": doctor_oid}))
        
        print(f"   ✅ Found {len(appointments)} appointments")
        
        # Lấy unique patient_ids từ appointments
        patient_ids = set()
        for apt in appointments:
            pid = apt.get("patient_id")
            if pid:
                # Ensure it's ObjectId
                if isinstance(pid, ObjectId):
                    patient_ids.add(pid)
                elif isinstance(pid, str):
                    try:
                        patient_ids.add(ObjectId(pid))
                    except Exception as e:
                        print(f"   ⚠️  Invalid patient_id: {pid} - {e}")
        
        patient_ids = list(patient_ids)
        print(f"   Found {len(patient_ids)} unique patients")
        
        if not patient_ids:
            print(f"   ℹ️  No patients found")
            return jsonify([]), 200
        
        # Lấy thông tin bệnh nhân
        patients = list(mongo_db.patients.find({"_id": {"$in": patient_ids}}))
        
        print(f"   Retrieved {len(patients)} patient records")
        
        # Format response
        result = []
        for p in patients:
            result.append({
                "_id": str(p["_id"]),
                "mrn": p.get("mrn"),
                "full_name": p.get("full_name"),
                "date_of_birth": p.get("date_of_birth"),
                "gender": p.get("gender"),
                "phone": p.get("phone"),
                "email": p.get("email"),
                "address": p.get("address"),
                "medical_history": p.get("medical_history"),
                "allergies_medications": p.get("allergies_medications"),
                "created_at": p.get("created_at"),
            })
        
        print(f"✅ Returning {len(result)} patients")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Error getting my patients: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Lỗi khi lấy danh sách bệnh nhân"}), 500


@patient_bp.route("/patients/<patient_id>/health-score", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:5173"],
    supports_credentials=True,
    methods=["GET","OPTIONS"],
    allow_headers=["Content-Type","Authorization"]
)
@auth_required(['patient', 'doctor', 'admin'])
def get_health_score(patient_id):
    """
    Tính điểm sức khỏe của bệnh nhân (0-100)
    Dựa trên:
    - Tần suất khám bệnh (6 tháng gần đây)
    - Tỷ lệ hoàn thành appointment
    - Thông tin profile đầy đủ
    - Có bệnh mãn tính hay không
    - Các chỉ số sức khỏe từ EHR records
    """
    if request.method == "OPTIONS":
        return "", 204
    
    try:
        user = g.current_user
        patient_oid = ObjectId(patient_id)
        
        # Check authorization: patient can only see their own score
        if user["role"] == "patient":
            user_patient_id = user.get("patient_id") or user.get("user_id")
            if str(user_patient_id) != patient_id:
                return jsonify({"error": "Bạn không có quyền xem điểm sức khỏe này"}), 403
        
        # Get patient info
        patient = mongo_db.patients.find_one({"_id": patient_oid})
        if not patient:
            return jsonify({"error": "Không tìm thấy bệnh nhân"}), 404
        
        score = 0
        max_score = 100
        details = {}
        
        # 1. Profile completion (30 points)
        profile_score = 0
        if patient.get("full_name"):
            profile_score += 5
        if patient.get("date_of_birth") or patient.get("dob"):
            profile_score += 5
        if patient.get("phone"):
            profile_score += 5
        if patient.get("address"):
            profile_score += 5
        if patient.get("blood_type") or patient.get("blood_group"):
            profile_score += 5
        if patient.get("emergency_contact") and patient.get("emergency_contact", {}).get("name"):
            profile_score += 5
        
        score += profile_score
        details["profile_completion"] = profile_score
        
        # 2. Appointment frequency (6 months) - 30 points
        six_months_ago = datetime.utcnow()
        six_months_ago = six_months_ago.replace(month=six_months_ago.month - 6)
        
        recent_appointments = list(mongo_db.appointments.find({
            "patient_id": patient_oid,
            "date": {"$gte": six_months_ago.isoformat()},
            "status": {"$ne": "cancelled"}
        }))
        
        appointment_count = len(recent_appointments)
        # 0-1 visits: 5 points, 2-3: 15 points, 4-5: 25 points, 6+: 30 points
        if appointment_count == 0:
            appointment_score = 5
        elif appointment_count <= 1:
            appointment_score = 10
        elif appointment_count <= 3:
            appointment_score = 20
        elif appointment_count <= 5:
            appointment_score = 25
        else:
            appointment_score = 30
        
        score += appointment_score
        details["appointment_frequency"] = appointment_score
        details["recent_appointments"] = appointment_count
        
        # 3. Appointment completion rate - 20 points
        all_appointments = list(mongo_db.appointments.find({"patient_id": patient_oid}))
        if all_appointments:
            completed_count = sum(1 for apt in all_appointments 
                                 if (apt.get("status") or "").lower() == "completed")
            completion_rate = completed_count / len(all_appointments)
            # 0-50%: 5 points, 50-70%: 10 points, 70-90%: 15 points, 90%+: 20 points
            if completion_rate >= 0.9:
                completion_score = 20
            elif completion_rate >= 0.7:
                completion_score = 15
            elif completion_rate >= 0.5:
                completion_score = 10
            else:
                completion_score = 5
        else:
            completion_score = 10  # Default for new patients
            completion_rate = 0
        
        score += completion_score
        details["appointment_completion"] = completion_score
        details["completion_rate"] = round(completion_rate * 100, 1)
        
        # 4. Chronic conditions - 10 points (negative if has serious conditions)
        chronic_conditions = patient.get("chronic_conditions") or patient.get("medical_history", "")
        if chronic_conditions:
            # Check for serious conditions
            serious_keywords = ["tiểu đường", "đái tháo đường", "cao huyết áp", "tim mạch", 
                              "ung thư", "suy thận", "suy gan", "hiv", "aids"]
            has_serious = any(keyword.lower() in str(chronic_conditions).lower() 
                            for keyword in serious_keywords)
            if has_serious:
                chronic_score = 5  # Reduced score
            else:
                chronic_score = 10  # Has conditions but not serious
        else:
            chronic_score = 10  # No chronic conditions = good
        
        score += chronic_score
        details["chronic_conditions"] = chronic_score
        
        # 5. EHR records quality - 10 points
        ehr_records = list(mongo_db.ehr_records.find({"patient_id": patient_oid}).limit(10))
        if ehr_records:
            # Check if records have vital signs or important data
            has_vitals = any(
                record.get("vital_signs") or 
                record.get("blood_pressure") or 
                record.get("weight") or 
                record.get("height")
                for record in ehr_records
            )
            if has_vitals:
                ehr_score = 10
            else:
                ehr_score = 5
        else:
            ehr_score = 0  # No records
        
        score += ehr_score
        details["ehr_quality"] = ehr_score
        details["ehr_records_count"] = len(ehr_records)
        
        # Ensure score is between 0-100
        final_score = max(0, min(100, score))
        
        # Determine health status
        if final_score >= 80:
            status = "Tuyệt vời"
            status_color = "success"
        elif final_score >= 60:
            status = "Tốt"
            status_color = "processing"
        elif final_score >= 40:
            status = "Trung bình"
            status_color = "warning"
        else:
            status = "Cần cải thiện"
            status_color = "error"
        
        return jsonify({
            "data": {
                "health_score": final_score,
                "status": status,
                "status_color": status_color,
                "details": details,
                "recommendations": _get_health_recommendations(final_score, details)
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error calculating health score: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Lỗi khi tính điểm sức khỏe"}), 500


def _get_health_recommendations(score, details):
    """Generate health recommendations based on score and details"""
    recommendations = []
    
    if details.get("profile_completion", 0) < 25:
        recommendations.append("Hoàn thiện thông tin hồ sơ để có đánh giá chính xác hơn")
    
    if details.get("recent_appointments", 0) < 2:
        recommendations.append("Khám sức khỏe định kỳ để theo dõi tình trạng sức khỏe")
    
    if details.get("completion_rate", 100) < 70:
        recommendations.append("Tuân thủ lịch khám đã đặt để đảm bảo điều trị hiệu quả")
    
    if details.get("ehr_records_count", 0) == 0:
        recommendations.append("Lưu trữ hồ sơ bệnh án để theo dõi lịch sử sức khỏe")
    
    if score >= 80:
        recommendations.append("Duy trì thói quen chăm sóc sức khỏe tốt hiện tại")
    elif score >= 60:
        recommendations.append("Tiếp tục cải thiện để đạt điểm sức khỏe tốt hơn")
    else:
        recommendations.append("Cần chú ý nhiều hơn đến sức khỏe và tuân thủ điều trị")
    
    return recommendations