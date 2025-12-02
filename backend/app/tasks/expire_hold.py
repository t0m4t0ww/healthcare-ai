"""
Background Jobs - Cron tasks cho appointment system
File: backend/app/tasks/expire_hold.py
"""
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from app.extensions import mongo_db
from app.services.appointment_service import AppointmentService

appointment_service = AppointmentService()


# ============================================
# JOB 1: Release Expired HOLDs
# ============================================

def cleanup_expired_holds():
    """
    Giải phóng các slot HOLD hết hạn
    Chạy mỗi 5 phút (fallback cho TTL index)
    """
    print(f"[{datetime.utcnow()}] Running cleanup_expired_holds...")
    
    result = appointment_service.release_expired_holds()
    
    if result['released_count'] > 0:
        print(f"✅ Released {result['released_count']} expired holds")
    else:
        print("✅ No expired holds found")


# ============================================
# JOB 2: Send Reminders (T-24h)
# ============================================

def send_24h_reminders():
    """
    Gửi nhắc nhở trước 24h
    Chạy mỗi 1 giờ
    """
    print(f"[{datetime.utcnow()}] Running send_24h_reminders...")
    
    # Tìm appointments trong khoảng 23-25h nữa
    tomorrow = datetime.utcnow() + timedelta(hours=24)
    start_window = datetime.combine(tomorrow.date(), datetime.min.time())
    end_window = start_window + timedelta(days=1)
    
    # Query slots trong khoảng thời gian
    slots = list(mongo_db.time_slots.find({
        "date": {"$gte": start_window.strftime("%Y-%m-%d"), "$lt": end_window.strftime("%Y-%m-%d")},
        "status": "BOOKED"
    }))
    
    slot_ids = [s["_id"] for s in slots]
    
    # Tìm appointments chưa gửi reminder
    appointments = list(mongo_db.appointments.find({
        "slot_id": {"$in": slot_ids},
        "status": {"$in": ["PENDING", "CONFIRMED"]},
        "reminder_sent_24h": False
    }))
    
    sent_count = 0
    
    for apt in appointments:
        # TODO: Gửi email/SMS thực tế
        # from app.services.notification_service import send_reminder_email
        # send_reminder_email(apt, hours=24)
        
        # Đánh dấu đã gửi
        mongo_db.appointments.update_one(
            {"_id": apt["_id"]},
            {"$set": {"reminder_sent_24h": True}}
        )
        
        sent_count += 1
        print(f"  → Sent 24h reminder for appointment {apt['_id']}")
    
    print(f"✅ Sent {sent_count} reminders (24h)")


# ============================================
# JOB 3: Send Reminders (T-2h)
# ============================================

def send_2h_reminders():
    """
    Gửi nhắc nhở trước 2h
    Chạy mỗi 30 phút
    """
    print(f"[{datetime.utcnow()}] Running send_2h_reminders...")
    
    # Tìm appointments trong khoảng 1.5-2.5h nữa
    target_time = datetime.utcnow() + timedelta(hours=2)
    today_date = target_time.strftime("%Y-%m-%d")
    target_hour = target_time.strftime("%H")
    
    # Query slots gần giờ khám
    slots = list(mongo_db.time_slots.find({
        "date": today_date,
        "start_time": {"$regex": f"^{target_hour}:"},
        "status": "BOOKED"
    }))
    
    slot_ids = [s["_id"] for s in slots]
    
    # Tìm appointments chưa gửi reminder 2h
    appointments = list(mongo_db.appointments.find({
        "slot_id": {"$in": slot_ids},
        "status": {"$in": ["PENDING", "CONFIRMED"]},
        "reminder_sent_2h": False
    }))
    
    sent_count = 0
    
    for apt in appointments:
        # TODO: Gửi SMS thực tế
        # from app.services.notification_service import send_sms_reminder
        # send_sms_reminder(apt, hours=2)
        
        # Đánh dấu đã gửi
        mongo_db.appointments.update_one(
            {"_id": apt["_id"]},
            {"$set": {"reminder_sent_2h": True}}
        )
        
        sent_count += 1
        print(f"  → Sent 2h reminder for appointment {apt['_id']}")
    
    print(f"✅ Sent {sent_count} reminders (2h)")


# ============================================
# SCHEDULER SETUP
# ============================================

def init_scheduler():
    """
    Khởi tạo APScheduler với các jobs
    """
    scheduler = BackgroundScheduler()
    
    # Job 1: Cleanup HOLD - mỗi 5 phút
    scheduler.add_job(
        func=cleanup_expired_holds,
        trigger="interval",
        minutes=5,
        id="cleanup_holds",
        name="Release expired HOLD slots",
        replace_existing=True
    )
    
    # Job 2: Reminder 24h - mỗi 1 giờ
    scheduler.add_job(
        func=send_24h_reminders,
        trigger="interval",
        hours=1,
        id="reminder_24h",
        name="Send 24h appointment reminders",
        replace_existing=True
    )
    
    # Job 3: Reminder 2h - mỗi 30 phút
    scheduler.add_job(
        func=send_2h_reminders,
        trigger="interval",
        minutes=30,
        id="reminder_2h",
        name="Send 2h appointment reminders",
        replace_existing=True
    )
    
    scheduler.start()
    print("✅ APScheduler started with 3 jobs")
    
    return scheduler


# ============================================
# MANUAL TRIGGER (for testing)
# ============================================

if __name__ == "__main__":
    # Test chạy thủ công
    print("=== TESTING JOBS ===\n")
    
    cleanup_expired_holds()
    print("\n" + "="*50 + "\n")
    
    send_24h_reminders()
    print("\n" + "="*50 + "\n")
    
    send_2h_reminders()