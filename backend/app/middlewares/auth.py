# app/middlewares/auth.py
from functools import wraps
from flask import request, jsonify, g
from app.utils.responses import fail
import jwt
from app.config import JWT_SECRET_KEY
from app.extensions import mongo_db
from bson import ObjectId
from datetime import datetime

def auth_required(roles=None):
    """
    Decorator to require authentication and optionally check roles
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # ✅ Allow OPTIONS to pass
            if request.method == "OPTIONS":
                return ("", 204)
            
            token = None
            auth_header = request.headers.get('Authorization')
            
            if auth_header:
                try:
                    token = auth_header.split(' ')[1]
                except IndexError:
                    return fail("Token format không hợp lệ", 401)
            
            if not token:
                return fail("Thiếu token xác thực", 401)
            
            try:
                # Decode JWT token
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
                
                # ✅ CRITICAL: Extract user info
                user_id = payload.get('user_id') or payload.get('sub')
                email = payload.get('email')
                role = payload.get('role')
                
                if not user_id or not role:
                    print(f"❌ Invalid token payload: {payload}")
                    return fail("Token không hợp lệ (thiếu user_id hoặc role)", 401)
                
                # Check if roles are specified and user has required role
                if roles and role not in roles:
                    print(f"❌ Role check failed: user_role={role}, allowed_roles={roles}")
                    return fail("Không có quyền truy cập", 403)
                
                # ✅ UPDATE LAST ACTIVITY (for online status tracking)
                # Update correct collection based on role
                try:
                    collection = mongo_db.patients if role == "patient" else mongo_db.users
                    collection.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$set": {"last_activity": datetime.utcnow()}}
                    )
                except Exception as e:
                    print(f"⚠️ Failed to update last_activity: {e}")
                
                # ✅ Store user info in Flask g object
                g.current_user = {
                    'user_id': str(user_id),  # ✅ Convert to string
                    'email': email,
                    'role': role,
                    'sub': str(user_id),  # ✅ Add 'sub' as alias
                    'payload': payload
                }
                
                print(f"✅ Auth success: user_id={user_id}, role={role}")
                
                return f(*args, **kwargs)
                
            except jwt.ExpiredSignatureError:
                return fail("Token đã hết hạn", 401)
            except jwt.InvalidTokenError as e:
                print(f"❌ JWT Invalid: {e}")
                return fail("Token không hợp lệ", 401)
            except Exception as e:
                print(f"❌ Auth middleware error: {e}")
                import traceback
                traceback.print_exc()
                return fail("Lỗi xác thực", 500)
        
        return decorated_function
    return decorator

def get_current_user():
    """Helper function để lấy current user từ g"""
    return getattr(g, 'current_user', None)

def require_role(*allowed_roles):
    """Decorator to require specific roles"""
    return auth_required(roles=list(allowed_roles))

# Specific role decorators for convenience
def admin_required(f):
    """Decorator to require admin role"""
    return auth_required(roles=['admin'])(f)

def doctor_required(f):
    """Decorator to require doctor or admin role"""
    return auth_required(roles=['doctor', 'admin'])(f)

def patient_required(f):
    """Decorator to require patient role"""
    return auth_required(roles=['patient'])(f)