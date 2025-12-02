# backend/run.py
from app.main import create_app, socketio
from app.model.appointments import AppointmentModel
from app.tasks.expire_hold import init_scheduler

app = create_app()

# Khởi tạo database indexes
with app.app_context():
    print("🔧 Initializing database indexes...")
    AppointmentModel.ensure_indexes()
    print("✅ Database indexes initialized\n")

# Khởi động background scheduler
print("🚀 Starting background scheduler...")
scheduler = init_scheduler()

# Setup SocketIO
socketio.init_app(
    app,
    async_mode="threading",
    cors_allowed_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_upgrades=False,
    ping_interval=25,
    ping_timeout=20,
)

if __name__ == "__main__":
    try:
        print("🚀 Starting Flask server on http://127.0.0.1:8000")
        print("="*60)
        socketio.run(
            app, 
            host="127.0.0.1", 
            port=8000, 
            debug=True,
            use_reloader=False  
        )
    except (KeyboardInterrupt, SystemExit):
        print("\n🛑 Shutting down scheduler...")
        scheduler.shutdown()
        print("✅ Scheduler stopped")