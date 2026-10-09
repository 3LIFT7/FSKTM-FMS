import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Button, Popconfirm, Empty, Spin, Space, Typography, Tag, message } from 'antd';
import {
  CalendarOutlined,
  LaptopOutlined,
  AlertOutlined,
  CompassOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';

const { Title, Text, Paragraph } = Typography;

export default function StudentDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  async function fetchStudentData() {
    setLoading(true);
    try {
      const [bookRes, loanRes, repRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/device-loans'),
        fetch('/api/issues'),
      ]);
      const bookData = await bookRes.json();
      const loanData = await loanRes.json();
      const repData = await repRes.json();

      if (bookData.success) {
        setMyBookings(bookData.bookings.filter(b => b.user_id === user?.user_id));
      }
      if (loanData.success) {
        setMyLoans(loanData.loans);
      }
      if (repData.success) {
        setMyReports(repData.reports);
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id) {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        message.success('Booking cancelled successfully');
        fetchStudentData();
      } else {
        const data = await res.json();
        message.error(data.error || 'Failed to cancel booking');
      }
    } catch (err) {
      message.error(err.message);
    }
  }

  const activeBookingsCount = myBookings.filter(b => b.status === 'approved' || b.status === 'pending').length;
  const activeLoansCount = myLoans.filter(l => l.status === 'approved' || l.status === 'checked_out').length;
  const openReportsCount = myReports.filter(r => r.status === 'open' || r.status === 'in_progress').length;

  const bookingColumns = [
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
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
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
        if (record.status === 'rejected' || record.status === 'cancelled') return null;
        return (
          <Popconfirm
            title="Cancel Reservation"
            description="Are you sure you want to cancel this booking?"
            onConfirm={() => cancelBooking(record.booking_id)}
            okText="Yes, Cancel"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger type="link">
              Cancel
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  const loanColumns = [
    {
      title: 'Device',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
            SN: {record.serial_number}
          </div>
        </div>
      ),
    },
    {
      title: 'Return Deadline',
      dataIndex: 'expected_return_time',
      key: 'expected_return_time',
      render: (time, record) => (
        <Space orientation="vertical" size={2}>
          <span style={{ fontSize: 12 }}>{formatDateTime(time)}</span>
          {record.is_overdue && <Tag color="error">Overdue</Tag>}
        </Space>
      ),
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
      {/* Welcome Banner Card */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #172554 100%)',
          borderRadius: 16,
          border: 'none',
          boxShadow: '0 10px 25px rgba(30, 58, 138, 0.15)',
        }}
        bodyStyle={{ padding: 'clamp(16px, 3vw, 24px)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-block', marginBottom: 6 }}>
              <Tag color="blue" style={{ borderRadius: 12, fontWeight: 700, padding: '2px 10px', fontSize: 11 }}>
                FSKTM Undergraduate Student
              </Tag>
            </div>
            <Title level={2} style={{ color: '#FFFFFF', margin: 0, fontWeight: 800, fontSize: 'clamp(18px, 4vw, 26px)', lineHeight: 1.25 }}>
              Welcome back, {user?.name}!
            </Title>
            <Paragraph style={{ color: '#BFDBFE', margin: '4px 0 0 0', fontSize: 12 }}>
              Matriculation ID: <strong style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{user?.matric_or_staff_id}</strong>
            </Paragraph>
          </div>

          <Space wrap size="small">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsBookModalOpen(true)}
              style={{ background: '#2563EB', borderColor: '#2563EB', fontWeight: 700 }}
            >
              Request Booking
            </Button>
            <Link to="/devices">
              <Button icon={<LaptopOutlined />} style={{ fontWeight: 600 }}>
                Borrow Devices
              </Button>
            </Link>
            <Link to="/map">
              <Button icon={<CompassOutlined />} style={{ fontWeight: 600 }}>
                Floor Map
              </Button>
            </Link>
          </Space>
        </div>
      </Card>

      {/* KPI Statistics - 3 Columns on both phones and tablets */}
      <Row gutter={[12, 12]}>
        <Col xs={8} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Reservations</span>}
              value={activeBookingsCount}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<CalendarOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={8} sm={8}>
          <Link to="/devices">
            <Card hoverable bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
              <Statistic
                title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Hardware</span>}
                value={activeLoansCount}
                valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
                prefix={<LaptopOutlined style={{ color: '#16A34A' }} />}
              />
            </Card>
          </Link>
        </Col>
        <Col xs={8} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 'clamp(10px, 2.2vw, 13px)', lineHeight: 1.2, display: 'block' }}>Tickets</span>}
              value={openReportsCount}
              valueStyle={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800 }}
              prefix={<AlertOutlined style={{ color: '#F59E0B' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Two Column Layout: Reservations & Equipment Loans */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <CalendarOutlined style={{ color: '#1E3A8A' }} />
                <span>My Active Reservations</span>
              </Space>
            }
            extra={<Link to="/my-activity">View All &rarr;</Link>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Table
              dataSource={myBookings}
              columns={bookingColumns}
              rowKey="booking_id"
              loading={loading}
              pagination={{ pageSize: 4, simple: true }}
              locale={{ emptyText: <Empty description="No room reservations scheduled" /> }}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <LaptopOutlined style={{ color: '#16A34A' }} />
                <span>Equipment Loan Status</span>
              </Space>
            }
            extra={<Link to="/devices">Browse Hardware &rarr;</Link>}
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <Table
              dataSource={myLoans}
              columns={loanColumns}
              rowKey="loan_id"
              loading={loading}
              pagination={{ pageSize: 4, simple: true }}
              locale={{ emptyText: <Empty description="No hardware loans on record" /> }}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchStudentData()}
      />
    </div>
  );
}
