import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tabs,
  Button,
  Typography,
  Space,
  Spin,
  Tag,
  Input,
  Select,
  Badge,
  Tooltip,
  Empty,
  Progress,
  Divider,
} from 'antd';
import {
  CalendarOutlined,
  LaptopOutlined,
  AlertOutlined,
  FireOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  AppstoreOutlined,
  UserOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  BarChartOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import StatusTag from '../../components/StatusTag';
import { formatDateTime, formatDate, formatTime } from '../../utils/date';

const { Text, Title, Paragraph } = Typography;

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [roomBookings, setRoomBookings] = useState([]);
  const [deviceLoans, setDeviceLoans] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState('rooms');

  // Search and Filter States
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState('all');

  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('all');

  const [issueSearch, setIssueSearch] = useState('');
  const [issueStatusFilter, setIssueStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllReportsData();
  }, []);

  async function fetchAllReportsData() {
    setLoading(true);
    try {
      const [summaryRes, bookingsRes, loansRes, issuesRes] = await Promise.all([
        fetch('/api/admin/reports/summary', { credentials: 'include' }).then(r => r.json()).catch(() => ({ stats: {} })),
        fetch('/api/bookings?include_maintenance=true', { credentials: 'include' }).then(r => r.json()).catch(() => ({ bookings: [] })),
        fetch('/api/device-loans', { credentials: 'include' }).then(r => r.json()).catch(() => ({ loans: [] })),
        fetch('/api/issues', { credentials: 'include' }).then(r => r.json()).catch(() => ({ reports: [] })),
      ]);

      if (summaryRes.success) setStats(summaryRes.stats);
      if (bookingsRes.success) setRoomBookings(bookingsRes.bookings || []);
      if (loansRes.success) setDeviceLoans(loansRes.loans || []);
      if (issuesRes.success) setIssueReports(issuesRes.reports || []);
    } catch (err) {
      console.error('Error fetching comprehensive report data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered Room Bookings
  const filteredRoomBookings = useMemo(() => {
    return roomBookings.filter(b => {
      const matchSearch =
        !roomSearch ||
        (b.location_name || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.location_code || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.user_name || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.user_email || '').toLowerCase().includes(roomSearch.toLowerCase()) ||
        (b.purpose || '').toLowerCase().includes(roomSearch.toLowerCase());

      const matchStatus = roomStatusFilter === 'all' || (b.status || '').toLowerCase() === roomStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [roomBookings, roomSearch, roomStatusFilter]);

  // Filtered Device Loans
  const filteredDeviceLoans = useMemo(() => {
    return deviceLoans.filter(l => {
      const matchSearch =
        !loanSearch ||
        (l.device_name || '').toLowerCase().includes(loanSearch.toLowerCase()) ||
        (l.serial_number || '').toLowerCase().includes(loanSearch.toLowerCase()) ||
        (l.device_category || '').toLowerCase().includes(loanSearch.toLowerCase()) ||
        (l.borrower_name || '').toLowerCase().includes(loanSearch.toLowerCase()) ||
        (l.borrower_email || '').toLowerCase().includes(loanSearch.toLowerCase()) ||
        (l.purpose || '').toLowerCase().includes(loanSearch.toLowerCase());

      const matchStatus = loanStatusFilter === 'all' || (l.status || '').toLowerCase() === loanStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [deviceLoans, loanSearch, loanStatusFilter]);

  // Filtered Damage / Breakdown Reports
  const filteredIssueReports = useMemo(() => {
    return issueReports.filter(i => {
      const matchSearch =
        !issueSearch ||
        (i.description || '').toLowerCase().includes(issueSearch.toLowerCase()) ||
        (i.location_name || '').toLowerCase().includes(issueSearch.toLowerCase()) ||
        (i.device_name || '').toLowerCase().includes(issueSearch.toLowerCase()) ||
        (i.reporter_name || '').toLowerCase().includes(issueSearch.toLowerCase()) ||
        (i.reporter_email || '').toLowerCase().includes(issueSearch.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(issueSearch.toLowerCase());

      const matchStatus = issueStatusFilter === 'all' || (i.status || '').toLowerCase() === issueStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [issueReports, issueSearch, issueStatusFilter]);

  // Export current table to CSV
  function exportCSV() {
    let headers = [];
    let rows = [];
    let filename = 'report.csv';

    if (activeTab === 'rooms') {
      filename = 'room_reservation_requests.csv';
      headers = ['Booking ID', 'Facility Room', 'Floor', 'Requester', 'Email', 'Role', 'Start Time', 'End Time', 'Purpose', 'Status'];
      rows = filteredRoomBookings.map(b => [
        b.booking_id,
        b.location_name,
        b.location_floor,
        b.user_name,
        b.user_email,
        b.user_role,
        b.start_time,
        b.end_time,
        `"${(b.purpose || '').replace(/"/g, '""')}"`,
        b.status,
      ]);
    } else if (activeTab === 'loans') {
      filename = 'equipment_loan_requests.csv';
      headers = ['Loan ID', 'Equipment Name', 'Category', 'Serial Number', 'Borrower', 'Email', 'Checkout Time', 'Expected Return', 'Actual Return', 'Purpose', 'Status'];
      rows = filteredDeviceLoans.map(l => [
        l.loan_id,
        l.device_name,
        l.device_category,
        l.serial_number,
        l.borrower_name,
        l.borrower_email,
        l.checkout_time || '-',
        l.expected_return_time,
        l.actual_return_time || '-',
        `"${(l.purpose || '').replace(/"/g, '""')}"`,
        l.status,
      ]);
    } else if (activeTab === 'issues') {
      filename = 'damage_breakdown_reports.csv';
      headers = ['Report ID', 'Facility/Hardware', 'Category', 'Description', 'Reported By', 'Email', 'Date Reported', 'Status'];
      rows = filteredIssueReports.map(i => [
        i.report_id,
        i.location_name || i.device_name || 'General Facility',
        i.category || 'General',
        `"${(i.description || '').replace(/"/g, '""')}"`,
        i.reporter_name,
        i.reporter_email,
        i.created_at,
        i.status,
      ]);
    } else {
      filename = 'most_common_equipment.csv';
      headers = ['Device ID', 'Equipment Name', 'Category', 'Serial Number', 'Total Loans', 'Current Status'];
      rows = (stats?.top_equipment || []).map(d => [
        d.device_id,
        d.name,
        d.category,
        d.serial_number,
        d.loan_count || 0,
        d.status,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Table Columns: Room Reservation Requests
  const roomBookingColumns = [
    {
      title: 'Booking ID',
      dataIndex: 'booking_id',
      key: 'booking_id',
      width: 100,
      render: (id, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#1E3A8A' }}>#{id}</span>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(r.created_at)}</div>
        </div>
      ),
    },
    {
      title: 'Facility Room',
      key: 'room',
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#0F172A' }}>{r.location_name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {r.location_code} • {r.location_floor?.startsWith('Blok') ? r.location_floor : `Floor ${r.location_floor}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Requester',
      key: 'requester',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.user_name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>{r.user_email}</div>
          <Tag color="cyan" style={{ fontSize: 10, marginTop: 2 }}>{r.user_role?.toUpperCase() || 'USER'}</Tag>
        </div>
      ),
    },
    {
      title: 'Schedule Time Window',
      key: 'time_window',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#334155', fontSize: 12 }}>
            <CalendarOutlined style={{ marginRight: 4, color: '#2563EB' }} />
            {formatDate(r.start_time)}
          </div>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {formatTime(r.start_time)} &rarr; {formatTime(r.end_time)}
          </div>
          {r.is_recurring && (
            <Tag color="purple" style={{ fontSize: 10, marginTop: 2 }}>
              Recurring Series
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Purpose / Note',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (text, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{text}</Text>
          {r.course_id && (
            <div style={{ fontSize: 10, color: '#2563EB', fontWeight: 600 }}>Course: {r.course_id}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Request Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s) => <StatusTag status={s} />,
    },
  ];

  // Table Columns: Equipment Loan Requests
  const deviceLoanColumns = [
    {
      title: 'Loan Ref',
      dataIndex: 'loan_id',
      key: 'loan_id',
      width: 90,
      render: (id, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0369A1' }}>#{id}</span>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(r.created_at)}</div>
        </div>
      ),
    },
    {
      title: 'Equipment Item',
      key: 'device',
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#0F172A' }}>{r.device_name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            SN: <span style={{ fontFamily: 'monospace' }}>{r.serial_number}</span>
          </div>
          <Tag color="geekblue" style={{ fontSize: 10, marginTop: 2 }}>
            {r.device_category || 'Hardware'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Borrower',
      key: 'borrower',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.borrower_name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>{r.borrower_email}</div>
          {r.matric_or_staff_id && (
            <div style={{ fontSize: 10, color: '#64748B' }}>ID: {r.matric_or_staff_id}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Checkout & Return Window',
      key: 'dates',
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 11, color: '#334155' }}>
            <strong>Checkout:</strong> {r.checkout_time ? formatDateTime(r.checkout_time) : 'Pending pickup'}
          </div>
          <div style={{ fontSize: 11, color: r.is_overdue ? '#DC2626' : '#64748B' }}>
            <strong>Due:</strong> {formatDateTime(r.expected_return_time)}
          </div>
          {r.actual_return_time && (
            <div style={{ fontSize: 11, color: '#16A34A' }}>
              <strong>Returned:</strong> {formatDateTime(r.actual_return_time)}
            </div>
          )}
          {r.is_overdue && <Tag color="error" style={{ fontSize: 10, marginTop: 2 }}>OVERDUE</Tag>}
        </div>
      ),
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (p) => <span style={{ fontSize: 12 }}>{p || 'Academic & Lab Assignment'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s) => <StatusTag status={s} />,
    },
  ];

  // Table Columns: Damage & Breakdown Reports
  const issueReportColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'report_id',
      key: 'report_id',
      width: 90,
      render: (id, r) => (
        <div>
          <span style={{ fontWeight: 700, color: '#DC2626' }}>#{id}</span>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{formatDate(r.created_at)}</div>
        </div>
      ),
    },
    {
      title: 'Target Facility / Equipment',
      key: 'target',
      render: (_, r) => (
        <div>
          <Text strong style={{ color: '#0F172A' }}>
            {r.location_name || r.device_name || 'General Facility'}
          </Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {r.location_code ? `${r.location_code} (${r.location_floor})` : r.device_serial ? `SN: ${r.device_serial}` : 'Campus Infrastructure'}
          </div>
          <Tag color="volcano" style={{ fontSize: 10, marginTop: 2 }}>
            {r.category || 'Maintenance Issue'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Reported Issue Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ margin: 0, fontSize: 12 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: 'Reported By',
      key: 'reporter',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.reporter_name || 'Anonymous / QR'}</Text>
          {r.reporter_email && <div style={{ fontSize: 11, color: '#64748B' }}>{r.reporter_email}</div>}
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{formatDateTime(r.created_at)}</div>
        </div>
      ),
    },
    {
      title: 'Resolution Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s) => <StatusTag status={s} />,
    },
  ];

  // Table Columns: Most Common Equipment (Descriptions & Insights)
  const topEquipmentColumns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: index === 0 ? '#FEF08A' : index === 1 ? '#E2E8F0' : index === 2 ? '#FED7AA' : '#F1F5F9',
            color: index === 0 ? '#854D0E' : '#334155',
            fontWeight: 800,
            fontSize: 11,
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Equipment Name & Description',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 13, color: '#1E293B' }}>{r.name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            Serial Number: <span style={{ fontFamily: 'monospace' }}>{r.serial_number}</span>
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            High-utility equipment assigned for student and faculty research.
          </div>
        </div>
      ),
    },
    {
      title: 'Hardware Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat || 'Hardware'}</Tag>,
    },
    {
      title: 'Total Borrowed Requests',
      dataIndex: 'loan_count',
      key: 'loan_count',
      render: (count) => (
        <Space direction="vertical" size={2}>
          <Tag color="orange" style={{ fontWeight: 700, fontSize: 12 }}>
            <FireOutlined style={{ marginRight: 4 }} />
            {count || 0} Loans
          </Tag>
          <span style={{ fontSize: 10, color: '#64748B' }}>
            {count > 3 ? 'High Student Demand' : 'Standard Utilization'}
          </span>
        </Space>
      ),
    },
    {
      title: 'Current Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
    },
  ];

  // Most Common Equipment item for headline card
  const mostCommonEquipment = stats?.top_equipment?.[0] || null;

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Compiling comprehensive faculty requests & analytics..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Requests Records & Facility Analytics"
        subtitle="Centralized management record of all room reservation requests, equipment borrowing, damage reports, and hardware demand descriptions."
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={exportCSV}>
              Export CSV
            </Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchAllReportsData}>
              Refresh Records
            </Button>
          </Space>
        }
      />

      {/* 4 Summary KPI Cards */}
      <Row gutter={[16, 16]}>
        {/* 1. Room Reservation Requests */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', fontSize: 12 }}>Room Reservation Requests</span>}
              value={stats?.bookings?.total_bookings || roomBookings.length}
              suffix="Requests"
              prefix={<CalendarOutlined style={{ color: '#1E3A8A' }} />}
              valueStyle={{ color: '#1E3A8A', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>{stats?.bookings?.pending_bookings || 0} Pending</Tag>
              <Tag color="success" style={{ margin: 0, fontSize: 10 }}>{stats?.bookings?.approved_bookings || 0} Approved</Tag>
            </div>
          </Card>
        </Col>

        {/* 2. Equipment Loan Requests */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', fontSize: 12 }}>Equipment Loan Requests</span>}
              value={stats?.device_loans?.total_loans || deviceLoans.length}
              suffix="Loans"
              prefix={<LaptopOutlined style={{ color: '#0284C7' }} />}
              valueStyle={{ color: '#0284C7', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color="processing" style={{ margin: 0, fontSize: 10 }}>{stats?.devices?.checked_out_devices || 0} Borrowed</Tag>
              <Tag color="success" style={{ margin: 0, fontSize: 10 }}>{stats?.devices?.available_devices || 0} In Stock</Tag>
            </div>
          </Card>
        </Col>

        {/* 3. Damage & Breakdown Reports */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', fontSize: 12 }}>Damage & Breakdown Reports</span>}
              value={stats?.issues?.total_reports || issueReports.length}
              suffix="Reports"
              prefix={<AlertOutlined style={{ color: '#DC2626' }} />}
              valueStyle={{ color: '#DC2626', fontWeight: 800, fontSize: 24 }}
            />
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color="error" style={{ margin: 0, fontSize: 10 }}>{stats?.issues?.open_reports || 0} Open</Tag>
              <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>{stats?.issues?.in_progress_reports || 0} In Progress</Tag>
            </div>
          </Card>
        </Col>

        {/* 4. Most Common Equipment Headline */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}>
            <Statistic
              title={<span style={{ fontWeight: 700, color: '#64748B', fontSize: 12 }}>Most Common Equipment</span>}
              value={mostCommonEquipment?.name || 'VR Headset Kit'}
              prefix={<TrophyOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: '#D97706', fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            />
            <div style={{ fontSize: 11, color: '#92400E', marginTop: 6 }}>
              <strong>{mostCommonEquipment?.loan_count || 0} requests</strong> • {mostCommonEquipment?.category || 'Specialized Hardware'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Analytical Descriptions Grid: Most Common Equipment & High-Demand Facilities */}
      <Row gutter={[16, 16]}>
        {/* Most Common Equipment Summary Description */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#EA580C' }} />
                <span style={{ fontWeight: 700 }}>Most Common & Demanded Equipment</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
          >
            <Paragraph style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Ranking of faculty lab hardware and portable equipment requested most frequently by students and lecturers:
            </Paragraph>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stats?.top_equipment || []).slice(0, 4).map((item, idx) => (
                <div
                  key={item.device_id || idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: idx === 0 ? '#FEF08A' : idx === 1 ? '#E2E8F0' : '#F1F5F9',
                        color: idx === 0 ? '#854D0E' : '#475569',
                        fontWeight: 800,
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <Text strong style={{ fontSize: 12, color: '#1E293B' }}>{item.name}</Text>
                      <div style={{ fontSize: 10, color: '#64748B' }}>
                        {item.category} • SN: {item.serial_number}
                      </div>
                    </div>
                  </div>
                  <Tag color="orange" style={{ fontWeight: 700, margin: 0 }}>
                    {item.loan_count || 0} loans
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Most Utilized Facility Rooms & Frequent Breakdown Hotspots */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CompassOutlined style={{ color: '#1E3A8A' }} />
                <span style={{ fontWeight: 700 }}>High-Demand Facility Rooms & Breakdown Hotspots</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: '100%' }}
          >
            <Paragraph style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Top facilities with highest booking demand and recurring maintenance breakdown patterns:
            </Paragraph>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stats?.top_facilities || []).slice(0, 4).map((room, idx) => (
                <div
                  key={room.location_id || idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <Text strong style={{ fontSize: 12, color: '#0369A1' }}>{room.name}</Text>
                    <div style={{ fontSize: 10, color: '#0284C7' }}>
                      {room.code} • {room.floor?.startsWith('Blok') ? room.floor : `Floor ${room.floor}`} • {room.capacity} seats
                    </div>
                  </div>
                  <Tag color="blue" style={{ fontWeight: 700, margin: 0 }}>
                    {room.booking_count || 0} bookings
                  </Tag>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Request Record Log Section with Tabs */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            // Tab 1: Room Reservation Requests
            {
              key: 'rooms',
              label: (
                <Space>
                  <CalendarOutlined />
                  <span>Room Reservations</span>
                  <Badge count={filteredRoomBookings.length} overflowCount={999} style={{ backgroundColor: '#2563EB' }} />
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Filters Bar */}
                  <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={12}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="Search room requests by room name, code, purpose, or requester..."
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Select
                        value={roomStatusFilter}
                        onChange={setRoomStatusFilter}
                        style={{ width: 170 }}
                        options={[
                          { value: 'all', label: 'All Statuses' },
                          { value: 'approved', label: 'Approved Only' },
                          { value: 'pending', label: 'Pending Only' },
                          { value: 'rejected', label: 'Rejected Only' },
                          { value: 'cancelled', label: 'Cancelled Only' },
                        ]}
                      />
                    </Col>
                  </Row>

                  {/* Room Bookings Table */}
                  <Table
                    dataSource={filteredRoomBookings}
                    columns={roomBookingColumns}
                    rowKey="booking_id"
                    pagination={{ pageSize: 8, showTotal: (t) => `Total ${t} room reservation requests` }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No room reservation requests found matching criteria" /> }}
                  />
                </div>
              ),
            },

            // Tab 2: Equipment Loan Requests
            {
              key: 'loans',
              label: (
                <Space>
                  <LaptopOutlined />
                  <span>Equipment Requests</span>
                  <Badge count={filteredDeviceLoans.length} overflowCount={999} style={{ backgroundColor: '#0284C7' }} />
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Filters Bar */}
                  <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={12}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="Search equipment requests by hardware name, serial number, borrower, or category..."
                        value={loanSearch}
                        onChange={(e) => setLoanSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Select
                        value={loanStatusFilter}
                        onChange={setLoanStatusFilter}
                        style={{ width: 170 }}
                        options={[
                          { value: 'all', label: 'All Statuses' },
                          { value: 'checked_out', label: 'Checked Out' },
                          { value: 'pending', label: 'Pending Approval' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'returned', label: 'Returned' },
                          { value: 'rejected', label: 'Rejected' },
                        ]}
                      />
                    </Col>
                  </Row>

                  {/* Device Loans Table */}
                  <Table
                    dataSource={filteredDeviceLoans}
                    columns={deviceLoanColumns}
                    rowKey="loan_id"
                    pagination={{ pageSize: 8, showTotal: (t) => `Total ${t} equipment loan requests` }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No equipment loan requests found matching criteria" /> }}
                  />
                </div>
              ),
            },

            // Tab 3: Damage & Breakdown Reports
            {
              key: 'issues',
              label: (
                <Space>
                  <AlertOutlined />
                  <span>Damage Reports</span>
                  <Badge count={filteredIssueReports.length} overflowCount={999} style={{ backgroundColor: '#DC2626' }} />
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Filters Bar */}
                  <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={12}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="Search breakdown tickets by facility, hardware, description, or reporter..."
                        value={issueSearch}
                        onChange={(e) => setIssueSearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={12} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Select
                        value={issueStatusFilter}
                        onChange={setIssueStatusFilter}
                        style={{ width: 170 }}
                        options={[
                          { value: 'all', label: 'All Statuses' },
                          { value: 'open', label: 'Open Tickets' },
                          { value: 'in_progress', label: 'In Progress' },
                          { value: 'resolved', label: 'Resolved' },
                          { value: 'closed', label: 'Closed' },
                        ]}
                      />
                    </Col>
                  </Row>

                  {/* Issue Reports Table */}
                  <Table
                    dataSource={filteredIssueReports}
                    columns={issueReportColumns}
                    rowKey="report_id"
                    pagination={{ pageSize: 8, showTotal: (t) => `Total ${t} damage reports` }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No damage or breakdown reports found matching criteria" /> }}
                  />
                </div>
              ),
            },

            // Tab 4: Most Common Equipment Descriptions & Demand Analytics
            {
              key: 'equipment_analytics',
              label: (
                <Space>
                  <TrophyOutlined />
                  <span>Most Common Equipment & Descriptions</span>
                </Space>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px' }}>
                    <Title level={5} style={{ margin: '0 0 6px 0', color: '#92400E' }}>
                      <FireOutlined style={{ marginRight: 6 }} /> Equipment Demand & Hardware Catalog Descriptions
                    </Title>
                    <Paragraph style={{ margin: 0, fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
                      Comprehensive breakdown of faculty hardware inventory and loan request frequency. Equipment items with highest loan volumes are prioritized for regular calibration and maintenance inspections.
                    </Paragraph>
                  </div>

                  {/* Top Equipment Ranking Table */}
                  <Table
                    dataSource={stats?.top_equipment || []}
                    columns={topEquipmentColumns}
                    rowKey="device_id"
                    pagination={{ pageSize: 6 }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No equipment records compiled yet" /> }}
                  />

                  {/* Frequent Breakdown Hotspots Table */}
                  <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                    Recurring Breakdown Hotspots
                  </Divider>

                  <Row gutter={[16, 16]}>
                    {(stats?.frequent_breakdowns || []).map((fb, idx) => (
                      <Col xs={24} sm={12} lg={6} key={idx}>
                        <Card size="small" style={{ borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#991B1B' }}>
                              {fb.facility_name}
                            </span>
                            <Tag color="red">{fb.report_count} Reports</Tag>
                          </div>
                          <div style={{ fontSize: 11, color: '#7F1D1D', marginTop: 4 }}>
                            Hardware: {fb.device_name}
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
