import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role permission hierarchy
const ROLE_HIERARCHY = {
  student: ['student'],
  lecturer: ['student', 'lecturer'],
  technician: ['student', 'technician'],
  manager: ['student', 'lecturer', 'technician', 'manager']
};

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Verifying FSKTM authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: redirect to appropriate login page based on target URL
  if (!user) {
    const path = location.pathname;
    let redirectLogin = '/login/student';

    if (path.startsWith('/lecturer')) {
      redirectLogin = '/login/lecturer';
    } else if (path.startsWith('/staff') || path.startsWith('/admin') || path.startsWith('/technician') || path.startsWith('/manager')) {
      redirectLogin = '/login/staff';
    } else if (path.startsWith('/student')) {
      redirectLogin = '/login/student';
    }

    return <Navigate to={redirectLogin} state={{ from: location }} replace />;
  }

  // Role verification with inheritance
  if (allowedRoles.length > 0) {
    const userRole = user.role;
    const effectiveRoles = ROLE_HIERARCHY[userRole] || [userRole];
    const isAuthorized = allowedRoles.some(role => effectiveRoles.includes(role));

    if (!isAuthorized) {
      // Redirect to user's authorized home
      if (user.role === 'student') return <Navigate to="/student" replace />;
      if (user.role === 'lecturer') return <Navigate to="/lecturer" replace />;
      return <Navigate to="/staff" replace />;
    }
  }

  return children;
}
