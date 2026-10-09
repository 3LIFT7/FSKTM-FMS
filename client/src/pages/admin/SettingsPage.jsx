import React, { useState, useEffect } from 'react';
import { Card, Form, TimePicker, InputNumber, Switch, Button, Alert, Typography, message, Space, Row, Col } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '../../components/PageHeader';
import { TIME_FORMAT } from '../../utils/date';

const { Text, Paragraph } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        form.setFieldsValue({
          device_booking_requires_approval: s.device_booking_requires_approval === 'true',
          operating_hours_start: s.operating_hours_start ? dayjs(`2000-01-01T${s.operating_hours_start}`) : dayjs('2000-01-01T08:00'),
          operating_hours_end: s.operating_hours_end ? dayjs(`2000-01-01T${s.operating_hours_end}`) : dayjs('2000-01-01T20:00'),
          max_booking_duration_hours: parseInt(s.max_booking_duration_hours || '4', 10),
        });
      }
    } catch (err) {
      console.error(err);
      message.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish(values) {
    setSaving(true);
    try {
      const payload = {
        settings: {
          device_booking_requires_approval: String(values.device_booking_requires_approval),
          operating_hours_start: values.operating_hours_start.format('HH:mm'),
          operating_hours_end: values.operating_hours_end.format('HH:mm'),
          max_booking_duration_hours: String(values.max_booking_duration_hours),
        },
      };

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      message.success('System configuration updated successfully');
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <PageHeader
        title="Faculty System Configuration"
        subtitle="Manage facility operational hours, maximum reservation limits, and equipment checkout approval policies."
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark="optional"
        >
          <div style={{ marginBottom: 24, padding: '16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ minWidth: 200, flex: 1 }}>
                <Text strong style={{ fontSize: 14 }}>
                  Equipment Loans Require Technician Approval
                </Text>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  When enabled, all hardware loan requests must be approved by counter technicians before handover.
                </div>
              </div>
              <Form.Item name="device_booking_requires_approval" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="operating_hours_start"
                label="Daily Facility Opening Time"
                rules={[{ required: true }]}
              >
                <TimePicker format={TIME_FORMAT} style={{ width: '100%' }} minuteStep={30} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="operating_hours_end"
                label="Daily Facility Closing Time"
                rules={[{ required: true }]}
              >
                <TimePicker format={TIME_FORMAT} style={{ width: '100%' }} minuteStep={30} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="max_booking_duration_hours"
            label="Maximum Single Slot Reservation Duration (Hours)"
            rules={[{ required: true }]}
            extra="Limits the continuous duration a student or lecturer may reserve a laboratory per session."
          >
            <InputNumber min={1} max={12} style={{ width: '100%' }} suffix="Hours" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SaveOutlined />}
              loading={saving}
              style={{ fontWeight: 600 }}
            >
              Save System Configuration
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
