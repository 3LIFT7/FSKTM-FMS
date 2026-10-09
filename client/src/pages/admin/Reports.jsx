import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tabs, Button, Typography, Space, Spin, Tag } from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  ToolOutlined,
  AlertOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import StatusTag from '../../components/StatusTag';

const { Text } = Typography;

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports/summary', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const roomColumns = [
    {
      title: 'Facility Room',
      dataIndex: 'name',
      key: 'name',
      render: (name, r) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>Code: {r.code}</div>
        </div>
      ),
    },
    {
      title: 'Floor',
      dataIndex: 'floor',
      key: 'floor',
    },
    {
      title: 'Total Bookings',
      dataIndex: 'booking_count',
      key: 'booking_count',
      render: (count) => <Tag color="blue">{count || 0} Sessions</Tag>,
    },
    {
      title: 'Current Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
    },
  ];

  const issueColumns = [
    {
      title: 'Facility / Hardware',
      key: 'target',
      render: (_, r) => r.location_name || r.device_name || 'Common Facility',
    },
    {
      title: 'Issue Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusTag status={s} />,
    },
  ];

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Compiling faculty analytical reports..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Reports & Facility Analytics"
        subtitle="Overview of facility utilization rates, equipment breakdown frequencies, and maintenance expenditure."
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchStats}>
            Refresh Analytics
          </Button>
        }
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Facility Utilization</span>}
              value={data?.bookings?.total_bookings || 0}
              suffix="Slots"
              prefix={<CalendarOutlined style={{ color: '#1E3A8A' }} />}
            />
            <div style={{ fontSize: 12, color: '#2563EB', marginTop: 4 }}>
              {data?.bookings?.upcoming_bookings || 0} active / upcoming
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Maintenance Expenditure</span>}
              value={parseFloat(data?.maintenance?.total_maintenance_expenditure || 0)}
              precision={2}
              prefix="MYR "
              valueStyle={{ color: '#16A34A', fontWeight: 800 }}
            />
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              Across {data?.maintenance?.total_maintenance_jobs || 0} work orders
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Rooms Under Maintenance</span>}
              value={data?.locations?.maintenance_locations || 0}
              valueStyle={{ color: '#F59E0B', fontWeight: 800 }}
              prefix={<ToolOutlined />}
            />
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
              Auto-hidden from calendar
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Open Breakdown Tickets</span>}
              value={data?.issues?.open_reports || 0}
              valueStyle={{ color: '#DC2626', fontWeight: 800 }}
              prefix={<AlertOutlined />}
            />
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
              {data?.issues?.in_progress_reports || 0} currently in progress
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabs with Detailed Breakdown Tables */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          items={[
            {
              key: 'rooms',
              label: 'High-Demand Facility Rooms',
              children: (
                <Table
                  dataSource={data?.top_rooms || []}
                  columns={roomColumns}
                  rowKey="location_id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              ),
            },
            {
              key: 'issues',
              label: 'Recent Breakdown Tickets',
              children: (
                <Table
                  dataSource={data?.recent_issues || []}
                  columns={issueColumns}
                  rowKey="report_id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
