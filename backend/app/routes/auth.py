# backend/app/routes/auth.py - COMPLETE & FIXED VERSION
from functools import wraps
from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash, generate_password_hash
from app.extensions import mongo_db
from app.utils.responses import ok, fail
from app.utils.rate_limiter import limiter, RATE_LIMITS  # ✅ Add rate limiter
from app.config import JWT_SECRET_KEY, JWT_EXPIRE_SECONDS
from app.services.email_service import (
    send_verification_email, 
    send_password_reset_email, 
    send_password_change_email,  # ✅ Email khi đổi mật khẩu
    send_email, 
    send_welcome_email
)
import jwt
from datetime import datetime, timedelta
from bson import ObjectId
import bcrypt
import secrets
import re
import os
from flask_cors import cross_origin

auth_bp = Blueprint("auth_bp", __name__)

# ============================================
# VALIDATION HELPERS
# ============================================
def _sanitize_user(u: dict) -> dict:
    if not u:
        return {}
    # KHÔNG trả password_hash ra FE
    u = {**u}
    u.pop("password_hash", None)
    return {
        "id": str(u.get("_id")),
        "email": u.get("email"),
        "name": u.get("name") or u.get("full_name"),
        "role": u.get("role"),
        "avatar": u.get("avatar") or u.get("avatar_url"),
        "phone": u.get("phone"),
        "department": u.get("department"),
        "specialty": u.get("specialty"),
        "license_no": u.get("license_no"),
        "is_active": u.get("is_active", True),
        "must_change_password": bool(u.get("must_change_password", False)),
    }

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_phone(phone):
    """Validate Vietnamese phone number"""
    if not phone:
        return False
    phone = re.sub(r'[^\d+]', '', phone)
    patterns = [
        r'^\+84[3|5|7|8|9][0-9]{8}$',  # +84 format
        r'^0[3|5|7|8|9][0-9]{8}$',     # 0xx format
    ]
    return any(re.match(pattern, phone) for pattern in patterns)

def normalize_string(x):
    """Normalize input string robustly"""
    if isinstance(x, dict):
        x = x.get("value") or x.get("label") or ""
    if not isinstance(x, str):
        x = str(x or "")
    return x.strip()

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@auth_bp.route("/login", methods=["POST", "OPTIONS"])
@limiter.limit(RATE_LIMITS["auth_login"])  # ✅ 10 per minute
def login():
    """
    ✅ UNIFIED LOGIN
    - Hỗ trợ đăng nhập từ cả 2 collection: users (admin/doctor) & patients
    - Ghi rõ `collection` và `patient_id` vào JWT để các service khác dùng thẳng
    """
    if request.method == "OPTIONS":
        print(f"[DEBUG] OPTIONS request to /api/auth/login")
        return "", 204

    print(f"[DEBUG] POST request to /api/auth/login from {request.remote_addr}")
    print(f"[DEBUG] Headers: {dict(request.headers)}")
    print(f"[DEBUG] Method: {request.method}")
    print(f"[DEBUG] Content-Type: {request.content_type}")
    
    try:
        data = request.get_json() or {}
        print(f"[DEBUG] Request data: email={data.get('email', 'N/A')}, password={'***' if data.get('password') else 'N/A'}")
        email = normalize_string(data.get("email", "")).lower()
        password = normalize_string(data.get("password", ""))

        if not email or not password:
            return fail("Thiếu email hoặc mật khẩu", 400)

        # Tìm theo thứ tự: users (admin/doctor) -> patients
        user = mongo_db.users.find_one({"email": email})
        collection = "users" if user else None
        role = (user or {}).get("role") if user else None

        if not user:
            user = mongo_db.patients.find_one({"email": email})
            if user:
                collection = "patients"
                role = "patient"

        if not user:
            return fail("Email hoặc mật khẩu không đúng", 401)

        # Trạng thái - account locked by admin
        if not user.get("is_active", True):
            locked_reason = (user.get("locked_reason") or "Khóa bởi quản trị viên").strip()
            locked_at = user.get("locked_at")
            locked_at_iso = locked_at.isoformat() if hasattr(locked_at, "isoformat") else locked_at
            return fail(
                "Tài khoản đã bị hệ thống khóa, vui lòng liên hệ phòng quản lý.",
                status_code=403,
                locked_reason=locked_reason,
                locked_at=locked_at_iso
            )
        
        # ✅ Check email verification (only for patients)
        if collection == "patients" and not user.get("is_verified", False):
            # Check if there's a pending registration
            pending = mongo_db.pending_registrations.find_one({
                "email": email,
                "status": "pending"
            })
            if pending:
                return fail("Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hộp thư và click vào link xác nhận để tạo tài khoản.", 403)
            else:
                return fail("Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hộp thư của bạn.", 403)

        # Verify password (ưu tiên bcrypt, fallback werkzeug)
        password_hash = user.get("password_hash") or user.get("password")
        if not password_hash:
            return fail("Email hoặc mật khẩu không đúng", 401)

        try:
            if isinstance(password_hash, bytes) or (isinstance(password_hash, str) and password_hash.startswith('$2b$')):
                password_valid = bcrypt.checkpw(password.encode('utf-8'),
                    password_hash if isinstance(password_hash, bytes) else password_hash.encode('utf-8'))
            else:
                password_valid = check_password_hash(password_hash, password)
        except Exception:
            return fail("Email hoặc mật khẩu không đúng", 401)

        if not password_valid:
            return fail("Email hoặc mật khẩu không đúng", 401)

        # Tên hiển thị (ưu tiên hồ sơ patient nếu có)
        display_name = (user.get("full_name") or user.get("name") or "").strip()
        patient_id_for_claim = None

        if collection == "patients":
            # Đăng nhập trực tiếp bản ghi bệnh nhân
            patient_id_for_claim = str(user["_id"])
        else:
            # users -> cố gắng map sang patient
            p = (mongo_db.patients.find_one({"user_id": user["_id"]})
                 or mongo_db.patients.find_one({"email": user.get("email")}))
            if p:
                patient_id_for_claim = str(p["_id"])
                display_name = (p.get("full_name") or p.get("name") or display_name).strip()

        must_change = bool(user.get("must_change_password", False))

        # Cập nhật hoạt động
        mongo_db[collection].update_one(
            {"_id": user["_id"]},
            {"$set": {
                "last_login": datetime.utcnow(),
                "last_activity": datetime.utcnow()
            }}
        )

        # JWT claims: nhúng cả collection & patient_id
        payload = {
            "sub": str(user["_id"]),
            "user_id": str(user["_id"]),
            "email": user["email"],
            "role": role or "patient",
            "collection": collection,           # 'users' | 'patients'
            "patient_id": patient_id_for_claim, # có thể None nếu không map được
            "name": display_name,
            "must_change_password": must_change,
            "exp": datetime.utcnow() + timedelta(seconds=JWT_EXPIRE_SECONDS)
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        resp_user = {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": display_name,
            "role": role or "patient",
            "avatar": user.get("avatar_url"),
            "must_change_password": must_change,
            "collection": collection,
            "patient_id": patient_id_for_claim
        }

        response = {"token": token, "user": resp_user}

        if must_change:
            response["warning"] = {
                "type": "MUST_CHANGE_PASSWORD",
                "message": "Bạn phải đổi mật khẩu trước khi sử dụng hệ thống",
                "action_required": True
            }

        print(f"[DEBUG] Login success for {email}, role={role}, collection={collection}")
        print(f"[DEBUG] Response user: {resp_user.get('name')}, role={resp_user.get('role')}")
        print(f"[DEBUG] Token length: {len(token)}")
        
        return ok(response)

    except Exception as e:
        print(f"Login error: {e}")
        import traceback; traceback.print_exc()
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)



