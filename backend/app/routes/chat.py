# backend/app/routes/chat.py
from flask import Blueprint, request, g
from datetime import datetime
from bson import ObjectId
from flask_socketio import join_room, leave_room, emit
from app.extensions import mongo_db, socketio
from app.utils.responses import ok, fail, success
from app.middlewares.auth import auth_required
from app.config import JWT_SECRET_KEY
import jwt

chat_bp = Blueprint("chat", __name__)

# ========= Helpers =========

def to_oid(s):
    try:
        return ObjectId(s)
    except Exception:
        return None

def serialize_conv(doc):
    updated_at = doc.get("updated_at") or doc.get("created_at")
    if isinstance(updated_at, datetime):
        updated_at = updated_at.isoformat() + "Z"
    return {
        "_id": str(doc["_id"]),
        "mode": doc.get("mode", "patient"),
        "title": doc.get("title") or "Hội thoại",
        "patient_id": str(doc.get("patient_id")) if doc.get("patient_id") else None,
        "doctor_id": str(doc.get("doctor_id")) if doc.get("doctor_id") else None,
        "updated_at": updated_at,
        "last_message": doc.get("last_message", ""),
    }

def normalize_role(m):
    s = (m.get("sender") or "").lower()
    if s in ("doctor", "patient", "ai"):
        return s
    r = (m.get("role") or "").lower()
    return r if r in ("doctor", "patient", "ai") else "patient"

def resolve_patient_oid_from_token(user_id: str):
    """Map user_id (users._id hoặc patients._id) → patients._id."""
    if not user_id:
        return None
    try:
        uid = ObjectId(user_id)
    except Exception:
        return None

    p = mongo_db.patients.find_one({"_id": uid})  # đăng nhập bằng patient._id
    if p:
        return p["_id"]

    p = mongo_db.patients.find_one({"user_id": uid})  # liên kết qua users._id
    if p:
        return p["_id"]

    u = mongo_db.users.find_one({"_id": uid})
    if u and u.get("email"):
        p = mongo_db.patients.find_one({"email": u["email"]})
        if p:
            return p["_id"]

    return None

def resolve_doctor_oid_from_token(user_id: str):
    """Map user_id (users._id) → doctors._id."""
    if not user_id:
        return None
    try:
        uid = ObjectId(user_id)
    except Exception:
        return None

    d = mongo_db.doctors.find_one({"user_id": uid})
    if d:
        return d["_id"]
    return None

def can_access_conversation(conv: dict, user_role: str, user_id: str) -> bool:
    """Chỉ 2 phía tham gia hội thoại được truy cập."""
    if not conv:
        return False
    role = (user_role or "").lower()
    if role == "patient":
        pid = resolve_patient_oid_from_token(user_id)
        print(f"🔍 [can_access_conversation] Patient: user_id={user_id}, resolved_pid={pid}, conv_patient_id={conv.get('patient_id')}")
        if not pid or str(conv.get("patient_id")) != str(pid):
            print(f"❌ [can_access_conversation] Patient ID mismatch or not found")
            return False
        
        # ✅ Nếu là conversation với doctor
        if conv.get("doctor_id"):
            # ✅ Kiểm tra xem conversation đã có tin nhắn chưa
            # Nếu đã có tin nhắn (bác sĩ đã nhắn), bệnh nhân được phép xem
            message_count = mongo_db.messages.count_documents({"conversation_id": conv.get("_id")})
            print(f"🔍 [can_access_conversation] Message count: {message_count}")
            if message_count > 0:
                # Conversation đã có tin nhắn → cho phép truy cập
                print(f"✅ [can_access_conversation] Conversation has messages, allowing access")
                return True
            
            # ✅ Nếu chưa có tin nhắn, kiểm tra appointment đã confirmed
            appt = mongo_db.appointments.find_one({
                "patient_id": pid,
                "doctor_id": conv["doctor_id"]
            })
            print(f"🔍 [can_access_conversation] Appointment found: {appt is not None}")
            if appt:
                print(f"🔍 [can_access_conversation] Appointment status: {appt.get('status')}, is_confirmed: {appt.get('is_confirmed')}")
            if not appt:
                print(f"❌ [can_access_conversation] No appointment found")
                return False
            # ✅ Cho phép nếu appointment đã confirmed HOẶC đã booked
            if appt.get("is_confirmed") or appt.get("status") in ["booked", "confirmed"]:
                print(f"✅ [can_access_conversation] Appointment is confirmed/booked, allowing access")
                return True
            print(f"❌ [can_access_conversation] Appointment not confirmed/booked")
            return False
        
        # Conversation với AI hoặc không có doctor_id
        print(f"✅ [can_access_conversation] AI conversation or no doctor_id, allowing access")
        return True
    if role == "doctor":
        did = resolve_doctor_oid_from_token(user_id)
        print(f"🔍 [can_access_conversation] Doctor: user_id={user_id}, resolved_did={did}, conv_doctor_id={conv.get('doctor_id')}")
        result = did and str(conv.get("doctor_id")) == str(did)
        print(f"🔍 [can_access_conversation] Doctor access: {result}")
        return result
    print(f"❌ [can_access_conversation] Unknown role: {role}")
    return False

