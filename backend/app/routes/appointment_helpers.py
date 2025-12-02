from bson import ObjectId
from datetime import datetime
from app.extensions import mongo_db

def detect_patient_oid(user_ctx):
    """
    Phát hiện patient_oid từ JWT context
    Returns: (patient_oid, error_message)
    """
    user_id_str = user_ctx.get("user_id") or user_ctx.get("sub")
    collection = user_ctx.get("collection")
    claim_patient_id = user_ctx.get("patient_id")
    
    try:
        user_oid = ObjectId(user_id_str)
    except Exception:
        return None, "Token không hợp lệ"
    
    patient_oid = None
    
    # a) Nếu login bằng patients collection → user_id là patient._id
    if collection == "patients":
        patient_oid = user_oid
    
    # b) Nếu có patient_id trong claim
    if not patient_oid and claim_patient_id:
        try:
            patient_oid = ObjectId(claim_patient_id)
        except Exception:
            pass
    
    # c) Tra users collection theo quan hệ
    if not patient_oid:
        user_rec = mongo_db.users.find_one({"_id": user_oid})
        if user_rec and user_rec.get("patient_id"):
            try:
                patient_oid = ObjectId(user_rec["patient_id"])
            except Exception:
                pass
    
    # d) Fallback: tìm patient bằng user_id hoặc email
    if not patient_oid:
        p = mongo_db.patients.find_one({"user_id": user_oid}) \
            or mongo_db.patients.find_one({"email": user_ctx.get("email")})
        if p:
            patient_oid = p["_id"]
    
    if not patient_oid:
        return None, "Thiếu hồ sơ bệnh nhân"
    
    return patient_oid, None


def check_slot_expired(slot):
    """
    Kiểm tra slot đã hết hạn chưa
    Returns: is_expired (bool)
    """
    try:
        slot_date = slot.get("date")  # YYYY-MM-DD
        slot_time = slot.get("start_time")  # HH:MM
        
        if not slot_date or not slot_time:
            return False
        
        slot_datetime = datetime.strptime(f"{slot_date} {slot_time}", "%Y-%m-%d %H:%M")
        now_utc = datetime.utcnow()
        
        return slot_datetime < now_utc
    except Exception:
        return False


def convert_objectids_to_str(doc):
    """
    Convert tất cả ObjectId và datetime trong document thành string
    """
    from datetime import datetime
    
    for key, value in list(doc.items()):
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, datetime):
            # Convert datetime to YYYY-MM-DD for date fields, ISO string for others
            if key in ['date', 'appointment_date', 'slot_date']:
                doc[key] = value.strftime("%Y-%m-%d")
            else:
                doc[key] = value.isoformat() + "Z"
    return doc


def get_specialty_name(specialty_code):
    """
    Map specialty code to Vietnamese name
    ✅ SYNCHRONIZED with frontend: frontend-dashboard/src/constants/specialtyConstants.js
    """
    specialty_map = {
        "general_medicine": "Nội tổng quát",
        "obstetrics": "Sản phụ khoa",
        "pediatrics": "Nhi khoa",
        "cardiology": "Tim mạch",
        "dermatology": "Da liễu",
        "neurology": "Thần kinh",
        "orthopedics": "Chấn thương chỉnh hình",
        "ophthalmology": "Mắt",
        "ent": "Tai mũi họng",
        "dentistry": "Nha khoa",
        "psychiatry": "Tâm thần",
        "surgery": "Phẫu thuật",
        "urology": "Tiết niệu",
        "gastroenterology": "Tiêu hóa",
        "pulmonology": "Hô hấp",
        "endocrinology": "Nội tiết",
        "rheumatology": "Khớp",
        "oncology": "Ung bướu",
        "radiology": "Chẩn đoán hình ảnh",
        "anesthesiology": "Gây mê hồi sức",
    }
    return specialty_map.get(specialty_code, specialty_code or "Đa khoa")


def populate_doctor_info(doctor_id):
    """
    Lấy thông tin doctor từ doctors hoặc users collection
    """
    doctor = mongo_db.doctors.find_one({"_id": ObjectId(doctor_id)}) \
          or mongo_db.users.find_one({"_id": ObjectId(doctor_id), "role": "doctor"})
    
    if doctor:
        specialty_code = doctor.get("specialization") or doctor.get("specialty") or doctor.get("doctor_profile", {}).get("specialization", "general_medicine")
        specialty_name = get_specialty_name(specialty_code)
        
        return {
            "name": doctor.get("name") or doctor.get("full_name", "Bác sĩ"),
            "specialty": specialty_code,  # Keep code for filtering
            "specialty_name": specialty_name,  # ✅ Add Vietnamese name
            "avatar": "👨‍⚕️",
            "rating": doctor.get("rating", 4.5),
            "phone": doctor.get("phone", "N/A"),
            "email": doctor.get("email", "N/A"),
        }
    else:
        return {
            "name": f"Bác sĩ #{doctor_id[:8]}",
            "specialty": "general_medicine",
            "specialty_name": "Đa khoa",
            "avatar": "👨‍⚕️",
            "rating": 0,
            "phone": "N/A",
            "email": "N/A",
        }


def populate_patient_info(patient_id):
    """
    Lấy thông tin patient từ patients hoặc users collection
    """
    patient = mongo_db.patients.find_one({"_id": ObjectId(patient_id)})
    user = None
    
    if not patient:
        user = mongo_db.users.find_one({"_id": ObjectId(patient_id), "role": "patient"})
        if user and user.get("patient_id"):
            patient = mongo_db.patients.find_one({"_id": ObjectId(user["patient_id"])})
    
    if not user:
        user = mongo_db.users.find_one({"patient_id": ObjectId(patient_id)})
        if not user and patient:
            user = mongo_db.users.find_one({"email": patient.get("email")})
    
    if patient:
        return {
            "_id": str(patient["_id"]),
            "name": patient.get("full_name") or patient.get("name", "N/A"),
            "phone": (user.get("phone") if user else None) or patient.get("phone", "N/A"),
            "email": (user.get("email") if user else None) or patient.get("email", "N/A"),
        }
    elif user:
        return {
            "_id": str(user["_id"]),
            "name": user.get("full_name") or user.get("email", "N/A"),
            "phone": user.get("phone", "N/A"),
            "email": user.get("email", "N/A"),
        }
    else:
        return {
            "_id": str(patient_id),
            "name": "Bệnh nhân đã xóa",
            "phone": "N/A",
            "email": "N/A",
        }


def populate_slot_info(slot_id):
    """
    Lấy thông tin slot
    """
    # ✅ Collection name is time_slots, not slots
    slot = mongo_db.time_slots.find_one({"_id": ObjectId(slot_id)})
    if slot:
        start_time = slot.get("start_time", "")
        end_time = slot.get("end_time", "")
        
        # ✅ Create time field for frontend
        time_display = f"{start_time} - {end_time}" if start_time and end_time else start_time or end_time or "N/A"
        
        return {
            "date": slot.get("date"),
            "start_time": start_time,
            "end_time": end_time,
            "time": time_display,  # ✅ Add formatted time field
        }
    return None
