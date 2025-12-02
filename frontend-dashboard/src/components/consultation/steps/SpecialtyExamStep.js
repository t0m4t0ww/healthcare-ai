// src/components/consultation/steps/SpecialtyExamStep.js
import React, { useState, useEffect } from 'react';
import { Card, Input, InputNumber, Select, Upload, Button, message, Spin, Alert, DatePicker, Drawer, Divider, Tag, Space } from 'antd';
import { 
  UploadOutlined, 
  ExperimentOutlined, 
  ThunderboltOutlined, 
  BulbOutlined,
  RobotOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import api from '../../../services/services';
import { SPECIALTIES, createEHRRecord } from '../../../utils/ehrFormSchema';
import { normalizeSpecialty, getSpecialtyDisplayName, getSpecialtyIcon } from '../../../constants/specialtyMapping';
import { getTemplatesForSpecialty } from '../../../constants/ehrTemplates';
import { 
  BMICalculator, 
  CardiovascularRiskCalculator,
  EDDCalculator,
  FetalHeartRateMonitor,
  WHOGrowthChart,
  ImmunizationTracker
} from '../widgets/SpecialtyWidgets';
import moment from 'moment';

const { TextArea } = Input;
const { Option } = Select;

const SpecialtyExamStep = ({ specialty, data, onChange, consultationId, patientInfo }) => {
  const [xrayLoading, setXrayLoading] = useState(false);
  const [xrayResult, setXrayResult] = useState(null);
  const [aiDrawerVisible, setAiDrawerVisible] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Normalize specialty về format chuẩn
  const normalizedSpecialty = normalizeSpecialty(specialty);
  const specialtyDisplayName = getSpecialtyDisplayName(specialty);
  const specialtyIcon = getSpecialtyIcon(specialty);
  const templates = getTemplatesForSpecialty(normalizedSpecialty);

  // Initialize specialty data với schema chuẩn
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) {
      const ehrRecord = createEHRRecord(normalizedSpecialty, {});
      const specialtyData = ehrRecord.specialty_exam[normalizedSpecialty] || {};
      onChange(specialtyData);
    }
  }, [normalizedSpecialty]);

  console.log('🔍 SpecialtyExamStep Debug:', {
    originalSpecialty: specialty,
    normalizedSpecialty,
    displayName: specialtyDisplayName,
    icon: specialtyIcon,
    dataKeys: Object.keys(data || {})
  });

  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Apply quick template
  const applyTemplate = async (template) => {
    setSelectedTemplate(template.id);
    
    // Merge template data with existing data
    const mergedData = { ...data, ...template.data };
    onChange(mergedData);
    
    message.success(`✅ Đã áp dụng template: ${template.name}`);
    
    // Auto load AI suggestions for this template
    try {
      const response = await api.get(`/specialty-ai/quick-suggestions/${normalizedSpecialty}/${template.id}`);
      if (response.data?.status === 'success') {
        setAiSuggestions(response.data.data.suggestions);
        setAiDrawerVisible(true);
      }
    } catch (error) {
      console.error('Error loading quick suggestions:', error);
    }
  };

  // Get AI suggestions based on symptoms
  const getAISuggestions = async () => {
    const symptoms = data.main_symptoms || data.chief_complaint || '';
    
    if (!symptoms) {
      message.warning('Vui lòng nhập triệu chứng trước');
      return;
    }
    
    setAiLoading(true);
    try {
      const response = await api.post('/specialty-ai/suggestions', {
        specialty: normalizedSpecialty,
        symptoms,
        patient_info: patientInfo,
        vital_signs: data.vital_signs
      });
      
      if (response.data?.status === 'success') {
        setAiSuggestions(response.data.data.suggestions);
        setAiDrawerVisible(true);
        message.success('🤖 AI đã tạo gợi ý');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      message.error('Không thể lấy gợi ý từ AI');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI suggestion to form
  const applySuggestion = (type, value) => {
    if (type === 'labs') {
      const currentLabs = data.labs || [];
      if (!currentLabs.includes(value)) {
        handleChange('labs', [...currentLabs, value]);
        message.success(`Đã thêm xét nghiệm: ${value}`);
      }
    } else if (type === 'diagnosis') {
      const current = data.diagnosis || '';
      handleChange('diagnosis', current ? `${current}\n- ${value}` : value);
      message.success(`Đã thêm chẩn đoán: ${value}`);
    } else if (type === 'medications') {
      const current = data.medications || '';
      handleChange('medications', current ? `${current}\n- ${value}` : value);
      message.success(`Đã thêm thuốc: ${value}`);
    }
  };

  const handleXrayAnalyze = async (file_id) => {
    setXrayLoading(true);
    try {
      const response = await api.post(`/consultation/${consultationId}/analyze-xray`, {
        file_id
      });
      
      const result = response.data?.data || response.data;
      setXrayResult(result);
      
      // Update specialty data with X-ray result
      handleChange('xray_analysis', {
        file_id,
        ai_prediction: result.prediction,
        confidence: result.confidence,
        analyzed_at: new Date().toISOString()
      });
      
      message.success('Đã phân tích X-quang bằng AI');
    } catch (error) {
      console.error('Error analyzing X-ray:', error);
      message.error('Lỗi phân tích X-quang');
    } finally {
      setXrayLoading(false);
    }
  };

  const handleXrayUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientInfo?._id || '');
    formData.append('file_type', 'xray');

    try {
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const uploadedFile = response.data?.data || response.data;
      message.success('Đã upload X-quang');
      
      // Auto analyze
      await handleXrayAnalyze(uploadedFile._id);
    } catch (error) {
      console.error('Error uploading X-ray:', error);
      message.error('Lỗi upload file');
    }
    
    return false; // Prevent default upload
  };

  // Render Quick Templates Selector
  const renderTemplateSelector = () => {
    const templateList = Object.values(templates);
    
    if (templateList.length === 0) return null;
    
    return (
      <Card size="small" className="mb-4" style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">
            <ThunderboltOutlined className="mr-2" />
            Quick Templates - Điền nhanh
          </span>
          <Button 
            type="primary" 
            size="small" 
            icon={<RobotOutlined />}
            loading={aiLoading}
            onClick={getAISuggestions}
          >
            AI Gợi ý
          </Button>
        </div>
        <Space wrap>
          {templateList.map(template => (
            <Button
              key={template.id}
              type={selectedTemplate === template.id ? 'primary' : 'default'}
              size="small"
              icon={selectedTemplate === template.id ? <CheckCircleOutlined /> : null}
              onClick={() => applyTemplate(template)}
            >
              {template.icon} {template.name}
            </Button>
          ))}
        </Space>
      </Card>
    );
  };

  // Render AI Suggestions Drawer
  const renderAIDrawer = () => {
    if (!aiSuggestions) return null;
    
    return (
      <Drawer
        title={<><RobotOutlined className="mr-2" />AI Assistant - Gợi ý thông minh</>}
        placement="right"
        width={400}
        onClose={() => setAiDrawerVisible(false)}
        open={aiDrawerVisible}
      >
        {aiSuggestions.labs && aiSuggestions.labs.length > 0 && (
          <div className="mb-4">
            <Divider orientation="left">
              <BulbOutlined className="mr-2" />
              Xét nghiệm đề xuất
            </Divider>
            <Space direction="vertical" style={{ width: '100%' }}>
              {aiSuggestions.labs.map((lab, idx) => (
                <Tag 
                  key={idx} 
                  color="blue" 
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => applySuggestion('labs', lab)}
                >
                  + {lab}
                </Tag>
              ))}
            </Space>
          </div>
        )}
        
        {aiSuggestions.diagnosis && aiSuggestions.diagnosis.length > 0 && (
          <div className="mb-4">
            <Divider orientation="left">Chẩn đoán sơ bộ</Divider>
            <Space direction="vertical" style={{ width: '100%' }}>
              {aiSuggestions.diagnosis.map((diag, idx) => (
                <Tag 
                  key={idx} 
                  color="green"
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => applySuggestion('diagnosis', diag)}
                >
                  + {diag}
                </Tag>
              ))}
            </Space>
          </div>
        )}
        
        {aiSuggestions.medications && aiSuggestions.medications.length > 0 && (
          <div className="mb-4">
            <Divider orientation="left">Thuốc đề xuất</Divider>
            <Space direction="vertical" style={{ width: '100%' }}>
              {aiSuggestions.medications.map((med, idx) => (
                <Tag 
                  key={idx} 
                  color="orange"
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => applySuggestion('medications', med)}
                >
                  + {med}
                </Tag>
              ))}
            </Space>
          </div>
        )}
        
        {aiSuggestions.notes && (
          <div>
            <Divider orientation="left">Lưu ý</Divider>
            <Alert message={aiSuggestions.notes} type="info" showIcon />
          </div>
        )}
      </Drawer>
    );
  };

  if (normalizedSpecialty === SPECIALTIES.INTERNAL) {
    return (
      <div className="specialty-exam-step">
        {renderTemplateSelector()}
        {renderAIDrawer()}
        
        {/* Widgets Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <BMICalculator 
            weight={data.weight}
            height={data.height}
            onUpdate={(field, value) => handleChange(field, value)}
          />
          <CardiovascularRiskCalculator
            age={patientInfo?.age}
            gender={patientInfo?.gender}
            cholesterol={data.cholesterol}
            bloodPressure={data.blood_pressure}
            smoking={data.smoking}
            diabetes={data.diabetes}
          />
        </div>
        
        <Card title={<><ExperimentOutlined className="mr-2" />{specialtyIcon} Khám {specialtyDisplayName}</>}>
          {/* Hô hấp */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Khám hô hấp (Respiratory)
            </label>
            <TextArea
              rows={2}
              placeholder="Mô tả khám hệ hô hấp: phổi, nhịp thở, nghe phổi..."
              value={data.respiratory}
              onChange={(e) => handleChange('respiratory', e.target.value)}
            />
          </div>

          {/* Tim mạch */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Khám tim mạch (Cardiovascular)
            </label>
            <TextArea
              rows={2}
              placeholder="Mô tả khám tim mạch: nhịp tim, tiếng tim, mạch..."
              value={data.cardiovascular}
              onChange={(e) => handleChange('cardiovascular', e.target.value)}
            />
          </div>

          {/* Tiêu hóa */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Khám tiêu hóa (Gastrointestinal)
            </label>
            <TextArea
              rows={2}
              placeholder="Mô tả khám hệ tiêu hóa: bụng, gan, lách..."
              value={data.gastrointestinal}
              onChange={(e) => handleChange('gastrointestinal', e.target.value)}
            />
          </div>

          {/* Tiết niệu */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Khám tiết niệu (Urinary)
            </label>
            <TextArea
              rows={2}
              placeholder="Mô tả khám hệ tiết niệu: thận, bàng quang..."
              value={data.urinary}
              onChange={(e) => handleChange('urinary', e.target.value)}
            />
          </div>

          {/* Nội tiết */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Khám nội tiết (Endocrine)
            </label>
            <TextArea
              rows={2}
              placeholder="Đánh giá hệ nội tiết: tuyến giáp, đái tháo đường..."
              value={data.endocrine}
              onChange={(e) => handleChange('endocrine', e.target.value)}
            />
          </div>

          {/* Xét nghiệm */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Xét nghiệm chỉ định (Labs)
            </label>
            <Select
              mode="tags"
              placeholder="Chọn hoặc nhập xét nghiệm cần làm"
              value={data.labs || []}
              onChange={(value) => handleChange('labs', value)}
              className="w-full"
            >
              <Select.Option value="Công thức máu">Công thức máu</Select.Option>
              <Select.Option value="Sinh hóa máu">Sinh hóa máu</Select.Option>
              <Select.Option value="Đường huyết">Đường huyết</Select.Option>
              <Select.Option value="HbA1c">HbA1c</Select.Option>
              <Select.Option value="Chức năng gan">Chức năng gan</Select.Option>
              <Select.Option value="Chức năng thận">Chức năng thận</Select.Option>
              <Select.Option value="Lipid máu">Lipid máu</Select.Option>
            </Select>
          </div>

          {/* Chẩn đoán hình ảnh */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Chẩn đoán hình ảnh (Imaging)
            </label>
            <Select
              mode="tags"
              placeholder="Chọn hoặc nhập chẩn đoán hình ảnh cần làm"
              value={data.imaging || []}
              onChange={(value) => handleChange('imaging', value)}
              className="w-full"
            >
              <Select.Option value="X-quang phổi">X-quang phổi</Select.Option>
              <Select.Option value="X-quang bụng">X-quang bụng</Select.Option>
              <Select.Option value="CT Scanner">CT Scanner</Select.Option>
              <Select.Option value="MRI">MRI</Select.Option>
              <Select.Option value="Siêu âm bụng">Siêu âm bụng</Select.Option>
              <Select.Option value="Siêu âm tim">Siêu âm tim</Select.Option>
            </Select>
          </div>
          {/* X-ray Analysis (Optional) */}
          <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
            <label className="block text-sm font-medium mb-2">
              📷 X-quang phổi (tùy chọn - có AI hỗ trợ)
            </label>
            <Upload
              beforeUpload={handleXrayUpload}
              accept="image/*"
              maxCount={1}
              showUploadList={true}
            >
              <Button icon={<UploadOutlined />}>Upload X-quang</Button>
            </Upload>
            <p className="text-xs text-gray-500 mt-1">
              Hệ thống sẽ tự động phân tích bằng AI sau khi upload
            </p>
          </div>

          {xrayLoading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4 text-center">
              <Spin /> <span className="ml-2">Đang phân tích X-quang bằng AI...</span>
            </div>
          )}

          {xrayResult && (
            <Alert
              message="Kết quả phân tích AI"
              description={
                <div>
                  <p><strong>Dự đoán:</strong> {xrayResult.prediction}</p>
                  <p><strong>Độ tin cậy:</strong> {(xrayResult.confidence * 100).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-2">
                    ⚠️ Kết quả AI chỉ mang tính tham khảo. Bác sĩ cần đánh giá tổng hợp.
                  </p>
                </div>
              }
              type="info"
              showIcon
              className="mb-4"
            />
          )}
        </Card>
      </div>
    );
  }

  if (normalizedSpecialty === SPECIALTIES.OBSTETRIC) {
    return (
      <div className="specialty-exam-step">
        {renderTemplateSelector()}
        {renderAIDrawer()}
        
        {/* Widgets Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <EDDCalculator 
            lmp={data.lmp}
            onUpdate={(field, value) => handleChange(field, value)}
          />
          <FetalHeartRateMonitor fhr={data.fhr_bpm} />
        </div>
        
        <Card title={`${specialtyIcon} Khám ${specialtyDisplayName}`}>
          {/* Gravida & Para */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Gravida (Số lần mang thai) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="0"
                value={data.gravida}
                onChange={(value) => handleChange('gravida', value)}
                min={0}
                max={20}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Para (Số lần sinh) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="0"
                value={data.para}
                onChange={(value) => handleChange('para', value)}
                min={0}
                max={20}
                className="w-full"
              />
            </div>
          </div>

          {/* LMP & EDD */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                LMP (Ngày kinh cuối) <span className="text-red-500">*</span>
              </label>
              <DatePicker
                placeholder="Chọn ngày"
                value={data.lmp ? moment(data.lmp) : null}
                onChange={(date) => handleChange('lmp', date ? date.format('YYYY-MM-DD') : '')}
                format="DD/MM/YYYY"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                EDD (Ngày dự sinh)
              </label>
              <DatePicker
                placeholder="Chọn ngày"
                value={data.edd ? moment(data.edd) : null}
                onChange={(date) => handleChange('edd', date ? date.format('YYYY-MM-DD') : '')}
                format="DD/MM/YYYY"
                className="w-full"
              />
            </div>
          </div>

          {/* Tuổi thai */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Tuổi thai (tuần) <span className="text-red-500">*</span>
            </label>
            <InputNumber
              placeholder="Nhập tuần thai (0-42)"
              value={data.gestational_age_weeks}
              onChange={(value) => handleChange('gestational_age_weeks', value)}
              min={0}
              max={42}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Thai kỳ đủ tháng: 37-42 tuần</p>
          </div>

          {/* Fundal height & FHR */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Chiều cao tử cung (cm) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="Fundal height"
                value={data.fundal_height_cm}
                onChange={(value) => handleChange('fundal_height_cm', value)}
                min={0}
                max={50}
                step={0.1}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Nhịp tim thai (bpm) <span className="text-red-500">*</span>
              </label>
              <InputNumber
                placeholder="FHR"
                value={data.fhr_bpm}
                onChange={(value) => handleChange('fhr_bpm', value)}
                min={60}
                max={200}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Bình thường: 110-160 bpm</p>
            </div>
          </div>

          {/* Presentation */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Ngôi thai (Presentation)
            </label>
            <Select
              placeholder="Chọn ngôi thai"
              value={data.presentation}
              onChange={(value) => handleChange('presentation', value)}
              className="w-full"
            >
              <Select.Option value="Ngôi đầu">Ngôi đầu (Cephalic)</Select.Option>
              <Select.Option value="Ngôi mông">Ngôi mông (Breech)</Select.Option>
              <Select.Option value="Ngôi ngang">Ngôi ngang (Transverse)</Select.Option>
              <Select.Option value="Ngôi chéo">Ngôi chéo (Oblique)</Select.Option>
            </Select>
          </div>

          {/* Fetal movement */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Cử động thai (Fetal movement)
            </label>
            <Select
              placeholder="Chọn tình trạng"
              value={data.fetal_movement}
              onChange={(value) => handleChange('fetal_movement', value)}
              className="w-full"
            >
              <Select.Option value="Bình thường">Bình thường</Select.Option>
              <Select.Option value="Giảm">Giảm</Select.Option>
              <Select.Option value="Không cảm nhận">Không cảm nhận</Select.Option>
              <Select.Option value="Chưa xuất hiện">{'Chưa xuất hiện (< 20 tuần)'}</Select.Option>
            </Select>
          </div>

          {/* Vaginal bleeding & Amniotic fluid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Chảy máu âm đạo
              </label>
              <Select
                placeholder="Có/Không"
                value={data.vaginal_bleeding}
                onChange={(value) => handleChange('vaginal_bleeding', value)}
                className="w-full"
              >
                <Select.Option value="Không">Không</Select.Option>
                <Select.Option value="Ít">Ít</Select.Option>
                <Select.Option value="Nhiều">Nhiều</Select.Option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Vỡ ối
              </label>
              <Select
                placeholder="Có/Không"
                value={data.amniotic_fluid_leak}
                onChange={(value) => handleChange('amniotic_fluid_leak', value)}
                className="w-full"
              >
                <Select.Option value="Không">Không</Select.Option>
                <Select.Option value="Nghi ngờ">Nghi ngờ</Select.Option>
                <Select.Option value="Xác nhận">Xác nhận</Select.Option>
              </Select>
            </div>
          </div>

          {/* Blood pressure & Edema */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Huyết áp (theo dõi tiền sản giật)
              </label>
              <Input
                placeholder="VD: 120/80"
                value={data.blood_pressure}
                onChange={(e) => handleChange('blood_pressure', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Cao huyết áp: ≥ 140/90 mmHg</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Phù (Edema)
              </label>
              <Select
                placeholder="Chọn mức độ"
                value={data.edema}
                onChange={(value) => handleChange('edema', value)}
                className="w-full"
              >
                <Select.Option value="Không">Không</Select.Option>
                <Select.Option value="Nhẹ">Nhẹ (+)</Select.Option>
                <Select.Option value="Trung bình">Trung bình (++)</Select.Option>
                <Select.Option value="Nặng">Nặng (+++)</Select.Option>
              </Select>
            </div>
          </div>

          {/* Ultrasound findings */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Kết quả siêu âm sản khoa (Obstetric ultrasound)
            </label>
            <TextArea
              rows={4}
              placeholder="Mô tả kết quả siêu âm: 
- Số lượng thai
- Vị trí nhau thai
- Lượng nước ối
- Cân nặng ước tính thai
- Bất thường nếu có..."
              value={data.obstetric_ultrasound}
              onChange={(e) => handleChange('obstetric_ultrasound', e.target.value)}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (normalizedSpecialty === SPECIALTIES.PEDIATRIC) {
    return (
      <div className="specialty-exam-step">
        {renderTemplateSelector()}
        {renderAIDrawer()}
        
        {/* Widgets Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <WHOGrowthChart
            age={patientInfo?.age}
            weight={data.growth?.weight_kg}
            height={data.growth?.height_cm}
            gender={patientInfo?.gender}
          />
          <ImmunizationTracker
            ageMonths={patientInfo?.age}
            immunizationStatus={data.immunization_status}
          />
        </div>
        
        <Card title={`${specialtyIcon} Khám ${specialtyDisplayName}`}>
          {/* Guardian name */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Tên người giám hộ <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Nhập tên bố/mẹ hoặc người giám hộ"
              value={data.guardian_name}
              onChange={(e) => handleChange('guardian_name', e.target.value)}
            />
          </div>

          {/* Growth metrics */}
          <div className="p-4 bg-blue-50 rounded mb-4">
            <h4 className="font-medium mb-3">📊 Chỉ số tăng trưởng (Growth)</h4>
            
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cân nặng (kg) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  placeholder="0.0"
                  value={data.growth?.weight_kg}
                  onChange={(value) => handleChange('growth', { ...data.growth, weight_kg: value })}
                  min={0}
                  max={150}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Chiều cao (cm) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  placeholder="0.0"
                  value={data.growth?.height_cm}
                  onChange={(value) => handleChange('growth', { ...data.growth, height_cm: value })}
                  min={0}
                  max={200}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Vòng đầu (cm)
                </label>
                <InputNumber
                  placeholder="0.0"
                  value={data.growth?.head_circumference_cm}
                  onChange={(value) => handleChange('growth', { ...data.growth, head_circumference_cm: value })}
                  min={0}
                  max={65}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Quan trọng với trẻ &lt; 2 tuổi</p>
              </div>
            </div>
          </div>

          {/* Nutrition */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Tình trạng dinh dưỡng (Nutrition)
            </label>
            <TextArea
              rows={2}
              placeholder="Đánh giá tình trạng dinh dưỡng, chế độ ăn uống, thói quen ăn..."
              value={data.nutrition}
              onChange={(e) => handleChange('nutrition', e.target.value)}
            />
          </div>

          {/* Immunization status */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Tình trạng tiêm chủng (Immunization)
            </label>
            <Select
              placeholder="Chọn tình trạng"
              value={data.immunization_status}
              onChange={(value) => handleChange('immunization_status', value)}
              className="w-full"
            >
              <Select.Option value="Đầy đủ theo lịch">✅ Đầy đủ theo lịch</Select.Option>
              <Select.Option value="Chưa đầy đủ">⚠️ Chưa đầy đủ</Select.Option>
              <Select.Option value="Chậm lịch">⏰ Chậm lịch</Select.Option>
              <Select.Option value="Chưa tiêm">❌ Chưa tiêm</Select.Option>
            </Select>
          </div>

          {/* Development */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Phát triển (Development)
            </label>
            <TextArea
              rows={3}
              placeholder="Đánh giá phát triển:
- Vận động: lật, ngồi, bò, đi, chạy...
- Ngôn ngữ: nói, phát âm...
- Xã hội: tương tác, giao tiếp...
- Nhận thức: học tập, tư duy..."
              value={data.development}
              onChange={(e) => handleChange('development', e.target.value)}
            />
          </div>

          {/* Main symptoms */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Triệu chứng chính của trẻ (Main symptoms)
            </label>
            <TextArea
              rows={3}
              placeholder="Mô tả các triệu chứng chính mà trẻ đang gặp phải..."
              value={data.main_symptoms}
              onChange={(e) => handleChange('main_symptoms', e.target.value)}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Fallback: Hiển thị cảnh báo nếu specialty không hợp lệ
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Chuyên khoa không được hỗ trợ
      </h3>
      <p className="text-gray-600 mb-4">
        Chuyên khoa "{specialty}" chưa có mẫu khám bệnh.
        <br />
        <span className="text-sm text-gray-500">(Normalized: "{normalizedSpecialty}")</span>
      </p>
      <p className="text-sm text-gray-500">
        Các chuyên khoa được hỗ trợ: Nội tổng quát, Sản phụ khoa, Nhi khoa
      </p>
    </div>
  );
};

export default SpecialtyExamStep;
