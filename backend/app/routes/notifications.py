# backend/app/routes/notifications.py
"""
Notification API Routes - Tách riêng cho Patient và Doctor
"""
from flask import Blueprint, request
from flask_cors import cross_origin
from bson import ObjectId
from datetime import datetime
from app.middlewares.auth import auth_required, get_current_user
from app.extensions import mongo_db
from app.utils.responses import success, fail
from app.utils.doctor_helpers import get_doctor_oid_from_user

notifications_bp = Blueprint("notifications", __name__)


def serialize_notification(doc: dict) -> dict:
    """Convert Mongo notification document to JSON-safe dict."""
    if not doc:
        return {}

    serialized = dict(doc)
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])
    if "user_id" in serialized:
        serialized["user_id"] = str(serialized["user_id"])

    for field in ("created_at", "read_at"):
        value = serialized.get(field)
        if isinstance(value, datetime):
            serialized[field] = value.isoformat() + "Z"

    return serialized


# =============== PATIENT NOTIFICATIONS ===============

@notifications_bp.route("/patient/notifications", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["patient"])
def get_patient_notifications():
    """
    Lấy danh sách notifications của patient
    Query params:
        - limit: int (default: 50)
        - is_read: bool (optional filter)
    """
    user = get_current_user()
    
    try:
        # Get patient_id from user
        patient_oid = ObjectId(user["user_id"])
        
        # Build query
        query = {"user_id": patient_oid, "user_type": "patient"}
        
        # Optional filter by read status
        is_read_param = request.args.get("is_read")
        if is_read_param is not None:
            query["is_read"] = is_read_param.lower() == "true"
        
        # Limit
        limit = int(request.args.get("limit", 50))
        
        # Get notifications
        notifications_cursor = (
            mongo_db.notifications
            .find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        
        notifications = [serialize_notification(notif) for notif in notifications_cursor]
        
        # Count unread
        unread_count = mongo_db.notifications.count_documents({
            "user_id": patient_oid,
            "user_type": "patient",
            "is_read": False
        })
        
        return success({
            "notifications": notifications,
            "unread_count": unread_count,
            "total": len(notifications)
        })
        
    except Exception as e:
        print(f"❌ Error fetching patient notifications: {e}")
        return fail(str(e), 500)


@notifications_bp.route("/patient/notifications/mark-read", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["patient"])
def mark_patient_notification_read():
    """
    Đánh dấu notification(s) đã đọc
    Body: {
        "notification_id": str (optional - nếu không có thì mark all)
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    try:
        patient_oid = ObjectId(user["user_id"])
        notification_id = data.get("notification_id")
        
        if notification_id:
            # Mark single notification as read
            result = mongo_db.notifications.update_one(
                {
                    "_id": ObjectId(notification_id),
                    "user_id": patient_oid,
                    "user_type": "patient"
                },
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.utcnow()
                    }
                }
            )
            
            return success({
                "modified": result.modified_count,
                "message": "Đã đánh dấu đọc"
            })
        else:
            # Mark all as read
            result = mongo_db.notifications.update_many(
                {
                    "user_id": patient_oid,
                    "user_type": "patient",
                    "is_read": False
                },
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.utcnow()
                    }
                }
            )
            
            return success({
                "modified": result.modified_count,
                "message": "Đã đánh dấu đọc tất cả"
            })
        
    except Exception as e:
        print(f"❌ Error marking notification as read: {e}")
        return fail(str(e), 500)


@notifications_bp.route("/patient/notifications/<notification_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["patient"])
def delete_patient_notification(notification_id):
    """Xóa một notification"""
    user = get_current_user()
    
    try:
        patient_oid = ObjectId(user["user_id"])
        
        result = mongo_db.notifications.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": patient_oid,
            "user_type": "patient"
        })
        
        if result.deleted_count == 0:
            return fail("Notification không tồn tại", 404)
        
        return success({"message": "Đã xóa notification"})
        
    except Exception as e:
        print(f"❌ Error deleting notification: {e}")
        return fail(str(e), 500)


# =============== DOCTOR NOTIFICATIONS ===============

@notifications_bp.route("/doctor/notifications", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["doctor"])
def get_doctor_notifications():
    """
    Lấy danh sách notifications của doctor
    Query params:
        - limit: int (default: 50)
        - is_read: bool (optional filter)
    """
    user = get_current_user()
    
    try:
        # Get doctor_id from doctors collection
        doctor_oid = get_doctor_oid_from_user(user)
        
        # Build query - sử dụng doctor_id (doctors._id)
        query = {"user_id": doctor_oid, "user_type": "doctor"}
        
        # Optional filter by read status
        is_read_param = request.args.get("is_read")
        if is_read_param is not None:
            query["is_read"] = is_read_param.lower() == "true"
        
        # Limit
        limit = int(request.args.get("limit", 50))
        
        # Get notifications
        notifications_cursor = (
            mongo_db.notifications
            .find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        
        notifications = [serialize_notification(notif) for notif in notifications_cursor]
        
        # Count unread
        unread_count = mongo_db.notifications.count_documents({
            "user_id": doctor_oid,
            "user_type": "doctor",
            "is_read": False
        })
        
        return success({
            "notifications": notifications,
            "unread_count": unread_count,
            "total": len(notifications)
        })
        
    except Exception as e:
        print(f"❌ Error fetching doctor notifications: {e}")
        return fail(str(e), 500)


@notifications_bp.route("/doctor/notifications/mark-read", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["doctor"])
def mark_doctor_notification_read():
    """
    Đánh dấu notification(s) đã đọc
    Body: {
        "notification_id": str (optional - nếu không có thì mark all)
    }
    """
    user = get_current_user()
    data = request.get_json() or {}
    
    try:
        doctor_oid = get_doctor_oid_from_user(user)
        notification_id = data.get("notification_id")
        
        if notification_id:
            # Mark single notification as read
            result = mongo_db.notifications.update_one(
                {
                    "_id": ObjectId(notification_id),
                    "user_id": doctor_oid,
                    "user_type": "doctor"
                },
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.utcnow()
                    }
                }
            )
            
            return success({
                "modified": result.modified_count,
                "message": "Đã đánh dấu đọc"
            })
        else:
            # Mark all as read
            result = mongo_db.notifications.update_many(
                {
                    "user_id": doctor_oid,
                    "user_type": "doctor",
                    "is_read": False
                },
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.utcnow()
                    }
                }
            )
            
            return success({
                "modified": result.modified_count,
                "message": "Đã đánh dấu đọc tất cả"
            })
        
    except Exception as e:
        print(f"❌ Error marking notification as read: {e}")
        return fail(str(e), 500)


@notifications_bp.route("/doctor/notifications/<notification_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["doctor"])
def delete_doctor_notification(notification_id):
    """Xóa một notification"""
    user = get_current_user()
    
    try:
        doctor_oid = get_doctor_oid_from_user(user)
        
        result = mongo_db.notifications.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": doctor_oid,
            "user_type": "doctor"
        })
        
        if result.deleted_count == 0:
            return fail("Notification không tồn tại", 404)
        
        return success({"message": "Đã xóa notification"})
        
    except Exception as e:
        print(f"❌ Error deleting notification: {e}")
        return fail(str(e), 500)

