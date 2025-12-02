# backend/app/model/ratings.py
from datetime import datetime
from bson import ObjectId
from app.extensions import mongo_db

class RatingModel:
    """
    Model for managing doctor ratings/reviews
    Collection: ratings
    
    Schema:
    - patient_id: ObjectId (bệnh nhân đánh giá)
    - doctor_id: ObjectId (bác sĩ được đánh giá)
    - appointment_id: ObjectId (cuộc hẹn liên quan)
    - rating: int (1-5 sao)
    - comment: str (nhận xét chi tiết)
    - tags: list (các tag như "Thân thiện", "Giải thích rõ ràng"...)
    - is_anonymous: bool (ẩn danh hay không)
    - created_at: datetime
    - updated_at: datetime
    """
    
    @staticmethod
    def ensure_indexes():
        """Tạo indexes cho ratings collection"""
        try:
            # Index cho doctor_id để query nhanh
            mongo_db.ratings.create_index(
                "doctor_id",
                name="doctor_ratings"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Index cho patient_id
            mongo_db.ratings.create_index(
                "patient_id",
                name="patient_ratings"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Unique constraint: Mỗi appointment chỉ được đánh giá 1 lần
            mongo_db.ratings.create_index(
                "appointment_id",
                unique=True,
                name="unique_appointment_rating"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Compound index để query ratings của doctor theo thời gian
            mongo_db.ratings.create_index(
                [("doctor_id", 1), ("created_at", -1)],
                name="doctor_ratings_by_date"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        try:
            # Index để filter theo rating score
            mongo_db.ratings.create_index(
                [("doctor_id", 1), ("rating", -1)],
                name="doctor_ratings_by_score"
            )
        except Exception as e:
            if "already exists" not in str(e):
                raise
        
        print("✅ Ratings indexes created successfully")
    
    @staticmethod
    def validate_rating(data: dict):
        """Validate rating data"""
        if not isinstance(data, dict):
            raise ValueError("Data must be a dictionary")
        
        # Required fields
        required = ["patient_id", "doctor_id", "appointment_id", "rating"]
        missing = [field for field in required if field not in data]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Validate rating score (1-5)
        rating = data.get("rating")
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            raise ValueError("Rating must be an integer between 1 and 5")
        
        # Validate ObjectIds
        try:
            ObjectId(data["patient_id"])
            ObjectId(data["doctor_id"])
            ObjectId(data["appointment_id"])
        except Exception:
            raise ValueError("Invalid ObjectId format for patient_id, doctor_id, or appointment_id")
        
        return True
    
    @staticmethod
    def can_rate_appointment(appointment_id: str, patient_id: str):
        """
        Kiểm tra bệnh nhân có đủ điều kiện đánh giá không
        
        Điều kiện:
        1. Appointment phải đã completed
        2. Patient phải là người trong appointment đó
        3. Chưa đánh giá appointment này trước đó
        
        Returns: (can_rate: bool, reason: str)
        """
        try:
            appointment_oid = ObjectId(appointment_id)
            patient_oid = ObjectId(patient_id)
        except Exception:
            return False, "Invalid ID format"
        
        # Kiểm tra appointment tồn tại
        appointment = mongo_db.appointments.find_one({"_id": appointment_oid})
        if not appointment:
            return False, "Appointment không tồn tại"
        
        # Kiểm tra patient đúng người - hỗ trợ cả ObjectId và string
        appointment_patient_id = appointment.get("patient_id")
        
        # Convert to ObjectId if string
        if isinstance(appointment_patient_id, str):
            try:
                appointment_patient_id = ObjectId(appointment_patient_id)
            except:
                pass
        
        # Debug logging
        print(f"🔍 [Rating Check] Appointment patient_id: {appointment_patient_id} (type: {type(appointment_patient_id)})")
        print(f"🔍 [Rating Check] Current patient_id: {patient_oid} (type: {type(patient_oid)})")
        print(f"🔍 [Rating Check] Match: {appointment_patient_id == patient_oid}")
        
        if appointment_patient_id != patient_oid:
            return False, f"Bạn không phải là bệnh nhân trong cuộc hẹn này (appointment: {appointment_patient_id}, current: {patient_oid})"
        
        # Kiểm tra appointment đã completed
        if appointment.get("status") != "completed":
            return False, "Cuộc hẹn chưa hoàn tất. Chỉ có thể đánh giá sau khi khám xong."
        
        # Kiểm tra đã đánh giá chưa
        existing_rating = mongo_db.ratings.find_one({"appointment_id": appointment_oid})
        if existing_rating:
            return False, "Bạn đã đánh giá cuộc hẹn này rồi"
        
        return True, "OK"
    
    @staticmethod
    def create_rating(data: dict):
        """
        Tạo rating mới
        
        Args:
            data: dict chứa patient_id, doctor_id, appointment_id, rating, comment, tags, is_anonymous
        
        Returns:
            rating document
        """
        # Validate data
        RatingModel.validate_rating(data)
        
        # Check permissions
        can_rate, reason = RatingModel.can_rate_appointment(
            str(data["appointment_id"]),
            str(data["patient_id"])
        )
        if not can_rate:
            raise ValueError(reason)
        
        # Prepare rating document
        rating_doc = {
            "patient_id": ObjectId(data["patient_id"]),
            "doctor_id": ObjectId(data["doctor_id"]),
            "appointment_id": ObjectId(data["appointment_id"]),
            "rating": int(data["rating"]),
            "comment": data.get("comment", "").strip(),
            "tags": data.get("tags", []),
            "is_anonymous": data.get("is_anonymous", False),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert rating
        result = mongo_db.ratings.insert_one(rating_doc)
        rating_doc["_id"] = result.inserted_id
        
        # Update doctor's average rating
        RatingModel.update_doctor_rating_stats(str(data["doctor_id"]))
        
        return rating_doc
    
    @staticmethod
    def update_doctor_rating_stats(doctor_id: str):
        """
        Tính lại và cập nhật rating trung bình của bác sĩ
        
        Args:
            doctor_id: Doctor ID
        """
        try:
            doctor_oid = ObjectId(doctor_id)
        except Exception:
            raise ValueError("Invalid doctor_id format")
        
        # Aggregate ratings
        pipeline = [
            {"$match": {"doctor_id": doctor_oid}},
            {"$group": {
                "_id": "$doctor_id",
                "average_rating": {"$avg": "$rating"},
                "total_ratings": {"$sum": 1},
                "rating_distribution": {
                    "$push": "$rating"
                }
            }}
        ]
        
        result = list(mongo_db.ratings.aggregate(pipeline))
        
        if result:
            stats = result[0]
            avg_rating = round(stats["average_rating"], 2)
            total_ratings = stats["total_ratings"]
            
            # Calculate rating distribution (count of each star)
            distribution = stats["rating_distribution"]
            rating_counts = {
                "5_star": distribution.count(5),
                "4_star": distribution.count(4),
                "3_star": distribution.count(3),
                "2_star": distribution.count(2),
                "1_star": distribution.count(1)
            }
        else:
            avg_rating = 0
            total_ratings = 0
            rating_counts = {
                "5_star": 0,
                "4_star": 0,
                "3_star": 0,
                "2_star": 0,
                "1_star": 0
            }
        
        # Update doctor document in users collection
        mongo_db.users.update_one(
            {"_id": doctor_oid, "role": "doctor"},
            {
                "$set": {
                    "rating_stats": {
                        "average_rating": avg_rating,
                        "total_ratings": total_ratings,
                        "rating_distribution": rating_counts,
                        "last_updated": datetime.utcnow()
                    }
                }
            }
        )
        
        # Also update doctors collection (primary storage for ratings)
        mongo_db.doctors.update_one(
            {"_id": doctor_oid},
            {
                "$set": {
                    "rating": avg_rating,  # For backward compatibility
                    "review_count": total_ratings,  # For backward compatibility
                    "average_rating": avg_rating,
                    "total_ratings": total_ratings,
                    "rating_distribution": rating_counts,
                    "rating_updated_at": datetime.utcnow()
                }
            }
        )
        
        print(f"✅ Updated rating stats for doctor {doctor_id}: {avg_rating} ({total_ratings} reviews)")
        
        return {
            "average_rating": avg_rating,
            "total_ratings": total_ratings,
            "rating_distribution": rating_counts
        }
    
    @staticmethod
    def get_doctor_ratings(doctor_id: str, filters: dict = None, limit: int = 50, skip: int = 0):
        """
        Lấy danh sách ratings của bác sĩ
        
        Args:
            doctor_id: Doctor ID
            filters: dict (rating, sort_by)
            limit: số lượng ratings cần lấy
            skip: số lượng ratings bỏ qua (pagination)
        
        Returns:
            list of rating documents
        """
        try:
            doctor_oid = ObjectId(doctor_id)
        except Exception:
            raise ValueError("Invalid doctor_id format")
        
        query = {"doctor_id": doctor_oid}
        
        # Apply filters
        if filters:
            # Filter by rating score (e.g., only 5-star reviews)
            if filters.get("rating"):
                query["rating"] = int(filters["rating"])
        
        # Sorting
        sort_by = filters.get("sort_by", "created_at") if filters else "created_at"
        sort_order = -1  # Descending (newest first)
        
        if sort_by == "rating":
            sort_field = [("rating", sort_order), ("created_at", -1)]
        else:
            sort_field = [("created_at", sort_order)]
        
        # Query ratings
        ratings = list(
            mongo_db.ratings
            .find(query)
            .sort(sort_field)
            .skip(skip)
            .limit(limit)
        )
        
        # Populate patient info (if not anonymous)
        for rating in ratings:
            if not rating.get("is_anonymous", False):
                patient = mongo_db.patients.find_one(
                    {"_id": rating["patient_id"]},
                    {"full_name": 1, "avatar_url": 1}
                )
                if patient:
                    rating["patient_name"] = patient.get("full_name", "Bệnh nhân")
                    rating["patient_avatar"] = patient.get("avatar_url")
                else:
                    rating["patient_name"] = "Bệnh nhân"
            else:
                rating["patient_name"] = "Ẩn danh"
        
        return ratings
    
    @staticmethod
    def get_patient_ratings(patient_id: str, limit: int = 50):
        """
        Lấy danh sách các ratings mà bệnh nhân đã đánh giá
        
        Args:
            patient_id: Patient ID
            limit: số lượng ratings
        
        Returns:
            list of rating documents
        """
        try:
            patient_oid = ObjectId(patient_id)
        except Exception:
            raise ValueError("Invalid patient_id format")
        
        ratings = list(
            mongo_db.ratings
            .find({"patient_id": patient_oid})
            .sort([("created_at", -1)])
            .limit(limit)
        )
        
        # Populate doctor info
        for rating in ratings:
            doctor = mongo_db.doctors.find_one(
                {"_id": rating["doctor_id"]},
                {"full_name": 1, "specialization": 1, "avatar_url": 1}
            )
            if doctor:
                rating["doctor_name"] = doctor.get("full_name", "Bác sĩ")
                rating["doctor_specialization"] = doctor.get("specialization", "")
                rating["doctor_avatar"] = doctor.get("avatar_url")
        
        return ratings
    
    @staticmethod
    def get_rating_by_appointment(appointment_id: str):
        """
        Lấy rating của một appointment
        
        Args:
            appointment_id: Appointment ID
        
        Returns:
            rating document hoặc None
        """
        try:
            appointment_oid = ObjectId(appointment_id)
        except Exception:
            return None
        
        return mongo_db.ratings.find_one({"appointment_id": appointment_oid})


# Available rating tags (có thể customize)
RATING_TAGS = [
    "Thân thiện",
    "Giải thích rõ ràng",
    "Tư vấn chi tiết",
    "Nhiệt tình",
    "Chuyên nghiệp",
    "Khám kỹ càng",
    "Trả lời nhanh",
    "Dễ hiểu",
    "Tận tâm",
    "Kinh nghiệm cao"
]

