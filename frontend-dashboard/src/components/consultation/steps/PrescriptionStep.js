// src/components/consultation/steps/PrescriptionStep.js
import React from 'react';
import { Card, Button, Table, Form, Input, InputNumber, Select, DatePicker, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, MedicineBoxOutlined, CalendarOutlined } from '@ant-design/icons';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;

const PrescriptionStep = ({ prescription, followUp, onPrescriptionChange, onFollowUpChange, soapData }) => {
  const [form] = Form.useForm();

  const addMedication = () => {
    form.validateFields().then(values => {
      const newMedication = {
        key: Date.now(),
        drug_name: values.drug_name,
        dosage: values.dosage,
        frequency: values.frequency,
        duration: values.duration,
        instructions: values.instructions || '',
        quantity: values.quantity || ''
      };
      
      onPrescriptionChange([...prescription, newMedication]);
      form.resetFields();
    });
  };

  const removeMedication = (key) => {
    onPrescriptionChange(prescription.filter(item => item.key !== key));
  };

  const handleFollowUpChange = (field, value) => {
    onFollowUpChange({ ...followUp, [field]: value });
  };

  const columns = [
    {
      title: 'Tên thuốc',
      dataIndex: 'drug_name',
      key: 'drug_name',
      width: '25%',
    },
    {
      title: 'Liều lượng',
      dataIndex: 'dosage',
      key: 'dosage',
      width: '15%',
    },
    {
      title: 'Tần suất',
      dataIndex: 'frequency',
      key: 'frequency',
      width: '15%',
    },
    {
      title: 'Thời gian',
      dataIndex: 'duration',
      key: 'duration',
      width: '15%',
    },
    {
      title: 'Hướng dẫn',
      dataIndex: 'instructions',
      key: 'instructions',
      width: '20%',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeMedication(record.key)}
        />
      ),
    },
  ];

  return (
    <div className="prescription-step">
      <Card 
        title={<><MedicineBoxOutlined className="mr-2" />Đơn thuốc</>}
        className="mb-4"
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Form.Item
              label="Tên thuốc"
              name="drug_name"
              rules={[{ required: true, message: 'Vui lòng nhập tên thuốc' }]}
            >
              <Input placeholder="VD: Paracetamol" />
            </Form.Item>

            <Form.Item
              label="Liều lượng"
              name="dosage"
              rules={[{ required: true, message: 'Vui lòng nhập liều lượng' }]}
            >
              <Input placeholder="VD: 500mg" />
            </Form.Item>

            <Form.Item
              label="Tần suất"
              name="frequency"
              rules={[{ required: true, message: 'Vui lòng nhập tần suất' }]}
            >
              <Select placeholder="Chọn tần suất">
                <Option value="1 lần/ngày">1 lần/ngày</Option>
                <Option value="2 lần/ngày">2 lần/ngày</Option>
                <Option value="3 lần/ngày">3 lần/ngày</Option>
                <Option value="4 lần/ngày">4 lần/ngày</Option>
                <Option value="Khi cần">Khi cần</Option>
                <Option value="Trước ăn">Trước ăn</Option>
                <Option value="Sau ăn">Sau ăn</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Thời gian dùng"
              name="duration"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
            >
              <Input placeholder="VD: 7 ngày" />
            </Form.Item>

            <Form.Item
              label="Số lượng"
              name="quantity"
            >
              <Input placeholder="VD: 1 hộp" />
            </Form.Item>

            <Form.Item
              label="Hướng dẫn sử dụng"
              name="instructions"
            >
              <Input placeholder="VD: Uống sau ăn" />
            </Form.Item>
          </div>

          <Button
            type="dashed"
            onClick={addMedication}
            icon={<PlusOutlined />}
            className="w-full mb-4"
          >
            Thêm thuốc
          </Button>
        </Form>

        {prescription.length > 0 && (
          <Table
            columns={columns}
            dataSource={prescription}
            pagination={false}
            size="small"
            bordered
          />
        )}

        {prescription.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <MedicineBoxOutlined style={{ fontSize: 48 }} className="mb-2" />
            <p>Chưa có thuốc nào được kê đơn</p>
          </div>
        )}
      </Card>

      <Card title={<><CalendarOutlined className="mr-2" />Tái khám & Theo dõi</>}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Yêu cầu tái khám
          </label>
          <Switch
            checked={followUp.required || false}
            onChange={(checked) => handleFollowUpChange('required', checked)}
          />
          <span className="ml-2 text-sm text-gray-600">
            {followUp.required ? 'Cần tái khám' : 'Không cần tái khám'}
          </span>
        </div>

        {followUp.required && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Ngày tái khám dự kiến
              </label>
              <DatePicker
                value={followUp.date ? moment(followUp.date) : null}
                onChange={(date) => handleFollowUpChange('date', date ? date.toISOString() : null)}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày tái khám"
                className="w-full"
                disabledDate={(current) => current && current < moment().startOf('day')}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Lý do tái khám
              </label>
              <TextArea
                rows={3}
                placeholder="VD: Đánh giá lại tình trạng sau điều trị, kiểm tra kết quả xét nghiệm..."
                value={followUp.notes}
                onChange={(e) => handleFollowUpChange('notes', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Lời dặn cho bệnh nhân
          </label>
          <TextArea
            rows={4}
            placeholder="Hướng dẫn chăm sóc tại nhà, lưu ý khi dùng thuốc, dấu hiệu cần đến viện ngay..."
            value={followUp.patient_instructions}
            onChange={(e) => handleFollowUpChange('patient_instructions', e.target.value)}
          />
        </div>
      </Card>

      {soapData?.assessment && (
        <Card title="Tóm tắt chẩn đoán" className="mt-4 bg-blue-50">
          <p className="font-medium mb-2">Chẩn đoán:</p>
          <p className="text-sm whitespace-pre-wrap">{soapData.assessment}</p>
          
          <p className="font-medium mt-3 mb-2">Kế hoạch điều trị:</p>
          <p className="text-sm whitespace-pre-wrap">{soapData.plan}</p>
        </Card>
      )}
    </div>
  );
};

export default PrescriptionStep;
