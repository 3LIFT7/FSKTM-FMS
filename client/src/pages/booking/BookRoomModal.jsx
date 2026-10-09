import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, DatePicker, TimePicker, Input, Switch, Alert, Button, Space, Typography, Tag, message } from 'antd';
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

export default function BookRoomModal({ isOpen, onClose, initialLocation, onBookingCreated }) {
  const { user, isLecturer, isStaff } = useAuth();
  const [form] = Form.useForm();

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [existingBookingsOnDate, setExistingBookingsOnDate] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Watch form values for conflict detection
  const selectedDate = Form.useWatch('date', form);
  const selectedTimeRange = Form.useWatch('timeRange', form);
  const watchedLocationId = Form.useWatch('location_id', form);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      form.resetFields();
      setError('');
      setIsRecurring(false);

      if (initialLocation) {
        setSelectedLocationId(initialLocation.location_id);
        form.setFieldsValue({
          location_id: initialLocation.location_id,
          date: dayjs(),
          timeRange: [dayjs().hour(9).minute(0), dayjs().hour(11).minute(0)],
        });
      } else {
        form.setFieldsValue({
          date: dayjs(),
          timeRange: [dayjs().hour(9).minute(0), dayjs().hour(11).minute(0)],
        });
      }
    }
  }, [isOpen, initialLocation, form]);

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
      const startOfDay = `${chosenDateStr}T00:00:00`;
      const endOfDay = `${chosenDateStr}T23:59:59`;
      const res = await fetch(`/api/bookings?location_id=${locationId}&startDate=${startOfDay}&endDate=${endOfDay}`);
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
    if (!selectedDate || !selectedTimeRange || !selectedTimeRange[0] || !selectedTimeRange[1]) {
      return null;
    }
    const chosenDateStr = selectedDate.format('YYYY-MM-DD');
    const startStr = `${chosenDateStr}T${selectedTimeRange[0].format('HH:mm:00')}`;
    const endStr = `${chosenDateStr}T${selectedTimeRange[1].format('HH:mm:00')}`;

    const reqStart = new Date(startStr);
    const reqEnd = new Date(endStr);

    for (const b of existingBookingsOnDate) {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      // Overlap condition
      if (reqStart < bEnd && reqEnd > bStart) {
        return b;
      }
    }
    return null;
  }, [selectedDate, selectedTimeRange, existingBookingsOnDate]);

  async function handleFinish(values) {
    if (conflict) {
      setError('Cannot submit booking due to schedule overlap with an existing slot.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const chosenDateStr = values.date.format('YYYY-MM-DD');
      const startTimeStr = `${chosenDateStr}T${values.timeRange[0].format('HH:mm:00')}`;
      const endTimeStr = `${chosenDateStr}T${values.timeRange[1].format('HH:mm:00')}`;

      const payload = {
        location_id: values.location_id,
        start_time: startTimeStr,
        end_time: endTimeStr,
        purpose: values.purpose,
        course_id: values.course_id || null,
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
                label: `${loc.name} (${loc.code}) — Floor ${loc.floor} • Capacity: ${loc.capacity}`,
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

          <Form.Item
            name="timeRange"
            label="Reservation Time Window"
            rules={[{ required: true, message: 'Please select start and end time' }]}
          >
            <TimePicker.RangePicker
              style={{ width: '100%' }}
              format={TIME_FORMAT}
              minuteStep={15}
            />
          </Form.Item>

          {isLecturer && (
            <Form.Item name="course_id" label="Course Code (Optional)">
              <Input placeholder="e.g. WIX1002 or WIE2001" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          )}

          <Form.Item
            name="purpose"
            label="Purpose of Booking"
            rules={[{ required: true, message: 'Please explain the purpose of your reservation' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="e.g. Software Engineering practical session, student team project discussion"
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
                  <Text strong style={{ fontSize: 13 }}>Repeat for Entire Semester (14 Weeks)</Text>
                  <div style={{ fontSize: 11, color: '#64748B' }}>
                    Auto-schedules recurring bookings on this day each week
                  </div>
                </div>
                <Switch checked={isRecurring} onChange={setIsRecurring} />
              </div>
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
