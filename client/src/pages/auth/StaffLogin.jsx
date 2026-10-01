import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Wrench, ShieldCheck, Mail, Lock, ArrowRight, ShieldAlert, Sparkles, Sliders } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/staff';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, 'staff');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillTech() {
    setEmail('technician@fsktm.um.edu.my');
    setPassword('Tech123!');
    setError('');
  }

  function fillManager() {
    setEmail('manager@fsktm.um.edu.my');
    setPassword('Manager123!');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/95 shadow-xl shadow-emerald-950/40 mb-4 ring-4 ring-white/10 backdrop-blur-md">
            <img 
              src="/logo-fsktm.png" 
              alt="FSKTM Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 rounded-full">
              Technical & Operations Command
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Staff & Technician Portal
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Facility Maintenance, Device Loans & Faculty Administration
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-start gap-3 animate-shake">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* Quick Demo Fill Selector */}
            <div className="mb-6 p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Testing Demo Credentials:
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fillTech}
                  className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  Technician
                </button>
                <button
                  type="button"
                  onClick={fillManager}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Manager / Admin
                </button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="staff@fsktm.um.edu.my"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
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
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    'Signing In...'
                  ) : (
                    <>
                      <span>Sign In to Staff Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-500">
              <div>Are you a student or lecturer?</div>
              <div className="flex justify-center gap-4">
                <Link
                  to="/login/student"
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  &larr; Student Portal
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  to="/login/lecturer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Lecturer Portal &rarr;
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
