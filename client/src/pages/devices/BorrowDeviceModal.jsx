import React, { useState, useEffect } from 'react';
import { Modal, Form, DatePicker, TimePicker, Input, Button, Alert, Typography, message } from 'antd';
import { LaptopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { DATE_FORMAT, TIME_FORMAT } from '../../utils/date';

const { Text, Title } = Typography;

export default function BorrowDeviceModal({ isOpen, onClose, device, onRequested }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && device) {
      setError('');
      form.resetFields();
      form.setFieldsValue({
        returnDate: dayjs().add(1, 'day'),
        returnTime: dayjs().hour(17).minute(0),
      });
    }
  }, [isOpen, device, form]);

  if (!isOpen || !device) return null;

  if (!device.is_loanable || device.location_id !== null) {
    return (
      <Modal open={isOpen} onCancel={onClose} footer={null} centered title="Fixed Facility Hardware">
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <LaptopOutlined style={{ fontSize: 36, color: '#F59E0B', marginBottom: 12 }} />
          <Title level={4} style={{ margin: '0 0 8px 0' }}>Non-Reservable Hardware</Title>
          <p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>
            <strong>{device.name}</strong> is permanently assigned to <strong>{device.location_name || 'a faculty facility'}</strong> as in-room laboratory hardware and cannot be borrowed individually.
          </p>
          <Button type="primary" onClick={onClose} style={{ marginTop: 16 }}>
            Understood
          </Button>
        </div>
      </Modal>
    );
  }

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const datePart = values.returnDate.format('YYYY-MM-DD');
      const timePart = values.returnTime.format('HH:mm:00');
      const expected_return_time = `${datePart}T${timePart}`;

      const res = await fetch('/api/device-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_id: device.device_id,
          expected_return_time,
          purpose: values.purpose,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit loan request');

      message.success(data.message || 'Loan request registered successfully!');
      if (onRequested) onRequested();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LaptopOutlined style={{ color: '#1E3A8A' }} />
          <span>Request Hardware Loan — {device.name}</span>
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

        <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 700, color: '#0F172A' }}>{device.name}</div>
          <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>
            Serial Number: {device.serial_number}
          </div>
          {device.specs && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Specs: {device.specs}
            </div>
          )}
        </div>

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
          <Form.Item
            name="returnDate"
            label="Expected Return Date"
            rules={[{ required: true, message: 'Please select return date' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format={DATE_FORMAT}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="returnTime"
            label="Expected Return Time"
            rules={[{ required: true, message: 'Please select return time' }]}
          >
            <TimePicker style={{ width: '100%' }} format={TIME_FORMAT} minuteStep={15} />
          </Form.Item>

          <Form.Item
            name="purpose"
            label="Intended Academic Purpose / Project"
            rules={[{ required: true, message: 'Please enter loan purpose' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="e.g. Final Year Project VR testing, mobile usability study"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ fontWeight: 600 }}>
                Submit Loan Request
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
