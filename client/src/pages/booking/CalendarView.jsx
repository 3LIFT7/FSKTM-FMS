import React, { useState, useEffect, useMemo } from 'react';
import { Card, Calendar, Select, Button, Tag, Space, Typography, Row, Col, Alert, Badge, Empty, Spin, Grid } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from './BookRoomModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { DATE_FORMAT, formatDateTime } from '../../utils/date';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function CalendarView() {
  const { isStudent, isLecturer, isStaff } = useAuth();
  const screens = useBreakpoint();
  const isMobile = screens.md === false;

  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedLocationId, setSelectedLocationId] = useState('All');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [bookRes, locRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/locations'),
      ]);
      const bookData = await bookRes.json();
      const locData = await locRes.json();
      if (bookData.success) setBookings(bookData.bookings);
      if (locData.success) setLocations(locData.locations);
    } catch (err) {
      console.error('Error fetching calendar bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  // Auto-hide maintenance rooms from calendar selector (Section 8)
  const maintenanceRooms = useMemo(() => {
    return locations.filter(l => l.status === 'maintenance');
  }, [locations]);

  const activeLocations = useMemo(() => {
    return locations.filter(l => l.status !== 'maintenance');
  }, [locations]);

  // Filter bookings based on selected floor, location, and non-cancelled status
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'rejected' || b.status === 'cancelled') return false;
      if (selectedFloor !== 'All' && b.location_floor !== selectedFloor) return false;
      if (selectedLocationId !== 'All' && String(b.location_id) !== String(selectedLocationId)) return false;
      return true;
    });
  }, [bookings, selectedFloor, selectedLocationId]);

  // Calendar date cell renderer
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayBookings = filteredBookings.filter(b => {
      const bDate = dayjs(b.start_time).format('YYYY-MM-DD');
      return bDate === dateStr;
    });

    if (dayBookings.length === 0) return null;

    return (
      <div style={{ maxHeight: 75, overflowY: 'auto' }}>
        {dayBookings.map(b => (
          <div
            key={b.booking_id}
            style={{
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 2,
              padding: '1px 4px',
              borderRadius: 4,
              background: b.status === 'approved' ? '#ECFDF5' : '#FFFBEB',
              color: b.status === 'approved' ? '#065F46' : '#92400E',
              border: `1px solid ${b.status === 'approved' ? '#A7F3D0' : '#FDE68A'}`,
            }}
            title={`${b.location_name}: ${b.purpose} (${dayjs(b.start_time).format('HH:mm')} - ${dayjs(b.end_time).format('HH:mm')})`}
          >
            <Badge status={b.status === 'approved' ? 'success' : 'warning'} />
            <span style={{ fontWeight: 600 }}>{b.location_code || b.location_name}</span>:{' '}
            {dayjs(b.start_time).format('HH:mm')}
          </div>
        ))}
      </div>
    );
  };

  // Selected date's detailed agenda
  const selectedDateBookings = useMemo(() => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return filteredBookings.filter(b => dayjs(b.start_time).format('YYYY-MM-DD') === dateStr);
  }, [filteredBookings, selectedDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Facility Booking Calendar"
        subtitle="Public timetable of laboratory and classroom reservations across all 4 floors of FSKTM."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setIsBookModalOpen(true)}
            style={{ fontWeight: 600 }}
          >
            {isLecturer || isStaff ? 'Book Lab / Room' : 'Request Room Booking'}
          </Button>
        }
      />

      {/* Auto-sync Maintenance Warning Banner */}
      {maintenanceRooms.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Auto-Hide Policy Enforced"
          description={`${maintenanceRooms.length} room(s) under active maintenance are automatically hidden from booking selection.`}
          style={{ borderRadius: 10 }}
        />
      )}

      {/* Filter Row */}
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
              Filter by Floor:
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedFloor}
              onChange={(val) => {
                setSelectedFloor(val);
                setSelectedLocationId('All');
              }}
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

          <Col xs={24} sm={12} md={8}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>
              Filter by Facility:
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedLocationId}
              onChange={setSelectedLocationId}
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={[
                { value: 'All', label: 'All Available Rooms' },
                ...activeLocations
                  .filter(l => selectedFloor === 'All' || l.floor === selectedFloor)
                  .map(loc => ({
                    value: String(loc.location_id),
                    label: `${loc.name} (${loc.code})`,
                  })),
              ]}
            />
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Showing <strong>{filteredBookings.length}</strong> active reservations
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main Calendar & Day Schedule Grid */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              fullscreen={!isMobile}
              dateCellRender={isMobile ? undefined : dateCellRender}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#1E3A8A' }} />
                <span>Schedule for {selectedDate.format('DD/MM/YYYY')}</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            {selectedDateBookings.length === 0 ? (
              <Empty description="No classes or bookings scheduled for this date" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedDateBookings.map(b => (
                  <div
                    key={b.booking_id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ color: '#0F172A' }}>{b.location_name}</Text>
                      <StatusTag status={b.status} />
                    </div>
                    <div style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600, marginTop: 2 }}>
                      {dayjs(b.start_time).format('HH:mm')} &rarr; {dayjs(b.end_time).format('HH:mm')}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      {b.purpose}
                    </div>
                    {b.course_id && (
                      <Tag color="cyan" style={{ marginTop: 6, fontSize: 10 }}>
                        {b.course_id}
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchData()}
      />
    </div>
  );
}
