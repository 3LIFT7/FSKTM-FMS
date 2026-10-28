import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Alert, message, Typography } from 'antd';
import { LaptopOutlined, BarcodeOutlined } from '@ant-design/icons';
import ImageInputPreview from './ImageInputPreview';

const { Text } = Typography;

export default function EditDeviceModal({ isOpen, onClose, device, onSaved }) {
  const [form] = Form.useForm();
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allocationMode, setAllocationMode] = useState('pool');

  useEffect(() => {
    if (isOpen && device) {
      setError('');
      fetchLocations();
      const isRoom = Boolean(device.location_id);
      setAllocationMode(isRoom ? 'room' : 'pool');

      form.setFieldsValue({
        name: device.name || '',
        category: device.category || 'General',
        serial_number: device.serial_number || '',
        barcode: device.barcode || '',
        location_id: device.location_id ? String(device.location_id) : undefined,
        status: device.status || 'available',
        specs: device.specs || '',
        image_url: device.image_url || '',
        allocationMode: isRoom ? 'room' : 'pool',
      });
    }
  }, [isOpen, device, form]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleFinish = async (values) => {
    setSaving(true);
    setError('');

    try {
      const isLoanable = values.allocationMode === 'pool';
      const locId = isLoanable ? null : values.location_id ? parseInt(values.location_id, 10) : null;

      if (!isLoanable && !locId) {
        setError('Please select a specific room for in-room equipment.');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/devices/${device.device_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name.trim(),
          category: values.category.trim(),
          serial_number: values.serial_number.trim(),
          barcode: values.barcode ? values.barcode.trim() : null,
          location_id: locId,
          is_loanable: isLoanable,
          status: values.status,
          specs: values.specs ? values.specs.trim() : null,
          image_url: values.image_url ? values.image_url.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update equipment details');

      message.success('Device inventory updated successfully');
      if (onSaved) onSaved(data.device);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          <span>Edit Hardware Asset — {device?.name}</span>
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
            name="name"
            label="Device / Model Name"
            rules={[{ required: true, message: 'Please enter device name' }]}
          >
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="serial_number"
              label="Serial / Asset Number"
              rules={[{ required: true, message: 'Please enter serial number' }]}
            >
              <Input style={{ textTransform: 'uppercase' }} />
            </Form.Item>

            <Form.Item
              name="barcode"
              label="Barcode Number"
              extra="Asset tag / barcode"
            >
              <Input
                prefix={<BarcodeOutlined style={{ color: '#64748B' }} />}
                allowClear
              />
            </Form.Item>
          </div>

          <Form.Item name="category" label="Equipment Category" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Laptops">Laptops</Select.Option>
              <Select.Option value="VR / AR Headsets">VR / AR Headsets</Select.Option>
              <Select.Option value="Mobile Devices">Mobile Devices</Select.Option>
              <Select.Option value="IoT & Microcontrollers">IoT & Microcontrollers</Select.Option>
              <Select.Option value="Audio / Visual">Audio / Visual</Select.Option>
              <Select.Option value="General">General Hardware</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="allocationMode" label="Hardware Allocation Mode">
            <Radio.Group
              onChange={(e) => setAllocationMode(e.target.value)}
              buttonStyle="solid"
              style={{ width: '100%', display: 'flex' }}
            >
              <Radio.Button value="pool" style={{ flex: 1, textAlign: 'center' }}>
                Portable Loan Pool
              </Radio.Button>
              <Radio.Button value="room" style={{ flex: 1, textAlign: 'center' }}>
                Fixed in Lab / Room
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {allocationMode === 'room' && (
            <Form.Item
              name="location_id"
              label="Assigned Room / Facility"
              rules={[{ required: true, message: 'Please select assigned room' }]}
            >
              <Select
                placeholder="Select room"
                showSearch
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={locations.map(loc => ({
                  value: String(loc.location_id),
                  label: `${loc.name} (${loc.code}) — ${loc.floor?.startsWith('Blok') ? loc.floor : `Floor ${loc.floor}`}`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="status" label="Operational Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="available">Available / Operational</Select.Option>
              <Select.Option value="checked_out">Checked Out / On Loan</Select.Option>
              <Select.Option value="maintenance">Under Maintenance / Defective</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="specs" label="Technical Specifications & Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <ImageInputPreview
            form={form}
            fieldName="image_url"
            label="Device Display Image URL"
            extra="Provide a product image URL or click 'Upload File' to select a photo from your computer."
            presets={[
              { label: 'Laptop', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800' },
              { label: 'VR Headset', url: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800' },
              { label: 'Projector', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800' },
              { label: 'Tablet / iPad', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800' },
            ]}
            saveReminder="Click 'Save Changes' below to apply this image to the hardware asset."
          />

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving} style={{ fontWeight: 600 }}>
                Save Changes
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
