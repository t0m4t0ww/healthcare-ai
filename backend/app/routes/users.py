# backend/app/routes/users.py
from flask import Blueprint, g
from app.middlewares.auth import auth_required
from app.middlewares.rbac import role_required
from app.utils.responses import ok, fail

users_bp = Blueprint("users_bp", __name__)

@users_bp.route("/me", methods=["GET"])
@auth_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user = g.current_user
        return ok({
            "user_id": current_user.get("user_id"),
            "email": current_user.get("email"),
            "role": current_user.get("role")
        })
    except Exception as e:
        return fail("Lỗi lấy thông tin user", 500)

@users_bp.route("/doctor-only", methods=["GET"])
@auth_required()
@role_required("doctor")
def doctor_only_endpoint():
    """Endpoint chỉ dành cho doctor"""
    try:
        return ok({
            "message": "Chào bác sĩ!",
            "role": g.current_user.get("role")
        })
    except Exception as e:
        return fail("Lỗi hệ thống", 500)

@users_bp.route("/patient-only", methods=["GET"])
@auth_required()
@role_required("patient") 
def patient_only_endpoint():
    """Endpoint chỉ dành cho patient"""
    try:
        return ok({
            "message": "Chào bệnh nhân!",
            "role": g.current_user.get("role")
        })
    except Exception as e:
        return fail("Lỗi hệ thống", 500)

@users_bp.route("/admin-only", methods=["GET"])
@auth_required()
@role_required("admin")
def admin_only_endpoint():
    """Endpoint chỉ dành cho admin"""
    try:
        return ok({
            "message": "Chào admin!",
            "role": g.current_user.get("role"),
            "permissions": ["full_access"]
        })
    except Exception as e:
        return fail("Lỗi hệ thống", 500)