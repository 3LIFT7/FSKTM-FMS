import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Upload, Button, Alert, message, Typography } from 'antd';
import { AlertOutlined, UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

export default function NewIssueModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      form.resetFields();
      setFileList([]);
      setError('');
    }
  }, [isOpen, form]);

  async function fetchData() {
    try {
      const [locRes, devRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/devices'),
      ]);
      const locData = await locRes.json();
      const devData = await devRes.json();
      if (locData.success) setLocations(locData.locations);
      if (devData.success) setDevices(devData.devices);
    } catch (err) {
      console.error(err);
    }
  }

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      if (values.location_id) formData.append('location_id', values.location_id);
      if (values.device_id) formData.append('device_id', values.device_id);
      formData.append('description', values.description);

      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('photo', fileList[0].originFileObj);
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

      message.success('Breakdown report submitted! Technicians have been notified.');
      if (onCreated) onCreated();
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
          <AlertOutlined style={{ color: '#DC2626' }} />
          <span>Report Facility Damage / Equipment Breakdown</span>
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
          <Form.Item name="location_id" label="Affected Facility / Laboratory Room">
            <Select
              placeholder="Select affected room or lab"
              allowClear
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={locations.map(loc => ({
                value: loc.location_id,
                label: `${loc.name} (${loc.code}) — Floor ${loc.floor}`,
              }))}
            />
          </Form.Item>

          <Form.Item name="device_id" label="Faulty Device / Hardware (Optional)">
            <Select
              placeholder="Select specific equipment (if applicable)"
              allowClear
              showSearch
              filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={devices.map(dev => ({
                value: dev.device_id,
                label: `${dev.name} (SN: ${dev.serial_number})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Defect Description & Symptoms"
            rules={[{ required: true, message: 'Please describe the observed damage or breakdown' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="e.g. Projector in Lab 3 displays flickering green lines and does not power on properly after 5 minutes."
            />
          </Form.Item>

          <Form.Item label="Attach Evidence Photo">
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
              beforeUpload={() => false}
              maxCount={1}
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8, fontSize: 12 }}>Upload Photo</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" danger htmlType="submit" loading={loading} style={{ fontWeight: 600 }}>
                Submit Breakdown Ticket
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
