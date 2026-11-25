import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, DatePicker, Input, Button, Alert, Typography, message, Select, Checkbox } from 'antd';
import { LaptopOutlined, AppstoreAddOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { DATE_FORMAT } from '../../utils/date';
import TimeWheelPicker from '../../components/TimeWheelPicker';

const { Text, Title } = Typography;

export default function BorrowDeviceModal({ isOpen, onClose, device, onRequested }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lecturers, setLecturers] = useState([]);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const selectedAccessories = Form.useWatch('selected_accessories', form) || [];

  const availableAccessories = useMemo(() => {
    const raw = device?.accessories;
    if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string' && item.trim());
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string' && item.trim());
      return typeof parsed === 'string' ? parsed.split(',').map((item) => item.trim()).filter(Boolean) : [];
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }, [device?.accessories]);

  useEffect(() => {
    if (isOpen && device) {
      setError('');
      form.resetFields();
      form.setFieldsValue({
        returnDate: dayjs().add(1, 'day'),
        returnTime: '17:00',
        selected_accessories: [],
      });
      if (user?.role === 'student') {
        setLecturers([]);
        setLecturersLoading(true);
        fetch('/api/device-loans/lecturers', { credentials: 'include' })
          .then(async (res) => {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              const responseText = await res.text();
              throw new Error(`Lecturer list API returned a non-JSON response (${res.status}). ${responseText.slice(0, 120)}`);
            }
            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || `Lecturer list request failed (${res.status}).`);
            }
            const lecturerList = Array.isArray(data.lecturers) ? data.lecturers : [];
            setLecturers(lecturerList);
            if (!lecturerList.length) {
              setError('No accounts currently have the Lecturer role. Ask an administrator to check Users & Roles.');
            }
          })
          .catch((err) => {
            setError(`${err.message || 'Could not load lecturer approvers.'} Check that the backend server is running and the device-loans lecturer endpoint is available.`);
          })
          .finally(() => setLecturersLoading(false));
      }
    }
  }, [isOpen, device, form, user?.role]);

  if (!isOpen || !device) return null;

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const datePart = values.returnDate.format('YYYY-MM-DD');
      const timePart = `${values.returnTime}:00`;
      const expected_return_time = new Date(`${datePart}T${timePart}`).toISOString();

      const res = await fetch('/api/device-loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          device_id: device.device_id,
          expected_return_time,
          purpose: values.purpose,
          lecturer_approver_id: values.lecturer_approver_id,
          selected_accessories: values.selected_accessories || [],
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
          {device.location_name && (
            <div style={{ fontSize: 12, color: '#2563EB', marginTop: 2 }}>
              <EnvironmentOutlined style={{ marginRight: 4 }} />
              Location: {device.location_name}
            </div>
          )}
          {device.specs && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Specs: {device.specs}
            </div>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark="optional"
          initialValues={{
            returnDate: dayjs().add(1, 'day'),
            returnTime: '17:00',
            selected_accessories: [],
          }}
        >
          {user?.role === 'student' && (
            <Form.Item
              name="lecturer_approver_id"
              label="Lecturer Approver"
              rules={[{ required: true, message: 'Select a lecturer to review your request' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select a registered lecturer"
                loading={lecturersLoading}
                disabled={lecturersLoading}
                options={lecturers.map((lecturer) => ({
                  value: lecturer.user_id,
                  label: `${lecturer.name} (${lecturer.email})`,
                }))}
                notFoundContent="No registered lecturers found"
              />
            </Form.Item>
          )}

          {availableAccessories.length > 0 && (
            <div
              style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 200px' }}>
                  <AppstoreAddOutlined style={{ color: '#2563EB', flexShrink: 0 }} />
                  <span>Optional Accessories (Choose what you need)</span>
                </span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                    onClick={() => form.setFieldsValue({ selected_accessories: [...availableAccessories] })}
                  >
                    Select All
                  </Button>
                  {selectedAccessories.length > 0 && (
                    <>
                      <span style={{ color: '#CBD5E1' }}>|</span>
                      <Button
                        type="link"
                        size="small"
                        style={{ padding: 0, height: 'auto', fontSize: 12, color: '#64748B' }}
                        onClick={() => form.setFieldsValue({ selected_accessories: [] })}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
                Check the optional accessories you would like to borrow along with this device:
              </div>

              <Form.Item name="selected_accessories" style={{ marginBottom: 0 }}>
                <Checkbox.Group style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                    {availableAccessories.map((acc) => {
                      const isChecked = selectedAccessories.includes(acc);
                      return (
                        <label
                          key={acc}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: isChecked ? '#EFF6FF' : '#FFFFFF',
                            border: `1px solid ${isChecked ? '#3B82F6' : '#E2E8F0'}`,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: isChecked ? 600 : 500,
                            color: '#1E293B',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Checkbox value={acc} style={{ marginRight: 8 }} />
                          <span>{acc}</span>
                        </label>
                      );
                    })}
                  </div>
                </Checkbox.Group>
              </Form.Item>
            </div>
          )}

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
            <TimeWheelPicker />
          </Form.Item>

          <Form.Item
            name="purpose"
            label="Intended Academic Purpose / Project"
            rules={[{ required: true, message: 'Please enter loan purpose' }]}
          >
            <Input.TextArea
              rows={3}
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
