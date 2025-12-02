// components/forms/RegisterForm.js - Ant Design Version ✅
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Checkbox, 
  Alert,
  Progress,
  Typography,
  Space
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  HomeOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import moment from "moment";
import { loadCredentials, saveCredentials, clearCredentials } from "../../utils/credentialStorage";

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

/* ============ Password strength helper ============ */
const getPasswordStrength = (pwd) => {
  if (!pwd) return { percent: 0, label: "Rất yếu", status: "exception" };
  
  let score = 0;
  if (pwd.length >= 8) score += 20;
  if (/[A-Z]/.test(pwd)) score += 20;
  if (/[a-z]/.test(pwd)) score += 20;
  if (/\d/.test(pwd)) score += 20;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
  
  const labels = {
    0: "Rất yếu",
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
    percent: score,
    label: labels[score] || "Rất yếu",
    status: statuses[score] || "exception"
  };
};

/* ============ Component ============ */
const POLICY_LINKS = {
  terms: "/terms-of-service",
  privacy: "/privacy-policy",
};

const RegisterForm = ({
  onSubmit,
  onSwitchToLogin,
  submitButtonText = "Đăng ký tài khoản",
  showSwitchToLogin = true,
  includePhone = false,
  className = "",
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const saved = loadCredentials("patient");
    if (saved?.email && saved?.password) {
      form.setFieldsValue({
        email: saved.email,
        password: saved.password,
        confirm_password: saved.password,
        rememberPassword: true,
      });
      setPassword(saved.password);
    }
  }, [form]);

  const passwordStrength = getPasswordStrength(password);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const clean = {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        dob: values.dob.format('YYYY-MM-DD'),
        gender: values.gender,
        address: values.address.trim(),
        password: values.password,
        role: "patient",
        accepted_terms: !!values.terms,
      };

      if (values.rememberPassword) {
        saveCredentials("patient", clean.email, clean.password);
      } else {
        clearCredentials("patient");
      }
      
      const helpers = {
        setSubmitting: setLoading,
        setFieldError: (field, error) => {
          form.setFields([{ name: field, errors: [error] }]);
        },
        setStatus: setStatusMessage
      };
      
      await onSubmit(clean, helpers);
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicyLink = (type) => {
    const url = POLICY_LINKS[type];
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Form
      form={form}
      name="register"
      layout="vertical"
      onFinish={handleFinish}
      className={className}
      size="large"
      scrollToFirstError
      className="space-y-3 md:space-y-4"
      initialValues={{
        rememberPassword: false,
        terms: false,
      }}
    >
      {/* Status message */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert
            message={statusMessage.message}
            type={statusMessage.type === "success" ? "success" : "error"}
            icon={statusMessage.type === "success" ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            showIcon
            closable
            onClose={() => setStatusMessage(null)}
            className="mb-4"
          />
        </motion.div>
      )}

      {/* Full name */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Họ và tên</span>}
        name="full_name"
        rules={[
          { required: true, message: 'Vui lòng nhập họ tên!' },
          { min: 2, message: 'Tên phải có ít nhất 2 ký tự!' },
          { whitespace: true, message: 'Tên không được chỉ chứa khoảng trắng!' }
        ]}
      >
        <Input
          prefix={<UserOutlined className="text-emerald-500" />}
          placeholder="Nguyễn Văn An"
          autoComplete="name"
        />
      </Form.Item>

      {/* Email */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Email</span>}
        name="email"
        rules={[
          { required: true, message: 'Vui lòng nhập email!' },
          { type: 'email', message: 'Email không hợp lệ!' }
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-emerald-500" />}
          placeholder="example@email.com"
          autoComplete="email"
        />
      </Form.Item>

      {/* Phone */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Số điện thoại</span>}
        name="phone"
        rules={[
          { required: true, message: 'Vui lòng nhập số điện thoại!' },
          { pattern: /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/, message: 'Số điện thoại không hợp lệ!' }
        ]}
      >
        <Input
          prefix={<PhoneOutlined className="text-emerald-500" />}
          placeholder="0901234567"
          type="tel"
        />
      </Form.Item>

      {/* Date of Birth */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Ngày sinh</span>}
        name="dob"
        rules={[
          { required: true, message: 'Vui lòng chọn ngày sinh!' },
          {
            validator: (_, value) => {
              if (!value || value.isBefore(moment())) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Ngày sinh không được là ngày trong tương lai!'));
            }
          }
        ]}
      >
        <DatePicker
          format="DD/MM/YYYY"
          placeholder="Chọn ngày sinh"
          style={{ width: '100%' }}
          disabledDate={(current) => current && current > moment().endOf('day')}
        />
      </Form.Item>

      {/* Gender */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Giới tính</span>}
        name="gender"
        rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}
      >
        <Select placeholder="Chọn giới tính">
          <Option value="male">Nam</Option>
          <Option value="female">Nữ</Option>
          <Option value="other">Khác</Option>
        </Select>
      </Form.Item>

      {/* Address */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Địa chỉ</span>}
        name="address"
        rules={[
          { required: true, message: 'Vui lòng nhập địa chỉ!' },
          { min: 5, message: 'Địa chỉ phải có ít nhất 5 ký tự!' }
        ]}
      >
        <TextArea
          prefix={<HomeOutlined className="text-emerald-500" />}
          placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
          rows={2}
          showCount
          maxLength={200}
        />
      </Form.Item>

      {/* Password */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Mật khẩu</span>}
        name="password"
        rules={[
          { required: true, message: 'Vui lòng nhập mật khẩu!' },
          { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự!' },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              
              const errors = [];
              if (!/[A-Z]/.test(value)) errors.push("chữ hoa");
              if (!/[a-z]/.test(value)) errors.push("chữ thường");
              if (!/\d/.test(value)) errors.push("số");
              if (!/[^A-Za-z0-9]/.test(value)) errors.push("ký tự đặc biệt");
              
              if (errors.length > 0) {
                return Promise.reject(new Error(`Mật khẩu phải có: ${errors.join(", ")}`));
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-emerald-500" />}
          placeholder="Nhập mật khẩu"
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Item>

      {/* Password Strength Indicator */}
      {password && (
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <Text className="text-white/80" style={{ fontSize: 12 }}>Độ mạnh mật khẩu</Text>
            <Text className="text-white" style={{ fontSize: 12 }} strong>
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
          <Text className="text-white/70" style={{ fontSize: 12 }}>
            Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </Text>
        </div>
      )}

      {/* Confirm Password */}
      <Form.Item
        label={<span className="text-white font-semibold text-sm md:text-base">Xác nhận mật khẩu</span>}
        name="confirm_password"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-emerald-500" />}
          placeholder="Nhập lại mật khẩu"
        />
      </Form.Item>

      <div className="bg-white/5 rounded-2xl p-4 space-y-3 mt-2">
        {/* Remember Password */}
        <Form.Item name="rememberPassword" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox className="text-white/90">
            Ghi nhớ mật khẩu cho lần đăng nhập sau
          </Checkbox>
        </Form.Item>

        {/* Terms */}
        <Form.Item
          name="terms"
          valuePropName="checked"
          style={{ marginBottom: 0 }}
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error('Bạn phải đồng ý với điều khoản!')),
            },
          ]}
        >
          <Checkbox className="text-white">
            <span className="text-white/90">
              Tôi đồng ý với{" "}
              <Button
                type="link"
                onClick={(e) => {
                  e.preventDefault();
                  handlePolicyLink("terms");
                }}
                className="text-emerald-400 hover:text-emerald-300 p-0 h-auto"
              >
                Điều khoản sử dụng
              </Button>{" "}
              và{" "}
              <Button
                type="link"
                onClick={(e) => {
                  e.preventDefault();
                  handlePolicyLink("privacy");
                }}
                className="text-emerald-400 hover:text-emerald-300 p-0 h-auto"
              >
                Chính sách bảo mật
              </Button>
            </span>
          </Checkbox>
        </Form.Item>
      </div>

      {/* Submit */}
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={loading}
          icon={<UserAddOutlined />}
          className="h-11 md:h-12 text-base md:text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
        >
          {submitButtonText}
        </Button>
      </Form.Item>

      {/* Switch to login */}
      {showSwitchToLogin && (
        <div className="text-center">
          <Text className="text-white/80">Đã có tài khoản? </Text>
          <Button
            type="link"
            onClick={onSwitchToLogin}
            className="text-emerald-400 hover:text-emerald-300 p-0 font-semibold"
          >
            Đăng nhập ngay
          </Button>
        </div>
      )}
    </Form>
  );
};

export default RegisterForm;
