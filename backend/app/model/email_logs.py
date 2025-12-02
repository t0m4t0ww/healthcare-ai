# backend/app/model/email_logs.py
from datetime import datetime
from app.extensions import mongo_db
from bson import ObjectId

class EmailLogModel:
    """
    Model for tracking email sending history
    Collection: email_logs
    """
    
    @staticmethod
    def ensure_indexes():
        """Create indexes for email_logs collection"""
        # Index by patient_id for quick lookup
        mongo_db.email_logs.create_index([
            ("patient_id", 1),
            ("sent_at", -1)
        ], name="patient_history")
        
        # Index by type and status
        mongo_db.email_logs.create_index([
            ("type", 1),
            ("status", 1)
        ], name="type_status")
        
        # Index by appointment_id
        mongo_db.email_logs.create_index(
            "appointment_id",
            name="appointment_ref"
        )
        
        # TTL index to auto-delete logs after 90 days (optional)
        mongo_db.email_logs.create_index(
            "sent_at",
            expireAfterSeconds=90*24*60*60,  # 90 days
            name="ttl_email_logs"
        )
    
    @staticmethod
    def log_email(email_type, to, patient_id=None, appointment_id=None, doctor_id=None, status="sent", error_message=None, metadata=None):
        """
        Log email sending activity
        
        Args:
            email_type: welcome, appointment_confirmation, post_consultation, verification, password_reset
            to: recipient email
            patient_id: ObjectId or str
            appointment_id: ObjectId or str
            doctor_id: ObjectId or str
            status: sent, failed, pending
            error_message: error details if failed
            metadata: additional data (dict)
        """
        try:
            log_data = {
                "type": email_type,
                "to": to,
                "status": status,
                "sent_at": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            
            # Convert IDs to ObjectId (validate first)
            if patient_id:
                try:
                    log_data["patient_id"] = ObjectId(patient_id) if isinstance(patient_id, str) else patient_id
                except:
                    log_data["patient_id_str"] = str(patient_id)  # Store as string if invalid ObjectId
            
            if appointment_id:
                try:
                    log_data["appointment_id"] = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
                except:
                    log_data["appointment_id_str"] = str(appointment_id)
            
            if doctor_id:
                try:
                    log_data["doctor_id"] = ObjectId(doctor_id) if isinstance(doctor_id, str) else doctor_id
                except:
                    log_data["doctor_id_str"] = str(doctor_id)
            
            if error_message:
                log_data["error_message"] = error_message
            
            if metadata:
                log_data["metadata"] = metadata
            
            result = mongo_db.email_logs.insert_one(log_data)
            return str(result.inserted_id)
        
        except Exception as e:
            print(f"❌ Error logging email: {e}")
            return None
    
    @staticmethod
    def get_patient_email_history(patient_id, limit=50):
        """Get email history for a patient"""
        try:
            # Try to convert to ObjectId, fallback to string search
            try:
                patient_oid = ObjectId(patient_id) if isinstance(patient_id, str) else patient_id
                query = {"patient_id": patient_oid}
            except:
                # If not valid ObjectId, search by string field
                query = {"patient_id_str": str(patient_id)}
            
            logs = list(mongo_db.email_logs.find(query).sort("sent_at", -1).limit(limit))
            
            return logs
        
        except Exception as e:
            print(f"❌ Error getting email history: {e}")
            return []
    
    @staticmethod
    def get_email_stats(start_date=None, end_date=None):
        """Get email sending statistics"""
        try:
            match_filter = {}
            
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                match_filter["sent_at"] = date_filter
            
            pipeline = [
                {"$match": match_filter},
                {"$group": {
                    "_id": {
                        "type": "$type",
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id.type": 1}}
            ]
            
            results = list(mongo_db.email_logs.aggregate(pipeline))
            
            # Format results
            stats = {}
            for result in results:
                email_type = result["_id"]["type"]
                status = result["_id"]["status"]
                count = result["count"]
                
                if email_type not in stats:
                    stats[email_type] = {"sent": 0, "failed": 0, "pending": 0}
                
                stats[email_type][status] = count
            
            return stats
        
        except Exception as e:
            print(f"❌ Error getting email stats: {e}")
            return {}
    
    @staticmethod
    def check_email_sent(email_type, patient_id=None, appointment_id=None, within_hours=24):
        """
        Check if an email of this type was already sent recently
        Returns: True if already sent, False otherwise
        """
        try:
            from datetime import timedelta
            
            cutoff_time = datetime.utcnow() - timedelta(hours=within_hours)
            
            query = {
                "type": email_type,
                "status": "sent",
                "sent_at": {"$gte": cutoff_time}
            }
            
            if patient_id:
                try:
                    query["patient_id"] = ObjectId(patient_id) if isinstance(patient_id, str) else patient_id
                except:
                    query["patient_id_str"] = str(patient_id)
            
            if appointment_id:
                try:
                    query["appointment_id"] = ObjectId(appointment_id) if isinstance(appointment_id, str) else appointment_id
                except:
                    query["appointment_id_str"] = str(appointment_id)
            
            count = mongo_db.email_logs.count_documents(query)
            return count > 0
        
        except Exception as e:
            print(f"❌ Error checking email sent: {e}")
            return False


# Initialize indexes when module is imported
def init_email_logs_model():
    """Initialize email_logs model and indexes"""
    try:
        EmailLogModel.ensure_indexes()
        print("✅ EmailLogModel indexes created")
    except Exception as e:
        print(f"⚠️ Error creating EmailLogModel indexes: {e}")

