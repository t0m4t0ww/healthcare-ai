// src/components/consultation/CompletionModal.js
import React from 'react';
import { Modal, Typography, Space, Button } from 'antd';
import { CheckCircle2, FileText, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const CompletionModal = ({ visible, onClose, onGoHome, patientName, appointmentDate }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={500}
      closable={false}
      maskClosable={false}
      className="completion-modal"
    >
      <div className="text-center py-6">
        {/* Success Icon with Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="mb-4"
        >
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle2 size={48} className="text-white" />
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Title level={3} className="!mb-2 !text-emerald-600">
            Khám bệnh hoàn tất! 
          </Title>
          <Paragraph className="text-gray-600 mb-4">
            Phiên khám bệnh đã được lưu thành công vào hồ sơ bệnh án.
          </Paragraph>
        </motion.div>

        {/* Patient Info */}
        {patientName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
          >
            <Space direction="vertical" size={4} className="w-full">
              <Text strong className="text-emerald-700">
                <FileText size={16} className="mr-2 inline-block" />
                Bệnh nhân: {patientName}
              </Text>
              {appointmentDate && (
                <Text type="secondary" className="text-sm">
                  Ngày khám: {new Date(appointmentDate).toLocaleDateString('vi-VN')}
                </Text>
              )}
            </Space>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Space size="middle">
            <Button
              type="default"
              size="large"
              onClick={onClose}
            >
              Đóng
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<Home size={16} />}
              onClick={onGoHome}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 hover:from-emerald-600 hover:to-teal-600"
            >
              Về trang chủ
            </Button>
          </Space>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <div className="flex justify-center gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-emerald-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </Modal>
  );
};

export default CompletionModal;