@auth_bp.route("/register", methods=["POST", "OPTIONS"])
@limiter.limit(RATE_LIMITS["auth_register"])  # ✅ 5 per hour
def register():
    """
    ✅ PATIENT REGISTRATION
    Creates patient account with email verification
    """
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json() or {}

        # Validate required fields
        required_fields = ["full_name", "email", "phone", "password", "dob", "gender", "address"]
        for field in required_fields:
            if not data.get(field):
                return fail(f"Thiếu trường bắt buộc: {field}", 400)

        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "").strip()
        password = data.get("password", "")
        dob = data.get("dob")
        gender = data.get("gender", "").lower()
        address = data.get("address", "").strip()

        # Validate inputs
        if len(full_name) < 2:
            return fail("Họ tên phải có ít nhất 2 ký tự", 400)
        if not is_valid_email(email):
            return fail("Email không hợp lệ", 400)
        if not is_valid_phone(phone):
            return fail("Số điện thoại không hợp lệ", 400)
        if len(password) < 6:
            return fail("Mật khẩu phải có ít nhất 6 ký tự", 400)
        if gender not in ["male", "female", "other"]:
            return fail("Giới tính không hợp lệ", 400)

        # Check if email already exists (in patients OR pending registrations)
        existing_user = mongo_db.users.find_one({"email": email})
        existing_patient = mongo_db.patients.find_one({"email": email})
        existing_pending = mongo_db.pending_registrations.find_one({"email": email})
        
        if existing_user or existing_patient:
            return fail("Email đã được sử dụng", 409)
        
        # Check if there's a pending registration (delete old one if expired or too old)
        if existing_pending:
            expires_at = existing_pending.get("verification_expires")
            created_at = existing_pending.get("created_at", datetime.utcnow())
            
            # Delete if expired OR older than 7 days (safety cleanup)
            is_expired = expires_at and expires_at < datetime.utcnow()
            is_too_old = (datetime.utcnow() - created_at).days > 7
            
            if is_expired or is_too_old:
                # Expired or too old, delete it and allow new registration
                print(f"🗑️ Deleting expired/old pending registration for {email}")
                mongo_db.pending_registrations.delete_one({"_id": existing_pending["_id"]})
                existing_pending = None  # Clear so registration can proceed
            else:
                # Still valid, block registration
                return fail("Email này đã được đăng ký. Vui lòng kiểm tra email để xác nhận tài khoản. Nếu không tìm thấy email, vui lòng đợi 24 giờ hoặc liên hệ admin.", 409)

        # Validate date of birth
        try:
            dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
            if dob_date >= datetime.now().date():
                return fail("Ngày sinh không hợp lệ", 400)
        except ValueError:
            return fail("Định dạng ngày sinh không hợp lệ (YYYY-MM-DD)", 400)

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)

        # ✅ Hash password with bcrypt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        # Decode to string for MongoDB storage
        password_hash = password_hash.decode("utf-8") if isinstance(password_hash, (bytes, bytearray)) else str(password_hash)

        # ✅ GỬI VERIFICATION EMAIL TRƯỚC (bắt buộc)
        # CHỈ LƯU VÀO DATABASE KHI EMAIL GỬI THÀNH CÔNG
        verification_email_sent = False
        try:
            verification_email_sent = send_verification_email(
                to=email,
                full_name=full_name,
                verification_token=verification_token
            )
            if verification_email_sent:
                print(f"✅ Verification email sent to {email}")
            else:
                print(f"⚠️ Verification email failed to send to {email}")
                # Email failed - DO NOT save to database
                return fail("Không thể gửi email xác nhận. Vui lòng kiểm tra kết nối mạng và thử lại sau.", 500)
        except Exception as email_error:
            print(f"❌ Verification email failed: {email_error}")
            # Email failed - DO NOT save to database
            return fail("Không thể gửi email xác nhận. Vui lòng thử lại sau.", 500)

        # ✅ CHỈ LƯU VÀO DATABASE KHI EMAIL ĐÃ GỬI THÀNH CÔNG
        # LƯU VÀO PENDING_REGISTRATIONS - CHƯA TẠO ACCOUNT
        # Chỉ tạo account khi user click link verify email
        pending_data = {
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "phone": phone,
            "date_of_birth": dob,
            "dob": dob,
            "gender": gender,
            "address": address,
            
            # Verification
            "verification_token": verification_token,
            "verification_expires": datetime.utcnow() + timedelta(hours=24),
            
            # Timestamps
            "created_at": datetime.utcnow(),
            "status": "pending"  # pending → verified → account_created
        }

        # ✅ Lưu vào pending_registrations (CHỈ KHI EMAIL ĐÃ GỬI THÀNH CÔNG)
        try:
            result = mongo_db.pending_registrations.insert_one(pending_data)
            pending_id = result.inserted_id
            print(f"✅ Pending registration saved for {email}")
        except Exception as db_error:
            print(f"❌ Failed to save pending registration: {db_error}")
            # Database save failed - but email already sent
            # This is a critical error, but we can't undo email
            return fail("Đã gửi email nhưng không thể lưu thông tin đăng ký. Vui lòng liên hệ admin.", 500)

        # ✅ Success message
        message = "Vui lòng kiểm tra email để xác nhận tài khoản. Tài khoản sẽ được tạo sau khi bạn xác nhận email."

        return ok({
            "message": message,
            "email": email,
            "verification_email_sent": verification_email_sent,
            "requires_verification": True,
            "pending_id": str(pending_id)
        })

    except Exception as e:
        print(f"Register error: {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


@auth_bp.route("/change-password", methods=["POST", "OPTIONS"])
def change_password():
    """
    ✅ CHANGE PASSWORD ENDPOINT
    Supports:
    1. First-time password change (must_change_password = true) - no current password needed
    2. Normal password change - requires current password
    """
    if request.method == "OPTIONS":
        return "", 204

    # Get token from header
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None

    if not token:
        return fail("Thiếu token xác thực", 401)

    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return fail("Token hết hạn", 401)
    except Exception:
        return fail("Token không hợp lệ", 401)

    user_id = claims.get("sub") or claims.get("user_id")
    if not user_id:
        return fail("Token không hợp lệ", 401)

    body = request.get_json(force=True) or {}
    new_password = (body.get("new_password") or "").strip()
    current_password = (body.get("current_password") or "").strip()

    if not new_password:
        return fail("Thiếu mật khẩu mới", 400)

    if len(new_password) < 8:
        return fail("Mật khẩu phải có ít nhất 8 ký tự", 400)

    # Validate password strength
    if not re.search(r'[A-Z]', new_password):
        return fail("Mật khẩu phải có ít nhất 1 chữ hoa", 400)
    if not re.search(r'[a-z]', new_password):
        return fail("Mật khẩu phải có ít nhất 1 chữ thường", 400)
    if not re.search(r'[0-9]', new_password):
        return fail("Mật khẩu phải có ít nhất 1 số", 400)

    # Get user
    try:
        user_oid = ObjectId(user_id)
    except:
        return fail("Invalid user ID", 400)

    # Find user in both collections
    user = mongo_db.users.find_one({"_id": user_oid})
    collection = "users"
    
    if not user:
        user = mongo_db.patients.find_one({"_id": user_oid})
        collection = "patients"
    
    if not user:
        return fail("User not found", 404)

    must_change = user.get("must_change_password", False)

    # ✅ Case 1: First-time change (không cần current_password)
    if must_change:
        pass  # Không cần verify current password
    # ✅ Case 2: Normal change (cần current_password)
    else:
        if not current_password:
            return fail("Thiếu mật khẩu hiện tại", 400)

        password_hash = user.get("password_hash", b"")
        try:
            if isinstance(password_hash, bytes) or (isinstance(password_hash, str) and password_hash.startswith('$2b$')):
                password_valid = bcrypt.checkpw(current_password.encode('utf-8'), 
                    password_hash if isinstance(password_hash, bytes) else password_hash.encode('utf-8'))
            else:
                password_valid = check_password_hash(password_hash, current_password)
            
            if not password_valid:
                return fail("Mật khẩu hiện tại không đúng", 401)
        except Exception as e:
            print(f"Password verify error: {e}")
            return fail("Mật khẩu hiện tại không đúng", 401)

    # ✅ Validate new password khác old password
    try:
        password_hash = user.get("password_hash", b"")
        if isinstance(password_hash, bytes) or (isinstance(password_hash, str) and password_hash.startswith('$2b$')):
            same_password = bcrypt.checkpw(new_password.encode('utf-8'), 
                password_hash if isinstance(password_hash, bytes) else password_hash.encode('utf-8'))
        else:
            same_password = check_password_hash(password_hash, new_password)
        
        if same_password:
            return fail("Mật khẩu mới phải khác mật khẩu cũ", 400)
    except:
        pass  # Nếu lỗi thì bỏ qua check này

    # Hash new password
    new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    # Decode to string for MongoDB storage
    new_password_hash_str = new_password_hash.decode("utf-8") if isinstance(new_password_hash, (bytes, bytearray)) else str(new_password_hash)

    # Update user
    mongo_db[collection].update_one(
        {"_id": user_oid},
        {"$set": {
            "password_hash": new_password_hash_str,
            "must_change_password": False,  # ✅ Bỏ flag
            "updated_at": datetime.utcnow()
        }}
    )

    # ✅ GỬI EMAIL THÔNG BÁO ĐỔI MẬT KHẨU THÀNH CÔNG
    try:
        email = user.get("email")
        full_name = user.get("full_name") or user.get("name", "Bạn")
        
        if email:
            print(f"📧 [change_password] Sending password change email to {email}")
            email_sent = send_password_change_email(
                to=email,
                full_name=full_name,
                user_id=str(user_oid)
            )
            
            if email_sent:
                print(f"✅ [change_password] Password change email sent to {email}")
            else:
                print(f"⚠️ [change_password] Failed to send password change email to {email}")
    except Exception as email_error:
        print(f"❌ [change_password] Email sending error (non-blocking): {email_error}")
        import traceback
        traceback.print_exc()

    return ok({
        "message": "Đổi mật khẩu thành công",
        "must_change_password": False
    })


@auth_bp.route("/me", methods=["GET", "OPTIONS"])
def get_current_user():
    """Trả thông tin user hiện tại. Ưu tiên dữ liệu từ claims (collection/patient_id)."""
    if request.method == "OPTIONS":
        return "", 204

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else None
    if not token:
        return fail("Thiếu token", 401)

    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except:
        return fail("Token không hợp lệ", 401)

    user_id = claims.get("sub") or claims.get("user_id")
    collection = claims.get("collection")  # 'users' | 'patients' | None
    claim_patient_id = claims.get("patient_id")

    try:
        user_oid = ObjectId(user_id)
    except:
        return fail("Invalid user ID", 400)

    user = None
    patient = None

    # Dùng collection trong claim nếu có để truy xuất nhanh & chính xác
    if collection == "patients":
        user = mongo_db.patients.find_one({"_id": user_oid})
        patient = user
    elif collection == "users":
        user = mongo_db.users.find_one({"_id": user_oid})
        if claim_patient_id:
            try:
                patient = mongo_db.patients.find_one({"_id": ObjectId(claim_patient_id)})
            except:
                patient = None
        if not patient and user:
            # fallback theo quan hệ
            patient = mongo_db.patients.find_one({"user_id": user_oid}) \
                   or mongo_db.patients.find_one({"email": user.get("email")})
    else:
        # Fallback cũ nếu JWT chưa có collection
        user = mongo_db.users.find_one({"_id": user_oid})
        if not user:
            user = mongo_db.patients.find_one({"_id": user_oid})
            if user:
                patient = user
        else:
            patient = mongo_db.patients.find_one({"user_id": user_oid}) \
                   or mongo_db.patients.find_one({"email": user.get("email")})

    if not user:
        return fail("User not found", 404)

    # Ưu tiên tên/phone từ patient nếu có
    full_name = (patient.get("full_name") if patient else None) \
                or user.get("full_name") or user.get("name") or ""
    phone = (patient.get("phone") if patient else None) or user.get("phone", "")
    role = user.get("role") or ("patient" if collection == "patients" else "patient")

    return ok({
        "id": str(user["_id"]),
        "email": user.get("email"),
        "name": full_name,
        "phone": phone,
        "role": role,
        "avatar": user.get("avatar_url"),
        "must_change_password": user.get("must_change_password", False),
        "is_verified": user.get("is_verified", False),
        "is_active": user.get("is_active", True),
        "patient_id": str(patient["_id"]) if patient else (claim_patient_id or None),
        "collection": collection or ("patients" if role == "patient" and patient == user else "users")
    })


# ============================================
# EMAIL VERIFICATION
# ============================================

@auth_bp.route("/verify-email", methods=["GET"])
def verify_email_query():
    """
    ✅ VERIFY EMAIL & CREATE ACCOUNT
    User click link → Verify token → TẠO ACCOUNT trong patients
    """
    token = request.args.get('token')
    if not token:
        return fail("Thiếu token xác nhận", 400)

    try:
        # ✅ Tìm trong pending_registrations (chưa tạo account)
        pending = mongo_db.pending_registrations.find_one({
            "verification_token": token,
            "verification_expires": {"$gt": datetime.utcnow()},
            "status": "pending"
        })

        if not pending:
            # ✅ Check if already verified (user clicked link again)
            # Tìm với token, không cần check expires vì đã verify rồi
            verified_pending = mongo_db.pending_registrations.find_one({
                "verification_token": token,
                "status": "verified"
            })
            
            if verified_pending:
                # Already verified, check if account exists
                email = verified_pending.get("email")
                patient_id = verified_pending.get("patient_id")
                
                if patient_id:
                    account = mongo_db.patients.find_one({"_id": patient_id})
                    if account and account.get("is_verified"):
                        return ok({
                            "message": "Email đã được xác nhận thành công trước đó! Bạn có thể đăng nhập ngay.",
                            "email": email,
                            "verified": True,
                            "already_verified": True
                        })
                # If no patient_id but status is verified, still return success
                return ok({
                    "message": "Email đã được xác nhận thành công trước đó! Bạn có thể đăng nhập ngay.",
                    "email": email,
                    "verified": True,
                    "already_verified": True
                })
            
            # Fallback: Check old patients with token (backward compatibility)
            account = mongo_db.patients.find_one({
                "verification_token": token,
                "verification_expires": {"$gt": datetime.utcnow()},
                "is_verified": False
            })
            
            if account:
                # Old flow: Just verify existing account
                mongo_db.patients.update_one(
                    {"_id": account["_id"]},
                    {
                        "$set": {
                            "is_verified": True,
                            "updated_at": datetime.utcnow()
                        },
                        "$unset": {
                            "verification_token": "",
                            "verification_expires": ""
                        }
                    }
                )
                
                # Send welcome email
                try:
                    send_welcome_email(
                        to=account["email"],
                        full_name=account.get("full_name", ""),
                        patient_id=str(account["_id"])
                    )
                except:
                    pass
                
                return ok({
                    "message": "Email đã được xác nhận thành công! Bạn có thể đăng nhập ngay.",
                    "email": account["email"],
                    "verified": True
                })
            
            # ✅ Check if account already verified by email (token might be removed)
            # Try to find by checking if there's a verified account that might have used this token
            # This is a fallback for cases where token was already used but we can't find it
            return fail("Token không hợp lệ hoặc đã hết hạn", 400)

        # ✅ TẠO ACCOUNT THẬT trong patients collection
        email = pending["email"]
        
        # Check if account already exists (race condition protection)
        existing = mongo_db.patients.find_one({"email": email})
        if existing:
            # Account already exists, just delete pending
            mongo_db.pending_registrations.delete_one({"_id": pending["_id"]})
            return ok({
                "message": "Tài khoản đã tồn tại. Bạn có thể đăng nhập ngay.",
                "email": email,
                "verified": True
            })
        
        # ✅ CREATE PATIENT ACCOUNT
        patient_data = {
            # Auth
            "email": email,
            "password_hash": pending["password_hash"],
            "role": "patient",
            "is_active": True,
            "is_verified": True,  # ✅ Verified ngay khi tạo account
            "must_change_password": False,

            # Personal information
            "full_name": pending["full_name"],
            "phone": pending["phone"],
            "date_of_birth": pending["date_of_birth"],
            "dob": pending.get("dob", pending["date_of_birth"]),
            "gender": pending["gender"],
            "address": pending["address"],
            "avatar_url": None,

            # Medical profile
            "medical_profile": {
                "blood_type": None,
                "height": None,
                "weight": None,
                "allergies": [],
                "chronic_diseases": [],
                "emergency_contact": {}
            },

            # Preferences
            "preferred_doctor_id": None,
            "notification_preferences": {
                "email_reminders": True,
                "sms_reminders": True,
                "marketing_emails": False
            },
            "language": "vi",
            "timezone": "Asia/Ho_Chi_Minh",

            # Consent
            "ehr_consent": False,
            "data_sharing_consent": False,

            # Timestamps
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }

        # ✅ Insert vào patients collection
        patient_result = mongo_db.patients.insert_one(patient_data)
        patient_id = patient_result.inserted_id

        # ✅ Update pending status (giữ lại token để có thể check lại nếu user click link lần nữa)
        mongo_db.pending_registrations.update_one(
            {"_id": pending["_id"]},
            {
                "$set": {
                    "status": "verified",
                    "account_created_at": datetime.utcnow(),
                    "patient_id": patient_id
                }
                # ✅ KHÔNG XÓA TOKEN - để có thể check lại nếu user click link lần nữa
            }
        )
        
        # ✅ Gửi welcome email
        try:
            welcome_sent = send_welcome_email(
                to=email,
                full_name=pending["full_name"],
                patient_id=str(patient_id)
            )
            if welcome_sent:
                print(f"✅ Welcome email sent to {email} after account creation")
        except Exception as e:
            print(f"⚠️ Failed to send welcome email: {e}")

        return ok({
            "message": "Email đã được xác nhận thành công! Tài khoản đã được tạo. Email chào mừng đã được gửi. Bạn có thể đăng nhập ngay bây giờ.",
            "email": email,
            "verified": True,
            "patient_id": str(patient_id),
            "account_created": True
        })

    except Exception as e:
        print(f"Verify email error: {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email_path(token):
    """
    ✅ VERIFY EMAIL & CREATE ACCOUNT (Path parameter version)
    Same as verify_email_query but with token in path
    """
    try:
        if not token:
            return fail("Token không hợp lệ", 400)

        # ✅ Tìm trong pending_registrations
        pending = mongo_db.pending_registrations.find_one({
            "verification_token": token,
            "verification_expires": {"$gt": datetime.utcnow()},
            "status": "pending"
        })

        if not pending:
            # ✅ Check if already verified (user clicked link again)
            verified_pending = mongo_db.pending_registrations.find_one({
                "verification_token": token,
                "status": "verified"
            })
            
            if verified_pending:
                # Already verified, check if account exists
                email = verified_pending.get("email")
                patient_id = verified_pending.get("patient_id")
                
                if patient_id:
                    account = mongo_db.patients.find_one({"_id": patient_id})
                    if account and account.get("is_verified"):
                        return ok({
                            "message": "Email đã được xác nhận thành công trước đó! Bạn có thể đăng nhập ngay.",
                            "email": email,
                            "verified": True,
                            "already_verified": True
                        })
                # If no patient_id but status is verified, still return success
                return ok({
                    "message": "Email đã được xác nhận thành công trước đó! Bạn có thể đăng nhập ngay.",
                    "email": email,
                    "verified": True,
                    "already_verified": True
                })
            
            # Fallback: Check old patients
            account = mongo_db.patients.find_one({
                "verification_token": token,
                "verification_expires": {"$gt": datetime.utcnow()},
                "is_verified": False
            })
            
            if account:
                mongo_db.patients.update_one(
                    {"_id": account["_id"]},
                    {
                        "$set": {"is_verified": True, "updated_at": datetime.utcnow()},
                        "$unset": {"verification_token": "", "verification_expires": ""}
                    }
                )
                try:
                    send_welcome_email(to=account["email"], full_name=account.get("full_name", ""), patient_id=str(account["_id"]))
                except:
                    pass
                return ok({"message": "Email đã được xác nhận thành công!", "email": account["email"], "verified": True})
            
            return fail("Token không hợp lệ hoặc đã hết hạn", 400)

        # ✅ TẠO ACCOUNT
        email = pending["email"]
        existing = mongo_db.patients.find_one({"email": email})
        if existing:
            mongo_db.pending_registrations.delete_one({"_id": pending["_id"]})
            return ok({"message": "Tài khoản đã tồn tại.", "email": email, "verified": True})

        patient_data = {
            "email": email,
            "password_hash": pending["password_hash"],
            "role": "patient",
            "is_active": True,
            "is_verified": True,
            "must_change_password": False,
            "full_name": pending["full_name"],
            "phone": pending["phone"],
            "date_of_birth": pending["date_of_birth"],
            "dob": pending.get("dob", pending["date_of_birth"]),
            "gender": pending["gender"],
            "address": pending["address"],
            "avatar_url": None,
            "medical_profile": {"blood_type": None, "height": None, "weight": None, "allergies": [], "chronic_diseases": [], "emergency_contact": {}},
            "preferred_doctor_id": None,
            "notification_preferences": {"email_reminders": True, "sms_reminders": True, "marketing_emails": False},
            "language": "vi",
            "timezone": "Asia/Ho_Chi_Minh",
            "ehr_consent": False,
            "data_sharing_consent": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }

        patient_result = mongo_db.patients.insert_one(patient_data)
        patient_id = patient_result.inserted_id

        # ✅ Update pending status (giữ lại token để có thể check lại nếu user click link lần nữa)
        mongo_db.pending_registrations.update_one(
            {"_id": pending["_id"]},
            {
                "$set": {"status": "verified", "account_created_at": datetime.utcnow(), "patient_id": patient_id}
                # ✅ KHÔNG XÓA TOKEN - để có thể check lại nếu user click link lần nữa
            }
        )
        
        try:
            send_welcome_email(to=email, full_name=pending["full_name"], patient_id=str(patient_id))
        except:
            pass

        return ok({
            "message": "Email đã được xác nhận thành công! Tài khoản đã được tạo. Bạn có thể đăng nhập ngay.",
            "email": email,
            "verified": True,
            "patient_id": str(patient_id),
            "account_created": True
        })

    except Exception as e:
        print(f"Verify email error: {e}")
        import traceback
        traceback.print_exc()
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


@auth_bp.route("/resend-verification", methods=["POST", "OPTIONS"])
def resend_verification():
    """Resend verification email"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()

        if not email or not is_valid_email(email):
            return fail("Email không hợp lệ", 400)

        account = mongo_db.patients.find_one({
            "email": email,
            "is_verified": False
        })

        if not account:
            return fail("Không tìm thấy tài khoản chưa xác nhận với email này", 404)

        verification_token = secrets.token_urlsafe(32)

        mongo_db.patients.update_one(
            {"_id": account["_id"]},
            {
                "$set": {
                    "verification_token": verification_token,
                    "verification_expires": datetime.utcnow() + timedelta(hours=24),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        full_name = account.get("full_name", "")
        try:
            success = send_verification_email(
                to=email,
                full_name=full_name,
                verification_token=verification_token
            )
        except Exception as email_error:
            print(f"Resend email failed: {email_error}")
            success = False

        return ok({
            "message": "Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư.",
            "email_sent": success
        })

    except Exception as e:
        print(f"Resend verification error: {e}")
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


# ============================================
# PASSWORD RESET
# ============================================

@auth_bp.route("/forgot-password", methods=["POST", "OPTIONS"])
@limiter.limit(RATE_LIMITS["auth_forgot_password"])  # ✅ 3 per hour
def forgot_password():
    """Request password reset email"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()

        if not email or not is_valid_email(email):
            return fail("Email không hợp lệ", 400)

        user = None
        collection_name = None

        # Check users collection
        user = mongo_db.users.find_one({"email": email})
        if user:
            collection_name = "users"
        else:
            # Check patients collection
            user = mongo_db.patients.find_one({"email": email})
            if user:
                collection_name = "patients"

        if not user:
            # Security: don't reveal if email exists
            return ok({"message": "Nếu email tồn tại, bạn sẽ nhận được email khôi phục mật khẩu."})

        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.utcnow() + timedelta(hours=1)

        collection = getattr(mongo_db, collection_name)
        collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_password_token": reset_token,
                    "reset_password_expires": reset_expires,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        full_name = user.get("full_name") or user.get("name", "")
        try:
            success = send_password_reset_email(
                to=email,
                full_name=full_name,
                reset_token=reset_token
            )
        except Exception as email_error:
            print(f"Reset email failed: {email_error}")
            success = False

        return ok({
            "message": "Nếu email tồn tại, bạn sẽ nhận được email khôi phục mật khẩu.",
            "email_sent": success
        })

    except Exception as e:
        print(f"Forgot password error: {e}")
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


@auth_bp.route("/reset-password/<token>", methods=["POST", "OPTIONS"])
def reset_password(token):
    """Reset password using token"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        if not token:
            return fail("Token không hợp lệ", 400)

        data = request.get_json() or {}
        new_password = data.get("password", "")

        if not new_password:
            return fail("Thiếu mật khẩu mới", 400)
        if len(new_password) < 6:
            return fail("Mật khẩu phải có ít nhất 6 ký tự", 400)

        user = None
        collection_name = None

        # Check users collection
        user = mongo_db.users.find_one({
            "reset_password_token": token,
            "reset_password_expires": {"$gt": datetime.utcnow()}
        })
        if user:
            collection_name = "users"
        else:
            # Check patients collection
            user = mongo_db.patients.find_one({
                "reset_password_token": token,
                "reset_password_expires": {"$gt": datetime.utcnow()}
            })
            if user:
                collection_name = "patients"

        if not user:
            return fail("Token không hợp lệ hoặc đã hết hạn", 400)

        # Hash new password
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        # Decode to string for MongoDB storage (consistent with other password hashing)
        new_password_hash_str = new_password_hash.decode("utf-8") if isinstance(new_password_hash, (bytes, bytearray)) else str(new_password_hash)

        collection = getattr(mongo_db, collection_name)
        collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": new_password_hash_str,
                    "updated_at": datetime.utcnow()
                },
                "$unset": {
                    "reset_password_token": "",
                    "reset_password_expires": ""
                }
            }
        )

        return ok({
            "message": "Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập với mật khẩu mới."
        })

    except Exception as e:
        print(f"Reset password error: {e}")
        return fail("Lỗi hệ thống. Vui lòng thử lại sau.", 500)


# ============================================
# DEBUG & UTILITY ENDPOINTS
# ============================================

@auth_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return ok({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "collections": {
            "users": mongo_db.users.count_documents({}),
            "patients": mongo_db.patients.count_documents({})
        }
    })


@auth_bp.route("/debug/accounts", methods=["GET"])
def debug_accounts():
    """Debug endpoint to view accounts (remove in production!)"""
    try:
        accounts = list(mongo_db.patients.find({}, {
            "email": 1,
            "full_name": 1,
            "is_verified": 1,
            "is_active": 1,
            "must_change_password": 1,
            "created_at": 1
        }).sort("created_at", -1).limit(10))

        for account in accounts:
            account["_id"] = str(account["_id"])
            if "created_at" in account:
                account["created_at"] = account["created_at"].isoformat()

        # Also show pending registrations
        pending = list(mongo_db.pending_registrations.find({}, {
            "email": 1,
            "full_name": 1,
            "status": 1,
            "verification_expires": 1,
            "created_at": 1
        }).sort("created_at", -1).limit(10))

        for p in pending:
            p["_id"] = str(p["_id"])
            if "created_at" in p:
                p["created_at"] = p["created_at"].isoformat()
            if "verification_expires" in p:
                p["verification_expires"] = p["verification_expires"].isoformat()

        return ok({
            "accounts": accounts,
            "pending_registrations": pending,
            "total_accounts": mongo_db.patients.count_documents({}),
            "verified_accounts": mongo_db.patients.count_documents({"is_verified": True}),
            "total_pending": mongo_db.pending_registrations.count_documents({})
        })
    except Exception as e:
        return fail(f"Debug error: {str(e)}", 500)


@auth_bp.route("/debug/cleanup-pending", methods=["POST"])
def cleanup_pending():
    """Cleanup expired/old pending registrations (admin/debug only)"""
    try:
        deleted_count = 0
        
        # Find all pending registrations
        all_pending = list(mongo_db.pending_registrations.find({}))
        
        for pending in all_pending:
            email = pending.get("email", "unknown")
            expires_at = pending.get("verification_expires")
            created_at = pending.get("created_at", datetime.utcnow())
            status = pending.get("status", "pending")
            
            # Check if expired
            is_expired = expires_at and expires_at < datetime.utcnow()
            
            # Check if too old (more than 7 days)
            is_too_old = (datetime.utcnow() - created_at).days > 7
            
            # Check if already verified
            is_verified = status == "verified"
            
            if is_expired or is_too_old or is_verified:
                mongo_db.pending_registrations.delete_one({"_id": pending["_id"]})
                deleted_count += 1
                print(f"🗑️  Deleted pending registration: {email}")
        
        return ok({
            "message": f"Cleaned up {deleted_count} pending registrations",
            "deleted_count": deleted_count,
            "remaining": mongo_db.pending_registrations.count_documents({})
        })
    except Exception as e:
        return fail(f"Cleanup error: {str(e)}", 500)


@auth_bp.route("/logout", methods=["POST", "OPTIONS"])
def logout():
    """
    Logout endpoint - Sets last_activity to far past to immediately show offline status
    This makes users appear offline within 30s-1min instead of waiting 5 minutes
    """
    if request.method == "OPTIONS":
        return "", 204

    try:
        # Get token from header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return fail("Token không hợp lệ", 401)
        
        token = auth_header.replace("Bearer ", "").strip()
        
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id") or payload.get("sub")
            role = payload.get("role", "patient")
            
            if not user_id:
                return fail("Token không hợp lệ", 401)
            
            # ✅ Set last_activity to far past (e.g., 1 year ago) so user appears offline immediately
            far_past = datetime.utcnow() - timedelta(days=365)
            
            # Update correct collection based on role
            collection = mongo_db.patients if role == "patient" else mongo_db.users
            result = collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "last_activity": far_past,
                    "last_logout": datetime.utcnow()
                }}
            )
            
            # 🔒 Delete AI conversations for patient on logout (privacy protection)
            if role == "patient":
                try:
                    # Import clear_chat_session
                    from app.services.gemini_service import clear_chat_session
                    
                    # Find AI conversations owned by this patient
                    ai_conversations = mongo_db.conversations.find({
                        "mode": "ai",
                        "patient_id": ObjectId(user_id)
                    })
                    
                    deleted_count = 0
                    for conv in ai_conversations:
                        conv_id = conv["_id"]
                        # Clear chat session from memory
                        clear_chat_session(str(conv_id))
                        # Delete messages first
                        mongo_db.messages.delete_many({"conversation_id": conv_id})
                        # Delete conversation
                        mongo_db.conversations.delete_one({"_id": conv_id})
                        deleted_count += 1
                    
                    if deleted_count > 0:
                        print(f"🗑️ Deleted {deleted_count} AI conversation(s) for patient {user_id}")
                except Exception as cleanup_err:
                    print(f"⚠️ Error cleaning up AI conversations: {cleanup_err}")
            
            if result.modified_count > 0:
                return ok({
                    "message": "Đã đăng xuất thành công",
                    "user_id": user_id,
                    "role": role
                })
            else:
                return ok({"message": "Đã đăng xuất"})
                
        except jwt.ExpiredSignatureError:
            return fail("Token đã hết hạn", 401)
        except jwt.InvalidTokenError:
            return fail("Token không hợp lệ", 401)
            
    except Exception as e:
        print(f"Logout error: {e}")
        return fail(f"Lỗi đăng xuất: {str(e)}", 500)


@auth_bp.route("/debug/test-email", methods=["POST", "OPTIONS"])
def debug_test_email():
    """Test email sending (remove in production!)"""
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json() or {}
        test_email = data.get("email")

        if not test_email:
            return fail("Thiếu email test", 400)

        try:
            success = send_email(
                to=test_email,
                subject="[Healthcare AI] Test Email",
                content="Đây là email test từ Healthcare AI system. Nếu bạn nhận được email này, cấu hình email đã hoạt động!"
            )
        except Exception as email_error:
            print(f"Test email failed: {email_error}")
            success = False

        return ok({
            "message": "Test email sent",
            "success": success,
            "email": test_email
        })

    except Exception as e:
        return fail(f"Test email error: {str(e)}", 500)