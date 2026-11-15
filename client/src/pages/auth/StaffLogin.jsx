import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Spin } from 'antd';
import { ArrowRight, ArrowUpRight, LockKeyhole, Mail, Wrench, UserCog, Zap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';
import { getRedirectDestination } from '../../utils/navigation';
import './AcademicLogin.css';

const STAFF_DEMO_ACCOUNTS = [
  {
    key: 'technician',
    label: 'Technician',
    sublabel: 'technician@fsktm.um.edu.my',
    email: 'technician@fsktm.um.edu.my',
    password: 'Tech123!',
    icon: Wrench,
  },
  {
    key: 'manager',
    label: 'Lab Manager',
    sublabel: 'manager@fsktm.um.edu.my',
    email: 'manager@fsktm.um.edu.my',
    password: 'Manager123!',
    icon: UserCog,
  },
];

export default function StaffLogin() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [demoLoadingKey, setDemoLoadingKey] = useState(null);
  const [error, setError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectUrl = getRedirectDestination(location, '/staff');

  useEffect(() => {
    localStorage.removeItem('fsktm_remember_staff_email');
    localStorage.removeItem('fsktm_remember_staff_pass');
  }, []);

  const handleLogin = async (values) => {
    setError('');
    setLoading(true);
    try {
      await login(values.email, values.password, 'staff', false);
      navigate(redirectUrl, { replace: true });
    } catch (authError) {
      setError(authError.message || 'Sign-in failed. Check your staff credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoStaffLogin = async (preset) => {
    setError('');
    form.setFieldsValue({ email: preset.email, password: preset.password });
    setDemoLoadingKey(preset.key);
    try {
      await login(preset.email, preset.password, 'staff', true);
      navigate(redirectUrl, { replace: true });
    } catch (authError) {
      setError(authError.message || 'Demo staff sign-in failed.');
    } finally {
      setDemoLoadingKey(null);
    }
  };

  const isBusy = loading || Boolean(demoLoadingKey);

  return (
    <main className="academic-login staff-login">
      <section className="academic-login__identity" aria-label="FSKTM identity">
        <div className="academic-login__identity-inner">
          <div className="academic-login__identity-copy">
            <p className="academic-login__faculty">FACILITIES MANAGEMENT</p>
            <h1>Operations behind every space.</h1>
            <p className="academic-login__description">
              Sign in to coordinate rooms, equipment, and maintenance across FSKTM.
            </p>
          </div>
          <div className="academic-login__identity-footer">
            <span className="academic-login__status-dot" aria-hidden="true" />
            <span>Staff and technical operations</span>
          </div>
        </div>
        <div className="academic-login__watermark" aria-hidden="true">FMS</div>
      </section>

      <section className="academic-login__content" aria-labelledby="staff-login-title">
        <div className="academic-login__content-inner">
          <Link className="academic-login__brand academic-login__brand--content" to="/" aria-label="FSKTM FMS home">
            <img src="/logo-fsktm.png" alt="Universiti Tun Hussein Onn Malaysia" />
          </Link>

          <div className="academic-login__heading">
            <div className="academic-login__heading-icon" aria-hidden="true">
              <LockKeyhole size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="academic-login__eyebrow">STAFF PORTAL</p>
              <h2 id="staff-login-title">Staff sign in</h2>
              <p className="academic-login__subheading">For technicians and lab managers.</p>
            </div>
          </div>

          {error && (
            <Alert
              className="academic-login__alert"
              type="error"
              showIcon
              closable
              message={error}
              onClose={() => setError('')}
            />
          )}

          {/* Temporary Demo Staff Access */}
          <div className="academic-login__demo-section" style={{ marginTop: 0, marginBottom: 20 }} aria-label="Quick demo access for staff">
            <div className="academic-login__demo-heading">
              <span className="academic-login__demo-title">
                <Zap size={14} aria-hidden="true" />
                <span>Quick Demo Staff Access</span>
              </span>
              <span className="academic-login__demo-badge">DEV MODE</span>
            </div>
            <div className="academic-login__demo-grid">
              {STAFF_DEMO_ACCOUNTS.map((preset) => {
                const Icon = preset.icon;
                const isThisLoading = demoLoadingKey === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className="academic-login__demo-btn"
                    onClick={() => handleDemoStaffLogin(preset)}
                    disabled={isBusy}
                  >
                    <span className="academic-login__demo-btn-icon">
                      {isThisLoading ? <Spin size="small" /> : <Icon size={16} />}
                    </span>
                    <span className="academic-login__demo-btn-copy">
                      <span className="academic-login__demo-btn-label">{preset.label}</span>
                      <span className="academic-login__demo-btn-sub">{preset.sublabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            requiredMark={false}
            autoComplete="off"
            className="staff-login__form"
          >
            <Form.Item
              name="email"
              label="Staff email address"
              rules={[
                { required: true, message: 'Enter your staff email address.' },
                { type: 'email', message: 'Enter a valid email address.' },
              ]}
            >
              <Input
                prefix={<Mail size={16} aria-hidden="true" />}
                size="large"
                autoComplete="off"
                aria-label="Staff email address"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Enter your password.' }]}
            >
              <Input.Password
                prefix={<LockKeyhole size={16} aria-hidden="true" />}
                size="large"
                autoComplete="off"
                aria-label="Staff password"
              />
            </Form.Item>

            <div className="staff-login__form-options">
              <span>Enter your staff credentials to continue.</span>
              <Button type="link" onClick={() => setIsForgotOpen(true)}>
                Forgot password?
              </Button>
            </div>

            <Button
              className="staff-login__submit"
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={isBusy}
              block
              size="large"
              icon={<ArrowRight size={17} aria-hidden="true" />}
            >
              Sign in to Staff Portal
            </Button>
          </Form>

          <p className="staff-login__keyboard-note">Keyboard access: use Tab to move between fields and Enter to sign in.</p>

          <footer className="academic-login__footer">
            <span>Student or lecturer?</span>
            <Link to="/login" className="academic-login__staff-link">
              Go to academic sign-in <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </footer>
        </div>
      </section>

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </main>
  );
}
