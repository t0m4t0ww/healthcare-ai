# backend/app/model/users.py
from datetime import datetime
from bson import ObjectId
from app.extensions import mongo_db

class UserModel:
    """
    Model for managing users (patients, doctors, admins)
    Collection: users
    """
    
    @staticmethod
    def ensure_indexes():
        """Create indexes for users collection"""
        try:
            # Email unique index
            mongo_db.users.create_index(
                "email",
                unique=True,
                name="unique_email"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
            print(f"ℹ️  Email index already exists")
        
        try:
            # Role index for filtering
            mongo_db.users.create_index(
                "role",
                name="role_index"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Phone index for search
            mongo_db.users.create_index(
                "phone",
                name="phone_index",
                sparse=True
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Full name text index for search
            mongo_db.users.create_index(
                [("name", "text")],
                name="name_text_search"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Doctor specialty index
            mongo_db.users.create_index(
                "doctor_profile.specialization",
                name="doctor_specialty",
                sparse=True
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Active status index
            mongo_db.users.create_index(
                [("is_active", 1), ("role", 1)],
                name="active_role"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        print("✅ Users indexes created successfully")
    
    @staticmethod
    def validate_user(data: dict):
        """Validate user data"""
        if not isinstance(data, dict):
            raise ValueError("Data must be a dictionary")
        
        # Required fields
        required = ["email", "name", "role"]
        missing = [field for field in required if not data.get(field)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Validate email format
        email = data.get("email", "")
        if "@" not in email or "." not in email:
            raise ValueError("Invalid email format")
        
        # Validate role
        valid_roles = ["patient", "doctor", "admin", "staff"]
        if data.get("role") not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        return True
    
    @staticmethod
    def validate_doctor_profile(data: dict):
        """Validate doctor profile data"""
        required = ["specialization", "license_number"]
        missing = [field for field in required if not data.get(field)]
        if missing:
            raise ValueError(f"Missing required doctor fields: {', '.join(missing)}")
        
        return True
    
    @staticmethod
    def get_by_id(user_id: str):
        """Get user by ID"""
        try:
            return mongo_db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            raise ValueError("Invalid user ID format")
    
    @staticmethod
    def get_by_email(email: str):
        """Get user by email"""
        return mongo_db.users.find_one({"email": email})
    
    @staticmethod
    def get_doctors(filters: dict = None, limit: int = 100):
        """Get list of doctors with optional filters"""
        query = {"role": "doctor", "is_active": True}
        if filters:
            query.update(filters)
        
        return list(mongo_db.users.find(query).limit(limit))
    
    @staticmethod
    def update_last_login(user_id: str):
        """Update user's last login timestamp"""
        try:
            mongo_db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        except Exception as e:
            print(f"Error updating last login: {e}")
