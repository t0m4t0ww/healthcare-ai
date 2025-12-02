# backend/app/routes/statistics/xray_reports.py
"""
API thống kê Báo cáo X-quang

Endpoint: GET /report/statistics
Mô tả: Thống kê kết quả phân tích X-quang bằng AI

Dữ liệu trả về:
- KPI: Tổng ca, ca bất thường, độ tin cậy TB, BS tham gia
- Phân bố theo bệnh
- Xu hướng hàng ngày (10 ngày)
- Ma trận độ nghiêm trọng

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify
from flask_cors import cross_origin
from datetime import timedelta
from app.extensions import mongo_db
from app.middlewares.auth import auth_required
from . import statistics_bp
from .utils import parse_date, SEVERITY_THRESHOLDS


@statistics_bp.route("/report/statistics", methods=["GET", "OPTIONS"])
@cross_origin(
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
    methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
@auth_required(roles=["doctor", "admin"])
def get_xray_report_statistics():
    """
    API thống kê Báo cáo X-quang
    
    Query params:
        - date (bắt buộc, YYYY-MM-DD): Ngày cần thống kê
    
    Returns:
        JSON: {
            "totals": {
                "totalCases": int,               // Tổng số ca
                "abnormal": int,                 // Ca bất thường
                "avgConfidence": float,          // Độ tin cậy TB (0-1)
                "doctorsInvolved": int           // Số BS tham gia
            },
            "byDisease": [{
                "name": str,                     // Tên bệnh
                "count": int,                    // Số ca
                "avgConfidence": float           // Độ tin cậy TB
            }],
            "dailyTrend": [{
                "date": str,                     // Ngày (YYYY-MM-DD)
                "cases": int                     // Số ca trong ngày
            }],
            "severityMatrix": {
                "<disease>": {
                    "Mild": int,                 // Nhẹ
                    "Moderate": int,             // Trung bình
                    "Severe": int                // Nghiêm trọng
                }
            }
        }
    """
    # Kiểm tra tham số date
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({
            "error": "Thiếu tham số 'date'",
            "message": "Vui lòng cung cấp ?date=YYYY-MM-DD"
        }), 400

    try:
        base = parse_date(date_str)
        start = base.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        # ============================================================
        # 1. KPI - CHỈ SỐ TỔNG QUAN
        # ============================================================
        
        # Tổng số ca X-quang trong ngày
        total_cases = mongo_db.xray_results.count_documents({
            "created_at": {"$gte": start, "$lt": end}
        })

        # Số ca bất thường (có phát hiện bệnh, confidence >= 0.5)
        abnormal_query = {
            "created_at": {"$gte": start, "$lt": end},
            "ai_result.label": {"$nin": [None, "", "Normal", "No finding"]},
            "ai_result.confidence": {"$gte": 0.5}
        }
        abnormal = mongo_db.xray_results.count_documents(abnormal_query)

        # Tính độ tin cậy trung bình
        conf_vals = []
        for doc in mongo_db.xray_results.find(
            {"created_at": {"$gte": start, "$lt": end}},
            {"ai_result.confidence": 1}
        ):
            conf = (doc.get("ai_result") or {}).get("confidence")
            if isinstance(conf, (float, int)):
                conf_vals.append(float(conf))
        
        avg_conf = (sum(conf_vals) / len(conf_vals)) if conf_vals else 0.0

        # Số bác sĩ tham gia đọc X-quang
        try:
            doctors_involved = len(mongo_db.xray_results.distinct(
                "doctor_id", 
                {"created_at": {"$gte": start, "$lt": end}}
            ))
        except Exception:
            doctors_involved = 0

        totals = {
            "totalCases": total_cases,
            "abnormal": abnormal,
            "avgConfidence": round(avg_conf, 4),
            "doctorsInvolved": doctors_involved
        }

        # ============================================================
        # 2. PHÂN BỐ THEO BỆNH
        # ============================================================
        
        cursor = mongo_db.xray_results.find(
            {"created_at": {"$gte": start, "$lt": end}},
            {"ai_result.label": 1, "ai_result.confidence": 1}
        )
        
        # Tổng hợp theo bệnh
        disease_agg = {}
        for doc in cursor:
            ai_result = doc.get("ai_result") or {}
            label = ai_result.get("label") or "Unknown"
            conf = float(ai_result.get("confidence") or 0)
            
            if label not in disease_agg:
                disease_agg[label] = {"count": 0, "sumConf": 0.0}
            
            disease_agg[label]["count"] += 1
            disease_agg[label]["sumConf"] += conf
        
        # Tạo danh sách và tính confidence trung bình
        by_disease = []
        for label, data in disease_agg.items():
            avg_conf = (data["sumConf"] / data["count"]) if data["count"] > 0 else 0
            by_disease.append({
                "name": label,
                "count": data["count"],
                "avgConfidence": round(avg_conf, 3)
            })
        
        # Sắp xếp theo số lượng (giảm dần)
        by_disease.sort(key=lambda x: x["count"], reverse=True)

        # ============================================================
        # 3. XU HƯỚNG HÀNG NGÀY (10 ngày gần đây)
        # ============================================================
        
        trend_start = start - timedelta(days=9)
        trend_end = end
        
        # Đếm số ca mỗi ngày
        trend_map = {}
        for doc in mongo_db.xray_results.find(
            {"created_at": {"$gte": trend_start, "$lt": trend_end}},
            {"created_at": 1}
        ):
            day = doc["created_at"].strftime("%Y-%m-%d")
            trend_map[day] = trend_map.get(day, 0) + 1
        
        # Tạo danh sách đầy đủ 10 ngày (bao gồm ngày không có ca)
        daily_trend = []
        for i in range(10):
            day = (trend_start + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_trend.append({
                "date": day,
                "cases": trend_map.get(day, 0)
            })

        # ============================================================
        # 4. MA TRẬN ĐỘ NGHIÊM TRỌNG
        # Phân loại dựa trên confidence:
        # - Mild (Nhẹ): < 0.5
        # - Moderate (Trung bình): 0.5 - 0.79
        # - Severe (Nghiêm trọng): >= 0.8
        # ============================================================
        
        severity_matrix = {}
        
        for doc in mongo_db.xray_results.find(
            {"created_at": {"$gte": trend_start, "$lt": trend_end}},
            {"ai_result.label": 1, "ai_result.confidence": 1}
        ):
            ai_result = doc.get("ai_result") or {}
            label = ai_result.get("label") or "Unknown"
            conf = float(ai_result.get("confidence") or 0)
            
            # Xác định bucket (mức độ)
            if conf < SEVERITY_THRESHOLDS["mild"]:
                bucket = "Mild"
            elif conf < SEVERITY_THRESHOLDS["moderate"]:
                bucket = "Moderate"
            else:
                bucket = "Severe"
            
            # Khởi tạo nếu chưa có
            if label not in severity_matrix:
                severity_matrix[label] = {
                    "Mild": 0, 
                    "Moderate": 0, 
                    "Severe": 0
                }
            
            severity_matrix[label][bucket] += 1

        # ============================================================
        # TRẢ VỀ KẾT QUẢ
        # ============================================================
        return jsonify({
            "totals": totals,
            "byDisease": by_disease,
            "dailyTrend": daily_trend,
            "severityMatrix": severity_matrix
        })

    except ValueError as e:
        return jsonify({
            "error": "Định dạng ngày không hợp lệ",
            "message": "Vui lòng sử dụng định dạng YYYY-MM-DD (ví dụ: 2025-01-15)"
        }), 400
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong get_xray_report_statistics: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