# Indexes (idempotent)
try:
    mongo_db.conversations.create_index([("patient_id", 1), ("doctor_id", 1), ("mode", 1)])
    mongo_db.appointments.create_index([("patient_id", 1), ("doctor_id", 1)])
    mongo_db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
    mongo_db.messages.create_index([("conversation_id", 1), ("_id", 1)])
except Exception:
    pass

# ========= REST: Conversations =========

@chat_bp.get("/chat/conversations")
@auth_required()
def list_conversations():
    """Chỉ trả những hội thoại thuộc về user hiện tại."""
    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")

    if role == "patient":
        pid = resolve_patient_oid_from_token(uid)
        if not pid:
            return ok([])
        query = {"$or": [
            {"mode": "ai", "patient_id": pid},
            {"mode": "patient", "patient_id": pid},
        ]}
    elif role == "doctor":
        did = resolve_doctor_oid_from_token(uid)
        if not did:
            return ok([])
        # Bác sĩ thấy conv patient và conv AI của CHÍNH mình
        query = {"$or": [
            {"mode": "patient", "doctor_id": did},
            {"mode": "ai", "doctor_id": did},
        ]}
    else:
        return fail("Unauthorized", 403)

    cur = mongo_db.conversations.find(query).sort("updated_at", -1)
    return ok([serialize_conv(c) for c in cur])

