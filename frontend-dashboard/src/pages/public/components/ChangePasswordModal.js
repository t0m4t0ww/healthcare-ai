// pages/public/components/ChangePasswordModal.js - Ant Design Version ✅
import React, { useState, useEffect } from "react";
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Progress, 
  Space,
  Typography,
  message 
} from "antd";
import {
  LockOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import api from "../../../services/services";

const { Text } = Typography;

export default function ChangePasswordModal({ 
  open, 
  onClose, 
  isFirstTime = false,
  onSuccess 
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, form]);

  // Calculate password strength
  const getPasswordStrength = (password) => {
    if (!password) return { percent: 0, label: "", status: "exception" };
    
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    const labels = {
      0: "",
      20: "Yếu",
      40: "Trung bình",
      60: "Khá",
      80: "Mạnh",
      100: "Rất mạnh"
    };
    
    const statuses = {
      20: "exception",
      40: "exception",
      60: "normal",
      80: "success",
      100: "success"
    };
    
    return {
      percent: strength,
      label: labels[strength] || "",
      status: statuses[strength] || "exception"
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Validate password requirements
  const validatePasswordRules = (_, value) => {
    if (!value) return Promise.reject(new Error("Vui lòng nhập mật khẩu mới!"));
    
    const errors = [];
    if (value.length < 8) errors.push("Ít nhất 8 ký tự");
    if (!/[A-Z]/.test(value)) errors.push("Có chữ hoa");
    if (!/[a-z]/.test(value)) errors.push("Có chữ thường");
    if (!/[0-9]/.test(value)) errors.push("Có số");
    
    if (errors.length > 0) {
      return Promise.reject(new Error(`Mật khẩu phải: ${errors.join(", ")}`));
    }
    
    return Promise.resolve();
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        new_password: values.new_password
      };
      
      if (!isFirstTime) {
        payload.current_password = values.current_password;
      }
      
      await api.post("/change-password", payload);
      
      message.success("Đổi mật khẩu thành công! 🎉");
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Close modal sau 1s
      setTimeout(() => {
        form.resetFields();
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || "Đổi mật khẩu thất bại";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Check password requirements
  const checkRequirement = (requirement) => {
    if (!newPassword) return false;
    
    switch(requirement) {
      case 'length':
        return newPassword.length >= 8;
      case 'uppercase':
        return /[A-Z]/.test(newPassword);
      case 'lowercase':
        return /[a-z]/.test(newPassword);
      case 'number':
        return /[0-9]/.test(newPassword);
      default:
        return false;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <LockOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
          <span>{isFirstTime ? "Khuyến nghị đổi mật khẩu" : "Đổi mật khẩu"}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      maskClosable={!loading}
      keyboard={!loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={loading}
      >
        {/* Warning banner for first-time */}
        {isFirstTime && (
          <Alert
            message="Đây là mật khẩu mặc định"
            description="Vì lý do bảo mật, chúng tôi khuyên bạn nên đổi mật khẩu ngay. Bạn có thể bỏ qua nhưng sẽ được nhắc lại."
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            className="mb-4"
          />
        )}

        {/* Current Password (nếu không phải first-time) */}
        {!isFirstTime && (
          <Form.Item
            label="Mật khẩu hiện tại"
            name="current_password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu hiện tại"
              size="large"
            />
          </Form.Item>
        )}

        {/* New Password */}
        <Form.Item
          label="Mật khẩu mới"
          name="new_password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
            { validator: validatePasswordRules }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu mới"
            size="large"
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Item>

        {/* Password Strength Indicator */}
        {newPassword && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <Text type="secondary" style={{ fontSize: 12 }}>Độ mạnh mật khẩu</Text>
              <Text style={{ fontSize: 12 }} strong>
                {passwordStrength.label}
              </Text>
            </div>
            <Progress 
              percent={passwordStrength.percent} 
              status={passwordStrength.status}
              showInfo={false}
              strokeColor={{
                '0%': '#ff4d4f',
                '50%': '#faad14',
                '100%': '#52c41a',
              }}
            />
          </div>
        )}

        {/* Password Requirements */}
        {newPassword && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" style={{ fontSize: 12 }} strong>Yêu cầu mật khẩu:</Text>
            <Space direction="vertical" size={4} className="mt-2 w-full">
              {[
                { key: 'length', label: 'Ít nhất 8 ký tự' },
                { key: 'uppercase', label: 'Có chữ hoa' },
                { key: 'lowercase', label: 'Có chữ thường' },
                { key: 'number', label: 'Có số' },
              ].map((req) => {
                const passed = checkRequirement(req.key);
                return (
                  <div key={req.key} className="flex items-center gap-2">
                    {passed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                    )}
                    <Text 
                      style={{ 
                        fontSize: 12,
                        color: passed ? '#52c41a' : '#8c8c8c'
                      }}
                    >
                      {req.label}
                    </Text>
                  </div>
                );
              })}
            </Space>
          </div>
        )}

        {/* Confirm Password */}
        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirm_password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu mới"
            size="large"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Form.Item>

        {/* Password Match Indicator */}
        {confirmPassword && newPassword === confirmPassword && (
          <Alert
            message="Mật khẩu khớp"
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
            className="mb-4"
          />
        )}

        {/* Actions */}
        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button onClick={onClose} disabled={loading}>
              {isFirstTime ? "Để sau" : "Hủy"}
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<LockOutlined />}
            >
              Đổi mật khẩu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

