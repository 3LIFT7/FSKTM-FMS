import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Empty, Space, Typography, Tag, message } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  CompassOutlined,
  BookOutlined,
  LaptopOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import WeeklyTimetable from '../../components/WeeklyTimetable';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [myUsageLogs, setMyUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);
  const [loanRequests, setLoanRequests] = useState([]);
  const [loanActionId, setLoanActionId] = useState(null);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  async function fetchLecturerData() {
    setLoading(true);
    try {
      const [res, loanRes, usageRes] = await Promise.all([
        fetch('/api/bookings', { credentials: 'include' }),
        fetch('/api/device-loans', { credentials: 'include' }),
        fetch('/api/lab-usage', { credentials: 'include' }),
      ]);
      const [data, loanData, usageData] = await Promise.all([
        res.json(),
        loanRes.json(),
        usageRes.json().catch(() => ({ success: false, logs: [] })),
      ]);
      if (data.success) {
        setMyBookings(
          data.bookings
            .filter((b) => b.user_id === user?.user_id)
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        );
      }
      if (loanData.success) {
        setLoanRequests(
          loanData.loans
            .filter(
              (loan) => loan.status === 'pending_lecturer' && Number(loan.lecturer_approver_id) === Number(user?.user_id)
            )
            .sort((a, b) => new Date(b.created_at || b.expected_return_time) - new Date(a.created_at || a.expected_return_time))
        );
      }
      if (usageData.success) {
        setMyUsageLogs(
          (usageData.logs || [])
            .filter((log) => Number(log.user_id) === Number(user?.user_id))
            .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
        );
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }

  async function reviewLoan(loanId, action) {
    setLoanActionId(loanId);
    try {
      const res = await fetch(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not review request');
      message.success(data.message);
      await fetchLecturerData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoanActionId(null);
    }
  }

  const activeBookings = myBookings.filter((b) => b.status === 'approved' || b.status === 'pending');
  const recurringBookings = myBookings.filter((b) => Boolean(b.recurrence_group_id || b.recurring_group_id));
  const verifiedAttendanceCount = myUsageLogs.filter((l) => ['on_time', 'late'].includes(l.attendance_status)).length;

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
              Staff ID: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{user?.matric_or_staff_id || '-'}</strong> • Scan the QR code inside your reserved lab/room to confirm lecture attendance.
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

      {/* Statistics - 4 Columns */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Reservations</span>}
              value={activeBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<CalendarOutlined style={{ color: '#B45309' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Recurring</span>}
              value={recurringBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<BookOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 13px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Total Bookings</span>}
              value={myBookings.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<CompassOutlined style={{ color: '#10B981' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>QR Verified Attendance</span>}
              value={verifiedAttendanceCount}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<QrcodeOutlined style={{ color: '#2563EB' }} />}
            />
          </Card>
        </Col>
      </Row>

      <WeeklyTimetable
        bookings={myBookings}
        attendanceLogs={myUsageLogs}
        onBookSlot={(slot) => {
          setSelectedSlotForBooking(slot || null);
          setIsBookModalOpen(true);
        }}
        onRefresh={fetchLecturerData}
        lecturerName={user?.name}
      />

      {/* Device Loans Awaiting Approval */}
      <Card
        title={<Space><LaptopOutlined /><span>Device Loans Awaiting Your Approval</span><Tag color="blue">{loanRequests.length}</Tag></Space>}
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          size="small"
          rowKey="loan_id"
          dataSource={loanRequests}
          scroll={{ x: 680 }}
          pagination={{ pageSize: 5, simple: true }}
          locale={{ emptyText: <Empty description="No device requests need your approval" /> }}
          columns={[
            { title: 'Student', dataIndex: 'borrower_name', key: 'borrower_name', width: 155, render: (name, row) => <div><Text strong>{name}</Text><div style={{ color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>{row.matric_or_staff_id}</div></div> },
            {
              title: 'Device & Accessories', dataIndex: 'device_name', key: 'device_name', width: 210,
              render: (name, row) => {
                const selAcc = Array.isArray(row.selected_accessories) ? row.selected_accessories : [];
                return <div><Text strong>{name}</Text>{selAcc.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>{selAcc.map((acc) => <Tag key={acc} color="geekblue" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 4 }}>+ {acc}</Tag>)}</div>}</div>;
              },
            },
            { title: 'Return By', dataIndex: 'expected_return_time', key: 'expected_return_time', width: 135, sorter: (a, b) => new Date(a.expected_return_time) - new Date(b.expected_return_time), defaultSortOrder: 'descend', render: (val) => <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontFamily: 'monospace' }}>{formatDateTime(val)}</span> },
            { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', width: 140, ellipsis: true },
            { title: 'Review', key: 'review', width: 155, render: (_, row) => <Space size={6}><Button size="small" type="primary" loading={loanActionId === row.loan_id} onClick={() => reviewLoan(row.loan_id, 'lecturer_approve')}>Approve</Button><Button size="small" danger loading={loanActionId === row.loan_id} onClick={() => reviewLoan(row.loan_id, 'reject')}>Reject</Button></Space> },
          ]}
        />
      </Card>

      <BookRoomModal
        isOpen={isBookModalOpen}
        initialSlot={selectedSlotForBooking}
        onClose={() => {
          setIsBookModalOpen(false);
          setSelectedSlotForBooking(null);
        }}
        onBookingCreated={() => {
          fetchLecturerData();
          setSelectedSlotForBooking(null);
        }}
      />
    </div>
  );
}