@chat_bp.post("/chat/conversations")
@auth_required()
def create_conversation():
    """Tạo hội thoại 1–1; kiểm tra có appointment giữa 2 bên."""
    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")
    b = request.get_json(silent=True) or {}
    
    print(f"🔍 create_conversation: user={user}, role={role}, uid={uid}, body={b}")

    now = datetime.utcnow()
    title = b.get("title") or "Hội thoại"
    req_mode = (b.get("mode") or "patient").lower()
    
    # Normalize mode: "doctor" from FE means "patient" mode (1-1 chat)
    if req_mode in ("doctor", "patient-doctor", "1-1"):
        req_mode = "patient"

    if role == "patient":
        pid = resolve_patient_oid_from_token(uid)
        print(f"🔍 Patient: uid={uid}, resolved pid={pid}, req_mode={req_mode}")
        if not pid:
            return fail("Không tìm thấy hồ sơ bệnh nhân từ token", 400)

        if req_mode == "ai":
            doc = {
                "mode": "ai",
                "patient_id": pid,
                "doctor_id": None,
                "title": title or "Chat với AI",
                "created_at": now, "updated_at": now, "last_message": ""
            }
            ins = mongo_db.conversations.insert_one(doc)
            doc["_id"] = ins.inserted_id
            return ok(serialize_conv(doc), 201)

        # Mode "patient" = 1-1 chat với doctor
        d_raw = b.get("doctor_id")
        if not d_raw:
            return fail("Thiếu doctor_id", 400)
        try:
            did = ObjectId(d_raw)
        except Exception:
            return fail("doctor_id không hợp lệ", 400)

        # ✅ Check appointment và đảm bảo đã được bác sĩ xác nhận
        appt = mongo_db.appointments.find_one({"patient_id": pid, "doctor_id": did})
        print(f"🔍 Check appointment: patient_id={pid}, doctor_id={did}, found={appt is not None}")
        if not appt:
            return fail("Bạn chưa có lịch hẹn với bác sĩ này", 403)
        
        # ✅ Kiểm tra bác sĩ đã xác nhận lịch hẹn chưa
        if not appt.get("is_confirmed"):
            return fail("Bác sĩ chưa xác nhận lịch hẹn. Vui lòng chờ bác sĩ xác nhận trước khi nhắn tin.", 403)

        existed = mongo_db.conversations.find_one({
            "mode": "patient", "patient_id": pid, "doctor_id": did
        })
        if existed:
            return ok(serialize_conv(existed))

        doc = {
            "mode": "patient",
            "patient_id": pid,
            "doctor_id": did,
            "title": title or "Chat với bác sĩ",
            "created_at": now, "updated_at": now, "last_message": ""
        }
        ins = mongo_db.conversations.insert_one(doc)
        doc["_id"] = ins.inserted_id
        return ok(serialize_conv(doc), 201)

    elif role == "doctor":
        did = resolve_doctor_oid_from_token(uid)
        if not did:
            return fail("Không tìm thấy thông tin bác sĩ", 404)

        if req_mode == "ai":
            doc = {
                "mode": "ai",
                "patient_id": None,
                "doctor_id": did,
                "title": title or "Chat với AI",
                "created_at": now, "updated_at": now, "last_message": ""
            }
            ins = mongo_db.conversations.insert_one(doc)
            doc["_id"] = ins.inserted_id
            return ok(serialize_conv(doc), 201)

        p_raw = b.get("patient_id")
        if not p_raw:
            return fail("Thiếu patient_id", 400)
        try:
            pid = ObjectId(p_raw)
        except Exception:
            return fail("patient_id không hợp lệ", 400)

        appt = mongo_db.appointments.find_one({"patient_id": pid, "doctor_id": did})
        if not appt:
            return fail("Bệnh nhân này chưa đặt lịch với bạn", 403)

        existed = mongo_db.conversations.find_one({
            "mode": "patient", "patient_id": pid, "doctor_id": did
        })
        if existed:
            return ok(serialize_conv(existed))

        doc = {
            "mode": "patient",
            "patient_id": pid,
            "doctor_id": did,
            "title": title or "Chat với bệnh nhân",
            "created_at": now, "updated_at": now, "last_message": ""
        }
        ins = mongo_db.conversations.insert_one(doc)
        doc["_id"] = ins.inserted_id
        return ok(serialize_conv(doc), 201)

    return fail("Unauthorized", 403)

@chat_bp.get("/chat/conversations/<conv_id>")
@auth_required()
def get_conversation(conv_id):
    """Xem chi tiết hội thoại (chỉ 2 bên hợp lệ)."""
    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")

    _id = to_oid(conv_id)
    if not _id:
        return fail("conv_id không hợp lệ", 400)

    conv = mongo_db.conversations.find_one({"_id": _id})
    if not conv:
        return fail("Không tìm thấy hội thoại", 404)

    # ✅ Debug logging
    print(f"🔍 [get_conversation] User: role={role}, uid={uid}")
    print(f"🔍 [get_conversation] Conversation: patient_id={conv.get('patient_id')}, doctor_id={conv.get('doctor_id')}, mode={conv.get('mode')}")
    
    can_access = can_access_conversation(conv, role, uid)
    print(f"🔍 [get_conversation] Can access: {can_access}")
    
    if not can_access:
        return fail("Không có quyền truy cập", 403)

    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 50))

    msgs = list(
        mongo_db.messages.find({"conversation_id": _id})
        .sort("created_at", 1)
        .skip(offset)
        .limit(limit)
    )

    out = []
    for m in msgs:
        ts = m.get("created_at") or m.get("timestamp")
        timestamp_str = ts.isoformat() + "Z" if isinstance(ts, datetime) else ts
        out.append({
            "id": str(m.get("_id")),
            "role": normalize_role(m),
            "text": m.get("text") or m.get("message") or "",
            "timestamp": timestamp_str,
            "file_url": m.get("file_url"),
            "file_name": m.get("file_name"),
            "file_type": m.get("file_type"),
            "is_read": m.get("is_read", False),
        })

    return ok({**serialize_conv(conv), "messages": out})

