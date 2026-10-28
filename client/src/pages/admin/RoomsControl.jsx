import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Table, Button, Input, Select, Tag, Space, Typography, Popconfirm, Switch, Modal, Row, Col, Empty, message, Rate, Statistic } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  ToolOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  QrcodeOutlined,
  StarOutlined,
  AlertOutlined,
  DeleteOutlined,
  MessageOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import EditRoomModal from '../../components/EditRoomModal';
import ClassroomQRPlacard from '../../components/ClassroomQRPlacard';
import BatchPlacardsModal from '../../components/BatchPlacardsModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/date';

const { Text, Title, Paragraph } = Typography;

export default function RoomsControl() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  // QR Placard state
  const [selectedPlacardLocation, setSelectedPlacardLocation] = useState(null);
  const [isBatchPlacardsOpen, setIsBatchPlacardsOpen] = useState(false);
  const [roomFeedbackFilter, setRoomFeedbackFilter] = useState('all');

  // Booking filters
  const [bookingStatusFilter, setBookingStatusFilter] = useState('pending');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [locRes, bookRes, fbRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/bookings'),
        fetch('/api/feedback', { credentials: 'include' }).catch(() => ({ json: () => ({ feedbacks: [] }) }))
      ]);
      const locData = await locRes.json();
      const bookData = await bookRes.json();
      const fbData = await fbRes.json();
      if (locData.success) setLocations(locData.locations);
      if (bookData.success) setBookings(bookData.bookings);
      if (fbData.success) setFeedbacks(fbData.feedbacks || []);
    } catch (err) {
      console.error(err);
      message.error('Failed to load facilities data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteFeedback(feedbackId) {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('Feedback removed.');
      setFeedbacks(prev => prev.filter(f => f.feedback_id !== feedbackId));
    } catch (err) {
      message.error(err.message);
    }
  }

  async function toggleRoomStatus(loc) {
    const nextStatus = loc.status === 'maintenance' ? 'available' : 'maintenance';
    setUpdatingId(loc.location_id);
    try {
      const res = await fetch(`/api/locations/${loc.location_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: nextStatus,
          reason: `Admin toggle status from Rooms Control console.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocations(prev =>
        prev.map(item =>
          item.location_id === loc.location_id ? { ...item, status: nextStatus } : item
        )
      );
      message.success(`${loc.name} marked as ${nextStatus}`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleApprove(bookingId) {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('Booking approved successfully');
      fetchData();
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
          reason: rejectReason || 'Administrative schedule review.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('Booking rejected');
      setRejectingBookingId(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Cancel a single booking occurrence
  async function handleCancelBooking(bookingId) {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-week`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel booking.');
      message.success(data.message || 'Booking cancelled.');
      fetchData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  // Cancel entire recurring series
  async function handleCancelSeries(groupId) {
    setActionLoadingId(groupId);
    try {
      const res = await fetch(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel series.');
      message.success(data.message || 'Series cancelled.');
      fetchData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredLocations = useMemo(() => {
    return locations.filter(l => {
      if (floorFilter !== 'All' && l.floor !== floorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q) ||
          (l.category && l.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [locations, floorFilter, search]);

  const filteredBookings = useMemo(() => {
    const list = bookings.filter(b => {
      if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
      return true;
    });

    // Group recurring series so that a 14-week request appears as ONE single entry in the approval queue
    const groupMap = new Map();
    const result = [];

    list.forEach(b => {
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
          result.push(item);
        } else {
          const item = groupMap.get(gId);
          item.allSessions.push(b);
          item.total_weeks += 1;
          if (new Date(b.start_time) < new Date(item.first_date)) item.first_date = b.start_time;
          if (new Date(b.start_time) > new Date(item.last_date)) item.last_date = b.start_time;
        }
      } else {
        result.push({ ...b, is_recurring_series: false });
      }
    });

    return result;
  }, [bookings, bookingStatusFilter]);

  const approvalColumns = [
    {
      title: 'Facility',
      dataIndex: 'location_name',
      key: 'location_name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {r.location_code} • {r.location_floor?.startsWith('Blok') ? r.location_floor : `Floor ${r.location_floor}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Requester',
      key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.user_name}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {r.matric_or_staff_id} • {r.user_role}
          </div>
        </div>
      ),
    },
    {
      title: 'Purpose / Course',
      key: 'purpose',
      render: (_, r) => (
        <div>
          {r.course_id && <Tag color="cyan" style={{ fontWeight: 700, marginBottom: 2 }}>{r.course_id}</Tag>}
          <div style={{ fontSize: 12 }}>{r.purpose}</div>
          {r.is_recurring_series && (
            <Tag color="purple" style={{ fontWeight: 700, marginTop: 4, borderRadius: 6 }}>
              📅 Entire Semester ({r.total_weeks} Weeks)
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Time Window',
      key: 'time',
      render: (_, r) => {
        if (r.is_recurring_series) {
          const dayName = dayjs(r.start_time).format('dddd');
          const timeRange = `${dayjs(r.start_time).format('HH:mm')} – ${dayjs(r.end_time).format('HH:mm')}`;
          const dateSpan = `${dayjs(r.first_date).format('DD/MM/YYYY')} → ${dayjs(r.last_date).format('DD/MM/YYYY')}`;
          return (
            <div>
              <div style={{ fontWeight: 700, color: '#1E3A8A' }}>
                Every {dayName} • {timeRange}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                {dateSpan} ({r.total_weeks} weekly sessions)
              </div>
            </div>
          );
        }
        return (
          <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
            {formatDateTime(r.start_time)} &rarr; {formatDateTime(r.end_time)}
          </span>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => (
        <Space size="small" wrap>
          {r.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={actionLoadingId === r.booking_id}
                onClick={() => handleApprove(r.booking_id)}
                style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 600 }}
              >
                {r.is_recurring_series ? `Approve Series (${r.total_weeks} Wks)` : 'Approve'}
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectingBookingId(r.booking_id);
                  setRejectReason('');
                }}
              >
                {r.is_recurring_series ? 'Reject Series' : 'Reject'}
              </Button>
            </>
          )}

          {/* Cancel buttons — available for approved (and pending) bookings */}
          {(r.status === 'approved' || r.status === 'pending') && (
            <>
              <Popconfirm
                title="Cancel This Booking"
                description={
                  r.is_recurring_series
                    ? 'Cancel this one session occurrence only?'
                    : 'Are you sure you want to cancel this booking?'
                }
                onConfirm={() => handleCancelBooking(r.booking_id)}
                okText="Yes, Cancel"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  icon={<StopOutlined />}
                  loading={actionLoadingId === r.booking_id}
                  style={{ borderColor: '#F59E0B', color: '#B45309' }}
                >
                  {r.is_recurring_series ? 'Cancel Week' : 'Cancel'}
                </Button>
              </Popconfirm>

              {r.is_recurring_series && r.recurrence_group_id && (
                <Popconfirm
                  title="Cancel Entire Series"
                  description="Cancel ALL remaining weeks of this recurring series? This cannot be undone."
                  onConfirm={() => handleCancelSeries(r.recurrence_group_id)}
                  okText="Yes, Cancel All"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    loading={actionLoadingId === r.recurrence_group_id}
                  >
                    Cancel Series
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  const facilityColumns = [
    {
      title: 'Facility Name',
      key: 'name',
      render: (_, loc) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {loc.image_url ? (
            <img
              src={loc.image_url}
              alt={loc.name}
              referrerPolicy="no-referrer"
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E3A8A' }}>
              <AppstoreOutlined />
            </div>
          )}
          <div>
            <Text strong>{loc.name}</Text>
            <div style={{ fontSize: 11, color: '#64748B' }}>{loc.category}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (c) => <Text code>{c}</Text>,
    },
    {
      title: 'Floor',
      dataIndex: 'floor',
      key: 'floor',
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (cap) => `${cap} seats`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
    },
    {
      title: 'Maintenance Toggle',
      key: 'toggle',
      render: (_, loc) => {
        const isMaint = loc.status === 'maintenance';
        return (
          <Popconfirm
            title="Toggle Status"
            description={`Set facility to ${isMaint ? 'Available' : 'Maintenance'}?`}
            onConfirm={() => toggleRoomStatus(loc)}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Button
              size="small"
              loading={updatingId === loc.location_id}
              style={{
                background: isMaint ? '#16A34A' : '#F59E0B',
                borderColor: isMaint ? '#16A34A' : '#F59E0B',
                color: '#fff',
              }}
            >
              {isMaint ? 'Restore Available' : 'Set Maintenance'}
            </Button>
          </Popconfirm>
        );
      },
    },
    {
      title: 'QR Placard',
      key: 'qr',
      render: (_, loc) => (
        <Button
          size="small"
          icon={<QrcodeOutlined />}
          onClick={() => setSelectedPlacardLocation(loc)}
          style={{ fontWeight: 600, color: '#1E3A8A', borderColor: '#93C5FD' }}
        >
          QR Placard
        </Button>
      ),
    },
    {
      title: 'Edit',
      key: 'edit',
      render: (_, loc) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => setEditingLocation(loc)}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Room Facilities & Reservation Control"
        subtitle="Operational authority over booking approvals, emergency maintenance toggles, QR code placards, and classroom feedback."
        extra={
          <Space>
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={() => setIsBatchPlacardsOpen(true)}
              style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700 }}
            >
              Print QR Placards
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'approvals',
              label: (
                <span>
                  <CalendarOutlined style={{ marginRight: 6 }} />
                  Booking Requests Queue ({bookings.filter(b => b.status === 'pending').length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={12}>
                      <Select
                        style={{ width: 220 }}
                        value={bookingStatusFilter}
                        onChange={setBookingStatusFilter}
                        options={[
                          { value: 'all', label: 'All Booking Requests' },
                          { value: 'pending', label: 'Pending Approval Only' },
                          { value: 'approved', label: 'Approved Only' },
                          { value: 'rejected', label: 'Rejected Only' },
                        ]}
                      />
                    </Col>
                  </Row>

                  <Table
                    dataSource={filteredBookings}
                    columns={approvalColumns}
                    rowKey="booking_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: <Empty description="No bookings match filter" /> }}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'facilities',
              label: (
                <span>
                  <AppstoreOutlined style={{ marginRight: 6 }} />
                  Facilities & Maintenance State ({locations.length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="Search rooms by name, code, category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} md={6}>
                      <Select
                        style={{ width: '100%' }}
                        value={floorFilter}
                        onChange={setFloorFilter}
                        options={[
                          { value: 'All', label: 'All Floors & Blocks' },
                          { value: 'Ground', label: 'Ground Floor' },
                          { value: 'First', label: 'First Floor' },
                          { value: 'Second', label: 'Second Floor' },
                          { value: 'Third', label: 'Third Floor' },
                          { value: 'Blok B8', label: 'Blok B8' },
                          { value: 'Blok C12', label: 'Blok C12' },
                          { value: 'Blok L Perpustakaan', label: 'Blok L Perpustakaan' },
                        ]}
                      />
                    </Col>
                  </Row>

                  <Table
                    dataSource={filteredLocations}
                    columns={facilityColumns}
                    rowKey="location_id"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: <Empty description="No facilities found" /> }}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'feedback',
              label: (
                <span>
                  <StarOutlined style={{ marginRight: 6, color: '#D97706' }} />
                  Classroom Feedback & Reports ({feedbacks.length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Summary Metric Cards */}
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                      <Card bordered={false} style={{ background: '#F8FAFC', borderRadius: 12 }}>
                        <Statistic
                          title="Total Reviews"
                          value={feedbacks.length}
                          prefix={<MessageOutlined style={{ color: '#2563EB' }} />}
                          valueStyle={{ fontWeight: 800, color: '#1E3A8A' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card bordered={false} style={{ background: '#F8FAFC', borderRadius: 12 }}>
                        <Statistic
                          title="Avg Overall Score"
                          value={
                            feedbacks.length > 0
                              ? (feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0) / feedbacks.length).toFixed(1)
                              : '5.0'
                          }
                          suffix="/ 5.0"
                          prefix={<StarOutlined style={{ color: '#F59E0B' }} />}
                          valueStyle={{ fontWeight: 800, color: '#D97706' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card bordered={false} style={{ background: '#F8FAFC', borderRadius: 12 }}>
                        <Statistic
                          title="Avg AC Comfort"
                          value={
                            feedbacks.length > 0
                              ? (feedbacks.reduce((acc, f) => acc + (f.ac_rating || 5), 0) / feedbacks.length).toFixed(1)
                              : '5.0'
                          }
                          suffix="/ 5.0"
                          valueStyle={{ fontWeight: 800, color: '#0284C7' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card bordered={false} style={{ background: '#F8FAFC', borderRadius: 12 }}>
                        <Statistic
                          title="Avg Cleanliness"
                          value={
                            feedbacks.length > 0
                              ? (feedbacks.reduce((acc, f) => acc + (f.cleanliness_rating || 5), 0) / feedbacks.length).toFixed(1)
                              : '5.0'
                          }
                          suffix="/ 5.0"
                          valueStyle={{ fontWeight: 800, color: '#059669' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Room Filter Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Text strong>Filter by Classroom:</Text>
                      <Select
                        style={{ width: 260 }}
                        value={roomFeedbackFilter}
                        onChange={setRoomFeedbackFilter}
                        options={[
                          { value: 'all', label: 'All Classrooms & Facilities' },
                          ...locations.map(loc => ({
                            value: String(loc.location_id),
                            label: `${loc.code} — ${loc.name}`
                          }))
                        ]}
                      />
                    </div>
                    <Button
                      type="primary"
                      icon={<QrcodeOutlined />}
                      onClick={() => setIsBatchPlacardsOpen(true)}
                      style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 600 }}
                    >
                      Print Room QR Placards
                    </Button>
                  </div>

                  {/* Feedback Table */}
                  <Table
                    dataSource={feedbacks.filter(f =>
                      roomFeedbackFilter === 'all' ? true : String(f.location_id) === String(roomFeedbackFilter)
                    )}
                    rowKey="feedback_id"
                    pagination={{ pageSize: 8 }}
                    size="small"
                    locale={{ emptyText: <Empty description="No classroom feedback reviews submitted yet" /> }}
                    columns={[
                      {
                        title: 'Classroom',
                        key: 'room',
                        render: (_, record) => (
                          <div>
                            <Tag color="navy" style={{ fontWeight: 800 }}>{record.location_code}</Tag>
                            <span style={{ fontWeight: 600 }}>{record.location_name}</span>
                            <div style={{ fontSize: 11, color: '#64748B' }}>{record.location_floor}</div>
                          </div>
                        )
                      },
                      {
                        title: 'Reporter',
                        key: 'reporter',
                        render: (_, record) => (
                          <div>
                            <div style={{ fontWeight: 600 }}>{record.reporter_name || 'Anonymous Student'}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              {record.matric_or_staff_id ? `${record.matric_or_staff_id} • ` : ''}{record.reporter_role || 'student'}
                            </div>
                          </div>
                        )
                      },
                      {
                        title: 'Overall Score',
                        dataIndex: 'rating',
                        key: 'rating',
                        render: (r) => <Rate disabled value={r || 5} style={{ fontSize: 13 }} />
                      },
                      {
                        title: 'AC / Clean / Tech',
                        key: 'scores',
                        render: (_, record) => (
                          <div style={{ fontSize: 11, color: '#475569' }}>
                            <span>❄️ {record.ac_rating || 5}/5</span> •{' '}
                            <span>🧹 {record.cleanliness_rating || 5}/5</span> •{' '}
                            <span>📽️ {record.equipment_rating || 5}/5</span>
                          </div>
                        )
                      },
                      {
                        title: 'Comments & Suggestions',
                        dataIndex: 'comments',
                        key: 'comments',
                        ellipsis: true
                      },
                      {
                        title: 'Date Submitted',
                        dataIndex: 'created_at',
                        key: 'created_at',
                        render: (dt) => formatDateTime(dt)
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        render: (_, record) => (
                          <Popconfirm
                            title="Delete Feedback"
                            description="Remove this feedback record?"
                            onConfirm={() => handleDeleteFeedback(record.feedback_id)}
                            okText="Delete"
                            cancelText="Cancel"
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        )
                      }
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectingBookingId)}
        title="Reject Room Booking Request"
        onOk={handleRejectConfirm}
        onCancel={() => setRejectingBookingId(null)}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, loading: Boolean(actionLoadingId) }}
      >
        <p style={{ color: '#64748B', fontSize: 13 }}>
          Specify rejection reason:
        </p>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* Edit Room Modal */}
      {editingLocation && (
        <EditRoomModal
          isOpen={Boolean(editingLocation)}
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSaved={() => fetchData()}
        />
      )}

      {/* Single Classroom QR Placard Modal */}
      <Modal
        open={Boolean(selectedPlacardLocation)}
        onCancel={() => setSelectedPlacardLocation(null)}
        footer={null}
        width={680}
        centered
        destroyOnClose
      >
        {selectedPlacardLocation && (
          <ClassroomQRPlacard location={selectedPlacardLocation} />
        )}
      </Modal>

      {/* Batch Placards Modal */}
      <BatchPlacardsModal
        isOpen={isBatchPlacardsOpen}
        onClose={() => setIsBatchPlacardsOpen(false)}
        locations={locations}
      />
    </div>
  );
}
