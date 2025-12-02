# backend/app/routes/statistics/export.py
"""
API Export Báo cáo

Endpoint: GET /export/<report_type>
Mô tả: Export báo cáo dưới dạng CSV hoặc PDF

Loại báo cáo hỗ trợ:
- dashboard: Báo cáo tổng quan
- patients: Danh sách bệnh nhân
- doctors: Thống kê bác sĩ
- revenue: Báo cáo doanh thu
- xray: Báo cáo X-quang (TODO)

Format hỗ trợ:
- CSV: Đã hoàn thiện ✅
- PDF: Sẽ phát triển (TODO)

Author: Healthcare AI Team
Date: 2025-11-15
"""

from flask import request, jsonify, make_response
from flask_cors import cross_origin
from datetime import datetime
from bson import ObjectId
import csv
from io import StringIO

from app.extensions import mongo_db
from . import statistics_bp
from .utils import get_date_range


@statistics_bp.route("/export/<report_type>", methods=["GET"])
@cross_origin(supports_credentials=True, origins=["http://localhost:3000"])
def export_report(report_type):
    """
    API Export báo cáo
    
    URL params:
        - report_type: dashboard | patients | doctors | revenue | xray
    
    Query params:
        - format: csv | pdf (mặc định: csv)
        - start_date (tùy chọn, YYYY-MM-DD): Ngày bắt đầu
        - end_date (tùy chọn, YYYY-MM-DD): Ngày kết thúc
    
    Returns:
        - CSV file: Tải về trực tiếp
        - PDF file: Sẽ phát triển sau (hiện tại trả về thông báo)
    
    Ví dụ:
        GET /export/patients?format=csv&start_date=2025-01-01&end_date=2025-01-31
        → Tải file: patients_report_20250115.csv
    """
    try:
        # Lấy tham số
        export_format = request.args.get("format", "csv").lower()
        start_date, end_date = get_date_range(
            request.args.get("start_date"),
            request.args.get("end_date")
        )
        
        # ============================================================
        # EXPORT CSV
        # ============================================================
        if export_format == "csv":
            output = StringIO()
            writer = csv.writer(output)
            
            # --------------------------------------------------------
            # 1. DASHBOARD REPORT
            # --------------------------------------------------------
            if report_type == "dashboard":
                # Header
                writer.writerow([
                    "BÁO CÁO TỔNG QUAN DASHBOARD",
                    f"Từ {start_date.strftime('%d/%m/%Y')} đến {end_date.strftime('%d/%m/%Y')}"
                ])
                writer.writerow([])
                writer.writerow(["Chỉ số", "Giá trị", "Tăng trưởng (%)"])
                
                # Lấy dữ liệu
                appointments = mongo_db.appointments.count_documents({
                    "created_at": {"$gte": start_date, "$lt": end_date},
                    "status": "completed"
                })
                revenue = appointments * 200000
                new_patients = mongo_db.patients.count_documents({
                    "created_at": {"$gte": start_date, "$lt": end_date}
                })
                
                # Ghi dữ liệu
                writer.writerow(["Tổng số hẹn khám", appointments, ""])
                writer.writerow(["Tổng doanh thu (VND)", f"{revenue:,}", ""])
                writer.writerow(["Bệnh nhân mới", new_patients, ""])
                
            # --------------------------------------------------------
            # 2. PATIENTS REPORT
            # --------------------------------------------------------
            elif report_type == "patients":
                # Header
                writer.writerow([
                    "BÁO CÁO BỆNH NHÂN",
                    f"Từ {start_date.strftime('%d/%m/%Y')} đến {end_date.strftime('%d/%m/%Y')}"
                ])
                writer.writerow([])
                writer.writerow([
                    "Mã BN", "Họ tên", "Giới tính", "Tuổi", 
                    "Số điện thoại", "Ngày đăng ký"
                ])
                
                # Lấy dữ liệu
                patients = mongo_db.patients.find({
                    "created_at": {"$gte": start_date, "$lt": end_date}
                })
                
                # Ghi từng bệnh nhân
                for p in patients:
                    # Tính tuổi
                    dob = p.get("date_of_birth", "")
                    age = ""
                    if dob:
                        try:
                            if isinstance(dob, str):
                                dob = datetime.strptime(dob, "%Y-%m-%d")
                            age = (datetime.utcnow() - dob).days // 365
                        except:
                            pass
                    
                    # Ghi dòng
                    writer.writerow([
                        str(p.get("_id", "")),
                        p.get("name", ""),
                        p.get("gender", ""),
                        age,
                        p.get("phone", ""),
                        p.get("created_at", "").strftime("%d/%m/%Y") if p.get("created_at") else ""
                    ])
                    
            # --------------------------------------------------------
            # 3. DOCTORS REPORT
            # --------------------------------------------------------
            elif report_type == "doctors":
                # Header
                writer.writerow([
                    "BÁO CÁO THỐNG KÊ BÁC SĨ",
                    f"Từ {start_date.strftime('%d/%m/%Y')} đến {end_date.strftime('%d/%m/%Y')}"
                ])
                writer.writerow([])
                writer.writerow([
                    "Mã BS", "Họ tên", "Chuyên khoa", 
                    "Số ca khám", "Doanh thu (VND)"
                ])
                
                # Lấy dữ liệu
                appointments = list(mongo_db.appointments.find({
                    "created_at": {"$gte": start_date, "$lt": end_date},
                    "status": "completed"
                }))
                
                # Tổng hợp theo bác sĩ
                doctor_stats = {}
                for appt in appointments:
                    doc_id = str(appt.get("doctor_id"))
                    doctor_stats[doc_id] = doctor_stats.get(doc_id, 0) + 1
                
                # Ghi từng bác sĩ
                for doc_id, count in doctor_stats.items():
                    try:
                        doctor = mongo_db.doctors.find_one({"_id": ObjectId(doc_id)})
                        if doctor:
                            writer.writerow([
                                doc_id,
                                doctor.get("name", ""),
                                doctor.get("specialty", ""),
                                count,
                                f"{count * 200000:,}"
                            ])
                    except:
                        continue
                        
            # --------------------------------------------------------
            # 4. REVENUE REPORT
            # --------------------------------------------------------
            elif report_type == "revenue":
                # Header
                writer.writerow([
                    "BÁO CÁO DOANH THU THEO NGÀY",
                    f"Từ {start_date.strftime('%d/%m/%Y')} đến {end_date.strftime('%d/%m/%Y')}"
                ])
                writer.writerow([])
                writer.writerow(["Ngày", "Số lượt khám", "Doanh thu (VND)"])
                
                # Tổng hợp theo ngày
                daily_map = {}
                for appt in mongo_db.appointments.find({
                    "created_at": {"$gte": start_date, "$lt": end_date},
                    "status": "completed"
                }):
                    day = appt["created_at"].strftime("%Y-%m-%d")
                    daily_map[day] = daily_map.get(day, 0) + 1
                
                # Ghi từng ngày
                from datetime import timedelta
                period_days = (end_date - start_date).days
                for i in range(period_days):
                    day = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                    count = daily_map.get(day, 0)
                    revenue = count * 200000
                    
                    writer.writerow([
                        datetime.strptime(day, "%Y-%m-%d").strftime("%d/%m/%Y"),
                        count,
                        f"{revenue:,}"
                    ])
            
            # --------------------------------------------------------
            # LOẠI BÁO CÁO KHÔNG HỢP LỆ
            # --------------------------------------------------------
            else:
                return jsonify({
                    "error": "Loại báo cáo không hợp lệ",
                    "message": f"'{report_type}' không được hỗ trợ. Vui lòng chọn: dashboard, patients, doctors, revenue"
                }), 400
            
            # --------------------------------------------------------
            # TẠO FILE DOWNLOAD
            # --------------------------------------------------------
            output.seek(0)
            response = make_response(output.getvalue())
            
            # Tên file với timestamp
            filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            # Set headers
            response.headers["Content-Disposition"] = f"attachment; filename={filename}"
            response.headers["Content-Type"] = "text/csv; charset=utf-8-sig"  # UTF-8 BOM cho Excel
            
            return response
            
        # ============================================================
        # EXPORT PDF (Chưa phát triển)
        # ============================================================
        elif export_format == "pdf":
            # TODO: Implement PDF export using reportlab or weasyprint
            return jsonify({
                "message": "Tính năng export PDF đang được phát triển",
                "suggestion": "Vui lòng sử dụng format=csv để export báo cáo",
                "csvUrl": f"/export/{report_type}?format=csv&start_date={request.args.get('start_date', '')}&end_date={request.args.get('end_date', '')}"
            }), 501  # 501 Not Implemented
        
        # ============================================================
        # FORMAT KHÔNG HỢP LỆ
        # ============================================================
        else:
            return jsonify({
                "error": "Format không hợp lệ",
                "message": f"'{export_format}' không được hỗ trợ. Vui lòng chọn: csv hoặc pdf"
            }), 400
            
    except Exception as e:
        import traceback
        print(f"❌ Lỗi trong export_report: {e}")
        traceback.print_exc()
        return jsonify({
            "error": "Lỗi khi export báo cáo",
            "message": str(e)
        }), 500


# ============================================================
# HÀM HELPER (Có thể sử dụng sau)
# ============================================================

def generate_pdf_report(report_type, start_date, end_date):
    """
    Tạo báo cáo PDF (TODO)
    
    Args:
        report_type (str): Loại báo cáo
        start_date (datetime): Ngày bắt đầu
        end_date (datetime): Ngày kết thúc
    
    Returns:
        bytes: Nội dung file PDF
    
    Note:
        Cần cài đặt thư viện: reportlab hoặc weasyprint
        pip install reportlab
    """
    # TODO: Implement PDF generation
    pass
