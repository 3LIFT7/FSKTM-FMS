import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Typography, Space, message, Checkbox } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';
import { getRedirectDestination } from '../../utils/navigation';

const { Title, Text } = Typography;

export default function StaffLogin() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUrl = getRedirectDestination(location, '/staff');

  useEffect(() => {
    const savedEmail = localStorage.getItem('fsktm_remember_staff_email');
    if (savedEmail) {
      form.setFieldsValue({
        email: savedEmail,
        remember: true
      });
    }
  }, [form]);

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      if (values.remember) {
        localStorage.setItem('fsktm_remember_staff_email', values.email);
      } else {
        localStorage.removeItem('fsktm_remember_staff_email');
      }

      await login(values.email, values.password, 'staff', values.remember);
      message.success('Authenticated to Staff Console');
      navigate(redirectUrl, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillTech = () => {
    form.setFieldsValue({
      email: 'technician@fsktm.um.edu.my',
      password: 'Tech123!',
    });
    setError('');
  };

  const fillManager = () => {
    form.setFieldsValue({
      email: 'manager@fsktm.um.edu.my',
      password: 'Manager123!',
    });
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090D16 0%, #172554 50%, #064E3B 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: 440, width: '100%' }}>
        {/* Header branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 10,
              borderRadius: 16,
              background: '#FFFFFF',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              marginBottom: 16,
            }}
          >
            <img src="/logo-fsktm.png" alt="FSKTM Logo" style={{ height: 42, objectFit: 'contain' }} />
          </div>
          <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800 }}>
            Staff & Technician Console
          </Title>
          <Text style={{ color: '#A7F3D0', fontSize: 13 }}>
            Technical Operations, Maintenance & Lab Control
          </Text>
        </div>

        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            background: 'rgba(255, 255, 255, 0.98)',
          }}
          bodyStyle={{ padding: '24px 28px' }}
        >
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              closable
              onClose={() => setError('')}
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Demo credential presets */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>
              <ThunderboltOutlined style={{ marginRight: 4 }} /> Demo Staff Presets:
            </div>
            <Space style={{ width: '100%' }} size="small">
              <Button
                size="small"
                type="primary"
                icon={<ToolOutlined />}
                onClick={fillTech}
                style={{ background: '#059669', borderColor: '#059669', flex: 1 }}
              >
                Technician
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<SafetyCertificateOutlined />}
                onClick={fillManager}
                style={{ background: '#1E293B', borderColor: '#1E293B', flex: 1 }}
              >
                Lab Manager
              </Button>
            </Space>
          </div>

          <Form form={form} layout="vertical" onFinish={handleLogin} requiredMark="optional">
            <Form.Item
              name="email"
              label="Staff Email Address"
              rules={[
                { required: true, message: 'Please enter staff email' },
                { type: 'email', message: 'Please enter a valid email address' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                placeholder="staff@fsktm.um.edu.my"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Staff Password"
              rules={[{ required: true, message: 'Please enter password' }]}
              style={{ marginBottom: 8 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle initialValue={true}>
                <Checkbox style={{ fontSize: 13, color: '#475569' }}>Remember me</Checkbox>
              </Form.Item>
              <Button
                type="link"
                size="small"
                onClick={() => setIsForgotOpen(true)}
                style={{ padding: 0, fontSize: 12 }}
              >
                Forgot password?
              </Button>
            </div>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                icon={<ArrowRightOutlined />}
                style={{ height: 44, fontWeight: 700, background: '#059669', borderColor: '#059669' }}
              >
                Sign In to Staff Console
              </Button>
            </Form.Item>
          </Form>

          {/* Footer portal links */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center',
              fontSize: 12,
              color: '#64748B',
            }}
          >
            <div>Are you a student or faculty member?</div>
            <Space split={<span style={{ color: '#CBD5E1' }}>|</span>} style={{ marginTop: 6 }}>
              <Link to="/login/student" style={{ fontWeight: 600, color: '#1E3A8A' }}>
                &larr; Student Portal
              </Link>
              <Link to="/login/lecturer" style={{ fontWeight: 600, color: '#4F46E5' }}>
                Lecturer Portal &rarr;
              </Link>
            </Space>
          </div>
        </Card>
      </div>

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </div>
  );
}
