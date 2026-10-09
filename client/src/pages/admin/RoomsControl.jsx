import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Table, Button, Input, Select, Tag, Space, Typography, Popconfirm, Switch, Modal, Row, Col, Empty, message } from 'antd';
import {
  AppstoreOutlined,
  CalendarOutlined,
  ToolOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import EditRoomModal from '../../components/EditRoomModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/date';

const { Text } = Typography;

export default function RoomsControl() {
  const [activeTab, setActiveTab] = useState('approvals');
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

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
      const [locRes, bookRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/bookings'),
      ]);
      const locData = await locRes.json();
      const bookData = await bookRes.json();
      if (locData.success) setLocations(locData.locations);
      if (bookData.success) setBookings(bookData.bookings);
    } catch (err) {
      console.error(err);
      message.error('Failed to load facilities data');
    } finally {
      setLoading(false);
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
    return bookings.filter(b => {
      if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
      return true;
    });
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
            {r.location_code} • Floor {r.location_floor}
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
          {r.course_id && <Tag color="cyan">{r.course_id}</Tag>}
          <div style={{ fontSize: 12 }}>{r.purpose}</div>
        </div>
      ),
    },
    {
      title: 'Time Window',
      key: 'time',
      render: (_, r) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {formatDateTime(r.start_time)} &rarr; {formatDateTime(r.end_time)}
        </span>
      ),
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
        <Space size="small">
          {r.status === 'pending' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={actionLoadingId === r.booking_id}
                onClick={() => handleApprove(r.booking_id)}
                style={{ background: '#16A34A', borderColor: '#16A34A' }}
              >
                Approve
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
                Reject
              </Button>
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
        <div>
          <Text strong>{loc.name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>{loc.category}</div>
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
        subtitle="Operational authority over booking approvals, emergency maintenance toggles, and facility specifications."
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
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
                    scroll={{ x: 'max-content' }}
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
                          { value: 'All', label: 'All Floors' },
                          { value: 'Ground', label: 'Ground Floor' },
                          { value: 'Level 1', label: 'Level 1' },
                          { value: 'Level 2', label: 'Level 2' },
                          { value: 'Level 3', label: 'Level 3' },
                        ]}
                      />
                    </Col>
                  </Row>

                  <Table
                    dataSource={filteredLocations}
                    columns={facilityColumns}
                    rowKey="location_id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: <Empty description="No facilities found" /> }}
                    size="small"
                    scroll={{ x: 'max-content' }}
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
          placeholder="e.g. Schedule conflict with faculty seminar."
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
    </div>
  );
}
