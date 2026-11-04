import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Badge, Button, Popover, Typography, Empty, Spin, Space, Tag, message } from 'antd';
import { BellOutlined, CheckOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Text } = Typography;

const TYPE_LABELS = {
  room_booking: 'ROOM BOOKING',
  device_loan: 'DEVICE LOAN',
  damage_report: 'DAMAGE REPORT',
};

const TYPE_COLORS = {
  room_booking: 'blue',
  device_loan: 'purple',
  damage_report: 'orange',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!user?.user_id) {
      setNotifications([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load notifications.');
      setNotifications(data.notifications || []);
      setLoadError('');
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setLoadError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    window.addEventListener('focus', fetchNotifications);
    window.addEventListener('bookingUpdated', fetchNotifications);
    window.addEventListener('deviceLoanUpdated', fetchNotifications);
    window.addEventListener('issueUpdated', fetchNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', fetchNotifications);
      window.removeEventListener('bookingUpdated', fetchNotifications);
      window.removeEventListener('deviceLoanUpdated', fetchNotifications);
      window.removeEventListener('issueUpdated', fetchNotifications);
    };
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  async function markRead(item) {
    if (item.read_at) return;
    try {
      const res = await fetch(`/api/notifications/${item.notification_id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not mark notification as read.');
      setNotifications((current) => current.map((notification) => (
        notification.notification_id === item.notification_id
          ? { ...notification, read_at: data.notification.read_at }
          : notification
      )));
    } catch (err) {
      message.error(err.message);
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not update notifications.');
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
    } catch (err) {
      message.error(err.message);
    }
  }

  const popoverContent = (
    <div style={{ width: 380, maxWidth: '90vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 10, marginBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
        <Space size="small">
          <BellOutlined style={{ color: '#1E3A8A', fontSize: 16 }} />
          <Text strong style={{ fontSize: 14, color: '#0F172A' }}>System Notifications</Text>
          {unreadCount > 0 && <Tag color="red" style={{ margin: 0 }}>{unreadCount} new</Tag>}
        </Space>
        {unreadCount > 0 && <Button size="small" type="link" icon={<CheckOutlined />} onClick={markAllRead}>Mark all read</Button>}
      </div>

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="Notifications could not be loaded"
          description={loadError}
          action={<Button size="small" icon={<ReloadOutlined />} onClick={fetchNotifications}>Retry</Button>}
          style={{ marginBottom: 8 }}
        />
      ) : loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin size="small" /></div>
      ) : notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary">You’re all caught up. Updates to your requests and reports will appear here.</Text>} />
      ) : (
        <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 3 }}>
          {notifications.map((item) => (
            <button
              key={item.notification_id}
              type="button"
              onClick={() => markRead(item)}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 9,
                background: item.read_at ? '#FFFFFF' : '#EFF6FF',
                border: `1px solid ${item.read_at ? '#E2E8F0' : '#BFDBFE'}`,
                cursor: item.read_at ? 'default' : 'pointer',
              }}
              aria-label={`${item.read_at ? 'Read' : 'Unread'} notification: ${item.title}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                <Tag color={TYPE_COLORS[item.type] || 'default'} style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                  {TYPE_LABELS[item.type] || 'UPDATE'}
                </Tag>
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {dayjs(item.created_at).format('DD MMM, HH:mm')}
                </Text>
              </div>
              <Text strong style={{ display: 'block', fontSize: 13, color: '#0F172A', marginBottom: 3 }}>{item.title}</Text>
              <Text style={{ display: 'block', fontSize: 12, color: '#475569', lineHeight: 1.45 }}>{item.message}</Text>
            </button>
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
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) fetchNotifications();
      }}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
    >
      <Badge count={unreadCount} offset={[-2, 2]} overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#DC2626' : '#475569' }} />}
          shape="circle"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          style={{ background: unreadCount > 0 ? '#FEE2E2' : 'transparent', transition: 'all 0.2s ease' }}
        />
      </Badge>
    </Popover>
  );
}
