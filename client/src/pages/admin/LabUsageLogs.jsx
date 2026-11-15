import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Input,
  Select,
  Empty,
  Popconfirm,
  message,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/PageHeader';
import LabUsageModal from '../booking/LabUsageModal';
import { formatDateTime } from '../../utils/date';

const { Text } = Typography;

export default function LabUsageLogs() {
  const [logs, setLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedLocationId, setSelectedLocationId] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [logsRes, locRes] = await Promise.all([
        fetch('/api/lab-usage', { credentials: 'include' }),
        fetch('/api/locations', { credentials: 'include' }),
      ]);
      const [logsData, locData] = await Promise.all([logsRes.json(), locRes.json()]);
      if (logsData.success) setLogs(logsData.logs || []);
      if (locData.success) setLocations(locData.locations || []);
    } catch (err) {
      console.error('Error loading lab usage logs:', err);
      message.error('Failed to load lab usage records');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(logId) {
    setDeletingId(logId);
    try {
      const res = await fetch(`/api/lab-usage/${logId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');
      message.success('Record removed');
      setLogs((prev) => prev.filter((item) => item.log_id !== logId));
    } catch (err) {
      message.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const floorOptions = useMemo(() => {
    const uniqueFloors = Array.from(new Set(locations.map((l) => l.floor).filter(Boolean)));
    return ['All', ...uniqueFloors];
  }, [locations]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (selectedFloor !== 'All' && item.location_floor !== selectedFloor) return false;
      if (selectedLocationId !== 'All' && String(item.location_id) !== String(selectedLocationId)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (item.location_name || '').toLowerCase().includes(q) ||
          (item.location_code || '').toLowerCase().includes(q) ||
          (item.user_name || '').toLowerCase().includes(q) ||
          (item.user_email || '').toLowerCase().includes(q) ||
          (item.matric_or_staff_id || '').toLowerCase().includes(q) ||
          (item.course_id || '').toLowerCase().includes(q) ||
          (item.course_name || '').toLowerCase().includes(q) ||
          (item.purpose || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [logs, selectedFloor, selectedLocationId, searchQuery]);

  const todayCount = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    return logs.filter((l) => dayjs(l.start_time).format('YYYY-MM-DD') === todayStr).length;
  }, [logs]);

  const uniqueLabsCount = useMemo(() => {
    return new Set(logs.map((l) => l.location_id)).size;
  }, [logs]);

  const uniqueCoursesCount = useMemo(() => {
    return new Set(logs.map((l) => (l.course_id || '').toUpperCase()).filter(Boolean)).size;
  }, [logs]);

  function exportCSV() {
    const headers = [
      'Log ID',
      'Lab / Facility',
      'Room Code',
      'Floor / Block',
      'Lecturer Name',
      'Staff ID',
      'Email',
      'Course Code',
      'Course Name',
      'Start Time',
      'End Time',
      'Purpose / Lecture Notes',
      'Recorded At',
    ];
    const rows = filteredLogs.map((r) => [
      r.log_id,
      `"${(r.location_name || '').replace(/"/g, '""')}"`,
      `"${(r.location_code || '').replace(/"/g, '""')}"`,
      `"${(r.location_floor || '').replace(/"/g, '""')}"`,
      `"${(r.user_name || '').replace(/"/g, '""')}"`,
      `"${(r.matric_or_staff_id || '').replace(/"/g, '""')}"`,
      `"${(r.user_email || '').replace(/"/g, '""')}"`,
      `"${(r.course_id || '').replace(/"/g, '""')}"`,
      `"${(r.course_name || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(r.start_time)}"`,
      `"${formatDateTime(r.end_time)}"`,
      `"${(r.purpose || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(r.created_at)}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_rekod_penggunaan_makmal.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    {
      title: 'Lab / Room Facility',
      key: 'facility',
      render: (_, record) => (
        <div>
          <Text strong>{record.location_name}</Text>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {record.location_code} • {record.location_floor?.startsWith('Blok') ? record.location_floor : `Floor ${record.location_floor}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Lecturer / Staff',
      key: 'lecturer',
      render: (_, record) => (
        <div>
          <Text strong>{record.user_name}</Text>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {record.matric_or_staff_id || record.user_email}
          </div>
        </div>
      ),
    },
    {
      title: 'Course',
      key: 'course',
      render: (_, record) => (
        <div>
          {record.course_id && (
            <Tag color="blue" style={{ fontWeight: 700, marginBottom: 2 }}>
              {record.course_id}
            </Tag>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{record.course_name}</div>
        </div>
      ),
    },
    {
      title: 'Purpose / Lecture Notes',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (text) => <span style={{ fontSize: 13, color: '#334155' }}>{text}</span>,
    },
    {
      title: 'Lecture Time Window',
      key: 'time_window',
      render: (_, record) => (
        <span style={{ fontSize: 12, fontFamily: 'monospace' }}>
          {formatDateTime(record.start_time)} &rarr; {formatDateTime(record.end_time)}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 600 }}>
          Attended / Logged
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Popconfirm
          title="Delete this lab usage log?"
          description="This action cannot be undone."
          onConfirm={() => handleDelete(record.log_id)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === record.log_id}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="LOG REKOD PENGGUNAAN MAKMAL"
        subtitle="Official log of lecture attendance and laboratory/room usage across FSKTM facilities"
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCSV} disabled={filteredLogs.length === 0}>
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 600 }}
            >
              Record Lecture Attendance
            </Button>
          </Space>
        }
      />

      {/* Summary Statistics */}
      <Row gutter={[14, 14]}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 12 }}>Total Logged Sessions</span>}
              value={logs.length}
              valueStyle={{ fontWeight: 800, color: '#0F172A' }}
              prefix={<FileTextOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 12 }}>Today&apos;s Attendance Logs</span>}
              value={todayCount}
              valueStyle={{ fontWeight: 800, color: '#059669' }}
              prefix={<CalendarOutlined style={{ color: '#059669' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 12 }}>Labs & Rooms Logged</span>}
              value={uniqueLabsCount}
              valueStyle={{ fontWeight: 800, color: '#D97706' }}
              prefix={<CompassOutlined style={{ color: '#D97706' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 12 }}>Active Courses</span>}
              value={uniqueCoursesCount}
              valueStyle={{ fontWeight: 800, color: '#7C3AED' }}
              prefix={<BookOutlined style={{ color: '#7C3AED' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Log Table */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Search lecturer, course code, course name, lab, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              style={{ width: '100%' }}
              value={selectedFloor}
              onChange={(val) => {
                setSelectedFloor(val);
                setSelectedLocationId('All');
              }}
              options={floorOptions.map((f) => ({
                value: f,
                label: f === 'All' ? 'All Floors & Blocks' : f.startsWith('Blok') ? f : `Floor ${f}`,
              }))}
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              style={{ width: '100%' }}
              showSearch
              value={selectedLocationId}
              onChange={(val) => setSelectedLocationId(val)}
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={[
                { value: 'All', label: 'All Labs & Classrooms' },
                ...locations
                  .filter((l) => selectedFloor === 'All' || l.floor === selectedFloor)
                  .map((l) => ({
                    value: String(l.location_id),
                    label: `${l.name} (${l.code})`,
                  })),
              ]}
            />
          </Col>
        </Row>

        <Table
          rowKey="log_id"
          loading={loading}
          dataSource={filteredLogs}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 860 }}
          locale={{
            emptyText: <Empty description="No lab usage or lecture attendance records found." />,
          }}
        />
      </Card>

      <LabUsageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogCreated={fetchData}
      />
    </div>
  );
}