@chat_bp.delete("/chat/conversations/<conv_id>")
@auth_required()
def delete_conversation(conv_id):
    """Xóa hội thoại (chỉ chủ thể hợp lệ)."""
    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")

    _id = to_oid(conv_id)
    if not _id:
        return fail("conv_id không hợp lệ", 400)

    conv = mongo_db.conversations.find_one({"_id": _id})
    if not conv:
        return fail("Không tìm thấy hội thoại", 404)

    if not can_access_conversation(conv, role, uid):
        return fail("Không có quyền xóa", 403)

    if conv.get("mode") == "ai":
        try:
            from app.services.gemini_service import clear_chat_session
            clear_chat_session(conv_id)
        except Exception:
            pass

    mongo_db.messages.delete_many({"conversation_id": _id})
    mongo_db.conversations.delete_one({"_id": _id})

    payload = {"conversation_id": conv_id, "deleted_by": uid}
    socketio.emit("conversation_deleted", payload, room=f"room:{conv_id}")
    socketio.emit("conversation_deleted", payload)

    return ok({"deleted": True})

# ========= REST: Messages =========

@chat_bp.post("/chat/messages")
@auth_required()
def post_message():
    """Gửi tin nhắn – chỉ 2 bên trong hội thoại. Hỗ trợ text và file attachments."""
    b = request.get_json(silent=True) or {}
    conv_any = b.get("conversation_id") or b.get("conv_id") or b.get("convId")
    raw_text = b.get("content") or b.get("message") or b.get("text") or ""

    if not conv_any:
        return fail("Missing conversation_id/conv_id", 400)
    try:
        conv_oid = ObjectId(conv_any)
    except Exception:
        return fail("Invalid conversation_id", 400)

    conv = mongo_db.conversations.find_one({"_id": conv_oid})
    if not conv:
        return fail("Conversation not found", 404)

    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")
    if not can_access_conversation(conv, role, uid):
        return fail("Không có quyền gửi tin nhắn", 403)

    # Extract file attachment info if provided
    file_url = b.get("file_url")
    file_name = b.get("file_name")
    file_type = b.get("file_type")
    
    # Message must have either text or file
    # ✅ Keep text as-is, only remove leading/trailing whitespace
    if isinstance(raw_text, str):
        text = raw_text.strip()
    else:
        text = ""
    if not text and not file_url:
        return fail("Message must have text or file attachment", 400)

    now = datetime.utcnow()
    message_doc = {
        "conversation_id": conv_oid,
        "sender": role,
        "text": text or "[File đính kèm]",
        "created_at": now,
        "is_read": (role == "doctor"),
    }
    
    # Add file info if present
    if file_url:
        message_doc["file_url"] = file_url
        message_doc["file_name"] = file_name or "file"
        message_doc["file_type"] = file_type or "application/octet-stream"
    
    ins = mongo_db.messages.insert_one(message_doc)
    
    # Update conversation last_message
    last_msg_preview = text if text else f"[{file_name or 'File đính kèm'}]"
    mongo_db.conversations.update_one(
        {"_id": conv_oid},
        {"$set": {"updated_at": now, "last_message": last_msg_preview}},
        upsert=True,
    )

    payload = {
        "conversation_id": str(conv_oid),
        "sender": role,
        "text": text or "[File đính kèm]",
        "timestamp": now.isoformat() + "Z",
        "message_id": str(ins.inserted_id),
    }
    
    # Add file info to payload if present
    if file_url:
        payload["file_url"] = file_url
        payload["file_name"] = file_name
        payload["file_type"] = file_type
    
    room = f"room:{str(conv_oid)}"
    socketio.emit("receive_message", payload, room=room)
    socketio.emit("new_message", payload)
    
    # ✅ Send notification to patient when doctor sends message
    if role == "doctor" and conv.get("patient_id"):
        try:
            from app.services.notification_service import NotificationService
            from app.utils.doctor_helpers import get_doctor_oid_from_user_id
            
            # Get doctor info
            doctor_oid = get_doctor_oid_from_user_id(str(uid))
            doctor = mongo_db.doctors.find_one({"_id": doctor_oid}) if doctor_oid else None
            doctor_name = doctor.get("full_name", "Bác sĩ") if doctor else user.get("name", "Bác sĩ")
            
            # Create message preview
            msg_preview = text if text else f"[{file_name or 'File đính kèm'}]"
            
            # Send notification
            NotificationService.send_new_message_to_patient(
                patient_id=conv["patient_id"],
                doctor_name=doctor_name,
                message_preview=msg_preview,
                conversation_id=conv_oid
            )
            
            # Emit socket event for realtime notification
            socketio.emit("new_notification", {
                "type": "new_message",
                "title": "Tin nhắn mới từ bác sĩ",
                "message": f"Bác sĩ {doctor_name}: {msg_preview[:50]}{'...' if len(msg_preview) > 50 else ''}",
                "doctor_name": doctor_name,
                "conversation_id": str(conv_oid)
            }, room=f"patient_{str(conv['patient_id'])}")
            
            print(f"✅ Notification sent to patient {conv['patient_id']}")
        except Exception as e:
            print(f"⚠️ Failed to send notification to patient: {e}")

    response_data = {
        "ok": True,
        "message_id": str(ins.inserted_id),
        "conversation_id": str(conv_oid),
        "sender": role,
        "text": text or "[File đính kèm]",
        "timestamp": now.isoformat() + "Z",
    }
    
    # Add file info to response if present
    if file_url:
        response_data["file_url"] = file_url
        response_data["file_name"] = file_name
        response_data["file_type"] = file_type
    
    return success(data=response_data, status_code=201)

