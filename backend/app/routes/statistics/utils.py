# backend/app/routes/statistics/utils.py
"""
Các hàm tiện ích dùng chung cho module statistics

Chức năng:
- Parse date từ string
- Tính toán growth rate
- Format currency
- Các hàm helper khác

Author: Healthcare AI Team
Date: 2025-11-15
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional


def parse_date(date_str: str) -> datetime:
    """
    Chuyển đổi string date sang datetime object
    
    Args:
        date_str (str): Ngày dạng "YYYY-MM-DD"
        
    Returns:
        datetime: Datetime object (00:00:00 UTC)
        
    Example:
        >>> parse_date("2025-01-15")
        datetime(2025, 1, 15, 0, 0, 0)
    """
    return datetime.strptime(date_str, "%Y-%m-%d")


def get_date_range(start_date_str: Optional[str] = None, 
                   end_date_str: Optional[str] = None,
                   default_days: int = 30) -> Tuple[datetime, datetime]:
    """
    Lấy khoảng thời gian từ query params
    
    Args:
        start_date_str (str, optional): Ngày bắt đầu "YYYY-MM-DD"
        end_date_str (str, optional): Ngày kết thúc "YYYY-MM-DD"
        default_days (int): Số ngày mặc định nếu không có start_date
        
    Returns:
        Tuple[datetime, datetime]: (start_date, end_date)
        
    Example:
        >>> get_date_range(None, "2025-01-15")
        (datetime(2024, 12, 16, 0, 0, 0), datetime(2025, 1, 15, 0, 0, 0))
    """
    if end_date_str:
        end_date = parse_date(end_date_str)
    else:
        end_date = datetime.utcnow()
    
    if start_date_str:
        start_date = parse_date(start_date_str)
    else:
        start_date = end_date - timedelta(days=default_days)
    
    return start_date, end_date


def calculate_growth_rate(current: float, previous: float) -> float:
    """
    Tính tỷ lệ tăng trưởng (%)
    
    Args:
        current (float): Giá trị hiện tại
        previous (float): Giá trị kỳ trước
        
    Returns:
        float: Tỷ lệ tăng trưởng (%)
        
    Example:
        >>> calculate_growth_rate(120, 100)
        20.0
        >>> calculate_growth_rate(80, 100)
        -20.0
    """
    if previous == 0:
        return 0.0
    return ((current - previous) / previous) * 100


def get_previous_period(start_date: datetime, end_date: datetime) -> Tuple[datetime, datetime]:
    """
    Lấy khoảng thời gian kỳ trước (để so sánh)
    
    Args:
        start_date (datetime): Ngày bắt đầu kỳ hiện tại
        end_date (datetime): Ngày kết thúc kỳ hiện tại
        
    Returns:
        Tuple[datetime, datetime]: (prev_start, prev_end)
        
    Example:
        >>> get_previous_period(datetime(2025, 1, 1), datetime(2025, 1, 31))
        (datetime(2024, 12, 1), datetime(2025, 1, 1))
    """
    period_days = (end_date - start_date).days
    prev_start = start_date - timedelta(days=period_days)
    prev_end = start_date
    return prev_start, prev_end


def format_currency(amount: float, currency: str = "VND") -> str:
    """
    Format số tiền theo định dạng tiền tệ
    
    Args:
        amount (float): Số tiền
        currency (str): Loại tiền tệ (mặc định VND)
        
    Returns:
        str: Chuỗi đã format
        
    Example:
        >>> format_currency(1000000)
        "1,000,000 VND"
    """
    return f"{int(amount):,} {currency}"


def get_month_range(months_back: int = 6) -> list:
    """
    Lấy danh sách các tháng gần đây
    
    Args:
        months_back (int): Số tháng muốn lấy
        
    Returns:
        list: Danh sách tuple (month_start, month_end, month_label)
        
    Example:
        >>> get_month_range(3)
        [(datetime(2024, 11, 1), datetime(2024, 12, 1), "T11"), ...]
    """
    now = datetime.utcnow()
    months = []
    
    for i in range(months_back - 1, -1, -1):
        # Tính tháng (xấp xỉ bằng cách trừ 30 ngày)
        month_start = datetime(now.year, now.month, 1) - timedelta(days=30 * i)
        month_end = month_start + timedelta(days=30)
        month_label = f"T{month_start.month}"
        
        months.append((month_start, month_end, month_label))
    
    return months


# Constants - Giá dịch vụ
SERVICE_PRICES = {
    "consultation": 200000,      # Khám tư vấn
    "checkup": 150000,           # Khám sức khỏe
    "followup": 100000,          # Tái khám
    "emergency": 500000,         # Cấp cứu
    "xray": 300000,              # Chụp X-quang
    "surgery": 5000000           # Phẫu thuật
}

# Constants - Trạng thái hẹn khám
APPOINTMENT_STATUS_MAP = {
    "completed": {"name": "Hoàn thành", "color": "#52c41a"},
    "confirmed": {"name": "Đã xác nhận", "color": "#1890ff"},
    "pending": {"name": "Chờ xác nhận", "color": "#faad14"},
    "cancelled": {"name": "Đã hủy", "color": "#ff4d4f"}
}

# Constants - Độ nghiêm trọng dựa trên confidence
SEVERITY_THRESHOLDS = {
    "mild": 0.5,        # < 0.5: Nhẹ
    "moderate": 0.8     # 0.5-0.8: Trung bình, >= 0.8: Nghiêm trọng
}
