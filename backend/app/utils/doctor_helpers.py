#!/usr/bin/env python3
"""
Doctor Helper Functions - Centralized doctor ID mapping
===
CRITICAL: Always use these helpers to ensure consistent doctor_id handling
"""

from bson import ObjectId
from app.extensions import mongo_db
from typing import Optional, Union

def get_doctor_oid_from_user_id(user_id: Union[str, ObjectId]) -> Optional[ObjectId]:
    """
    Convert user_id (users._id) to doctor_id (doctors._id)
    
    This is the SINGLE SOURCE OF TRUTH for user → doctor mapping.
    
    Args:
        user_id: users._id (string or ObjectId)
        
    Returns:
        doctors._id if doctor found, else None
        
    Example:
        >>> user_id = "691994fd596a2deacfefb622"  # from JWT token
        >>> doctor_id = get_doctor_oid_from_user_id(user_id)
        >>> # doctor_id = ObjectId("691994fd596a2deacfefb623")
    """
    try:
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        doctor = mongo_db.doctors.find_one({"user_id": user_oid})
        return doctor["_id"] if doctor else None
    except Exception:
        return None


def get_doctor_oid_from_user(user: dict) -> ObjectId:
    """
    Convert user dict (from JWT token) to doctor_id (doctors._id)
    
    Args:
        user: User dict from get_current_user(), must have "user_id" key
        
    Returns:
        doctors._id (ObjectId)
        Falls back to user_id if doctor record not found (backward compatibility)
        
    Usage in routes:
        >>> from app.middlewares.auth import get_current_user
        >>> user = get_current_user()
        >>> doctor_id = get_doctor_oid_from_user(user)
    """
    try:
        user_oid = ObjectId(user["user_id"])
        doctor = mongo_db.doctors.find_one({"user_id": user_oid})
        return doctor["_id"] if doctor else user_oid
    except Exception:
        return ObjectId(user["user_id"])


def validate_doctor_exists(doctor_id: Union[str, ObjectId]) -> bool:
    """
    Validate that a doctor exists in doctors collection
    
    Args:
        doctor_id: doctors._id to check
        
    Returns:
        True if doctor exists, False otherwise
    """
    try:
        doc_oid = ObjectId(doctor_id) if isinstance(doctor_id, str) else doctor_id
        return mongo_db.doctors.find_one({"_id": doc_oid}) is not None
    except Exception:
        return False


def get_doctor_info(doctor_id: Union[str, ObjectId]) -> Optional[dict]:
    """
    Get doctor information by doctor_id
    
    Args:
        doctor_id: doctors._id
        
    Returns:
        Doctor document dict or None if not found
    """
    try:
        doc_oid = ObjectId(doctor_id) if isinstance(doctor_id, str) else doctor_id
        return mongo_db.doctors.find_one({"_id": doc_oid})
    except Exception:
        return None


# ============================================================================
# IMPORTANT: Design Decisions (for future reference)
# ============================================================================
"""
WHY doctors._id instead of users._id in appointments/consultations/ehr?

1. Separation of Concerns:
   - `users` collection: Authentication & authorization only
   - `doctors` collection: Doctor-specific business logic (schedule, specialty, etc)
   
2. Data Integrity:
   - If a doctor's user account is deleted/disabled, their medical records remain
   - Doctor profile changes don't affect authentication
   
3. Query Performance:
   - Easy to query: appointments.find({doctor_id: doctor._id})
   - No need for joins: doctors → users
   
4. Flexibility:
   - One user can theoretically have multiple doctor roles (admin who's also a doctor)
   - Easy to add nurse/staff roles later with same pattern

MAPPING FLOW:
   JWT Token → user_id (users._id)
         ↓
   get_doctor_oid_from_user_id()
         ↓
   doctor_id (doctors._id) → Use in appointments/ehr/consultations

COLLECTIONS RELATIONSHIP:
   users {
       _id: ObjectId,
       email: string,
       role: "doctor" | "patient" | "admin"
   }
   
   doctors {
       _id: ObjectId,          ← Use this for appointments.doctor_id
       user_id: ObjectId,      ← Links to users._id
       specialty: string,
       working_hours: {...}
   }
   
   appointments {
       _id: ObjectId,
       doctor_id: ObjectId,    ← Must be doctors._id (NOT users._id)
       patient_id: ObjectId,
       slot_id: ObjectId
   }
"""

