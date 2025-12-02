# backend/app/main.py - FIXED (removed duplicate route)
import eventlet
eventlet.monkey_patch()

from flask import Flask, app, jsonify, request
from flask_cors import CORS, cross_origin
from datetime import datetime
import logging
import os  # ✅ Add os import
from bson import ObjectId

# Extensions
from app.extensions import mongo_db, socketio  # socketio instance dùng chung

# Blueprints
from app.routes.appointments import appointments_bp
from app.routes.ehr import ehr_bp
from app.routes.ehr_form import ehr_form_bp
from app.routes.health import health_bp
from app.routes.xray import xray_bp
from app.routes.chat import chat_bp
from app.routes.chat_ai import chat_ai_bp
from app.routes.chat_suggestions import chat_suggestions_bp
from app.routes.patient import patient_bp
from app.routes.surgery import surgery_bp
from app.routes.doctor import doctor_bp
from app.routes.report import report_bp
from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.files import files_bp  # ✅ Add files blueprint
from app.routes.consultation import consultation_bp  # ✅ Add consultation blueprint
from app.routes.specialty_ai import specialty_ai_bp  # ✅ Specialty AI Assistant
from app.routes.notifications import notifications_bp  # ✅ Notifications for patient/doctor
from app.routes.ratings import ratings_bp  # ✅ Doctor ratings/reviews
from app.routes import xray as xray_module
from app.routes.admin_accounts import admin_accounts_bp  # ✅ Admin account controls

# Services & Config
from app.config import get_settings
from app.logging_conf import setup_logging
from app.utils.errors import register_error_handlers
from app.utils.rate_limiter import apply_rate_limits  # ✅ Add rate limiter

# Socket.IO helpers
from flask_socketio import join_room, leave_room, emit
from datetime import datetime
from flask.json.provider import DefaultJSONProvider


