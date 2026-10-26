import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card, Alert, Radio, Typography, Space, Tag } from 'antd';
import {
  ReadOutlined,
  SolutionOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import GoogleAuthModal, { GoogleContinueButton } from '../../components/GoogleAuthModal';

const { Title, Text } = Typography;

export default function RegisterPage({ initialRole = 'student' }) {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [role, setRole] = useState(roleParam === 'lecturer' ? 'lecturer' : initialRole);
  const [error, setError] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleTargetRole, setGoogleTargetRole] = useState(role);

  const openGoogleAuth = (selectedRole) => {
    setGoogleTargetRole(selectedRole || role);
    setIsGoogleModalOpen(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #172554 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 460, width: '100%' }}>
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
            FSKTM University Portal
          </Title>
          <Text style={{ color: '#93C5FD', fontSize: 13 }}>
            Official Account Registration via Google Workspace
          </Text>
        </div>

        <Card
          bordered={false}
          style={{
            borderRadius: 18,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            background: 'rgba(255, 255, 255, 0.98)',
          }}
          bodyStyle={{ padding: '30px 28px' }}
        >
          {error && (
            <Alert
              type="error"
              message={error}
              showIcon
              closable
              onClose={() => setError('')}
              style={{ marginBottom: 18, borderRadius: 8, fontSize: 12 }}
            />
          )}

          {/* Official University Email Policy Badge */}
          <div
            style={{
              background: '#F0F9FF',
              border: '1.5px solid #BAE6FD',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <SafetyCertificateOutlined style={{ color: '#0284C7', fontSize: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
                University Google Account Required
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
              Registration is handled exclusively via Google Workspace. Only official UTHM email addresses are accepted:
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #E0F2FE' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Students:</span>
                <code style={{ fontSize: 11, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  AI230182@student.uthm.edu.my
                </code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '6px 10px', borderRadius: 6, border: '1px solid #E0F2FE' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>Lecturers:</span>
                <code style={{ fontSize: 11, background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  norasri@uthm.edu.my
                </code>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#64748B' }}>
              ✕ Non-university accounts (e.g. @gmail.com) are strictly rejected.
            </div>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10 }}>
              Select Account Role to Register
            </label>
            <Radio.Group
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setGoogleTargetRole(e.target.value);
                setError('');
              }}
              style={{ width: '100%', display: 'flex', marginBottom: 20 }}
              buttonStyle="solid"
            >
              <Radio.Button value="student" style={{ flex: 1, textAlign: 'center', height: 42, lineHeight: '40px', fontWeight: 600 }}>
                <ReadOutlined style={{ marginRight: 6 }} /> Student
              </Radio.Button>
              <Radio.Button value="lecturer" style={{ flex: 1, textAlign: 'center', height: 42, lineHeight: '40px', fontWeight: 600 }}>
                <SolutionOutlined style={{ marginRight: 6 }} /> Lecturer
              </Radio.Button>
            </Radio.Group>

            {/* Pill-shaped Continue with Google Button */}
            <GoogleContinueButton
              onClick={() => openGoogleAuth(role)}
              text="Continue with Google"
            />
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center',
              fontSize: 12,
              color: '#64748B',
            }}
          >
            <div>Already registered?</div>
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

      {/* Google Authentication & Registration Modal */}
      <GoogleAuthModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        defaultRole={googleTargetRole}
        mode="register"
      />
    </div>
  );
}
