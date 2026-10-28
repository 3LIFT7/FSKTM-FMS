import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Popconfirm, Empty, Space, Typography, Tag, message } from 'antd';
import {
  CalendarOutlined,
  LaptopOutlined,
  AlertOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';
import PageHeader from '../../components/PageHeader';

const { Text } = Typography;

export default function MyActivity() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyData();
  }, []);

  async function fetchMyData() {
    setLoading(true);
    try {
      const [bRes, lRes, rRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/device-loans'),
        fetch('/api/issues'),
      ]);
      const bData = await bRes.json();
      const lData = await lRes.json();
      const rData = await rRes.json();

      if (bData.success) setBookings(bData.bookings.filter(b => b.user_id === user?.user_id));
      if (lData.success) setLoans(lData.loans);
      if (rData.success) setReports(rData.reports);
    } catch (err) {
      console.error(err);
      message.error('Failed to load activity records');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(id) {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        message.success('Reservation cancelled');
        fetchMyData();
      } else {
        const data = await res.json();
        message.error(data.error || 'Failed to cancel reservation');
      }
    } catch (err) {
      message.error(err.message);
    }
  }

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
            onConfirm={() => handleCancelBooking(record.booking_id)}
            okText="Yes, Cancel"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger type="link" icon={<DeleteOutlined />}>
              Cancel
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  const loanColumns = [
    {
      title: 'Hardware Item',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
            Serial: {record.serial_number}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat || 'Hardware'}</Tag>,
    },
    {
      title: 'Return Deadline',
      dataIndex: 'expected_return_time',
      key: 'expected_return_time',
      render: (time, record) => (
        <Space orientation="vertical" size={2}>
          <span>{formatDateTime(time)}</span>
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

  const reportColumns = [
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
    },
    {
      title: 'Reported Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d) => formatDateTime(d),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
  ];

  const tabItems = [
    {
      key: 'bookings',
      label: (
        <span>
          <CalendarOutlined style={{ marginRight: 6 }} />
          Room Reservations ({bookings.length})
        </span>
      ),
      children: (
        <Table
          dataSource={bookings}
          columns={bookingColumns}
          rowKey="booking_id"
          loading={loading}
          pagination={{ pageSize: 6 }}
          size="small"
          locale={{ emptyText: <Empty description="No room reservations found" /> }}
        />
      ),
    },
    {
      key: 'loans',
      label: (
        <span>
          <LaptopOutlined style={{ marginRight: 6 }} />
          Device Loans ({loans.length})
        </span>
      ),
      children: (
        <Table
          dataSource={loans}
          columns={loanColumns}
          rowKey="loan_id"
          loading={loading}
          pagination={{ pageSize: 6 }}
          size="small"
          locale={{ emptyText: <Empty description="No hardware loans found" /> }}
        />
      ),
    },
    {
      key: 'reports',
      label: (
        <span>
          <AlertOutlined style={{ marginRight: 6 }} />
          Damage Reports ({reports.length})
        </span>
      ),
      children: (
        <Table
          dataSource={reports}
          columns={reportColumns}
          rowKey="report_id"
          loading={loading}
          pagination={{ pageSize: 6 }}
          size="small"
          locale={{ emptyText: <Empty description="No damage reports submitted" /> }}
        />
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="My Activity & Bookings"
        subtitle="Track your room reservations, borrowed hardware devices, and reported damage breakdown tickets."
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
