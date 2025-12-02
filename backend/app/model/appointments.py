# backend/app/models/appointments.py
from datetime import datetime, timedelta
from bson import ObjectId
from app.extensions import mongo_db

class AppointmentModel:
    """
    Model for managing appointments and time slots
    Collections: time_slots, appointments
    """
    
    @staticmethod
    def ensure_indexes():
        """Tạo indexes cho performance"""
        # Time slots indexes
        mongo_db.time_slots.create_index([
            ("doctor_id", 1),
            ("date", 1),
            ("status", 1)
        ], name="doctor_date_status")
        
        mongo_db.time_slots.create_index([
            ("doctor_id", 1),
            ("date", 1),
            ("start_time", 1)
        ], unique=True, name="unique_doctor_slot")
        
        # TTL index để tự động xóa HOLD slots hết hạn
        mongo_db.time_slots.create_index(
            "hold_expires_at",
            expireAfterSeconds=0,
            name="ttl_hold_expiry"
        )
        
        # Appointments indexes
        mongo_db.appointments.create_index([
            ("patient_id", 1),
            ("status", 1)
        ], name="patient_status")
        
        mongo_db.appointments.create_index([
            ("doctor_id", 1),
            ("created_at", -1)
        ], name="doctor_created")
        
        mongo_db.appointments.create_index(
            "slot_id",
            name="slot_ref"
        )
        
        # Unique constraint: 1 slot chỉ có 1 appointment active
        mongo_db.appointments.create_index([
            ("slot_id", 1),
            ("status", 1)
        ], unique=True, partialFilterExpression={
            "status": {"$in": ["PENDING", "CONFIRMED", "CHECKED_IN"]}
        }, name="unique_slot_active")
    
    @staticmethod
    def validate_time_slot(data):
        """Validate time slot data"""
        required = ["doctor_id", "date", "start_time", "end_time"]
        for field in required:
            if field not in data:
                raise ValueError(f"Thiếu field: {field}")
        
        # Validate date format
        try:
            slot_date = datetime.fromisoformat(data["date"].replace("Z", "+00:00"))
        except:
            raise ValueError("date phải có format YYYY-MM-DD hoặc ISO")
        
        # Không cho đặt slot trong quá khứ
        if slot_date.date() < datetime.now().date():
            raise ValueError("Không thể tạo slot trong quá khứ")
        
        return True
    
    @staticmethod
    def validate_appointment(data):
        """Validate appointment data"""
        required = ["slot_id", "patient_id", "doctor_id"]
        for field in required:
            if field not in data:
                raise ValueError(f"Thiếu field: {field}")
        
        # Validate ObjectIds
        try:
            ObjectId(data["slot_id"])
            ObjectId(data["patient_id"])
            ObjectId(data["doctor_id"])
        except:
            raise ValueError("Invalid ObjectId format")
        
        return True
    
    @staticmethod
    def get_slot_status_rules():
        """Quy tắc chuyển status của slot"""
        return {
            "AVAILABLE": ["HOLD", "BOOKED"],
            "HOLD": ["AVAILABLE", "BOOKED"],
            "BOOKED": ["COMPLETED", "CANCELLED", "NO_SHOW"],
            "COMPLETED": [],
            "CANCELLED": ["AVAILABLE"],
            "NO_SHOW": ["AVAILABLE"]
        }
    
    @staticmethod
    def get_appointment_status_rules():
        """Quy tắc chuyển status của appointment"""
        return {
            "PENDING": ["CONFIRMED", "CANCELLED"],
            "CONFIRMED": ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
            "CHECKED_IN": ["IN_PROGRESS"],
            "IN_PROGRESS": ["COMPLETED"],
            "COMPLETED": [],
            "CANCELLED": [],
            "NO_SHOW": []
        }


# Schema templates cho validation
TIME_SLOT_SCHEMA = {
    "doctor_id": ObjectId,      # required
    "date": str,                # required, format: YYYY-MM-DD
    "start_time": str,          # required, format: HH:MM
    "end_time": str,            # required, format: HH:MM
    "status": str,              # AVAILABLE, HOLD, BOOKED, COMPLETED, CANCELLED, NO_SHOW
    "held_by": ObjectId,        # patient_id nếu đang HOLD
    "hold_expires_at": datetime, # expiry time cho HOLD
    "max_patients": int,        # default: 1
    "consultation_type": str,   # in-person, video, phone
    "created_at": datetime,
    "updated_at": datetime
}

APPOINTMENT_SCHEMA = {
    "slot_id": ObjectId,        # required, ref to time_slots
    "patient_id": ObjectId,     # required
    "doctor_id": ObjectId,      # required
    "status": str,              # PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
    "reason": str,              # Lý do khám
    "symptoms": str,            # Triệu chứng
    "notes": str,               # Ghi chú thêm
    "appointment_type": str,    # consultation, checkup, followup, emergency
    "reminder_sent_24h": bool,  # Đã gửi reminder 24h chưa
    "reminder_sent_2h": bool,   # Đã gửi reminder 2h chưa
    "cancelled_reason": str,    # Lý do hủy (nếu có)
    "cancelled_by": ObjectId,   # user_id người hủy
    "cancelled_at": datetime,
    "checked_in_at": datetime,
    "completed_at": datetime,
    "created_at": datetime,
    "updated_at": datetime
}