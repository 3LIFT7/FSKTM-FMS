import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Row, Col, Card, Statistic, Table, Button, Popconfirm, Empty, Space, Typography, Tag, Modal, Input, message } from 'antd';
import {
  ToolOutlined,
  CalendarOutlined,
  AlertOutlined,
  LaptopOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

export default function StaffDashboard() {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [maintenanceLocations, setMaintenanceLocations] = useState([]);
  const [openIssues, setOpenIssues] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reject modal state
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchOperationalData();
  }, []);

  async function fetchOperationalData() {
    setLoading(true);
    try {
      const [locRes, issueRes, loanRes, statsRes, bookRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/issues'),
        fetch('/api/device-loans'),
        fetch('/api/admin/reports/summary', { credentials: 'include' }).catch(() => ({ json: () => ({ stats: {} }) })),
        fetch('/api/bookings?status=pending'),
      ]);

      const locData = await locRes.json();
      const issueData = await issueRes.json();
      const loanData = await loanRes.json();
      const statsData = await statsRes.json();
      const bookData = await bookRes.json();

      if (locData.success) {
        setMaintenanceLocations(locData.locations.filter(l => l.status === 'maintenance'));
      }
      if (issueData.success) {
        setOpenIssues(issueData.reports.filter(r => r.status === 'open' || r.status === 'in_progress'));
      }
      if (loanData.success) {
        setPendingLoans(loanData.loans.filter(l => l.status === 'pending' || l.is_overdue));
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (bookData.success) {
        setPendingBookings(bookData.bookings);
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load operational data');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveBooking(bookingId) {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve booking.');
      message.success('Booking approved successfully');
      fetchOperationalData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectingBookingId) return;
    setActionLoadingId(rejectingBookingId);
    try {
      const res = await fetch(`/api/bookings/${rejectingBookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reject',
          reason: rejectReason || 'Schedule conflict or administrative review.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject booking.');
      message.success('Booking rejected');
      setRejectingBookingId(null);
      setRejectReason('');
      fetchOperationalData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Group weekly recurring bookings by recurrence_group_id so the technician approves 1 request for the full semester
  const groupedPendingBookings = useMemo(() => {
    const groupMap = new Map();
    const list = [];

    pendingBookings.forEach(b => {
      const gId = b.recurrence_group_id;
      if (gId) {
        if (!groupMap.has(gId)) {
          const item = {
            ...b,
            allSessions: [b],
            is_recurring_series: true,
            total_weeks: 1,
            first_date: b.start_time,
            last_date: b.start_time,
          };
          groupMap.set(gId, item);
          list.push(item);
        } else {
          const item = groupMap.get(gId);
          item.allSessions.push(b);
          item.total_weeks += 1;
          if (new Date(b.start_time) < new Date(item.first_date)) item.first_date = b.start_time;
          if (new Date(b.start_time) > new Date(item.last_date)) item.last_date = b.start_time;
        }
      } else {
        list.push({ ...b, is_recurring_series: false });
      }
    });

    return list;
  }, [pendingBookings]);

  const bookingColumns = [
    {
      title: 'Facility',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>{record.location_code}</div>
        </div>
      ),
    },
    {
      title: 'Requester',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{record.user_role}</div>
        </div>
      ),
    },
    {
      title: 'Purpose / Course',
      key: 'purpose',
      render: (_, record) => (
        <div>
          {record.course_id && (
            <Tag color="cyan" style={{ fontWeight: 700, marginBottom: 2 }}>
              {record.course_id}
            </Tag>
          )}
          <div style={{ fontSize: 12 }}>{record.purpose}</div>
          {record.is_recurring_series && (
            <Tag color="purple" style={{ fontWeight: 700, marginTop: 4, borderRadius: 6 }}>
              📅 Entire Semester ({record.total_weeks} Weeks)
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Time Window',
      key: 'time',
      render: (_, record) => {
        if (record.is_recurring_series) {
          const dayName = dayjs(record.start_time).format('dddd');
          const timeRange = `${dayjs(record.start_time).format('HH:mm')} – ${dayjs(record.end_time).format('HH:mm')}`;
          const dateSpan = `${dayjs(record.first_date).format('DD/MM/YYYY')} → ${dayjs(record.last_date).format('DD/MM/YYYY')}`;
          return (
            <div>
              <div style={{ fontWeight: 700, color: '#1E3A8A' }}>
                Every {dayName} • {timeRange}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                {dateSpan} ({record.total_weeks} weekly sessions)
              </div>
            </div>
          );
        }
        return (
          <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {formatDateTime(record.start_time)} &rarr; {formatDateTime(record.end_time)}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={actionLoadingId === record.booking_id}
            onClick={() => handleApproveBooking(record.booking_id)}
            style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 600 }}
          >
            {record.is_recurring_series ? `Approve Series (${record.total_weeks} Wks)` : 'Approve'}
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setRejectingBookingId(record.booking_id);
              setRejectReason('');
            }}
          >
            {record.is_recurring_series ? 'Reject Series' : 'Reject'}
          </Button>
        </Space>
      ),
    },
  ];

  const issueColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'report_id',
      key: 'report_id',
      render: (id) => <Text code>#{id}</Text>,
    },
    {
      title: 'Location / Item',
      key: 'target',
      render: (_, record) => record.location_name || record.device_name || 'Faculty Facility',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #172554 60%, #1E3A8A 100%)',
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
        }}
        bodyStyle={{ padding: '24px 28px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Tag color="cyan" style={{ borderRadius: 12, fontWeight: 700, padding: '2px 10px', marginBottom: 8 }}>
              {isManager ? 'Faculty Lab Manager' : 'Operations & Maintenance Technician'}
            </Tag>
            <Title level={2} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 4vw, 26px)', lineHeight: 1.25 }}>
              Staff Operational Command
            </Title>
            <Paragraph style={{ color: '#93C5FD', margin: '4px 0 0 0', fontSize: 12 }}>
              Signed in as <strong style={{ color: '#FFFFFF' }}>{user?.name}</strong> • Real-time facility monitoring & maintenance queue
            </Paragraph>
          </div>

          <Space wrap size="small">
            <Link to="/map">
              <Button icon={<CompassOutlined />} style={{ fontWeight: 600 }}>
                Interactive Map
              </Button>
            </Link>
            <Button icon={<ReloadOutlined />} onClick={fetchOperationalData}>
              Refresh Data
            </Button>
          </Space>
        </div>
      </Card>

      {/* KPI Statistic Cards (2x2 on phones, 4 in a row on desktops) */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Maintenance Rooms</span>}
              value={maintenanceLocations.length}
              valueStyle={{ color: '#F59E0B', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 24px)' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Booking Approvals</span>}
              value={groupedPendingBookings.length}
              valueStyle={{ color: '#1E3A8A', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 24px)' }}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Breakdown Tickets</span>}
              value={openIssues.length}
              valueStyle={{ color: '#DC2626', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 24px)' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Pending Loans</span>}
              value={pendingLoans.length}
              valueStyle={{ color: '#2563EB', fontWeight: 800, fontSize: 'clamp(18px, 4vw, 24px)' }}
              prefix={<LaptopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Pending Room Booking Approvals Table */}
      <Card
        title={
          <Space>
            <CalendarOutlined style={{ color: '#1E3A8A' }} />
            <span>Pending Approvals Queue</span>
            <Tag color="warning">{groupedPendingBookings.length}</Tag>
          </Space>
        }
        extra={<Link to="/rooms">Manage Facilities &rarr;</Link>}
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          dataSource={groupedPendingBookings}
          columns={bookingColumns}
          rowKey="booking_id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: <Empty description="No pending room reservations awaiting approval" /> }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Two Columns: Active Breakdown Tickets & Maintenance Locations */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <AlertOutlined style={{ color: '#DC2626' }} />
                <span>Active Breakdown Tickets</span>
                <Tag color="error">{openIssues.length}</Tag>
              </Space>
            }
            extra={<Link to="/tickets">View All &rarr;</Link>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Table
              dataSource={openIssues}
              columns={issueColumns}
              rowKey="report_id"
              loading={loading}
              pagination={{ pageSize: 4, simple: true }}
              locale={{ emptyText: <Empty description="No open breakdown tickets" /> }}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ToolOutlined style={{ color: '#F59E0B' }} />
                <span>Rooms Under Maintenance</span>
              </Space>
            }
            extra={<Link to="/rooms">Toggle Status &rarr;</Link>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {maintenanceLocations.length === 0 ? (
              <Empty description="All rooms are available and operational" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {maintenanceLocations.map(loc => (
                  <div
                    key={loc.location_id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <Text strong style={{ color: '#92400E' }}>{loc.name}</Text>
                      <div style={{ fontSize: 11, color: '#B45309' }}>
                        {loc.floor?.startsWith('Blok') ? loc.floor : `Floor ${loc.floor}`} • {loc.code}
                      </div>
                    </div>
                    <StatusTag status="Maintenance" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Rejection Modal with input reason */}
      <Modal
        open={Boolean(rejectingBookingId)}
        title="Reject Room Booking Request"
        onOk={handleRejectConfirm}
        onCancel={() => setRejectingBookingId(null)}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: Boolean(actionLoadingId) }}
      >
        <p style={{ color: '#64748B', fontSize: 13 }}>
          Please specify the administrative or scheduling reason for rejecting this booking request:
        </p>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Facility is reserved for departmental workshop."
        />
      </Modal>
    </div>
  );
}
