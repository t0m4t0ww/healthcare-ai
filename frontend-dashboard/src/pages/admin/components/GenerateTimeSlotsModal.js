import React, { useState } from 'react';
import { Modal, Form, Select, DatePicker, TimePicker, InputNumber, Checkbox, message, Row, Col } from 'antd';
import dayjs from 'dayjs';
import api from '../../../services/services';

const { RangePicker } = DatePicker;

const GenerateTimeSlotsModal = ({ visible, onClose, doctors }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const weekDays = [
    { label: 'Thứ 2', value: 'monday' },
    { label: 'Thứ 3', value: 'tuesday' },
    { label: 'Thứ 4', value: 'wednesday' },
    { label: 'Thứ 5', value: 'thursday' },
    { label: 'Thứ 6', value: 'friday' },
    { label: 'Thứ 7', value: 'saturday' },
    { label: 'Chủ nhật', value: 'sunday' }
  ];

  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      // ✅ Validate start < end time
      const startHour = values.startTime.hour() * 60 + values.startTime.minute();
      const endHour = values.endTime.hour() * 60 + values.endTime.minute();
      
      if (startHour >= endHour) {
        message.error('Giờ bắt đầu phải trước giờ kết thúc!');
        setLoading(false);
        return;
      }
      
      // ✅ Validate break time if provided
      if (values.breakTime && values.breakTime.length === 2) {
        const breakStart = values.breakTime[0].hour() * 60 + values.breakTime[0].minute();
        const breakEnd = values.breakTime[1].hour() * 60 + values.breakTime[1].minute();
        
        if (breakStart >= breakEnd) {
          message.error('Giờ bắt đầu nghỉ phải trước giờ kết thúc nghỉ!');
          setLoading(false);
          return;
        }
        
        if (breakStart < startHour || breakEnd > endHour) {
          message.error('Giờ nghỉ trưa phải nằm trong giờ làm việc!');
          setLoading(false);
          return;
        }
      }
      
      // ✅ Validate date range
      const today = dayjs().startOf('day');
      if (values.dateRange[0].isBefore(today)) {
        message.error('Không thể tạo lịch cho ngày trong quá khứ!');
        setLoading(false);
        return;
      }
      
      const daysDiff = values.dateRange[1].diff(values.dateRange[0], 'day');
      if (daysDiff > 90) {
        message.warning('Khoảng thời gian quá dài! Nên tạo tối đa 3 tháng (90 ngày)');
        // Allow to continue but warn
      }
      
      const payload = {
        doctor_id: values.doctor,
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1].format('YYYY-MM-DD'),
        working_hours: {
          start: values.startTime.format('HH:mm'),
          end: values.endTime.format('HH:mm'),
          break: values.breakTime ? [
            values.breakTime[0].format('HH:mm'),
            values.breakTime[1].format('HH:mm')
          ] : []
        },
        slot_duration: values.slotDuration || 30,
        working_days: values.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };

      console.log('📤 Generating slots with payload:', payload);
      const response = await api.post('/time-slots/generate', payload);
      console.log('✅ Response:', response.data);
      
      if (response.data?.data?.total_slots !== undefined) {
        const totalSlots = response.data.data.total_slots;
        if (totalSlots === 0) {
          // ✅ Better explanation for 0 slots
          const startDate = dayjs(payload.start_date);
          const endDate = dayjs(payload.end_date);
          const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
          const workingDayNames = payload.working_days.map(day => {
            const map = {
              'monday': 'Thứ 2', 'tuesday': 'Thứ 3', 'wednesday': 'Thứ 4',
              'thursday': 'Thứ 5', 'friday': 'Thứ 6', 'saturday': 'Thứ 7', 'sunday': 'Chủ nhật'
            };
            return map[day];
          }).join(', ');
          
          let reason = '⚠️ Không có slot nào được tạo.\n\n';
          reason += `Khoảng thời gian: ${startDate.format('DD/MM/YYYY')} (${dayNames[startDate.day()]}) `;
          reason += `→ ${endDate.format('DD/MM/YYYY')} (${dayNames[endDate.day()]})\n`;
          reason += `Ngày làm việc: ${workingDayNames}\n\n`;
          reason += 'Có thể do:\n';
          reason += '• Các ngày đã chọn không trùng với ngày làm việc\n';
          reason += '• Đã có slots tồn tại cho các ngày này\n';
          reason += '• Vui lòng chọn khoảng thời gian khác hoặc kiểm tra lại ngày làm việc';
          
          message.warning({
            content: reason,
            duration: 10
          });
        } else {
          message.success(`✅ Đã tạo ${totalSlots} time slots thành công!`);
        }
        form.resetFields();
        onClose();
      } else {
        message.success('Đã tạo time slots thành công!');
        form.resetFields();
        onClose();
      }
    } catch (error) {
      console.error('❌ Generate slots error:', error);
      console.error('   Response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Tạo slots thất bại';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="🗓️ Tạo Lịch Khám Cho Bác Sĩ"
      open={visible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="Tạo Lịch"
      cancelText="Hủy"
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          slotDuration: 30,
          startTime: dayjs('08:00', 'HH:mm'),
          endTime: dayjs('17:00', 'HH:mm'),
          breakTime: [dayjs('12:00', 'HH:mm'), dayjs('13:00', 'HH:mm')],
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }}
      >
        <Form.Item
          name="doctor"
          label="Chọn Bác Sĩ"
          rules={[{ required: true, message: 'Vui lòng chọn bác sĩ' }]}
        >
          <Select
            placeholder="Chọn bác sĩ"
            showSearch
            optionFilterProp="label"
            options={doctors.map(doc => ({
              value: doc._id || doc.id,
              label: doc.full_name || doc.name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Khoảng Thời Gian"
          rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian' }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            disabledDate={(current) => {
              // ✅ Disable past dates
              return current && current < dayjs().startOf('day');
            }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="startTime"
              label="Giờ Bắt Đầu"
              rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
            >
              <TimePicker
                style={{ width: '100%' }}
                format="HH:mm"
                minuteStep={30}
                placeholder="Giờ bắt đầu"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="endTime"
              label="Giờ Kết Thúc"
              rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc' }]}
            >
              <TimePicker
                style={{ width: '100%' }}
                format="HH:mm"
                minuteStep={30}
                placeholder="Giờ kết thúc"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="breakTime"
          label="Giờ Nghỉ Trưa (Tùy Chọn)"
        >
          <TimePicker.RangePicker
            style={{ width: '100%' }}
            format="HH:mm"
            minuteStep={30}
            placeholder={['Bắt đầu nghỉ', 'Kết thúc nghỉ']}
          />
        </Form.Item>

        <Form.Item
          name="slotDuration"
          label="Thời Lượng Mỗi Slot (phút)"
          rules={[{ required: true, message: 'Vui lòng nhập thời lượng' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={15}
            max={120}
            step={15}
            placeholder="30"
          />
        </Form.Item>

        <Form.Item
          name="workingDays"
          label="Ngày Làm Việc"
          rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 ngày' }]}
        >
          <Checkbox.Group options={weekDays} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default GenerateTimeSlotsModal;
