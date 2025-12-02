// src/pages/admin/pages/PatientRecordsManagement.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Tooltip,
  Modal,
  Form,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Empty,
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ProfileOutlined,
  HeartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { getPatients, getDoctors } from '../../../services/services';
import { RECORD_TYPES } from '../../../constants/recordConstants';
import { getSpecialtyName } from '../../../constants/specialtyConstants';
import { RecordDetailModal } from '../../../components/records';
import {
  fetchPatientRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  downloadRecordPdf,
} from '../../../services/ehrAdminService';

const { RangePicker } = DatePicker;

const typeOptions = [
  { label: 'Tất cả hồ sơ', value: 'all' },
  ...Object.entries(RECORD_TYPES).map(([key, value]) => ({
    label: value.label,
    value: key,
  })),
];

const normalizeRecord = (record) => {
  if (!record) return record;
  const doctorInfo = record.doctor_info || record.doctor || {};
  return {
    ...record,
    id: record._id || record.id,
    doctor_label: doctorInfo.full_name || doctorInfo.name || 'Bác sĩ',
    record_type_label:
      RECORD_TYPES[record.record_type || record.type]?.label || record.record_type || 'Khác',
    created_at: record.created_at || record.date,
    doctor: doctorInfo,
  };
};

const defaultFormState = {
  record_type: 'consultation',
  follow_up_required: false,
};

