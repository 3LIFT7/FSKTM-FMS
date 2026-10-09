import React from 'react';
import { useAuth } from '../context/AuthContext';
import UserLayout from '../layouts/UserLayout';
import StaffLayout from '../layouts/StaffLayout';

export default function Layout() {
  const { user, isStaff } = useAuth();

  // Route layout based on role
  if (isStaff || user?.role === 'technician' || user?.role === 'manager') {
    return <StaffLayout />;
  }

  return <UserLayout />;
}
