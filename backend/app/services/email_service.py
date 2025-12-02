import smtplib
import ssl
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from datetime import datetime

# Import config
try:
    from app.config import EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_USE_TLS
except ImportError:
    # Fallback values
    EMAIL_HOST = "smtp.gmail.com"
    EMAIL_PORT = 587
    EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "your-email@gmail.com")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")
    EMAIL_USE_TLS = True  # Default to TLS

# Import email logging
try:
    from app.model.email_logs import EmailLogModel
except ImportError:
    EmailLogModel = None

# Import specialty name converter
try:
    from app.routes.appointment_helpers import get_specialty_name
except ImportError:
    # Fallback function if import fails
    def get_specialty_name(specialty_code):
        specialty_map = {
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
            "anesthesiology": "Gây mê hồi sức",
        }
        return specialty_map.get(specialty_code, specialty_code or "Đa khoa")


def send_email(to, subject, content, html_content=None, attachments=None):
    """
    Send email using Gmail SMTP
    """
    try:
        print(f"Sending email to {to}: {subject}")
        
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_USERNAME
        msg['To'] = to
        msg['Subject'] = subject
        
        # Add plain text content
        if content:
            text_part = MIMEText(content, 'plain', 'utf-8')
            msg.attach(text_part)
        
        # Add HTML content
        if html_content:
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
        
        # Add attachments if any
        if attachments:
            for file_path in attachments:
                if os.path.exists(file_path):
                    with open(file_path, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {os.path.basename(file_path)}'
                        )
                        msg.attach(part)
        
        # Prepare email content
        text = msg.as_string()
        
        # Create SMTP session with increased timeout and retry logic
        max_retries = 2
        timeout_seconds = 30 
        
        for attempt in range(max_retries):
            try:
                print(f"[Attempt {attempt + 1}/{max_retries}] Connecting to {EMAIL_HOST}:{EMAIL_PORT}...")
                
                # Try TLS first (port 587)
                if EMAIL_USE_TLS:
                    server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=timeout_seconds)
                    server.starttls()  # Enable TLS encryption
                else:
                    # Use SSL (port 465)
                    import ssl
                    context = ssl.create_default_context()
                    server = smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT, timeout=timeout_seconds, context=context)
                
                print(f"[Attempt {attempt + 1}] Connected, authenticating...")
                server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
                
                print(f"[Attempt {attempt + 1}] Sending email...")
                # Send email
                server.sendmail(EMAIL_USERNAME, to, text)
                server.quit()
                
                print(f"Email sent successfully to {to}")
                return True
                
            except (OSError, ConnectionError, socket.gaierror) as e:
                # Network errors - try alternative port or method
                error_code = getattr(e, 'errno', None)
                error_msg = str(e)
                
                # DNS lookup timeout (Windows: 11002, Linux: -2)
                if error_code in [11002, -2] or 'Lookup timed out' in error_msg or 'Name or service not known' in error_msg:
                    print(f"DNS lookup timeout (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(2)
                        continue
                    else:
                        # Try SSL on port 465 as fallback
                        try:
                            import ssl
                            context = ssl.create_default_context()
                            server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=timeout_seconds, context=context)
                            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
                            server.sendmail(EMAIL_USERNAME, to, text)
                            server.quit()
                            return True
                        except Exception as e2:
                            return False
                
                elif error_code == 10051:  # WSAENETUNREACH
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(2)
                        continue
                    else:
                        # Try SSL on port 465 as fallback
                        try:
                            import ssl
                            context = ssl.create_default_context()
                            server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=timeout_seconds, context=context)
                            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
                            server.sendmail(EMAIL_USERNAME, to, text)
                            server.quit()
                            return True
                        except Exception as e2:
                            return False
                else:
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(2)
                        continue
                    else:
                        return False
        
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_verification_email(to, full_name, verification_token):
    """
    Send account verification email without emojis
    """
    verification_url = f"http://localhost:3000/verify-email?token={verification_token}"
    
    subject = "[Healthcare AI] Xác nhận đăng ký tài khoản"
    
    # Plain text version
    plain_content = f"""
Xin chào {full_name},

Cảm ơn bạn đã đăng ký tài khoản tại Healthcare AI!

Để hoàn tất đăng ký, vui lòng nhấp vào liên kết bên dưới để xác nhận địa chỉ email:
{verification_url}

Liên kết này có hiệu lực trong vòng 24 giờ.

Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    # HTML version (clean professional looking)
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Xác nhận đăng ký tài khoản</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #10b981; margin-bottom: 20px; }}
        .header h1 {{ color: #10b981; margin: 0; font-size: 24px; }}
        .button {{ display: inline-block; background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background-color: #059669; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Healthcare AI</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Cảm ơn bạn đã đăng ký tài khoản tại Healthcare AI.</p>
            
            <p>Để hoàn tất đăng ký, vui lòng nhấp vào nút bên dưới để xác nhận địa chỉ email của bạn:</p>
            
            <div style="text-align: center;">
                <a href="{verification_url}" class="button">Xác nhận Email</a>
            </div>
            
            <p><em>Lưu ý: Liên kết này có hiệu lực trong vòng 24 giờ.</em></p>
            
            <p>Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="verification",
            to=to,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send verification email",
            metadata={"verification_token_length": len(verification_token)}
        )
    
    return success


def send_welcome_email(to, full_name, patient_id=None):
    """
    Send welcome email to new registered user (Clean version)
    """
    subject = "[Healthcare AI] Chào mừng bạn đến với Healthcare AI"
    
    # Plain text version
    plain_content = f"""
