import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Tooltip,
  Modal,
  Descriptions,
  Empty,
  message,
  Dropdown,
  Popconfirm,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  BookOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import StatusTag from './StatusTag';

const { Title, Text } = Typography;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyTimetable({
  bookings = [],
  onBookSlot,
  onRefresh,
  lecturerName = 'Lecturer'
}) {
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedSession, setSelectedSession] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Extract distinct course list for filter
  const courseOptions = useMemo(() => {
    const set = new Set();
    bookings.forEach(b => {
      if (b.course_id && b.status !== 'rejected') set.add(b.course_id);
    });
    return [
      { value: 'All', label: 'All Courses' },
      ...Array.from(set).map(c => ({ value: c, label: c }))
    ];
  }, [bookings]);

  // Consolidate recurring bookings into unique timetable class items
  // Only show approved and pending bookings — rejected are excluded from timetable (shown in bell notifications)
  const consolidatedTimetableItems = useMemo(() => {
    const groupMap = new Map();
    const result = [];

    bookings.forEach(b => {
      // *** Exclude rejected bookings from the timetable entirely ***
      if (b.status === 'rejected') return;

      // Filter by course
      if (selectedCourse !== 'All' && b.course_id !== selectedCourse) return;

      const gId = b.recurrence_group_id;

      if (gId) {
        if (!groupMap.has(gId)) {
          const item = {
            ...b,
            is_recurring_series: true,
            total_weeks: 1,
            first_date: b.start_time,
            last_date: b.start_time,
            all_sessions: [b],
            day_index: dayjs(b.start_time).day(),
            day_name: DAY_NAMES[dayjs(b.start_time).day()],
          };
          groupMap.set(gId, item);
          result.push(item);
        } else {
          const existing = groupMap.get(gId);
          existing.total_weeks += 1;
          existing.all_sessions.push(b);
          if (new Date(b.start_time) < new Date(existing.first_date)) {
            existing.first_date = b.start_time;
          }
          if (new Date(b.start_time) > new Date(existing.last_date)) {
            existing.last_date = b.start_time;
          }
        }
      } else {
        result.push({
          ...b,
          is_recurring_series: false,
          day_index: dayjs(b.start_time).day(),
          day_name: DAY_NAMES[dayjs(b.start_time).day()],
          first_date: b.start_time,
          last_date: b.end_time,
          all_sessions: [b],
        });
      }
    });

    // Filter by day of week (strictly Monday - Friday, excluding weekends)
    return result.filter(item => {
      if (item.day_index === 0 || item.day_index === 6) return false;
      if (selectedDay !== 'All' && item.day_name !== selectedDay) return false;
      return true;
    }).sort((a, b) => {
      const dayOrderA = a.day_index === 0 ? 7 : a.day_index;
      const dayOrderB = b.day_index === 0 ? 7 : b.day_index;
      if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
      return dayjs(a.start_time).hour() - dayjs(b.start_time).hour();
    });
  }, [bookings, selectedDay, selectedCourse]);

  // Calculate stats (only approved/pending shown in table)
  const totalWeeklyHours = useMemo(() => {
    let total = 0;
    consolidatedTimetableItems.forEach(item => {
      if (item.status === 'approved' || item.status === 'pending') {
        const start = dayjs(item.start_time);
        const end = dayjs(item.end_time);
        const diffHrs = end.diff(start, 'minute') / 60;
        total += Math.max(diffHrs, 1);
      }
    });
    return total;
  }, [consolidatedTimetableItems]);

  const uniqueCoursesCount = useMemo(() => {
    const set = new Set();
    consolidatedTimetableItems.forEach(item => {
      if (item.course_id) set.add(item.course_id);
    });
    return set.size;
  }, [consolidatedTimetableItems]);

  // ── Cancel one specific week occurrence ──────────────────────────────────
  async function handleCancelWeek(bookingId) {
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel-week`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || 'Failed to cancel session.');
      } else {
        message.success(data.message || 'Session cancelled successfully.');
        setSelectedSession(null);
        if (onRefresh) onRefresh();
      }
    } catch {
      message.error('Network error cancelling session.');
    } finally {
      setCancellingId(null);
    }
  }

  // ── Cancel entire recurring series ───────────────────────────────────────
  async function handleCancelSeries(groupId) {
    setCancellingId(groupId);
    try {
      const res = await fetch(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error || 'Failed to cancel series.');
      } else {
        message.success(data.message || 'Series cancelled successfully.');
        setSelectedSession(null);
        if (onRefresh) onRefresh();
      }
    } catch {
      message.error('Network error cancelling series.');
    } finally {
      setCancellingId(null);
    }
  }

  const columns = [
    {
      title: 'Day & Date',
      key: 'day_and_date',
      width: '22%',
      render: (_, record) => {
        const startD = dayjs(record.start_time);
        const dayName = record.day_name;
        const dateStr = startD.format('DD/MM/YYYY');

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                  color: '#1E3A8A',
                }}
              >
                {record.is_recurring_series ? `Every ${dayName}` : dayName}
              </span>
              {record.is_recurring_series && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0, fontWeight: 700, borderRadius: 6 }}>
                  {record.total_weeks} Wks
                </Tag>
              )}
            </div>

            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>
              {record.is_recurring_series ? (
                <span>
                  {dayjs(record.first_date).format('DD/MM/YYYY')} → {dayjs(record.last_date).format('DD/MM/YYYY')}
                </span>
              ) : (
                <span>Date: <strong style={{ color: '#334155' }}>{dateStr}</strong></span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Time Window',
      key: 'time_window',
      width: '16%',
      render: (_, record) => {
        const start = dayjs(record.start_time);
        const end = dayjs(record.end_time);
        const durationHrs = Math.max(end.diff(start, 'minute') / 60, 1);

        return (
          <div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 12, fontFamily: 'monospace' }}>
              <ClockCircleOutlined style={{ color: '#2563EB', marginRight: 4 }} />
              {start.format('HH:mm')} → {end.format('HH:mm')}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              Duration: {durationHrs} {durationHrs === 1 ? 'Hour' : 'Hours'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Course Code',
      dataIndex: 'course_id',
      key: 'course_id',
      width: '13%',
      render: (courseId) => (
        courseId ? (
          <Tag color="cyan" style={{ fontWeight: 800, padding: '2px 6px', fontSize: 11, borderRadius: 6 }}>
            {courseId.toUpperCase()}
          </Tag>
        ) : (
          <Tag color="blue" style={{ fontSize: 11, borderRadius: 6 }}>Practical</Tag>
        )
      ),
    },
    {
      title: 'Course Name',
      key: 'course_name',
      width: '22%',
      render: (_, record) => {
        const fallback = record.purpose?.includes('(') ? record.purpose.split('(')[0].trim() : record.purpose;
        const displayName = record.course_name || fallback || 'Academic Course';
        return (
          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>
            {displayName}
          </span>
        );
      },
    },
    {
      title: 'Facility / Room',
      key: 'location',
      width: '20%',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <EnvironmentOutlined style={{ color: '#1E3A8A', fontSize: 12 }} />
            <span style={{ fontSize: 12 }}>{record.location_name}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
            <Tag style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{record.location_code}</Tag>
            {record.location_floor && (
              <span style={{ marginLeft: 6 }}>
                {record.location_floor?.startsWith('Blok') ? record.location_floor : `Floor ${record.location_floor}`}
              </span>
            )}
            {record.location_capacity && (
              <span style={{ marginLeft: 6 }}>• Cap: {record.location_capacity}</span>
            )}
          </div>
        </div>
      ),
    },
    // Status column: only rendered when approved
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '9%',
      render: (status) => {
        if (status === 'approved') {
          return <StatusTag status="approved" />;
        }
        // For pending or other non-rejected statuses, still show
        if (status === 'pending') {
          return <StatusTag status="pending" />;
        }
        return null;
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: '13%',
      render: (_, record) => {
        const gId = record.recurrence_group_id;
        const isActive = record.status === 'approved' || record.status === 'pending';
        const isCancelled = record.status === 'cancelled';

        // Build cancel menu items
        const cancelMenuItems = [];

        if (isActive) {
          // "Cancel This Week" — targets the representative booking_id
          cancelMenuItems.push({
            key: 'cancel-week',
            label: (
              <Popconfirm
                title="Cancel This Week"
                description={`Cancel the session on ${dayjs(record.start_time).format('ddd, DD MMM YYYY')}?`}
                onConfirm={() => handleCancelWeek(record.booking_id)}
                okText="Yes, Cancel"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <span style={{ color: '#B45309' }}>Cancel This Week</span>
              </Popconfirm>
            ),
          });
        }

        if (gId && isActive) {
          cancelMenuItems.push({
            key: 'cancel-series',
            label: (
              <Popconfirm
                title="Cancel Entire Series"
                description="Cancel ALL remaining weeks of this recurring series? This cannot be undone."
                onConfirm={() => handleCancelSeries(gId)}
                okText="Yes, Cancel All"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <span style={{ color: '#DC2626' }}>Cancel Entire Series</span>
              </Popconfirm>
            ),
          });
        }

        return (
          <Space size={4} wrap>
            <Button
              size="small"
              onClick={() => setSelectedSession(record)}
              style={{ fontSize: 11 }}
            >
              Details
            </Button>

            {!isCancelled && cancelMenuItems.length > 0 && (
              <Dropdown
                menu={{ items: cancelMenuItems }}
                trigger={['click']}
                disabled={cancellingId === record.booking_id || cancellingId === gId}
              >
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={cancellingId === record.booking_id || cancellingId === gId}
                  style={{ fontSize: 11 }}
                >
                  Cancel <DownOutlined style={{ fontSize: 9 }} />
                </Button>
              </Dropdown>
            )}

            {isCancelled && (
              <Tag color="default" style={{ fontSize: 10 }}>Cancelled</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="weekly-timetable-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Main Timetable Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1E3A8A',
              }}
            >
              <CalendarOutlined style={{ fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', lineHeight: 1.2 }}>
                Weekly Teaching Timetable
              </div>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                Weekly timetable of assigned lectures and laboratory classes
              </div>
            </div>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {/* KPI Strip & Control Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          {/* Summary Badges — only Teaching Load & Active Courses */}
          <Space size="middle" wrap>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
              }}
            >
              <ClockCircleOutlined style={{ color: '#2563EB' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>Total Teaching Load:</span>
              <strong style={{ color: '#0F172A', fontSize: 13 }}>{totalWeeklyHours} Hours / Week</strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
              }}
            >
              <BookOutlined style={{ color: '#7C3AED' }} />
              <span style={{ fontSize: 12, color: '#475569' }}>Active Courses:</span>
              <strong style={{ color: '#0F172A', fontSize: 13 }}>{uniqueCoursesCount} Course(s)</strong>
            </div>
          </Space>

          {/* Filters Bar — Day and Course only */}
          <Space size="small" wrap>
            <Select
              value={selectedDay}
              onChange={setSelectedDay}
              style={{ width: 150 }}
              size="middle"
              options={[
                { value: 'All', label: 'All Days (Mon - Fri)' },
                { value: 'Monday', label: 'Monday' },
                { value: 'Tuesday', label: 'Tuesday' },
                { value: 'Wednesday', label: 'Wednesday' },
                { value: 'Thursday', label: 'Thursday' },
                { value: 'Friday', label: 'Friday' },
              ]}
            />

            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              style={{ width: 140 }}
              options={courseOptions}
              size="middle"
            />
          </Space>
        </div>

        {/* Timetable Table — no horizontal scroll, percentage widths */}
        <Table
          dataSource={consolidatedTimetableItems}
          columns={columns}
          rowKey={(r) => r.recurrence_group_id || r.booking_id}
          pagination={consolidatedTimetableItems.length > 8 ? { pageSize: 8 } : false}
          size="middle"
          tableLayout="fixed"
          style={{ width: '100%' }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>
                      No approved classes scheduled
                    </div>
                    <div style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>
                      When a booking is approved, its date, time window, and venue will appear here.
                    </div>
                    {onBookSlot && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => onBookSlot()}
                        style={{ fontWeight: 600, background: '#1E3A8A' }}
                      >
                        Book Class Slot
                      </Button>
                    )}
                  </div>
                }
              />
            ),
          }}
        />
      </Card>

      {/* Class Session Detail Modal */}
      <Modal
        open={Boolean(selectedSession)}
        onCancel={() => setSelectedSession(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedSession(null)}>
            Close
          </Button>,

          // Cancel This Week — always show for active sessions that haven't started yet
          selectedSession?.status !== 'cancelled' &&
          new Date(selectedSession?.start_time) > new Date() && (
            <Popconfirm
              key="cancel-week"
              title="Cancel This Week"
              description={`Cancel the session on ${dayjs(selectedSession?.start_time).format('ddd, DD MMM YYYY')}?`}
              onConfirm={() => handleCancelWeek(selectedSession?.booking_id)}
              okText="Yes, Cancel"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<StopOutlined />}
                loading={cancellingId === selectedSession?.booking_id}
              >
                Cancel This Week
              </Button>
            </Popconfirm>
          ),

          // Cancel Entire Series — only if it's recurring
          selectedSession?.recurrence_group_id &&
          selectedSession?.status !== 'cancelled' && (
            <Popconfirm
              key="cancel-series"
              title="Cancel Entire Series"
              description="Cancel ALL remaining weeks of this recurring series? This cannot be undone."
              onConfirm={() => handleCancelSeries(selectedSession?.recurrence_group_id)}
              okText="Yes, Cancel All"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                type="primary"
                icon={<ExclamationCircleOutlined />}
                loading={cancellingId === selectedSession?.recurrence_group_id}
                style={{ background: '#DC2626', borderColor: '#DC2626' }}
              >
                Cancel Entire Series
              </Button>
            </Popconfirm>
          ),
        ]}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOutlined style={{ color: '#1E3A8A' }} />
            <span>Class Session Details</span>
          </div>
        }
      >
        {selectedSession && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Course Code">
              <Tag color="cyan" style={{ fontWeight: 800 }}>
                {selectedSession.course_id ? selectedSession.course_id.toUpperCase() : 'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Course Name">
              <strong>{selectedSession.course_name || selectedSession.purpose}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Class Purpose / Title">
              {selectedSession.purpose}
            </Descriptions.Item>
            <Descriptions.Item label="Lecturer">
              {lecturerName}
            </Descriptions.Item>
            <Descriptions.Item label="Facility / Venue">
              <strong>{selectedSession.location_name}</strong> ({selectedSession.location_code})
              {selectedSession.location_floor && (
                <span style={{ color: '#64748B', marginLeft: 6 }}>
                  • {selectedSession.location_floor?.startsWith('Blok') ? selectedSession.location_floor : `Floor ${selectedSession.location_floor}`}
                </span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Weekly Schedule">
              <strong>Every {selectedSession.day_name}</strong> • {dayjs(selectedSession.start_time).format('HH:mm')} → {dayjs(selectedSession.end_time).format('HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Date Span">
              {dayjs(selectedSession.first_date).format('DD/MM/YYYY')} → {dayjs(selectedSession.last_date).format('DD/MM/YYYY')} ({selectedSession.total_weeks || 1} weeks)
            </Descriptions.Item>
            <Descriptions.Item label="Approval Status">
              <StatusTag status={selectedSession.status} />
            </Descriptions.Item>
            {selectedSession.series_status && (
              <Descriptions.Item label="Series Status">
                <Tag color={selectedSession.series_status === 'active' ? 'green' : 'orange'}>
                  {selectedSession.series_status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .weekly-timetable-container, .weekly-timetable-container * {
            visibility: visible;
          }
          .weekly-timetable-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .ant-btn, .ant-select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