@chat_bp.post("/chat/conversations/<conv_id>/messages")
@auth_required()
def post_message_to_conversation(conv_id):
    """Gửi tin nhắn vào conv cụ thể – chỉ 2 bên. Hỗ trợ text và file attachments."""
    try:
        conv_oid = ObjectId(conv_id)
    except Exception:
        return fail("Invalid conversation_id", 400)

    conv = mongo_db.conversations.find_one({"_id": conv_oid})
    if not conv:
        return fail("Conversation not found", 404)

    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")
    if not can_access_conversation(conv, role, uid):
        return fail("Không có quyền gửi tin nhắn", 403)

    b = request.get_json(silent=True) or {}
    raw_text = b.get("content") or b.get("message") or b.get("text") or ""
    
    # Extract file attachment info if provided
    file_url = b.get("file_url")
    file_name = b.get("file_name")
    file_type = b.get("file_type")
    
    # Message must have either text or file
    # ✅ Keep text as-is, only remove leading/trailing whitespace
    if isinstance(raw_text, str):
        text = raw_text.strip()
    else:
        text = ""
    if not text and not file_url:
        return fail("Message must have text or file attachment", 400)

    now = datetime.utcnow()
    message_doc = {
        "conversation_id": conv_oid,
        "sender": role,
        "text": text or "[File đính kèm]",
        "created_at": now,
        "is_read": (role == "doctor"),
    }
    
    # Add file info if present
    if file_url:
        message_doc["file_url"] = file_url
        message_doc["file_name"] = file_name or "file"
        message_doc["file_type"] = file_type or "application/octet-stream"
    
    ins = mongo_db.messages.insert_one(message_doc)
    
    # Update conversation last_message
    last_msg_preview = text if text else f"[{file_name or 'File đính kèm'}]"
    mongo_db.conversations.update_one(
        {"_id": conv_oid},
        {"$set": {"updated_at": now, "last_message": last_msg_preview}},
        upsert=True,
    )

    payload = {
        "conversation_id": conv_id,
        "sender": role,
        "text": text or "[File đính kèm]",
        "timestamp": now.isoformat() + "Z",
        "message_id": str(ins.inserted_id),
    }
    
    # Add file info to payload if present
    if file_url:
        payload["file_url"] = file_url
        payload["file_name"] = file_name
        payload["file_type"] = file_type
    
    room = f"room:{conv_id}"
    socketio.emit("receive_message", payload, room=room)
    socketio.emit("new_message", payload)
    
    # ✅ Send notification to patient when doctor sends message
    if role == "doctor" and conv.get("patient_id"):
        try:
            from app.services.notification_service import NotificationService
            from app.utils.doctor_helpers import get_doctor_oid_from_user_id
            
            # Get doctor info
            doctor_oid = get_doctor_oid_from_user_id(str(uid))
            doctor = mongo_db.doctors.find_one({"_id": doctor_oid}) if doctor_oid else None
            doctor_name = doctor.get("full_name", "Bác sĩ") if doctor else user.get("name", "Bác sĩ")
            
            # Create message preview
            msg_preview = text if text else f"[{file_name or 'File đính kèm'}]"
            
            # Send notification
            NotificationService.send_new_message_to_patient(
                patient_id=conv["patient_id"],
                doctor_name=doctor_name,
                message_preview=msg_preview,
                conversation_id=conv_oid
            )
            
            # Emit socket event for realtime notification
            socketio.emit("new_notification", {
                "type": "new_message",
                "title": "Tin nhắn mới từ bác sĩ",
                "message": f"Bác sĩ {doctor_name}: {msg_preview[:50]}{'...' if len(msg_preview) > 50 else ''}",
                "doctor_name": doctor_name,
                "conversation_id": str(conv_oid)
            }, room=f"patient_{str(conv['patient_id'])}")
            
            print(f"✅ Notification sent to patient {conv['patient_id']}")
        except Exception as e:
            print(f"⚠️ Failed to send notification to patient: {e}")
    
    # ✅ Send notification to doctor when patient sends message
    if role == "patient" and conv.get("doctor_id"):
        try:
            from app.services.notification_service import NotificationService
            
            # Get patient info
            patient = mongo_db.patients.find_one({"_id": conv["patient_id"]})
            if not patient:
                patient = mongo_db.users.find_one({"_id": conv["patient_id"]})
            
            patient_name = patient.get("full_name") or patient.get("name", "Bệnh nhân") if patient else "Bệnh nhân"
            
            # Create message preview
            msg_preview = text if text else f"[{file_name or 'File đính kèm'}]"
            
            # Send notification
            NotificationService.send_new_message_to_doctor(
                doctor_id=conv["doctor_id"],
                patient_name=patient_name,
                message_preview=msg_preview,
                conversation_id=conv_oid
            )
            
            # Emit socket event for realtime notification
            socketio.emit("new_notification", {
                "type": "new_message",
                "title": "Tin nhắn mới từ bệnh nhân",
                "message": f"{patient_name}: {msg_preview[:50]}{'...' if len(msg_preview) > 50 else ''}",
                "patient_name": patient_name,
                "conversation_id": str(conv_oid)
            }, room=f"doctor_{str(conv['doctor_id'])}")
            
            print(f"✅ Notification sent to doctor {conv['doctor_id']}")
        except Exception as e:
            print(f"⚠️ Failed to send notification to doctor: {e}")

    response_data = {
        "message_id": str(ins.inserted_id),
        "conversation_id": conv_id,
        "sender": role,
        "text": text or "[File đính kèm]",
        "timestamp": now.isoformat() + "Z",
    }
    
    # Add file info to response if present
    if file_url:
        response_data["file_url"] = file_url
        response_data["file_name"] = file_name
        response_data["file_type"] = file_type
    
    return success(data=response_data, status_code=201)