Xin chào {full_name},

Chào mừng bạn đến với Healthcare AI!

Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể đăng nhập và sử dụng các tính năng sau:

- Đặt lịch hẹn với bác sĩ
- Tư vấn sức khỏe với AI
- Quản lý hồ sơ sức khỏe điện tử
- Nhận kết quả khám bệnh online
- Đánh giá và phản hồi về dịch vụ

Hãy bắt đầu bằng cách đặt lịch hẹn đầu tiên của bạn tại: http://localhost:3000/appointments

Nếu bạn có bất kỳ câu hỏi nào, đừng ngại liên hệ với chúng tôi.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Chào mừng đến với Healthcare AI</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 20px; }}
        .header h1 {{ color: #3b82f6; margin: 0; font-size: 24px; }}
        .feature {{ padding: 10px; margin: 5px 0; border-bottom: 1px solid #f3f4f6; }}
        .feature:last-child {{ border-bottom: none; }}
        .feature-bullet {{ color: #3b82f6; margin-right: 10px; font-weight: bold; }}
        .button {{ display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background-color: #2563eb; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Chào mừng đến với Healthcare AI</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể sử dụng các tính năng sau:</p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 4px;">
                <div class="feature">
                    <span class="feature-bullet">&bull;</span>
                    <strong>Đặt lịch hẹn với bác sĩ</strong> - Dễ dàng đặt lịch khám với các bác sĩ chuyên khoa
                </div>
                
                <div class="feature">
                    <span class="feature-bullet">&bull;</span>
                    <strong>Tư vấn sức khỏe với AI</strong> - Nhận tư vấn y tế nhanh chóng 24/7
                </div>
                
                <div class="feature">
                    <span class="feature-bullet">&bull;</span>
                    <strong>Quản lý hồ sơ sức khỏe</strong> - Lưu trữ và theo dõi lịch sử khám bệnh
                </div>
                
                <div class="feature">
                    <span class="feature-bullet">&bull;</span>
                    <strong>Kết quả khám bệnh online</strong> - Xem kết quả ngay khi có
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:3000/appointments" class="button">Đặt lịch hẹn ngay</a>
            </div>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngại liên hệ với chúng tôi.</p>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="welcome",
            to=to,
            patient_id=patient_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send welcome email"
        )
    
    return success


def send_password_reset_email(to, full_name, reset_token):
    """
    Send password reset email
    """
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    
    subject = "[Healthcare AI] Đặt lại mật khẩu"
    
    plain_content = f"""
Xin chào {full_name},

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Healthcare AI.

Nhấp vào liên kết bên dưới để đặt lại mật khẩu:
{reset_url}

Liên kết này có hiệu lực trong vòng 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đặt lại mật khẩu</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #f59e0b; margin-bottom: 20px; }}
        .header h1 {{ color: #d97706; margin: 0; font-size: 24px; }}
        .button {{ display: inline-block; background-color: #f59e0b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background-color: #d97706; }}
        .warning {{ background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Healthcare AI - Đặt lại mật khẩu</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Healthcare AI.</p>
            
            <p>Nhấp vào nút bên dưới để tiến hành đặt lại mật khẩu:</p>
            
            <div style="text-align: center;">
                <a href="{reset_url}" class="button">Đặt lại mật khẩu</a>
            </div>
            
            <div class="warning">
                <strong>Lưu ý quan trọng:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Liên kết này có hiệu lực trong vòng 1 giờ</li>
                    <li>Chỉ sử dụng một lần</li>
                    <li>Không chia sẻ liên kết này với bất kỳ ai</li>
                </ul>
            </div>
            
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="password_reset",
            to=to,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send password reset email",
            metadata={"reset_token_length": len(reset_token)}
        )
    
    return success


def send_password_change_email(to, full_name, user_id=None):
    """
    Send email notification after password has been successfully changed
    """
    subject = "[Healthcare AI] Mật khẩu của bạn đã được thay đổi"
    
    current_time = datetime.now().strftime('%H:%M ngày %d/%m/%Y')
    
    plain_content = f"""
Xin chào {full_name},

Mật khẩu tài khoản Healthcare AI của bạn đã được thay đổi thành công vào {current_time}.

Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi ngay lập tức.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mật khẩu đã thay đổi</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #10b981; margin-bottom: 20px; }}
        .header h1 {{ color: #059669; margin: 0; font-size: 24px; }}
        .notice {{ background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; margin: 20px 0; border-radius: 4px; color: #92400e; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Mật khẩu đã thay đổi</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Mật khẩu tài khoản Healthcare AI của bạn đã được thay đổi thành công vào <strong>{current_time}</strong>.</p>
            
            <div class="notice">
                <strong>LƯU Ý BẢO MẬT:</strong><br>
                Nếu bạn không thực hiện thay đổi này, vui lòng <a href="http://localhost:3000/contact" style="color: #d97706; text-decoration: underline;">liên hệ với bộ phận hỗ trợ</a> ngay lập tức.
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="password_changed",
            to=to,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send password changed email",
            metadata={"user_id": user_id} if user_id else {}
        )
    
    return success


def send_appointment_confirmation_email(to, full_name, appointment_data, patient_id=None, appointment_id=None):
    """
    Send appointment confirmation email after booking (Clean version)
    """
    doctor_name = appointment_data.get('doctor_name', 'Bác sĩ')
    date = appointment_data.get('date', '')
    time = appointment_data.get('time', '')
    specialty_code = appointment_data.get('specialty', '')
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    location = appointment_data.get('location', 'Phòng khám Healthcare AI')
    
    # Format date nicely
    try:
        if isinstance(date, str):
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            date_formatted = date_obj.strftime("%d/%m/%Y")
        else:
            date_formatted = date.strftime("%d/%m/%Y") if hasattr(date, 'strftime') else str(date)
    except:
        date_formatted = str(date)
    
    subject = f"[Healthcare AI] Xác nhận đặt lịch khám - {date_formatted}"
    
    plain_content = f"""
Xin chào {full_name},

Lịch hẹn của bạn đã được xác nhận thành công.

THÔNG TIN LỊCH HẸN:
-------------------
Bác sĩ: {doctor_name}
Chuyên khoa: {specialty}
Ngày khám: {date_formatted}
Giờ khám: {time}
Địa điểm: {location}

LƯU Ý:
-------------------
- Vui lòng đến trước giờ hẹn 15 phút để làm thủ tục.
- Mang theo giấy tờ tùy thân và thẻ bảo hiểm y tế (nếu có).
- Nếu cần hủy hoặc thay đổi lịch, vui lòng thông báo trước ít nhất 24 giờ.

Bạn có thể quản lý lịch hẹn tại: http://localhost:3000/appointments

Cảm ơn bạn đã tin tưởng Healthcare AI.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Xác nhận đặt lịch khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #10b981; margin-bottom: 20px; }}
        .header h1 {{ color: #059669; margin: 0; font-size: 24px; }}
        .appointment-card {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 20px 0; border-radius: 4px; }}
        .info-row {{ padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; }}
        .info-row:last-child {{ border-bottom: none; }}
        .info-label {{ font-weight: bold; color: #4b5563; width: 120px; display: inline-block; }}
        .info-value {{ color: #111827; flex: 1; }}
        .notice {{ background: #fffbeb; border: 1px solid #fcd34d; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #92400e; }}
        .button {{ display: inline-block; background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background-color: #059669; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Đặt lịch thành công</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Lịch hẹn của bạn đã được hệ thống xác nhận.</p>
            
            <div class="appointment-card">
                <h3 style="margin-top: 0; color: #15803d; border-bottom: 1px solid #bbf7d0; padding-bottom: 10px;">THÔNG TIN LỊCH HẸN</h3>
                
                <div class="info-row">
                    <span class="info-label">Bác sĩ:</span>
                    <span class="info-value">{doctor_name}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Chuyên khoa:</span>
                    <span class="info-value">{specialty}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Ngày khám:</span>
                    <span class="info-value">{date_formatted}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Giờ khám:</span>
                    <span class="info-value">{time}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Địa điểm:</span>
                    <span class="info-value">{location}</span>
                </div>
            </div>
            
            <div class="notice">
                <strong>LƯU Ý:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Vui lòng đến trước giờ hẹn 15 phút để làm thủ tục.</li>
                    <li>Mang theo giấy tờ tùy thân và thẻ bảo hiểm y tế.</li>
                    <li>Thông báo trước ít nhất 24 giờ nếu cần hủy lịch.</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:3000/appointments" class="button">Quản lý lịch hẹn</a>
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="appointment_confirmation",
            to=to,
            patient_id=patient_id,
            appointment_id=appointment_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send appointment confirmation email",
            metadata=appointment_data
        )
    
    return success


def send_appointment_booked_email(to, full_name, appointment_data, patient_id=None, appointment_id=None):
    """
    Send email when patient books appointment (Clean version)
    """
    doctor_name = appointment_data.get('doctor_name', 'Bác sĩ')
    date = appointment_data.get('date', '')
    time = appointment_data.get('time', '')
    specialty_code = appointment_data.get('specialty', '')
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    location = appointment_data.get('location', 'Phòng khám Healthcare AI')
    
    try:
        if isinstance(date, str):
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            date_formatted = date_obj.strftime("%d/%m/%Y")
        else:
            date_formatted = date.strftime("%d/%m/%Y") if hasattr(date, 'strftime') else str(date)
    except:
        date_formatted = str(date)
    
    subject = f"[Healthcare AI] Đã đặt lịch khám - {date_formatted}"
    
    plain_content = f"""
Xin chào {full_name},

Bạn đã đặt lịch khám thành công. Lịch hẹn của bạn đang chờ bác sĩ xác nhận.

THÔNG TIN LỊCH HẸN:
-------------------
Bác sĩ: {doctor_name}
Chuyên khoa: {specialty}
Ngày khám: {date_formatted}
Giờ khám: {time}
Địa điểm: {location}
Trạng thái: Đang chờ xác nhận

LƯU Ý:
- Bạn sẽ nhận được email xác nhận khi bác sĩ xác nhận lịch hẹn.
- Nếu cần hủy hoặc thay đổi lịch, vui lòng thông báo trước ít nhất 24 giờ.

Cảm ơn bạn đã tin tưởng Healthcare AI.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đã đặt lịch khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 20px; }}
        .header h1 {{ color: #2563eb; margin: 0; font-size: 24px; }}
        .appointment-card {{ background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 20px 0; border-radius: 4px; }}
        .info-row {{ padding: 8px 0; border-bottom: 1px solid #e5e7eb; display: flex; }}
        .info-row:last-child {{ border-bottom: none; }}
        .info-label {{ font-weight: bold; color: #4b5563; width: 120px; display: inline-block; }}
        .info-value {{ color: #111827; flex: 1; }}
        .status-badge {{ display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; text-transform: uppercase; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Đã đặt lịch khám</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Bạn đã đặt lịch khám thành công. Lịch hẹn của bạn đang chờ bác sĩ xác nhận.</p>
            
            <div class="appointment-card">
                <h3 style="margin-top: 0; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 10px;">THÔNG TIN LỊCH HẸN</h3>
                
                <div class="info-row">
                    <span class="info-label">Bác sĩ:</span>
                    <span class="info-value">{doctor_name}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Chuyên khoa:</span>
                    <span class="info-value">{specialty}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Ngày khám:</span>
                    <span class="info-value">{date_formatted}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Giờ khám:</span>
                    <span class="info-value">{time}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Địa điểm:</span>
                    <span class="info-value">{location}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Trạng thái:</span>
                    <span class="info-value"><span class="status-badge">Đang chờ xác nhận</span></span>
                </div>
            </div>
            
            <p><strong>Lưu ý:</strong> Bạn sẽ nhận được email xác nhận ngay khi bác sĩ phản hồi.</p>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="appointment_booked",
            to=to,
            patient_id=patient_id,
            appointment_id=appointment_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send appointment booked email",
            metadata=appointment_data
        )
    
    return success


def send_post_consultation_email(to, full_name, appointment_data, rating_url=None, patient_id=None, appointment_id=None, doctor_id=None):
    """
    Send post-consultation email requesting doctor rating (Clean version)
    """
    doctor_name = appointment_data.get('doctor_name', 'Bác sĩ')
    date = appointment_data.get('date', '')
    specialty_code = appointment_data.get('specialty', '')
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    
    if not rating_url and appointment_id:
        rating_url = f"http://localhost:3000/appointments/{appointment_id}/rate"
    elif not rating_url:
        rating_url = "http://localhost:3000/appointments"
    
    try:
        if isinstance(date, str):
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            date_formatted = date_obj.strftime("%d/%m/%Y")
        else:
            date_formatted = date.strftime("%d/%m/%Y") if hasattr(date, 'strftime') else str(date)
    except:
        date_formatted = str(date)
    
    subject = f"[Healthcare AI] Đánh giá buổi khám với {doctor_name}"
    
    plain_content = f"""
Xin chào {full_name},

Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của Healthcare AI.

Buổi khám của bạn với {doctor_name} ({specialty}) vào ngày {date_formatted} đã hoàn thành.

Chúng tôi rất mong nhận được đánh giá của bạn về chất lượng dịch vụ và bác sĩ để không ngừng cải thiện chất lượng chăm sóc sức khỏe.

Vui lòng dành vài phút để đánh giá tại: {rating_url}

Cảm ơn bạn đã đồng hành cùng Healthcare AI.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đánh giá buổi khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #7c3aed; margin-bottom: 20px; }}
        .header h1 {{ color: #7c3aed; margin: 0; font-size: 24px; }}
        .appointment-summary {{ background: #f5f3ff; border: 1px solid #ddd6fe; padding: 20px; margin: 20px 0; border-radius: 4px; }}
        .button {{ display: inline-block; background-color: #7c3aed; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .button:hover {{ background-color: #6d28d9; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Cảm ơn bạn</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Cảm ơn bạn đã sử dụng dịch vụ của Healthcare AI.</p>
            
            <div class="appointment-summary">
                <p style="margin: 0;"><strong>Buổi khám đã hoàn thành:</strong></p>
                <p style="margin: 5px 0 0 0;">
                    {doctor_name} ({specialty})<br>
                    Ngày: {date_formatted}
                </p>
            </div>
            
            <p>Chúng tôi rất mong nhận được đánh giá của bạn về chất lượng dịch vụ.</p>
            
            <div style="text-align: center;">
                <a href="{rating_url}" class="button">Đánh giá ngay</a>
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="post_consultation",
            to=to,
            patient_id=patient_id,
            appointment_id=appointment_id,
            doctor_id=doctor_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send post-consultation email",
            metadata=appointment_data
        )
    
    return success


def send_appointment_reschedule_email(to, full_name, old_appointment_data, new_appointment_data, patient_id=None, old_appointment_id=None, new_appointment_id=None):
    """
    Send appointment reschedule confirmation email (Clean version)
    """
    doctor_name = new_appointment_data.get('doctor_name', 'Bác sĩ')
    old_date = old_appointment_data.get('date', '')
    old_time = old_appointment_data.get('time', '')
    new_date = new_appointment_data.get('date', '')
    new_time = new_appointment_data.get('time', '')
    specialty_code = new_appointment_data.get('specialty', '')
    location = new_appointment_data.get('location', 'Phòng khám Healthcare AI')
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    
    try:
        if isinstance(old_date, str):
            old_date_obj = datetime.strptime(old_date, "%Y-%m-%d")
            old_date_formatted = old_date_obj.strftime("%d/%m/%Y")
        else:
            old_date_formatted = old_date.strftime("%d/%m/%Y") if hasattr(old_date, 'strftime') else str(old_date)
    except:
        old_date_formatted = str(old_date)
    
    try:
        if isinstance(new_date, str):
            new_date_obj = datetime.strptime(new_date, "%Y-%m-%d")
            new_date_formatted = new_date_obj.strftime("%d/%m/%Y")
        else:
            new_date_formatted = new_date.strftime("%d/%m/%Y") if hasattr(new_date, 'strftime') else str(new_date)
    except:
        new_date_formatted = str(new_date)
    
    subject = f"[Healthcare AI] Xác nhận đổi lịch khám - {new_date_formatted}"
    
    plain_content = f"""
Xin chào {full_name},

Lịch khám của bạn đã được thay đổi thành công.

LỊCH HẸN CŨ:
Bác sĩ: {doctor_name}
Ngày khám: {old_date_formatted}
Giờ khám: {old_time}

LỊCH HẸN MỚI:
Bác sĩ: {doctor_name}
Ngày khám: {new_date_formatted}
Giờ khám: {new_time}
Địa điểm: {location}

Vui lòng đến đúng giờ để được phục vụ tốt nhất.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Xác nhận đổi lịch khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 20px; }}
        .header h1 {{ color: #2563eb; margin: 0; font-size: 24px; }}
        .old-appointment {{ background: #fef2f2; padding: 15px; margin: 10px 0; border-radius: 4px; border: 1px solid #fecaca; opacity: 0.8; }}
        .new-appointment {{ background: #eff6ff; padding: 15px; margin: 10px 0; border-radius: 4px; border: 1px solid #bfdbfe; }}
        .info-row {{ margin-bottom: 5px; }}
        .button {{ display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Đổi lịch thành công</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Lịch khám của bạn đã được cập nhật.</p>
            
            <div class="old-appointment">
                <strong style="color: #b91c1c;">LỊCH HẸN CŨ:</strong>
                <div class="info-row">Bác sĩ: {doctor_name}</div>
                <div class="info-row">Ngày: {old_date_formatted} - Giờ: {old_time}</div>
            </div>
            
            <div style="text-align: center; font-size: 20px; color: #3b82f6; margin: 10px 0;">&darr;</div>
            
            <div class="new-appointment">
                <strong style="color: #1d4ed8;">LỊCH HẸN MỚI:</strong>
                <div class="info-row">Bác sĩ: {doctor_name}</div>
                <div class="info-row">Ngày: {new_date_formatted} - Giờ: {new_time}</div>
                <div class="info-row">Địa điểm: {location}</div>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:3000/patient/appointments" class="button">Quản lý lịch hẹn</a>
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="appointment_reschedule",
            to=to,
            patient_id=patient_id,
            appointment_id=new_appointment_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send appointment reschedule email",
            metadata={"old_appointment": old_appointment_data, "new_appointment": new_appointment_data}
        )
    
    return success


def send_appointment_cancellation_email(to, full_name, appointment_data, patient_id=None, appointment_id=None, cancelled_by=None):
    """
    Send appointment cancellation email (Clean version)
    """
    doctor_name = appointment_data.get('doctor_name', 'Bác sĩ')
    date = appointment_data.get('date', '')
    time = appointment_data.get('time', '')
    specialty_code = appointment_data.get('specialty', '')
    cancellation_reason = appointment_data.get('cancellation_reason', 'Không có lý do cụ thể')
    location = appointment_data.get('location', 'Phòng khám Healthcare AI')
    
    cancelled_by_role = cancelled_by or appointment_data.get('cancelled_by', 'system')
    is_doctor_cancelled = cancelled_by_role == 'doctor'
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    
    try:
        if isinstance(date, str):
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            date_formatted = date_obj.strftime("%d/%m/%Y")
        else:
            date_formatted = date.strftime("%d/%m/%Y") if hasattr(date, 'strftime') else str(date)
    except:
        date_formatted = str(date)
    
    subject = f"[Healthcare AI] {'Bác sĩ hủy lịch khám' if is_doctor_cancelled else 'Hủy lịch khám'} - {date_formatted}"
    
    cancellation_message = (
        f"Bác sĩ {doctor_name} đã hủy lịch khám của bạn" if is_doctor_cancelled
        else "Lịch khám của bạn đã bị hủy"
    )
    
    plain_content = f"""
Xin chào {full_name},

Chúng tôi rất tiếc thông báo rằng {cancellation_message}.

THÔNG TIN LỊCH HẸN ĐÃ HỦY:
--------------------------
Bác sĩ: {doctor_name}
Ngày khám: {date_formatted}
Giờ khám: {time}
Lý do hủy: {cancellation_reason}

Bạn có thể đặt lịch khám mới tại website của chúng tôi.

Trân trọng,
Đội ngũ Healthcare AI
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hủy lịch khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #ef4444; margin-bottom: 20px; }}
        .header h1 {{ color: #dc2626; margin: 0; font-size: 24px; }}
        .appointment-card {{ background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 20px 0; border-radius: 4px; }}
        .info-row {{ padding: 5px 0; }}
        .button {{ display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Lịch khám đã bị hủy</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Chúng tôi rất tiếc thông báo rằng <strong>{cancellation_message}</strong>.</p>
            
            <div class="appointment-card">
                <div class="info-row"><strong>Bác sĩ:</strong> {doctor_name}</div>
                <div class="info-row"><strong>Chuyên khoa:</strong> {specialty}</div>
                <div class="info-row"><strong>Thời gian:</strong> {time} - {date_formatted}</div>
                <div class="info-row" style="margin-top: 10px; color: #b91c1c;"><strong>Lý do hủy:</strong> {cancellation_reason}</div>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:3000/appointments" class="button">Đặt lịch khám mới</a>
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="appointment_cancellation",
            to=to,
            patient_id=patient_id,
            appointment_id=appointment_id,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send appointment cancellation email",
            metadata=appointment_data
        )
    
    return success


def test_email_connection():
    """Test email connection"""
    try:
        print("Testing email connection...")
        print(f"SMTP Host: {EMAIL_HOST}")
        print(f"SMTP Port: {EMAIL_PORT}")
        print(f"Email Username: {EMAIL_USERNAME}")
        
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        server.quit()
        
        print("Email connection successful!")
        return True
    except Exception as e:
        print(f"Email connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_consultation_completed_email(to, full_name, appointment_data, patient_id=None, appointment_id=None, ehr_record_id=None):
    """
    Send consultation completed email (Clean version)
    """
    doctor_name = appointment_data.get('doctor_name', 'Bác sĩ')
    date = appointment_data.get('date', '')
    specialty_code = appointment_data.get('specialty', '')
    diagnosis = appointment_data.get('diagnosis', '')
    prescription = appointment_data.get('prescription', [])
    has_prescription = prescription and len(prescription) > 0
    specialty = get_specialty_name(specialty_code) if specialty_code else 'Đa khoa'
    
    records_url = f"http://localhost:3000/patient/records"
    if appointment_id:
        records_url = f"http://localhost:3000/patient/records?appointment_id={appointment_id}"
    
    try:
        if isinstance(date, str):
            date_obj = datetime.strptime(date, "%Y-%m-%d")
            date_formatted = date_obj.strftime("%d/%m/%Y")
        else:
            date_formatted = date.strftime("%d/%m/%Y") if hasattr(date, 'strftime') else str(date)
    except:
        date_formatted = str(date)
    
    subject = f"[Healthcare AI] Đã hoàn thành khám - Xem kết quả và đơn thuốc"
    
    plain_content = f"""
Xin chào {full_name},

Buổi khám của bạn với {doctor_name} ({specialty}) vào ngày {date_formatted} đã hoàn thành.

Bạn có thể xem thông tin sau khám, chẩn đoán, và đơn thuốc tại: {records_url}
"""
    
    if has_prescription:
        plain_content += "\nĐƠN THUỐC:\n----------\n"
        for idx, med in enumerate(prescription, 1):
            med_name = med.get('name', 'N/A')
            med_dosage = med.get('dosage', 'N/A')
            med_frequency = med.get('frequency', 'N/A')
            med_duration = med.get('duration', 'N/A')
            plain_content += f"{idx}. {med_name} ({med_dosage}, {med_frequency}, {med_duration})\n"
    
    plain_content += f"\nTrân trọng,\nĐội ngũ Healthcare AI"
    
    # HTML version
    prescription_html = ""
    if has_prescription:
        prescription_html = """
            <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #92400e; margin-top: 0;">Đơn thuốc</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; background: #fef3c7;">
                            <th style="padding: 8px;">Thuốc</th>
                            <th style="padding: 8px;">Liều lượng</th>
                            <th style="padding: 8px;">Cách dùng</th>
                        </tr>
                    </thead>
                    <tbody>
"""
        for med in prescription:
            med_name = med.get('name', 'N/A')
            med_dosage = med.get('dosage', 'N/A')
            med_info = f"{med.get('frequency', '')} - {med.get('duration', '')}"
            prescription_html += f"""
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{med_name}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{med_dosage}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{med_info}</td>
                        </tr>
"""
        prescription_html += """
                    </tbody>
                </table>
            </div>
"""
    
    diagnosis_html = ""
    if diagnosis:
        diagnosis_html = f"""
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="color: #1e40af; margin-top: 0;">Chẩn đoán</h3>
                <p style="margin: 0; color: #1e3a8a;">{diagnosis}</p>
            </div>
"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Đã hoàn thành khám</title>
    <style>
        body {{ font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }}
        .content {{ background: white; padding: 30px; border-radius: 4px; border: 1px solid #e5e7eb; }}
        .header {{ padding-bottom: 20px; border-bottom: 2px solid #10b981; margin-bottom: 20px; }}
        .header h1 {{ color: #059669; margin: 0; font-size: 24px; }}
        .info-box {{ background: #f3f4f6; padding: 15px; border-radius: 4px; margin-bottom: 20px; }}
        .button {{ display: inline-block; background-color: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <div class="header">
                <h1>Đã hoàn thành khám</h1>
            </div>
            
            <p>Xin chào <strong>{full_name}</strong>,</p>
            
            <p>Buổi khám của bạn đã hoàn thành.</p>
            
            <div class="info-box">
                <strong>Bác sĩ:</strong> {doctor_name}<br>
                <strong>Chuyên khoa:</strong> {specialty}<br>
                <strong>Ngày:</strong> {date_formatted}
            </div>
            
            {diagnosis_html}
            
            {prescription_html}
            
            <div style="text-align: center;">
                <a href="{records_url}" class="button">Xem chi tiết bệnh án</a>
            </div>
            
            <div class="footer">
                <p>Trân trọng,<br>Đội ngũ Healthcare AI</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
    
    success = send_email(to, subject, plain_content, html_content)
    
    if EmailLogModel:
        EmailLogModel.log_email(
            email_type="consultation_completed",
            to=to,
            patient_id=patient_id,
            appointment_id=appointment_id,
            doctor_id=None,
            status="sent" if success else "failed",
            error_message=None if success else "Failed to send consultation completed email",
            metadata={
                **appointment_data,
                "ehr_record_id": str(ehr_record_id) if ehr_record_id else None
            }
        )
    
    return success


# Test function
if __name__ == "__main__":
    print("=" * 60)
    print("EMAIL SERVICE TEST (CLEAN VERSION)")
    print("=" * 60)
    test_email_connection()