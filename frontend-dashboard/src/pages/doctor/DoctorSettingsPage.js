// src/pages/doctor/DoctorSettingsPage.js

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Switch,
  Divider,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  TimePicker,
  List,
  Rate,
  Skeleton,
  Empty,
  Alert,
  Calendar,
  Badge,
  Modal,
  Radio,
  Tooltip
} from "antd";
import { message } from "antd";
import {
  BookOutlined,
  GlobalOutlined,
  BankOutlined,
  TeamOutlined,
  TrophyOutlined,
  ReadOutlined,
  MessageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from "dayjs";
import {
  CalendarClock,
  KeyRound,
  LineChart,
  ShieldCheck,
  Stethoscope,
  User,
  Calendar as CalendarIcon,
  Clock
} from "lucide-react";
import api from "../../services/services";
import ratingService from "../../services/ratingServices";
import { useAuth } from "../../context/AuthContext";
import { getSpecialtyName, getSpecialtyOptions } from "../../constants/specialtyConstants";

const { Title, Paragraph, Text } = Typography;

// --- Constants & Helpers ---

const DAY_LABELS = {
  monday: "Thứ 2",
  tuesday: "Thứ 3",
  wednesday: "Thứ 4",
  thursday: "Thứ 5",
  friday: "Thứ 6",
  saturday: "Thứ 7",
  sunday: "Chủ nhật",
};

const ABBR_DAY_MAP = {
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
  sun: "sunday",
};

const DEFAULT_WORKING_HOURS = {
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "09:00", end: "13:00" },
  sunday: { enabled: false, start: "09:00", end: "13:00" },
};

const normalizeWorkingHours = (raw = {}) => {
  const normalized = JSON.parse(JSON.stringify(DEFAULT_WORKING_HOURS));
  const dayKeys = Object.keys(normalized);
  
  // Check format mới (object {monday: {...}})
  const hasExplicitDayConfig = dayKeys.some(
    (day) => raw?.[day] && typeof raw[day] === "object"
  );

  if (hasExplicitDayConfig) {
    dayKeys.forEach((day) => {
      const entry = raw[day];
      if (entry && entry.start && entry.end) {
        normalized[day] = {
          enabled: entry.enabled !== false,
          start: entry.start,
          end: entry.end,
        };
      } else {
        normalized[day].enabled = false;
      }
    });
    return normalized;
  }

  // Check format cũ (array days + chung start/end)
  const shiftDays = Array.isArray(raw.days) ? raw.days : [];
  if (shiftDays.length && raw.start && raw.end) {
    const mappedDays = shiftDays.map((d) => {
      const key = (d || "").toString().trim().toLowerCase();
      return ABBR_DAY_MAP[key] || key;
    });
    dayKeys.forEach((day) => {
      if (mappedDays.includes(day)) {
        normalized[day] = { enabled: true, start: raw.start, end: raw.end };
      } else {
        normalized[day].enabled = false;
      }
    });
  }

  return normalized;
};

const serializeWorkingHours = (state) => {
  const payload = {};
  Object.entries(state).forEach(([day, config]) => {
    if (config.enabled && config.start && config.end) {
      payload[day] = { start: config.start, end: config.end };
    } else {
      payload[day] = null;
    }
  });
  return payload;
};

const normalizeSpecificSchedule = (schedule = {}) => {
  if (!schedule || typeof schedule !== "object") return {};
  const normalized = {};
  Object.entries(schedule).forEach(([key, value]) => {
    const normalizedKey = dayjs(key).isValid()
      ? dayjs(key).format("YYYY-MM-DD")
      : key;
    normalized[normalizedKey] = value;
  });
  return normalized;
};

// --- Sub-components ---

