// Landing Page Data Constants
import {
  Calendar, Clock, Users, Stethoscope, Brain, Shield,
  CheckCircle, Star, Heart, Award, Globe
} from "lucide-react";

// Features Section
export const FEATURES = [
  {
    icon: Calendar,
    title: "Đặt lịch dễ dàng",
    desc: "Đặt lịch khám trực tuyến 24/7, chọn bác sĩ và thời gian phù hợp"
  },
  {
    icon: Brain,
    title: "AI hỗ trợ chẩn đoán",
    desc: "Công nghệ AI tiên tiến hỗ trợ phân tích X-quang và chẩn đoán nhanh chóng"
  },
  {
    icon: Shield,
    title: "Bảo mật tuyệt đối",
    desc: "Hồ sơ bệnh án điện tử được mã hóa và bảo mật theo tiêu chuẩn y tế"
  },
  {
    icon: Clock,
    title: "Tiết kiệm thời gian",
    desc: "Quy trình tối ưu giúp giảm thời gian chờ đợi và tăng hiệu quả khám chữa"
  }
];

// Stats Section
export const STATS = [
  { label: "Bệnh nhân", value: "2,500+", icon: Users },
  { label: "Bác sĩ", value: "15+", icon: Stethoscope },
  { label: "Lượt khám", value: "5,000+", icon: Calendar },
  { label: "Độ hài lòng", value: "98%", icon: Heart }
];

// Testimonials Section - Using real images
import tranvanhungImg from "../assets/tranvanhung.png";
import bslethihoaImg from "../assets/bslethihoa.png";
import nguyenthimaiImg from "../assets/nguyenthimai.png";
import danhgiaImg from "../assets/danhgia.png";
import danhgia1Img from "../assets/danhgia1.png";

export const TESTIMONIALS = [
  {
    name: "Chị Nguyễn Thị Mai",
    role: "Bệnh nhân",
    content: "Đặt lịch rất tiện lợi, bác sĩ tư vấn tận tình. Hệ thống AI giúp phát hiện sớm vấn đề sức khỏe của tôi. Tôi rất hài lòng với dịch vụ chăm sóc sức khỏe tại đây.",
    rating: 5,
    avatar: nguyenthimaiImg,
    tags: ["Thân thiện", "Chuyên nghiệp", "Nhanh chóng"]
  },
  {
    name: "Anh Trần Văn Hùng",
    role: "Bệnh nhân",
    content: "Không cần xếp hàng lâu, kết quả X-quang có ngay. Rất hài lòng với dịch vụ tại đây. Bác sĩ giải thích rõ ràng và tận tâm.",
    rating: 5,
    avatar: tranvanhungImg,
    tags: ["Hiệu quả", "Chính xác", "Tận tâm"]
  },
  {
    name: "BS. Lê Thị Hoa",
    role: "Bác sĩ Tim mạch",
    content: "Hệ thống hỗ trợ AI giúp tôi chẩn đoán nhanh và chính xác hơn. Giao diện thân thiện, dễ sử dụng. Công nghệ này thực sự hỗ trợ tốt cho công việc của tôi.",
    rating: 5,
    avatar: bslethihoaImg,
    tags: ["Công nghệ", "Hiện đại", "Hữu ích"]
  },
  {
    name: "Chị Phạm Thị Lan",
    role: "Bệnh nhân",
    content: "Quy trình đặt lịch rất đơn giản, không mất nhiều thời gian. Bác sĩ rất tận tâm và chuyên nghiệp. Tôi sẽ giới thiệu cho bạn bè và người thân.",
    rating: 5,
    avatar: danhgiaImg,
    tags: ["Đơn giản", "Tận tâm", "Đáng tin cậy"]
  },
  {
    name: "Anh Lê Văn Đức",
    role: "Bệnh nhân",
    content: "Dịch vụ chăm sóc sức khỏe tuyệt vời. Hệ thống AI phân tích X-quang rất chính xác. Tôi cảm thấy an tâm khi sử dụng dịch vụ tại đây.",
    rating: 5,
    avatar: danhgia1Img,
    tags: ["Chính xác", "An toàn", "Chất lượng"]
  }
];

