# backend/app/utils/validators.py
"""
Reusable input validators for API endpoints
"""
from functools import wraps
from flask import request, jsonify
from bson import ObjectId
from datetime import datetime
import re
from pydantic import BaseModel, field_validator


class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message, field=None):
        self.message = message
        self.field = field
        super().__init__(self.message)


def validate_object_id(value, field_name="id"):
    """Validate MongoDB ObjectId"""
    if not value:
        raise ValidationError(f"{field_name} is required", field_name)
    
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string", field_name)
    
    if not ObjectId.is_valid(value):
        raise ValidationError(f"Invalid {field_name} format", field_name)
    
    return ObjectId(value)


def validate_date(value, field_name="date", allow_past=True, allow_future=True):
    """Validate date string (ISO 8601 or YYYY-MM-DD)"""
    if not value:
        raise ValidationError(f"{field_name} is required", field_name)
    
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string", field_name)
    
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        try:
            dt = datetime.strptime(value, '%Y-%m-%d')
        except ValueError:
            raise ValidationError(f"Invalid {field_name} format. Use ISO 8601 or YYYY-MM-DD", field_name)
    
    # ✅ So sánh chỉ phần date, không phần time
    today = datetime.utcnow().date()
    date_only = dt.date()
    
    if not allow_past and date_only < today:
        raise ValidationError(f"{field_name} cannot be in the past", field_name)
    
    if not allow_future and date_only > today:
        raise ValidationError(f"{field_name} cannot be in the future", field_name)
    
    return dt


def validate_string(value, field_name="field", min_length=None, max_length=None, pattern=None, required=True):
    """Validate string field"""
    if value is None or value == "":
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None
    
    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string", field_name)
    
    value = value.strip()
    
    if min_length and len(value) < min_length:
        raise ValidationError(f"{field_name} must be at least {min_length} characters", field_name)
    
    if max_length and len(value) > max_length:
        raise ValidationError(f"{field_name} must be at most {max_length} characters", field_name)
    
    if pattern and not re.match(pattern, value):
        raise ValidationError(f"{field_name} format is invalid", field_name)
    
    return value


def validate_email(value, field_name="email", required=True):
    """Validate email address"""
    if not value:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    value = validate_string(value, field_name, max_length=255, pattern=email_pattern, required=required)
    
    return value.lower() if value else None


def validate_phone(value, field_name="phone", required=True):
    """Validate phone number (Vietnamese format)"""
    if not value:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None
    
    phone_pattern = r'^0[0-9]{9,10}$'
    return validate_string(value, field_name, pattern=phone_pattern, required=required)


def validate_enum(value, field_name, allowed_values, required=True):
    """Validate enum/choice field"""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None
    
    if value not in allowed_values:
        raise ValidationError(
            f"Invalid {field_name}. Must be one of: {', '.join(map(str, allowed_values))}", 
            field_name
        )
    
    return value


def validate_integer(value, field_name="field", min_value=None, max_value=None, required=True):
    """Validate integer field"""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None
    
    if not isinstance(value, int):
        try:
            value = int(value)
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name} must be an integer", field_name)
    
    if min_value is not None and value < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}", field_name)
    
    if max_value is not None and value > max_value:
        raise ValidationError(f"{field_name} must be at most {max_value}", field_name)
    
    return value


def validate_request_json(required_fields=None, optional_fields=None):
    """
    Decorator to validate request JSON body
    
    Example:
        @validate_request_json(
            required_fields={
                'email': lambda v: validate_email(v, 'email'),
                'password': lambda v: validate_string(v, 'password', min_length=6)
            }
        )
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    "status": "error",
                    "message": "Request must be JSON"
                }), 400
            
            data = request.get_json()
            errors = {}
            
            if required_fields:
                for field, validator in required_fields.items():
                    try:
                        if field not in data:
                            raise ValidationError(f"{field} is required", field)
                        validator(data[field])
                    except ValidationError as e:
                        errors[e.field or field] = e.message
            
            if optional_fields:
                for field, validator in optional_fields.items():
                    if field in data:
                        try:
                            validator(data[field])
                        except ValidationError as e:
                            errors[e.field or field] = e.message
            
            if errors:
                return jsonify({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": errors
                }), 400
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


# Pydantic models for chat
class ChatRequest(BaseModel):
    symptoms: str

    @field_validator("symptoms")
    @classmethod
    def non_empty(cls, v: str):
        if not v or not v.strip():
            raise ValueError("symptoms không được để trống")
        return v.strip()
