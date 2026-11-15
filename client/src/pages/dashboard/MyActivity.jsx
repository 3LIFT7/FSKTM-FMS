import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Popconfirm, Empty, Space, Typography, Tag, Modal, Form, Rate, Input, message } from 'antd';
import {
  CalendarOutlined,
  LaptopOutlined,
  AlertOutlined,
  DeleteOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import StatusTag from '../../components/StatusTag';
import { formatDateTime } from '../../utils/date';
import PageHeader from '../../components/PageHeader';

const { Text } = Typography;
const RATING_DESC = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const ACTIVITY_PAGE_SIZE = 25;
const activityPagination = {
  pageSize: ACTIVITY_PAGE_SIZE,
  position: ['bottomRight'],
  showSizeChanger: false,
  showLessItems: true,
  hideOnSinglePage: true,
};

export default function MyActivity() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ratingLoan, setRatingLoan] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingForm] = Form.useForm();

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

  async function handleSubmitRating(values) {
    if (!ratingLoan) return;
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/device-loans/${ratingLoan.loan_id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rating: values.rating,
          review: values.review,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit rating');
      message.success('Device rating saved successfully!');
      setRatingLoan(null);
      fetchMyData();
    } catch (err) {
      message.error(err.message);
    } finally {
      setRatingSubmitting(false);
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
      title: 'Hardware Item & Accessories',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text, record) => {
        const selAcc = Array.isArray(record.selected_accessories) ? record.selected_accessories : [];
        return (
          <div>
            <Text strong>{text}</Text>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
              Serial: {record.serial_number}
            </div>
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
    {
      title: 'Category',
      dataIndex: 'device_category',
      key: 'category',
      render: (cat, record) => <Tag color="blue">{cat || record.category || 'Hardware'}</Tag>,
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
    {
      title: 'Pickup Location',
      dataIndex: 'pickup_location',
      key: 'pickup_location',
      render: (location) => location || <Text type="secondary">Provided after technician approval</Text>,
    },
    {
      title: 'Post-Return Rating',
      key: 'rating',
      render: (_, record) => {
        if (record.status !== 'returned') {
          return <Text type="secondary" style={{ fontSize: 12 }}>Available after return</Text>;
        }
        const ratingVal = record.device_rating || record.return_rating;
        return (
          <Space size="small" wrap>
            {ratingVal && (
              <Tag color="gold" style={{ margin: 0, fontWeight: 700 }}>
                <StarFilled style={{ color: '#F59E0B', marginRight: 3 }} />
                {ratingVal} / 5
              </Tag>
            )}
            <Button
              size="small"
              icon={<StarOutlined />}
              onClick={() => {
                setRatingLoan(record);
                ratingForm.setFieldsValue({
                  rating: record.device_rating || record.return_rating || 5,
                  review: record.device_review || '',
                });
              }}
              style={{ color: '#B45309', borderColor: '#FDE68A', background: '#FFFBEB', fontWeight: 600 }}
            >
              {record.device_rating ? 'Edit Rating' : 'Rate Device'}
            </Button>
          </Space>
        );
      },
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
          pagination={activityPagination}
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
          pagination={activityPagination}
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
          pagination={activityPagination}
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
        subtitle="Track your room reservations, borrowed hardware devices, post-return device ratings, and reported damage breakdown tickets."
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Rate Returned Device Modal */}
      <Modal
        open={Boolean(ratingLoan)}
        onCancel={() => setRatingLoan(null)}
        onOk={() => ratingForm.submit()}
        okText="Submit Rating"
        confirmLoading={ratingSubmitting}
        centered
        destroyOnClose
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarFilled style={{ color: '#F59E0B' }} />
            <span>Rate Returned Device — {ratingLoan?.device_name}</span>
          </div>
        }
      >
        {ratingLoan && (
          <Form form={ratingForm} layout="vertical" onFinish={handleSubmitRating} style={{ marginTop: 12 }}>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>{ratingLoan.device_name}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
                SN: {ratingLoan.serial_number} • Loan #{ratingLoan.loan_id}
              </div>
              {ratingLoan.return_condition && (
                <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                  Technician Return Condition: <strong>{ratingLoan.return_condition}</strong>
                  {ratingLoan.return_rating ? ` (${ratingLoan.return_rating}/5 ★)` : ''}
                </div>
              )}
            </div>

            <Form.Item
              name="rating"
              label="Your Rating for This Device (1–5 Stars)"
              rules={[{ required: true, message: 'Please select a star rating' }]}
            >
              <Rate tooltips={RATING_DESC} style={{ fontSize: 28 }} />
            </Form.Item>

            <Form.Item
              name="review"
              label="Feedback / Review on Device Performance (optional)"
            >
              <Input.TextArea
                rows={3}
                placeholder="Share how well the device and accessories worked during your loan..."
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
