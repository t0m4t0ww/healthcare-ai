# backend/app/model/index_init.py
"""
Initialize all database indexes for optimal query performance
Call this when app starts
"""
from app.model.appointments import AppointmentModel
from app.model.users import UserModel
from app.model.ehr import EHRModel
from app.model.ratings import RatingModel
from app.model.email_logs import EmailLogModel
from app.extensions import mongo_db
from pymongo.errors import OperationFailure

def _safe_create_index(collection, *args, **kwargs):
    """Safely create index, skip if already exists"""
    try:
        collection.create_index(*args, **kwargs)
    except OperationFailure as e:
        if "already exists" in str(e) or "IndexKeySpecsConflict" in str(e):
            # Index already exists, skip
            pass
        else:
            raise

def ensure_all_indexes():
    """
    Create all database indexes for:
    - appointments & time_slots
    - users (patients, doctors)
    - ehr_records
    - conversations (chat)
    - xray_results
    
    This should be called once when app starts
    """
    print("🔧 Creating database indexes...")
    
    try:
        # 1. Appointments & Time Slots
        AppointmentModel.ensure_indexes()
        
        # 2. Users
        UserModel.ensure_indexes()
        
        # 3. EHR Records
        EHRModel.ensure_indexes()
        
        # 4. Ratings
        RatingModel.ensure_indexes()
        
        # 5. Email Logs
        EmailLogModel.ensure_indexes()
        
        # 6. Conversations (Chat)
        _ensure_conversation_indexes()
        
        # 7. XRay Results
        _ensure_xray_indexes()
        
        # 8. Doctor Notes
        _ensure_doctor_notes_indexes()
        
        print("✅ All database indexes created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        raise

def _ensure_conversation_indexes():
    """Create indexes for chat conversations"""
    # Patient conversations index
    _safe_create_index(
        mongo_db.conversations,
        [("patient_id", 1), ("created_at", -1)],
        name="patient_conversations"
    )
    
    # Doctor conversations index
    _safe_create_index(
        mongo_db.conversations,
        [("doctor_id", 1), ("created_at", -1)],
        name="doctor_conversations"
    )
    
    # Room/session index
    _safe_create_index(
        mongo_db.conversations,
        "room",
        name="room_index",
        sparse=True
    )
    
    # Text search for message content
    _safe_create_index(
        mongo_db.conversations,
        [("messages.content", "text")],
        name="message_text_search"
    )
    
    print("✅ Conversation indexes created")

def _ensure_xray_indexes():
    """Create indexes for xray results"""
    # Patient xrays index
    _safe_create_index(
        mongo_db.xray_results,
        [("patient_id", 1), ("created_at", -1)],
        name="patient_xrays"
    )
    
    # Doctor xrays index
    _safe_create_index(
        mongo_db.xray_results,
        [("doctor_id", 1), ("created_at", -1)],
        name="doctor_xrays"
    )
    
    # Appointment reference
    _safe_create_index(
        mongo_db.xray_results,
        "appointment_id",
        name="appointment_xray_ref",
        sparse=True
    )
    
    # Status index
    _safe_create_index(
        mongo_db.xray_results,
        "status",
        name="xray_status"
    )
    
    # Exam date index
    _safe_create_index(
        mongo_db.xray_results,
        [("exam_date", -1)],
        name="exam_date_desc"
    )
    
    print("✅ XRay indexes created")

def _ensure_doctor_notes_indexes():
    """Create indexes for doctor notes"""
    # Check if collection exists
    if "doctor_notes" not in mongo_db.list_collection_names():
        print("ℹ️  doctor_notes collection doesn't exist yet, skipping indexes")
        return
    
    # Patient notes index
    _safe_create_index(
        mongo_db.doctor_notes,
        [("patient_id", 1), ("created_at", -1)],
        name="patient_notes"
    )
    
    # Doctor notes index
    _safe_create_index(
        mongo_db.doctor_notes,
        [("doctor_id", 1), ("created_at", -1)],
        name="doctor_notes_by_doctor"
    )
    
    # Appointment reference
    _safe_create_index(
        mongo_db.doctor_notes,
        "appointment_id",
        name="appointment_note_ref",
        sparse=True
    )
    
    # Text search for note content
    _safe_create_index(
        mongo_db.doctor_notes,
        [("note", "text"), ("diagnosis", "text")],
        name="note_text_search"
    )
    
    print("✅ Doctor notes indexes created")

def drop_all_indexes():
    """
    Drop all custom indexes (keep only _id)
    Use with caution - only for development/testing
    """
    collections = [
        "appointments",
        "time_slots", 
        "users",
        "ehr_records",
        "email_logs",
        "conversations",
        "xray_results",
        "doctor_notes"
    ]
    
    for coll_name in collections:
        if coll_name in mongo_db.list_collection_names():
            coll = mongo_db[coll_name]
            indexes = coll.list_indexes()
            for idx in indexes:
                if idx["name"] != "_id_":  # Don't drop _id index
                    coll.drop_index(idx["name"])
                    print(f"🗑️  Dropped index: {coll_name}.{idx['name']}")
    
    print("✅ All custom indexes dropped")