// Doctors Data
export const DOCTORS = [
  { 
    id: 1, 
    name: "BS. Nguyễn Minh An", 
    role: "Bác sĩ Nội hô hấp", 
    yearsOfExperience: 15, 
    specialtyTag: "Nội hô hấp", 
    image: require("../assets/bs1.jpg") 
  },
  { 
    id: 2, 
    name: "BSCKI. Trần Thu Hà", 
    role: "Bác sĩ Nội tim mạch", 
    yearsOfExperience: 12, 
    specialtyTag: "Nội tim mạch", 
    image: require("../assets/bs2.jpg"), 
    featured: true 
  },
  { 
    id: 3, 
    name: "BS. Lê Hoàng Dũng", 
    role: "Bác sĩ Nội tiêu hóa", 
    yearsOfExperience: 10, 
    specialtyTag: "Nội tiêu hóa", 
    image: require("../assets/bs3.jpg") 
  },
  { 
    id: 4, 
    name: "BS. Phạm Thị Mai", 
    role: "Bác sĩ Nội thận", 
    yearsOfExperience: 8, 
    specialtyTag: "Nội thận", 
    image: require("../assets/bs4.jpg") 
  },
  { 
    id: 5, 
    name: "BSCKII. Vũ Quang Hải", 
    role: "Bác sĩ Nội hô hấp", 
    yearsOfExperience: 18, 
    specialtyTag: "Nội hô hấp", 
    image: require("../assets/bs5.jpg"), 
    featured: true 
  },
  { 
    id: 6, 
    name: "BS. Đỗ Thị Lan", 
    role: "Bác sĩ Nội tiêu hóa", 
    yearsOfExperience: 9, 
    specialtyTag: "Nội tiêu hóa", 
    image: require("../assets/bs6.jpg") 
  },
  { 
    id: 7, 
    name: "BS. Hoàng Văn Tuấn", 
    role: "Bác sĩ Nội tim mạch", 
    yearsOfExperience: 11, 
    specialtyTag: "Nội tim mạch", 
    image: require("../assets/bs7.jpg") 
  },
  { 
    id: 8, 
    name: "BS. Bùi Thị Ngọc", 
    role: "Bác sĩ Nội thận", 
    yearsOfExperience: 7, 
    specialtyTag: "Nội thận", 
    image: require("../assets/bs8.jpg") 
  }
];

// Specialties Data
export const INTERNAL_MEDICINE_SPECIALTIES = [
  { 
    id: 1, 
    name: "Nội hô hấp", 
    shortDescription: "Chẩn đoán và điều trị các bệnh lý về đường hô hấp, phổi, viêm phế quản.", 
    image: require("../assets/noihohap.jpg") 
  },
  { 
    id: 2, 
    name: "Nội tim mạch", 
    shortDescription: "Khám và điều trị bệnh tim, huyết áp, rối loạn mạch máu và nhịp tim.", 
    image: require("../assets/noitimmach.jpg") 
  },
  { 
    id: 3, 
    name: "Nội tiêu hóa – Gan mật", 
    shortDescription: "Điều trị các bệnh dạ dày, ruột, gan, mật và đường tiêu hóa.", 
    image: require("../assets/noitieuhoa.jpg") 
  },
  { 
    id: 4, 
    name: "Nội thận – Tiết niệu", 
    shortDescription: "Chăm sóc và điều trị bệnh thận, tiết niệu, rối loạn chức năng thận.", 
    image: require("../assets/noithantietnieu.png") 
  }
];

// How It Works Steps
export const HOW_IT_WORKS = [
  { 
    step: 1, 
    title: "Chọn bác sĩ", 
    desc: "Tìm kiếm và chọn bác sĩ phù hợp với chuyên khoa bạn cần", 
    icon: Stethoscope 
  },
  { 
    step: 2, 
    title: "Chọn ngày & giờ", 
    desc: "Xem lịch trống và chọn thời gian khám thuận tiện", 
    icon: Calendar 
  },
  { 
    step: 3, 
    title: "Giữ chỗ 2 phút", 
    desc: "Hệ thống giữ slot cho bạn trong 2 phút để xác nhận", 
    icon: Clock 
  },
  { 
    step: 4, 
    title: "Xác nhận & nhận thông báo", 
    desc: "Hoàn tất đặt lịch và nhận email/SMS xác nhận", 
    icon: CheckCircle 
  }
];

// Opening Hours
export const OPENING_HOURS = [
  { day: "Thứ 2 - Thứ 6", time: "8:00 - 17:00" },
  { day: "Thứ 7", time: "8:00 - 12:00" },
  { day: "Chủ nhật", time: "Đóng cửa" }
];

// Certifications & Awards
export const CERTIFICATIONS = [
  { name: "ISO 27001", desc: "Bảo mật thông tin", icon: Shield },
  { name: "HIPAA", desc: "Tuân thủ y tế", icon: CheckCircle },
  { name: "AI Innovation", desc: "Top Healthcare 2024", icon: Brain },
  { name: "Digital Award", desc: "Vietnam Health", icon: Globe }
];

// Contact Info
export const CONTACT_INFO = {
  phone: "1900 - 115",
  email: "support@healthcare.vn",
  emergencyPhone: "(+84) 123-456-789"
};