class CustomJSONProvider(DefaultJSONProvider):
    """Custom JSON provider to handle datetime and ObjectId objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat() + 'Z'
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


def create_app() -> Flask:
    app = Flask(__name__)
    
    # Set custom JSON provider for Flask 2.2+
    app.json = CustomJSONProvider(app)
    
    # ✅ Configure upload folder
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size

    # ==== CORS: Cho phép FE chạy tại localhost:3000/127.0.0.1:3000 ====
    # Cấu hình chuẩn cho mọi route /api/*
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    # Thêm origin khác nếu cần (VD: Vite)
                    "http://localhost:5173",
                ],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                "expose_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
            }
        },
    )
    app.config["CORS_HEADERS"] = ["Content-Type", "Authorization"]

    # Socket.IO: init đúng 1 lần, kèm cors_allowed_origins
    socketio.init_app(
        app,
        cors_allowed_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
        ],
    )

    # ==== Lưới an toàn: đảm bảo mọi response (kể cả error) đều có CORS headers ====
    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get("Origin")
        allowed = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
        }
        if origin in allowed:
            # Không dùng "*" khi supports_credentials=True
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers[
                "Access-Control-Allow-Headers"
            ] = "Content-Type, Authorization, X-Requested-With"
            resp.headers[
                "Access-Control-Allow-Methods"
            ] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return resp

    # ✅ Bắt mọi preflight cho /api/* để tránh kẹt ở OPTIONS
    # NOTE: Route này chỉ bắt OPTIONS, không ảnh hưởng POST/GET/PUT/DELETE
    @app.route("/api/<path:_any>", methods=["OPTIONS"])
    def options_any(_any):
        # Headers sẽ được gắn bởi after_request()
        print(f"[DEBUG] OPTIONS catch-all for /api/{_any}")
        return ("", 204)

# Settings & Logging
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)

    # ============================================
    # DATABASE INDEXES - Initialize once at startup
    # ============================================
    try:
        from app.model.index_init import ensure_all_indexes
        ensure_all_indexes()
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to create database indexes: {e}")
        # Continue app startup even if indexes fail

    # ============================================
    # REGISTER BLUEPRINTS
    # ============================================
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")  # ✅ Fix: Add /auth prefix
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(xray_bp, url_prefix="/api/xray")
    
    # Chat routes (split into 3 blueprints)
    app.register_blueprint(chat_bp, url_prefix="/api")          # Core chat
    app.register_blueprint(chat_ai_bp, url_prefix="/api")        # AI chat
    app.register_blueprint(chat_suggestions_bp, url_prefix="/api")  # AI suggestions
    
    # ✅ appointments_bp đã có route batch-availability bên trong rồi
    # ✅ KHÔNG CẦN add_url_rule nữa!
    app.register_blueprint(appointments_bp, url_prefix="/api")
    
    app.register_blueprint(ehr_bp, url_prefix="/api/ehr")
    app.register_blueprint(ehr_form_bp, url_prefix="/api/ehr")
    app.register_blueprint(patient_bp, url_prefix="/api")
    app.register_blueprint(surgery_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")
    app.register_blueprint(doctor_bp, url_prefix="/api")
    app.register_blueprint(files_bp, url_prefix="/api/files")  # ✅ Add files routes
    app.register_blueprint(consultation_bp, url_prefix="/api/consultation")  # ✅ Add consultation routes
    app.register_blueprint(specialty_ai_bp, url_prefix="/api/specialty-ai")  # ✅ Specialty AI routes
    app.register_blueprint(notifications_bp, url_prefix="/api")  # ✅ Notifications routes (patient/doctor)
    app.register_blueprint(ratings_bp, url_prefix="/api")  # ✅ Ratings routes
    app.register_blueprint(admin_accounts_bp, url_prefix="/api/admin")  # ✅ Admin account controls

    print("=== URL MAP ===")
    for r in app.url_map.iter_rules():
        print(r, list(r.methods))
    print("================")
    
    # ✅ Apply rate limiting only if enabled in config
    if settings.ENABLE_RATE_LIMITING:
        apply_rate_limits(app)
        logging.getLogger(__name__).info("Rate limiting enabled")
    else:
        logging.getLogger(__name__).warning("⚠️ Rate limiting DISABLED (development mode)")
    
    # Error handlers
    register_error_handlers(app)

    # ============================================
    # ROOT ENDPOINT
    # ============================================
    @app.route("/", methods=["GET", "POST"])
    def root():
        if request.method == "POST":
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Vui lòng dùng các endpoint trong /api/*",
                    }
                ),
                405,
            )
        return (
            jsonify(
                {
                    "status": "ok",
                    "message": "Healthcare AI API Server",
                    "version": "1.0.0",
                    "endpoints": {
                        "health": "/api/health",
                        "auth": "/api/login, /api/register",
                        "chat": "/api/chat",
                        "doctors": "/api/doctors",
                        "patients": "/api/patients",
                        "xray": "/api/xray/predict",
                        "appointments": "/api/time-slots/batch-availability",
                    },
                }
            ),
            200,
        )

    logging.getLogger(__name__).info(
        f"App initialized. Log level={settings.LOG_LEVEL}"
    )
    
    # ============================================
    # DEV MODE: Auto-fix appointments
    # ============================================
    if not settings.ENABLE_RATE_LIMITING:  # Only in dev mode
        try:
            from app.utils.dev_fixes import auto_fix_appointments_dev
            auto_fix_appointments_dev()
        except Exception as e:
            logging.getLogger(__name__).warning(f"Dev auto-fix failed: {e}")
    
    # ============================================
    # BACKGROUND TASKS: Data integrity checks
    # ============================================
    # Schedule periodic data integrity checks every 6 hours
    @socketio.on('connect')
    def schedule_integrity_checks():
        """Schedule periodic data integrity checks"""
        try:
            from app.tasks.data_integrity_check import check_and_fix_data_integrity
            # Run check every 6 hours in background
            socketio.start_background_task(target=periodic_integrity_check, 
                                          check_func=check_and_fix_data_integrity)
        except Exception as e:
            logging.getLogger(__name__).warning(f"Could not schedule integrity checks: {e}")

    return app


def periodic_integrity_check(check_func, interval_hours=6):
    """Run integrity checks periodically"""
    import time
    while True:
        try:
            check_func()
        except Exception as e:
            logging.getLogger(__name__).error(f"Integrity check error: {e}")
        time.sleep(interval_hours * 3600)  # Sleep for N hours


# ============================================
# SOCKET.IO EVENT HANDLERS
# ============================================

@socketio.on("connect")
def handle_connect():
    print(f"✅ Client connected: {request.sid}")

@socketio.on("disconnect")
def handle_disconnect():
    print(f"❌ Client disconnected: {request.sid}")

@socketio.on("join_room")
def handle_join_room(data):
    room_raw = (data or {}).get("room")
    conv_id = (data or {}).get("conv_id") or (data or {}).get("conversation_id")

    # ✅ Chuẩn hóa room name
    if room_raw:
        room = room_raw
    elif conv_id:
        room = f"room:{conv_id}"
    else:
        print("⚠️ No room specified in join_room event")
        return

    join_room(room)
    print(f"🚪 Client {request.sid} joined room: {room}")
    emit("system", {"message": f"Joined room {room}"}, room=request.sid)

@socketio.on("leave_room")
def handle_leave_room(data):
    room_raw = (data or {}).get("room")
    conv_id = (data or {}).get("conv_id") or (data or {}).get("conversation_id")
    if room_raw:
        room = room_raw
    elif conv_id:
        room = f"room:{conv_id}"
    else:
        return
    leave_room(room)
    print(f"🚪 Client {request.sid} left room: {room}")

# ✅ Gộp join/leave hội thoại
@socketio.on("join")
def on_join(data):
    conv_id = (data or {}).get("conv_id") or (data or {}).get("conversation_id")
    if conv_id:
        room_name = f"room:{conv_id}"
        join_room(room_name)
        print(f"🚪 Client {request.sid} joined conversation: {conv_id}")
        emit("system", {"message": f"Joined {room_name}"}, room=request.sid)

@socketio.on("leave")
def on_leave(data):
    conv_id = (data or {}).get("conv_id") or (data or {}).get("conversation_id")
    if conv_id:
        room_name = f"room:{conv_id}"
        leave_room(room_name)
        print(f"🚪 Client {request.sid} left conversation: {conv_id}")

@socketio.on("patient_online")
def patient_online(data):
    pid = (data or {}).get("patient_id")
    if pid:
        emit("patient_presence", {"patient_id": pid, "online": True}, broadcast=True)

@socketio.on("patient_offline")
def patient_offline(data):
    pid = (data or {}).get("patient_id")
    if pid:
        emit("patient_presence", {"patient_id": pid, "online": False}, broadcast=True)

@socketio.on("send_message")
def handle_message(data):
    """
    Realtime message handler
    Saves to MongoDB + emits to room
    """
    conv_id_str = (data or {}).get("conversation_id")
    sender = (data or {}).get("sender")
    text = ((data or {}).get("message") or "").strip()

    if not conv_id_str or not sender or not text:
        return

    try:
        conv_oid = ObjectId(conv_id_str)
    except Exception:
        print(f"⚠️ Invalid conversation_id: {conv_id_str}")
        return

    now = datetime.utcnow()

    # Save message to DB
    mongo_db.messages.insert_one(
        {
            "conversation_id": conv_oid,
            "sender": sender,
            "text": text,
            "created_at": now,
            "is_read": (sender == "doctor"),
        }
    )

    # Update conversation metadata
    mongo_db.conversations.update_one(
        {"_id": conv_oid},
        {"$set": {"updated_at": now, "last_message": text}},
        upsert=True,
    )

    # Emit to room
    payload = {
        "sender": sender,
        "text": text,
        "timestamp": now.isoformat(),
        "conversation_id": conv_id_str,
    }
    room_name = f"room:{conv_id_str}"
    emit("receive_message", payload, room=room_name)
    emit("new_message", payload, broadcast=True)

    # AI auto-reply DISABLED - use POST /chat/ai endpoint instead

@socketio.on("typing")
def handle_typing(data):
    """Broadcast typing indicator to room"""
    room = (data or {}).get("room")
    sender = (data or {}).get("sender")
    if room:
        emit("typing", {"sender": sender}, room=room, include_self=False)


# ============================================
# RUN APP (if executed directly)
# ============================================
if __name__ == "__main__":
    app = create_app()
    # Không init_app lại lần nữa để tránh xung đột CORS
    socketio.run(app, host="0.0.0.0", port=8000, debug=True)