const WorkingHourRow = ({ day, config, onToggle, onTimeChange }) => {
  const rangeValue =
    config.enabled && config.start && config.end
      ? [dayjs(config.start, "HH:mm"), dayjs(config.end, "HH:mm")]
      : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <Text strong>{DAY_LABELS[day]}</Text>
          <div className="text-xs text-slate-500">
            {config.enabled ? `${config.start} - ${config.end}` : "Nghỉ"}
          </div>
        </div>
        <Switch
          size="small"
          checked={config.enabled}
          onChange={(checked) => onToggle(day, checked)}
        />
      </div>
      {config.enabled && (
        <TimePicker.RangePicker
          className="w-full"
          format="HH:mm"
          minuteStep={15}
          value={rangeValue}
          onChange={(val) => onTimeChange(day, val)}
          placeholder={["Bắt đầu", "Kết thúc"]}
        />
      )}
    </div>
  );
};

// --- Main Component ---

const DoctorSettingsPage = () => {
  const { updateUser } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // --- States ---
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [workingHours, setWorkingHours] = useState(() => normalizeWorkingHours());
  const [savingHours, setSavingHours] = useState(false);

  // ✅ New State: Specific Schedule (Lịch theo ngày)
  const [specificSchedule, setSpecificSchedule] = useState({});
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [dateConfigType, setDateConfigType] = useState('default'); // 'default', 'off', 'custom'
  const [dateCustomTime, setDateCustomTime] = useState([dayjs('08:00', 'HH:mm'), dayjs('17:00', 'HH:mm')]);
  const [savingSpecificDate, setSavingSpecificDate] = useState(false);

  const [acceptingPatients, setAcceptingPatients] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [ratingStats, setRatingStats] = useState(null);
  const [recentRatings, setRecentRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // --- Effects ---
  useEffect(() => {
    loadProfile();
  }, []);

  // --- Data Loading ---

  const loadProfile = async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await api.get("/doctor/me");
      const data = response.data?.data || response.data;
      setDoctorProfile(data);

      // Handle bio fields - support both old (string) and new (structured) format
      const bioData = typeof data.bio === 'object' ? data.bio : {};
      const hasStructuredBio = bioData && Object.keys(bioData).length > 0;

      // Fill Form
      profileForm.setFieldsValue({
        full_name: data.full_name || data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        specialty: data.specialty || "",
        subspecialty: data.subspecialty || "",
        years_of_experience: data.years_of_experience || 0,
        consultation_fee: data.consultation_fee || 500000,
        qualifications: data.qualifications || [],
        languages: data.languages || [],
        // Bio structured fields
        bio_education: hasStructuredBio ? bioData.education : '',
        bio_international_training: hasStructuredBio ? bioData.international_training : '',
        bio_experience: hasStructuredBio ? bioData.experience : '',
        bio_memberships: hasStructuredBio ? bioData.memberships : '',
        bio_awards: hasStructuredBio ? bioData.awards : '',
        bio_publications: hasStructuredBio ? bioData.publications : '',
        bio_summary: hasStructuredBio ? bioData.summary : (typeof data.bio === 'string' ? data.bio : ''),
      });

      // Fill Schedules
      setWorkingHours(normalizeWorkingHours(data.working_hours || data.shift));
      setSpecificSchedule(normalizeSpecificSchedule(data.specific_schedule || {})); // ✅ Load lịch cụ thể từ API

      // Fill Status
      const accepting = typeof data.accepting_new_patients === "boolean"
          ? data.accepting_new_patients
          : (data.status || "active") !== "paused";
      setAcceptingPatients(accepting);

      // Update Context & Ratings
      if (data.full_name) updateUser?.({ name: data.full_name });
      if (data.id || data._id) loadRatings(data.id || data._id);

    } catch (error) {
      const msg = error.response?.data?.message || "Không thể tải hồ sơ bác sĩ.";
      setProfileError(msg);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadRatings = async (doctorId) => {
    setRatingsLoading(true);
    try {
      const [statsRes, ratingsRes] = await Promise.all([
        ratingService.getDoctorRatingStats(doctorId),
        ratingService.getDoctorRatings(doctorId, { limit: 5, sort_by: "new" }),
      ]);

      const statsPayload = statsRes?.data ?? statsRes ?? {};
      const ratingsPayload = ratingsRes?.data ?? ratingsRes ?? {};

      setRatingStats(statsPayload?.stats ?? statsPayload ?? {});
      const latestRatings = Array.isArray(ratingsPayload?.ratings)
        ? ratingsPayload.ratings
        : Array.isArray(ratingsPayload)
        ? ratingsPayload
        : [];

      setRecentRatings(latestRatings);
    } catch (error) {
      console.error("Load ratings error:", error);
      messageApi.error("Không thể tải thống kê đánh giá.");
    } finally {
      setRatingsLoading(false);
    }
  };

  // --- Handlers: Profile & Status ---

  const handleProfileSubmit = async (values) => {
    if (!doctorProfile?._id && !doctorProfile?.id) return;
    setSavingProfile(true);
    try {
      // Build structured bio object
      const bio = {
        education: values.bio_education || '',
        international_training: values.bio_international_training || '',
        experience: values.bio_experience || '',
        memberships: values.bio_memberships || '',
        awards: values.bio_awards || '',
        publications: values.bio_publications || '',
        summary: values.bio_summary || '',
      };

      const payload = {
        ...values,
        name: values.full_name, // Sync name field
        bio, // Replace bio with structured object
        // Remove individual bio fields from payload
        bio_education: undefined,
        bio_international_training: undefined,
        bio_experience: undefined,
        bio_memberships: undefined,
        bio_awards: undefined,
        bio_publications: undefined,
        bio_summary: undefined,
      };
      await api.patch(`/doctors/${doctorProfile._id || doctorProfile.id}`, payload);
      messageApi.success("Đã cập nhật hồ sơ cá nhân.");
      await loadProfile();
    } catch (error) {
      messageApi.error("Không thể cập nhật hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStatusToggle = async (checked) => {
    if (!doctorProfile?._id && !doctorProfile?.id) return;
    setStatusLoading(true);
    setAcceptingPatients(checked); // Optimistic update
    try {
      await api.patch(`/doctors/${doctorProfile._id || doctorProfile.id}`, {
        accepting_new_patients: checked,
        status: checked ? "active" : "paused",
      });
      messageApi.success(checked ? "Đã mở nhận bệnh." : "Đã tạm dừng nhận bệnh.");
      await loadProfile();
    } catch (error) {
      setAcceptingPatients(!checked); // Revert
      messageApi.error("Không thể cập nhật trạng thái.");
    } finally {
      setStatusLoading(false);
    }
  };

  // --- Handlers: Working Hours (Weekly) ---

  const toggleWorkingDay = (day, enabled) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled },
    }));
  };

  const updateWorkingTime = (day, value) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !!value,
        start: value?.[0]?.format("HH:mm") || prev[day].start,
        end: value?.[1]?.format("HH:mm") || prev[day].end,
      },
    }));
  };

  const handleWorkingHoursSave = async () => {
    if (!doctorProfile?._id && !doctorProfile?.id) return;
    setSavingHours(true);
    try {
      await api.patch(`/doctors/${doctorProfile._id || doctorProfile.id}`, {
        working_hours: serializeWorkingHours(workingHours),
      });
      messageApi.success("Đã cập nhật lịch làm việc tuần.");
      await loadProfile();
    } catch (error) {
      messageApi.error("Lỗi cập nhật lịch tuần.");
    } finally {
      setSavingHours(false);
    }
  };

  // --- Handlers: Specific Schedule (Daily Calendar) ---

  const cellRender = (current, info) => {
    // Only render for date cells (not month/year cells)
    if (info.type !== 'date') {
      return info.originNode;
    }
    
    const dateStr = current.format('YYYY-MM-DD');
    const config = specificSchedule[dateStr];

    if (config?.off) {
        return <Badge status="error" text="Nghỉ" />;
    }
    if (config?.start) {
        return (
          <Tooltip title={`${config.start} - ${config.end}`}>
            <Badge status="success" text="Làm việc" />
          </Tooltip>
        );
    }
    return info.originNode;
  };

  const onCalendarSelect = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    setSelectedDateStr(dateStr);
    
    // Determine current config type for this date
    const currentConfig = specificSchedule[dateStr];
    if (currentConfig?.off) {
        setDateConfigType('off');
    } else if (currentConfig?.start) {
        setDateConfigType('custom');
        setDateCustomTime([dayjs(currentConfig.start, 'HH:mm'), dayjs(currentConfig.end, 'HH:mm')]);
    } else {
        setDateConfigType('default');
    }
    
    setCalendarModalOpen(true);
  };

  const handleSaveSpecificDate = async () => {
    if (!selectedDateStr || !doctorProfile?._id) return;
    setSavingSpecificDate(true);
    
    const normalizedKey = dayjs(selectedDateStr).format('YYYY-MM-DD');
    const newSchedule = { ...specificSchedule };
    
    // Update local state based on selection
    if (dateConfigType === 'default') {
        delete newSchedule[normalizedKey]; // Remove overrides
    } else if (dateConfigType === 'off') {
        newSchedule[normalizedKey] = { off: true };
    } else if (dateConfigType === 'custom') {
        newSchedule[normalizedKey] = { 
            off: false,
            start: dateCustomTime[0].format('HH:mm'),
            end: dateCustomTime[1].format('HH:mm')
        };
    }

    try {
      // ✅ Gọi API update trường specific_schedule
      const payloadSchedule = normalizeSpecificSchedule(newSchedule);
      await api.patch(`/doctors/${doctorProfile._id || doctorProfile.id}`, {
          specific_schedule: payloadSchedule
      });
      
      setSpecificSchedule(payloadSchedule);
      messageApi.success(`Đã cập nhật lịch ngày ${selectedDateStr}`);
      setCalendarModalOpen(false);
    } catch (error) {
      console.error(error);
      messageApi.error("Không thể lưu lịch ngày này.");
    } finally {
      setSavingSpecificDate(false);
    }
  };


  // --- Handlers: Password ---

  const handlePasswordSubmit = async (values) => {
    if (values.new_password !== values.confirm_password) {
      messageApi.warning("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      messageApi.success("Đổi mật khẩu thành công.");
      passwordForm.resetFields();
    } catch (error) {
      messageApi.error(error.response?.data?.message || "Lỗi đổi mật khẩu.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- Render Helpers ---

  const ratingDistribution = useMemo(() => {
    if (!ratingStats?.rating_distribution) return [];
    const dist = ratingStats.rating_distribution || {};
    const total = ratingStats?.total_ratings || 0;

    return [5, 4, 3, 2, 1].map((star) => {
      // Handle various backend distribution formats
      let count = 0;
      if (dist[`${star}_star`] != null) count = Number(dist[`${star}_star`]);
      else if (dist[star] != null) count = Number(dist[star]);
      
      return {
        star,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      };
    });
  }, [ratingStats]);


  // --- Render JSX ---

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {contextHolder}

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
        <Space size={16} align="start">
          <ShieldCheck size={32} className="text-emerald-500 mt-1" />
          <div>
            <Title level={2} className="!mb-1">Trung tâm cài đặt bác sĩ</Title>
            <Paragraph className="text-slate-500 dark:text-slate-400 !mb-0 text-base">
              Quản lý hồ sơ, lịch làm việc và theo dõi đánh giá chất lượng dịch vụ.
            </Paragraph>
          </div>
        </Space>
      </div>

      {profileError && (
        <Alert type="error" message="Lỗi tải dữ liệu" description={profileError} showIcon className="rounded-xl" />
      )}

      <Row gutter={[24, 24]}>
        
        {/* Left Column: Profile Form */}
        <Col xs={24} lg={16}>
          <Card
            className="rounded-3xl shadow-sm h-full"
            title={
              <Space>
                <User size={20} className="text-emerald-500" />
                <span>Hồ sơ cá nhân</span>
              </Space>
            }
          >
            {loadingProfile ? <Skeleton active /> : (
              <Form layout="vertical" form={profileForm} onFinish={handleProfileSubmit}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
                      <Input placeholder="BS. Nguyễn Văn A" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="Số điện thoại">
                      <Input placeholder="0909xxxxxx" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="email" label="Email công việc">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="specialty" label="Chuyên khoa">
                      <Select 
                        placeholder="Chọn chuyên khoa"
                        options={getSpecialtyOptions()}
                        showSearch
                        filterOption={(input, option) =>
                          option.label.toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="years_of_experience" label="Kinh nghiệm (năm)">
                      <InputNumber min={0} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="consultation_fee" label="Phí khám (VNĐ)">
                      <InputNumber 
                        className="w-full"
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                 <Form.Item name="languages" label="Ngôn ngữ">
                  <Select mode="tags" placeholder="Tiếng Việt, English..." />
                </Form.Item>

                {/* Bio - Structured Sections */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-4 border border-slate-200 mb-4">
                  <h3 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <FileTextOutlined />
                    <span>Hồ sơ chuyên môn</span>
                  </h3>
                  
                  <Form.Item 
                    label={<span><BookOutlined className="mr-2" />Quá trình đào tạo & Bằng cấp</span>} 
                    name="bio_education"
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder="VD: Bác sĩ Đa khoa - Đại học Y Hà Nội (2005-2011)&#10;Bác sĩ Chuyên khoa II Tim mạch - Bệnh viện Bạch Mai (2011-2015)" 
                      maxLength={1000} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><GlobalOutlined className="mr-2" />Đào tạo nâng cao & Tu nghiệp Quốc tế</span>} 
                    name="bio_international_training"
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder="VD: Fellowship Tim mạch can thiệp - Mayo Clinic, Hoa Kỳ (2016-2018)&#10;Chứng chỉ Tim mạch châu Âu (ESC) - Đức (2019)" 
                      maxLength={1000} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><BankOutlined className="mr-2" />Kinh nghiệm công tác</span>} 
                    name="bio_experience"
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder="VD: Phó Trưởng khoa Tim mạch - Bệnh viện Bạch Mai (2018-2022)&#10;Trưởng khoa Tim mạch - Bệnh viện Đa khoa Quốc tế (2022-nay)" 
                      maxLength={1000} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><TeamOutlined className="mr-2" />Hội viên các hội chuyên ngành</span>} 
                    name="bio_memberships"
                  >
                    <Input.TextArea 
                      rows={2} 
                      placeholder="VD: Hội Tim mạch học Việt Nam&#10;Hiệp hội Tim mạch châu Á - Thái Bình Dương (APSC)&#10;Hội Tim mạch học châu Âu (ESC)" 
                      maxLength={500} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><TrophyOutlined className="mr-2" />Thành tích & Khen thưởng</span>} 
                    name="bio_awards"
                  >
                    <Input.TextArea 
                      rows={2} 
                      placeholder="VD: Bác sĩ xuất sắc toàn quốc (2020)&#10;Giải thưởng Y học Việt Nam (2021)&#10;Huân chương Lao động hạng Ba (2022)" 
                      maxLength={500} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><ReadOutlined className="mr-2" />Công trình khoa học tiêu biểu</span>} 
                    name="bio_publications"
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder="VD: &quot;Nghiên cứu hiệu quả phương pháp can thiệp mạch vành qua da&quot; - The Lancet (2020)&#10;&quot;Đánh giá kết quả điều trị suy tim mãn tính&quot; - JACC (2021)" 
                      maxLength={1000} 
                      showCount 
                    />
                  </Form.Item>

                  <Form.Item 
                    label={<span><MessageOutlined className="mr-2" />Giới thiệu chung (tuỳ chọn)</span>} 
                    name="bio_summary"
                  >
                    <Input.TextArea 
                      rows={2} 
                      placeholder="VD: Với hơn 15 năm kinh nghiệm trong lĩnh vực tim mạch, tôi cam kết mang đến dịch vụ chăm sóc sức khỏe tốt nhất..." 
                      maxLength={500} 
                      showCount 
                    />
                  </Form.Item>
                </div>

                <Button type="primary" htmlType="submit" loading={savingProfile} block size="large" className="mt-2">
                  Lưu thay đổi
                </Button>
              </Form>
            )}
          </Card>
        </Col>

        {/* Right Column: Status & Password */}
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="rounded-3xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <Space>
                    <Stethoscope size={20} className="text-blue-500" />
                    <span className="font-semibold text-lg">Trạng thái</span>
                </Space>
                <Switch 
                    checked={acceptingPatients} 
                    onChange={handleStatusToggle} 
                    loading={statusLoading}
                    checkedChildren="Mở"
                    unCheckedChildren="Đóng"
                />
              </div>
              <div className={`p-4 rounded-xl ${acceptingPatients ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {acceptingPatients 
                    ? "Đang nhận bệnh nhân mới. Lịch của bạn hiển thị công khai." 
                    : "Đang tạm dừng. Bệnh nhân không thể đặt lịch mới."}
              </div>
            </Card>

            {/* Password Card */}
            <Card
                className="rounded-3xl shadow-sm"
                title={<Space><KeyRound size={20} className="text-amber-500" /><span>Đổi mật khẩu</span></Space>}
            >
                <Form layout="vertical" form={passwordForm} onFinish={handlePasswordSubmit}>
                    <Form.Item name="current_password" rules={[{ required: true }]}>
                        <Input.Password placeholder="Mật khẩu hiện tại" />
                    </Form.Item>
                    <Form.Item name="new_password" rules={[{ required: true, min: 6 }]}>
                        <Input.Password placeholder="Mật khẩu mới" />
                    </Form.Item>
                    <Form.Item name="confirm_password" dependencies={['new_password']} rules={[{ required: true }]}>
                        <Input.Password placeholder="Xác nhận mật khẩu mới" />
                    </Form.Item>
                    <Button htmlType="submit" loading={passwordLoading} block>Đổi mật khẩu</Button>
                </Form>
            </Card>
          </div>
        </Col>
      </Row>

      {/* --- Schedule Section --- */}
      
      <Row gutter={[24, 24]}>
        {/* Weekly Schedule */}
        <Col xs={24} lg={12}>
            <Card
                className="rounded-3xl shadow-sm h-full"
                title={<Space><CalendarClock size={20} className="text-indigo-500" /><span>Lịch làm việc tuần (Mặc định)</span></Space>}
                extra={<Button type="primary" ghost onClick={handleWorkingHoursSave} loading={savingHours}>Lưu lịch tuần</Button>}
            >
                {loadingProfile ? <Skeleton active /> : (
                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(workingHours).map(day => (
                            <WorkingHourRow 
                                key={day} 
                                day={day} 
                                config={workingHours[day]} 
                                onToggle={toggleWorkingDay} 
                                onTimeChange={updateWorkingTime} 
                            />
                        ))}
                    </div>
                )}
            </Card>
        </Col>

        {/* ✅ Specific Daily Schedule (New Feature) */}
        <Col xs={24} lg={12}>
             <Card
                className="rounded-3xl shadow-sm h-full"
                title={
                    <Space>
                        <CalendarIcon size={20} className="text-rose-500" />
                        <span>Lịch theo ngày (Nghỉ phép / Làm bù)</span>
                    </Space>
                }
            >
                <Alert 
                    message="Chọn ngày trên lịch để cấu hình riêng" 
                    description="Bạn có thể đặt lịch nghỉ phép hoặc giờ làm việc khác biệt cho các ngày lễ, ngày bận rộn."
                    type="info" 
                    showIcon 
                    className="mb-4 rounded-xl"
                />
                <div className="border border-slate-200 rounded-2xl p-2">
                    <Calendar 
                        fullscreen={false} 
                        onSelect={onCalendarSelect} 
                        cellRender={cellRender}
                    />
                </div>
            </Card>
        </Col>
      </Row>

      {/* Rating Stats */}
      <Card
        className="rounded-3xl shadow-sm"
        title={
          <Space>
            <LineChart size={20} className="text-purple-500" />
            <span>Thống kê đánh giá</span>
          </Space>
        }
      >
        {ratingsLoading ? (
          <Skeleton active />
        ) : (ratingStats?.total_ratings ?? 0) === 0 ? (
          <Empty description="Chưa có đánh giá từ bệnh nhân" />
        ) : (
          <div className="flex flex-col gap-6">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <div className="flex flex-col items-center text-center gap-2">
                  <Title level={1} className="!mb-0">
                    {(Number(ratingStats?.average_rating) || 0).toFixed(1)}
                  </Title>
                  <Rate allowHalf disabled value={Number(ratingStats?.average_rating) || 0} />
                  <Text type="secondary">
                    {ratingStats?.total_ratings || 0} lượt đánh giá
                  </Text>
                  {ratingStats?.last_updated && (
                    <Text type="secondary" className="text-xs">
                      Cập nhật {dayjs(ratingStats.last_updated).format("DD/MM/YYYY HH:mm")}
                    </Text>
                  )}
                </div>
              </Col>
              <Col xs={24} md={8}>
                {ratingDistribution?.length ? (
                  <div className="space-y-3">
                    {ratingDistribution.map((item) => (
                      <div key={item.star} className="flex items-center gap-3">
                        <Text className="w-10 text-sm">{item.star}★</Text>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <Text className="w-12 text-right text-xs">{item.percent}%</Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">Chưa có dữ liệu phân bố.</Text>
                )}
              </Col>
              <Col xs={24} md={8}>
                <div className="bg-slate-50 rounded-2xl p-3 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <Text strong>Feedback từ bệnh nhân</Text>
                    <Tag color="purple">{recentRatings.length}</Tag>
                  </div>
                  <div style={{ maxHeight: 340, overflowY: "auto", paddingRight: 8 }}>
                    <List
                      itemLayout="vertical"
                      className="!mt-0"
                      locale={{ emptyText: "Chưa có phản hồi nào." }}
                      dataSource={recentRatings}
                      renderItem={(rating) => {
                        const score = Number(rating?.rating ?? rating?.score ?? 0);
                        const patientName =
                          rating?.patient_name ||
                          rating?.patient?.full_name ||
                          rating?.patient?.name ||
                          "Bệnh nhân ẩn danh";
                        return (
                          <List.Item key={rating?._id || rating?.id} className="!px-0">
                            <Space direction="vertical" size={2} className="w-full">
                              <div className="flex items-center justify-between gap-2">
                                <Text strong className="truncate">{patientName}</Text>
                                <Tag color="gold">{score.toFixed(1)} ★</Tag>
                              </div>
                              <Rate allowHalf disabled value={score} />
                              <Text className="text-sm text-slate-600" style={{ display: "block" }}>
                                {rating?.comment || rating?.feedback || "Không có nhận xét"}
                              </Text>
                              {rating?.created_at && (
                                <Text type="secondary" className="text-xs">
                                  {dayjs(rating.created_at).format("DD/MM/YYYY HH:mm")}
                                </Text>
                              )}
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Card>

      {/* --- Modals --- */}
      
      {/* Calendar Config Modal */}
      <Modal
        title={`Cấu hình ngày ${selectedDateStr}`}
        open={calendarModalOpen}
        onOk={handleSaveSpecificDate}
        onCancel={() => setCalendarModalOpen(false)}
        confirmLoading={savingSpecificDate}
        okText="Lưu cấu hình"
        cancelText="Hủy"
        centered
      >
        <div className="flex flex-col gap-6 py-4">
            <div>
                <Text strong className="block mb-2">Loại lịch cho ngày này:</Text>
                <Radio.Group 
                    value={dateConfigType} 
                    onChange={e => setDateConfigType(e.target.value)}
                    buttonStyle="solid"
                    className="w-full"
                >
                    <Radio.Button value="default" className="w-1/3 text-center">Mặc định</Radio.Button>
                    <Radio.Button value="off" className="w-1/3 text-center">Nghỉ phép</Radio.Button>
                    <Radio.Button value="custom" className="w-1/3 text-center">Giờ riêng</Radio.Button>
                </Radio.Group>
            </div>

            {dateConfigType === 'custom' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <Text strong className="block mb-2">Giờ làm việc:</Text>
                    <TimePicker.RangePicker 
                        format="HH:mm" 
                        minuteStep={30}
                        value={dateCustomTime}
                        onChange={setDateCustomTime}
                        className="w-full"
                    />
                </div>
            )}
            
            {dateConfigType === 'off' && (
                <Alert type="warning" showIcon message="Bác sĩ sẽ không nhận lịch khám vào ngày này." />
            )}

            {dateConfigType === 'default' && (
                <Alert type="info" showIcon message="Ngày này sẽ tuân theo lịch làm việc hàng tuần (Thứ 2 - CN)." />
            )}
        </div>
      </Modal>

    </div>
  );
};

export default DoctorSettingsPage;