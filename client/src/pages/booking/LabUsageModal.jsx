import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, DatePicker, TimePicker, Input, Alert, Button, Row, Col, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { DATE_FORMAT, TIME_FORMAT } from '../../utils/date';

export default function LabUsageModal({ isOpen, onClose, initialLocation, onLogCreated }) {
  const [form] = Form.useForm();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        timeRange: [targetDate.hour(9).minute(0), targetDate.hour(11).minute(0)],
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

  async function handleFinish(values) {
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

          <Form.Item
            name="timeRange"
            label="Lecture Time Window"
            rules={[{ required: true, message: 'Please select start and end time' }]}
          >
            <TimePicker.RangePicker
              style={{ width: '100%' }}
              format={TIME_FORMAT}
              minuteStep={15}
            />
          </Form.Item>

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

