import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Tabs, Typography, Space, message, Checkbox } from 'antd';
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
import { getRedirectDestination } from '../../utils/navigation';

const { Title, Text } = Typography;

export default function LecturerLogin() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isGoogleOpen, setIsGoogleOpen] = useState(false);

  const [loginForm] = Form.useForm();

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUrl = getRedirectDestination(location, '/lecturer');

  useEffect(() => {
    const savedEmail = localStorage.getItem('fsktm_remember_lecturer_email');
    const savedPass = localStorage.getItem('fsktm_remember_lecturer_pass');
    if (savedEmail) {
      let decodedPass = '';
      try {
        decodedPass = savedPass ? decodeURIComponent(escape(atob(savedPass))) : '';
      } catch (_) {
        decodedPass = savedPass || '';
      }
      loginForm.setFieldsValue({
        email: savedEmail,
        password: decodedPass,
        remember: true
      });
    }
  }, [loginForm]);

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      if (values.remember) {
        localStorage.setItem('fsktm_remember_lecturer_email', values.email);
        try {
          const encodedPass = btoa(unescape(encodeURIComponent(values.password)));
          localStorage.setItem('fsktm_remember_lecturer_pass', encodedPass);
        } catch (_) {
          localStorage.setItem('fsktm_remember_lecturer_pass', values.password);
        }
      } else {
        localStorage.removeItem('fsktm_remember_lecturer_email');
        localStorage.removeItem('fsktm_remember_lecturer_pass');
      }

      await login(values.email, values.password, 'lecturer', values.remember);
      message.success('Welcome to Lecturer Portal');
      navigate(redirectUrl, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    loginForm.setFieldsValue({
      email: 'norasri@uthm.edu.my',
      password: 'Lecturer123!',
    });
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #1E3A8A 50%, #0F172A 100%)',
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
            <img src="/logo-fsktm.png" alt="UTHM Logo" style={{ height: 44, objectFit: 'contain' }} />
          </div>
          <Title level={3} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800 }}>
            FSKTM Academic Portal
          </Title>
          <Text style={{ color: '#CBD5E1', fontSize: 13 }}>
            Course Timetable & Lab Reservation System
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
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                          <ThunderboltOutlined style={{ marginRight: 4 }} /> Demo UTHM Lecturer Account
                        </div>
                        <div style={{ fontSize: 11, color: '#B45309' }}>norasri@uthm.edu.my</div>
                      </div>
                      <Button size="small" type="primary" onClick={fillDemo} style={{ background: '#D97706', borderColor: '#D97706' }}>
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
                      autoComplete="on"
                    >
                      <Form.Item
                        name="email"
                        label="Faculty Email or Staff ID"
                        rules={[{ required: true, message: 'Please enter your email or staff ID' }]}
                      >
                        <Input
                          prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="e.g. norasri@uthm.edu.my or L-9042"
                          size="large"
                          autoComplete="username"
                        />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: 'Please enter your password' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <Input.Password
                          prefix={<LockOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="••••••••"
                          size="large"
                          autoComplete="current-password"
                        />
                      </Form.Item>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 18 }}>
                        💡 Google user? Default pass is <code>Lecturer123!</code>
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
                          Sign In to Lecturer Portal
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
              {
                key: 'register',
                label: 'Register Lecturer',
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
                        Official Lecturer Google Registration
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
                        Academic accounts are registered exclusively via <strong>Google Workspace</strong>. Only official UTHM faculty addresses are permitted:
                        <div style={{ marginTop: 8 }}>
                          <code style={{ fontSize: 12, background: '#DBEAFE', color: '#1D4ED8', padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>
                            norasri@uthm.edu.my
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
                      Your academic profile and departmental allocation will be verified and provisioned via your official faculty Google login.
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
            <div>Need a different faculty login?</div>
            <Space split={<span style={{ color: '#CBD5E1' }}>|</span>} style={{ marginTop: 6 }}>
              <Link to="/login/student" style={{ fontWeight: 600, color: '#1E3A8A' }}>
                &larr; Student Portal
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
        defaultRole="lecturer"
        mode={activeTab === 'register' ? 'register' : 'login'}
        onSuccess={(u) => navigate(redirectUrl, { replace: true })}
      />
    </div>
  );
}
