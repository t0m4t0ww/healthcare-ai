# backend/app/services/pdf_service.py
"""
PDF Export Service for Electronic Health Records (EHR)
Phiên bản: Professional UI + Robust Data Handling (Fix diagnosis str, vitals null)
"""

from io import BytesIO
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.barcode import code128
from reportlab.graphics.barcode.qr import QrCodeWidget
import os

class PDFColors:
    """Professional Medical Color Scheme"""
    PRIMARY = colors.HexColor('#00695c')       # Teal đậm
    ACCENT = colors.HexColor('#00897b')        # Teal sáng
    HEADER_TEXT = colors.HexColor('#004d40')   # Chữ tiêu đề đậm
    TEXT_PRIMARY = colors.HexColor('#212121')  # Đen xám (dễ đọc)
    TEXT_SECONDARY = colors.HexColor('#616161')# Xám ghi
    BORDER = colors.HexColor('#e0e0e0')        # Viền nhẹ
    ROW_EVEN = colors.HexColor('#f5f5f5')      # Nền dòng chẵn
    WARNING = colors.HexColor('#d32f2f')       # Đỏ cảnh báo

class PDFSpacing:
    XS = 2 * mm
    SM = 4 * mm
    MD = 6 * mm
    LG = 8 * mm

class EHRPDFService:
    """Service to generate professional PDF from EHR records"""
    
    _fonts_registered = False
    
    @staticmethod
    def register_fonts():
        """Đăng ký font tiếng Việt an toàn"""
        if EHRPDFService._fonts_registered:
            return
        
        # Danh sách các đường dẫn font phổ biến
        font_candidates = [
            os.path.join(os.path.dirname(__file__), 'fonts', 'Roboto-Regular.ttf'),
            'C:\\Windows\\Fonts\\Arial.ttf',
            'C:\\Windows\\Fonts\\Times.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
        ]
        
        font_path = None
        for path in font_candidates:
            if os.path.exists(path):
                font_path = path
                break
        
        if font_path:
            try:
                # Đăng ký Regular
                pdfmetrics.registerFont(TTFont('VietnameseFont', font_path))
                
                # Cố gắng tìm bản Bold, nếu không có dùng lại Regular
                bold_path = font_path.replace('Regular', 'Bold').replace('Arial', 'Arialbd').replace('Times', 'Timesbd')
                if not os.path.exists(bold_path):
                    bold_path = font_path # Fallback
                    
                pdfmetrics.registerFont(TTFont('VietnameseFont-Bold', bold_path))
                EHRPDFService._fonts_registered = True
                print(f"✅ [PDF] Đã load font: {font_path}")
            except Exception as e:
                print(f"⚠️ [PDF] Lỗi load font: {e}")
        else:
            print("⚠️ [PDF] Không tìm thấy font tiếng Việt. PDF có thể bị lỗi hiển thị ký tự.")

    # ==================== HELPER METHODS ====================

    @staticmethod
    def format_date(date_str):
        """Format date string to DD/MM/YYYY"""
        if not date_str: return "---"
        try:
            if isinstance(date_str, datetime): return date_str.strftime("%d/%m/%Y")
            # Xử lý chuỗi ISO
            dt = datetime.fromisoformat(str(date_str).replace('Z', '+00:00'))
            return dt.strftime("%d/%m/%Y")
        except: return str(date_str)

    # ==================== LAYOUT COMPONENTS ====================

    @staticmethod
    def header_footer_template(canvas, doc):
        """Vẽ Header, Footer và Watermark trên MỌI trang"""
        canvas.saveState()
        
        # 1. WATERMARK (Chữ chìm)
        try:
            canvas.setFont('Helvetica-Bold', 60)
            canvas.setFillColor(colors.lightgrey, alpha=0.1)
            canvas.translate(doc.width/2 + 50, doc.height/2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "HEALTHCARE AI HOSPITAL")
        except: pass
        canvas.restoreState()
        
        # 2. FOOTER (Số trang)
        canvas.saveState()
        # Dùng font mặc định nếu chưa load font Việt để tránh crash footer
        ft_font = 'VietnameseFont' if EHRPDFService._fonts_registered else 'Helvetica'
        canvas.setFont(ft_font, 8)
        canvas.setFillColor(PDFColors.TEXT_SECONDARY)
        
        page_num_text = f"Trang {doc.page}"
        canvas.drawRightString(A4[0] - 20*mm, 10*mm, page_num_text)
        
        # Footer text info
        canvas.drawCentredString(A4[0]/2, 10*mm, "Hệ thống Bệnh án Điện tử Healthcare AI - Hotline: 1900 1234")
        
        # Kẻ đường line footer
        canvas.setStrokeColor(PDFColors.BORDER)
        canvas.line(20*mm, 14*mm, A4[0]-20*mm, 14*mm)
        canvas.restoreState()

    @staticmethod
    def create_styles(base_font, base_font_bold):
        styles = getSampleStyleSheet()
        
        custom_styles = {
            'Title': ParagraphStyle('DocTitle', parent=styles['Heading1'], fontName=base_font_bold, fontSize=22, textColor=PDFColors.HEADER_TEXT, alignment=TA_RIGHT, spaceAfter=2*mm),
            'Subtitle': ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontName=base_font, fontSize=10, textColor=PDFColors.TEXT_SECONDARY, alignment=TA_RIGHT),
            
            'SectionHeader': ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontName=base_font_bold, fontSize=12, textColor=colors.white, backColor=PDFColors.PRIMARY, borderPadding=6, spaceBefore=PDFSpacing.MD, spaceAfter=PDFSpacing.SM),
            
            'Label': ParagraphStyle('Label', parent=styles['Normal'], fontName=base_font, fontSize=9, textColor=PDFColors.TEXT_SECONDARY),
            'Value': ParagraphStyle('Value', parent=styles['Normal'], fontName=base_font_bold, fontSize=10, textColor=PDFColors.TEXT_PRIMARY),
            
            'Normal': ParagraphStyle('MyNormal', parent=styles['Normal'], fontName=base_font, fontSize=10, leading=14),
            'Small': ParagraphStyle('MySmall', parent=styles['Normal'], fontName=base_font, fontSize=8, leading=10, textColor=PDFColors.TEXT_SECONDARY),
        }
        return custom_styles

    # ==================== BUILD SECTIONS ====================

    @staticmethod
    def build_top_header(elements, record, styles, base_font, base_font_bold):
        """Header 2 cột: Logo/Info (Trái) - Tiêu đề/Barcode (Phải)"""
        
        # Left Content: Logo & Hospital Info
        hospital_info = [
            Paragraph("<b>PHÒNG KHÁM HEALTHCARE AI</b>", ParagraphStyle('HospName', parent=styles['Normal'], fontName=base_font_bold, fontSize=14, textColor=PDFColors.PRIMARY)),
            Paragraph("Địa chỉ: 123 Đường Y Tế, Q.1, TP.HCM", styles['Small']),
            Paragraph("SĐT: (028) 1234 5678 - Email: contact@healthcareai.vn", styles['Small'])
        ]
        
        # Right Content: Document Title & Barcode
        record_id = str(record.get('_id', record.get('id', '000000')))
        
        # Tạo Barcode Code128
        try:
            barcode = code128.Code128(record_id, barHeight=10*mm, barWidth=0.25*mm)
        except:
            barcode = Paragraph(f"ID: {record_id}", styles['Small'])
        
        right_content = [
            Paragraph("PHIẾU KHÁM BỆNH", styles['Title']),
            Paragraph(f"Mã hồ sơ: {record_id}", styles['Subtitle']),
            Spacer(1, 2*mm),
            barcode
        ]

        # Table Layout cho Header
        header_table = Table(
            [[hospital_info, right_content]],
            colWidths=[100*mm, 70*mm]
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('RIGHTPADDING', (1,0), (1,0), 0),
            ('LEFTPADDING', (0,0), (0,0), 0),
        ]))
        
        elements.append(header_table)
        
        # Đường kẻ phân cách Header
        elements.append(Spacer(1, PDFSpacing.SM))
        elements.append(Paragraph("", ParagraphStyle('Line', parent=styles['Normal'], borderWidth=1, borderColor=PDFColors.PRIMARY, borderPadding=0)))
        
        # Dòng ngày khám
        created_at = EHRPDFService.format_date(record.get('created_at', datetime.now()))
        elements.append(Paragraph(f"Ngày khám: <b>{created_at}</b>", ParagraphStyle('DateParams', parent=styles['Normal'], fontName=base_font, alignment=TA_RIGHT, fontSize=9, spaceBefore=2)))
        elements.append(Spacer(1, PDFSpacing.SM))

    @staticmethod
    def build_patient_summary(elements, record, styles):
        """Thông tin hành chính bệnh nhân (Fix mapping keys)"""
        elements.append(Paragraph("THÔNG TIN HÀNH CHÍNH", styles['SectionHeader']))
        
        p = record.get('patient_info', {})
        if not p: p = {}
        
        # --- MAPPING DỮ LIỆU ---
        # 1. Tên: Ưu tiên full_name -> name
        fullname = p.get('full_name') or p.get('name', '---')
        fullname = str(fullname).upper()
        
        # 2. Ngày sinh: Ưu tiên date_of_birth -> dob
        dob_raw = p.get('date_of_birth') or p.get('dob')
        dob = EHRPDFService.format_date(dob_raw)
        
        # 3. Giới tính
        gender_raw = p.get('gender', '').lower()
        gender_map = {'male': 'Nam', 'female': 'Nữ', 'other': 'Khác', 'nam': 'Nam', 'nu': 'Nữ'}
        gender = gender_map.get(gender_raw, gender_raw or '---')
        
        # 4. Liên hệ
        phone = p.get('phone_number') or p.get('phone', '---')
        address = p.get('address', '---')
        pid = p.get('patient_id') or p.get('citizen_id') or record.get('patient_id', '---')

        # Bảng 4 cột
        data = [
            ['Họ và tên:', Paragraph(f"<font size=12 color='#00695c'><b>{fullname}</b></font>", styles['Normal']), 'Mã BN/CCCD:', pid],
            ['Ngày sinh:', dob, 'Giới tính:', gender],
            ['Số điện thoại:', phone, 'Địa chỉ:', Paragraph(address, styles['Value'])],
        ]
        
        final_data = []
        for row in data:
            new_row = []
            new_row.append(Paragraph(row[0], styles['Label']))
            new_row.append(row[1] if isinstance(row[1], Paragraph) else Paragraph(str(row[1]), styles['Value']))
            new_row.append(Paragraph(row[2], styles['Label']))
            new_row.append(row[3] if isinstance(row[3], Paragraph) else Paragraph(str(row[3]), styles['Value']))
            final_data.append(new_row)

        t = Table(final_data, colWidths=[25*mm, 60*mm, 25*mm, 60*mm])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, PDFColors.BORDER),
            ('BACKGROUND', (0,0), (0,-1), colors.whitesmoke), # Nền xám cột Label
            ('BACKGROUND', (2,0), (2,-1), colors.whitesmoke),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)

    @staticmethod
    def build_clinical_data(elements, record, styles):
        """Phần chuyên môn: Fix diagnosis string & vitals null"""
        
        # 1. XỬ LÝ VITALS (Có thể null hoặc sai key)
        vitals = record.get('vital_signs') or record.get('vitals')
        
        if vitals and isinstance(vitals, dict): 
            elements.append(Spacer(1, PDFSpacing.SM))
            # Tạo 1 dải ngang các chỉ số
            v_data = [[
                f"Mạch: {vitals.get('heart_rate','-')} l/p",
                f"Nhiệt độ: {vitals.get('temperature','-')}°C",
                f"Huyết áp: {vitals.get('blood_pressure','-')}",
                f"Nhịp thở: {vitals.get('respiratory_rate','-')} l/p",
                f"Cân nặng: {vitals.get('weight','-')} kg"
            ]]
            v_table = Table(v_data, colWidths=[34*mm]*5)
            v_table.setStyle(TableStyle([
                ('FONTNAME', (0,0), (-1,-1), 'VietnameseFont-Bold' if EHRPDFService._fonts_registered else 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('BACKGROUND', (0,0), (-1,-1), PDFColors.ROW_EVEN),
                ('BOX', (0,0), (-1,-1), 1, PDFColors.PRIMARY),
                ('TC', (0,0), (-1,-1), PDFColors.PRIMARY), 
            ]))
            elements.append(v_table)
        # Nếu vitals null thì bỏ qua, không vẽ bảng

        elements.append(Paragraph("THÔNG TIN KHÁM BỆNH", styles['SectionHeader']))
        
        # 2. XỬ LÝ DIAGNOSIS (STRING vs DICT)
        diag_raw = record.get('diagnosis')
        diag_display = "---"
        
        if isinstance(diag_raw, str):
            diag_display = diag_raw  # Lấy trực tiếp chuỗi
        elif isinstance(diag_raw, dict):
            diag_display = diag_raw.get('primary', '---')
            if diag_raw.get('icd10'):
                diag_display += f" (ICD10: {diag_raw.get('icd10')})"
        
        # 3. XỬ LÝ SYMPTOMS & NOTES
        p_info = record.get('patient_info', {}) or {}
        
        # Lấy triệu chứng từ nhiều nguồn có thể
        symptoms = None
        symptoms_str = "---"
        
        # Ưu tiên 1: Field 'symptoms' (list hoặc string)
        symptoms_raw = record.get('symptoms')
        if symptoms_raw:
            if isinstance(symptoms_raw, list):
                # Lọc bỏ các phần tử rỗng/None
                symptoms_list = [str(s).strip() for s in symptoms_raw if s and str(s).strip()]
                if symptoms_list:
                    symptoms_str = ", ".join(symptoms_list)
            elif isinstance(symptoms_raw, str) and symptoms_raw.strip():
                symptoms_str = symptoms_raw.strip()
        
        # Ưu tiên 2: Nếu không có symptoms, thử lấy từ chief_complaint (lý do khám thường chứa triệu chứng)
        if symptoms_str == "---" or not symptoms_str.strip():
            chief_complaint = record.get('chief_complaint', '')
            if chief_complaint:
                # Nếu chief_complaint là dict, lấy main_symptom
                if isinstance(chief_complaint, dict):
                    symptoms_str = chief_complaint.get('main_symptom', '') or chief_complaint.get('description', '')
                elif isinstance(chief_complaint, str) and chief_complaint.strip():
                    symptoms_str = chief_complaint.strip()
        
        # Ưu tiên 3: Thử lấy từ specialty_exam nếu có
        if (symptoms_str == "---" or not symptoms_str.strip()) and record.get('specialty_exam'):
            specialty_exam = record.get('specialty_exam', {})
            if isinstance(specialty_exam, dict):
                # Thử các field có thể chứa triệu chứng
                for key in ['symptoms', 'symptoms_description', 'chief_complaint', 'complaint']:
                    if specialty_exam.get(key):
                        symptoms_str = str(specialty_exam[key]).strip()
                        break
        
        # Nếu vẫn không có, giữ nguyên "---"
        if not symptoms_str or symptoms_str.strip() == "":
            symptoms_str = "---"
        
        doctor_notes = record.get('doctor_notes') or record.get('notes', 'Chưa có ghi chú')
        treatment = record.get('treatment', '')

        # Xử lý chief_complaint (có thể là dict hoặc string)
        chief_complaint_raw = record.get('chief_complaint', '')
        chief_complaint_str = "---"
        if chief_complaint_raw:
            if isinstance(chief_complaint_raw, dict):
                # Nếu là dict, lấy main_symptom hoặc description
                chief_complaint_str = chief_complaint_raw.get('main_symptom', '') or chief_complaint_raw.get('description', '') or str(chief_complaint_raw)
            elif isinstance(chief_complaint_raw, str):
                chief_complaint_str = chief_complaint_raw.strip()
            else:
                chief_complaint_str = str(chief_complaint_raw)
        
        if not chief_complaint_str or chief_complaint_str.strip() == "":
            chief_complaint_str = "---"
        
        clinical_content = [
            ("Lý do khám:", chief_complaint_str),
            ("Tiền sử bệnh:", p_info.get('medical_history', 'Không ghi nhận')),
            ("Dị ứng:", p_info.get('allergies_medications', 'Không ghi nhận')),
            ("Triệu chứng:", symptoms_str),
            ("Ghi chú bác sĩ:", doctor_notes),
            ("Hướng điều trị:", treatment),
            ("Chẩn đoán:", f"<b>{diag_display}</b>")
        ]
        
        tbl_data = []
        for label, val in clinical_content:
            val_str = str(val) if val is not None and val != "None" else "---"
            if not val_str.strip(): val_str = "---"
            
            tbl_data.append([
                Paragraph(label, styles['Label']),
                Paragraph(val_str, styles['Normal'])
            ])
            
        c_table = Table(tbl_data, colWidths=[30*mm, 140*mm])
        c_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, PDFColors.BORDER),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(c_table)

    @staticmethod
    def build_prescription_pro(elements, record, styles):
        """Đơn thuốc (Fix mapping name & hiển thị)"""
        # Data dùng key 'medications' hoặc 'prescription'
        meds = record.get('medications') or record.get('prescription', [])
        
        if not meds: 
            return # Không có thuốc thì thoát

        elements.append(Paragraph("CHỈ ĐỊNH DÙNG THUỐC", styles['SectionHeader']))
        
        headers = ['STT', 'Tên thuốc & Hàm lượng', 'Số lượng', 'Hướng dẫn sử dụng']
        data = [[Paragraph(f"<b>{h}</b>", styles['Normal']) for h in headers]]
        
        for idx, med in enumerate(meds, 1):
            # --- MAP DỮ LIỆU THUỐC ---
            name = med.get('name') or med.get('drug_name', 'Thuốc chưa đặt tên')
            dosage = med.get('dosage', '')
            duration = med.get('duration', '')
            frequency = med.get('frequency', '')
            instructions = med.get('instructions') or med.get('notes', '')
            
            # Ghép Tên + Hàm lượng
            name_display = f"<b>{name}</b>"
            if dosage: name_display += f" ({dosage})"
            
            # Ghép hướng dẫn
            guide_parts = []
            if frequency: guide_parts.append(f"Dùng: {frequency}")
            if instructions: guide_parts.append(f"Lưu ý: {instructions}")
            guide_str = "<br/>".join(guide_parts)
            
            data.append([
                str(idx),
                Paragraph(name_display, styles['Normal']),
                str(duration),
                Paragraph(guide_str, styles['Small'])
            ])

        p_table = Table(data, colWidths=[10*mm, 70*mm, 30*mm, 60*mm], repeatRows=1)
        p_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), PDFColors.BORDER),
            ('GRID', (0,0), (-1,-1), 0.5, PDFColors.BORDER),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (0,-1), 'CENTER'), # STT Center
            ('ALIGN', (2,0), (2,-1), 'CENTER'), # Số lượng Center
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(p_table)
        
        # --- PHẦN CHỮ KÝ ---
        elements.append(Spacer(1, PDFSpacing.SM))
        
        # QR Code
        record_id = str(record.get('_id', record.get('id', '0')))
        try:
            qr_drawing = QrCodeWidget(f"https://healthcareai.vn/rx/{record_id}")
            qr_drawing.barWidth = 30*mm
            qr_drawing.barHeight = 30*mm
            qr_drawing.qrVersion = 3
            d = Drawing(30*mm, 30*mm)
            d.add(qr_drawing)
        except:
            d = Paragraph("[QR ERROR]", styles['Small'])
        
        # Lấy tên bác sĩ
        doc_info = record.get('doctor_info') or record.get('doctor', {})
        doctor_name = doc_info.get('full_name') or doc_info.get('name', 'Bác sĩ điều trị')

        sig_table_data = [[
            Paragraph("<i>Quét mã để mua thuốc</i>", styles['Small']),
            Paragraph(f"Ngày {datetime.now().day} tháng {datetime.now().month} năm {datetime.now().year}", styles['Normal'])
        ], [
            d,
            Paragraph("<b>BÁC SĨ ĐIỀU TRỊ</b>", styles['Value'])
        ], [
            '',
            Spacer(1, 15*mm)
        ], [
            '',
            Paragraph(f"<b>{doctor_name}</b>", styles['Value'])
        ]]
        
        sig_table = Table(sig_table_data, colWidths=[90*mm, 80*mm])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
            ('ALIGN', (1,0), (1,-1), 'CENTER'),
            ('VALIGN', (0,1), (0,1), 'TOP'),
        ]))
        elements.append(KeepTogether(sig_table))

    @staticmethod
    def build_ehr_pdf(record: dict) -> bytes:
        """Main Build Method"""
        EHRPDFService.register_fonts()
        buffer = BytesIO()
        
        # Font setup
        base_font = 'VietnameseFont' if EHRPDFService._fonts_registered else 'Helvetica'
        base_font_bold = 'VietnameseFont-Bold' if EHRPDFService._fonts_registered else 'Helvetica-Bold'
        
        # Document Setup
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=25*mm, rightMargin=15*mm,
            topMargin=15*mm, bottomMargin=20*mm
        )
        
        styles = EHRPDFService.create_styles(base_font, base_font_bold)
        elements = []
        
        # 1. Header (Top section)
        EHRPDFService.build_top_header(elements, record, styles, base_font, base_font_bold)
        
        # 2. Patient Summary
        EHRPDFService.build_patient_summary(elements, record, styles)
        
        # 3. Clinical Data
        EHRPDFService.build_clinical_data(elements, record, styles)
        
        # 4. Prescription & Signature
        EHRPDFService.build_prescription_pro(elements, record, styles)
        
        # Build with Template (for Footer/Watermark)
        doc.build(elements, onFirstPage=EHRPDFService.header_footer_template, onLaterPages=EHRPDFService.header_footer_template)
        
        return buffer.getvalue()