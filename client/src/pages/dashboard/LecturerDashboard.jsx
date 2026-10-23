import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Popconfirm, Empty, Spin, Space, Typography, Tag, message } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  CompassOutlined,
  AlertOutlined,
  BookOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingGroupId, setTogglingGroupId] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  async function fetchLecturerData() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setMyBookings(data.bookings.filter(b => b.user_id === user?.user_id));
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSeries(groupId, action) {
    if (!groupId) return;
    setTogglingGroupId(groupId);

    try {
      const res = await fetch(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || 'Failed to update schedule.');
      } else {
        message.success(data.message || 'Schedule updated');
        await fetchLecturerData();
      }
    } catch (err) {
      message.error('Network error updating series');
    } finally {
      setTogglingGroupId(null);
    }
  }

  const activeBookings = myBookings.filter(b => b.status === 'approved' || b.status === 'pending');
  const recurringBookings = myBookings.filter(b => Boolean(b.recurrence_group_id || b.recurring_group_id));

  const columns = [
    {
      title: 'Facility',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 12, color: '#64748B' }}>{record.location_code}</div>
        </div>
      ),
    },
    {
      title: 'Course / Purpose',
      key: 'purpose',
      render: (_, record) => {
        const hasRecurrence = Boolean(record.recurrence_group_id || record.recurring_group_id);
        return (
          <div>
            {record.course_id && (
              <Tag color="cyan" style={{ fontWeight: 700, marginBottom: 2 }}>
                {record.course_id}
              </Tag>
            )}
            <div style={{ fontSize: 12 }}>{record.purpose}</div>
            {hasRecurrence && (
              <Tag color="purple" style={{ fontSize: 10, marginTop: 4, fontWeight: 700, borderRadius: 6 }}>
                📅 14-Wk Recurring Class
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Time Window',
      key: 'time',
      render: (_, record) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {formatDateTime(record.start_time)} &rarr; {formatDateTime(record.end_time)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const gId = record.recurrence_group_id || record.recurring_group_id;
        if (!gId) return null;
        return (
          <Space size="small">
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              loading={togglingGroupId === gId}
              onClick={() => handleToggleSeries(gId, 'pause')}
            >
              Pause
            </Button>
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              loading={togglingGroupId === gId}
              onClick={() => handleToggleSeries(gId, 'activate')}
            >
              Resume
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #1E293B 100%)',
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 10px 25px rgba(180, 83, 9, 0.15)',
        }}
        bodyStyle={{ padding: '24px 28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <Tag color="gold" style={{ borderRadius: 12, fontWeight: 700, padding: '2px 10px', fontSize: 11 }}>
                FSKTM Academic Faculty
              </Tag>
            </div>
            <Title level={2} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 4vw, 26px)', lineHeight: 1.25 }}>
              {user?.name}
            </Title>
            <Paragraph style={{ color: '#FDE68A', margin: '4px 0 0 0', fontSize: 12 }}>
              Staff ID: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{user?.matric_or_staff_id || '-'}</strong>
            </Paragraph>
          </div>

          <Space wrap size="small">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsBookModalOpen(true)}
              style={{ background: '#D97706', borderColor: '#D97706', fontWeight: 700 }}
            >
              Book Lab / Room
            </Button>
            <Link to="/devices">
              <Button icon={<LaptopOutlined />} style={{ fontWeight: 600 }}>
                Borrow Devices
              </Button>
            </Link>
            <Link to="/map">
              <Button icon={<CompassOutlined />} style={{ fontWeight: 600 }}>
                Floor Plan
              </Button>
            </Link>
          </Space>
        </div>
      </Card>

      {/* Statistics - 3 Columns on phones & tablets */}
      <Row gutter={[12, 12]}>
        <Col xs={8} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Reservations</span>}
              value={activeBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<CalendarOutlined style={{ color: '#B45309' }} />}
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Recurring</span>}
              value={recurringBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<BookOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Total Records</span>}
              value={myBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<CompassOutlined style={{ color: '#10B981' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bookings Table */}
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: '#B45309' }} />
            <span>My Lecture & Lab Reservations</span>
          </Space>
        }
        extra={<Link to="/calendar">View Full Calendar &rarr;</Link>}
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={myBookings}
          columns={columns}
          rowKey="booking_id"
          loading={loading}
          pagination={{ pageSize: 6 }}
          locale={{ emptyText: <Empty description="No room reservations on record" /> }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchLecturerData()}
      />
    </div>
  );
}
