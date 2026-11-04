import React, { useState } from 'react';
import { Alert, Spin } from 'antd';
import { ArrowUpRight, CheckCircle2, GraduationCap, Landmark, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleColorIcon from '../../components/GoogleColorIcon';
import { getRedirectDestination } from '../../utils/navigation';
import './AcademicLogin.css';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export default function AcademicLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = () => {
    setError('');

    if (!GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured. Please contact the system administrator.');
      return;
    }

    const googleIdentity = window.google?.accounts?.oauth2;
    if (!googleIdentity) {
      setError('Google sign-in is still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);

    try {
      const tokenClient = googleIdentity.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            setLoading(false);
            setError(response.error_description || 'Google sign-in was cancelled. Please try again.');
            return;
          }

          try {
            const user = await googleAuth({ access_token: response.access_token });
            const fallback = user.role === 'lecturer' ? '/lecturer' : '/student';
            navigate(getRedirectDestination(location, fallback), { replace: true });
          } catch (authError) {
            setError(authError.message || 'Google sign-in could not be completed.');
          } finally {
            setLoading(false);
          }
        },
        error_callback: (oauthError) => {
          setLoading(false);
          setError(oauthError?.message || 'Google sign-in could not be opened. Please try again.');
        },
      });

      tokenClient.requestAccessToken();
    } catch (oauthError) {
      setLoading(false);
      setError(oauthError.message || 'Google sign-in could not be started.');
    }
  };

  return (
    <main className="academic-login">
      <section className="academic-login__identity" aria-label="FSKTM identity">
        <div className="academic-login__identity-inner">
          <div className="academic-login__identity-copy">
            <p className="academic-login__faculty">Faculty of Computer Science and Information Technology</p>
            <h1>Facilities, ready when you are.</h1>
            <p className="academic-login__description">
              Book learning spaces, manage equipment loans, and keep faculty facilities running smoothly.
            </p>
          </div>

          <div className="academic-login__identity-footer">
            <span className="academic-login__status-dot" aria-hidden="true" />
            <span>Universiti Tun Hussein Onn Malaysia</span>
          </div>
        </div>
        <div className="academic-login__watermark" aria-hidden="true">FMS</div>
      </section>

      <section className="academic-login__content" aria-labelledby="academic-login-title">
        <div className="academic-login__content-inner">
          <Link className="academic-login__brand academic-login__brand--content" to="/" aria-label="FSKTM FMS home">
            <img src="/logo-fsktm.png" alt="Universiti Tun Hussein Onn Malaysia" />
          </Link>

          <div className="academic-login__heading">
            <div className="academic-login__heading-icon" aria-hidden="true">
              <Landmark size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="academic-login__eyebrow">FSKTM OPERATIONS</p>
              <h2 id="academic-login-title">Sign in to continue</h2>
              <p className="academic-login__subheading">Use your official UTHM Google account.</p>
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

          <button
            type="button"
            className="academic-login__google-button"
            onClick={handleGoogleLogin}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <Spin size="small" /> : <GoogleColorIcon size={21} />}
            <span>{loading ? 'Connecting to Google…' : 'Continue with Google'}</span>
            {!loading && <ArrowUpRight className="academic-login__button-arrow" size={18} aria-hidden="true" />}
          </button>

          <div className="academic-login__verified-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>Only verified UTHM accounts can access this system.</span>
          </div>

          <div className="academic-login__role-section" aria-label="Academic role assignment">
            <div className="academic-login__role-heading">
              <span>Your account type is detected automatically</span>
              <CheckCircle2 size={16} aria-hidden="true" />
            </div>
            <div className="academic-login__role-list">
              <div className="academic-login__role-row">
                <span className="academic-login__role-icon"><GraduationCap size={18} /></span>
                <span className="academic-login__role-name">Student</span>
                <code>@student.uthm.edu.my</code>
              </div>
              <div className="academic-login__role-row">
                <span className="academic-login__role-icon"><Landmark size={17} /></span>
                <span className="academic-login__role-name">Lecturer</span>
                <code>@uthm.edu.my</code>
              </div>
            </div>
          </div>

          <p className="academic-login__provision-note">
            First-time sign-in creates your account automatically.
          </p>

          <footer className="academic-login__footer">
            <span>Technical and lab management staff?</span>
            <Link to="/login/staff" className="academic-login__staff-link">
              Go to Staff Portal <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
