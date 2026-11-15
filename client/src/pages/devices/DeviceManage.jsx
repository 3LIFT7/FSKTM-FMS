import React, { useState, useEffect, useMemo } from 'react';
import { Card, Tabs, Table, Button, Input, Select, Tag, Space, Typography, Popconfirm, Modal, Form, Radio, Row, Col, Empty, Checkbox, message } from 'antd';
import {
  LaptopOutlined,
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  BarcodeOutlined,
  EyeOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import EditDeviceModal from '../../components/EditDeviceModal';
import DeviceDetailModal from '../../components/DeviceDetailModal';
import ImageInputPreview from '../../components/ImageInputPreview';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/date';

const { Text } = Typography;

const ACCESSORY_PRESETS = [
  'Power Adapter / Charger',
  'HDMI Cable',
  'USB-C Cable',
  'Carrying Case / Bag',
  'Remote Control',
  'Wireless Mouse',
  'Controllers (L & R)',
  'Tripod / Stand',
  'Extra Battery',
];

export default function DeviceManage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [devices, setDevices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [approvingLoan, setApprovingLoan] = useState(null);
  const [approvalForm] = Form.useForm();

  // Filter state for inventory
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('All');
  const [inventoryStatus, setInventoryStatus] = useState('All');

  // Modal states
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [viewingDevice, setViewingDevice] = useState(null);
  const [addForm] = Form.useForm();
  const [addMode, setAddMode] = useState('pool');
  const [addHasAccessories, setAddHasAccessories] = useState(false);
  const watchedAddAccessories = Form.useWatch('accessories', addForm) || [];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [loanRes, devRes, locRes] = await Promise.all([
        fetch('/api/device-loans'),
        fetch('/api/devices'),
        fetch('/api/locations'),
      ]);
      const loanData = await loanRes.json();
      const devData = await devRes.json();
      const locData = await locRes.json();

      if (loanData.success) setLoans(loanData.loans);
      if (devData.success) setDevices(devData.devices);
      if (locData.success) setLocations(locData.locations);
    } catch (err) {
      console.error(err);
      message.error('Failed to load device records');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoanAction(loanId, action, extra = {}) {
    setActionLoadingId(loanId);
    try {
      const res = await fetch(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success(`Loan status updated to ${action}`);
      fetchData();
      return true;
    } catch (err) {
      message.error(err.message);
      return false;
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteDevice(deviceId) {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      message.success('Hardware asset deleted');
      fetchData();
    } catch (err) {
      message.error(err.message);
    }
  }

  const handleToggleAddPresetAccessory = (item) => {
    const current = addForm.getFieldValue('accessories') || [];
    if (current.includes(item)) {
      addForm.setFieldsValue({ accessories: current.filter((a) => a !== item) });
    } else {
      addForm.setFieldsValue({ accessories: [...current, item] });
    }
  };

  async function handleCreateDevice(values) {
    try {
      const isLoanable = values.mode === 'pool';
      const locId = isLoanable ? null : values.location_id ? parseInt(values.location_id, 10) : null;
      const cleanedAccessories = addHasAccessories
        ? (values.accessories || []).map((a) => String(a).trim()).filter(Boolean)
        : [];

      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: values.name.trim(),
          category: values.category,
          serial_number: values.serial_number.trim(),
          barcode: values.barcode ? values.barcode.trim() : null,
          specs: values.specs || null,
          accessories: cleanedAccessories,
          image_url: values.image_url ? values.image_url.trim() : null,
          is_loanable: isLoanable,
          location_id: locId,
          status: 'available',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success('New hardware asset registered');
      setIsAddDeviceOpen(false);
      setAddHasAccessories(false);
      addForm.resetFields();
      fetchData();
    } catch (err) {
      message.error(err.message);
    }
  }

  // Filtered inventory
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      if (inventoryCategory !== 'All' && d.category !== inventoryCategory) return false;
      if (inventoryStatus !== 'All' && d.status !== inventoryStatus) return false;
      if (inventorySearch) {
        const q = inventorySearch.toLowerCase();
        const accMatch = Array.isArray(d.accessories) && d.accessories.some((a) => a.toLowerCase().includes(q));
        return (
          d.name.toLowerCase().includes(q) ||
          d.serial_number.toLowerCase().includes(q) ||
          (d.specs && d.specs.toLowerCase().includes(q)) ||
          accMatch
        );
      }
      return true;
    });
  }, [devices, inventoryCategory, inventoryStatus, inventorySearch]);

  const categories = useMemo(() => {
    return ['All', ...new Set(devices.map(d => d.category).filter(Boolean))];
  }, [devices]);

  // Loan Columns
  const loanColumns = [
    {
      title: 'Loan ID',
      dataIndex: 'loan_id',
      key: 'loan_id',
      render: (id) => <Text code>#{id}</Text>,
    },
    {
      title: 'Borrower',
      key: 'user',
      render: (_, record) => (
        <div>
          <Text strong>{record.borrower_name}</Text>
          <div style={{ fontSize: 11, color: '#64748B' }}>
            {record.matric_or_staff_id} • {record.user_role}
          </div>
        </div>
      ),
    },
    {
      title: 'Device & Selected Accessories',
      key: 'device',
      render: (_, record) => {
        const selAcc = Array.isArray(record.selected_accessories) ? record.selected_accessories : [];
        return (
          <div>
            <Text strong>{record.device_name}</Text>
            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
              SN: {record.serial_number}
            </div>
            {selAcc.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {selAcc.map((acc) => (
                  <Tag key={acc} color="geekblue" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 4 }}>
                    + {acc}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Expected Return',
      key: 'return_time',
      render: (_, record) => {
        // Section 8 Rule 3: Overdue devices red Tag with "Overdue" and days late
        const returnDate = dayjs(record.expected_return_time);
        const isLate = record.status === 'checked_out' && dayjs().isAfter(returnDate);
        const daysLate = dayjs().diff(returnDate, 'day');

        return (
          <Space orientation="vertical" size={2}>
            <span style={{ fontSize: 12 }}>{formatDateTime(record.expected_return_time)}</span>
            {isLate && (
              <Tag color="error">
                Overdue {daysLate > 0 ? `${daysLate} day${daysLate > 1 ? 's' : ''}` : 'Today'}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Counter Actions',
      key: 'actions',
      render: (_, record) => {
        const isLoading = actionLoadingId === record.loan_id;
        return (
          <Space size="small">
            {['pending', 'pending_technician'].includes(record.status) && (
              <>
                <Button
                  size="small"
                  type="primary"
                  loading={isLoading}
                  onClick={() => { setApprovingLoan(record); approvalForm.resetFields(); }}
                  style={{ background: '#16A34A', borderColor: '#16A34A' }}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  danger
                  loading={isLoading}
                  onClick={() => handleLoanAction(record.loan_id, 'reject')}
                >
                  Reject
                </Button>
              </>
            )}

            {record.status === 'approved' && (
              <Button
                size="small"
                type="primary"
                loading={isLoading}
                onClick={() => handleLoanAction(record.loan_id, 'checkout')}
              >
                Check Out
              </Button>
            )}

            {record.status === 'checked_out' && (
              <Button
                size="small"
                loading={isLoading}
                onClick={() => handleLoanAction(record.loan_id, 'return')}
                style={{ background: '#059669', borderColor: '#059669', color: '#fff' }}
              >
                Mark Returned
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // Inventory Columns
  const inventoryColumns = [
    {
      title: 'Device Asset',
      key: 'name',
      render: (_, record) => {
        const accessories = Array.isArray(record.accessories) ? record.accessories : [];
        return (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => setViewingDevice(record)}
            title="Click to view full specs & asset details"
          >
            {record.image_url ? (
              <img
                src={record.image_url}
                alt={record.name}
                referrerPolicy="no-referrer"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
                <LaptopOutlined />
              </div>
            )}
            <div>
              <Text strong style={{ fontSize: 13, color: '#1E293B', display: 'block' }}>
                {record.name}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>
                  SN: {record.serial_number}
                </span>
                {record.barcode && (
                  <span style={{ fontSize: 10, color: '#0369A1', background: '#E0F2FE', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                    <BarcodeOutlined style={{ marginRight: 2 }} />
                    {record.barcode}
                  </span>
                )}
                {accessories.length > 0 && (
                  <span style={{ fontSize: 10, color: '#1E40AF', background: '#DBEAFE', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                    <AppstoreAddOutlined style={{ marginRight: 3 }} />
                    {accessories.length} {accessories.length === 1 ? 'Accessory' : 'Accessories'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="blue">{cat || 'Hardware'}</Tag>,
    },
    {
      title: 'Allocation',
      key: 'location',
      render: (_, record) => (
        <div>
          {record.is_loanable ? (
            <Tag color="cyan">Portable Loan Pool</Tag>
          ) : (
            <Tag color="purple">
              {record.location_name || `Room #${record.location_id}`}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Barcode Number',
      dataIndex: 'barcode',
      key: 'barcode',
      render: (barcode) => barcode ? (
        <Tag color="cyan" style={{ fontFamily: 'monospace', fontWeight: 600, padding: '2px 8px' }}>
          <BarcodeOutlined style={{ marginRight: 4 }} />
          {barcode}
        </Tag>
      ) : (
        <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>
          -
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewingDevice(record)}
            title="View Specs & Details"
          >
            Specs
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingDevice(record)}
            title="Edit Asset"
          />
          <Popconfirm
            title="Delete Asset"
            description="Are you sure you want to remove this hardware from inventory?"
            onConfirm={() => handleDeleteDevice(record.device_id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Device Inventory & Loan Counter"
        subtitle="Manage hardware checkout approvals, track returns, and maintain faculty equipment assets."
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setAddHasAccessories(false);
                addForm.resetFields();
                setIsAddDeviceOpen(true);
              }}
              style={{ fontWeight: 600 }}
            >
              Add Hardware Asset
            </Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'loans',
              label: (
                <span>
                  <ClockCircleOutlined style={{ marginRight: 6 }} />
                  Loan Requests & Active Loans ({loans.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={loans}
                  columns={loanColumns}
                  rowKey="loan_id"
                  loading={loading}
                  pagination={false}
                  locale={{ emptyText: <Empty description="No equipment loan records" /> }}
                  size="small"
                />
              ),
            },
            {
              key: 'inventory',
              label: (
                <span>
                  <LaptopOutlined style={{ marginRight: 6 }} />
                  Hardware Asset Inventory ({devices.length})
                </span>
              ),
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Filter bar */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={10}>
                      <Input
                        prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
                        placeholder="Search devices by name, serial, specs, accessories..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={12} md={7}>
                      <Select
                        style={{ width: '100%' }}
                        value={inventoryCategory}
                        onChange={setInventoryCategory}
                        options={categories.map(c => ({ value: c, label: c === 'All' ? 'All Categories' : c }))}
                      />
                    </Col>
                    <Col xs={12} md={7}>
                      <Select
                        style={{ width: '100%' }}
                        value={inventoryStatus}
                        onChange={setInventoryStatus}
                        options={[
                          { value: 'All', label: 'All Statuses' },
                          { value: 'available', label: 'Available' },
                          { value: 'checked_out', label: 'Checked Out' },
                          { value: 'maintenance', label: 'Under Maintenance' },
                        ]}
                      />
                    </Col>
                  </Row>

                  <Table
                    dataSource={filteredDevices}
                    columns={inventoryColumns}
                    rowKey="device_id"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: <Empty description="No hardware equipment found" /> }}
                    size="small"
                    onRow={(record) => ({
                      onClick: (e) => {
                        if (e.target.closest('button') || e.target.closest('.ant-popover') || e.target.closest('.ant-popconfirm')) return;
                        setViewingDevice(record);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(approvingLoan)}
        title={`Approve loan #${approvingLoan?.loan_id}`}
        okText="Approve & Notify Student"
        cancelText="Cancel"
        confirmLoading={actionLoadingId === approvingLoan?.loan_id}
        onCancel={() => setApprovingLoan(null)}
        onOk={() => approvalForm.submit()}
        destroyOnClose
      >
        {Array.isArray(approvingLoan?.selected_accessories) && approvingLoan.selected_accessories.length > 0 && (
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
              Requested Optional Accessories:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {approvingLoan.selected_accessories.map((acc) => (
                <Tag key={acc} color="geekblue" style={{ margin: 0 }}>
                  {acc}
                </Tag>
              ))}
            </div>
          </div>
        )}
        <p>Enter the pickup point the student should go to after approval.</p>
        <Form
          form={approvalForm}
          layout="vertical"
          onFinish={async ({ pickup_location }) => {
            const saved = await handleLoanAction(approvingLoan.loan_id, 'approve', { pickup_location });
            if (saved) setApprovingLoan(null);
          }}
        >
          <Form.Item
            name="pickup_location"
            label="Device pickup location"
            rules={[{ required: true, whitespace: true, message: 'Enter where the student should collect the device' }]}
          >
            <Input.TextArea rows={2} placeholder="e.g. FSKTM Device Counter, Block A, Level 2" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Device Modal */}
      <Modal
        open={isAddDeviceOpen}
        onCancel={() => setIsAddDeviceOpen(false)}
        footer={null}
        destroyOnClose
        centered
        title="Register New Hardware Asset"
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleCreateDevice}
          initialValues={{ category: 'General', mode: 'pool', accessories: [] }}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="Asset / Device Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="serial_number" label="Serial Number" rules={[{ required: true, message: 'Please enter serial number' }]}>
              <Input style={{ textTransform: 'uppercase' }} />
            </Form.Item>

            <Form.Item name="barcode" label="Barcode Number (optional)" extra="Asset tag / barcode">
              <Input prefix={<BarcodeOutlined style={{ color: '#64748B' }} />} allowClear />
            </Form.Item>
          </div>

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Audio/Visual">Audio/Visual</Select.Option>
              <Select.Option value="Forensics">Forensics</Select.Option>
              <Select.Option value="Media">Media</Select.Option>
              <Select.Option value="Networking">Networking</Select.Option>
              <Select.Option value="Testing & Lab">Testing & Lab</Select.Option>
              <Select.Option value="VR / AR">VR / AR</Select.Option>
              <Select.Option value="Workstation">Workstation</Select.Option>
              <Select.Option value="Laptops">Laptops</Select.Option>
              <Select.Option value="Mobile Devices">Mobile Devices</Select.Option>
              <Select.Option value="IoT & Microcontrollers">IoT & Microcontrollers</Select.Option>
              <Select.Option value="General">General Hardware</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="mode" label="Allocation Mode">
            <Radio.Group
              onChange={(e) => setAddMode(e.target.value)}
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

          {addMode === 'room' && (
            <Form.Item name="location_id" label="Assigned Room" rules={[{ required: true }]}>
              <Select
                placeholder="Select assigned room"
                options={locations.map(loc => ({
                  value: loc.location_id,
                  label: `${loc.name} (${loc.code})`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="specs" label="Specifications">
            <Input.TextArea rows={2} placeholder="Optional hardware specs" />
          </Form.Item>

          {/* Optional Accessories Check & Selector */}
          <div
            style={{
              background: addHasAccessories ? '#F0F9FF' : '#F8FAFC',
              border: `1px solid ${addHasAccessories ? '#BAE6FD' : '#E2E8F0'}`,
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
              transition: 'all 0.2s ease',
            }}
          >
            <Checkbox
              checked={addHasAccessories}
              onChange={(e) => {
                const checked = e.target.checked;
                setAddHasAccessories(checked);
                if (!checked) {
                  addForm.setFieldsValue({ accessories: [] });
                }
              }}
              style={{ fontWeight: 600, color: '#0F172A' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AppstoreAddOutlined style={{ color: '#2563EB' }} />
                Device has optional accessories
              </span>
            </Checkbox>
            <div style={{ fontSize: 12, color: '#64748B', marginLeft: 24, marginTop: 2 }}>
              Enable this to list optional accessories (cables, adapters, cases, controllers) so borrowers can choose which ones they need.
            </div>

            {addHasAccessories && (
              <div style={{ marginTop: 12 }}>
                <Form.Item
                  name="accessories"
                  label={<span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>Available Accessories for This Device</span>}
                  style={{ marginBottom: 8 }}
                >
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    placeholder="Type an accessory name and press Enter (or click presets below)..."
                    tokenSeparators={[',']}
                    options={ACCESSORY_PRESETS.map((item) => ({ value: item, label: item }))}
                  />
                </Form.Item>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 11, marginRight: 4 }}>
                    Quick Add:
                  </Text>
                  {ACCESSORY_PRESETS.map((preset) => {
                    const isSelected = watchedAddAccessories.includes(preset);
                    return (
                      <Tag
                        key={preset}
                        color={isSelected ? 'blue' : 'default'}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 6,
                          fontSize: 11,
                          margin: 0,
                          userSelect: 'none',
                          borderStyle: isSelected ? 'solid' : 'dashed',
                        }}
                        onClick={() => handleToggleAddPresetAccessory(preset)}
                      >
                        {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                      </Tag>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <ImageInputPreview
            form={addForm}
            fieldName="image_url"
            label="Device Display Image URL"
            extra="Provide a product image URL or click 'Upload File' to select a photo from your computer."
            presets={[
              { label: 'Laptop', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800' },
              { label: 'VR Headset', url: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800' },
              { label: 'Projector', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800' },
              { label: 'Tablet / iPad', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800' },
            ]}
            saveReminder="Click 'Register Device' below to finish registering this asset."
          />

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsAddDeviceOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Register Device
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Device Detail Modal */}
      {viewingDevice && (
        <DeviceDetailModal
          isOpen={Boolean(viewingDevice)}
          device={viewingDevice}
          onClose={() => setViewingDevice(null)}
          onEdit={(dev) => {
            setViewingDevice(null);
            setEditingDevice(dev);
          }}
        />
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={Boolean(editingDevice)}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={() => fetchData()}
        />
      )}
    </div>
  );
}
