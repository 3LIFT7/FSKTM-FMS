import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  Award, 
  Mail, 
  Lock, 
  User, 
  Hash, 
  BookOpen, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  Info,
  Check
} from 'lucide-react';

export default function RegisterPage({ initialRole = 'student' }) {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [role, setRole] = useState(roleParam === 'lecturer' ? 'lecturer' : initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Student-specific fields
  const [matricNumber, setMatricNumber] = useState('');
  const [specialization, setSpecialization] = useState('BIW');

  // Lecturer-specific fields
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('Department of Software Engineering');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Validate matric number: starts with AI or BI followed by 2 digits for year and digits
  const isMatricValid = /^(AI|BI)\d{2}\d+$/i.test(matricNumber.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validation checks
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (role === 'student') {
      if (!matricNumber.trim()) {
        setError('Matriculation number is required for student registration.');
        return;
      }

      if (!isMatricValid) {
        setError('Matriculation number must start with "AI" or "BI" followed by the 2-digit year (e.g., AI230182, BI220045).');
        return;
      }

      const validSpecs = ['BIT', 'BIC', 'BIP', 'BIS', 'BIW', 'BIM'];
      if (!specialization || !validSpecs.includes(specialization.toUpperCase())) {
        setError('Please select a valid specialization (BIT, BIC, BIP, BIS, BIW, BIM).');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        ...(role === 'student' ? {
          matric_number: matricNumber.trim().toUpperCase(),
          specialization: specialization.toUpperCase()
        } : {
          staff_id: staffId.trim().toUpperCase() || null,
          department: department.trim()
        })
      };

      await register(payload);

      // Successfully registered & auto-logged in, navigate to corresponding dashboard
      if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        navigate('/lecturer', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        {/* Header Branding */}
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
              FSKTM Portal Account Creation
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Your Account
          </h2>
          <p className="mt-1 text-sm text-blue-200">
            Integrated Facility Booking & Maintenance Management System
          </p>
        </div>

        {/* Main Card */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-white/20">
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-start gap-3 animate-shake">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* Role Switcher Tabs */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Your Role *
              </label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setError('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    role === 'student'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('lecturer');
                    setError('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    role === 'lecturer'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Lecturer</span>
                </button>
              </div>

              {/* Informative notice about staff */}
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Technician & Manager accounts are administrative and provisioned by Dean's office.</span>
              </div>
            </div>

            {/* Registration Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Faris bin Zainal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* University Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  University Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder={role === 'student' ? 'matric@siswa.um.edu.my' : 'dr_name@fsktm.um.edu.my'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* STUDENT ONLY SECTION */}
              {role === 'student' && (
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      Student Academic Details
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200 text-blue-900 rounded-full">
                      FSKTM Undergraduate
                    </span>
                  </div>

                  {/* Matriculation Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Matriculation Number *
                      </label>
                      {matricNumber && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${
                          isMatricValid ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {isMatricValid ? (
                            <>
                              <Check className="w-3 h-3" /> Valid Matric Format
                            </>
                          ) : (
                            'Must start with AI/BI + Year'
                          )}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. AI230182 or BI220045"
                        value={matricNumber}
                        onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Format: Starts with <strong>AI</strong> or <strong>BI</strong> followed by 2-digit enrollment year (e.g. 21, 22, 23, 24) and number (such as <strong>AI230182</strong>).
                    </p>
                  </div>

                  {/* Specialization Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Academic Specialization *
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    >
                      <option value="BIT">BIT — Information Technology</option>
                      <option value="BIC">BIC — Computer Systems & Networking</option>
                      <option value="BIP">BIP — Artificial Intelligence</option>
                      <option value="BIS">BIS — Information Systems</option>
                      <option value="BIW">BIW — Software Engineering</option>
                      <option value="BIM">BIM — Multimedia Computing</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Restricted to FSKTM specializations: BIT, BIC, BIP, BIS, BIW, BIM.
                    </p>
                  </div>
                </div>
              )}

              {/* LECTURER ONLY SECTION */}
              {role === 'lecturer' && (
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      Academic Staff Details
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                      Faculty Lecturer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Staff ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. L-9042"
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Department
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        <option value="Department of Software Engineering">Software Engineering</option>
                        <option value="Department of Artificial Intelligence">Artificial Intelligence</option>
                        <option value="Department of Computer Systems and Networking">Computer Systems & Networking</option>
                        <option value="Department of Information Systems">Information Systems</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Min. 6 chars"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                    role === 'student'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                      : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-500/25'
                  }`}
                >
                  {loading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      <span>Complete {role === 'student' ? 'Student' : 'Lecturer'} Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Login Options */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
              <div>Already registered with an existing account?</div>
              <div className="flex justify-center gap-4 mt-2">
                <Link
                  to="/login/student"
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Student Login &rarr;
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  to="/login/lecturer"
                  className="font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                >
                  Lecturer Login &rarr;
                </Link>
                <span className="text-slate-300">|</span>
                <Link
                  to="/login/staff"
                  className="font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                >
                  Staff Portal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
