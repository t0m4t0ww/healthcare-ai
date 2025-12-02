# app/middlewares/rbac.py
from functools import wraps
from flask import g
from app.utils.responses import fail

def role_required(*allowed_roles):
    """
    Decorator to check if user has required role
    Must be used after @auth_required
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if user is authenticated (should be set by auth_required)
            if not hasattr(g, 'current_user') or not g.current_user:
                return fail("Chưa xác thực", 401)
            
            user_role = g.current_user.get('role')
            
            # Check if user role is in allowed roles
            if user_role not in allowed_roles:
                return fail("Không có quyền truy cập", 403)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator