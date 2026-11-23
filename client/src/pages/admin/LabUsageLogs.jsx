import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  ReloadOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  QrcodeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/date';

const { Text } = Typography;

export default function LabUsageLogs() {
  const [logs, setLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedLocationId, setSelectedLocationId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
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
      message.success(data.message || 'Record updated');
      fetchData();
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
    return logs
      .filter((item) => {
        if (selectedFloor !== 'All' && item.location_floor !== selectedFloor) return false;
        if (selectedLocationId !== 'All' && String(item.location_id) !== String(selectedLocationId)) return false;
        if (statusFilter !== 'All' && item.attendance_status !== statusFilter) return false;

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
      })
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  }, [logs, selectedFloor, selectedLocationId, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const onTime = logs.filter((l) => l.attendance_status === 'on_time').length;
    const late = logs.filter((l) => l.attendance_status === 'late').length;
    const pending = logs.filter((l) => l.attendance_status === 'pending_checkin').length;
    const missed = logs.filter((l) => l.attendance_status === 'missed').length;
    return { total: logs.length, onTime, late, pending, missed };
  }, [logs]);

  function getStatusLabel(status, lateMins) {
    if (status === 'on_time') return 'Attended (On-Time)';
    if (status === 'late') return `Late Check-In (+${lateMins || 1}m)`;
    if (status === 'pending_checkin') return 'Pending QR Scan';
    if (status === 'missed') return 'Missed / Absent';
    return status;
  }

  function exportCSV() {
    const headers = [
      'Record ID',
      'Lab / Facility',
      'Room Code',
      'Floor / Block',
      'Lecturer Name',
      'Staff ID',
      'Email',
      'Course Code',
      'Course Name',
      'Scheduled Start',
      'Scheduled End',
      'QR Checked-In At',
      'Attendance Status',
      'Purpose / Lecture Notes',
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
      `"${r.checked_in_at ? formatDateTime(r.checked_in_at) : 'Not Scanned'}"`,
      `"${getStatusLabel(r.attendance_status, r.late_minutes)}"`,
      `"${(r.purpose || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_rekod_penggunaan_makmal_qr_attendance.csv';
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
      title: 'Lecturer / Faculty',
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
      title: 'Scheduled Slot & QR Scan Time',
      key: 'time_window',
      sorter: (a, b) => new Date(a.start_time) - new Date(b.start_time),
      defaultSortOrder: 'descend',
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
          <div style={{ fontFamily: 'monospace' }}>
            <strong>Slot:</strong> {formatDateTime(record.start_time)} &rarr; {formatDateTime(record.end_time)}
          </div>
          {record.checked_in_at ? (
            <div style={{ color: record.attendance_status === 'late' ? '#D97706' : '#059669', fontFamily: 'monospace', fontWeight: 700 }}>
              <QrcodeOutlined style={{ marginRight: 4 }} />
              Scanned: {formatDateTime(record.checked_in_at)}
            </div>
          ) : (
            <div style={{ color: '#94A3B8', fontSize: 11 }}>
              No QR scan recorded
            </div>
          )}
        </Space>
      ),
    },
    {
      title: 'QR Attendance Status',
      key: 'status',
      render: (_, record) => {
        if (record.attendance_status === 'on_time') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 700 }}>
              Attended (On-Time)
            </Tag>
          );
        }
        if (record.attendance_status === 'late') {
          return (
            <Tag icon={<ClockCircleOutlined />} color="warning" style={{ fontWeight: 700 }}>
              Late Check-In ({record.late_minutes ? `+${record.late_minutes}m` : 'Late'})
            </Tag>
          );
        }
        if (record.attendance_status === 'pending_checkin') {
          return (
            <Tag icon={<QrcodeOutlined />} color="processing" style={{ fontWeight: 600 }}>
              Pending QR Scan
            </Tag>
          );
        }
        return (
          <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontWeight: 700 }}>
            Missed / Absent
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Space size="small">
          {(record.checked_in_at || !String(record.log_id).startsWith('B-')) && (
            <Popconfirm
              title="Reset / Delete this attendance log?"
              description="This will clear the QR check-in record."
              onConfirm={() => handleDelete(record.log_id)}
              okText="Reset"
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
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="LOG REKOD PENGGUNAAN MAKMAL"
        subtitle="QR-verified faculty attendance and laboratory/room reservation tracking across FSKTM facilities (On-Time, Late, Pending Scan, & Missed)"
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCSV} disabled={filteredLogs.length === 0}>
              Export CSV
            </Button>
          </Space>
        }
      />

      {/* Summary Statistics */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={4}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#64748B', fontSize: 12 }}>Total Sessions</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 800, color: '#0F172A' }}
              prefix={<FileTextOutlined style={{ color: '#1E3A8A' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#065F46', fontSize: 12 }}>Attended On-Time</span>}
              value={stats.onTime}
              valueStyle={{ fontWeight: 800, color: '#059669' }}
              prefix={<CheckCircleOutlined style={{ color: '#059669' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#92400E', fontSize: 12 }}>Checked In Late</span>}
              value={stats.late}
              valueStyle={{ fontWeight: 800, color: '#D97706' }}
              prefix={<ClockCircleOutlined style={{ color: '#D97706' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={5}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#1E40AF', fontSize: 12 }}>Pending QR Scan</span>}
              value={stats.pending}
              valueStyle={{ fontWeight: 800, color: '#2563EB' }}
              prefix={<QrcodeOutlined style={{ color: '#2563EB' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title={<span style={{ fontWeight: 600, color: '#991B1B', fontSize: 12 }}>Missed / Absent</span>}
              value={stats.missed}
              valueStyle={{ fontWeight: 800, color: '#DC2626' }}
              prefix={<CloseCircleOutlined style={{ color: '#DC2626' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters & Log Table */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={7}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Search lecturer, course, lab, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All', label: 'All Attendance Statuses' },
                { value: 'on_time', label: 'Attended (On-Time)' },
                { value: 'late', label: 'Checked In Late' },
                { value: 'pending_checkin', label: 'Pending QR Scan' },
                { value: 'missed', label: 'Missed / Absent' },
              ]}
            />
          </Col>
          <Col xs={12} md={5}>
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
          <Col xs={24} md={6}>
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
          rowKey="record_key"
          loading={loading}
          dataSource={filteredLogs}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 920 }}
          locale={{
            emptyText: <Empty description="No faculty reservation or QR attendance records found." />,
          }}
        />
      </Card>
    </div>
  );
}
