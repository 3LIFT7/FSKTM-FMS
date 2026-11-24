import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../context/AuthContext';

// Role permission hierarchy
const ROLE_HIERARCHY = {
  student: ['student'],
  lecturer: ['student', 'lecturer'],
  technician: ['student', 'technician'],
  manager: ['student', 'lecturer', 'technician', 'manager'],
};

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <Spin size="large" tip="Verifying FSKTM session..." />
      </div>
    );
  }

  // Not authenticated: redirect to appropriate login page based on target URL
  if (!user) {
    const isExplicitLogout = Boolean(sessionStorage.getItem('fsktm_logged_out') || location.state?.loggedOut);
    const path = location.pathname;
    let redirectLogin = '/login';

    if (path.startsWith('/staff') || path.startsWith('/admin') || path.startsWith('/rooms') || path.startsWith('/maintenance')) {
      redirectLogin = '/login/staff';
    }

    if (isExplicitLogout) {
      return <Navigate to={redirectLogin} state={{ loggedOut: true }} replace />;
    }

    return <Navigate to={redirectLogin} state={{ from: location }} replace />;
  }

  // Role verification with inheritance
  if (allowedRoles.length > 0) {
    const userRole = user.role;
    const effectiveRoles = ROLE_HIERARCHY[userRole] || [userRole];
    const isAuthorized = allowedRoles.some(role => effectiveRoles.includes(role));

    if (!isAuthorized) {
      if (user.role === 'student') return <Navigate to="/student" replace />;
      if (user.role === 'lecturer') return <Navigate to="/lecturer" replace />;
      return <Navigate to="/staff" replace />;
    }
  }

  return children;
}
