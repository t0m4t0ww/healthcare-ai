#!/usr/bin/env python
"""
Scheduled task to check and fix data integrity issues
Run this periodically (e.g., every hour or daily)
"""
from app.extensions import mongo_db
from app.config import get_settings
from bson import ObjectId
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def check_and_fix_data_integrity():
    """
    Check and automatically fix data integrity issues
    This runs periodically to ensure data consistency
    """
    try:
        settings = get_settings()
        default_doctor_id = ObjectId(settings.DEFAULT_DOCTOR_ID)
        
        logger.info("🔍 Starting data integrity check...")
        
        # 1. Fix orphaned appointments (doctor doesn't exist)
        doctor_ids = mongo_db.appointments.distinct("doctor_id")
        fixed_count = 0
        
        for doc_id in doctor_ids:
            if doc_id == default_doctor_id:
                continue
                
            doctor = mongo_db.users.find_one({"_id": doc_id})
            if not doctor:
                count = mongo_db.appointments.count_documents({"doctor_id": doc_id})
                result = mongo_db.appointments.update_many(
                    {"doctor_id": doc_id},
                    {"$set": {"doctor_id": default_doctor_id}}
                )
                fixed_count += result.modified_count
                logger.warning(f"Fixed {count} orphaned appointments for doctor {doc_id}")
        
        # 2. Fix appointments with missing appointment_time
        missing_time_apts = list(mongo_db.appointments.find({
            "appointment_time": {"$exists": False}
        }))
        
        for apt in missing_time_apts:
            # Try to get time from slot
            if apt.get("slot_id"):
                slot = mongo_db.time_slots.find_one({"_id": apt["slot_id"]})
                if slot:
                    mongo_db.appointments.update_one(
                        {"_id": apt["_id"]},
                        {"$set": {"appointment_time": slot.get("time", "09:00")}}
                    )
                    fixed_count += 1
        
        # 3. Fix appointments with broken slot references
        appointments = list(mongo_db.appointments.find({"slot_id": {"$exists": True}}))
        for apt in appointments:
            slot = mongo_db.time_slots.find_one({"_id": apt["slot_id"]})
            if not slot:
                # Create a new slot
                new_slot = {
                    "doctor_id": apt["doctor_id"],
                    "date": apt.get("appointment_date", datetime.utcnow().strftime("%Y-%m-%d")),
                    "time": apt.get("appointment_time", "09:00"),
                    "status": "booked",
                    "appointment_id": apt["_id"],
                    "created_at": datetime.utcnow()
                }
                new_slot_id = mongo_db.time_slots.insert_one(new_slot).inserted_id
                
                mongo_db.appointments.update_one(
                    {"_id": apt["_id"]},
                    {"$set": {"slot_id": new_slot_id}}
                )
                fixed_count += 1
                logger.warning(f"Created new slot for appointment {apt['_id']}")
        
        if fixed_count > 0:
            logger.info(f"✅ Fixed {fixed_count} data integrity issues")
        else:
            logger.info("✅ No data integrity issues found")
        
        return fixed_count
        
    except Exception as e:
        logger.error(f"Data integrity check failed: {e}")
        import traceback
        traceback.print_exc()
        return -1

if __name__ == "__main__":
    # Can run standalone for manual checks
    check_and_fix_data_integrity()
