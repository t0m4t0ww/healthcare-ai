<div align="center">

# Healthcare AI - Hệ Thống Quản Lý Y Tế Thông Minh

![Healthcare AI](https://img.shields.io/badge/Healthcare-AI-0056D2?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![AI](https://img.shields.io/badge/Google_Gemini-AI-FF9900?style=for-the-badge)

### Hệ thống quản lý bệnh viện toàn diện tích hợp AI hỗ trợ chẩn đoán và điều trị

</div>

---

## Mục Lục

- [Giới Thiệu](#giới-thiệu)
- [Tính Năng Chính](#tính-năng-chính)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Cơ Sở Dữ Liệu](#cơ-sở-dữ-liệu)
- [Thông Tin Dự Án](#thông-tin-dự-án)

---

## Giới Thiệu

**Healthcare AI** là giải pháp chuyển đổi số y tế toàn diện, kết hợp sức mạnh của Generative AI và Computer Vision để giải quyết các bài toán cốt lõi trong quản lý bệnh viện:

- **Hỗ trợ chuyên môn:** Cung cấp "Second Opinion" cho bác sĩ trong chẩn đoán phân biệt dựa trên triệu chứng và lâm sàng
- **Chuẩn hóa quy trình:** Áp dụng format SOAP (Subjective, Objective, Assessment, Plan) điện tử chuẩn y khoa
- **Tối ưu vận hành:** Quản lý lịch hẹn thông minh, hồ sơ bệnh án điện tử (EHR) và kết nối thời gian thực
- **Phân tích hình ảnh:** Tự động phát hiện và phân tích bất thường trên X-quang/CT scan bằng AI

### Điểm Nổi Bật

- AI Medical Copilot hỗ trợ chẩn đoán cho bác sĩ
- Hỗ trợ đa chuyên khoa (Nội, Nhi, Sản)
- Giao tiếp real-time qua Socket.IO
- Bảo mật dữ liệu y tế theo chuẩn HIPAA
- Giao diện responsive trên mọi thiết bị

---

## Tính Năng Chính

### AI Medical Assistant

#### Doctor AI Copilot
- Chẩn đoán phân biệt tự động dựa trên triệu chứng lâm sàng
- Đề xuất xét nghiệm cần thiết theo guideline y khoa
- Gợi ý phác đồ điều trị phù hợp với từng bệnh
- Cảnh báo dấu hiệu nguy hiểm (Red flags warning)
- Tích hợp với thông tin phiên khám (Context-aware)

#### X-ray Analysis AI
- Phát hiện bất thường bằng YOLO v8 model
- Phân tích chi tiết hình ảnh qua Gemini Vision AI
- Tự động tạo báo cáo kết quả chuyên môn
- Tích hợp liền mạch vào quy trình khám bệnh

#### Patient AI Assistant
- Giải thích hồ sơ bệnh án bằng ngôn ngữ dễ hiểu
- Tư vấn sức khỏe cơ bản 24/7
- Nhắc nhở tái khám và lịch uống thuốc tự động
- Kiểm soát an toàn (không thay thế bác sĩ)

### Doctor Portal

- **Dashboard:** Tổng quan lịch làm việc và công việc hôm nay
- **Consultation:** Giao diện khám bệnh chuẩn SOAP format
- **EHR Management:** Quản lý hồ sơ bệnh án điện tử
- **AI Assistant:** Trợ lý AI hỗ trợ chẩn đoán
- **X-ray Analysis:** Công cụ phân tích hình ảnh y tế
- **E-Prescription:** Kê đơn thuốc điện tử
- **Schedule Management:** Tạo và quản lý lịch làm việc

### Patient Portal

- **Dashboard:** Theo dõi sức khỏe tổng quan
- **Booking:** Đặt lịch khám online 24/7
- **Medical Records:** Xem hồ sơ bệnh án cá nhân
- **Chat AI:** Tư vấn sức khỏe với AI assistant
- **Appointments:** Quản lý lịch hẹn khám bệnh
- **Download PDF:** Tải hồ sơ khám bệnh định dạng PDF
- **Doctor Ratings:** Đánh giá chất lượng dịch vụ bác sĩ

### Admin Portal

- **Dashboard:** Thống kê và phân tích toàn hệ thống
- **User Management:** Quản lý bác sĩ, bệnh nhân
- **Appointment Management:** Giám sát lịch hẹn toàn viện
- **EHR Management:** Quản lý hồ sơ bệnh án tập trung
- **Reports & Analytics:** Báo cáo thống kê chi tiết
- **System Settings:** Cấu hình và phân quyền hệ thống (RBAC)

---

## Công Nghệ Sử Dụng

### Backend

- **Framework:** Flask 3.0 (Python 3.9+)
- **Database:** MongoDB 5.0+ với PyMongo
- **AI/ML:** Google Gemini AI, YOLO v8, PyTorch, Ultralytics
- **Real-time:** Socket.IO
- **Authentication:** JWT, Bcrypt
- **PDF Generation:** ReportLab
- **Email Service:** SendGrid / Mailgun
- **Validation:** Pydantic
- **Task Scheduler:** APScheduler

### Frontend

- **Framework:** React 18+ với Hooks
- **UI Library:** Ant Design 5
- **Styling:** TailwindCSS + CSS Modules
- **Charts:** Recharts
- **State Management:** Context API
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Real-time:** Socket.IO Client

### DevOps & Security

- **Version Control:** Git
- **Environment Management:** dotenv
- **Security:** JWT Authentication, RBAC, Rate Limiting
- **Testing:** pytest, Jest

---

## Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Admin Portal    │   Doctor Portal   │   Patient Portal     │
│  (React)         │   (React)         │   (React)            │
└────────┬─────────┴──────────┬────────┴──────────┬───────────┘
         │                    │                   │
         └────────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   NGINX/Load      │
                    │   Balancer        │
                    └─────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼─────────┐ ┌───────▼────────┐ ┌────────▼─────────┐
│  Flask Backend   │ │  Socket.IO     │ │  Static Files    │
│  (REST API)      │ │  (Real-time)   │ │  (Images, PDFs)  │
└────────┬─────────┘ └───────┬────────┘ └──────────────────┘
         │                    │
         └────────────────────┼─────────────────────┐
                              │                     │
                    ┌─────────▼─────────┐  ┌─────── ▼───────┐
                    │   MongoDB         │  │  Google Gemini │
                    │   Database        │  │  API + YOLO    │
                    └───────────────────┘  └────────────────┘
```

### Luồng Hoạt Động

1. **Client Layer:** 3 giao diện React tương ứng với 3 vai trò (Admin, Doctor, Patient)
2. **Load Balancer:** NGINX phân phối request và cân bằng tải
3. **Application Layer:** Flask xử lý REST API, Socket.IO xử lý real-time
4. **Data Layer:** MongoDB lưu trữ dữ liệu, Gemini AI + YOLO xử lý AI

---

## Cơ Sở Dữ Liệu

### MongoDB Collections

| Collection | Mô Tả |
|------------|-------|
| `users` | Tài khoản người dùng (Admin, Doctor) |
| `patients` | Thông tin bệnh nhân |
| `doctors` | Hồ sơ bác sĩ và chuyên khoa |
| `appointments` | Lịch hẹn khám bệnh |
| `time_slots` | Khung giờ làm việc của bác sĩ |
| `ehr_records` | Hồ sơ bệnh án điện tử (EHR) |
| `consultations` | Phiên khám bệnh chi tiết |
| `conversations` | Cuộc trò chuyện |
| `messages` | Tin nhắn chat |
| `xray_results` | Kết quả phân tích X-quang |
| `notifications` | Thông báo hệ thống |
| `ratings` | Đánh giá bác sĩ |
| `audit_logs` | Nhật ký truy cập và thay đổi |

---

## Thông Tin Dự Án

### Sinh viên thực hiện

- **Họ tên:** Nguyễn Phạm Thái Bảo
- **MSSV:** 2200006865
- **Lớp:** 22DTH2A
- **Khoa:** Công nghệ thông tin
- **Trường:** Đại học Nguyễn Tất Thành

### Giảng viên hướng dẫn

- **Họ tên:** Đỗ Hoàng Nam
- **Học hàm, học vị:** Thạc sĩ

### Liên hệ

- **Email:** nptb137@gmail.com
- **GitHub:** [@t0m4t0ww](https://github.com/t0m4t0ww)
- **Repository:** [healthcare-ai](https://github.com/t0m4t0ww/healthcare-ai)

---

<div align="center">

**Made with passion for Healthcare**

**Đồ án tốt nghiệp - Năm 2025**

</div>
