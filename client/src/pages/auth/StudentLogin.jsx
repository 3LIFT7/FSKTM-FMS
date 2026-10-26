import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Tabs, Typography, Space, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';
import GoogleAuthModal, { GoogleContinueButton } from '../../components/GoogleAuthModal';

const { Title, Text } = Typography;

export default function StudentLogin() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);

  const [loginForm] = Form.useForm();

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/student';

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      await login(values.email, values.password, 'student');
      message.success('Welcome to FSKTM Portal');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    loginForm.setFieldsValue({
      email: 'AI230182@student.uthm.edu.my',
      password: 'Student123!',
    });
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #172554 100%)',
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
            FSKTM Student Portal
          </Title>
          <Text style={{ color: '#93C5FD', fontSize: 13 }}>
            Integrated Facility Booking & Maintenance System
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

          <Tabs
            activeKey={activeTab}
            onChange={(k) => {
              setActiveTab(k);
              setError('');
            }}
            centered
            items={[
              {
                key: 'login',
                label: 'Sign In',
                children: (
                  <div>
                    {/* Demo auto-fill */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A' }}>
                          <ThunderboltOutlined style={{ marginRight: 4 }} /> Demo UTHM Student Account
                        </div>
                        <div style={{ fontSize: 11, color: '#3B82F6' }}>AI230182@student.uthm.edu.my</div>
                      </div>
                      <Button size="small" type="primary" onClick={fillDemo}>
                        Auto-Fill
                      </Button>
                    </div>

                    {/* Pill-shaped Continue with Google Button */}
                    <div style={{ marginBottom: 16 }}>
                      <GoogleContinueButton
                        onClick={() => setIsGoogleOpen(true)}
                        text="Continue with Google"
                      />
                    </div>

                    <div style={{ textAlign: 'center', margin: '14px 0', fontSize: 11, color: '#94A3B8' }}>
                      — or sign in with password —
                    </div>

                    <Form
                      form={loginForm}
                      layout="vertical"
                      onFinish={handleLogin}
                      requiredMark="optional"
                    >
                      <Form.Item
                        name="email"
                        label="Siswamail or Matric Number"
                        rules={[{ required: true, message: 'Please enter your email or matric number' }]}
                      >
                        <Input
                          prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="e.g. AI230182@student.uthm.edu.my"
                          size="large"
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        label={
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Password</span>
                          </div>
                        }
                        rules={[{ required: true, message: 'Please enter your password' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="••••••••"
                          size="large"
                        />
                      </Form.Item>

                      <div style={{ textAlign: 'right', marginBottom: 20 }}>
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
                          style={{ height: 44, fontWeight: 700 }}
                        >
                          Sign In as Student
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'register',
                label: 'Register Account',
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {/* Exclusive Google Registration Card */}
                    <div
                      style={{
                        padding: '18px 16px',
                        background: '#F8FAFC',
                        borderRadius: 14,
                        border: '1.5px solid #E2E8F0',
                        marginBottom: 20,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <SafetyCertificateOutlined style={{ color: '#2563EB', fontSize: 15 }} />
                        Official Student Google Registration
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
                        Student accounts are registered exclusively via <strong>Google Workspace</strong>. Only active UTHM student addresses are permitted:
                        <div style={{ marginTop: 8 }}>
                          <code style={{ fontSize: 12, background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                            AI230182@student.uthm.edu.my
                          </code>
                        </div>
                      </div>

                      {/* Pill-shaped Continue with Google Button */}
                      <GoogleContinueButton
                        onClick={() => setIsGoogleOpen(true)}
                        text="Continue with Google"
                      />
                    </div>

                    <div style={{ textAlign: 'center', fontSize: 12, color: '#64748B' }}>
                      Your matric number and academic profile will be automatically linked via your university Google login.
                    </div>
                  </div>
                ),
              },
            ]}
          />

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
            <div>Are you an academic member or technical staff?</div>
            <Space split={<span style={{ color: '#CBD5E1' }}>|</span>} style={{ marginTop: 6 }}>
              <Link to="/login/lecturer" style={{ fontWeight: 600, color: '#1E3A8A' }}>
                Lecturer Portal &rarr;
              </Link>
              <Link to="/login/staff" style={{ fontWeight: 600, color: '#334155' }}>
                Staff & Operations &rarr;
              </Link>
            </Space>
          </div>
        </Card>
      </div>

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
      <GoogleAuthModal
        isOpen={isGoogleOpen}
        onClose={() => setIsGoogleOpen(false)}
        defaultRole="student"
        mode={activeTab === 'register' ? 'register' : 'login'}
      />
    </div>
  );
}
