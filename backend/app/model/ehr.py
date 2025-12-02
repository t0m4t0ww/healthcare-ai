# backend/app/model/ehr.py
from datetime import datetime
from bson import ObjectId
from app.extensions import mongo_db

class EHRModel:
    """
    Model for managing Electronic Health Records
    Collection: ehr_records
    """
    
    @staticmethod
    def ensure_indexes():
        """Create indexes for EHR records collection"""
        # Patient ID index - most common query
        try:
            mongo_db.ehr_records.create_index(
                [("patient_id", 1), ("created_at", -1)],
                name="patient_created"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  patient_created index already exists")
            else:
                raise
        
        # Doctor ID index
        try:
            mongo_db.ehr_records.create_index(
                [("doctor_id", 1), ("created_at", -1)],
                name="doctor_created"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  doctor_created index already exists")
            else:
                raise
        
        # Appointment reference
        try:
            mongo_db.ehr_records.create_index(
                "appointment_id",
                name="appointment_ref",
                sparse=True
            )
        except Exception as e:
            if "already exists" in str(e) or "IndexKeySpecsConflict" in str(e):
                print("ℹ️  appointment_ref index already exists")
            else:
                raise
        
        # Version tracking for patient (append-only)
        try:
            mongo_db.ehr_records.create_index(
                [("patient_id", 1), ("version", -1)],
                name="patient_version"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  patient_version index already exists")
            else:
                raise
        
        # Visit date index for timeline queries
        try:
            mongo_db.ehr_records.create_index(
                [("visit_date", -1)],
                name="visit_date_desc"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  visit_date_desc index already exists")
            else:
                raise
        
        # Record type index
        try:
            mongo_db.ehr_records.create_index(
                "record_type",
                name="record_type_index"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  record_type_index already exists")
            else:
                raise
        
        # Diagnosis text search
        try:
            mongo_db.ehr_records.create_index(
                [("diagnosis.primary", "text"), ("diagnosis.secondary", "text")],
                name="diagnosis_text_search"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  diagnosis_text_search index already exists")
            else:
                raise
        
        # Compound index for filtering
        try:
            mongo_db.ehr_records.create_index(
                [("patient_id", 1), ("record_type", 1), ("visit_date", -1)],
                name="patient_type_date"
            )
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️  patient_type_date index already exists")
            else:
                raise
        
        print("✅ EHR indexes created successfully")
    
    @staticmethod
    def validate_ehr_record(data: dict):
        """Validate EHR record data"""
        if not isinstance(data, dict):
            raise ValueError("Data must be a dictionary")
        
        # Required fields
        required = ["patient_id", "doctor_id"]
        missing = [field for field in required if not data.get(field)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Validate ObjectId format
        try:
            ObjectId(data["patient_id"])
            ObjectId(data["doctor_id"])
        except Exception:
            raise ValueError("patient_id/doctor_id must be valid ObjectId")
        
        # Validate record type if provided
        if "record_type" in data:
            valid_types = ["consultation", "checkup", "emergency", "followup", "surgery"]
            if data["record_type"] not in valid_types:
                raise ValueError(f"Invalid record_type. Must be one of: {', '.join(valid_types)}")
        
        return True
    
    @staticmethod
    def get_next_version(patient_id: str) -> int:
        """Get next version number for a patient (append-only)"""
        try:
            pid = ObjectId(patient_id)
            latest = mongo_db.ehr_records.find_one(
                {"patient_id": pid},
                sort=[("version", -1)]
            )
            return (latest.get("version", 0) + 1) if latest else 1
        except Exception:
            raise ValueError("Invalid patient_id format")
    
    @staticmethod
    def get_by_patient(patient_id: str, limit: int = 50):
        """Get EHR records for a patient"""
        try:
            pid = ObjectId(patient_id)
            return list(
                mongo_db.ehr_records.find({"patient_id": pid})
                .sort("created_at", -1)
                .limit(limit)
            )
        except Exception:
            raise ValueError("Invalid patient_id format")
    
    @staticmethod
    def get_by_id(record_id: str):
        """Get single EHR record by ID"""
        try:
            return mongo_db.ehr_records.find_one({"_id": ObjectId(record_id)})
        except Exception:
            raise ValueError("Invalid record_id format")
    
    @staticmethod
    def create_record(data: dict) -> str:
        """Create new EHR record"""
        # Validate first
        EHRModel.validate_ehr_record(data)
        
        # Get next version
        version = EHRModel.get_next_version(data["patient_id"])
        
        # Prepare record
        record = {
            **data,
            "version": version,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Convert string IDs to ObjectId
        record["patient_id"] = ObjectId(record["patient_id"])
        record["doctor_id"] = ObjectId(record["doctor_id"])
        
        if "appointment_id" in record:
            record["appointment_id"] = ObjectId(record["appointment_id"])
        
        # Insert
        result = mongo_db.ehr_records.insert_one(record)
        return str(result.inserted_id)
    
    @staticmethod
    def update_record(record_id: str, updates: dict):
        """Update EHR record (limited fields only)"""
        try:
            # Don't allow changing patient_id, doctor_id, version
            protected = ["patient_id", "doctor_id", "version", "created_at"]
            for field in protected:
                updates.pop(field, None)
            
            updates["updated_at"] = datetime.utcnow()
            
            result = mongo_db.ehr_records.update_one(
                {"_id": ObjectId(record_id)},
                {"$set": updates}
            )
            
            return result.modified_count > 0
        except Exception:
            raise ValueError("Invalid record_id format")
