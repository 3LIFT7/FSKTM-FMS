import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Popover, Tag, Typography, Empty, Space, Spin } from 'antd';
import {
  BellOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings?user_id=${user.user_id}&include_maintenance=true`);
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        // Find rejected bookings for this user
        const rejected = data.bookings.filter(b => b.status === 'rejected');

        // Consolidate recurring series into single notification items
        const groupMap = new Map();
        const items = [];

        rejected.forEach(b => {
          const gId = b.recurrence_group_id;
          if (gId) {
            if (!groupMap.has(gId)) {
              const start = dayjs(b.start_time);
              const end = dayjs(b.end_time);
              const item = {
                id: gId,
                is_recurring: true,
                purpose: b.purpose,
                course_id: b.course_id,
                course_name: b.course_name,
                location_name: b.location_name,
                location_code: b.location_code,
                rejection_reason: b.rejection_reason || 'Rejected due to timetable conflict or schedule policy.',
                time_display: `${start.format('dddd HH:mm')} - ${end.format('HH:mm')}`,
                created_at: b.created_at,
                count: 1
              };
              groupMap.set(gId, item);
              items.push(item);
            } else {
              const existing = groupMap.get(gId);
              existing.count += 1;
            }
          } else {
            const start = dayjs(b.start_time);
            const end = dayjs(b.end_time);
            items.push({
              id: b.booking_id,
              is_recurring: false,
              purpose: b.purpose,
              course_id: b.course_id,
              course_name: b.course_name,
              location_name: b.location_name,
              location_code: b.location_code,
              rejection_reason: b.rejection_reason || 'Rejected due to timetable conflict or schedule policy.',
              time_display: `${start.format('DD/MM/YYYY HH:mm')} - ${end.format('HH:mm')}`,
              created_at: b.created_at,
              count: 1
            });
          }
        });

        setNotifications(items);
      }
    } catch (err) {
      console.error('Error fetching rejection notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Listen for booking updates across components
    window.addEventListener('bookingUpdated', fetchNotifications);
    window.addEventListener('focus', fetchNotifications);

    return () => {
      window.removeEventListener('bookingUpdated', fetchNotifications);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, [fetchNotifications]);

  const popoverContent = (
    <div style={{ width: 360, maxWidth: '90vw' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
          marginBottom: 12,
          borderBottom: '1px solid #F1F5F9'
        }}
      >
        <Space size="small">
          <BellOutlined style={{ color: '#1E3A8A', fontSize: 16 }} />
          <Text strong style={{ fontSize: 14, color: '#0F172A' }}>
            System Notifications
          </Text>
        </Space>
        {notifications.length > 0 && (
          <Tag color="red" style={{ fontWeight: 700, borderRadius: 10, margin: 0 }}>
            {notifications.length} Rejection{notifications.length > 1 ? 's' : ''}
          </Tag>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ color: '#64748B', fontSize: 12 }}>
              <CheckCircleOutlined style={{ color: '#16A34A', marginRight: 6 }} />
              No unread rejection notices. All bookings are in good standing.
            </div>
          }
        />
      ) : (
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)'
              }}
            >
              {/* Header Tag and Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Tag
                  color="error"
                  icon={<CloseCircleOutlined />}
                  style={{ fontWeight: 800, fontSize: 10, borderRadius: 4, padding: '1px 6px', margin: 0 }}
                >
                  REJECTED
                </Tag>
                <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 600 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {item.time_display}
                </span>
              </div>

              {/* Course & Purpose */}
              <div style={{ marginBottom: 4 }}>
                {item.course_id && (
                  <Tag color="cyan" style={{ fontWeight: 700, fontSize: 11, borderRadius: 4, marginRight: 6 }}>
                    {item.course_id.toUpperCase()}
                  </Tag>
                )}
                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>
                  {item.course_name || item.purpose}
                </span>
              </div>

              {/* Venue */}
              <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <EnvironmentOutlined style={{ color: '#B91C1C' }} />
                <span>Venue: <strong>{item.location_name}</strong> {item.location_code && `(${item.location_code})`}</span>
                {item.is_recurring && (
                  <Tag color="purple" style={{ fontSize: 10, marginLeft: 'auto', fontWeight: 600, borderRadius: 4 }}>
                    {item.count} Weeks Series
                  </Tag>
                )}
              </div>

              {/* Rejection Reason Box */}
              <div
                style={{
                  padding: '8px 10px',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  fontSize: 12,
                  lineHeight: 1.4
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Rejection Reason:</span>
                </div>
                <div style={{ color: '#7F1D1D' }}>
                  {item.rejection_reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
    >
      <Badge
        count={notifications.length}
        offset={[-2, 2]}
        overflowCount={99}
      >
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18, color: notifications.length > 0 ? '#DC2626' : '#475569' }} />}
          shape="circle"
          aria-label="Rejection Notifications"
          style={{
            background: notifications.length > 0 ? '#FEE2E2' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        />
      </Badge>
    </Popover>
  );
}
