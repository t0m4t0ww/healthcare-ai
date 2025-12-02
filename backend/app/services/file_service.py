# app/services/email_service.py
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os

# Import config
try:
    from app.config import EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD
except ImportError:
    # Fallback values
    EMAIL_HOST = "smtp.gmail.com"
    EMAIL_PORT = 587
    EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "your-email@gmail.com")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")

def send_email(to, subject, content, html_content=None, attachments=None):
    """
    Send email using Gmail SMTP
    
    Args:
        to (str): Recipient email
        subject (str): Email subject
        content (str): Plain text content
        html_content (str, optional): HTML content
        attachments (list, optional): List of file paths to attach
    
    Returns:
        bool: True if sent successfully, False otherwise
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
        
        # Create SMTP session
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()  # Enable TLS encryption
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_USERNAME, to, text)
        server.quit()
        
        print(f"Email sent successfully to {to}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"SMTP Authentication Error: {e}")
        print("Check your Gmail credentials and App Password")
        return False
        
    except smtplib.SMTPRecipientsRefused as e:
        print(f"Recipient refused: {e}")
        return False
        
    except smtplib.SMTPServerDisconnected as e:
        print(f"SMTP Server disconnected: {e}")
        return False
        
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def send_verification_email(to, full_name, verification_token):
    """Send account verification email"""
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
    
    # HTML version (professional looking)
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Xác nhận đăng ký tài khoản</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }}
        .header h1 {{ color: white; margin: 0; }}
        .header p {{ color: white; margin: 10px 0 0 0; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }}
        .footer p {{ color: #666; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🩺 Healthcare AI</h1>
            <p>Xác nhận đăng ký tài khoản</p>
        </div>
        
        <h2>Xin chào {full_name},</h2>
        
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Healthcare AI</strong>!</p>
        
        <p>Để hoàn tất đăng ký, vui lòng nhấp vào nút bên dưới để xác nhận địa chỉ email:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" class="button">Xác nhận email</a>
        </div>
        
        <p><strong>Lưu ý:</strong> Liên kết này có hiệu lực trong vòng <strong>24 giờ</strong>.</p>
        
        <p>Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
        
        <div class="footer">
            <p>
                Trân trọng,<br>
                <strong>Đội ngũ Healthcare AI</strong>
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to, subject, plain_content, html_content)

def send_password_reset_email(to, full_name, reset_token):
    """Send password reset email"""
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
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px; }}
        .header h1 {{ color: white; margin: 0; }}
        .header p {{ color: white; margin: 10px 0 0 0; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }}
        .footer p {{ color: #666; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Healthcare AI</h1>
            <p>Đặt lại mật khẩu</p>
        </div>
        
        <h2>Xin chào {full_name},</h2>
        
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>Healthcare AI</strong>.</p>
        
        <p>Nhấp vào nút bên dưới để đặt lại mật khẩu:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" class="button">🔑 Đặt lại mật khẩu</a>
        </div>
        
        <p><strong>Lưu ý:</strong> Liên kết này có hiệu lực trong vòng <strong>1 giờ</strong>.</p>
        
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        
        <div class="footer">
            <p>
                Trân trọng,<br>
                <strong>Đội ngũ Healthcare AI</strong>
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    return send_email(to, subject, plain_content, html_content)

def test_email_connection():
    """Test email connection and configuration"""
    try:
        print("Testing email connection...")
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        server.quit()
        print("Email connection successful!")
        return True
    except Exception as e:
        print(f"Email connection failed: {e}")
        return False

# Test function
if __name__ == "__main__":
    # Test email configuration
    if test_email_connection():
        # Send test email
        test_result = send_email(
            to="your-test-email@gmail.com",  # Thay bằng email test
            subject="Test Email from Healthcare AI",
            content="This is a test email to verify email configuration works!",
            html_content="<h1>Test Email</h1><p>This is a <strong>test email</strong> to verify email configuration works!</p>"
        )
        print(f"Test email result: {test_result}")
    else:
        print("Email configuration test failed!")