import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, DatePicker, Button, Alert, message, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { DATE_FORMAT } from '../../utils/date';

const { Text } = Typography;

export default function LogMaintenanceModal({ isOpen, onClose, prefillTicket, onLogged }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      form.resetFields();
      setError('');

      if (prefillTicket) {
        form.setFieldsValue({
          location_id: prefillTicket.location_id ? String(prefillTicket.location_id) : undefined,
          device_id: prefillTicket.device_id ? String(prefillTicket.device_id) : undefined,
          linked_report_id: String(prefillTicket.report_id),
          description: `Repair service for Ticket #${prefillTicket.report_id}: ${prefillTicket.description}`,
          date_performed: dayjs(),
          cost: 0,
          set_status: 'available',
        });
      } else {
        form.setFieldsValue({
          date_performed: dayjs(),
          cost: 0,
        });
      }
    }
  }, [isOpen, prefillTicket, form]);

  async function fetchDropdowns() {
    try {
      const [locRes, devRes, repRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/devices'),
        fetch('/api/issues'),
      ]);
      const locData = await locRes.json();
      const devData = await devRes.json();
      const repData = await repRes.json();

      if (locData.success) setLocations(locData.locations);
      if (devData.success) setDevices(devData.devices);
      if (repData.success) setReports(repData.reports);
    } catch (err) {
      console.error(err);
    }
  }

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const payload = {
        location_id: values.location_id ? parseInt(values.location_id, 10) : null,
        device_id: values.device_id ? parseInt(values.device_id, 10) : null,
        description: values.description,
        cost: values.cost || 0.0,
        date_performed: values.date_performed.format('YYYY-MM-DD'),
        linked_report_id: values.linked_report_id ? parseInt(values.linked_report_id, 10) : null,
        scheduled_reminder_date: values.scheduled_reminder_date ? values.scheduled_reminder_date.format('YYYY-MM-DD') : null,
        set_status: values.set_status || null,
      };

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record maintenance');

      message.success('Maintenance job logged successfully!');
      if (onLogged) onLogged();
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
      width={560}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToolOutlined style={{ color: '#1E3A8A' }} />
          <span>Log Facility / Hardware Servicing Job</span>
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
          <Form.Item name="location_id" label="Facility Location">
            <Select
              placeholder="Select lab or classroom"
              allowClear
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={locations.map(loc => ({
                value: String(loc.location_id),
                label: `${loc.name} (${loc.code}) — ${loc.floor?.startsWith('Blok') ? loc.floor : `Floor ${loc.floor}`}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="device_id" label="Equipment / Device Asset">
            <Select
              placeholder="Select hardware item (if applicable)"
              allowClear
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={devices.map(dev => ({
                value: String(dev.device_id),
                label: `${dev.name} (SN: ${dev.serial_number})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="linked_report_id" label="Linked Breakdown Ticket (Optional)">
            <Select
              placeholder="Link to an open issue report"
              allowClear
              options={reports.map(r => ({
                value: String(r.report_id),
                label: `Ticket #${r.report_id} — ${r.description.slice(0, 50)}...`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Service Work Details & Actions Taken"
            rules={[{ required: true, message: 'Please describe the maintenance work performed' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="cost"
              label="Cost Incurred (MYR)"
              rules={[{ required: true, message: 'Cost is required' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="MYR"
              />
            </Form.Item>

            <Form.Item
              name="date_performed"
              label="Date Performed"
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: '100%' }} format={DATE_FORMAT} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="scheduled_reminder_date" label="Next Calibration / Check-up Reminder">
              <DatePicker style={{ width: '100%' }} format={DATE_FORMAT} />
            </Form.Item>

            <Form.Item name="set_status" label="Update Target Operational Status">
              <Select placeholder="Keep current status" allowClear>
                <Select.Option value="available">Set to Available / Resolved</Select.Option>
                <Select.Option value="maintenance">Keep Under Maintenance</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ fontWeight: 600 }}>
                Record Maintenance Log
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
