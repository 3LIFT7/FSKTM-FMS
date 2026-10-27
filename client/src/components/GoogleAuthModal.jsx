import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert, Typography, message, Tag, Tabs, Collapse, Divider } from 'antd';
import {
  SafetyCertificateOutlined,
  KeyOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  CopyOutlined,
  LinkOutlined,
  UserAddOutlined,
  ReadOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRedirectDestination } from '../utils/navigation';

const { Title, Text, Paragraph } = Typography;

// Authentic Google "G" multi-color SVG icon
export const GoogleColorIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// Sleek Pill-shaped "Continue with Google" Button
export const GoogleContinueButton = ({ onClick, style = {}, text = 'Continue with Google', loading = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        height: '46px',
        padding: '0 24px',
        background: '#1F242D',
        color: '#FFFFFF',
        border: '1.5px solid #4B5563',
        borderRadius: '9999px',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: '0.2px',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = '#2D333E';
          e.currentTarget.style.borderColor = '#9CA3AF';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.background = '#1F242D';
          e.currentTarget.style.borderColor = '#4B5563';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
        }
      }}
    >
      <GoogleColorIcon size={22} />
      <span>{text}</span>
    </button>
  );
};

// Main Google Auth & Registration Modal
export default function GoogleAuthModal({
  isOpen,
  onClose,
  defaultRole = null, // 'student' | 'lecturer' | null
  mode = 'register', // 'register' | 'login'
  onSuccess = null
}) {
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get Google Client ID from environment or local storage
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const [clientId, setClientId] = useState(envClientId || localStorage.getItem('google_client_id') || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('real'); // 'real' | 'simulator'

  // Custom simulator form state
  const [simName, setSimName] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simRole, setSimRole] = useState(defaultRole || 'student');

  useEffect(() => {
    if (defaultRole) {
      setSimRole(defaultRole);
    }
  }, [defaultRole]);

  // When modal opens, if Client ID is already configured, attempt launch directly
  useEffect(() => {
    if (isOpen) {
      const activeId = envClientId || localStorage.getItem('google_client_id') || '';
      if (activeId && window.google?.accounts?.oauth2) {
        startRealGoogleFlow(activeId);
      }
    }
  }, [isOpen]);

  const startRealGoogleFlow = (activeClientId) => {
    setError('');
    const idToUse = (activeClientId || clientId).trim();

    if (!idToUse) {
      setError('Please provide your Google OAuth 2.0 Web Client ID to connect Google authentication.');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setError('Google Identity Services SDK is still loading. Please wait 2 seconds and try again.');
      return;
    }

    setLoading(true);

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: idToUse,
        scope: 'email profile openid',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setLoading(false);
            setError(tokenResponse.error_description || tokenResponse.error || 'Google authentication was cancelled.');
            return;
          }

          try {
            // Send verified access token to server
            const resultUser = await googleAuth({
              access_token: tokenResponse.access_token,
              role: defaultRole,
              portal: defaultRole
            });

            message.success(`Google authentication verified as ${resultUser.role.toUpperCase()}`);
            if (onSuccess) {
              onSuccess(resultUser);
            } else {
              const fallback = resultUser.role === 'student' ? '/student' : '/lecturer';
              navigate(getRedirectDestination(location, fallback), { replace: true });
            }
            onClose();
          } catch (err) {
            setError(err.message || 'Google verification failed.');
          } finally {
            setLoading(false);
          }
        }
      });

      client.requestAccessToken();
    } catch (err) {
      setLoading(false);
      setError('Failed to initialize Google OAuth: ' + (err.message || 'Check your Client ID'));
    }
  };

  const handleSaveClientId = (e) => {
    if (e) e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setError('Please paste your Google OAuth Client ID.');
      return;
    }

    // Check if user pasted an API Key instead of an OAuth 2.0 Client ID
    if (trimmed.startsWith('AIza')) {
      setError('You entered a Google API Key (starts with "AIza..."). Google Sign-In requires an OAuth 2.0 Client ID (which ends with ".apps.googleusercontent.com"). In Google Cloud Console, click "+ CREATE CREDENTIALS" -> "OAuth client ID" -> "Web application".');
      return;
    }

    if (!trimmed.includes('.apps.googleusercontent.com') && !trimmed.includes('.googleusercontent.com')) {
      setError('Invalid format: A Google OAuth 2.0 Client ID must end with ".apps.googleusercontent.com" (e.g. 123456789-abcdef.apps.googleusercontent.com).');
      return;
    }

    localStorage.setItem('google_client_id', trimmed);
    setClientId(trimmed);
    message.success('Google Client ID saved.');
    startRealGoogleFlow(trimmed);
  };

  // Instant local dev simulator for testing registration without Google Cloud setup
  const handleDevSimulateAuth = async (targetRole, customEmail = null, customName = null) => {
    setError('');
    setLoading(true);

    try {
      const roleToUse = targetRole || simRole || defaultRole || 'student';
      let emailToUse = customEmail || simEmail;
      let nameToUse = customName || simName;

      if (!emailToUse) {
        if (roleToUse === 'student') {
          const randMatric = `AI240${Math.floor(100 + Math.random() * 900)}`;
          emailToUse = `${randMatric}@student.uthm.edu.my`;
          nameToUse = nameToUse || `Student (${randMatric})`;
        } else {
          emailToUse = `norasri@uthm.edu.my`;
          nameToUse = nameToUse || 'Dr. Norasri Ismail';
        }
      }

      const resultUser = await googleAuth({
        email: emailToUse,
        name: nameToUse,
        role: roleToUse,
        portal: roleToUse
      });

      message.success(`Google Registration verified as ${resultUser.role.toUpperCase()}`);
      if (onSuccess) {
        onSuccess(resultUser);
      } else {
        const fallback = resultUser.role === 'student' ? '/student' : '/lecturer';
        navigate(getRedirectDestination(location, fallback), { replace: true });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      destroyOnClose
      styles={{
        content: {
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '24px 28px 16px',
          borderBottom: '1px solid #F1F5F9'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GoogleColorIcon size={26} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', letterSpacing: '-0.2px' }}>
              Google Workspace
            </span>
          </div>
          <Tag color="geekblue" icon={<SafetyCertificateOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>
            {mode === 'register' ? 'Google Registration' : 'Google Sign-In'}
          </Tag>
        </div>

        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>
          {mode === 'register' ? 'Register with Google' : 'Sign in with Google'}
        </Title>
        <Text style={{ fontSize: 13, color: '#64748B' }}>
          FSKTM Facilities & Maintenance Management System
        </Text>
      </div>

      <div style={{ padding: '20px 28px 28px' }}>
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

        {/* Domain Requirement Notice */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SafetyCertificateOutlined style={{ color: '#2563EB' }} />
            Official University Domain Requirement
          </div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            Only verified UTHM Google accounts are permitted:
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag color="green" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>Students</Tag>
                <code style={{ fontSize: 11, background: '#EDFDF2', color: '#166534', padding: '1px 6px', borderRadius: 4 }}>
                  &lt;matric&gt;@student.uthm.edu.my
                </code>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>Lecturers</Tag>
                <code style={{ fontSize: 11, background: '#EFF6FF', color: '#1E40AF', padding: '1px 6px', borderRadius: 4 }}>
                  &lt;name&gt;@uthm.edu.my
                </code>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#0369A1', background: '#F0F9FF', padding: '6px 8px', borderRadius: 6 }}>
              ✨ <strong>Auto-Identified:</strong> Your official full name from Google and matriculation number are automatically identified and verified.
            </div>
          </div>
        </div>

        {/* Tab switcher: Live Google vs Dev Simulator */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          items={[
            {
              key: 'real',
              label: (
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  <GoogleColorIcon size={14} /> Live Google Sign-In
                </span>
              ),
              children: (
                <div style={{ paddingTop: 6 }}>
                  {!clientId ? (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>
                          Google OAuth 2.0 Web Client ID:
                        </label>
                        <Input
                          prefix={<KeyOutlined style={{ color: '#94A3B8' }} />}
                          placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          size="large"
                          style={{ borderRadius: 8 }}
                        />
                        <div style={{ marginTop: 6, fontSize: 11, color: '#64748B' }}>
                          Paste your Client ID here or configure in <code style={{ color: '#1E3A8A' }}>client/.env</code> as <code style={{ color: '#1E3A8A' }}>VITE_GOOGLE_CLIENT_ID</code>.
                        </div>
                      </div>

                      <Button
                        type="primary"
                        onClick={handleSaveClientId}
                        loading={loading}
                        block
                        size="large"
                        icon={<ArrowRightOutlined />}
                        style={{
                          height: 44,
                          borderRadius: 8,
                          fontWeight: 700,
                          background: '#1E3A8A',
                          marginBottom: 16
                        }}
                      >
                        Connect & Launch Google Sign-In
                      </Button>

                      {/* Google Cloud Console Setup Instructions */}
                      <Collapse
                        ghost
                        size="small"
                        items={[
                          {
                            key: 'instructions',
                            label: (
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <QuestionCircleOutlined /> How to get a Google Client ID (5 Steps)
                              </span>
                            ),
                            children: (
                              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                                <ol style={{ paddingLeft: 18, margin: 0 }}>
                                  <li>
                                    Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: '#2563EB' }}>
                                      Google Cloud Console <LinkOutlined />
                                    </a>.
                                  </li>
                                  <li>Click <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>.</li>
                                  <li>Select Application type: <strong>Web application</strong>.</li>
                                  <li>
                                    Under <strong>Authorized JavaScript origins</strong>, add:
                                    <div style={{ margin: '4px 0' }}>
                                      <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        http://localhost:5173
                                      </code>
                                    </div>
                                  </li>
                                  <li>
                                    Click <strong>Create</strong>, copy the Client ID (ends with <code>.apps.googleusercontent.com</code>), and paste it above or into <code>client/.env</code>.
                                  </li>
                                </ol>
                              </div>
                            )
                          }
                        ]}
                      />
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: 10,
                          marginBottom: 18,
                          fontSize: 12,
                          color: '#166534'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircleOutlined style={{ color: '#16A34A', fontSize: 15 }} />
                          <span>Google Client ID configured</span>
                        </div>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => {
                            localStorage.removeItem('google_client_id');
                            setClientId('');
                          }}
                          style={{ padding: 0, fontSize: 11, color: '#15803D' }}
                        >
                          Change
                        </Button>
                      </div>

                      {/* Pill-shaped Continue with Google Button */}
                      <GoogleContinueButton
                        onClick={() => startRealGoogleFlow(clientId)}
                        loading={loading}
                        text="Continue with Google"
                      />
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'simulator',
              label: (
                <span style={{ fontWeight: 600, fontSize: 13, color: '#D97706' }}>
                  <ThunderboltOutlined /> Instant Dev Register
                </span>
              ),
              children: (
                <div style={{ paddingTop: 6 }}>
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 12,
                      color: '#92400E',
                      marginBottom: 16,
                      lineHeight: 1.5
                    }}
                  >
                    <strong>Localhost Developer Testing:</strong> Test Google registration immediately without needing a Google Cloud Console account or institutional credentials.
                  </div>

                  {/* 1-Click Fast Register Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Button
                      type="default"
                      icon={<ReadOutlined style={{ color: '#16A34A' }} />}
                      onClick={() => handleDevSimulateAuth('student')}
                      loading={loading}
                      block
                      style={{
                        height: 44,
                        textAlign: 'left',
                        borderRadius: 10,
                        fontWeight: 600,
                        borderColor: '#86EFAC',
                        background: '#F0FDF4',
                        color: '#15803D'
                      }}
                    >
                      🚀 Register New Student (AI24xxxx@student.uthm.edu.my)
                    </Button>

                    <Button
                      type="default"
                      icon={<SolutionOutlined style={{ color: '#2563EB' }} />}
                      onClick={() => handleDevSimulateAuth('lecturer', 'dr.norasri@uthm.edu.my', 'Dr. Norasri Ismail')}
                      loading={loading}
                      block
                      style={{
                        height: 44,
                        textAlign: 'left',
                        borderRadius: 10,
                        fontWeight: 600,
                        borderColor: '#93C5FD',
                        background: '#EFF6FF',
                        color: '#1D4ED8'
                      }}
                    >
                      🚀 Register Lecturer (norasri@uthm.edu.my)
                    </Button>
                  </div>

                  <Divider style={{ margin: '16px 0', fontSize: 11, color: '#94A3B8' }}>
                    or simulate with custom details
                  </Divider>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        Name
                      </label>
                      <Input
                        placeholder="e.g. Nur Aisyah"
                        value={simName}
                        onChange={(e) => setSimName(e.target.value)}
                        size="middle"
                        style={{ borderRadius: 6 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                        University Email
                      </label>
                      <Input
                        placeholder="e.g. AI240199@student.uthm.edu.my"
                        value={simEmail}
                        onChange={(e) => setSimEmail(e.target.value)}
                        size="middle"
                        style={{ borderRadius: 6 }}
                      />
                    </div>
                    <Button
                      type="primary"
                      onClick={() => handleDevSimulateAuth(simRole, simEmail, simName)}
                      loading={loading}
                      block
                      style={{
                        borderRadius: 8,
                        fontWeight: 600,
                        background: '#1E3A8A',
                        marginTop: 4
                      }}
                    >
                      Simulate Google Registration & Sign In
                    </Button>
                  </div>
                </div>
              )
            }
          ]}
        />
      </div>
    </Modal>
  );
}
