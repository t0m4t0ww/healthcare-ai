"""Admin account management endpoints for locking/unlocking doctor & patient accounts."""
from datetime import datetime

from bson import ObjectId
from flask import Blueprint, request

from app.extensions import mongo_db, socketio
from app.middlewares.auth import auth_required
from app.utils.responses import ok, fail

admin_accounts_bp = Blueprint("admin_accounts_bp", __name__)


def _parse_bool(value):
    """Normalize truthy/falsey values coming from FE payloads."""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on"}:
            return True
        if lowered in {"false", "0", "no", "n", "off"}:
            return False
    return None


def _update_user_account(user_doc, is_active: bool, reason: str):
    """Helper to toggle base user account status."""
    if not user_doc:
        return False

    update_ops = {
        "$set": {
            "is_active": is_active,
            "updated_at": datetime.utcnow(),
        }
    }

    if not is_active:
        update_ops["$set"].update({
            "locked_reason": reason or "Khóa bởi admin",
            "locked_at": datetime.utcnow()
        })
    else:
        update_ops.setdefault("$unset", {})
        update_ops["$unset"].update({
            "locked_reason": "",
            "locked_at": ""
        })

    mongo_db.users.update_one({"_id": user_doc["_id"]}, update_ops)
    return True


@admin_accounts_bp.route("/accounts/doctors/<doctor_id>/status", methods=["PATCH", "OPTIONS"])
@auth_required(['admin'])
def update_doctor_account_status(doctor_id):
    """Lock or unlock a doctor account (updates users + doctors collections)."""
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(force=True) or {}
    parsed = _parse_bool(data.get("is_active"))
    if parsed is None:
        return fail("Thiếu hoặc sai định dạng is_active", 400)

    reason = (data.get("reason") or "").strip()

    try:
        oid = ObjectId(doctor_id)
    except Exception:
        return fail("doctor_id không hợp lệ", 400)

    doctor = mongo_db.doctors.find_one({"_id": oid})
    if not doctor:
        return fail("Không tìm thấy bác sĩ", 404)

    user_doc = None
    user_id = doctor.get("user_id")

    if user_id:
        try:
            user_doc = mongo_db.users.find_one({"_id": ObjectId(str(user_id))})
        except Exception:
            user_doc = None

    if not user_doc and doctor.get("email"):
        user_doc = mongo_db.users.find_one({"email": doctor.get("email", "").strip().lower()})

    user_updated = _update_user_account(user_doc, parsed, reason) if user_doc else False

    new_status = "active" if parsed else "locked"
    mongo_db.doctors.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.utcnow(),
                "locked_reason": reason if not parsed else None
            }
        }
    )

    try:
        socketio.emit("doctor_status_changed", {
            "doctor_id": doctor_id,
            "is_active": parsed,
            "status": new_status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception:
        pass

    return ok({
        "doctor_id": doctor_id,
        "is_active": parsed,
        "status": new_status,
        "user_updated": user_updated
    })


@admin_accounts_bp.route("/accounts/patients/<patient_id>/status", methods=["PATCH", "OPTIONS"])
@auth_required(['admin'])
def update_patient_account_status(patient_id):
    """Lock or unlock a patient account (patients collection, optional linked user)."""
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(force=True) or {}
    parsed = _parse_bool(data.get("is_active"))
    if parsed is None:
        return fail("Thiếu hoặc sai định dạng is_active", 400)

    reason = (data.get("reason") or "").strip()

    try:
        oid = ObjectId(patient_id)
    except Exception:
        return fail("patient_id không hợp lệ", 400)

    patient = mongo_db.patients.find_one({"_id": oid})
    if not patient:
        return fail("Không tìm thấy bệnh nhân", 404)

    status_value = patient.get("status")
    new_status = "active" if parsed else "locked"

    update_doc = {
        "$set": {
            "is_active": parsed,
            "status": new_status,
            "updated_at": datetime.utcnow(),
        }
    }
    if not parsed:
        update_doc["$set"]["locked_reason"] = reason or "Khóa bởi admin"
        update_doc["$set"]["locked_at"] = datetime.utcnow()
    else:
        update_doc.setdefault("$unset", {})
        update_doc["$unset"].update({
            "locked_reason": "",
            "locked_at": ""
        })

    mongo_db.patients.update_one({"_id": oid}, update_doc)

    # Optional: sync legacy linked user accounts by email/user_id
    linked_user = None
    user_ref = patient.get("user_id")
    if user_ref:
        try:
            linked_user = mongo_db.users.find_one({"_id": ObjectId(str(user_ref))})
        except Exception:
            linked_user = None
    if not linked_user and patient.get("email"):
        linked_user = mongo_db.users.find_one({"email": patient.get("email", "").strip().lower()})

    user_updated = _update_user_account(linked_user, parsed, reason) if linked_user else False

    try:
        socketio.emit("patient_status_changed", {
            "patient_id": patient_id,
            "is_active": parsed,
            "status": new_status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception:
        pass

    return ok({
        "patient_id": patient_id,
        "is_active": parsed,
        "status": new_status,
        "previous_status": status_value,
        "user_updated": user_updated
    })

