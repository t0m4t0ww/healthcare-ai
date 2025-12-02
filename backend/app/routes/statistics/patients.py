# backend/app/routes/statistics/patients.py
"""
API thống kê Bệnh nhân

Endpoint: GET /statistics/patients
Mô tả: Thống kê chi tiết về bệnh nhân trong hệ thống

Dữ liệu trả về:
- Tổng quan: Tổng BN, BN mới, tăng trưởng, tuổi trung bình
- Nhân khẩu học: Theo tuổi, giới tính, địa phương
- Chỉ số sức khỏe: Bệnh phổ biến, tần suất khám
- xu hướng tăng trưởng 6 tháng

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify
from flask_cors import cross_origin
from datetime import datetime
from app.extensions import mongo_db
from . import statistics_bp
from .utils import (
    get_date_range, calculate_growth_rate, get_previous_period, get_month_range
)


@statistics_bp.route("/statistics/patients", methods=["GET"])
@cross_origin(supports_credentials=True, origins=["http://localhost:3000"])
def get_patient_statistics():
    """
    API thống kê Bệnh nhân chi tiết
    
    Query params:
        - start_date (tùy chọn, YYYY-MM-DD): Mặc định 30 ngày trước
        - end_date (tùy chọn, YYYY-MM-DD): Mặc định hôm nay
    
    Returns:
        JSON: {
            "summary": {
                "totalPatients": int,              // Tổng số bệnh nhân
                "newPatients": int,                // Bệnh nhân mới trong kỳ
                "patientsGrowth": float,           // % tăng trưởng
                "activePatients": int,             // BN có hẹn trong kỳ
                "averageAge": float,               // Tuổi trung bình
                "genderDistribution": {...}        // Phân bố giới tính
            },
            "demographics": {
                "byAge": [...],                    // Theo nhóm tuổi
                "byGender": [...],                 // Theo giới tính
                "byLocation": [...]                // Theo địa phương (top 5)
            },
            "healthMetrics": {
                "commonConditions": [...],         // Bệnh phổ biến
                "appointmentFrequency": [...]      // Tần suất khám
            },
            "growthTrend": [...]                   // Xu hướng 6 tháng
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
        
        # ============================================================
        # 1. THỐNG KÊ TỔNG QUAN
        # ============================================================
        
        # Tổng số bệnh nhân trong hệ thống
        total_patients = mongo_db.patients.count_documents({})
        
        # Bệnh nhân mới trong kỳ
        new_patients = mongo_db.patients.count_documents({
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        
        # Bệnh nhân mới kỳ trước
        prev_new_patients = mongo_db.patients.count_documents({
            "created_at": {"$gte": prev_start, "$lt": prev_end}
        })
        
        # Tính tăng trưởng
        patients_growth = calculate_growth_rate(new_patients, prev_new_patients)
        
        # Bệnh nhân hoạt động (có hẹn khám trong kỳ)
        active_patient_ids = mongo_db.appointments.distinct(
            "patient_id",
            {"created_at": {"$gte": start_date, "$lt": end_date}}
        )
        active_patients = len(active_patient_ids)
        
        # ============================================================
        # 2. NHÂN KHẨU HỌC (DEMOGRAPHICS)
        # ============================================================
        
        # Lấy tất cả bệnh nhân để phân tích
        all_patients = list(mongo_db.patients.find({}, {
            "date_of_birth": 1, 
            "gender": 1, 
            "address": 1,
            "medical_history": 1,
            "created_at": 1
        }))
        
        # Tính tuổi trung bình
        ages = []
        for p in all_patients:
            dob = p.get("date_of_birth")
            if dob:
                if isinstance(dob, str):
                    try:
                        dob = datetime.strptime(dob, "%Y-%m-%d")
                    except:
                        continue
                age = (datetime.utcnow() - dob).days // 365
                if 0 < age < 120:  # Lọc tuổi hợp lệ
                    ages.append(age)
        
        average_age = sum(ages) / len(ages) if ages else 0
        
        # Phân bố giới tính
        gender_dist = {"male": 0, "female": 0, "other": 0}
        for p in all_patients:
            gender = p.get("gender", "").lower()
            if gender in ["male", "nam", "m"]:
                gender_dist["male"] += 1
            elif gender in ["female", "nữ", "nu", "f"]:
                gender_dist["female"] += 1
            else:
                gender_dist["other"] += 1
        
        # Phân nhóm tuổi
        age_groups = {
            "0-18": 0,    # Trẻ em
            "19-30": 0,   # Thanh niên
            "31-45": 0,   # Trung niên
            "46-60": 0,   # Trung niên cao
            "60+": 0      # Người cao tuổi
        }
        for age in ages:
            if age <= 18:
                age_groups["0-18"] += 1
            elif age <= 30:
                age_groups["19-30"] += 1
            elif age <= 45:
                age_groups["31-45"] += 1
            elif age <= 60:
                age_groups["46-60"] += 1
            else:
                age_groups["60+"] += 1
        
        by_age = [{"range": k, "count": v} for k, v in age_groups.items()]
        
        # Phân bố giới tính (chi tiết)
        by_gender = [
            {"gender": "Nam", "count": gender_dist["male"]},
            {"gender": "Nữ", "count": gender_dist["female"]},
            {"gender": "Khác", "count": gender_dist["other"]}
        ]
        
        # Phân bố theo địa phương (top 5 thành phố)
        location_count = {}
        for p in all_patients:
            address = p.get("address", "")
            # Trích xuất thành phố (đơn giản hóa)
            if "Hà Nội" in address or "Hanoi" in address:
                location_count["Hà Nội"] = location_count.get("Hà Nội", 0) + 1
            elif "Hồ Chí Minh" in address or "HCM" in address or "Sài Gòn" in address:
                location_count["TP. Hồ Chí Minh"] = location_count.get("TP. Hồ Chí Minh", 0) + 1
            elif "Đà Nẵng" in address:
                location_count["Đà Nẵng"] = location_count.get("Đà Nẵng", 0) + 1
            elif "Hải Phòng" in address:
                location_count["Hải Phòng"] = location_count.get("Hải Phòng", 0) + 1
            elif "Cần Thơ" in address:
                location_count["Cần Thơ"] = location_count.get("Cần Thơ", 0) + 1
            else:
                location_count["Khác"] = location_count.get("Khác", 0) + 1
        
        by_location = [
            {"city": k, "count": v} 
            for k, v in sorted(location_count.items(), key=lambda x: x[1], reverse=True)
        ][:5]
        
        # ============================================================
        # 3. CHỈ SỐ SỨC KHỎE (HEALTH METRICS)
        # ============================================================
        
        # Bệnh phổ biến (từ lịch sử bệnh án)
        conditions_count = {}
        medical_keywords = [
            "tiểu đường", "cao huyết áp", "hen suyễn", "dị ứng", 
            "tim mạch", "đau dạ dày", "viêm gan", "suy thận"
        ]
        
        for p in all_patients:
            history = p.get("medical_history", "")
            if history:
                for keyword in medical_keywords:
                    if keyword in history.lower():
                        conditions_count[keyword] = conditions_count.get(keyword, 0) + 1
        
        common_conditions = [
            {"condition": k.title(), "count": v} 
            for k, v in sorted(conditions_count.items(), key=lambda x: x[1], reverse=True)
        ][:5]
        
        # Tần suất khám bệnh
        patient_appt_count = {}
        for appt in mongo_db.appointments.find(
            {"created_at": {"$gte": start_date, "$lt": end_date}},
            {"patient_id": 1}
        ):
            pid = str(appt.get("patient_id"))
            patient_appt_count[pid] = patient_appt_count.get(pid, 0) + 1
        
        freq_groups = {
            "1-2 lần": 0,    # Thỉnh thoảng
            "3-5 lần": 0,    # Thường xuyên
            "6-10 lần": 0,   # Rất thường xuyên
            "10+ lần": 0     # Cần theo dõi đặc biệt
        }
        for count in patient_appt_count.values():
            if count <= 2:
                freq_groups["1-2 lần"] += 1
            elif count <= 5:
                freq_groups["3-5 lần"] += 1
            elif count <= 10:
                freq_groups["6-10 lần"] += 1
            else:
                freq_groups["10+ lần"] += 1
        
        appointment_frequency = [{"range": k, "count": v} for k, v in freq_groups.items()]
        
        # ============================================================
        # 4. XU HƯỚNG TĂNG TRƯỞNG (6 tháng gần nhất)
        # ============================================================
        growth_trend = []
        cumulative = total_patients
        
        for month_start, month_end, month_label in get_month_range(6):
            month_new = mongo_db.patients.count_documents({
                "created_at": {"$gte": month_start, "$lt": month_end}
            })
            
            growth_trend.append({
                "month": month_label,
                "newPatients": month_new,
                "totalPatients": cumulative
            })
            cumulative -= month_new  # Tính ngược từ hiện tại
        
        # ============================================================
        # TRẢ VỀ KẾT QUẢ
        # ============================================================
        return jsonify({
            "summary": {
                "totalPatients": total_patients,
                "newPatients": new_patients,
                "patientsGrowth": round(patients_growth, 1),
                "activePatients": active_patients,
                "averageAge": round(average_age, 1),
                "genderDistribution": gender_dist
            },
            "demographics": {
                "byAge": by_age,
                "byGender": by_gender,
                "byLocation": by_location
            },
            "healthMetrics": {
                "commonConditions": common_conditions,
                "appointmentFrequency": appointment_frequency
            },
            "growthTrend": growth_trend
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong get_patient_statistics: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
