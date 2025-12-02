from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta
from app.extensions import mongo_db
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

def get_slots_by_doctor_date(doctor_id, date, status=None):
    """
    Lấy slots theo doctor_id và date
    """
    # Convert date string to datetime object for comparison
    date_obj = date
    if isinstance(date, str):
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d")
        except:
            pass
    
    query = {
        "doctor_id": ObjectId(doctor_id),
        "date": date_obj
    }
    
    if status:
        query["status"] = status.lower()  # ✅ lowercase to match DB
    
    return list(mongo_db.time_slots.find(query).sort("start_time", 1))


def check_date_availability(doctor_id, dates):
    """
    Kiểm tra availability cho nhiều ngày
    Returns: dict {date: count} - ✅ TRẢ VỀ SỐ SLOT AVAILABLE TRỰC TIẾP
    """
    doctor_oid = ObjectId(doctor_id)
    
    # Convert date strings to datetime objects (at midnight) for comparison
    date_objs = []
    for d in dates:
        if isinstance(d, str):
            try:
                # Parse and set to midnight UTC
                dt = datetime.strptime(d, "%Y-%m-%d")
                date_objs.append(dt)
            except Exception as e:
                print(f"⚠️ Failed to parse date {d}: {e}")
                date_objs.append(d)
        else:
            date_objs.append(d)
    
    print(f"🔍 check_date_availability: doctor={doctor_id}, dates={dates}, date_objs={date_objs}")
    
    pipeline = [
        {
            "$match": {
                "doctor_id": doctor_oid,
                "date": {"$in": date_objs},
                "status": "available"  # ✅ lowercase
            }
        },
        {"$group": {"_id": "$date", "count": {"$sum": 1}}}
    ]
    
    results = list(mongo_db.time_slots.aggregate(pipeline))  # ✅ time_slots collection
    
    print(f"🔍 Aggregation results: {[(r['_id'], r['count']) for r in results]}")
    
    # ✅ Initialize all dates with 0
    availability = {d: 0 for d in dates}
    
    # ✅ Update with actual counts - TRẢ VỀ SỐ TRỰC TIẾP (không phải object)
    for r in results:
        date_key = r["_id"].strftime("%Y-%m-%d") if isinstance(r["_id"], datetime) else str(r["_id"])
        availability[date_key] = r["count"]
    
    print(f"✅ Final availability: {availability}")
    
    return availability


