# backend/app/services/ehr_service.py
from datetime import datetime
from bson import ObjectId
from app.extensions import mongo_db, socketio

def clean_for_json(obj):
    """
    Recursively clean object for JSON serialization
    Removes None values and converts ObjectIds to strings
    """
    if obj is None:
        return ""
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if v is None:
                continue  # Skip None values
            cleaned[k] = clean_for_json(v)
        return cleaned
    elif isinstance(obj, list):
        return [clean_for_json(item) for item in obj if item is not None]
    elif isinstance(obj, (str, int, float, bool)):
        return obj
    else:
        # For any other type, convert to string
        return str(obj) if obj is not None else ""

class EHRService:
    """Business logic cho Electronic Health Records"""
    
    @staticmethod
    def get_next_version(patient_id):
        """Lấy version tiếp theo cho patient"""
        try:
            oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid patient_id")
        
        # Tìm version cao nhất
        latest = mongo_db.ehr_records.find_one(
            {"patient_id": oid},
            sort=[("version", -1)]
        )
        
        if not latest:
            return 1
        
        return latest.get("version", 0) + 1
    
    @staticmethod
    def get_allowed_fields_by_role(role):
        """
        Projection fields theo role (RBAC)
        - patient: không thấy internal_notes
        - doctor/admin: thấy full
        """
        if role == "patient":
            return {
                "internal_notes": 0,  # Ẩn ghi chú nội bộ
                "consent_snapshot": 0  # Ẩn consent metadata
            }
        
        # doctor/admin: full access
        return {}
    
    @staticmethod
    def validate_ehr_record(data):
        """Validate EHR record data"""
        required = ["patient_id", "doctor_id"]
        for field in required:
            if field not in data:
                raise ValueError(f"Thiếu field: {field}")
        
        # Validate ObjectIds
        try:
            ObjectId(data["patient_id"])
            ObjectId(data["doctor_id"])
            if "appointment_id" in data and data["appointment_id"]:
                ObjectId(data["appointment_id"])
        except:
            raise ValueError("Invalid ObjectId format")
        
        # Validate vitals nếu có
        if "vital_signs" in data:
            vitals = data["vital_signs"]
            if not isinstance(vitals, dict):
                raise ValueError("vital_signs phải là object")
        
        # Validate prescription format
        if "prescription" in data:
            if not isinstance(data["prescription"], list):
                raise ValueError("prescription phải là array")
            
            for rx in data["prescription"]:
                if not isinstance(rx, dict):
                    raise ValueError("Mỗi prescription item phải là object")
                required_rx = ["drug_name", "dosage", "frequency", "duration"]
                for field in required_rx:
                    if field not in rx:
                        raise ValueError(f"Prescription thiếu field: {field}")
        
        return True
    
    @staticmethod
    def create_record(data, created_by_id):
        """
        Tạo EHR record mới (append-only)
        
        Args:
            data: dict chứa thông tin record
            created_by_id: ID của doctor/admin tạo record
        
        Returns:
            dict: Record đã tạo
        """
        # Validate required fields
        EHRService.validate_ehr_record(data)
        
        try:
            patient_oid = ObjectId(data["patient_id"])
            doctor_oid = ObjectId(data["doctor_id"])
            creator_oid = ObjectId(created_by_id)
        except:
            raise ValueError("Invalid ObjectId")
        
        # Get next version
        version = EHRService.get_next_version(data["patient_id"])
        
        # Get patient consent snapshot
        patient = mongo_db.patients.find_one({"_id": patient_oid})
        if not patient:
            raise ValueError("Patient không tồn tại")
        
        consent_snapshot = {
            "ehr_consent": patient.get("ehr_consent", False),
            "data_sharing_consent": patient.get("data_sharing_consent", False),
            "timestamp": datetime.utcnow()
        }
        
        # Build record document
        record_doc = {
            "patient_id": patient_oid,
            "doctor_id": doctor_oid,
            "version": version,
            "created_by": creator_oid,
            "created_at": datetime.utcnow(),
            "consent_snapshot": consent_snapshot,
            
            # Medical data
            "vital_signs": data.get("vital_signs", {}),
            "chief_complaint": data.get("chief_complaint", ""),
            "diagnosis": data.get("diagnosis", {}),
            "symptoms": data.get("symptoms", []),
            "prescription": data.get("prescription", []),
            "procedures": data.get("procedures", []),
            "lab_results": data.get("lab_results", []),
            "attachments": data.get("attachments", []),
            
            "doctor_notes": data.get("doctor_notes", ""),
            "internal_notes": data.get("internal_notes", ""),
            
            "follow_up_required": data.get("follow_up_required", False),
            "follow_up_date": data.get("follow_up_date"),
            "follow_up_notes": data.get("follow_up_notes", ""),
            
            "record_type": data.get("record_type", "consultation")
        }
        
        # Add appointment_id if provided
        appointment_id = None
        if "appointment_id" in data and data["appointment_id"]:
            try:
                appointment_id = ObjectId(data["appointment_id"])
                record_doc["appointment_id"] = appointment_id
            except:
                pass
        
        # Insert record
        result = mongo_db.ehr_records.insert_one(record_doc)
        
        # ✅ CRITICAL: Update appointment status to 'completed' after saving EHR
        if appointment_id:
            try:
                mongo_db.appointments.update_one(
                    {"_id": appointment_id},
                    {
                        "$set": {
                            "status": "completed",
                            "completed_at": datetime.utcnow(),
                            "ehr_record_id": result.inserted_id,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                print(f"✅ Updated appointment {appointment_id} to 'completed'")
            except Exception as e:
                print(f"⚠️ Failed to update appointment status: {e}")
        
        # Convert ObjectIds to strings for response
        record_doc["_id"] = str(result.inserted_id)
        record_doc["patient_id"] = str(record_doc["patient_id"])
        record_doc["doctor_id"] = str(record_doc["doctor_id"])
        record_doc["created_by"] = str(record_doc["created_by"])
        if "appointment_id" in record_doc:
            record_doc["appointment_id"] = str(record_doc["appointment_id"])
        
        # ✅ Emit Socket.IO event for real-time updates
        try:
            socketio.emit("ehr_record_created", {
                "record_id": record_doc["_id"],
                "patient_id": record_doc["patient_id"],
                "doctor_id": record_doc["doctor_id"],
                "record_type": record_doc.get("record_type", "consultation"),
                "created_at": record_doc["created_at"].isoformat(),
                "chief_complaint": record_doc.get("chief_complaint", ""),
                "diagnosis": record_doc.get("diagnosis", {}).get("primary", "")
            })
            print(f"✅ Emitted ehr_record_created event for patient {record_doc['patient_id']}")
        except Exception as e:
            print(f"⚠️ Failed to emit socket event: {e}")
        
        return record_doc
    
    @staticmethod
    def get_patient_records(patient_id, filters=None, role="patient"):
        """
        Lấy danh sách records của patient
        
        Args:
            patient_id: ID patient
            filters: {
                "type": str,
                "doctor_id": str,
                "start_date": str,
                "end_date": str,
                "search": str
            }
            role: Role của người request (patient/doctor/admin)
        
        Returns:
            list: Danh sách records (đã filter theo role)
        """
        print(f"\n🔍 EHRService.get_patient_records()")
        print(f"   patient_id: {patient_id}")
        print(f"   filters: {filters}")
        print(f"   role: {role}")
        
        try:
            patient_oid = ObjectId(patient_id)
            print(f"   patient_oid: {patient_oid}")
        except Exception as e:
            print(f"   ❌ Invalid patient_id: {e}")
            raise ValueError("Invalid patient_id")
        
        query = {"patient_id": patient_oid}
        
        # Apply filters
        if filters:
            if "type" in filters:
                query["record_type"] = filters["type"]
            
            if "doctor_id" in filters:
                try:
                    query["doctor_id"] = ObjectId(filters["doctor_id"])
                except:
                    pass
            
            if "start_date" in filters and "end_date" in filters:
                try:
                    start = datetime.fromisoformat(filters["start_date"])
                    end = datetime.fromisoformat(filters["end_date"])
                    query["created_at"] = {"$gte": start, "$lte": end}
                except:
                    pass
            
            # Text search
            if "search" in filters and filters["search"]:
                search_term = filters["search"]
                query["$or"] = [
                    {"chief_complaint": {"$regex": search_term, "$options": "i"}},
                    {"diagnosis.primary": {"$regex": search_term, "$options": "i"}},
                    {"doctor_notes": {"$regex": search_term, "$options": "i"}}
                ]
        
        print(f"   📋 MongoDB query: {query}")
        
        # Get projection based on role
        projection = EHRService.get_allowed_fields_by_role(role)
        
        # Query records - don't sort in MongoDB if created_at might be None
        # We'll sort in Python to handle None values safely
        records = list(
            mongo_db.ehr_records.find(query, projection)
        )
        
        print(f"   ✅ Found {len(records)} records in database")
        
        # ✅ Sort in Python to handle None values safely
        # Records with None created_at will be sorted to the end
        records.sort(key=lambda r: (
            r.get("created_at") if r.get("created_at") is not None 
            else datetime.min
        ), reverse=True)
        
        # Get patient info once (for all records - same patient)
        patient_info_cached = None
        if records:
            patient = mongo_db.patients.find_one({"_id": patient_oid})
            if patient:
                patient_info_cached = {
                    # Basic info
                    "name": patient.get("full_name", ""),
                    "dob": patient.get("date_of_birth", ""),
                    "gender": patient.get("gender", ""),
                    "phone": patient.get("phone", ""),
                    "email": patient.get("email", ""),
                    "address": patient.get("address", ""),
                    
                    # Administrative info
                    "citizen_id": patient.get("citizen_id", ""),
                    "occupation": patient.get("occupation", ""),
                    "insurance_bhyt": patient.get("insurance_bhyt", ""),
                    
                    # Medical history
                    "medical_history": patient.get("medical_history", ""),
                    "chronic_conditions": patient.get("chronic_conditions", ""),
                    "past_surgeries": patient.get("past_surgeries", ""),
                    "vaccination_history": patient.get("vaccination_history", ""),
                    "family_history": patient.get("family_history", ""),
                    
                    # Allergies
                    "allergies_medications": patient.get("allergies_medications", ""),
                    "allergies_food": patient.get("allergies_food", ""),
                    "allergies_environment": patient.get("allergies_environment", ""),
                    
                    # Current medications
                    "current_medications": patient.get("current_medications", ""),
                    
                    # Lifestyle
                    "smoking_status": patient.get("smoking_status", ""),
                    "alcohol_consumption": patient.get("alcohol_consumption", ""),
                    "exercise_frequency": patient.get("exercise_frequency", ""),
                    
                    # Emergency contact
                    "emergency_contact": patient.get("emergency_contact", {}),
                    
                    # Insurance
                    "insurance": patient.get("insurance", {})
                }
        
        # Populate doctor info and patient info for each record
        processed_records = []
        for record in records:
            try:
                # Convert ObjectIds to strings
                record["_id"] = str(record["_id"])
                record["patient_id"] = str(record["patient_id"])
                
                # ✅ Handle doctor_id - might be None for uploaded records
                doctor_id = record.get("doctor_id")
                if doctor_id:
                    try:
                        record["doctor_id"] = str(doctor_id)
                        # Get doctor info
                        doctor = mongo_db.doctors.find_one({"_id": ObjectId(doctor_id)})
                        if doctor:
                            record["doctor_info"] = {
                                "full_name": doctor.get("full_name", "") or "",
                                "name": doctor.get("full_name", "") or "",
                                "specialty": doctor.get("specialty", "") or "",
                                "subspecialty": doctor.get("subspecialty", "") or "",
                                "avatar": doctor.get("avatar_url", "") or ""
                            }
                        else:
                            record["doctor_info"] = {
                                "full_name": "Không xác định",
                                "name": "Không xác định",
                                "specialty": "",
                                "avatar": ""
                            }
                    except Exception as doc_err:
                        print(f"   ⚠️ Error processing doctor_id: {doc_err}")
                        record["doctor_id"] = ""
                        record["doctor_info"] = {
                            "full_name": "Không xác định",
                            "name": "Không xác định",
                            "specialty": "",
                            "avatar": ""
                        }
                else:
                    # No doctor_id (e.g., uploaded PDF records)
                    record["doctor_id"] = ""
                    record["doctor_info"] = {
                        "full_name": "Hệ thống",
                        "name": "Hệ thống",
                        "specialty": "",
                        "avatar": ""
                    }
                
                # Convert other ObjectIds
                if "appointment_id" in record and record["appointment_id"]:
                    record["appointment_id"] = str(record["appointment_id"])
                if "created_by" in record and record["created_by"]:
                    record["created_by"] = str(record["created_by"])
                
                # ✅ Clean all None values and ObjectIds recursively for JSON serialization
                cleaned_record = clean_for_json(record)
                
                # Add cached patient info to each record (also clean it)
                if patient_info_cached:
                    cleaned_record["patient_info"] = clean_for_json(patient_info_cached)
                
                processed_records.append(cleaned_record)
                
            except Exception as record_err:
                print(f"   ⚠️ Error processing record {record.get('_id')}: {record_err}")
                import traceback
                traceback.print_exc()
                continue  # Skip this record if processing fails
        
        print(f"   ✅ Processed {len(processed_records)} records successfully")
        return processed_records
    
    @staticmethod
    def get_record_by_id(record_id, role="patient"):
        """
        Lấy chi tiết 1 record
        
        Args:
            record_id: ID record
            role: Role của người request
        
        Returns:
            dict: Record details
        """
        try:
            record_oid = ObjectId(record_id)
        except:
            raise ValueError("Invalid record_id")
        
        # Get projection based on role
        projection = EHRService.get_allowed_fields_by_role(role)
        
        record = mongo_db.ehr_records.find_one({"_id": record_oid}, projection)
        if not record:
            raise ValueError("Record không tồn tại")
        
        # Convert ObjectIds
        record["_id"] = str(record["_id"])
        record["patient_id"] = str(record["patient_id"])
        record["doctor_id"] = str(record["doctor_id"])
        if "appointment_id" in record:
            record["appointment_id"] = str(record["appointment_id"])
        if "created_by" in record:
            record["created_by"] = str(record["created_by"])
        
        # Populate doctor info
        # ✅ FIX: Query doctors collection, not users (record["doctor_id"] is doctors._id)
        doctor = mongo_db.doctors.find_one({"_id": ObjectId(record["doctor_id"])})
        if doctor:
            record["doctor_info"] = {
                "full_name": doctor.get("full_name", ""),
                "name": doctor.get("full_name", ""),  # Alias for compatibility
                "specialty": doctor.get("specialty", ""),
                "subspecialty": doctor.get("subspecialty", ""),
                "avatar": doctor.get("avatar_url", ""),
                "license_number": doctor.get("license_no", "")
            }
        
        # Populate patient info - COMPREHENSIVE (all fields from PatientProfile)
        patient = mongo_db.patients.find_one({"_id": ObjectId(record["patient_id"])})
        if patient:
            record["patient_info"] = {
                # Basic info
                "name": patient.get("full_name", ""),
                "dob": patient.get("date_of_birth", ""),
                "gender": patient.get("gender", ""),
                "phone": patient.get("phone", ""),
                "email": patient.get("email", ""),
                "address": patient.get("address", ""),
                
                # Administrative info
                "citizen_id": patient.get("citizen_id", ""),
                "occupation": patient.get("occupation", ""),
                "insurance_bhyt": patient.get("insurance_bhyt", ""),
                
                # Medical history
                "medical_history": patient.get("medical_history", ""),
                "chronic_conditions": patient.get("chronic_conditions", ""),
                "past_surgeries": patient.get("past_surgeries", ""),
                "vaccination_history": patient.get("vaccination_history", ""),
                "family_history": patient.get("family_history", ""),
                
                # Allergies
                "allergies_medications": patient.get("allergies_medications", ""),
                "allergies_food": patient.get("allergies_food", ""),
                "allergies_environment": patient.get("allergies_environment", ""),
                
                # Current medications
                "current_medications": patient.get("current_medications", ""),
                
                # Lifestyle
                "smoking_status": patient.get("smoking_status", ""),
                "alcohol_consumption": patient.get("alcohol_consumption", ""),
                "exercise_frequency": patient.get("exercise_frequency", ""),
                
                # Emergency contact
                "emergency_contact": patient.get("emergency_contact", {}),
                
                # Insurance
                "insurance": patient.get("insurance", {})
            }
        
        return record
    
    @staticmethod
    def get_record_timeline(patient_id):
        """
        Lấy timeline tất cả versions của patient
        (Useful cho xem lịch sử điều trị)
        
        Returns:
            list: Timeline records sorted by version desc
        """
        try:
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid patient_id")
        
        records = list(
            mongo_db.ehr_records.find({"patient_id": patient_oid})
            .sort("version", -1)
        )
        
        # Convert ObjectIds
        for record in records:
            record["_id"] = str(record["_id"])
            record["patient_id"] = str(record["patient_id"])
            record["doctor_id"] = str(record["doctor_id"])
            if "appointment_id" in record:
                record["appointment_id"] = str(record["appointment_id"])
            
            # Minimal doctor info
            doctor = mongo_db.users.find_one(
                {"_id": ObjectId(record["doctor_id"])},
                {"name": 1, "avatar_url": 1}
            )
            if doctor:
                record["doctor_name"] = doctor.get("name", "")
                record["doctor_avatar"] = doctor.get("avatar_url", "")
        
        return records
    
    @staticmethod
    def update_record(record_id, updates, updated_by_id):
        """
        Cập nhật record (tạo version mới - append-only)
        
        Args:
            record_id: ID record gốc
            updates: dict chứa fields cần update
            updated_by_id: ID người update
        
        Returns:
            dict: Record version mới
        """
        try:
            record_oid = ObjectId(record_id)
            updater_oid = ObjectId(updated_by_id)
        except:
            raise ValueError("Invalid ObjectId")
        
        # Get original record
        original = mongo_db.ehr_records.find_one({"_id": record_oid})
        if not original:
            raise ValueError("Record không tồn tại")
        
        # Get next version
        next_version = EHRService.get_next_version(str(original["patient_id"]))
        
        # Create new version với updates
        new_record = dict(original)
        del new_record["_id"]  # Remove old _id
        
        new_record["version"] = next_version
        new_record["created_by"] = updater_oid
        new_record["created_at"] = datetime.utcnow()
        
        # Apply updates
        allowed_updates = [
            "vital_signs", "chief_complaint", "diagnosis", "symptoms",
            "prescription", "procedures", "lab_results", "attachments",
            "doctor_notes", "internal_notes", "follow_up_required",
            "follow_up_date", "follow_up_notes"
        ]
        
        for key, value in updates.items():
            if key in allowed_updates:
                new_record[key] = value
        
        # Add update reason
        if "update_reason" in updates:
            new_record["update_reason"] = updates["update_reason"]
        
        # Insert new version
        result = mongo_db.ehr_records.insert_one(new_record)
        new_record["_id"] = str(result.inserted_id)
        new_record["patient_id"] = str(new_record["patient_id"])
        new_record["doctor_id"] = str(new_record["doctor_id"])
        new_record["created_by"] = str(new_record["created_by"])
        
        return new_record
    
    @staticmethod
    def get_patient_stats(patient_id):
        """
        Lấy thống kê records của patient
        
        Returns:
            dict: Stats summary
        """
        try:
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid patient_id")
        
        pipeline = [
            {"$match": {"patient_id": patient_oid}},
            {
                "$group": {
                    "_id": "$record_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        type_counts = list(mongo_db.ehr_records.aggregate(pipeline))
        
        stats = {
            "total": mongo_db.ehr_records.count_documents({"patient_id": patient_oid}),
            "by_type": {}
        }
        
        for item in type_counts:
            record_type = item.get("_id")
            if record_type:  # Only add if not None
                stats["by_type"][str(record_type)] = item.get("count", 0)
        
        # Latest record - handle None created_at
        try:
            latest = mongo_db.ehr_records.find_one(
                {"patient_id": patient_oid},
                sort=[("created_at", -1)]
            )
            
            if latest and latest.get("created_at"):
                stats["latest_visit"] = latest.get("created_at")
            else:
                # Try to get latest by _id if created_at is None
                latest = mongo_db.ehr_records.find_one(
                    {"patient_id": patient_oid},
                    sort=[("_id", -1)]
                )
                if latest:
                    stats["latest_visit"] = latest.get("created_at") or latest.get("visit_date") or ""
        except Exception as e:
            print(f"   ⚠️ Error getting latest visit: {e}")
            stats["latest_visit"] = ""
        
        # ✅ Ensure no None values in stats
        stats["by_type"] = {k: v for k, v in stats["by_type"].items() if k is not None and v is not None}
        if stats.get("latest_visit") is None:
            stats["latest_visit"] = ""
        
        return stats
    
    @staticmethod
    def search_records(patient_id, search_query):
        """
        Full-text search trong records
        
        Args:
            patient_id: ID patient
            search_query: Từ khóa tìm kiếm
        
        Returns:
            list: Matching records
        """
        try:
            patient_oid = ObjectId(patient_id)
        except:
            raise ValueError("Invalid patient_id")
        
        query = {
            "patient_id": patient_oid,
            "$or": [
                {"chief_complaint": {"$regex": search_query, "$options": "i"}},
                {"diagnosis.primary": {"$regex": search_query, "$options": "i"}},
                {"doctor_notes": {"$regex": search_query, "$options": "i"}},
                {"symptoms": {"$regex": search_query, "$options": "i"}},
                {"prescription.drug_name": {"$regex": search_query, "$options": "i"}}
            ]
        }
        
        records = list(
            mongo_db.ehr_records.find(query)
            .sort("created_at", -1)
            .limit(20)
        )
        
        # Convert ObjectIds
        for record in records:
            record["_id"] = str(record["_id"])
            record["patient_id"] = str(record["patient_id"])
            record["doctor_id"] = str(record["doctor_id"])
        
        return records


# Audit logging helper
def log_ehr_access(record_id, accessed_by_id, action="VIEW"):
    """
    Ghi log mỗi lần truy cập EHR record
    
    Args:
        record_id: ID record được truy cập
        accessed_by_id: ID người truy cập
        action: VIEW, EDIT, DELETE, SHARE, DOWNLOAD
    """
    try:
        record_oid = ObjectId(record_id)
        user_oid = ObjectId(accessed_by_id)
    except:
        return
    
    audit_log = {
        "record_id": record_oid,
        "accessed_by": user_oid,
        "action": action,
        "timestamp": datetime.utcnow(),
        "ip_address": None,  # TODO: Get from request
        "user_agent": None   # TODO: Get from request
    }
    
    mongo_db.audit_logs.insert_one(audit_log)