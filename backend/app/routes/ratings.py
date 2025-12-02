# backend/app/routes/ratings.py
from flask import Blueprint, request, g
from datetime import datetime
from bson import ObjectId
from copy import deepcopy
import unicodedata
from app.extensions import mongo_db, socketio
from app.middlewares.auth import auth_required
from app.model.ratings import RatingModel, RATING_TAGS
from app.services.notification_service import NotificationService

ratings_bp = Blueprint("ratings", __name__)


MOCK_RATING_PROFILES = {
    "la-thanh-toan": {
        "average_rating": 4.9,
        "total_ratings": 186,
        "rating_distribution": {
            "5_star": 142,
            "4_star": 34,
            "3_star": 7,
            "2_star": 2,
            "1_star": 1,
        },
        "last_updated": "2025-11-01T08:00:00+07:00",
        "source": "mock-db",
    },
    "nguyen-hong-anh": {
        "average_rating": 4.7,
        "total_ratings": 142,
        "rating_distribution": {
            "5_star": 101,
            "4_star": 28,
            "3_star": 9,
            "2_star": 3,
            "1_star": 1,
        },
        "last_updated": "2025-10-21T09:12:00+07:00",
        "source": "mock-db",
    },
    "tran-minh-khoa": {
        "average_rating": 4.8,
        "total_ratings": 203,
        "rating_distribution": {
            "5_star": 150,
            "4_star": 37,
            "3_star": 10,
            "2_star": 4,
            "1_star": 2,
        },
        "last_updated": "2025-09-18T15:05:00+07:00",
        "source": "mock-db",
    },
}


def _slugify(value):
    if value is None:
        return None
    normalized = unicodedata.normalize("NFD", str(value))
    cleaned = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    slug = "".join(ch if ch.isalnum() else "-" for ch in cleaned.lower()).strip("-")
    return slug or None


def _hash_seed(value):
    seed = 7
    for ch in value:
        seed = (seed * 33 + ord(ch)) % 1009
    return seed or 131


