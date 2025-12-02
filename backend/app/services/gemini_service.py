# backend/app/services/gemini_service.py
"""
Google Gemini API Service - High Intelligence Configuration
Sử dụng: google-genai SDK (Latest)

Cấu hình: Ưu tiên GEMINI 2.5 PRO.
Tính năng:
- Auto Fallback: Nếu 2.5 chưa có, tự dùng 1.5 Pro.
- Smart Context: Nhớ 50 lượt chat gần nhất.
- Retry: Tự động thử lại khi rớt mạng.
- Hỗ trợ cả Streaming và One-shot.
"""
from __future__ import annotations
import os
import time
import socket
from typing import Optional, List, Callable

from google import genai
from google.genai import types
from bson import ObjectId

# =======================
# 1. CẤU HÌNH MODEL
# =======================
# Ưu tiên model bạn muốn dùng
TARGET_MODEL = "gemini-2.5-pro"

# Danh sách dự phòng (Backup)
FALLBACK_MODELS = [
    TARGET_MODEL,           # Ưu tiên 1
    "gemini-1.5-pro",       # Ưu tiên 2
    "gemini-1.5-pro-002",   # Ưu tiên 3
    "gemini-2.0-flash-exp", # Ưu tiên 4
]

socket.setdefaulttimeout(30)

# =======================
# 2. KHỞI TẠO CLIENT
# =======================
def _load_api_key() -> str:
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not key:
        print("❌ CRITICAL: Thiếu GEMINI_API_KEY trong file .env")
        return ""
    return key

def _build_client() -> Optional[genai.Client]:
    api_key = _load_api_key()
    if not api_key: return None
    
    print(f"🌐 Khởi động Gemini Service [Target: {TARGET_MODEL}]...")
    for attempt in range(1, 4):
        try:
            client = genai.Client(api_key=api_key)
            print("✅ Kết nối Google AI thành công.")
            return client
        except Exception as e:
            print(f"⚠️ Lỗi kết nối lần {attempt}: {e}")
            time.sleep(1)
            
    print("❌ KHÔNG THỂ KẾT NỐI GEMINI API.")
    return None

try:
    client: Optional[genai.Client] = _build_client()
except:
    client = None

# Cache session trong RAM
chat_sessions: dict[str, any] = {}

# =======================
# 3. CÁC HÀM CẤU HÌNH
# =======================
def get_generation_config(temperature: float = 0.3, max_tokens: int = 2048):
    return types.GenerateContentConfig(
        temperature=temperature,
        top_p=0.95,
        max_output_tokens=max_tokens,
    )

def get_safety_settings():
    return [
        types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_MEDIUM_AND_ABOVE"),
        types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_MEDIUM_AND_ABOVE"),
        types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_MEDIUM_AND_ABOVE"),
    ]

# =======================
# 4. LOGIC RETRY & FALLBACK
# =======================
RETRY_STATUS = {408, 409, 429, 500, 502, 503, 504}

def _with_backoff(call_fn: Callable[[str], any], *, attempts: int = 3):
    """Thử gọi API với cơ chế đổi model nếu lỗi."""
    last_exc = None
    model_idx = 0
    
    for attempt in range(1, attempts + 1):
        current_model = FALLBACK_MODELS[model_idx]
        try:
            return call_fn(current_model)
        except Exception as e:
            last_exc = e
            err_msg = str(e).lower()
            
            # Lỗi model không tồn tại -> Đổi model
            if "404" in err_msg or "not found" in err_msg or "400" in err_msg:
                print(f"⚠️ Model '{current_model}' lỗi/không có. Fallback...")
                if model_idx + 1 < len(FALLBACK_MODELS):
                    model_idx += 1
                    continue
                else:
                    break
            
            # Lỗi mạng -> Retry
            if any(str(c) in err_msg for c in RETRY_STATUS):
                time.sleep(1 * (2 ** (attempt - 1)))
                continue
                
            break
            
    print(f"❌ API Failed: {last_exc}")
    raise last_exc

