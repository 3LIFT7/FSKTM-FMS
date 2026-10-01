import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  Laptop,
  AlertTriangle,
  ClipboardList,
  Wrench,
  FileSpreadsheet,
  Users,
  BarChart3,
  Settings,
  Layers,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isStudent, isLecturer, isTechnician, isManager } = useAuth();

  const getNavItems = () => {
    const items = [];

    // Dashboard Home
    let homeUrl = '/student';
    if (isLecturer) homeUrl = '/lecturer';
    if (isTechnician || isManager) homeUrl = '/staff';

    items.push({
      label: 'Dashboard',
      path: homeUrl,
      icon: LayoutDashboard
    });

    // Interactive Floor Map (Available to all)
    items.push({
      label: 'Interactive Floor Map',
      path: '/map',
      icon: MapPin,
      badge: '4 Floors'
    });

    // Facility Calendar (Available to all)
    items.push({
      label: 'Booking Calendar',
      path: '/calendar',
      icon: Calendar
    });

    // Student & Lecturer specific
    if (isStudent || isLecturer) {
      items.push({
        label: isLecturer ? 'Book Lab / Room' : 'Request Room Booking',
        path: '/booking/new',
        icon: Layers
      });

      items.push({
        label: 'Borrow Equipment',
        path: '/devices',
        icon: Laptop
      });

      items.push({
        label: 'Report Damage / Issue',
        path: '/reports/new',
        icon: AlertTriangle
      });

      items.push({
        label: 'My Bookings & Reports',
        path: '/my-activity',
        icon: ClipboardList
      });
    }

    // Technician & Manager (Operational)
    if (isTechnician || isManager) {
      items.push({
        header: 'Staff Operations'
      });

      items.push({
        label: 'Breakdown Tickets',
        path: '/tickets',
        icon: AlertTriangle
      });

      items.push({
        label: 'Maintenance Records',
        path: '/maintenance',
        icon: Wrench
      });

      items.push({
        label: 'Device Inventory & Loans',
        path: '/devices/manage',
        icon: Laptop
      });

      items.push({
        label: 'Room Facilities Control',
        path: '/rooms',
        icon: Layers
      });
    }

    // Manager only (Admin)
    if (isManager) {
      items.push({
        header: 'Faculty Administration'
      });

      items.push({
        label: 'CSV Timetable Import',
        path: '/admin/schedule-import',
        icon: FileSpreadsheet
      });

      items.push({
        label: 'User Accounts & Roles',
        path: '/admin/users',
        icon: Users
      });

      items.push({
        label: 'Reports & Analytics',
        path: '/admin/reports',
        icon: BarChart3
      });

      items.push({
        label: 'System Settings',
        path: '/admin/settings',
        icon: Settings
      });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop Overlay for Phones and Tablet portrait */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Responsive Sidebar Container: Fixed slide-over drawer on phones/tablets (<1024px), docked sidebar on desktops (>=1024px) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-auto w-72 lg:w-64 bg-white border-r border-slate-200 flex-shrink-0 min-h-screen lg:min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)] lg:max-h-none pr-1">
          {/* Mobile Close Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">Navigation Menu</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {navItems.map((item, idx) => {
            if (item.header) {
              return (
                <div
                  key={idx}
                  className="pt-4 pb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {item.header}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (onClose) onClose();
                }}
                end={item.path === '/student' || item.path === '/lecturer' || item.path === '/staff'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-md">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Faculty Notice Card */}
        <div className="mt-6 p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl border border-blue-100/60 text-xs shrink-0">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Sync Enabled
          </div>
          <p className="text-slate-500 leading-relaxed text-[10px] sm:text-[11px]">
            Rooms under maintenance are automatically hidden from booking across both calendar and floor plan.
          </p>
        </div>
      </aside>
    </>
  );
}