def _build_mock_distribution(total, seed):
    dist = {
        "5_star": max(int(total * 0.64) + seed % 5, 1),
        "4_star": max(int(total * 0.23) + (seed // 7) % 3, 1),
        "3_star": max(int(total * 0.08) + (seed // 13) % 2, 0),
        "2_star": max(int(total * 0.03), 0),
        "1_star": 0,
    }
    allocated = sum(dist.values())
    if allocated < total:
        dist["3_star"] += total - allocated
    elif allocated > total:
        dist["5_star"] = max(dist["5_star"] - (allocated - total), 1)
    return dist


def _distribution_average(dist, total):
    if not total:
        return 0
    weighted = (
        dist.get("5_star", 0) * 5
        + dist.get("4_star", 0) * 4
        + dist.get("3_star", 0) * 3
        + dist.get("2_star", 0) * 2
        + dist.get("1_star", 0)
    )
    return round(weighted / total, 1)


def _build_deterministic_mock_stats(key):
    seed = _hash_seed(key)
    total = 110 + (seed % 90)
    distribution = _build_mock_distribution(total, seed)
    return {
        "average_rating": _distribution_average(distribution, total),
        "total_ratings": total,
        "rating_distribution": distribution,
        "last_updated": datetime.utcnow().isoformat(),
        "source": "mock-deterministic",
        "is_mock": True,
    }


def get_mock_rating_stats(doctor_identifier=None):
    key = str(doctor_identifier or "").strip()
    slug = _slugify(key) if key else None
    if slug and slug in MOCK_RATING_PROFILES:
        profile = deepcopy(MOCK_RATING_PROFILES[slug])
        profile["is_mock"] = True
        profile.setdefault("last_updated", datetime.utcnow().isoformat())
        return profile
    if slug:
        return _build_deterministic_mock_stats(slug)
    return _build_deterministic_mock_stats("doctor")


def ensure_rating_stats(stats, doctor_id, doctor_doc=None):
    has_real_data = bool(stats and stats.get("total_ratings"))
    if has_real_data:
        return stats
    fallback_key = None
    if doctor_doc:
        fallback_key = doctor_doc.get("full_name") or doctor_doc.get("name")
    return get_mock_rating_stats(fallback_key or doctor_id)


def success(data=None, message="Success"):
    """Success response helper"""
    return {
        "success": True,
        "message": message,
        "data": data
    }, 200


def fail(message="Error", status=400):
    """Error response helper"""
    return {
        "success": False,
        "message": message
    }, status


@ratings_bp.route("/ratings/can-rate/<appointment_id>", methods=["GET"])
@auth_required(roles=["patient"])
def check_can_rate_appointment(appointment_id):
    """
    Kiểm tra xem bệnh nhân có thể đánh giá appointment này không
    
    GET /api/ratings/can-rate/<appointment_id>
    
    Returns:
        {
            "can_rate": true/false,
            "reason": "message",
            "appointment_info": {...}
        }
    """
    try:
        user = g.current_user
        
        # ✅ Debug: Log user info
        print(f"🔍 [Rating Route] Current user: {user}")
        print(f"🔍 [Rating Route] User role: {user.get('role')}")
        
        # ✅ Extract patient_id from nested payload or top-level
        payload = user.get("payload", {})
        patient_id = (
            user.get("patient_id") or 
            payload.get("patient_id") or 
            user.get("user_id") or 
            user.get("id")
        )
        
        print(f"🔍 [Rating Route] Extracted patient_id: {patient_id}")
        print(f"🔍 [Rating Route] From payload: {payload.get('patient_id')}")
        print(f"🔍 [Rating Route] From user: {user.get('patient_id')}")
        
        # Check if can rate
        can_rate, reason = RatingModel.can_rate_appointment(appointment_id, patient_id)
        
        # Get appointment info
        appointment = mongo_db.appointments.find_one({"_id": ObjectId(appointment_id)})
        appointment_info = None
        
        if appointment:
            # Get doctor info
            doctor = mongo_db.doctors.find_one({"_id": appointment["doctor_id"]})
            appointment_info = {
                "appointment_id": str(appointment["_id"]),
                "date": appointment.get("date"),
                "start_time": appointment.get("start_time"),
                "status": appointment.get("status"),
                "doctor": {
                    "id": str(appointment["doctor_id"]),
                    "name": doctor.get("full_name") if doctor else "Bác sĩ",
                    "specialization": doctor.get("specialization") if doctor else "",
                    "avatar_url": doctor.get("avatar_url") if doctor else None
                }
            }
        
        return success({
            "can_rate": can_rate,
            "reason": reason,
            "appointment_info": appointment_info
        })
    
    except Exception as e:
        print(f"Error checking can rate: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings", methods=["POST"])
@auth_required(roles=["patient"])
def create_rating():
    """
    Tạo đánh giá mới
    
    POST /api/ratings
    Body:
        {
            "appointment_id": "...",
            "doctor_id": "...",
            "rating": 5,
            "comment": "Bác sĩ rất tốt...",
            "tags": ["Thân thiện", "Chuyên nghiệp"],
            "is_anonymous": false
        }
    """
    try:
        user = g.current_user
        
        # ✅ Extract patient_id from nested payload or top-level
        payload = user.get("payload", {})
        patient_id = (
            user.get("patient_id") or 
            payload.get("patient_id") or 
            user.get("user_id") or 
            user.get("id")
        )
        
        data = request.get_json()
        if not data:
            return fail("Missing request body", 400)
        
        # Add patient_id from authenticated user
        data["patient_id"] = patient_id
        
        print(f"🔍 [Create Rating] Using patient_id: {patient_id}")
        
        # Validate required fields
        if "appointment_id" not in data:
            return fail("Missing appointment_id", 400)
        if "doctor_id" not in data:
            return fail("Missing doctor_id", 400)
        if "rating" not in data:
            return fail("Missing rating", 400)
        
        # Create rating
        rating_doc = RatingModel.create_rating(data)
        
        # Convert ObjectIds to strings for response
        rating_doc["_id"] = str(rating_doc["_id"])
        rating_doc["patient_id"] = str(rating_doc["patient_id"])
        rating_doc["doctor_id"] = str(rating_doc["doctor_id"])
        rating_doc["appointment_id"] = str(rating_doc["appointment_id"])
        rating_doc["created_at"] = rating_doc["created_at"].isoformat()
        rating_doc["updated_at"] = rating_doc["updated_at"].isoformat()
        
        # Send notification to doctor (optional - có thể bật/tắt)
        try:
            doctor_id = data["doctor_id"]
            patient_name = user.get("name", "Bệnh nhân")
            if data.get("is_anonymous", False):
                patient_name = "Một bệnh nhân"
            
            # Send notification
            NotificationService.send_new_rating_to_doctor(
                doctor_id=doctor_id,
                patient_name=patient_name,
                rating=data["rating"],
                comment_preview=data.get("comment", "")[:100]
            )
        except Exception as notif_err:
            print(f"⚠️ Failed to send rating notification: {notif_err}")
        
        # Emit socket event for real-time update
        try:
            socketio.emit("new_rating", {
                "doctor_id": str(data["doctor_id"]),
                "rating": data["rating"],
                "total_ratings": None  # Will be updated by client
            })
        except Exception as socket_err:
            print(f"⚠️ Socket emit error: {socket_err}")
        
        updated_stats = RatingModel.update_doctor_rating_stats(str(data["doctor_id"]))
        rating_doc["stats"] = ensure_rating_stats(updated_stats, data["doctor_id"])
        
        return success(rating_doc, "Đánh giá thành công! Cảm ơn bạn đã chia sẻ.")
    
    except ValueError as e:
        return fail(str(e), 400)
    except Exception as e:
        print(f"Error creating rating: {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi khi tạo đánh giá", 500)


@ratings_bp.route("/ratings", methods=["GET"])
@auth_required(roles=["admin"])
def get_all_ratings():
    """
    Lấy danh sách tất cả đánh giá (Admin only)
    
    GET /api/ratings
    Query params:
        - doctor_id: filter by doctor_id
        - rating: filter by rating (1-5)
        - sort_by: created_at | rating (default: created_at)
        - limit: số lượng ratings (default: 50, max: 100)
        - skip: bỏ qua n ratings (pagination)
    """
    try:
        # Get query parameters
        doctor_id = request.args.get("doctor_id")
        rating_filter = request.args.get("rating")
        sort_by = request.args.get("sort_by", "created_at")
        limit = min(int(request.args.get("limit", 50)), 100)
        skip = int(request.args.get("skip", 0))
        
        # Build query
        query = {}
        
        if doctor_id:
            try:
                query["doctor_id"] = ObjectId(doctor_id)
            except Exception:
                return fail("Invalid doctor_id format", 400)
        
        if rating_filter:
            try:
                rating_val = int(rating_filter)
                if rating_val < 1 or rating_val > 5:
                    return fail("Rating must be between 1 and 5", 400)
                query["rating"] = rating_val
            except ValueError:
                return fail("Invalid rating format", 400)
        
        # Sorting
        if sort_by == "rating":
            sort_field = [("rating", -1), ("created_at", -1)]
        else:
            sort_field = [("created_at", -1)]
        
        # Query ratings
        ratings = list(
            mongo_db.ratings
            .find(query)
            .sort(sort_field)
            .skip(skip)
            .limit(limit)
        )
        
        # Populate patient and doctor info
        for rating in ratings:
            rating["_id"] = str(rating["_id"])
            rating["patient_id"] = str(rating["patient_id"])
            rating["doctor_id"] = str(rating["doctor_id"])
            rating["appointment_id"] = str(rating["appointment_id"])
            rating["created_at"] = rating["created_at"].isoformat() if rating.get("created_at") else None
            rating["updated_at"] = rating["updated_at"].isoformat() if rating.get("updated_at") else None
            
            # Get patient info
            if not rating.get("is_anonymous", False):
                patient = mongo_db.patients.find_one(
                    {"_id": ObjectId(rating["patient_id"])},
                    {"full_name": 1, "name": 1, "email": 1}
                )
                if patient:
                    rating["patient_name"] = patient.get("full_name") or patient.get("name")
                    rating["patient_email"] = patient.get("email")
            
            # Get doctor info
            doctor = mongo_db.doctors.find_one(
                {"_id": ObjectId(rating["doctor_id"])},
                {"full_name": 1, "name": 1, "specialization": 1}
            )
            if doctor:
                rating["doctor_name"] = doctor.get("full_name") or doctor.get("name")
                rating["doctor_specialization"] = doctor.get("specialization")
        
        # Get total count for pagination
        total_count = mongo_db.ratings.count_documents(query)
        
        return success({
            "ratings": ratings,
            "pagination": {
                "limit": limit,
                "skip": skip,
                "total": total_count,
                "has_more": (skip + len(ratings)) < total_count
            }
        })
    
    except Exception as e:
        print(f"Error getting all ratings: {e}")
        import traceback
        traceback.print_exc()
        return fail(str(e), 500)


@ratings_bp.route("/ratings/doctor/<doctor_id>", methods=["GET"])
def get_doctor_ratings(doctor_id):
    """
    Lấy danh sách đánh giá của bác sĩ (public endpoint)
    
    GET /api/ratings/doctor/<doctor_id>
    Query params:
        - rating: filter by rating (1-5)
        - sort_by: created_at | rating
        - limit: số lượng ratings (default: 50)
        - skip: bỏ qua n ratings (pagination)
    """
    try:
        # Get query params
        rating_filter = request.args.get("rating")
        sort_by = request.args.get("sort_by", "created_at")
        limit = int(request.args.get("limit", 50))
        skip = int(request.args.get("skip", 0))
        
        # Limit maximum
        if limit > 100:
            limit = 100
        
        filters = {
            "sort_by": sort_by
        }
        if rating_filter:
            filters["rating"] = rating_filter
        
        # Get ratings
        ratings = RatingModel.get_doctor_ratings(
            doctor_id=doctor_id,
            filters=filters,
            limit=limit,
            skip=skip
        )
        
        # Convert ObjectIds to strings
        for rating in ratings:
            rating["_id"] = str(rating["_id"])
            rating["patient_id"] = str(rating["patient_id"])
            rating["doctor_id"] = str(rating["doctor_id"])
            rating["appointment_id"] = str(rating["appointment_id"])
            rating["created_at"] = rating["created_at"].isoformat()
            rating["updated_at"] = rating["updated_at"].isoformat()
        
        # Get rating stats from doctors collection
        doctor = mongo_db.doctors.find_one(
            {"_id": ObjectId(doctor_id)},
            {"average_rating": 1, "total_ratings": 1, "rating_distribution": 1, "full_name": 1, "name": 1}
        )
        
        # Build stats structure from doctors collection fields
        if doctor and "average_rating" in doctor:
            rating_stats = {
                "average_rating": doctor.get("average_rating", 0),
                "total_ratings": doctor.get("total_ratings", 0),
                "rating_distribution": doctor.get("rating_distribution", {
                    "5_star": 0,
                    "4_star": 0,
                    "3_star": 0,
                    "2_star": 0,
                    "1_star": 0
                }),
            }
        else:
            # Calculate fresh stats if not cached
            fresh_stats = RatingModel.update_doctor_rating_stats(doctor_id)
            rating_stats = fresh_stats if fresh_stats else None

        rating_stats = ensure_rating_stats(rating_stats, doctor_id, doctor)
        
        return success({
            "ratings": ratings,
            "stats": rating_stats,
            "pagination": {
                "limit": limit,
                "skip": skip,
                "has_more": len(ratings) == limit
            }
        })
    
    except Exception as e:
        print(f"Error getting doctor ratings: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings/my-ratings", methods=["GET"])
@auth_required(roles=["patient"])
def get_my_ratings():
    """
    Lấy danh sách các đánh giá mà bệnh nhân đã đánh giá
    
    GET /api/ratings/my-ratings
    """
    try:
        user = g.current_user
        
        # ✅ Extract patient_id from nested payload or top-level
        payload = user.get("payload", {})
        patient_id = (
            user.get("patient_id") or 
            payload.get("patient_id") or 
            user.get("user_id") or 
            user.get("id")
        )
        
        limit = int(request.args.get("limit", 50))
        if limit > 100:
            limit = 100
        
        ratings = RatingModel.get_patient_ratings(patient_id, limit=limit)
        
        # Convert ObjectIds to strings
        for rating in ratings:
            rating["_id"] = str(rating["_id"])
            rating["patient_id"] = str(rating["patient_id"])
            rating["doctor_id"] = str(rating["doctor_id"])
            rating["appointment_id"] = str(rating["appointment_id"])
            rating["created_at"] = rating["created_at"].isoformat()
            rating["updated_at"] = rating["updated_at"].isoformat()
        
        return success({
            "ratings": ratings,
            "total": len(ratings)
        })
    
    except Exception as e:
        print(f"Error getting patient ratings: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings/appointment/<appointment_id>", methods=["GET"])
@auth_required(roles=["patient", "doctor"])
def get_rating_by_appointment(appointment_id):
    """
    Lấy đánh giá của một appointment (nếu có)
    
    GET /api/ratings/appointment/<appointment_id>
    """
    try:
        rating = RatingModel.get_rating_by_appointment(appointment_id)
        
        if not rating:
            return success(None, "Chưa có đánh giá")
        
        # Convert ObjectIds to strings
        rating["_id"] = str(rating["_id"])
        rating["patient_id"] = str(rating["patient_id"])
        rating["doctor_id"] = str(rating["doctor_id"])
        rating["appointment_id"] = str(rating["appointment_id"])
        rating["created_at"] = rating["created_at"].isoformat()
        rating["updated_at"] = rating["updated_at"].isoformat()
        
        return success(rating)
    
    except Exception as e:
        print(f"Error getting rating by appointment: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings/stats/doctor/<doctor_id>", methods=["GET"])
def get_doctor_rating_stats(doctor_id):
    """
    Lấy thống kê rating của bác sĩ (public endpoint)
    
    GET /api/ratings/stats/doctor/<doctor_id>
    
    Returns:
        {
            "average_rating": 4.7,
            "total_ratings": 128,
            "rating_distribution": {
                "5_star": 80,
                "4_star": 30,
                "3_star": 10,
                "2_star": 5,
                "1_star": 3
            }
        }
    """
    try:
        # Get from doctors collection
        doctor = mongo_db.doctors.find_one(
            {"_id": ObjectId(doctor_id)},
            {
                "average_rating": 1,
                "total_ratings": 1,
                "rating_distribution": 1,
                "rating_updated_at": 1,
                "full_name": 1,
                "name": 1,
            }
        )
        
        if not doctor or "average_rating" not in doctor:
            # Calculate fresh stats
            stats = RatingModel.update_doctor_rating_stats(doctor_id)
        else:
            stats = {
                "average_rating": doctor.get("average_rating", 0),
                "total_ratings": doctor.get("total_ratings", 0),
                "rating_distribution": doctor.get("rating_distribution", {
                    "5_star": 0,
                    "4_star": 0,
                    "3_star": 0,
                    "2_star": 0,
                    "1_star": 0
                })
            }
            # Convert datetime if exists
            if "rating_updated_at" in doctor and hasattr(doctor["rating_updated_at"], "isoformat"):
                stats["last_updated"] = doctor["rating_updated_at"].isoformat()

        stats = ensure_rating_stats(stats, doctor_id, doctor)
        
        return success(stats)
    
    except Exception as e:
        print(f"Error getting doctor rating stats: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings/tags", methods=["GET"])
def get_rating_tags():
    """
    Lấy danh sách các tags có sẵn cho rating
    
    GET /api/ratings/tags
    """
    return success({
        "tags": RATING_TAGS
    })


@ratings_bp.route("/ratings/<rating_id>", methods=["DELETE"])
@auth_required(roles=["patient", "admin"])
def delete_rating(rating_id):
    """
    Xóa đánh giá (chỉ patient tự xóa của mình hoặc admin)
    
    DELETE /api/ratings/<rating_id>
    """
    try:
        user = g.current_user
        role = user.get("role")
        patient_id = user.get("user_id")
        
        rating_oid = ObjectId(rating_id)
        rating = mongo_db.ratings.find_one({"_id": rating_oid})
        
        if not rating:
            return fail("Rating không tồn tại", 404)
        
        # Check permission: patient chỉ được xóa rating của mình
        if role == "patient" and str(rating["patient_id"]) != patient_id:
            return fail("Bạn không có quyền xóa đánh giá này", 403)
        
        # Delete rating
        mongo_db.ratings.delete_one({"_id": rating_oid})
        
        # Update doctor rating stats
        RatingModel.update_doctor_rating_stats(str(rating["doctor_id"]))
        
        return success(None, "Đã xóa đánh giá")
    
    except Exception as e:
        print(f"Error deleting rating: {e}")
        return fail(str(e), 500)


@ratings_bp.route("/ratings/admin/sync-stats", methods=["POST"])
@auth_required(roles=["admin"])
def sync_all_rating_stats():
    """
    Đồng bộ lại rating stats cho tất cả bác sĩ (Admin only)
    
    POST /api/ratings/admin/sync-stats
    """
    try:
        # Get all unique doctor_ids from ratings
        doctor_ids = mongo_db.ratings.distinct("doctor_id")
        
        synced_count = 0
        for doctor_id in doctor_ids:
            try:
                RatingModel.update_doctor_rating_stats(str(doctor_id))
                synced_count += 1
            except Exception as e:
                print(f"⚠️ Error syncing doctor {doctor_id}: {e}")
        
        return success({
            "synced_doctors": synced_count,
            "total_doctors": len(doctor_ids)
        }, f"Đã đồng bộ rating cho {synced_count} bác sĩ")
    
    except Exception as e:
        print(f"Error syncing rating stats: {e}")
        return fail(str(e), 500)

