# backend/app/utils/rate_limiter.py
"""
Rate limiting utilities using Flask-Limiter
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import jsonify


def rate_limit_exceeded_handler(e):
    """Custom handler for rate limit exceeded errors"""
    return jsonify({
        "status": "error",
        "message": "Rate limit exceeded. Please try again later.",
        "retry_after": e.description
    }), 429


# Initialize limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # Use Redis in production: redis://localhost:6379
    strategy="fixed-window",
    headers_enabled=True,
)


# Rate limit configurations
RATE_LIMITS = {
    # Authentication endpoints (stricter)
    "auth_login": "10 per minute",
    "auth_register": "5 per hour",
    "auth_forgot_password": "3 per hour",
    "auth_reset_password": "5 per hour",
    
    # AI chat endpoints (moderate)
    "ai_chat": "10 per minute",
    "doctor_advisor": "10 per minute",
    
    # General API endpoints (lenient)
    "general": "100 per minute",
    
    # Read-only endpoints (very lenient)
    "read_only": "200 per minute",
    
    # Upload endpoints (strict)
    "upload": "10 per hour",
}


def apply_rate_limits(app):
    """
    Apply rate limiting to the Flask app
    
    Args:
        app: Flask application instance
    """
    limiter.init_app(app)
    
    # Register custom error handler
    @app.errorhandler(429)
    def handle_rate_limit_error(e):
        return rate_limit_exceeded_handler(e)
