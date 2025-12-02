# backend/app/services/notification_service.py
from datetime import datetime
from app.extensions import mongo_db

class NotificationService:
    """Service for sending notifications to users"""
    
    @staticmethod
    def send_consultation_completed(patient_id, doctor_name, appointment_date):
        """
        Send notification to patient when consultation is completed
        
        Args:
            patient_id: Patient ID
            doctor_name: Doctor's name
            appointment_date: Appointment datetime
        """
        try:
            notification = {
                "user_id": patient_id,
                "user_type": "patient",  # ✅ Thêm user_type để phân biệt
                "type": "consultation_completed",
                "title": "Hoàn thành khám bệnh",
                "message": f"Bác sĩ {doctor_name} đã hoàn thành phiên khám của bạn. Bệnh án điện tử đã được lưu.",
                "data": {
                    "appointment_date": appointment_date
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent consultation completed notification to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send notification: {e}")
    
    @staticmethod
    def send_ehr_created(patient_id, doctor_name, record_id):
        """Send notification when EHR record is created"""
        try:
            notification = {
                "user_id": patient_id,
                "user_type": "patient",  # ✅ Thêm user_type
                "type": "ehr_created",
                "title": "Bệnh án điện tử mới",
                "message": f"Bác sĩ {doctor_name} đã tạo bệnh án điện tử cho bạn. Bạn có thể xem chi tiết trong hồ sơ.",
                "data": {
                    "record_id": record_id
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent EHR created notification to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send notification: {e}")
    
    @staticmethod
    def send_follow_up_reminder(patient_id, follow_up_date):
        """Send reminder for follow-up appointment"""
        try:
            notification = {
                "user_id": patient_id,
                "user_type": "patient",  # ✅ Thêm user_type
                "type": "follow_up_reminder",
                "title": "Nhắc nhở tái khám",
                "message": f"Bạn có lịch tái khám vào ngày {follow_up_date.strftime('%d/%m/%Y')}. Vui lòng đặt lịch hẹn.",
                "data": {
                    "follow_up_date": follow_up_date
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent follow-up reminder to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send notification: {e}")
    
    @staticmethod
    def send_new_appointment_to_doctor(doctor_id, patient_name, appointment_date, appointment_time):
        """Send notification to doctor when new appointment is booked"""
        try:
            notification = {
                "user_id": doctor_id,
                "user_type": "doctor",  # ✅ Notification cho doctor
                "type": "new_appointment",
                "title": "Lịch hẹn mới",
                "message": f"Bệnh nhân {patient_name} đã đặt lịch khám vào {appointment_date} lúc {appointment_time}",
                "data": {
                    "patient_name": patient_name,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent new appointment notification to doctor {doctor_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send notification: {e}")
    
    @staticmethod
    def send_new_message_to_patient(patient_id, doctor_name, message_preview, conversation_id=None):
        """
        Send notification to patient when doctor sends a new message
        
        Args:
            patient_id: Patient ID (ObjectId or string)
            doctor_name: Doctor's name
            message_preview: Preview of the message (first 50 chars)
            conversation_id: Conversation ID for navigation
        """
        try:
            from bson import ObjectId
            
            # Ensure patient_id is ObjectId
            if isinstance(patient_id, str):
                patient_id = ObjectId(patient_id)
            
            notification = {
                "user_id": patient_id,
                "user_type": "patient",
                "type": "new_message",
                "title": "Tin nhắn mới từ bác sĩ",
                "message": f"Bác sĩ {doctor_name}: {message_preview[:50]}{'...' if len(message_preview) > 50 else ''}",
                "data": {
                    "doctor_name": doctor_name,
                    "conversation_id": str(conversation_id) if conversation_id else None
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent new message notification to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send message notification: {e}")
    
    @staticmethod
    def send_rating_request(patient_id, doctor_name, appointment_id, appointment_date):
        """
        Gửi thông báo mời bệnh nhân đánh giá sau khi hoàn thành khám
        
        Args:
            patient_id: Patient ID (ObjectId or string)
            doctor_name: Doctor's name
            appointment_id: Appointment ID
            appointment_date: Appointment date
        """
        try:
            from bson import ObjectId
            
            # Ensure patient_id is ObjectId
            if isinstance(patient_id, str):
                patient_id = ObjectId(patient_id)
            
            notification = {
                "user_id": patient_id,
                "user_type": "patient",
                "type": "rating_request",
                "title": "Đánh giá bác sĩ",
                "message": f"Buổi khám với Bác sĩ {doctor_name} đã hoàn thành. Bạn có muốn đánh giá chất lượng tư vấn không?",
                "data": {
                    "doctor_name": doctor_name,
                    "appointment_id": str(appointment_id) if appointment_id else None,
                    "appointment_date": appointment_date,
                    "action": "rate_doctor"  # Frontend có thể dùng để navigate
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent rating request notification to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send rating request notification: {e}")
    
    @staticmethod
    def send_new_rating_to_doctor(doctor_id, patient_name, rating, comment_preview=""):
        """
        Gửi thông báo cho bác sĩ khi có đánh giá mới
        
        Args:
            doctor_id: Doctor ID (ObjectId or string)
            patient_name: Patient's name
            rating: Rating score (1-5)
            comment_preview: Preview of comment (optional)
        """
        try:
            from bson import ObjectId
            
            # Ensure doctor_id is ObjectId
            if isinstance(doctor_id, str):
                doctor_id = ObjectId(doctor_id)
            
            # Create message based on rating
            star_emoji = "⭐" * rating
            if rating >= 4:
                tone = "tuyệt vời"
            elif rating >= 3:
                tone = "tốt"
            else:
                tone = ""
            
            message = f"{patient_name} đã đánh giá {star_emoji} ({rating}/5) {tone}"
            if comment_preview:
                message += f": \"{comment_preview[:50]}{'...' if len(comment_preview) > 50 else ''}\""
            
            notification = {
                "user_id": doctor_id,
                "user_type": "doctor",
                "type": "new_rating",
                "title": "Đánh giá mới",
                "message": message,
                "data": {
                    "patient_name": patient_name,
                    "rating": rating,
                    "comment_preview": comment_preview[:100] if comment_preview else ""
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent new rating notification to doctor {doctor_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send rating notification: {e}")
    
    @staticmethod
    def send_appointment_cancelled_to_doctor(doctor_id, patient_name, appointment_date, appointment_time, reason=""):
        """
        Gửi thông báo cho bác sĩ khi bệnh nhân hủy lịch hẹn
        
        Args:
            doctor_id: Doctor ID (ObjectId or string)
            patient_name: Patient's name
            appointment_date: Appointment date
            appointment_time: Appointment time
            reason: Cancellation reason (optional)
        """
        try:
            from bson import ObjectId
            
            # Ensure doctor_id is ObjectId
            if isinstance(doctor_id, str):
                doctor_id = ObjectId(doctor_id)
            
            message = f"Bệnh nhân {patient_name} đã hủy lịch khám vào {appointment_date} lúc {appointment_time}"
            if reason:
                message += f". Lý do: {reason}"
            
            notification = {
                "user_id": doctor_id,
                "user_type": "doctor",
                "type": "appointment_cancelled",
                "title": "Lịch hẹn bị hủy",
                "message": message,
                "data": {
                    "patient_name": patient_name,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time,
                    "reason": reason
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent appointment cancelled notification to doctor {doctor_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send appointment cancelled notification: {e}")
    
    @staticmethod
    def send_appointment_cancelled_to_patient(patient_id, doctor_name, appointment_date, appointment_time, reason=""):
        """
        Gửi thông báo cho bệnh nhân khi bác sĩ hủy lịch hẹn
        
        Args:
            patient_id: Patient ID (ObjectId or string)
            doctor_name: Doctor's name
            appointment_date: Appointment date
            appointment_time: Appointment time
            reason: Cancellation reason (optional)
        """
        try:
            from bson import ObjectId
            
            # Ensure patient_id is ObjectId
            if isinstance(patient_id, str):
                patient_id = ObjectId(patient_id)
            
            message = f"Bác sĩ {doctor_name} đã hủy lịch khám của bạn vào {appointment_date} lúc {appointment_time}"
            if reason:
                message += f". Lý do: {reason}"
            
            notification = {
                "user_id": patient_id,
                "user_type": "patient",
                "type": "appointment_cancelled_by_doctor",
                "title": "Bác sĩ hủy lịch khám",
                "message": message,
                "data": {
                    "doctor_name": doctor_name,
                    "appointment_date": appointment_date,
                    "appointment_time": appointment_time,
                    "reason": reason
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent appointment cancelled notification to patient {patient_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send appointment cancelled notification to patient: {e}")
    
    @staticmethod
    def send_new_message_to_doctor(doctor_id, patient_name, message_preview, conversation_id=None):
        """
        Gửi thông báo cho bác sĩ khi bệnh nhân gửi tin nhắn mới
        
        Args:
            doctor_id: Doctor ID (ObjectId or string)
            patient_name: Patient's name
            message_preview: Preview of the message (first 50 chars)
            conversation_id: Conversation ID for navigation
        """
        try:
            from bson import ObjectId
            
            # Ensure doctor_id is ObjectId
            if isinstance(doctor_id, str):
                doctor_id = ObjectId(doctor_id)
            
            notification = {
                "user_id": doctor_id,
                "user_type": "doctor",
                "type": "new_message",
                "title": "Tin nhắn mới từ bệnh nhân",
                "message": f"{patient_name}: {message_preview[:50]}{'...' if len(message_preview) > 50 else ''}",
                "data": {
                    "patient_name": patient_name,
                    "conversation_id": str(conversation_id) if conversation_id else None
                },
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            mongo_db.notifications.insert_one(notification)
            print(f"✅ Sent new message notification to doctor {doctor_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to send message notification to doctor: {e}")