// src/pages/admin/components/RecentActivity.js
import React, { useState, useEffect, useCallback } from 'react';
import { List, Avatar, Empty, Spin, Tag } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import api from '../../../services/services';

/**
 * RecentActivity Component
 * Hiển thị các hoạt động gần đây trong hệ thống
 * 
 * Bao gồm:
 * - Appointments mới được tạo
 * - Appointments được cập nhật (completed, cancelled, rescheduled)
 * - Ratings mới
 * - Patients mới đăng ký
 * - Doctors mới thêm
 * 
 * Props:
 * - limit: Số lượng hoạt động hiển thị (default: 10)
 * - refreshKey: Key để trigger refresh (optional)
 * - autoRefresh: Tự động refresh mỗi 30 giây (default: true)
 */
const RecentActivity = ({ limit = 10, refreshKey = null, autoRefresh = true }) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  const fetchRecentActivities = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch multiple data sources in parallel
      // Note: APIs may not support sort/limit params, so we'll sort on frontend
      const [appointmentsRes, ratingsRes, patientsRes, doctorsRes] = await Promise.all([
        api.get('/appointments').catch(() => ({ data: [] })),
        api.get('/ratings').catch(() => ({ data: [] })),
        api.get('/patients').catch(() => ({ data: [] })),
        api.get('/doctors').catch(() => ({ data: [] })),
      ]);

      // Process appointments
      const appointments = Array.isArray(appointmentsRes.data) 
        ? appointmentsRes.data 
        : appointmentsRes.data?.data || [];
      
      // Process ratings - Backend returns {success: true, data: {ratings: [], pagination: {}}}
      const ratings = Array.isArray(ratingsRes.data)
        ? ratingsRes.data
        : ratingsRes.data?.data?.ratings || ratingsRes.data?.ratings || ratingsRes.data?.data || [];
      
      // Process patients
      const patients = Array.isArray(patientsRes.data)
        ? patientsRes.data
        : patientsRes.data?.data || [];
      
      // Process doctors
      const doctors = Array.isArray(doctorsRes.data)
        ? doctorsRes.data
        : doctorsRes.data?.data || [];

      // Combine and format activities
      const allActivities = [];

      // Appointments activities
      appointments.slice(0, 20).forEach((apt) => {
        // Try multiple fields to get patient name
        const patientName = apt.patient_info?.name || 
                           apt.patient_info?.full_name || 
                           apt.patient?.name || 
                           apt.patient?.full_name || 
                           apt.patient_name || 
                           null;
        
        // Try multiple fields to get doctor name
        const doctorName = apt.doctor_info?.name || 
                          apt.doctor_info?.full_name || 
                          apt.doctor?.name || 
                          apt.doctor?.full_name || 
                          apt.doctor_name || 
                          null;
        
        // Only use fallback if we truly don't have a name
        const finalPatientName = patientName || 'Bệnh nhân';
        const finalDoctorName = doctorName || 'Bác sĩ';
        
        const status = apt.status;
        
        let activityType = 'appointment_created';
        let icon = <CalendarOutlined />;
        let color = '#1890ff';
        let description = `Lịch hẹn mới: ${finalPatientName} với ${finalDoctorName}`;

        if (status === 'completed') {
          activityType = 'appointment_completed';
          icon = <CheckCircleOutlined />;
          color = '#52c41a';
          description = `Hoàn thành khám: ${finalPatientName} với ${finalDoctorName}`;
        } else if (status === 'cancelled') {
          activityType = 'appointment_cancelled';
          icon = <CloseCircleOutlined />;
          color = '#ff4d4f';
          description = `Hủy lịch hẹn: ${finalPatientName} với ${finalDoctorName}`;
        } else if (status === 'rescheduled') {
          activityType = 'appointment_rescheduled';
          icon = <SwapOutlined />;
          color = '#1890ff';
          description = `Đổi lịch khám: ${finalPatientName} với ${finalDoctorName}`;
        }

        allActivities.push({
          id: `apt_${apt._id}`,
          type: activityType,
          icon,
          color,
          description,
          time: apt.updated_at || apt.created_at || apt.date,
          metadata: {
            appointment_id: apt._id,
            patient_name: finalPatientName,
            doctor_name: finalDoctorName,
            status,
          },
        });
      });

      // Ratings activities
      ratings.slice(0, 10).forEach((rating) => {
        const patientName = rating.patient_name || 
                           rating.patient?.name || 
                           rating.patient?.full_name || 
                           null;
        const doctorName = rating.doctor_name || 
                          rating.doctor?.name || 
                          rating.doctor?.full_name || 
                          null;
        
        const finalPatientName = patientName || 'Bệnh nhân';
        const finalDoctorName = doctorName || 'Bác sĩ';
        
        allActivities.push({
          id: `rating_${rating._id}`,
          type: 'rating_created',
          icon: <StarOutlined />,
          color: '#faad14',
          description: `Đánh giá mới: ${finalPatientName} đánh giá ${finalDoctorName} (${rating.rating} sao)`,
          time: rating.created_at,
          metadata: {
            rating_id: rating._id,
            patient_name: finalPatientName,
            doctor_name: finalDoctorName,
            rating: rating.rating,
          },
        });
      });

      // New patients
      patients.slice(0, 10).forEach((patient) => {
        const patientName = patient.full_name || patient.name || null;
        const finalPatientName = patientName || 'Bệnh nhân';
        
        allActivities.push({
          id: `patient_${patient._id}`,
          type: 'patient_registered',
          icon: <UserOutlined />,
          color: '#52c41a',
          description: `Bệnh nhân mới: ${finalPatientName} đã đăng ký`,
          time: patient.created_at || patient.registered_at,
          metadata: {
            patient_id: patient._id,
            patient_name: finalPatientName,
          },
        });
      });

      // New doctors
      doctors.slice(0, 10).forEach((doctor) => {
        const doctorName = doctor.full_name || doctor.name || null;
        const finalDoctorName = doctorName || 'Bác sĩ';
        
        allActivities.push({
          id: `doctor_${doctor._id}`,
          type: 'doctor_added',
          icon: <MedicineBoxOutlined />,
          color: '#1890ff',
          description: `Bác sĩ mới: ${finalDoctorName} đã được thêm vào hệ thống`,
          time: doctor.created_at || doctor.registered_at,
          metadata: {
            doctor_id: doctor._id,
            doctor_name: finalDoctorName,
          },
        });
      });

      // Sort by time (most recent first) and limit
      const sortedActivities = allActivities
        .filter((act) => act.time) // Only include activities with time
        .sort((a, b) => {
          const timeA = new Date(a.time).getTime();
          const timeB = new Date(b.time).getTime();
          return timeB - timeA; // Descending order
        })
        .slice(0, limit);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentActivities();
  }, [refreshKey, fetchRecentActivities]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchRecentActivities();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchRecentActivities]);

  const getStatusTag = (type) => {
    const statusMap = {
      appointment_created: { text: 'Lịch mới', color: 'blue' },
      appointment_completed: { text: 'Hoàn thành', color: 'green' },
      appointment_cancelled: { text: 'Đã hủy', color: 'red' },
      appointment_rescheduled: { text: 'Đổi lịch', color: 'cyan' },
      rating_created: { text: 'Đánh giá', color: 'orange' },
      patient_registered: { text: 'Bệnh nhân mới', color: 'green' },
      doctor_added: { text: 'Bác sĩ mới', color: 'blue' },
    };

    const status = statusMap[type] || { text: 'Hoạt động', color: 'default' };
    return <Tag color={status.color}>{status.text}</Tag>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spin size="large" />
        <p className="text-gray-500 mt-4">Đang tải hoạt động...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Empty
        description="Chưa có hoạt động nào"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="max-h-[500px] overflow-y-auto pr-2">
      <List
        dataSource={activities}
        renderItem={(activity) => (
          <List.Item className="!px-0 !py-3 border-b border-gray-100 last:border-b-0">
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={activity.icon}
                  style={{ backgroundColor: activity.color }}
                  size={40}
                />
              }
              title={
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {activity.description}
                  </span>
                  {getStatusTag(activity.type)}
                </div>
              }
              description={
                <span className="text-xs text-gray-500">
                  {moment(activity.time).format('DD/MM/YYYY HH:mm')} • {moment(activity.time).fromNow()}
                </span>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default RecentActivity;

