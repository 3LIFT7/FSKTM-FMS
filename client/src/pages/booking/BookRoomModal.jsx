import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, DatePicker, TimePicker, Input, InputNumber, Switch, Alert, Button, Space, Typography, Tag, Row, Col, message } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import StatusTag from '../../components/StatusTag';
import { DATE_FORMAT, TIME_FORMAT } from '../../utils/date';

const { Text, Paragraph } = Typography;

const TIME_SLOTS = [
  '08:00', '08:30',
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
  '12:00', '12:30',
  '13:00', '13:30',
  '14:00', '14:30',
  '15:00', '15:30',
  '16:00', '16:30',
  '17:00', '17:30',
  '18:00', '18:30',
  '19:00', '19:30',
  '20:00',
];

const QUICK_PRESETS = [
  { label: '08:00 – 10:00', start: '08:00', end: '10:00' },
  { label: '09:00 – 11:00', start: '09:00', end: '11:00' },
  { label: '10:00 – 12:00', start: '10:00', end: '12:00' },
  { label: '14:00 – 16:00', start: '14:00', end: '16:00' },
  { label: '16:00 – 18:00', start: '16:00', end: '18:00' },
  { label: '18:00 – 20:00', start: '18:00', end: '20:00' },
];

export default function BookRoomModal({ isOpen, onClose, initialLocation, initialSlot, onBookingCreated }) {
  const { user, isLecturer, isStaff } = useAuth();
  const courseDetailsRequired = !isStaff;
  const [form] = Form.useForm();

  const [locations, setLocations] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [existingBookingsOnDate, setExistingBookingsOnDate] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Watch form values for conflict detection
  const selectedDate = Form.useWatch('date', form);
  const selectedStartTime = Form.useWatch('startTime', form);
  const selectedEndTime = Form.useWatch('endTime', form);
  const watchedLocationId = Form.useWatch('location_id', form);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      if (user?.role === 'student') {
        fetch('/api/bookings/lecturers', { credentials: 'include' })
          .then(r => r.json())
          .then(d => {
            if (d.success) setLecturers(d.lecturers || []);
          })
          .catch(() => {});
      }
      form.resetFields();
      setError('');

      let targetDate = dayjs();
      let startHour = 9;
      let endHour = 11;

      if (initialSlot) {
        if (initialSlot.day !== undefined) {
          const currentDay = dayjs().day();
          let diff = (initialSlot.day - currentDay + 7) % 7;
          if (diff === 0 && dayjs().hour() >= (initialSlot.hour || 18)) diff = 7;
          targetDate = dayjs().add(diff, 'day');
        }
        if (initialSlot.hour !== undefined) {
          startHour = initialSlot.hour;
          endHour = Math.min(startHour + 2, 20);
        }
        if (initialSlot.is_recurring !== undefined) {
          setIsRecurring(Boolean(initialSlot.is_recurring));
        } else {
          setIsRecurring(Boolean(isLecturer));
        }
      } else {
        setIsRecurring(false);
      }

      const locId = initialLocation ? initialLocation.location_id : (initialSlot?.location_id || undefined);
      if (locId) {
        setSelectedLocationId(locId);
      }

      const startStr = `${String(startHour).padStart(2, '0')}:00`;
      const endStr = `${String(endHour).padStart(2, '0')}:00`;

      form.setFieldsValue({
        location_id: locId,
        date: targetDate,
        startTime: startStr,
        endTime: endStr,
        weeks: 14,
      });
    }
  }, [isOpen, initialLocation, initialSlot, isLecturer, form]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  }

  // Filter out rooms under active maintenance according to Section 8
  const selectableRooms = useMemo(() => {
    return locations.filter(loc => loc.status !== 'maintenance');
  }, [locations]);

  // Fetch slots whenever location and date change
  useEffect(() => {
    const locId = watchedLocationId || selectedLocationId;
    if (isOpen && locId && selectedDate) {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      fetchSlotsForDate(locId, dateStr);
    } else {
      setExistingBookingsOnDate([]);
    }
  }, [isOpen, watchedLocationId, selectedLocationId, selectedDate]);

  async function fetchSlotsForDate(locationId, chosenDateStr) {
    setFetchingSlots(true);
    try {
      const startOfDay = new Date(`${chosenDateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${chosenDateStr}T23:59:59`).toISOString();
      const res = await fetch(`/api/bookings?location_id=${locationId}&startDate=${encodeURIComponent(startOfDay)}&endDate=${encodeURIComponent(endOfDay)}`);
      const data = await res.json();
      if (data.success) {
        const active = data.bookings.filter(b => b.status === 'approved' || b.status === 'pending');
        setExistingBookingsOnDate(active);
      }
    } catch (err) {
      console.error('Error checking slots:', err);
    } finally {
      setFetchingSlots(false);
    }
  }

  // Conflict calculation adhering to Section 8
  const conflict = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      return null;
    }
    const chosenDateStr = selectedDate.format('YYYY-MM-DD');
    const startStr = `${chosenDateStr}T${selectedStartTime}:00`;
    const endStr = `${chosenDateStr}T${selectedEndTime}:00`;

    const reqStart = new Date(startStr);
    const reqEnd = new Date(endStr);

    if (reqEnd <= reqStart) {
      return null;
    }

    for (const b of existingBookingsOnDate) {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      // Overlap condition
      if (reqStart < bEnd && reqEnd > bStart) {
        return b;
      }
    }
    return null;
  }, [selectedDate, selectedStartTime, selectedEndTime, existingBookingsOnDate]);

  const durationText = useMemo(() => {
    if (!selectedStartTime || !selectedEndTime) return null;
    const [startH, startM] = selectedStartTime.split(':').map(Number);
    const [endH, endM] = selectedEndTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes <= 0) return 'Invalid: End time must be after start time';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    return parts.join(' ');
  }, [selectedStartTime, selectedEndTime]);

  const formatTimeSlotLabel = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hhmm} (${hour12}:${String(m).padStart(2, '0')} ${period})`;
  };

  const startTimeOptions = useMemo(() => {
    return TIME_SLOTS.slice(0, -1).map(t => ({
      value: t,
      label: formatTimeSlotLabel(t),
    }));
  }, []);

  const endTimeOptions = useMemo(() => {
    const currentStart = selectedStartTime || '08:00';
    return TIME_SLOTS.filter(t => t > currentStart).map(t => ({
      value: t,
      label: formatTimeSlotLabel(t),
    }));
  }, [selectedStartTime]);

  const handleStartTimeChange = (newStart) => {
    form.setFieldsValue({ startTime: newStart });
    const [h, m] = newStart.split(':').map(Number);
    const currentEnd = form.getFieldValue('endTime');
    const [curEndH, curEndM] = (currentEnd || '00:00').split(':').map(Number);
    if (!currentEnd || (curEndH * 60 + curEndM) <= (h * 60 + m)) {
      const targetEndMinutes = Math.min((h + 2) * 60 + m, 20 * 60);
      const targetEndH = String(Math.floor(targetEndMinutes / 60)).padStart(2, '0');
      const targetEndM = String(targetEndMinutes % 60).padStart(2, '0');
      form.setFieldsValue({ endTime: `${targetEndH}:${targetEndM}` });
    }
  };

  const setDuration = (hoursToAdd) => {
    const start = form.getFieldValue('startTime') || '09:00';
    const [h, m] = start.split(':').map(Number);
    const targetEndMinutes = Math.min((h + hoursToAdd) * 60 + m, 20 * 60);
    const targetEndH = String(Math.floor(targetEndMinutes / 60)).padStart(2, '0');
    const targetEndM = String(targetEndMinutes % 60).padStart(2, '0');
    form.setFieldsValue({ endTime: `${targetEndH}:${targetEndM}` });
  };

  const applyPreset = (preset) => {
    form.setFieldsValue({
      startTime: preset.start,
      endTime: preset.end,
    });
  };

  async function handleFinish(values) {
    if (conflict) {
      setError('Cannot submit booking due to schedule overlap with an existing slot.');
      return;
    }

    if (!values.startTime || !values.endTime) {
      setError('Please select both start and end time.');
      return;
    }

    if (values.endTime <= values.startTime) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const chosenDateStr = values.date.format('YYYY-MM-DD');
      const startTimeStr = new Date(`${chosenDateStr}T${values.startTime}:00`).toISOString();
      const endTimeStr = new Date(`${chosenDateStr}T${values.endTime}:00`).toISOString();

      const payload = {
        location_id: values.location_id,
        start_time: startTimeStr,
        end_time: endTimeStr,
        purpose: values.purpose,
        course_id: values.course_id ? values.course_id.toUpperCase().trim() : null,
        course_name: values.course_name ? values.course_name.trim() : null,
        lecturer_name: values.lecturer_name ? values.lecturer_name.trim() : (isLecturer ? user?.name : null),
        is_recurring: isRecurring,
        weeks: isRecurring ? (values.weeks || 14) : 1,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reserve facility');

      message.success(data.message || 'Facility booked successfully!');
      if (onBookingCreated) onBookingCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={560}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: '#1E3A8A' }} />
          <span>{isLecturer || isStaff ? 'Facility Reservation' : 'Request Room Booking'}</span>
        </div>
      }
    >
      <div style={{ marginTop: 12 }}>
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Real-time double-booking warning banner (Section 8 Rule) */}
        {conflict && (
          <Alert
            type="error"
            showIcon
            icon={<AlertOutlined />}
            message="Double-Booking Conflict Detected"
            description={
              <div>
                This slot overlaps with an existing {conflict.status} reservation:{' '}
                <strong>{conflict.purpose || conflict.course_id || 'Reserved Class'}</strong> (
                {dayjs(conflict.start_time).format('HH:mm')} &rarr; {dayjs(conflict.end_time).format('HH:mm')}).
                Please adjust your chosen time window.
              </div>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
          <Form.Item
            name="location_id"
            label="Lab / Room Facility"
            rules={[{ required: true, message: 'Please select a lab or room' }]}
            extra="Rooms under active maintenance are automatically hidden."
          >
            <Select
              placeholder="Select available classroom or lab"
              onChange={(val) => setSelectedLocationId(val)}
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={selectableRooms.map(loc => ({
                value: loc.location_id,
                label: `${loc.name} (${loc.code}) — ${loc.floor?.startsWith('Blok') ? loc.floor : `Floor ${loc.floor}`} • Capacity: ${loc.capacity}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Reservation Date"
            rules={[{ required: true, message: 'Please select reservation date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format={DATE_FORMAT}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          {/* Reservation Time Window */}
          <div style={{ marginBottom: 16, background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#1E293B', fontSize: 14 }}>
                <ClockCircleOutlined style={{ marginRight: 6, color: '#2563EB' }} />
                Reservation Time Window
              </span>
              {durationText && (
                <Tag color={selectedEndTime && selectedStartTime && selectedEndTime > selectedStartTime ? 'blue' : 'error'} style={{ margin: 0 }}>
                  {durationText.includes('Invalid') ? durationText : `⏱️ Duration: ${durationText}`}
                </Tag>
              )}
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Standard Class & Lab Slots:</div>
              <Space wrap size={[6, 6]}>
                {QUICK_PRESETS.map((p) => {
                  const isSelected = selectedStartTime === p.start && selectedEndTime === p.end;
                  return (
                    <Button
                      key={p.label}
                      size="small"
                      type={isSelected ? 'primary' : 'default'}
                      onClick={() => applyPreset(p)}
                      style={{
                        fontSize: 12,
                        borderRadius: 6,
                        ...(isSelected ? {} : { background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }),
                      }}
                    >
                      {p.label}
                    </Button>
                  );
                })}
              </Space>
            </div>

            <Row gutter={12}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="startTime"
                  label="Start Time"
                  rules={[{ required: true, message: 'Select start time' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    options={startTimeOptions}
                    onChange={handleStartTimeChange}
                    placeholder="Select start time"
                    showSearch
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="endTime"
                  label="End Time"
                  rules={[
                    { required: true, message: 'Select end time' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const start = getFieldValue('startTime');
                        if (!value || !start || value > start) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('End time must be after start time'));
                      },
                    }),
                  ]}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    options={endTimeOptions}
                    placeholder="Select end time"
                    showSearch
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Quick Duration Adjusters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Quick Duration:</span>
              <Space size={4}>
                {[1, 2, 3, 4].map((h) => (
                  <Button
                    key={h}
                    size="small"
                    type="text"
                    style={{ fontSize: 12, color: '#1D4ED8', padding: '0 8px', height: 22, background: '#EFF6FF', borderRadius: 4, fontWeight: 500 }}
                    onClick={() => setDuration(h)}
                  >
                    +{h} hr{h > 1 ? 's' : ''}
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          {isLecturer ? (
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item
                  name="course_id"
                  label={isStaff ? 'Course Code (optional)' : 'Course Code'}
                  rules={[{ required: courseDetailsRequired, message: 'Course Code is required' }]}
                >
                  <Input style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={14}>
                <Form.Item
                  name="course_name"
                  label={isStaff ? 'Course Name (optional)' : 'Course Name'}
                  rules={[{ required: courseDetailsRequired, message: 'Course Name is required' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <>
              <Row gutter={12}>
                <Col xs={24} sm={10}>
                  <Form.Item
                    name="course_id"
                    label={isStaff ? 'Course Code (optional)' : 'Course Code'}
                    rules={[{ required: courseDetailsRequired, message: 'Course Code is required' }]}
                  >
                    <Input style={{ textTransform: 'uppercase' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={14}>
                  <Form.Item
                    name="course_name"
                    label={isStaff ? 'Course Name (optional)' : 'Course Name'}
                    rules={[{ required: courseDetailsRequired, message: 'Course Name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              {user?.role === 'student' && (
                <Form.Item
                  name="lecturer_name"
                  label="Course / Supervising Lecturer Name"
                  rules={[{ required: true, message: 'Please select or enter your lecturer name' }]}
                >
                  <Select
                    showSearch
                    placeholder="Select lecturer for this course / booking"
                    options={lecturers.map((l) => ({
                      value: l.name,
                      label: `${l.name} (${l.email})`,
                    }))}
                  />
                </Form.Item>
              )}
            </>
          )}

          <Form.Item
            name="purpose"
            label="Purpose of Booking"
            rules={[{ required: true, message: 'Please explain the purpose of your reservation' }]}
          >
            <Input.TextArea
              rows={3}
            />
          </Form.Item>

          {/* Lecturer recurring options */}
          {(isLecturer || isStaff) && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text strong style={{ fontSize: 13 }}>Repeat weekly</Text>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Auto-schedules this booking on the same day each week
                  </div>
                </div>
                <Switch checked={isRecurring} onChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <Form.Item
                  name="weeks"
                  label="Number of weeks"
                  rules={[
                    { required: true, message: 'Choose how many weeks to repeat this booking' },
                    { type: 'number', min: 1, max: 18, message: 'Choose between 1 and 18 weeks' },
                  ]}
                  style={{ margin: '12px 0 0' }}
                >
                  <InputNumber min={1} max={18} precision={0} style={{ width: 120 }} addonAfter="weeks" />
                </Form.Item>
              )}
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={Boolean(conflict)}
                style={{ fontWeight: 600 }}
              >
                {isLecturer || isStaff ? 'Confirm Reservation' : 'Submit Booking Request'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
