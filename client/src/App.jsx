import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth Pages
import StudentLogin from './pages/auth/StudentLogin';
import LecturerLogin from './pages/auth/LecturerLogin';
import StaffLogin from './pages/auth/StaffLogin';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard Pages
import StudentDashboard from './pages/dashboard/StudentDashboard';
import LecturerDashboard from './pages/dashboard/LecturerDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import MyActivity from './pages/dashboard/MyActivity';

// Core Modules
import InteractiveFloorMap from './pages/map/InteractiveFloorMap';
import CalendarView from './pages/booking/CalendarView';
import IssueList from './pages/issues/IssueList';
import DeviceCatalog from './pages/devices/DeviceCatalog';
import DeviceManage from './pages/devices/DeviceManage';
import MaintenanceList from './pages/maintenance/MaintenanceList';

// Admin Modules
import ScheduleImport from './pages/admin/ScheduleImport';
import UsersManage from './pages/admin/UsersManage';
import Reports from './pages/admin/Reports';
import SettingsPage from './pages/admin/SettingsPage';
import RoomsControl from './pages/admin/RoomsControl';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-500">Loading FSKTM FMS...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login/student" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'lecturer') return <Navigate to="/lecturer" replace />;
  return <Navigate to="/staff" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authentication Portals */}
          <Route path="/login/student" element={<StudentLogin />} />
          <Route path="/login/lecturer" element={<LecturerLogin />} />
          <Route path="/login/staff" element={<StaffLogin />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Area wrapped in Layout */}
          <Route element={<Layout />}>
            {/* Student Dashboard */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Lecturer Dashboard */}
            <Route
              path="/lecturer"
              element={
                <ProtectedRoute allowedRoles={['lecturer', 'technician', 'manager']}>
                  <LecturerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Staff (Technician & Manager) Dashboard */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['technician', 'manager']}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />

            {/* Interactive Floor Map (All authenticated users) */}
            <Route
              path="/map"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <InteractiveFloorMap />
                </ProtectedRoute>
              }
            />

            {/* Facility Booking Calendar */}
            <Route
              path="/calendar"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <CalendarView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/booking/new"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <CalendarView />
                </ProtectedRoute>
              }
            />

            {/* Device Catalog & Borrowing */}
            <Route
              path="/devices"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <DeviceCatalog />
                </ProtectedRoute>
              }
            />

            {/* Device Management & Checkout Counter (Staff) */}
            <Route
              path="/devices/manage"
              element={
                <ProtectedRoute allowedRoles={['technician', 'manager']}>
                  <DeviceManage />
                </ProtectedRoute>
              }
            />

            {/* Damage / Breakdown Reporting (Ticketing) */}
            <Route
              path="/tickets"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <IssueList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <IssueList />
                </ProtectedRoute>
              }
            />

            {/* Maintenance Records & Reminders (Staff) */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute allowedRoles={['technician', 'manager']}>
                  <MaintenanceList />
                </ProtectedRoute>
              }
            />

            {/* Room Facilities Control (Staff) */}
            <Route
              path="/rooms"
              element={
                <ProtectedRoute allowedRoles={['technician', 'manager']}>
                  <RoomsControl />
                </ProtectedRoute>
              }
            />

            {/* My Activity & Bookings */}
            <Route
              path="/my-activity"
              element={
                <ProtectedRoute allowedRoles={['student', 'lecturer', 'technician', 'manager']}>
                  <MyActivity />
                </ProtectedRoute>
              }
            />

            {/* Manager / Admin Specific Routes */}
            <Route
              path="/admin/schedule-import"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ScheduleImport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <UsersManage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
