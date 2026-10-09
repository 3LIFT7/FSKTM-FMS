import React from 'react';
import { Tag } from 'antd';

const COLORS = {
  Available: 'success',
  Booked: 'processing',
  Maintenance: 'warning',
  Broken: 'error',
  'Checked Out': 'processing',
  Open: 'error',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'default',
  // Database lowercase / underscore variations
  available: 'success',
  booked: 'processing',
  maintenance: 'warning',
  broken: 'error',
  'checked out': 'processing',
  checked_out: 'processing',
  open: 'error',
  'in progress': 'warning',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
  // Common workflow statuses
  approved: 'success',
  Approved: 'success',
  pending: 'warning',
  Pending: 'warning',
  rejected: 'error',
  Rejected: 'error',
  cancelled: 'default',
  Cancelled: 'default',
  returned: 'success',
  Returned: 'success',
};

const LABELS = {
  available: 'Available',
  booked: 'Booked',
  maintenance: 'Maintenance',
  broken: 'Broken',
  'checked out': 'Checked Out',
  checked_out: 'Checked Out',
  open: 'Open',
  'in progress': 'In Progress',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export default function StatusTag({ status, children }) {
  if (!status && !children) {
    return <Tag color="default">Unknown</Tag>;
  }

  const rawStatus = (status || children || '').toString().trim();
  const color = COLORS[rawStatus] || COLORS[rawStatus.toLowerCase()] || 'default';
  const label = LABELS[rawStatus.toLowerCase()] || rawStatus;

  return <Tag color={color}>{label}</Tag>;
}
