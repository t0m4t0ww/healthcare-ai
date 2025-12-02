// src/components/consultation/steps/PhysicalExamStep.js
import React from 'react';
import { Card, Input, Select } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

const PhysicalExamStep = ({ data, onChange }) => {
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="physical-exam-step">
      <Card title="Khám lâm sàng tổng quát">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Tình trạng chung (General Appearance)
          </label>
          <Select
            placeholder="Chọn tình trạng"
            value={data.general_appearance}
            onChange={(value) => handleChange('general_appearance', value)}
            className="w-full"
          >
            <Option value="well_appearing">Tỉnh táo, tiếp xúc tốt</Option>
            <Option value="ill_appearing">Có vẻ mệt mỏi</Option>
            <Option value="distressed">Đau đớn/khó chịu rõ ràng</Option>
            <Option value="lethargic">Lờ đờ, ít phản ứng</Option>
          </Select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Head, Eyes, Ears, Nose, Throat (HEENT)
          </label>
          <TextArea
            rows={3}
            placeholder="Khám đầu, mắt, tai, mũi, họng...
VD: Đầu: bình thường, không sang chấn
     Mắt: kết mạc hồng, không sung huyết
     Tai: không dịch chảy
     Mũi: thông thoáng
     Họng: không sung huyết"
            value={data.heent}
            onChange={(e) => handleChange('heent', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Cardiovascular (Tim mạch)
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Tiếng tim đều, không tiếng thổi, không rối loạn nhịp"
            value={data.cardiovascular}
            onChange={(e) => handleChange('cardiovascular', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Respiratory (Hô hấp)
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Phổi thông khí tốt hai bên, không ran, không khò khè"
            value={data.respiratory}
            onChange={(e) => handleChange('respiratory', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Abdomen (Bụng)
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Bụng mềm, không căng, không đau ấn, gan lách không to"
            value={data.abdomen}
            onChange={(e) => handleChange('abdomen', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Extremities (Chi)
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Không phù, mạch đập tốt, vận động bình thường"
            value={data.extremities}
            onChange={(e) => handleChange('extremities', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Neurological (Thần kinh)
          </label>
          <TextArea
            rows={2}
            placeholder="VD: Tỉnh táo, định hướng tốt, vận động và cảm giác bình thường"
            value={data.neurological}
            onChange={(e) => handleChange('neurological', e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Ghi chú khám bổ sung
          </label>
          <TextArea
            rows={3}
            placeholder="Các phát hiện khác trong quá trình khám..."
            value={data.examination_notes}
            onChange={(e) => handleChange('examination_notes', e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
};

export default PhysicalExamStep;
