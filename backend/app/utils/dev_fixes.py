#!/usr/bin/env python
"""
Auto-fix appointments on startup (Development only)
Add this to run.py to automatically fix doctor_id mismatches
"""
from app.extensions import mongo_db
from app.config import get_settings
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

def auto_fix_appointments_dev():
    """Automatically fix appointment doctor_id issues in dev mode"""
    try:
        settings = get_settings()
        default_doctor_id = ObjectId(settings.DEFAULT_DOCTOR_ID)
        
        # Verify default doctor exists in doctors collection
        default_doctor = mongo_db.doctors.find_one({"_id": default_doctor_id})
        if not default_doctor:
            logger.error(f"Default doctor {default_doctor_id} not found in doctors collection!")
            return
        
        # Get all unique doctor IDs from appointments
        doctor_ids = mongo_db.appointments.distinct("doctor_id")
        
        orphaned_count = 0
        mismatch_count = 0
        
        for doc_id in doctor_ids:
            if doc_id == default_doctor_id:
                continue
                
            # Check if doctor exists in doctors collection
            doctor = mongo_db.doctors.find_one({"_id": doc_id})
            
            if not doctor:
                # Orphaned appointment (doctor doesn't exist)
                count = mongo_db.appointments.count_documents({"doctor_id": doc_id})
                orphaned_count += count
                logger.warning(f"Found {count} orphaned appointments with non-existent doctor: {doc_id}")
        
        # ONLY fix orphaned appointments (không fix appointments với doctor hợp lệ)
        if orphaned_count > 0:
            print(f"\n⚠️  Found {orphaned_count} orphaned appointments (doctor doesn't exist)")
            print(f"🔧 Auto-fixing to default doctor: {default_doctor_id} ({default_doctor.get('full_name', 'N/A')})")
            
            # Get list of all valid doctor IDs
            valid_doctor_ids = [d["_id"] for d in mongo_db.doctors.find({}, {"_id": 1})]
            
            # Only fix appointments with invalid doctor_id
            result = mongo_db.appointments.update_many(
                {"doctor_id": {"$nin": valid_doctor_ids}},
                {"$set": {"doctor_id": default_doctor_id}}
            )
            
            print(f"✅ Fixed {result.modified_count} orphaned appointments\n")
        else:
            logger.info(f"✅ All appointments have valid doctor_id")
            
    except Exception as e:
        logger.error(f"Auto-fix failed: {e}")
        import traceback
        traceback.print_exc()