export default function PatientRecordsManagement() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    dateRange: [],
  });
  const [tablePagination, setTablePagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [detailRecord, setDetailRecord] = useState(null);
  const [form] = Form.useForm();
  const [modalState, setModalState] = useState({
    open: false,
    mode: 'create',
    record: null,
  });

  useEffect(() => {
    loadPatients();
    loadDoctors();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [selectedPatientId, filters]);

  const loadPatients = async () => {
    try {
      const response = await getPatients({ limit: 1000 });
      const data = Array.isArray(response) ? response : response?.data || [];
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      message.error('Không thể tải danh sách bệnh nhân');
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await getDoctors({ limit: 500 });
      const data = response?.data || response || [];
      setDoctors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      message.error('Không thể tải danh sách bác sĩ');
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedPatientId) {
        params.patient_id = selectedPatientId;
      }
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.search) params.search = filters.search;
      if (filters.dateRange?.length === 2) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const { records: rawRecords, stats: statsData } = await fetchPatientRecords(params);
      setRecords(rawRecords.map(normalizeRecord));
      setStats(statsData || {});
      setTablePagination((prev) => ({ ...prev, current: 1 }));
    } catch (error) {
      console.error('Error loading records:', error);
      message.error(error?.response?.data?.message || 'Không thể tải hồ sơ bệnh án');
    } finally {
      setLoading(false);
    }
  };

  const statsSummary = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const byType = stats?.by_type || {};
    return {
      total: stats?.total || records.length || 0,
      consultation: byType.consultation || records.filter(r => {
        const recordType = r.type || r.record_type;
        return recordType === 'consultation' || !recordType;
      }).length,
      withPrescription: records.filter(r => {
        const hasPrescription = r.prescriptions && r.prescriptions.length > 0;
        const hasMedications = r.medications && r.medications.length > 0;
        const hasPrescriptionField = r.prescription && (Array.isArray(r.prescription) ? r.prescription.length > 0 : true);
        return hasPrescription || hasMedications || hasPrescriptionField;
      }).length,
      recentVisits: records.filter(r => {
        const recordDate = r.date ? new Date(r.date) : (r.created_at ? new Date(r.created_at) : null);
        return recordDate && recordDate >= thirtyDaysAgo;
      }).length,
      latestVisit: stats?.latest_visit,
    };
  }, [stats, records]);

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId || null);
  };

  const openCreateModal = () => {
    setModalState({ open: true, mode: 'create', record: null });
    // Use setTimeout to ensure Form component is mounted before calling form methods
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        ...defaultFormState,
        patient_id: selectedPatientId || undefined,
      });
    }, 0);
  };

  const openEditModal = (record) => {
    setModalState({ open: true, mode: 'edit', record });
    // Use setTimeout to ensure Form component is mounted before calling form methods
    setTimeout(() => {
      const doctorId =
        record.doctor_id ||
        record.doctor?._id ||
        record.doctor?.id ||
        record.doctor_info?._id ||
        record.doctor_info?.id;

      form.setFieldsValue({
        patient_id: record.patient_id,
        doctor_id: doctorId,
        record_type: record.record_type || record.type,
        chief_complaint: record.chief_complaint,
        diagnosis_primary: record.diagnosis?.primary,
        diagnosis_secondary: record.diagnosis?.secondary,
        doctor_notes: record.doctor_notes,
        symptoms: Array.isArray(record.symptoms) ? record.symptoms.join(', ') : record.symptoms,
        follow_up_required: record.follow_up_required || false,
        follow_up_date: record.follow_up_date ? moment(record.follow_up_date) : null,
        follow_up_notes: record.follow_up_notes,
        vital_blood_pressure: record.vital_signs?.blood_pressure,
        vital_heart_rate: record.vital_signs?.heart_rate,
        vital_temperature: record.vital_signs?.temperature,
      });
    }, 0);
  };

  const closeModal = () => {
    setModalState({ open: false, mode: 'create', record: null });
    // Only reset fields if form is still mounted (modal might be closed with destroyOnClose)
    setTimeout(() => {
      try {
        form.resetFields();
      } catch (error) {
        // Form might already be unmounted, ignore error
      }
    }, 0);
  };

  const buildPayloadFromForm = (values) => {
    const payload = {
      patient_id: values.patient_id,
      doctor_id: values.doctor_id,
      record_type: values.record_type,
      chief_complaint: values.chief_complaint?.trim(),
      diagnosis: {
        primary: values.diagnosis_primary || '',
        secondary: values.diagnosis_secondary || '',
      },
      doctor_notes: values.doctor_notes || '',
      symptoms: values.symptoms
        ? values.symptoms
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      follow_up_required: values.follow_up_required || false,
      follow_up_date:
        values.follow_up_required && values.follow_up_date
          ? values.follow_up_date.format('YYYY-MM-DD')
          : undefined,
      follow_up_notes: values.follow_up_notes || '',
      vital_signs: {
        blood_pressure: values.vital_blood_pressure,
        heart_rate: values.vital_heart_rate,
        temperature: values.vital_temperature,
      },
    };

    // Cleanup empty vital signs
    if (!payload.vital_signs.blood_pressure) delete payload.vital_signs.blood_pressure;
    if (!payload.vital_signs.heart_rate) delete payload.vital_signs.heart_rate;
    if (!payload.vital_signs.temperature) delete payload.vital_signs.temperature;
    if (Object.keys(payload.vital_signs).length === 0) delete payload.vital_signs;

    if (!payload.follow_up_required) {
      delete payload.follow_up_date;
      delete payload.follow_up_notes;
    }

    return payload;
  };

  const handleSubmitRecord = async () => {
    try {
      const values = await form.validateFields();
      const payload = buildPayloadFromForm(values);

      if (modalState.mode === 'edit') {
        payload.update_reason = values.update_reason || 'Cập nhật bởi admin';
        await updateRecord(modalState.record._id || modalState.record.id, payload);
        message.success('Đã cập nhật hồ sơ bệnh án');
      } else {
        await createRecord(payload);
        message.success('Đã tạo hồ sơ bệnh án mới');
      }

      closeModal();
      fetchRecords();
    } catch (error) {
      if (error?.errorFields) return; // validation error
      console.error('Save record error:', error);
      message.error(error?.response?.data?.message || 'Không thể lưu hồ sơ');
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      await deleteRecord(recordId);
      message.success('Đã xóa hồ sơ thành công');
      fetchRecords();
    } catch (error) {
      console.error('Delete record error:', error);
      message.error(error?.response?.data?.message || 'Không thể xóa hồ sơ');
    }
  };

  const handleDownloadRecord = async (recordId) => {
    try {
      await downloadRecordPdf(recordId);
      message.success('Đang tải hồ sơ...');
    } catch (error) {
      console.error('Download error:', error);
      message.error('Không thể tải hồ sơ');
    }
  };

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: '_id',
      key: 'id',
      width: 120,
      render: (value, record) => (
        <span className="font-mono text-xs">{(record._id || record.id || '').slice(-8)}</span>
      ),
    },
    {
      title: 'Bệnh nhân',
      dataIndex: 'patient_info',
      key: 'patient',
      width: 220,
      render: (info) => (
        <div>
          <div className="font-medium text-gray-900">{info?.name || 'Chưa rõ'}</div>
          <div className="text-xs text-gray-500">
            {info?.mrn
              ? `MRN: ${info.mrn}`
              : info?.dob
              ? `Sinh: ${moment(info.dob).format('DD/MM/YYYY')}`
              : info?.gender || '-'}
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      defaultSortOrder: 'descend',
      render: (value) => (value ? moment(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Loại hồ sơ',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 160,
      filters: typeOptions
        .filter((opt) => opt.value !== 'all')
        .map((opt) => ({ text: opt.label, value: opt.value })),
      onFilter: (value, record) => record.record_type === value || record.type === value,
      render: (_, record) => (
        <Tag color="blue">{record.record_type_label || record.record_type || 'Khác'}</Tag>
      ),
    },
    {
      title: 'Bác sĩ phụ trách',
      dataIndex: 'doctor_label',
      key: 'doctor',
      width: 200,
      render: (_, record) => {
        const specialty =
          record.doctor?.specialty ||
          record.doctor?.specialization ||
          record.doctor_info?.specialty ||
          record.doctor_info?.specialization ||
          '';
        return (
          <div>
            <div className="font-medium text-gray-900">{record.doctor_label}</div>
            <div className="text-xs text-gray-500">
              {specialty ? getSpecialtyName(specialty, specialty) : '-'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Triệu chứng chính',
      dataIndex: 'chief_complaint',
      key: 'chief_complaint',
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <span>{value || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Theo dõi',
      dataIndex: 'follow_up_required',
      key: 'follow_up',
      width: 130,
      render: (value, record) =>
        value ? (
          <Tag color="orange">
            Hẹn lại {record.follow_up_date ? moment(record.follow_up_date).format('DD/MM') : ''}
          </Tag>
        ) : (
          <Tag color="green">Không</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 210,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button icon={<EyeOutlined />} onClick={() => setDetailRecord(record)} />
          </Tooltip>
          <Tooltip title="Tải hồ sơ">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadRecord(record._id || record.id)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa hồ sơ"
            description="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteRecord(record._id || record.id)}
          >
            <Tooltip title="Xóa">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        label: `${patient.full_name || patient.name || 'Bệnh nhân'} ${
          patient.mrn ? `(#${patient.mrn.slice(-4)})` : ''
        }`,
        value: patient._id || patient.id,
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((doctor) => ({
        label: doctor.full_name || doctor.name || 'Bác sĩ',
        value: doctor._id || doctor.id,
      })),
    [doctors]
  );

  const handleTableChange = (pagination) => {
    setTablePagination(pagination);
  };

  const filteredRecords = useMemo(() => records, [records]);

  return (
    <div className="p-3 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3">
          <FileTextOutlined className="text-2xl md:text-3xl text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">Quản lý Hồ sơ bệnh án</h1>
            <p className="text-gray-600 text-sm md:text-base hidden sm:block">Theo dõi, cập nhật và tải xuống hồ sơ khám chữa bệnh</p>
          </div>
        </div>
        <Space wrap className="w-full" size="small">
          <Select
            allowClear
            showSearch
            placeholder="Tất cả bệnh nhân"
            optionFilterProp="label"
            value={selectedPatientId || undefined}
            onChange={handlePatientChange}
            options={patientOptions}
            className="w-full sm:w-auto sm:min-w-[280px]"
            suffixIcon={<UserOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            disabled={!selectedPatientId}
            className="w-full sm:w-auto"
          >
            Thêm hồ sơ
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchRecords} 
            loading={loading}
            className="w-full sm:w-auto"
          >
            Tải lại
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-md">
            <Statistic
              title="Tổng hồ sơ"
              value={statsSummary.total}
              prefix={<ProfileOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-md">
            <Statistic
              title="Chuyên khoa"
              value={statsSummary.consultation}
              prefix={<MedicineBoxOutlined className="text-emerald-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-md">
            <Statistic
              title="Đơn thuốc"
              value={statsSummary.withPrescription}
              prefix={<MedicineBoxOutlined className="text-purple-500" />}
              suffix={<span className="text-xs text-gray-500">có kê đơn</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-md">
            <Statistic
              title="Khám gần đây"
              value={statsSummary.recentVisits}
              prefix={<CalendarOutlined className="text-orange-500" />}
              suffix={<span className="text-xs text-gray-500">30 ngày qua</span>}
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-md mb-4">
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={8}>
            <Input
              placeholder="Tìm theo bác sĩ, chẩn đoán..."
              prefix={<SearchOutlined />}
              allowClear
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                }))
              }
              size="middle"
            />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Select
              value={filters.type}
              options={typeOptions}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  type: value,
                }))
              }
              suffixIcon={<FilterOutlined />}
              style={{ width: '100%' }}
              size="middle"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: dates,
                }))
              }
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              size="middle"
            />
          </Col>
          <Col xs={24} sm={24} lg={3}>
            <Button
              block
              onClick={() =>
                setFilters({
                  type: 'all',
                  search: '',
                  dateRange: [],
                })
              }
              size="middle"
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="shadow-md">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey={(record) => record._id || record.id}
            loading={loading}
            pagination={{
              ...tablePagination,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} hồ sơ`,
              size: 'default',
              responsive: true,
            }}
            onChange={handleTableChange}
            scroll={{ x: 'max-content' }}
            size="middle"
            locale={{
              emptyText: (
                <Empty description="Chưa có hồ sơ nào.">
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                    Thêm hồ sơ đầu tiên
                  </Button>
                </Empty>
              ),
            }}
          />
        </div>
      </Card>

      {detailRecord && (
        <RecordDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
      )}

      <Modal
        title={modalState.mode === 'edit' ? 'Chỉnh sửa hồ sơ bệnh án' : 'Thêm hồ sơ bệnh án'}
        open={modalState.open}
        onCancel={closeModal}
        onOk={handleSubmitRecord}
        width="90%"
        style={{ maxWidth: 720 }}
        okText={modalState.mode === 'edit' ? 'Cập nhật' : 'Lưu'}
      >
        <Form layout="vertical" form={form} initialValues={defaultFormState}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Bệnh nhân"
                name="patient_id"
                rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
              >
                <Select
                  disabled={modalState.mode === 'edit'}
                  options={patientOptions}
                  placeholder="Chọn bệnh nhân"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Bác sĩ phụ trách"
                name="doctor_id"
                rules={[{ required: true, message: 'Vui lòng chọn bác sĩ' }]}
              >
                <Select
                  options={doctorOptions}
                  placeholder="Chọn bác sĩ"
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Loại hồ sơ"
                name="record_type"
                rules={[{ required: true, message: 'Vui lòng chọn loại hồ sơ' }]}
              >
                <Select options={typeOptions.filter((opt) => opt.value !== 'all')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Triệu chứng chính" name="chief_complaint">
                <Input placeholder="Ví dụ: Đau bụng, sốt" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Chẩn đoán chính" name="diagnosis_primary">
                <Input placeholder="Nhập chẩn đoán chính" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Chẩn đoán phụ" name="diagnosis_secondary">
                <Input placeholder="Nhập chẩn đoán phụ (nếu có)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Triệu chứng khác" name="symptoms">
            <Input.TextArea rows={2} placeholder="Ngăn cách bởi dấu phẩy (,)" />
          </Form.Item>

          <Form.Item label="Ghi chú của bác sĩ" name="doctor_notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Huyết áp (mmHg)" name="vital_blood_pressure">
                <Input placeholder="120/80" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Nhịp tim (bpm)" name="vital_heart_rate">
                <Input placeholder="75" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Nhiệt độ (°C)" name="vital_temperature">
                <Input placeholder="36.8" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Yêu cầu tái khám"
                name="follow_up_required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ngày tái khám" name="follow_up_date">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Ghi chú tái khám" name="follow_up_notes">
                <Input placeholder="Nhập ghi chú" />
              </Form.Item>
            </Col>
          </Row>

          {modalState.mode === 'edit' && (
            <Form.Item
              label="Lý do cập nhật"
              name="update_reason"
              rules={[{ required: true, message: 'Vui lòng nhập lý do cập nhật' }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

