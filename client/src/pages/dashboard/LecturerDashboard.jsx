import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Empty, Space, Typography, Tag, message } from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  CompassOutlined,
  BookOutlined,
  LaptopOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import LabUsageModal from '../booking/LabUsageModal';
import WeeklyTimetable from '../../components/WeeklyTimetable';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [myUsageLogs, setMyUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingGroupId, setTogglingGroupId] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
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
      if (data.success) setMyBookings(data.bookings.filter((b) => b.user_id === user?.user_id));
      if (loanData.success) {
        setLoanRequests(
          loanData.loans.filter(
            (loan) => loan.status === 'pending_lecturer' && Number(loan.lecturer_approver_id) === Number(user?.user_id)
          )
        );
      }
      if (usageData.success) {
        setMyUsageLogs((usageData.logs || []).filter((log) => Number(log.user_id) === Number(user?.user_id)));
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

  const activeBookings = myBookings.filter((b) => b.status === 'approved' || b.status === 'pending');
  const recurringBookings = myBookings.filter((b) => Boolean(b.recurrence_group_id || b.recurring_group_id));

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
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={() => setIsUsageModalOpen(true)}
              style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700 }}
            >
              Record Lecture Attendance
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
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
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
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Attendance Logs</span>}
              value={myUsageLogs.length}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<FileTextOutlined style={{ color: '#2563EB' }} />}
            />
          </Card>
        </Col>
      </Row>

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
          pagination={{ pageSize: 5, simple: true }}
          locale={{ emptyText: <Empty description="No device requests need your approval" /> }}
          columns={[
            { title: 'Student', dataIndex: 'borrower_name', key: 'borrower_name', render: (name, row) => <div><Text strong>{name}</Text><div style={{ color: '#64748B', fontSize: 12 }}>{row.matric_or_staff_id}</div></div> },
            {
              title: 'Device & Accessories',
              dataIndex: 'device_name',
              key: 'device_name',
              render: (name, row) => {
                const selAcc = Array.isArray(row.selected_accessories) ? row.selected_accessories : [];
                return (
                  <div>
                    <Text strong>{name}</Text>
                    {selAcc.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {selAcc.map((acc) => (
                          <Tag key={acc} color="geekblue" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 4 }}>
                            + {acc}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            },
            { title: 'Return By', dataIndex: 'expected_return_time', key: 'expected_return_time', render: formatDateTime },
            { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
            { title: 'Review', key: 'review', render: (_, row) => <Space><Button size="small" type="primary" loading={loanActionId === row.loan_id} onClick={() => reviewLoan(row.loan_id, 'lecturer_approve')}>Approve</Button><Button size="small" danger loading={loanActionId === row.loan_id} onClick={() => reviewLoan(row.loan_id, 'reject')}>Reject</Button></Space> },
          ]}
        />
      </Card>

      {/* Lecture Attendance & Lab Usage Log Card */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1E3A8A' }} />
            <span>My Lecture Attendance &amp; Lab Usage Logs (Log Rekod Penggunaan Makmal)</span>
            <Tag color="blue">{myUsageLogs.length}</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setIsUsageModalOpen(true)}
            style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 600 }}
          >
            Record Lecture Attendance
          </Button>
        }
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <Table
          size="small"
          rowKey="log_id"
          loading={loading}
          dataSource={myUsageLogs}
          pagination={{ pageSize: 5, simple: true }}
          locale={{ emptyText: <Empty description="No lecture attendance / lab usage sessions recorded yet" /> }}
          columns={[
            {
              title: 'Lab / Room Facility',
              key: 'facility',
              render: (_, row) => (
                <div>
                  <Text strong>{row.location_name}</Text>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{row.location_code}</div>
                </div>
              ),
            },
            {
              title: 'Course',
              key: 'course',
              render: (_, row) => (
                <div>
                  <Tag color="blue" style={{ fontWeight: 700, marginBottom: 2 }}>{row.course_id}</Tag>
                  <div style={{ fontSize: 12 }}>{row.course_name}</div>
                </div>
              ),
            },
            {
              title: 'Purpose / Lecture Notes',
              dataIndex: 'purpose',
              key: 'purpose',
            },
            {
              title: 'Lecture Time Window',
              key: 'time_window',
              render: (_, row) => (
                <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  {formatDateTime(row.start_time)} &rarr; {formatDateTime(row.end_time)}
                </span>
              ),
            },
            {
              title: 'Status',
              key: 'status',
              render: () => (
                <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 600 }}>
                  Logged
                </Tag>
              ),
            },
          ]}
        />
      </Card>

      <WeeklyTimetable
        bookings={myBookings}
        onBookSlot={(slot) => {
          setSelectedSlotForBooking(slot || null);
          setIsBookModalOpen(true);
        }}
        onRefresh={fetchLecturerData}
        lecturerName={user?.name}
      />

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

      <LabUsageModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        onLogCreated={fetchLecturerData}
      />
    </div>
  );
}
