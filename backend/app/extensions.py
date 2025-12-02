# backend/app/extensions.py
from flask_cors import CORS
from pymongo import MongoClient
from flask_socketio import SocketIO

# MongoDB
mongo_client = MongoClient("mongodb://127.0.0.1:27017/")
mongo_db = mongo_client["healthcare_db"]

# ✅ Socket.IO - SINGLE INSTANCE
socketio = SocketIO(
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    async_mode="eventlet",  # PHẢI DÙNG eventlet vì có monkey_patch
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
)