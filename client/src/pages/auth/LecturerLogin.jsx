import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Tabs, Select, Typography, Space, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';

const { Title, Text } = Typography;

export default function LecturerLogin() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/lecturer';

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);

    try {
      await login(values.email, values.password, 'lecturer');
      message.success('Welcome to Lecturer Portal');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setError('');
    setLoading(true);

    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: 'lecturer',
        staff_id: values.staffId ? values.staffId.trim().toUpperCase() : null,
        department: values.department,
      });
      message.success('Lecturer account created successfully');
      navigate('/lecturer', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    loginForm.setFieldsValue({
      email: 'lecturer@fsktm.um.edu.my',
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
            <img src="/logo-fsktm.png" alt="FSKTM Logo" style={{ height: 42, objectFit: 'contain' }} />
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
                          <ThunderboltOutlined style={{ marginRight: 4 }} /> Demo Lecturer Account
                        </div>
                        <div style={{ fontSize: 11, color: '#B45309' }}>lecturer@fsktm.um.edu.my</div>
                      </div>
                      <Button size="small" type="primary" onClick={fillDemo} style={{ background: '#D97706', borderColor: '#D97706' }}>
                        Auto-Fill
                      </Button>
                    </div>

                    <Form
                      form={loginForm}
                      layout="vertical"
                      onFinish={handleLogin}
                      requiredMark="optional"
                    >
                      <Form.Item
                        name="email"
                        label="Faculty Email or Staff ID"
                        rules={[{ required: true, message: 'Please enter your email or staff ID' }]}
                      >
                        <Input
                          prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="e.g. L-9042 or lecturer@fsktm.um.edu.my"
                          size="large"
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
                  <Form
                    form={registerForm}
                    layout="vertical"
                    onFinish={handleRegister}
                    initialValues={{ department: 'Department of Software Engineering' }}
                  >
                    <Form.Item
                      name="name"
                      label="Full Name (with Title)"
                      rules={[{ required: true, message: 'Please enter full name' }]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="e.g. Dr. Nurul Huda binti Ahmad"
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label="Staff Email Address"
                      rules={[
                        { required: true, message: 'Please enter email address' },
                        { type: 'email', message: 'Please enter a valid email address' },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="dr_name@fsktm.um.edu.my"
                      />
                    </Form.Item>

                    <Form.Item name="staffId" label="Staff ID (Optional)">
                      <Input
                        prefix={<IdcardOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="e.g. L-9042"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="department"
                      label="Faculty Department"
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Select.Option value="Department of Software Engineering">Software Engineering</Select.Option>
                        <Select.Option value="Department of Artificial Intelligence">Artificial Intelligence</Select.Option>
                        <Select.Option value="Department of Computer Systems and Networking">Computer Systems & Networking</Select.Option>
                        <Select.Option value="Department of Information Systems">Information Systems</Select.Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        { required: true, message: 'Please enter password' },
                        { min: 6, message: 'Password must be at least 6 characters' },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Min 6 characters" />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="Confirm Password"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Please confirm password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Re-enter password" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 8, marginTop: 16 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        loading={loading}
                        style={{ height: 44, fontWeight: 700 }}
                      >
                        Complete Lecturer Registration
                      </Button>
                    </Form.Item>
                  </Form>
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
    </div>
  );
}
