import React from 'react';
import { Modal, Descriptions, Tag, Button, Typography, Space, message, Card } from 'antd';
import {
  LaptopOutlined,
  EditOutlined,
  BarcodeOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import StatusTag from './StatusTag';

const { Text, Title, Paragraph } = Typography;

export default function DeviceDetailModal({ isOpen, onClose, device, onEdit, canEdit = true }) {
  if (!device) return null;

  const copyBarcode = () => {
    if (device.barcode) {
      navigator.clipboard.writeText(device.barcode);
      message.success(`Copied barcode "${device.barcode}" to clipboard!`);
    }
  };

  const copySerial = () => {
    if (device.serial_number) {
      navigator.clipboard.writeText(device.serial_number);
      message.success(`Copied serial number "${device.serial_number}" to clipboard!`);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Asset ID: #{device.device_id}
          </Text>
          <Space>
            <Button onClick={onClose}>Close</Button>
            {canEdit && onEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onEdit(device);
                }}
              >
                Edit Asset
              </Button>
            )}
          </Space>
        </div>
      }
      centered
      destroyOnClose
      width={640}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#EFF6FF',
                color: '#1E3A8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              <LaptopOutlined />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', lineHeight: 1.2 }}>
                {device.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {device.category || 'Hardware'}
              </div>
            </div>
          </div>
          <StatusTag status={device.status} />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 12 }}>
        {/* Device Image Banner if available */}
        {device.image_url && (
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              maxHeight: 180,
              background: '#F8FAFC',
            }}
          >
            <img
              src={device.image_url}
              alt={device.name}
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.target.parentElement.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Barcode & Serial Identifiers Section */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarcodeOutlined style={{ color: '#2563EB' }} />
            <span>Asset Identifiers & Barcode</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Barcode Block */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Barcode Number
                </span>
                {device.barcode && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={copyBarcode}
                    style={{ fontSize: 11, height: 22, padding: '0 6px', color: '#2563EB' }}
                  >
                    Copy
                  </Button>
                )}
              </div>

              {device.barcode ? (
                <div>
                  {/* Simulated barcode visual bars */}
                  <div
                    style={{
                      height: 24,
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 2,
                      marginBottom: 6,
                      padding: '2px 4px',
                      background: '#F8FAFC',
                      borderRadius: 4,
                      justifyContent: 'center'
                    }}
                    title={device.barcode}
                  >
                    {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 1].map((w, i) => (
                      <div
                        key={i}
                        style={{
                          width: w,
                          background: i % 2 === 0 ? '#0F172A' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                  <Text code copyable={false} style={{ fontSize: 12, fontWeight: 700, display: 'block', textAlign: 'center', color: '#0F172A' }}>
                    {device.barcode}
                  </Text>
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                  No barcode registered
                </Text>
              )}
            </div>

            {/* Serial Number Block */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Serial Number (SN)
                </span>
                {device.serial_number && (
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={copySerial}
                    style={{ fontSize: 11, height: 22, padding: '0 6px', color: '#2563EB' }}
                  >
                    Copy
                  </Button>
                )}
              </div>
              <div style={{ padding: '8px 0' }}>
                <Text code style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>
                  {device.serial_number}
                </Text>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications & Notes Section */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileTextOutlined style={{ color: '#2563EB' }} />
            <span>Technical Specifications & Notes</span>
          </div>

          <div
            style={{
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            {device.specs ? (
              <Paragraph
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#0C4A6E',
                  whiteSpace: 'pre-line',
                }}
              >
                {device.specs}
              </Paragraph>
            ) : (
              <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: 12 }}>
                No technical specifications or notes recorded for this hardware item.
              </div>
            )}
          </div>
        </div>

        {/* Hardware Details Table */}
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Category">
            <Tag color="blue">{device.category || 'General'}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Allocation Mode">
            {device.is_loanable ? (
              <Tag color="cyan">Portable Loan Pool (Available for student/staff checkout)</Tag>
            ) : (
              <Tag color="purple">Fixed In Lab / Room (Dedicated Facility Equipment)</Tag>
            )}
          </Descriptions.Item>

          {!device.is_loanable && (
            <Descriptions.Item label="Assigned Location">
              <span style={{ fontWeight: 600, color: '#1E293B' }}>
                <EnvironmentOutlined style={{ marginRight: 6, color: '#2563EB' }} />
                {device.location_name || `Room #${device.location_id}`}
                {device.location_code ? ` (${device.location_code})` : ''}
                {device.location_floor ? ` — ${device.location_floor?.startsWith('Blok') ? device.location_floor : `Floor ${device.location_floor}`}` : ''}
              </span>
            </Descriptions.Item>
          )}

          <Descriptions.Item label="Operational Status">
            <StatusTag status={device.status} />
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
}
