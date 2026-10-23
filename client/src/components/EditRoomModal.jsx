import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Space, Table, Popconfirm, Alert, Typography, message } from 'antd';
import { AppstoreOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import StatusTag from './StatusTag';

const { Text } = Typography;

export default function EditRoomModal({ isOpen, onClose, location, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assignedDevices, setAssignedDevices] = useState([]);
  const [allInventoryDevices, setAllInventoryDevices] = useState([]);
  const [selectedDeviceToAssign, setSelectedDeviceToAssign] = useState(undefined);

  useEffect(() => {
    if (isOpen && location) {
      setError('');
      fetchInventory();
      fetchRoomFullDevices();

      form.setFieldsValue({
        name: location.name,
        code: location.code,
        floor: location.floor,
        capacity: location.capacity || 30,
        category: location.category || 'Computer Lab',
        description: location.description || '',
        status: location.status || 'available',
      });
    }
  }, [isOpen, location, form]);

  async function fetchRoomFullDevices() {
    try {
      const res = await fetch(`/api/locations/${location.location_id}`);
      const data = await res.json();
      if (data.success && data.location?.devices) {
        setAssignedDevices(data.location.devices);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchInventory() {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setAllInventoryDevices(data.devices);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleAssignDevice() {
    if (!selectedDeviceToAssign) return;
    const devId = parseInt(selectedDeviceToAssign, 10);
    const dev = allInventoryDevices.find(d => d.device_id === devId);
    if (!dev) return;

    if (!assignedDevices.some(d => d.device_id === devId)) {
      setAssignedDevices(prev => [...prev, dev]);
    }
    setSelectedDeviceToAssign(undefined);
  }

  function handleRemoveDevice(deviceId) {
    setAssignedDevices(prev => prev.filter(d => d.device_id !== deviceId));
  }

  const handleFinish = async (values) => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/locations/${location.location_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...values,
          device_ids: assignedDevices.map(d => d.device_id),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update room details');

      message.success('Facility details updated successfully');
      if (onSaved) onSaved(data.location);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deviceColumns = [
    {
      title: 'Device',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Serial Number',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (sn) => <Text code>{sn}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDevice(record.device_id)}
        />
      ),
    },
  ];

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={680}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined style={{ color: '#1E3A8A' }} />
          <span>Edit Facility — {location?.name}</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Form.Item name="name" label="Facility / Room Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. Makmal Software Engineering (MSD)" />
            </Form.Item>

            <Form.Item name="code" label="Room Code" rules={[{ required: true }]}>
              <Input placeholder="MSD" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="floor" label="Floor Level" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Ground">Ground Floor</Select.Option>
                <Select.Option value="First">First Floor</Select.Option>
                <Select.Option value="Second">Second Floor</Select.Option>
                <Select.Option value="Third">Third Floor</Select.Option>
                <Select.Option value="Blok B8">Blok B8</Select.Option>
                <Select.Option value="Blok C12">Blok C12</Select.Option>
                <Select.Option value="Blok L Perpustakaan">Blok L Perpustakaan</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="capacity" label="Seat Capacity" rules={[{ required: true }]}>
              <InputNumber min={1} max={500} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="status" label="Operational Status" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="available">Available</Select.Option>
                <Select.Option value="maintenance">Maintenance</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="category" label="Category">
            <Select>
              <Select.Option value="Computer Lab">Computer Lab</Select.Option>
              <Select.Option value="Classroom">Classroom</Select.Option>
              <Select.Option value="Auditorium">Auditorium</Select.Option>
              <Select.Option value="Research Lab">Research Lab</Select.Option>
              <Select.Option value="Meeting Room">Meeting Room</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Facility Description & Facilities">
            <Input.TextArea rows={2} placeholder="Projector, Whiteboard, 40 PC Terminals, Air conditioned" />
          </Form.Item>

          {/* Assigned In-Room Equipment Section */}
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Assigned In-Room Equipment ({assignedDevices.length})
            </Text>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <Select
                placeholder="Assign hardware item from inventory"
                style={{ flex: 1 }}
                value={selectedDeviceToAssign}
                onChange={setSelectedDeviceToAssign}
                showSearch
                filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={allInventoryDevices
                  .filter(d => !assignedDevices.some(ad => ad.device_id === d.device_id))
                  .map(d => ({
                    value: String(d.device_id),
                    label: `${d.name} (${d.serial_number})`,
                  }))}
              />
              <Button icon={<PlusOutlined />} onClick={handleAssignDevice}>
                Assign Item
              </Button>
            </div>

            <Table
              dataSource={assignedDevices}
              columns={deviceColumns}
              rowKey="device_id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'No dedicated equipment assigned to this facility' }}
              scroll={{ x: 'max-content' }}
            />
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving} style={{ fontWeight: 600 }}>
                Save Facility Changes
              </Button>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
