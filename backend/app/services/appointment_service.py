# backend/app/services/appointment_service.py
from datetime import datetime, timedelta
from bson import ObjectId
from app.extensions import mongo_db

class AppointmentService:
    
    @staticmethod
    def hold_slot(slot_id, patient_id):
        """Giữ slot trong 2 phút"""
        try:
            slot_oid = ObjectId(slot_id)
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid slot_id or patient_id")
        
        # Check slot exists & available
        slot = mongo_db.time_slots.find_one({"_id": slot_oid})
        if not slot:
            return {"success": False, "message": "Slot không tồn tại"}
        
        if slot["status"] != "AVAILABLE":
            return {"success": False, "message": "Slot đã được đặt"}
        
        # Hold slot for 2 minutes
        hold_expires_at = datetime.utcnow() + timedelta(minutes=2)
        
        result = mongo_db.time_slots.update_one(
            {"_id": slot_oid, "status": "AVAILABLE"},
            {"$set": {
                "status": "HOLD",
                "held_by": patient_oid,
                "hold_expires_at": hold_expires_at
            }}
        )
        
        if result.modified_count == 0:
            return {"success": False, "message": "Không thể giữ slot (đã được giữ bởi người khác)"}
        
        return {
            "success": True,
            "message": "Đã giữ slot thành công",
            "hold_expires_at": hold_expires_at.isoformat(),
            "countdown_seconds": 120  # 2 phút = 120 giây
        }
    
    @staticmethod
    def complete_booking(slot_id, patient_id, appointment_data):
        """Hoàn tất đặt lịch từ HOLD -> BOOKED"""
        try:
            slot_oid = ObjectId(slot_id)
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid slot_id or patient_id")
        
        # Check slot exists
        slot = mongo_db.time_slots.find_one({"_id": slot_oid})
        if not slot:
            raise ValueError("Slot không tồn tại")
        
        if slot["status"] == "BOOKED":
            raise ValueError("Slot đã được đặt")
        
        # Kiểm tra nếu slot đang HOLD, phải đúng người giữ
        if slot["status"] == "HOLD":
            if slot.get("held_by") != patient_oid:
                raise ValueError("Slot đang được giữ bởi người khác")
            
            # Kiểm tra còn hạn HOLD không
            if slot.get("hold_expires_at") and slot["hold_expires_at"] < datetime.utcnow():
                # Hết hạn rồi, trả về AVAILABLE
                mongo_db.time_slots.update_one(
                    {"_id": slot_oid},
                    {
                        "$set": {"status": "AVAILABLE"},
                        "$unset": {"held_by": "", "hold_expires_at": ""}
                    }
                )
                raise ValueError("Hết thời gian giữ chỗ. Vui lòng chọn lại.")
        
        # Update slot to BOOKED
        mongo_db.time_slots.update_one(
            {"_id": slot_oid},
            {"$set": {
                "status": "BOOKED",
                "held_by": None,
                "hold_expires_at": None
            }}
        )
        
        # Create appointment
        appointment = {
            "slot_id": slot_oid,
            "patient_id": patient_oid,
            "doctor_id": slot["doctor_id"],
            "date": slot["date"],
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "status": "CONFIRMED",
            "reason": appointment_data.get("reason", ""),
            "symptoms": appointment_data.get("symptoms", ""),
            "notes": appointment_data.get("notes", ""),
            "appointment_type": appointment_data.get("appointment_type", "consultation"),
            "reminder_sent_24h": False,
            "reminder_sent_2h": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = mongo_db.appointments.insert_one(appointment)
        appointment["_id"] = str(result.inserted_id)
        appointment["slot_id"] = str(appointment["slot_id"])
        appointment["patient_id"] = str(appointment["patient_id"])
        appointment["doctor_id"] = str(appointment["doctor_id"])
        
        return appointment
    
    @staticmethod
    def get_patient_appointments(patient_id, filters=None):
        """Lấy danh sách appointments của patient"""
        try:
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid patient_id")
        
        query = {"patient_id": patient_oid}
        
        if filters:
            if filters.get("status"):
                query["status"] = filters["status"]
            if filters.get("doctor_id"):
                try:
                    query["doctor_id"] = ObjectId(filters["doctor_id"])
                except:
                    pass
        
        cur = mongo_db.appointments.find(query).sort("created_at", -1)
        
        result = []
        for appt in cur:
            result.append({
                "_id": str(appt["_id"]),
                "slot_id": str(appt["slot_id"]),
                "patient_id": str(appt["patient_id"]),
                "doctor_id": str(appt["doctor_id"]),
                "date": appt.get("date"),
                "start_time": appt.get("start_time"),
                "end_time": appt.get("end_time"),
                "status": appt.get("status"),
                "reason": appt.get("reason"),
                "symptoms": appt.get("symptoms"),
                "notes": appt.get("notes"),
                "appointment_type": appt.get("appointment_type"),
                "created_at": appt.get("created_at").isoformat() if appt.get("created_at") else None,
                "updated_at": appt.get("updated_at").isoformat() if appt.get("updated_at") else None
            })
        
        return result
    
    # ============================================
    # ✅ METHOD MỚI 1: get_doctor_appointments
    # ============================================
    @staticmethod
    def get_doctor_appointments(doctor_id, date=None):
        """Lấy danh sách lịch khám của bác sĩ"""
        try:
            doctor_oid = ObjectId(doctor_id)
        except:
            raise ValueError("Invalid doctor_id")
        
        query = {"doctor_id": doctor_oid}
        
        # Filter theo ngày nếu có
        if date:
            query["date"] = date
        
        cur = mongo_db.appointments.find(query).sort("created_at", -1)
        
        result = []
        for appt in cur:
            # Populate thông tin bệnh nhân
            patient = mongo_db.patients.find_one({"_id": appt["patient_id"]})
            
            result.append({
                "_id": str(appt["_id"]),
                "slot_id": str(appt["slot_id"]),
                "patient_id": str(appt["patient_id"]),
                "patient_name": patient.get("full_name") if patient else "N/A",
                "patient_phone": patient.get("phone") if patient else "",
                "date": appt.get("date"),
                "start_time": appt.get("start_time"),
                "end_time": appt.get("end_time"),
                "status": appt.get("status"),
                "reason": appt.get("reason"),
                "symptoms": appt.get("symptoms"),
                "notes": appt.get("notes"),
                "appointment_type": appt.get("appointment_type"),
                "created_at": appt.get("created_at").isoformat() if appt.get("created_at") else None,
                "updated_at": appt.get("updated_at").isoformat() if appt.get("updated_at") else None
            })
        
        return result
    
    # ============================================
    # ✅ METHOD MỚI 2: release_expired_holds
    # ============================================
    @staticmethod
    def release_expired_holds():
        """
        Fallback cleanup: Giải phóng các slot HOLD hết hạn
        (MongoDB TTL index đã xử lý, đây là backup)
        """
        result = mongo_db.time_slots.update_many(
            {
                "status": "HOLD",
                "hold_expires_at": {"$lt": datetime.utcnow()}
            },
            {
                "$set": {"status": "AVAILABLE"},
                "$unset": {"held_by": "", "hold_expires_at": ""}
            }
        )
        
        return {
            "released_count": result.modified_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def cancel_appointment(appointment_id, cancelled_by, reason=None):
        """Hủy appointment"""
        try:
            appt_oid = ObjectId(appointment_id)
        except:
            raise ValueError("Invalid appointment_id")
        
        appt = mongo_db.appointments.find_one({"_id": appt_oid})
        if not appt:
            raise ValueError("Appointment không tồn tại")
        
        if appt["status"] == "CANCELLED":
            raise ValueError("Appointment đã bị hủy")
        
        # Release slot
        mongo_db.time_slots.update_one(
            {"_id": appt["slot_id"]},
            {"$set": {
                "status": "AVAILABLE",
                "held_by": None,
                "hold_expires_at": None
            }}
        )
        
        # Update appointment
        mongo_db.appointments.update_one(
            {"_id": appt_oid},
            {"$set": {
                "status": "cancelled",
                "cancelled_by": cancelled_by,
                "cancel_reason": reason,
                "cancelled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"success": True, "message": "Đã hủy lịch khám"}
    
    @staticmethod
    def generate_time_slots(doctor_id, date, working_hours, slot_duration=30):
        """Generate time slots - wrapper cho scheduler_service"""
        from app.services.scheduler_service import SchedulerService
        return SchedulerService.generate_time_slots(doctor_id, date, working_hours, slot_duration)