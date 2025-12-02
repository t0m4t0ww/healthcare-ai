# backend/app/routes/statistics/__init__.py
"""
Module quản lý các API thống kê cho hệ thống Healthcare AI

"""

from flask import Blueprint

# Khởi tạo Blueprint chính cho statistics
# Blueprint này sẽ được export ra ngoài với tên report_bp để tương thích
statistics_bp = Blueprint("statistics", __name__)

# Import các routes con sau khi blueprint đã được tạo
# Điều này tránh circular import
def init_routes():
    """
    Khởi tạo tất cả các routes cho statistics module
    Hàm này được gọi sau khi blueprint đã được tạo
    """
    # Import để register routes vào blueprint
    # Các module này sẽ tự động register routes vào statistics_bp
    from . import dashboard  # noqa: F401
    from . import patients  # noqa: F401
    from . import doctors  # noqa: F401
    from . import revenue  # noqa: F401
    from . import xray_reports  # noqa: F401
    from . import export  # noqa: F401
    
    print("✅ Statistics routes đã được load thành công!")
    return True

# Tự động khởi tạo routes khi module được import
init_routes()
