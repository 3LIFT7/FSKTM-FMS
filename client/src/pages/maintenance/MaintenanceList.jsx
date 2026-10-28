import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Tag, Row, Col, Statistic, Space, Typography, Empty, Drawer, Descriptions, Timeline, message } from 'antd';
import {
  ToolOutlined,
  PlusOutlined,
  SearchOutlined,
  DollarOutlined,
  CalendarOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import LogMaintenanceModal from './LogMaintenanceModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { formatDate } from '../../utils/date';

const { Text, Paragraph } = Typography;

export default function MaintenanceList() {
  const { isStaff } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [viewFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const url = viewFilter === 'reminders'
        ? '/api/maintenance?upcoming_reminders=true'
        : '/api/maintenance';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
      message.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }

  const totalCost = useMemo(() => {
    return logs.reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
  }, [logs]);

  const upcomingCount = useMemo(() => {
    return logs.filter(l => l.scheduled_reminder_date).length;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.description && l.description.toLowerCase().includes(q)) ||
          (l.location_name && l.location_name.toLowerCase().includes(q)) ||
          (l.device_name && l.device_name.toLowerCase().includes(q)) ||
          (l.performed_by_name && l.performed_by_name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [logs, search]);

  const columns = [
    {
      title: 'Service Date',
      dataIndex: 'date_performed',
      key: 'date_performed',
      width: 120,
      render: (d) => formatDate(d),
    },
    {
      title: 'Location / Equipment',
      key: 'target',
      render: (_, record) => (
        <div>
          <Text strong>{record.location_name || record.device_name || 'Faculty Facility'}</Text>
          {record.device_name && record.location_name && (
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Device: {record.device_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Work Summary',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || '-',
    },
    {
      title: 'Expenditure',
      dataIndex: 'cost',
      key: 'cost',
      width: 130,
      render: (cost) => (
        <span style={{ fontWeight: 700, color: '#16A34A', fontFamily: 'monospace' }}>
          MYR {parseFloat(cost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Logged By',
      dataIndex: 'performed_by_name',
      key: 'performed_by_name',
      render: (name) => name || 'Technician Desk',
    },
    {
      title: 'Next Reminder',
      dataIndex: 'scheduled_reminder_date',
      key: 'scheduled_reminder_date',
      render: (d) => {
        if (!d) return <Text type="secondary" style={{ fontSize: 12 }}>None</Text>;
        const isUpcoming = dayjs(d).isAfter(dayjs());
        return <Tag color={isUpcoming ? 'processing' : 'warning'}>{formatDate(d)}</Tag>;
      },
    },
    {
      title: 'Linked Ticket',
      dataIndex: 'linked_report_id',
      key: 'linked_report_id',
      width: 110,
      render: (id) => (id ? <Text code>#{id}</Text> : '-'),
    },
    {
      title: 'Details',
      key: 'view',
      width: 90,
      render: (_, record) => (
        <Button size="small" type="link" onClick={() => setSelectedLogForDetails(record)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Maintenance Records & Calibration Logs"
        subtitle="Historical repair records, scheduled calibrations, servicing costs, and breakdown links."
        extra={
          isStaff && (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsLogModalOpen(true)}
                style={{ fontWeight: 600 }}
              >
                Log Maintenance
              </Button>
            </Space>
          )
        }
      />

      {/* KPI Statistic Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Total Servicing Jobs</span>}
              value={logs.length}
              prefix={<ToolOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Expenditure Incurred</span>}
              value={totalCost}
              precision={2}
              prefix="MYR "
              valueStyle={{ color: '#16A34A', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B' }}>Upcoming Check-ups</span>}
              value={upcomingCount}
              prefix={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: '#F59E0B', fontWeight: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Input
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Search maintenance logs by description, location, or technician..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} md={6}>
              <Select
                style={{ width: '100%' }}
                value={viewFilter}
                onChange={setViewFilter}
                options={[
                  { value: 'all', label: 'All Maintenance Logs' },
                  { value: 'reminders', label: 'Upcoming Check-ups Only' },
                ]}
              />
            </Col>
            <Col xs={12} md={6} style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Showing <strong>{filteredLogs.length}</strong> records
              </Text>
            </Col>
          </Row>

          <Table
            dataSource={filteredLogs}
            columns={columns}
            rowKey="log_id"
            loading={loading}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: <Empty description="No maintenance records found" /> }}
            size="small"
          />
        </div>
      </Card>

      {/* Details Drawer with Descriptions & Timeline (Section 7 Detail View) */}
      <Drawer
        title="Maintenance Job Record Details"
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 480 ? '100%' : 480}
        open={Boolean(selectedLogForDetails)}
        onClose={() => setSelectedLogForDetails(null)}
      >
        {selectedLogForDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Log ID">#{selectedLogForDetails.log_id}</Descriptions.Item>
              <Descriptions.Item label="Service Date">
                {formatDate(selectedLogForDetails.date_performed)}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {selectedLogForDetails.location_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Device / Asset">
                {selectedLogForDetails.device_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Cost Incurred">
                <Text strong style={{ color: '#16A34A' }}>
                  MYR {parseFloat(selectedLogForDetails.cost || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Technician">
                {selectedLogForDetails.performed_by_name || 'Staff'}
              </Descriptions.Item>
              <Descriptions.Item label="Linked Ticket">
                {selectedLogForDetails.linked_report_id ? (
                  <Text code>#{selectedLogForDetails.linked_report_id}</Text>
                ) : (
                  'Direct Service Work'
                )}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Work Actions & Notes:
              </Text>
              <Paragraph style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                {selectedLogForDetails.description}
              </Paragraph>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                Service Milestones:
              </Text>
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: `Servicing performed on ${formatDate(selectedLogForDetails.date_performed)}`,
                  },
                  ...(selectedLogForDetails.scheduled_reminder_date
                    ? [
                        {
                          color: 'blue',
                          children: `Next calibration check-up scheduled for ${formatDate(selectedLogForDetails.scheduled_reminder_date)}`,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>
        )}
      </Drawer>

      <LogMaintenanceModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onLogged={() => fetchLogs()}
      />
    </div>
  );
}
