# backend/app/routes/report.py
"""
Route chính cho Statistics APIs - File Wrapper


"""

# Import blueprint từ statistics module
# Tất cả routes đã được tự động register trong statistics/__init__.py
from .statistics import statistics_bp

# Export blueprint với tên report_bp để tương thích với code cũ
report_bp = statistics_bp

# Thông báo khi module được import thành công
print("✅ Statistics API module loaded successfully!")
print("📊 Available endpoints:")
print("   • GET /statistics/dashboard")
print("   • GET /statistics/patients")  
print("   • GET /statistics/doctors/performance")
print("   • GET /statistics/revenue")
print("   • GET /report/statistics")
print("   • GET /export/<report_type>")
