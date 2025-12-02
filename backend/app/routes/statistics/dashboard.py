# backend/app/routes/statistics/dashboard.py
"""
API thống kê Dashboard cho Admin

Endpoint: GET /statistics/dashboard
Mô tả: Cung cấp thống kê tổng quan cho admin dashboard

Dữ liệu trả về:
- Tổng quan: Doanh thu, Hẹn khám, Bệnh nhân mới
- Doanh thu theo tháng (6 tháng gần nhất)
- Phân bố hẹn khám theo trạng thái
- Thống kê theo chuyên khoa
- Top bác sĩ xuất sắc

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify
from flask_cors import cross_origin
from app.extensions import mongo_db
from app.services.redis_cache import cache
from . import statistics_bp
from .utils import (
    get_date_range, calculate_growth_rate, get_previous_period,
    get_month_range, SERVICE_PRICES, APPOINTMENT_STATUS_MAP
)

# Specialty name mapping (Vietnamese)
SPECIALTY_NAMES = {
    "general_medicine": "Nội tổng quát",
    "obstetrics": "Sản phụ khoa",
    "pediatrics": "Nhi khoa",
    "cardiology": "Tim mạch",
    "dermatology": "Da liễu",
    "neurology": "Thần kinh",
    "orthopedics": "Chấn thương chỉnh hình",
    "ophthalmology": "Mắt",
    "ent": "Tai mũi họng",
    "dentistry": "Nha khoa",
    "psychiatry": "Tâm thần",
    "surgery": "Phẫu thuật",
    "urology": "Tiết niệu",
    "gastroenterology": "Tiêu hóa",
    "pulmonology": "Hô hấp",
    "endocrinology": "Nội tiết",
    "rheumatology": "Khớp",
    "oncology": "Ung bướu",
    "radiology": "Chẩn đoán hình ảnh",
    "anesthesiology": "Gây mê hồi sức",
}


@statistics_bp.route("/statistics/dashboard", methods=["GET"])
@cross_origin(supports_credentials=True, origins=["http://localhost:3000"])
def get_dashboard_statistics():
    """
    API thống kê Dashboard tổng quan
    
    Query params:
        - start_date (tùy chọn, YYYY-MM-DD): Mặc định 30 ngày trước
        - end_date (tùy chọn, YYYY-MM-DD): Mặc định hôm nay
    
    Returns:
        JSON: {
            "summary": {
                "totalRevenue": int,           // Tổng doanh thu (VND)
                "revenueGrowth": float,        // % tăng trưởng doanh thu
                "totalAppointments": int,      // Tổng số hẹn khám
                "appointmentGrowth": float,    // % tăng trưởng hẹn khám
                "newPatients": int,            // Số bệnh nhân mới
                "patientsGrowth": float,       // % tăng trưởng bệnh nhân
                "completionRate": float        // Tỷ lệ hoàn thành (%)
            },
            "revenueByMonth": [...],           // Doanh thu 6 tháng
            "appointmentsByStatus": [...],     // Phân bố theo trạng thái
            "appointmentsBySpecialization": [...], // Theo chuyên khoa
            "topDoctors": [...]                // Top 5 bác sĩ
        }
    """
    try:
        # Lấy khoảng thời gian
        start_date, end_date = get_date_range(
            request.args.get("start_date"),
            request.args.get("end_date")
        )
        
        # Generate cache key based on date range
        cache_key = f"dashboard_stats:{start_date.isoformat()}:{end_date.isoformat()}"
        
        # Try to get from cache first (cache for 5 minutes)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return jsonify(cached_data)
        
        # Lấy kỳ trước để so sánh
        prev_start, prev_end = get_previous_period(start_date, end_date)
        
        # ============================================================
        # 1. THỐNG KÊ TỔNG QUAN (SUMMARY)
        # ============================================================
        
        # Lấy tất cả hẹn khám trong kỳ hiện tại
        current_appointments = list(mongo_db.appointments.find({
            "created_at": {"$gte": start_date, "$lt": end_date}
        }))
        
        # Lấy hẹn khám kỳ trước
        prev_appointments = list(mongo_db.appointments.find({
            "created_at": {"$gte": prev_start, "$lt": prev_end}
        }))
        
        # Tổng số hẹn khám
        total_appointments = len(current_appointments)
        prev_total = len(prev_appointments)
        appointment_growth = calculate_growth_rate(total_appointments, prev_total)
        
        # Hẹn khám đã hoàn thành
        completed = len([a for a in current_appointments if a.get("status") == "completed"])
        completion_rate = (completed / total_appointments * 100) if total_appointments > 0 else 0
        
        # Tính doanh thu (giá mỗi lượt khám: 200,000 VND)
        PRICE_PER_APPOINTMENT = SERVICE_PRICES["consultation"]
        total_revenue = completed * PRICE_PER_APPOINTMENT
        prev_completed = len([a for a in prev_appointments if a.get("status") == "completed"])
        prev_revenue = prev_completed * PRICE_PER_APPOINTMENT
        revenue_growth = calculate_growth_rate(total_revenue, prev_revenue)
        
        # Bệnh nhân mới
        current_patients = mongo_db.patients.count_documents({
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        prev_patients = mongo_db.patients.count_documents({
            "created_at": {"$gte": prev_start, "$lt": prev_end}
        })
        patients_growth = calculate_growth_rate(current_patients, prev_patients)
        
        # Tổng hợp summary
        summary = {
            "totalRevenue": total_revenue,
            "revenueGrowth": round(revenue_growth, 1),
            "totalAppointments": total_appointments,
            "appointmentGrowth": round(appointment_growth, 1),
            "newPatients": current_patients,
            "patientsGrowth": round(patients_growth, 1),
            "completionRate": round(completion_rate, 1)
        }
        
        # ============================================================
        # 2. DOANH THU THEO THÁNG (6 tháng gần nhất)
        # ============================================================
        revenue_by_month = []
        for month_start, month_end, month_label in get_month_range(6):
            month_appointments = mongo_db.appointments.count_documents({
                "created_at": {"$gte": month_start, "$lt": month_end},
                "status": "completed"
            })
            
            revenue_by_month.append({
                "month": month_label,
                "revenue": month_appointments * PRICE_PER_APPOINTMENT,
                "appointments": month_appointments
            })
        
        # ============================================================
        # 3. PHÂN BỐ HẸN KHÁM THEO TRẠNG THÁI
        # ============================================================
        appointments_by_status = []
        for status_key, config in APPOINTMENT_STATUS_MAP.items():
            count = mongo_db.appointments.count_documents({
                "created_at": {"$gte": start_date, "$lt": end_date},
                "status": status_key
            })
            if count > 0:
                appointments_by_status.append({
                    "name": config["name"],
                    "value": count,
                    "color": config["color"]
                })
        
        # ============================================================
        # 4. THỐNG KÊ THEO CHUYÊN KHOA
        # ============================================================
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lt": end_date}}},
            {"$lookup": {
                "from": "doctors",
                "localField": "doctor_id",
                "foreignField": "_id",
                "as": "doctor_info"
            }},
            {"$unwind": "$doctor_info"},
            {"$group": {
                "_id": "$doctor_info.specialty",
                "count": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }}
        ]
        
        spec_results = list(mongo_db.appointments.aggregate(pipeline))
        appointments_by_specialization = []
        for r in spec_results:
            specialty_code = r.get("_id")
            if specialty_code:
                # Map specialty code to Vietnamese name
                specialty_name = SPECIALTY_NAMES.get(specialty_code, specialty_code)
            else:
                specialty_name = "Đa khoa"
            
            appointments_by_specialization.append({
                "name": specialty_name,
                "patients": r["count"],
                "revenue": r["completed"] * PRICE_PER_APPOINTMENT
            })
        appointments_by_specialization.sort(key=lambda x: x["patients"], reverse=True)
        
        # ============================================================
        # 5. TOP BÁC SĨ XUẤT SẮC (Top 5)
        # ============================================================
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lt": end_date}}},
            {"$group": {
                "_id": "$doctor_id",
                "total": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }},
            {"$sort": {"completed": -1}},
            {"$limit": 5}
        ]
        
        top_doctor_stats = list(mongo_db.appointments.aggregate(pipeline))
        top_doctors = []
        
        for idx, stat in enumerate(top_doctor_stats):
            doctor = mongo_db.doctors.find_one({"_id": stat["_id"]})
            if doctor:
                top_doctors.append({
                    "rank": idx + 1,
                    "name": doctor.get("name", "N/A"),
                    "specialization": SPECIALTY_NAMES.get(doctor.get("specialty"), "Đa khoa") if doctor.get("specialty") else "Đa khoa",
                    "appointments": stat["completed"],
                    "revenue": stat["completed"] * PRICE_PER_APPOINTMENT,
                    "rating": round(4.5 + (idx * 0.1), 1)  # Mock rating
                })
        
        # ============================================================
        # TRẢ VỀ KẾT QUẢ
        # ============================================================
        result = {
            "summary": summary,
            "revenueByMonth": revenue_by_month,
            "appointmentsByStatus": appointments_by_status,
            "appointmentsBySpecialization": appointments_by_specialization,
            "topDoctors": top_doctors
        }
        
        # Cache result for 5 minutes (300 seconds)
        cache.set(cache_key, result, ttl=300)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong get_dashboard_statistics: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
