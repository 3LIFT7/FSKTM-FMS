import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Button, Space, Typography, Tag, Table, Popconfirm, Spin, Alert, Modal, message } from 'antd';
import {
  CalendarOutlined,
  ToolOutlined,
  EditOutlined,
  LaptopOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import EditRoomModal from '../../components/EditRoomModal';
import EditDeviceModal from '../../components/EditDeviceModal';
import ClassroomQRPlacard from '../../components/ClassroomQRPlacard';
import StatusTag from '../../components/StatusTag';

const { Text, Title, Paragraph } = Typography;

export default function RoomDetailModal({ locationId, onClose, onBookClick, onStatusChanged, onRoomUpdated }) {
  const { isStaff, isManager, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Sub-modals
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [isQRPlacardOpen, setIsQRPlacardOpen] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    fetchDetails();
  }, [locationId]);

  async function fetchDetails() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/locations/${locationId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load room details');
      setData(json.location);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!data) return;
    const newStatus = data.status === 'maintenance' ? 'available' : 'maintenance';
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/locations/${data.location_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          reason: `Manual status change by ${user?.name} (${user?.role})`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Status update failed');
      setData(prev => ({ ...prev, status: newStatus }));
      message.success(`Room status changed to ${newStatus}`);
      if (onStatusChanged) onStatusChanged(data.location_id, newStatus);
      if (onRoomUpdated) onRoomUpdated();
    } catch (err) {
      message.error(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  const deviceColumns = [
    {
      title: 'Equipment',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
            SN: {record.serial_number}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => <StatusTag status={status} />,
    },
    ...(isStaff
      ? [
          {
            title: 'Action',
            key: 'action',
            width: 70,
            render: (_, record) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => setEditingDevice(record)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Drawer
        title={
          data ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{data.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Code: {data.code}</div>
              </div>
              <StatusTag status={data.status} />
            </div>
          ) : (
            'Facility Details'
          )
        }
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 480 ? '100%' : 480}
        open={Boolean(locationId)}
        onClose={onClose}
        extra={
          isStaff && data && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditRoomOpen(true)}
            >
              Edit
            </Button>
          )
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : error ? (
          <Alert type="error" message={error} showIcon />
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status Alert for maintenance */}
            {data.status === 'maintenance' && (
              <Alert
                type="warning"
                showIcon
                icon={<ToolOutlined />}
                message="Under Active Maintenance"
                description="This facility is currently offline for repairs and automatically hidden from booking reservation calendars."
              />
            )}

            {/* Room Descriptions (Section 6) */}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Floor Level">{data.floor}</Descriptions.Item>
              <Descriptions.Item label="Seating Capacity">{data.capacity} seats</Descriptions.Item>
              <Descriptions.Item label="Category">{data.category || 'Laboratory'}</Descriptions.Item>
              <Descriptions.Item label="Description">{data.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="Current Status">
                <StatusTag status={data.status} />
              </Descriptions.Item>
            </Descriptions>

            {/* In-room Equipment Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14 }}>
                  In-Room Installed Hardware ({data.devices?.length || 0})
                </Text>
              </div>
              <Table
                dataSource={data.devices || []}
                columns={deviceColumns}
                rowKey="device_id"
                size="small"
                pagination={false}
                locale={{ emptyText: 'No dedicated equipment recorded in this room' }}
                scroll={{ x: 'max-content' }}
              />
            </div>

            {/* Action Buttons based on User Role */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {data.status !== 'maintenance' ? (
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={<CalendarOutlined />}
                    onClick={() => {
                      onClose();
                      if (onBookClick) onBookClick(data);
                    }}
                    style={{ fontWeight: 600 }}
                  >
                    Book This Facility
                  </Button>
                ) : (
                  <Button block size="large" disabled>
                    Unavailable for Booking (Under Maintenance)
                  </Button>
                )}

                {isStaff && (
                  <Popconfirm
                    title="Change Facility Operational Status"
                    description={`Toggle this facility status to ${data.status === 'maintenance' ? 'Available' : 'Maintenance'}?`}
                    onConfirm={handleToggleStatus}
                    okText="Yes, Toggle"
                    cancelText="Cancel"
                  >
                    <Button
                      block
                      loading={statusUpdating}
                      style={{
                        background: data.status === 'maintenance' ? '#16A34A' : '#F59E0B',
                        borderColor: data.status === 'maintenance' ? '#16A34A' : '#F59E0B',
                        color: '#FFFFFF',
                        fontWeight: 600,
                      }}
                    >
                      {data.status === 'maintenance' ? 'Restore to Operational (Available)' : 'Place Under Maintenance'}
                    </Button>
                  </Popconfirm>
                )}

                <Button
                  block
                  icon={<QrcodeOutlined />}
                  onClick={() => setIsQRPlacardOpen(true)}
                  style={{
                    fontWeight: 600,
                    color: '#1E3A8A',
                    borderColor: '#93C5FD',
                    background: '#EFF6FF'
                  }}
                >
                  View / Print Classroom QR Placard
                </Button>
              </Space>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Classroom QR Placard Modal */}
      {isQRPlacardOpen && data && (
        <Modal
          open={isQRPlacardOpen}
          onCancel={() => setIsQRPlacardOpen(false)}
          footer={null}
          width={680}
          centered
          destroyOnClose
        >
          <ClassroomQRPlacard location={data} />
        </Modal>
      )}

      {/* Edit Room Modal */}
      {isEditRoomOpen && data && (
        <EditRoomModal
          isOpen={isEditRoomOpen}
          location={data}
          onClose={() => setIsEditRoomOpen(false)}
          onSaved={() => {
            fetchDetails();
            if (onRoomUpdated) onRoomUpdated();
          }}
        />
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={Boolean(editingDevice)}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={() => fetchDetails()}
        />
      )}
    </>
  );
}
