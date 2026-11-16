import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Image, Space, Typography, Row, Col, Empty, message, Modal, Form } from 'antd';
import {
  AlertOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import NewIssueModal from './NewIssueModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/date';

const { Text } = Typography;

export default function IssueList() {
  const { user, isStaff } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [actionForm] = Form.useForm();

  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    setLoading(true);
    try {
      const res = await fetch('/api/issues');
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch (err) {
      console.error('Error fetching issues:', err);
      message.error('Failed to load breakdown tickets');
    } finally {
      setLoading(false);
    }
  }

  function openStaffAction(report) {
    setActiveReport(report);
    actionForm.setFieldsValue({
      status: report.status || 'open',
      issue_reason: report.issue_reason || '',
      resolution_notes: report.resolution_notes || '',
    });
  }

  async function saveStaffAction(values) {
    const reportId = activeReport.report_id;
    setUpdatingId(reportId);
    try {
      const res = await fetch(`/api/issues/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success(`Ticket #${reportId} staff action saved`);
      setActiveReport(null);
      fetchIssues();
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            (r.description && r.description.toLowerCase().includes(q)) ||
            (r.location_name && r.location_name.toLowerCase().includes(q)) ||
            (r.device_name && r.device_name.toLowerCase().includes(q)) ||
            (r.reporter_name && r.reporter_name.toLowerCase().includes(q)) ||
            (r.reporter_matric_number && r.reporter_matric_number.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [reports, statusFilter, search]);

  const columns = [
    {
      title: 'Ticket ID',
      dataIndex: 'report_id',
      key: 'report_id',
      width: 90,
      render: (id) => <Text code>#{id}</Text>,
    },
    {
      title: 'Location / Item',
      key: 'location',
      render: (_, record) => (
        <div>
          <Text strong>{record.location_name || record.device_name || 'Faculty Common Area'}</Text>
          {record.device_name && record.location_name && (
            <div style={{ fontSize: 11, color: '#64748B' }}>
              Device: {record.device_name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Issue Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || '-',
    },
    {
      title: 'Photo Evidence',
      dataIndex: 'photo_url',
      key: 'photo_url',
      width: 110,
      render: (url) => {
        if (!url) return <Text type="secondary" style={{ fontSize: 12 }}>None</Text>;
        return (
          <Image
            src={url}
            alt="Evidence"
            width={48}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 6 }}
          />
        );
      },
    },
    {
      title: 'Reported By & Date',
      key: 'reporter',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      defaultSortOrder: 'descend',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{record.reporter_name || 'Anonymous'}</div>
          {record.reporter_matric_number && (
            <div style={{ fontSize: 11, color: '#475569' }}>
              Matric No.: {record.reporter_matric_number}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {formatDateTime(record.created_at)}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => <StatusTag status={status} />,
    },
    ...(isStaff
      ? [
          {
            title: 'Staff Action',
            key: 'action',
            width: 160,
            render: (_, record) => (
              <Button size="small" onClick={() => openStaffAction(record)}>Update</Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Damage & Breakdown Reporte"
        subtitle={
          isStaff
            ? 'Operational queue for campus maintenance technicians to manage and resolve reported damages.'
            : 'Report facility damages, broken laboratory computers, projectors, and track resolution.'
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchIssues}>
              Refresh
            </Button>
            <Button
              type="primary"
              danger
              icon={<PlusOutlined />}
              onClick={() => setIsNewModalOpen(true)}
              style={{ fontWeight: 600 }}
            >
              Report Breakdown
            </Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Input
                prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                placeholder="Search tickets by description, location, or reporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} md={6}>
              <Select
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'cannot_be_resolved', label: 'Cannot Be Resolved' },
                  { value: 'requires_further_action', label: 'Requires Further Action' },
                ]}
              />
            </Col>
            <Col xs={12} md={6} style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Showing <strong>{filteredReports.length}</strong> tickets
              </Text>
            </Col>
          </Row>

          <Table
            dataSource={filteredReports}
            columns={columns}
            rowKey="report_id"
            loading={loading}
            pagination={{ pageSize: 8 }}
            locale={{ emptyText: <Empty description="No breakdown tickets found" /> }}
            size="small"
          />
        </div>
      </Card>

      <NewIssueModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={() => fetchIssues()}
      />

      <Modal
        title={activeReport ? `Staff Action · Ticket #${activeReport.report_id}` : 'Staff Action'}
        open={Boolean(activeReport)}
        onCancel={() => setActiveReport(null)}
        onOk={() => actionForm.submit()}
        confirmLoading={Boolean(activeReport && updatingId === activeReport.report_id)}
        okText="Save Action"
        destroyOnClose
      >
        <Form form={actionForm} layout="vertical" onFinish={saveStaffAction}>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'cannot_be_resolved', label: 'Cannot Be Resolved' },
              { value: 'requires_further_action', label: 'Requires Further Action' },
            ]} />
          </Form.Item>
          <Form.Item name="issue_reason" label="Reason for the Issue">
            <Input.TextArea rows={3} placeholder="Describe the cause or reason for the issue" />
          </Form.Item>
          <Form.Item name="resolution_notes" label="How It Was Resolved / Next Steps">
            <Input.TextArea rows={4} placeholder="Record the resolution or action required" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
