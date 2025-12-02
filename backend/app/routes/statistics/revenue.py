# backend/app/routes/statistics/revenue.py
"""
API thống kê Doanh thu

Endpoint: GET /statistics/revenue
Mô tả: Phân tích doanh thu theo loại dịch vụ, chuyên khoa

Dữ liệu trả về:
- Tổng quan: Tổng DT, tăng trưởng, TB/ngày, loại DV hàng đầu
- Theo loại dịch vụ: Khám, X-quang, phẫu thuật, ...
- Theo chuyên khoa: Tim mạch, Nhi, Nội, ...
- Doanh thu hàng ngày trong kỳ
- Phương thức thanh toán

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify
from flask_cors import cross_origin
from datetime import timedelta
from app.extensions import mongo_db
from . import statistics_bp
from .utils import (
    get_date_range, calculate_growth_rate, get_previous_period, SERVICE_PRICES
)


@statistics_bp.route("/statistics/revenue", methods=["GET"])
@cross_origin(supports_credentials=True, origins=["http://localhost:3000"])
def get_revenue_statistics():
    """
    API thống kê Doanh thu chi tiết
    
    Query params:
        - start_date (tùy chọn, YYYY-MM-DD): Mặc định 30 ngày trước
        - end_date (tùy chọn, YYYY-MM-DD): Mặc định hôm nay
    
    Returns:
        JSON: {
            "summary": {
                "totalRevenue": int,              // Tổng doanh thu (VND)
                "revenueGrowth": float,           // % tăng trưởng
                "avgRevenuePerDay": float,        // DT trung bình/ngày
                "topServiceType": str             // Loại DV hàng đầu
            },
            "byServiceType": [{
                "serviceType": str,               // Loại dịch vụ
                "revenue": int,                   // Doanh thu
                "count": int,                     // Số lượt
                "avgPrice": float,                // Giá TB
                "percentage": float               // % tổng DT
            }],
            "bySpecialty": [{
                "specialty": str,                 // Chuyên khoa
                "revenue": int,                   // Doanh thu
                "count": int                      // Số ca
            }],
            "dailyRevenue": [{
                "date": str,                      // Ngày
                "revenue": int,                   // Doanh thu
                "appointments": int               // Số lượt khám
            }],
            "paymentMethods": [{
                "method": str,                    // Phương thức
                "amount": int,                    // Số tiền
                "percentage": float               // % tổng
            }]
        }
    """
    try:
        # Lấy khoảng thời gian
        start_date, end_date = get_date_range(
            request.args.get("start_date"),
            request.args.get("end_date")
        )
        
        # Lấy kỳ trước để so sánh
        prev_start, prev_end = get_previous_period(start_date, end_date)
        period_days = (end_date - start_date).days
        
        # ============================================================
        # 1. LẤY DỮ LIỆU HẸN KHÁM
        # ============================================================
        
        # Hẹn khám kỳ hiện tại (đã hoàn thành)
        current_appointments = list(mongo_db.appointments.find({
            "created_at": {"$gte": start_date, "$lt": end_date},
            "status": "completed"
        }))
        
        # Hẹn khám kỳ trước
        prev_appointments = list(mongo_db.appointments.find({
            "created_at": {"$gte": prev_start, "$lt": prev_end},
            "status": "completed"
        }))
        
        # ============================================================
        # 2. TÍNH DOANH THU THEO LOẠI DỊCH VỤ
        # ============================================================
        
        service_revenue = {}
        total_revenue = 0
        
        for appt in current_appointments:
            service_type = appt.get("service_type", "consultation")
            price = SERVICE_PRICES.get(service_type, SERVICE_PRICES["consultation"])
            
            if service_type not in service_revenue:
                service_revenue[service_type] = {"count": 0, "revenue": 0}
            
            service_revenue[service_type]["count"] += 1
            service_revenue[service_type]["revenue"] += price
            total_revenue += price
        
        # ============================================================
        # 3. THỐNG KÊ TỔNG QUAN
        # ============================================================
        
        # Doanh thu kỳ trước
        prev_revenue = len(prev_appointments) * SERVICE_PRICES["consultation"]
        revenue_growth = calculate_growth_rate(total_revenue, prev_revenue)
        
        # Doanh thu trung bình mỗi ngày
        avg_revenue_per_day = total_revenue / period_days if period_days > 0 else 0
        
        # Loại dịch vụ có doanh thu cao nhất
        top_service = max(
            service_revenue.items(), 
            key=lambda x: x[1]["revenue"]
        )[0] if service_revenue else "consultation"
        
        # ============================================================
        # 4. DOANH THU THEO LOẠI DỊCH VỤ (Chi tiết)
        # ============================================================
        
        by_service_type = []
        for service, data in service_revenue.items():
            percentage = (data["revenue"] / total_revenue * 100) if total_revenue > 0 else 0
            avg_price = data["revenue"] / data["count"] if data["count"] > 0 else 0
            
            # Map tên tiếng Việt
            service_names = {
                "consultation": "Khám tư vấn",
                "checkup": "Khám sức khỏe",
                "followup": "Tái khám",
                "emergency": "Cấp cứu",
                "xray": "Chụp X-quang",
                "surgery": "Phẫu thuật"
            }
            
            by_service_type.append({
                "serviceType": service_names.get(service, service.title()),
                "revenue": data["revenue"],
                "count": data["count"],
                "avgPrice": round(avg_price, 0),
                "percentage": round(percentage, 1)
            })
        
        # Sắp xếp theo doanh thu (giảm dần)
        by_service_type.sort(key=lambda x: x["revenue"], reverse=True)
        
        # ============================================================
        # 5. DOANH THU THEO CHUYÊN KHOA
        # ============================================================
        
        specialty_pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date, "$lt": end_date},
                "status": "completed"
            }},
            {"$lookup": {
                "from": "doctors",
                "localField": "doctor_id",
                "foreignField": "_id",
                "as": "doctor_info"
            }},
            {"$unwind": "$doctor_info"},
            {"$group": {
                "_id": "$doctor_info.specialty",
                "count": {"$sum": 1}
            }}
        ]
        
        specialty_results = list(mongo_db.appointments.aggregate(specialty_pipeline))
        by_specialty = [
            {
                "specialty": r["_id"] or "Đa khoa",
                "revenue": r["count"] * SERVICE_PRICES["consultation"],
                "count": r["count"]
            }
            for r in specialty_results
        ]
        by_specialty.sort(key=lambda x: x["revenue"], reverse=True)
        
        # ============================================================
        # 6. DOANH THU HÀNG NGÀY
        # ============================================================
        
        daily_map = {}
        for appt in current_appointments:
            day = appt["created_at"].strftime("%Y-%m-%d")
            service_type = appt.get("service_type", "consultation")
            price = SERVICE_PRICES.get(service_type, SERVICE_PRICES["consultation"])
            
            if day not in daily_map:
                daily_map[day] = {"revenue": 0, "count": 0}
            
            daily_map[day]["revenue"] += price
            daily_map[day]["count"] += 1
        
        # Tạo danh sách đầy đủ (bao gồm cả ngày không có doanh thu)
        daily_revenue = []
        for i in range(period_days):
            day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            data = daily_map.get(day, {"revenue": 0, "count": 0})
            daily_revenue.append({
                "date": day,
                "revenue": data["revenue"],
                "appointments": data["count"]
            })
        
        # ============================================================
        # 7. PHƯƠNG THỨC THANH TOÁN (Mock data)
        # ============================================================
        # TODO: Lấy từ database khi có bảng payments
        
        payment_methods = [
            {
                "method": "Tiền mặt",
                "amount": int(total_revenue * 0.6),
                "percentage": 60
            },
            {
                "method": "Chuyển khoản",
                "amount": int(total_revenue * 0.3),
                "percentage": 30
            },
            {
                "method": "Thẻ ATM/Visa",
                "amount": int(total_revenue * 0.1),
                "percentage": 10
            }
        ]
        
        # ============================================================
        # TRẢ VỀ KẾT QUẢ
        # ============================================================
        
        # Map tên tiếng Việt cho top service
        service_names_map = {
            "consultation": "Khám tư vấn",
            "checkup": "Khám sức khỏe",
            "followup": "Tái khám",
            "emergency": "Cấp cứu",
            "xray": "Chụp X-quang",
            "surgery": "Phẫu thuật"
        }
        
        return jsonify({
            "summary": {
                "totalRevenue": total_revenue,
                "revenueGrowth": round(revenue_growth, 1),
                "avgRevenuePerDay": round(avg_revenue_per_day, 0),
                "topServiceType": service_names_map.get(top_service, top_service.title())
            },
            "byServiceType": by_service_type,
            "bySpecialty": by_specialty,
            "dailyRevenue": daily_revenue,
            "paymentMethods": payment_methods
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong get_revenue_statistics: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
