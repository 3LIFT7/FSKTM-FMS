import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Alert, Radio, Select, Typography, Space, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
  ArrowRightOutlined,
  ReadOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function RegisterPage({ initialRole = 'student' }) {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [role, setRole] = useState(roleParam === 'lecturer' ? 'lecturer' : initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role,
        ...(role === 'student'
          ? {
              matric_number: values.matric.trim().toUpperCase(),
              specialization: values.specialization.toUpperCase(),
            }
          : {
              staff_id: values.staffId ? values.staffId.trim().toUpperCase() : null,
              department: values.department,
            }),
      };

      await register(payload);
      message.success('Account created successfully');
      navigate(role === 'student' ? '/student' : '/lecturer', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <div style={{ maxWidth: 480, width: '100%' }}>
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
            Create Your Account
          </Title>
          <Text style={{ color: '#93C5FD', fontSize: 13 }}>
            Integrated Facility Booking & Maintenance Management System
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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
              Account Role
            </label>
            <Radio.Group
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setError('');
              }}
              style={{ width: '100%', display: 'flex' }}
              buttonStyle="solid"
            >
              <Radio.Button value="student" style={{ flex: 1, textAlign: 'center' }}>
                <ReadOutlined style={{ marginRight: 6 }} /> Student
              </Radio.Button>
              <Radio.Button value="lecturer" style={{ flex: 1, textAlign: 'center' }}>
                <SolutionOutlined style={{ marginRight: 6 }} /> Lecturer
              </Radio.Button>
            </Radio.Group>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
              specialization: 'BIW',
              department: 'Department of Software Engineering',
            }}
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter your full name' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#94A3B8' }} />} placeholder="Full Name" />
            </Form.Item>

            <Form.Item
              name="email"
              label="University Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                placeholder={role === 'student' ? 'matric@siswa.uthm.edu.my' : 'dr_name@uthm.edu.my'}
              />
            </Form.Item>

            {role === 'student' ? (
              <>
                <Form.Item
                  name="matric"
                  label="Matriculation Number"
                  rules={[
                    { required: true, message: 'Please enter matric number' },
                    { pattern: /^(AI|BI)\d{2}\d+$/i, message: 'Must start with AI/BI + Year (e.g. AI230182)' },
                  ]}
                >
                  <Input prefix={<IdcardOutlined style={{ color: '#94A3B8' }} />} placeholder="AI230182" style={{ textTransform: 'uppercase' }} />
                </Form.Item>

                <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="BIW">BIW — Software Engineering</Select.Option>
                    <Select.Option value="BIP">BIP — Artificial Intelligence</Select.Option>
                    <Select.Option value="BIT">BIT — Information Technology</Select.Option>
                    <Select.Option value="BIC">BIC — Computer Systems & Networking</Select.Option>
                    <Select.Option value="BIS">BIS — Information Systems</Select.Option>
                    <Select.Option value="BIM">BIM — Multimedia Computing</Select.Option>
                  </Select>
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="staffId" label="Staff ID (Optional)">
                  <Input prefix={<IdcardOutlined style={{ color: '#94A3B8' }} />} placeholder="L-9042" style={{ textTransform: 'uppercase' }} />
                </Form.Item>

                <Form.Item name="department" label="Department" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="Department of Software Engineering">Software Engineering</Select.Option>
                    <Select.Option value="Department of Artificial Intelligence">Artificial Intelligence</Select.Option>
                    <Select.Option value="Department of Computer Systems and Networking">Systems & Networking</Select.Option>
                    <Select.Option value="Department of Information Systems">Information Systems</Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}

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
              <Input.Password prefix={<LockOutlined style={{ color: '#94A3B8' }} />} placeholder="Repeat password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12, marginTop: 20 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                icon={<ArrowRightOutlined />}
                style={{ height: 44, fontWeight: 700 }}
              >
                Complete Registration
              </Button>
            </Form.Item>
          </Form>

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
            <div>Already have an account?</div>
            <Space split={<span style={{ color: '#CBD5E1' }}>|</span>} style={{ marginTop: 6 }}>
              <Link to="/login/student" style={{ fontWeight: 600, color: '#1E3A8A' }}>
                Student Login
              </Link>
              <Link to="/login/lecturer" style={{ fontWeight: 600, color: '#4F46E5' }}>
                Lecturer Login
              </Link>
              <Link to="/login/staff" style={{ fontWeight: 600, color: '#334155' }}>
                Staff Login
              </Link>
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
}
