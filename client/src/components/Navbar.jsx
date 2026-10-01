import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Building2, Bell, Shield, GraduationCap, Award, Wrench, ShieldCheck, Menu } from 'lucide-react';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'student':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5" /> Student
          </span>
        );
      case 'lecturer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Award className="w-3.5 h-3.5" /> Lecturer
          </span>
        );
      case 'technician':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Wrench className="w-3.5 h-3.5" /> Technician
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Lab Manager / Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl 2xl:max-w-8xl 3xl:max-w-9xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile Menu Button + Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger button for phone & tablet portrait */}
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-600"
              title="Toggle Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <img 
              src="/logo-fsktm.png" 
              alt="FSKTM Logo" 
              className="h-8 sm:h-10 w-auto object-contain"
            />
            <div className="border-l border-slate-200 pl-2 sm:pl-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base md:text-lg">
                  FMS <span className="text-blue-600">Portal</span>
                </span>
                <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded">
                  UM
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden md:block">
                Integrated Facility Booking & Maintenance System
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                      {user.name}
                    </span>
                    {getRoleBadge(user.role)}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {user.matric_or_staff_id || user.email}
                  </span>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