# ========= Socket.IO: join/leave/typing =========

@socketio.on("join_room")
def on_join_room(data):
    """Client phải gửi token + conv_id; server verify quyền trước khi join."""
    try:
        conv_any = (data or {}).get("room") or (data or {}).get("conv_id") or (data or {}).get("conversation_id")
        token = (data or {}).get("token")
        if not conv_any or not token:
            return

        # Cho phép token dạng "Bearer x.y.z"
        if isinstance(token, str) and token.lower().startswith("bearer "):
            token = token.split(" ", 1)[1].strip()

        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id") or payload.get("sub")
        role = (payload.get("role") or "").lower()
        if not user_id or role not in ("patient", "doctor"):
            return

        try:
            conv_oid = ObjectId(conv_any)
        except Exception:
            return
        conv = mongo_db.conversations.find_one({"_id": conv_oid})
        if not conv:
            return

        # Khóa cổng theo đúng cặp & phải có appointment (đã enforce khi tạo conv)
        if role == "patient":
            patient = mongo_db.patients.find_one({"_id": ObjectId(user_id)}) or \
                      mongo_db.patients.find_one({"user_id": ObjectId(user_id)})
            if not patient:
                return
            if str(conv.get("patient_id")) != str(patient["_id"]):
                return
            if conv.get("doctor_id"):
                has_appt = mongo_db.appointments.find_one({
                    "patient_id": patient["_id"], "doctor_id": conv["doctor_id"]
                })
                if not has_appt:
                    return
        elif role == "doctor":
            doctor = mongo_db.doctors.find_one({"user_id": ObjectId(user_id)})
            if not doctor:
                return
            if str(conv.get("doctor_id")) != str(doctor["_id"]):
                return
            if conv.get("patient_id"):
                has_appt = mongo_db.appointments.find_one({
                    "patient_id": conv["patient_id"], "doctor_id": doctor["_id"]
                })
                if not has_appt:
                    return

        join_room(f"room:{conv_any}")
        print(f"✅ socket join room:{conv_any} by {role}:{user_id}")

    except jwt.ExpiredSignatureError:
        print("⚠️ join_room: token expired")
    except jwt.InvalidTokenError as e:
        print(f"⚠️ join_room: invalid token: {e}")
    except Exception as e:
        print(f"⚠️ join_room auth error: {e}")

