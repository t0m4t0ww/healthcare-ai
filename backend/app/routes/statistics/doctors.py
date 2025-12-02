# backend/app/routes/statistics/doctors.py
"""
API thống kê Hiệu suất Bác sĩ

Endpoint: GET /statistics/doctors/performance
Mô tả: Đánh giá hiệu suất làm việc của bác sĩ

Dữ liệu trả về:
- Tổng quan: Tổng BS, BS hoạt động, thời gian khám TB, độ hài lòng
- Danh sách BS: Chi tiết từng bác sĩ
- Xu hướng hiệu suất 6 tháng
- Top performers theo các tiêu chí

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify
from flask_cors import cross_origin
from bson import ObjectId
from app.extensions import mongo_db
from . import statistics_bp
from .utils import get_date_range, get_month_range, SERVICE_PRICES


@statistics_bp.route("/statistics/doctors/performance", methods=["GET"])
@cross_origin(supports_credentials=True, origins=["http://localhost:3000"])
def get_doctor_performance():
    """
    API thống kê hiệu suất Bác sĩ
    
    Query params:
        - start_date (tùy chọn, YYYY-MM-DD): Mặc định 30 ngày trước
        - end_date (tùy chọn, YYYY-MM-DD): Mặc định hôm nay
        - doctor_id (tùy chọn): ID bác sĩ cụ thể
    
    Returns:
        JSON: {
            "summary": {
                "totalDoctors": int,              // Tổng số bác sĩ
                "activeDoctors": int,             // BS có hoạt động
                "avgConsultationTime": float,     // Thời gian khám TB (phút)
                "avgPatientSatisfaction": float,  // Độ hài lòng TB (1-5)
                "totalConsultations": int         // Tổng ca khám
            },
            "doctorsList": [{
                "doctorId": str,                  // ID bác sĩ
                "name": str,                      // Họ tên
                "specialty": str,                 // Chuyên khoa
                "consultations": int,             // Số ca khám
                "avgConsultationTime": float,     // TG khám TB
                "patientSatisfaction": float,     // Độ hài lòng
                "completionRate": float,          // Tỷ lệ hoàn thành
                "revenue": int                    // Doanh thu
            }],
            "performanceTrend": [{
                "month": str,                     // Tháng
                "consultations": int,             // Số ca khám
                "avgSatisfaction": float          // Độ hài lòng TB
            }],
            "topPerformers": [{
                "name": str,                      // Tên BS
                "metric": str,                    // Tiêu chí
                "value": float                    // Giá trị
            }]
        }
    """
    try:
        # Lấy khoảng thời gian
        start_date, end_date = get_date_range(
            request.args.get("start_date"),
            request.args.get("end_date")
        )
        
        # Lọc theo bác sĩ cụ thể (nếu có)
        doctor_id_str = request.args.get("doctor_id")
        appt_filter = {"created_at": {"$gte": start_date, "$lt": end_date}}
        if doctor_id_str:
            appt_filter["doctor_id"] = ObjectId(doctor_id_str)
        
        # ============================================================
        # 1. THỐNG KÊ TỔNG QUAN
        # ============================================================
        
        # Tổng số bác sĩ trong hệ thống
        total_doctors = mongo_db.doctors.count_documents({})
        
        # Bác sĩ hoạt động (có hẹn khám trong kỳ)
        active_doctor_ids = mongo_db.appointments.distinct(
            "doctor_id",
            appt_filter
        )
        active_doctors = len(active_doctor_ids)
        
        # Lấy tất cả hẹn khám trong kỳ
        appointments = list(mongo_db.appointments.find(appt_filter))
        total_consultations = len(appointments)
        
        # Thời gian khám trung bình (mock - trong thực tế cần tính từ dữ liệu)
        # TODO: Tính từ appointment_time đến completion_time
        avg_consultation_time = 25.5  # phút (giá trị mẫu)
        
        # Độ hài lòng trung bình (mock - trong thực tế lấy từ đánh giá)
        # TODO: Lấy từ bảng ratings/reviews
        avg_satisfaction = 4.3  # thang điểm 5 (giá trị mẫu)
        
        # ============================================================
        # 2. DANH SÁCH BÁC SĨ CHI TIẾT
        # ============================================================
        
        PRICE_PER_APPOINTMENT = SERVICE_PRICES["consultation"]
        doctor_stats = {}
        
        # Tổng hợp thống kê từng bác sĩ
        for appt in appointments:
            doc_id = str(appt.get("doctor_id"))
            if doc_id not in doctor_stats:
                doctor_stats[doc_id] = {
                    "total": 0,        # Tổng số hẹn
                    "completed": 0,    # Đã hoàn thành
                    "cancelled": 0     # Đã hủy
                }
            
            doctor_stats[doc_id]["total"] += 1
            status = appt.get("status")
            if status == "completed":
                doctor_stats[doc_id]["completed"] += 1
            elif status == "cancelled":
                doctor_stats[doc_id]["cancelled"] += 1
        
        # Tạo danh sách chi tiết
        doctors_list = []
        for doc_id, stats in doctor_stats.items():
            try:
                doctor = mongo_db.doctors.find_one({"_id": ObjectId(doc_id)})
                if doctor:
                    # Tính tỷ lệ hoàn thành
                    completion_rate = (stats["completed"] / stats["total"] * 100) if stats["total"] > 0 else 0
                    
                    # Độ hài lòng (mock - tính theo completion_rate)
                    # Công thức: 4.0 + (completion_rate/100 * 0.5)
                    satisfaction = round(4.0 + (completion_rate / 100 * 0.5), 1)
                    
                    doctors_list.append({
                        "doctorId": doc_id,
                        "name": doctor.get("name", "N/A"),
                        "specialty": doctor.get("specialty", "Đa khoa"),
                        "consultations": stats["completed"],
                        "avgConsultationTime": avg_consultation_time,  # Mock
                        "patientSatisfaction": satisfaction,
                        "completionRate": round(completion_rate, 1),
                        "revenue": stats["completed"] * PRICE_PER_APPOINTMENT
                    })
            except Exception as e:
                print(f"⚠️ Bỏ qua bác sĩ {doc_id}: {e}")
                continue
        
        # Sắp xếp theo số ca khám (giảm dần)
        doctors_list.sort(key=lambda x: x["consultations"], reverse=True)
        
        # ============================================================
        # 3. XU HƯỚNG HIỆU SUẤT (6 tháng gần nhất)
        # ============================================================
        performance_trend = []
        
        for month_start, month_end, month_label in get_month_range(6):
            month_consultations = mongo_db.appointments.count_documents({
                "created_at": {"$gte": month_start, "$lt": month_end},
                "status": "completed"
            })
            
            # Độ hài lòng mock (tăng dần theo thời gian)
            mock_satisfaction = round(4.2 + (len(performance_trend) * 0.05), 1)
            
            performance_trend.append({
                "month": month_label,
                "consultations": month_consultations,
                "avgSatisfaction": mock_satisfaction
            })
        
        # ============================================================
        # 4. TOP PERFORMERS (Bác sĩ xuất sắc nhất)
        # ============================================================
        top_performers = []
        
        if doctors_list:
            # Top 1: Số ca khám nhiều nhất
            top_consult = max(doctors_list, key=lambda x: x["consultations"])
            top_performers.append({
                "name": top_consult["name"],
                "metric": "Số ca khám",
                "value": top_consult["consultations"]
            })
            
            # Top 2: Độ hài lòng cao nhất
            top_satisfy = max(doctors_list, key=lambda x: x["patientSatisfaction"])
            top_performers.append({
                "name": top_satisfy["name"],
                "metric": "Hài lòng",
                "value": top_satisfy["patientSatisfaction"]
            })
            
            # Top 3: Tỷ lệ hoàn thành cao nhất
            top_complete = max(doctors_list, key=lambda x: x["completionRate"])
            top_performers.append({
                "name": top_complete["name"],
                "metric": "Tỷ lệ hoàn thành",
                "value": top_complete["completionRate"]
            })
        
        # ============================================================
        # TRẢ VỀ KẾT QUẢ
        # ============================================================
        return jsonify({
            "summary": {
                "totalDoctors": total_doctors,
                "activeDoctors": active_doctors,
                "avgConsultationTime": avg_consultation_time,
                "avgPatientSatisfaction": avg_satisfaction,
                "totalConsultations": total_consultations
            },
            "doctorsList": doctors_list,
            "performanceTrend": performance_trend,
            "topPerformers": top_performers
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong get_doctor_performance: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