def hold_slot(slot_id, patient_oid):
    """
    Hold slot trong 2 phút
    Returns: (success, message, data)
    """
    slot_oid = ObjectId(slot_id)
    slot = mongo_db.time_slots.find_one({"_id": slot_oid})
    
    if not slot:
        return False, "Slot không tồn tại", None
    
    if slot["status"] != "available":
        return False, f"Slot đã được giữ hoặc đặt", None
    
    hold_until = datetime.utcnow() + timedelta(minutes=2)
    
    result = mongo_db.time_slots.update_one(
        {"_id": slot_oid, "status": "available"},
        {
            "$set": {
                "status": "hold",
                "held_by": patient_oid,
                "hold_until": hold_until,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        return False, "Slot đã được người khác giữ", None
    
    return True, "Đã giữ slot thành công", {
        "success": True,
        "slot_id": str(slot_id),
        "held_until": hold_until.isoformat(),
        "hold_expires_at": hold_until.isoformat(),
        "countdown_seconds": 120,
    }


def release_slot(slot_id, patient_oid):
    """
    Release slot đang HOLD
    Returns: (success, message)
    """
    slot_oid = ObjectId(slot_id)
    slot = mongo_db.time_slots.find_one({"_id": slot_oid})
    
    if not slot:
        return False, "Slot không tồn tại"
    
    if slot["status"] == "hold" and slot.get("held_by") == patient_oid:
        result = mongo_db.time_slots.update_one(
            {"_id": slot_oid},
            {
                "$set": {
                    "status": "available",
                    "updated_at": datetime.utcnow()
                },
                "$unset": {
                    "held_by": "",
                    "hold_until": ""
                }
            }
        )
        
        if result.modified_count > 0:
            return True, "Đã giải phóng slot"
    
    return True, "Slot không cần giải phóng"


def create_appointment(patient_oid, slot, data):
    """
    Tạo appointment mới
    Returns: appointment_id
    """
    # Validate doctor_id from slot - ensure doctor exists
    doctor_id = slot["doctor_id"]
    doctor = mongo_db.doctors.find_one({"_id": doctor_id})
    
    if not doctor:
        # Doctor doesn't exist - use default doctor instead
        logger.warning(f"Slot references non-existent doctor {doctor_id}, using default doctor")
        settings = get_settings()
        doctor_id = ObjectId(settings.DEFAULT_DOCTOR_ID)
        
        # Also fix the slot
        mongo_db.time_slots.update_one(
            {"_id": slot["_id"]},
            {"$set": {"doctor_id": doctor_id}}
        )
    
    appointment_doc = {
        "patient_id": patient_oid,
        "doctor_id": doctor_id,  # Use validated doctor_id
        "slot_id": slot["_id"],
        "date": slot.get("date"),
        "start_time": slot.get("start_time"),
        "end_time": slot.get("end_time"),
        "status": "booked",
        "reason": data.get("reason"),
        "chief_complaint": data.get("chief_complaint", {
            "onset_date": None,
            "main_symptom": None,
            "associated_symptoms": None,
            "pain_scale": 0,
            "aggravating_factors": None,
            "relieving_factors": None
        }),
        "notes": data.get("notes", ""),
        "appointment_type": data.get("appointment_type", "consultation"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_confirmed": False
    }
    
    res = mongo_db.appointments.insert_one(appointment_doc)
    return res.inserted_id


def mark_slot_booked(slot_id, patient_oid, appointment_id):
    """
    Cập nhật slot sang BOOKED
    """
    mongo_db.time_slots.update_one(
        {"_id": ObjectId(slot_id)},
        {
            "$set": {
                "status": "booked",
                "patient_id": patient_oid,
                "appointment_id": appointment_id,
                "updated_at": datetime.utcnow()
            },
            "$unset": {
                "held_by": "",
                "hold_until": ""
            }
        }
    )


def mark_slot_available(slot_id):
    """
    Đặt slot về AVAILABLE
    """
    mongo_db.time_slots.update_one(
        {"_id": ObjectId(slot_id)},
        {
            "$set": {
                "status": "available",
                "patient_id": None,
                "appointment_id": None,
                "updated_at": datetime.utcnow()
            }
        }
    )


def get_appointments_by_patient(patient_oid, query_filter=None, page=1, limit=1000):
    """
    Lấy appointments của patient
    ✅ Limit mặc định là 1000 để hiển thị tất cả lịch khám
    """
    query = {"patient_id": patient_oid}
    
    if query_filter and query_filter.get("status"):
        query["status"] = query_filter["status"].lower()
    
    skip = (page - 1) * limit
    
    appointments = list(
        mongo_db.appointments
        .find(query)
        .sort([("date", -1), ("start_time", -1)])
        .skip(skip)
        .limit(limit)
    )
    
    total = mongo_db.appointments.count_documents(query)
    
    return appointments, total


def get_appointments_by_doctor(doctor_oid, query_filter=None):
    """
    Lấy appointments của doctor
    """
    query = {"doctor_id": doctor_oid}
    
    if query_filter:
        if query_filter.get("date_from") and query_filter.get("date_to"):
            # ✅ Convert string dates to datetime objects for comparison
            from datetime import datetime
            date_from = datetime.strptime(query_filter["date_from"], "%Y-%m-%d")
            date_to = datetime.strptime(query_filter["date_to"], "%Y-%m-%d")
            # Add time to make it inclusive (whole day)
            date_to = date_to.replace(hour=23, minute=59, second=59)
            query["date"] = {"$gte": date_from, "$lte": date_to}
        elif query_filter.get("date_from"):
            from datetime import datetime
            date_from = datetime.strptime(query_filter["date_from"], "%Y-%m-%d")
            query["date"] = {"$gte": date_from}
        elif query_filter.get("date_to"):
            from datetime import datetime
            date_to = datetime.strptime(query_filter["date_to"], "%Y-%m-%d")
            date_to = date_to.replace(hour=23, minute=59, second=59)
            query["date"] = {"$lte": date_to}
        
        if query_filter.get("status"):
            query["status"] = query_filter["status"].lower()
    
    appointments = list(
        mongo_db.appointments
        .find(query)
        .sort([("date", 1), ("start_time", 1)])  # ✅ Sort by date then start_time
    )
    
    return appointments


def get_all_appointments(query_filter=None, page=1, limit=100):
    """
    Admin: Lấy tất cả appointments
    """
    query = {}
    
    if query_filter:
        if query_filter.get("status") and query_filter["status"].lower() != "all":
            query["status"] = query_filter["status"].lower()
    
    skip = (page - 1) * limit
    
    appointments = list(
        mongo_db.appointments
        .find(query)
        .sort("date", -1)
        .skip(skip)
        .limit(limit)
    )
    
    total = mongo_db.appointments.count_documents(query)
    
    return appointments, total


def cancel_appointment(appointment_id, user_id, user_role, reason=None):
    """
    Hủy appointment
    Returns: (success, message, slot_id)
    ✅ Supports cancelling appointments with status "rescheduled"
    """
    appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
    
    if not appointment:
        return False, "Appointment không tồn tại", None
    
    # ✅ Check if already cancelled
    status_lower = (appointment.get("status") or "").lower()
    if status_lower == "cancelled":
        return False, "Appointment đã bị hủy rồi", None
    
    # ✅ Check if already completed
    if status_lower == "completed":
        return False, "Không thể hủy lịch khám đã hoàn thành", None
    
    cancel_reason = reason or (f"{user_role} hủy lịch")
    
    # ✅ If appointment was rescheduled, slot was already released
    # Only return slot_id if appointment still has a valid slot
    slot_id = None
    if status_lower != "rescheduled" and appointment.get("slot_id"):
        slot_id = str(appointment["slot_id"])
    
    result = mongo_db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {
            "$set": {
                "status": "cancelled",
                "cancel_reason": cancel_reason,
                "cancelled_by": ObjectId(user_id),
                "cancelled_by_role": user_role,
                "cancelled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        return False, "Không thể hủy appointment", None
    
    return True, "Đã hủy lịch khám thành công", slot_id


def confirm_appointment(appointment_id, doctor_user_id, note=None):
    """
    Bác sĩ xác nhận appointment
    Returns: (success, message)
    """
    appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
    
    if not appointment:
        return False, "Appointment không tồn tại"
    
    if appointment.get("is_confirmed"):
        return False, "Lịch khám đã được xác nhận trước đó"
    
    if appointment.get("status") == "cancelled":
        return False, "Không thể xác nhận lịch khám đã bị hủy"
    
    update_data = {
        "is_confirmed": True,
        "confirmed_by": ObjectId(doctor_user_id),
        "confirmed_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    if note:
        update_data["confirm_note"] = note
    
    result = mongo_db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        return False, "Không thể xác nhận appointment"
    
    return True, "Đã xác nhận lịch khám thành công"


def delete_appointment(appointment_id):
    """
    Admin: Xóa appointment
    Returns: (success, message, slot_id)
    """
    query = {"_id": appointment_id}
    if isinstance(appointment_id, ObjectId):
        query["_id"] = appointment_id
    else:
        try:
            query["_id"] = ObjectId(appointment_id)
        except (InvalidId, TypeError):
            query["_id"] = appointment_id
    
    appointment = mongo_db.appointments.find_one(query)
    
    if not appointment:
        return False, "Appointment không tồn tại", None
    
    slot_id = appointment.get("slot_id")
    
    result = mongo_db.appointments.delete_one(query)
    
    if result.deleted_count == 0:
        return False, "Không thể xóa appointment", None
    
    return True, "Đã xóa lịch hẹn thành công", str(slot_id) if slot_id else None