# =======================
# 5. QUẢN LÝ SESSION
# =======================
def get_or_create_chat_session(conversation_id: str, system_prompt: str = None):
    if not client: return None
    if conversation_id in chat_sessions: return chat_sessions[conversation_id]

    history_sdk = []
    try:
        from app.extensions import mongo_db
        msgs = list(mongo_db.messages.find({"conversation_id": ObjectId(conversation_id)})
                    .sort("created_at", -1).limit(50))
        msgs.reverse()

        for m in msgs:
            role = "model" if (m.get("sender") or m.get("role")) in ["ai", "model"] else "user"
            text = m.get("text", "").strip()
            if text:
                history_sdk.append(types.Content(role=role, parts=[types.Part(text=text)]))
    except Exception:
        pass

    try:
        config = get_generation_config()
        if system_prompt: config.system_instruction = system_prompt
        
        # Init với model đầu tiên, nếu lỗi fallback sẽ handle lúc send
        chat = client.chats.create(
            model=FALLBACK_MODELS[0], 
            config=config, 
            history=history_sdk
        )
        chat_sessions[conversation_id] = chat
        return chat
    except:
        # Fallback init
        try:
            chat = client.chats.create(model=FALLBACK_MODELS[1], config=config, history=history_sdk)
            chat_sessions[conversation_id] = chat
            return chat
        except:
            return None

def clear_chat_session(conversation_id: str):
    if conversation_id in chat_sessions: del chat_sessions[conversation_id]

# =======================
# 6. HÀM CHÍNH (STREAMING & ONE-SHOT)
# =======================

def gemini_chat_streaming(conversation_id: str, user_prompt: str, system: str = None) -> str:
    """Chat có nhớ context (Streaming)"""
    if not user_prompt: return ""
    chat = get_or_create_chat_session(conversation_id, system_prompt=system)
    if not chat: return "⚠️ Lỗi kết nối AI."

    try:
        def _send(model_name_unused): 
            return chat.send_message_stream(user_prompt)

        resp_text = ""
        stream = _with_backoff(_send, attempts=3)
        for chunk in stream:
            if chunk.text: resp_text += chunk.text
            clean_text = resp_text.replace("**", "").replace("##", "").strip()
        return resp_text.strip()
    except Exception:
        return "Xin lỗi, hệ thống đang bận."

def gemini_chat(
    user_prompt: str,
    system: str = None,
    history: list = None,
    temperature: float = 0.5,
    max_tokens: int = 1024
) -> str:
    """
    Chat 1 lần (One-shot), không dùng session, không streaming.
    Dùng để tạo gợi ý câu hỏi (Suggestions).
    """
    if not client: return ""

    # Build contents
    contents = []
    if history:
        # Map history dict to types.Content if needed (đơn giản hóa)
        pass 
    contents.append(types.Content(role="user", parts=[types.Part(text=user_prompt)]))

    def _do_generate(model_name):
        config = get_generation_config(temperature=temperature, max_tokens=max_tokens)
        if system: config.system_instruction = system
        
        return client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config,
            safety_settings=get_safety_settings()
        )

    try:
        resp = _with_backoff(_do_generate, attempts=3)
        return resp.text.strip() if resp and resp.text else ""
    except Exception as e:
        print(f"One-shot Error: {e}")
        return ""

def analyze_xray_with_context(xray_findings: str, patient_info: str = "") -> str:
    """Phân tích X-quang chuyên sâu"""
    prompt = f"""
    PHÂN TÍCH CHUYÊN SÂU (Yêu cầu độ chính xác cao nhất):
    Dữ liệu X-quang: {xray_findings}
    Dữ liệu lâm sàng: {patient_info}
    Yêu cầu: Chẩn đoán hình ảnh, chẩn đoán phân biệt, hướng xử trí.
    """
    if not client: return "Lỗi kết nối."

    def _do_gen(model_name):
        return client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=get_generation_config(temperature=0.2),
            safety_settings=get_safety_settings()
        )

    try:
        resp = _with_backoff(_do_gen, attempts=3)
        return resp.text.strip() if resp else "Không có kết quả."
    except Exception as e:
        return f"Không thể phân tích: {str(e)}"

# =======================
# EXPORTS
# =======================
__all__ = [
    "gemini_chat_streaming", 
    "gemini_chat",  # <-- Đã thêm hàm này vào exports
    "analyze_xray_with_context", 
    "clear_chat_session"
]