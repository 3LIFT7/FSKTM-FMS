import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User,
  Hash,
  ArrowRight, 
  ShieldAlert, 
  Sparkles,
  Check,
  UserPlus
} from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function StudentLogin() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regMatric, setRegMatric] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('BIW');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/student';

  // Matric number validation
  const isMatricValid = /^(AI|BI)\d{2}\d+$/i.test(regMatric.trim());

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, 'student');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!regMatric.trim()) {
      setError('Matriculation number is required.');
      return;
    }

    if (!isMatricValid) {
      setError('Matriculation number must start with "AI" or "BI" followed by the 2-digit year (e.g., AI230182, BI220045).');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        role: 'student',
        matric_number: regMatric.trim().toUpperCase(),
        specialization: regSpecialization.toUpperCase()
      });
      navigate('/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials() {
    setEmail('student@fsktm.um.edu.my');
    setPassword('Student123!');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Circles */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/95 shadow-xl shadow-blue-900/40 mb-4 ring-4 ring-white/10 backdrop-blur-md">
            <img 
              src="/logo-fsktm.png" 
              alt="FSKTM Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300 bg-blue-950/80 border border-blue-800 rounded-full">
              FSKTM Student Access Portal
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Facility & Lab Management System
          </h2>
          <p className="mt-1 text-sm text-blue-200">
            Fakulti Sains Komputer & Teknologi Maklumat
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
            
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Account</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-start gap-3 animate-shake">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* ================= MODE 1: LOGIN ================= */}
            {mode === 'login' && (
              <>
                {/* Quick Demo Button */}
                <div className="mb-6 p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Testing Demo Account
                    </div>
                    <div className="text-xs text-blue-700">student@fsktm.um.edu.my</div>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCredentials}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                  >
                    Auto-Fill
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Siswamail or Matriculation Number
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. AI230182 or email@siswa.um.edu.my"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotOpen(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                      {loading ? (
                        'Signing In...'
                      ) : (
                        <>
                          <span>Sign In as Student</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-center text-xs text-slate-600">
                  <span>New student? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Register your account here &rarr;
                  </button>
                </div>
              </>
            )}

            {/* ================= MODE 2: REGISTER ================= */}
            {mode === 'register' && (
              <form className="space-y-3.5" onSubmit={handleRegisterSubmit}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Faris bin Zainal"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Siswamail / University Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="matric@siswa.um.edu.my"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Matric Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Matriculation Number *
                    </label>
                    {regMatric && (
                      <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                        isMatricValid ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {isMatricValid ? <><Check className="w-3 h-3" /> Valid</> : 'Must start with AI/BI + Year'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI230182 or BI220045"
                      value={regMatric}
                      onChange={(e) => setRegMatric(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Starts with <strong>AI</strong> or <strong>BI</strong> followed by 2-digit year (e.g. AI230182).
                  </p>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Specialization *
                  </label>
                  <select
                    value={regSpecialization}
                    onChange={(e) => setRegSpecialization(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="BIT">BIT — Information Technology</option>
                    <option value="BIC">BIC — Computer Systems & Networking</option>
                    <option value="BIP">BIP — Artificial Intelligence</option>
                    <option value="BIS">BIS — Information Systems</option>
                    <option value="BIW">BIW — Software Engineering</option>
                    <option value="BIM">BIM — Multimedia Computing</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="Min 6 chars"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Confirm *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="Repeat"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? 'Creating Student Account...' : 'Complete Student Registration'}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-xs text-slate-500 hover:text-blue-600 font-semibold"
                  >
                    &larr; Already have an account? Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Portal Switcher Footer */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-500">
              <div>Are you a faculty member or staff?</div>
              <div className="flex justify-center gap-4">
                <Link
                  to="/login/lecturer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Lecturer Portal &rarr;
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  to="/login/staff"
                  className="font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                >
                  Staff & Technician Portal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </div>
  );
}
