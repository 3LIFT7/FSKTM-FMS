import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, DatePicker, Input, Alert, Button, Space, Tag, Row, Col, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DATE_FORMAT } from '../../utils/date';

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

export default function LabUsageModal({ isOpen, onClose, initialLocation, onLogCreated }) {
  const [form] = Form.useForm();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStartTime = Form.useWatch('startTime', form);
  const selectedEndTime = Form.useWatch('endTime', form);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      form.resetFields();
      setError('');

      const targetDate = dayjs();
      const locId = initialLocation ? initialLocation.location_id : undefined;

      form.setFieldsValue({
        location_id: locId,
        date: targetDate,
        startTime: '09:00',
        endTime: '11:00',
      });
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

  const selectableRooms = useMemo(() => {
    return locations.filter((loc) => loc.status !== 'maintenance');
  }, [locations]);

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

  const startTimeOptions = useMemo(() => {
    return TIME_SLOTS.slice(0, -1).map((t) => ({
      value: t,
      label: t,
    }));
  }, []);

  const endTimeOptions = useMemo(() => {
    const currentStart = selectedStartTime || '08:00';
    return TIME_SLOTS.filter((t) => t > currentStart).map((t) => ({
      value: t,
      label: t,
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
    if (!values.startTime || !values.endTime) {
      setError('Please select start and end time');
      return;
    }
    if (values.endTime <= values.startTime) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const chosenDateStr = values.date.format('YYYY-MM-DD');
      const startTimeStr = `${chosenDateStr}T${values.startTime}:00`;
      const endTimeStr = `${chosenDateStr}T${values.endTime}:00`;

      const payload = {
        location_id: values.location_id,
        start_time: startTimeStr,
        end_time: endTimeStr,
        course_id: values.course_id ? values.course_id.toUpperCase().trim() : '',
        course_name: values.course_name ? values.course_name.trim() : '',
        purpose: values.purpose ? values.purpose.trim() : '',
      };

      const res = await fetch('/api/lab-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record lecture attendance / lab usage');

      message.success(data.message || 'Lecture attendance & lab usage recorded!');
      if (onLogCreated) onLogCreated();
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
          <span>Lecture Attendance & Lab Usage Log</span>
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

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
          <Form.Item
            name="location_id"
            label="Lab / Room Facility"
            rules={[{ required: true, message: 'Please select a lab or room' }]}
            extra="Rooms under active maintenance are automatically hidden."
          >
            <Select
              placeholder="Select available classroom or lab"
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={selectableRooms.map((loc) => ({
                value: loc.location_id,
                label: `${loc.name} (${loc.code}) — ${loc.floor?.startsWith('Blok') ? loc.floor : `Floor ${loc.floor}`} • Capacity: ${loc.capacity}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Attendance Date"
            rules={[{ required: true, message: 'Please select attendance date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format={DATE_FORMAT}
            />
          </Form.Item>

          {/* Lecture Time Window */}
          <div style={{ marginBottom: 16, background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#1E293B', fontSize: 14 }}>
                <ClockCircleOutlined style={{ marginRight: 6, color: '#2563EB' }} />
                Lecture Time Window
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

          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="course_id"
                label="Course Code"
                rules={[{ required: true, message: 'Course Code is required' }]}
              >
                <Input style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item
                name="course_name"
                label="Course Name"
                rules={[{ required: true, message: 'Course Name is required' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="purpose"
            label="Purpose of Usage / Lecture Notes"
            rules={[{ required: true, message: 'Please enter the lecture topic or purpose of lab usage' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ fontWeight: 600, background: '#1E3A8A', borderColor: '#1E3A8A' }}
              >
                Confirm Attendance
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}

