# app/utils/responses.py
from flask import jsonify, make_response, request

ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}

def _corsify(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    return response

def success(data=None, message="OK", status_code=200, **extra):
    """
    Trả về JSON success chuẩn. Hỗ trợ keyword:
      - message
      - status_code (alias của code)
    """
    payload = {
        "success": True,
        "message": message,
        "data": data
    }
    if extra:
        payload.update(extra)
    resp = make_response(jsonify(payload), status_code)
    return _corsify(resp)

def fail(message="Lỗi không xác định", status_code=400, errors=None, **extra):
    """
    Trả về JSON fail chuẩn. Hỗ trợ keyword:
      - message
      - status_code (alias của code)
      - errors (dict/list các lỗi chi tiết)
    """
    payload = {
        "success": False,
        "message": message
    }
    if errors is not None:
        payload["errors"] = errors
    if extra:
        payload.update(extra)
    resp = make_response(jsonify(payload), status_code)
    return _corsify(resp)

# Tương thích ngược: ok()/error() dùng ở code cũ
def ok(data=None, code=200, message="OK", **extra):
    return success(data=data, message=message, status_code=code, **extra)

def error(message="Lỗi không xác định", code=400, errors=None, **extra):
    return fail(message=message, status_code=code, errors=errors, **extra)