@socketio.on("leave_room")
def on_leave_room(data):
    room = (data or {}).get("room") or (data or {}).get("conv_id") or (data or {}).get("conversation_id")
    if not room:
        return
    leave_room(f"room:{room}")
    print(f"👋 left room:{room}")

@chat_bp.delete("/chat/messages/<message_id>")
@auth_required()
def delete_message(message_id):
    """Xóa tin nhắn riêng lẻ - chỉ người gửi mới có quyền xóa"""
    user = g.current_user
    role = (user.get("role") or "").lower()
    uid = user.get("user_id")
    
    _id = to_oid(message_id)
    if not _id:
        return fail("message_id không hợp lệ", 400)
    
    # Find message
    msg = mongo_db.messages.find_one({"_id": _id})
    if not msg:
        return fail("Tin nhắn không tồn tại", 404)
    
    # Check if message belongs to user
    if msg.get("sender") != role:
        return fail("Không có quyền xóa tin nhắn này", 403)
    
    # Get conversation to check access
    conv_id = msg.get("conversation_id")
    conv = mongo_db.conversations.find_one({"_id": conv_id})
    if not conv:
        return fail("Cuộc trò chuyện không tồn tại", 404)
    
    if not can_access_conversation(conv, role, uid):
        return fail("Không có quyền xóa tin nhắn", 403)
    
    # Delete message
    mongo_db.messages.delete_one({"_id": _id})
    
    # Emit socket event for real-time update
    payload = {
        "message_id": str(_id),
        "conversation_id": str(conv_id),
        "deleted_by": uid
    }
    socketio.emit("message_deleted", payload, room=f"room:{str(conv_id)}")
    socketio.emit("message_deleted", payload)
    
    return ok({"deleted": True, "message_id": str(_id)})


@socketio.on("typing")
def on_typing(data):
    conv_id = (data or {}).get("conv_id")
    sender = (data or {}).get("sender")
    if conv_id:
        emit("typing", {"conv_id": conv_id, "sender": sender}, to=f"room:{conv_id}")
