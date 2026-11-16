import React, { useRef } from 'react';
import { Button, Card, Descriptions, QRCode, Space, Tag, Typography, message } from 'antd';
import {
  CompassOutlined,
  CopyOutlined,
  DownloadOutlined,
  LinkOutlined,
  PrinterOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ClassroomQRPlacard({ location, isPrintPreview = false }) {
  const placardRef = useRef(null);

  if (!location) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${baseUrl}/qr/${encodeURIComponent(location.code || location.location_id)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      message.success('Room portal link copied.');
    } catch {
      message.info(qrUrl);
    }
  };

  const handleDownloadQR = () => {
    const canvas = placardRef.current?.querySelector('canvas');
    if (!canvas) return message.error('QR code could not be downloaded.');

    const link = document.createElement('a');
    link.download = `FSKTM-QR-${location.code || 'Room'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    message.success('QR code downloaded.');
  };

  const handlePrint = () => {
    document.body.classList.add('print-qr-placard');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-qr-placard');
    }, { once: true });
    window.print();
  };

  return (
    <Card ref={placardRef} className="placard-page" bordered>
      <div className="placard-heading">
        <Space size={8} wrap>
          <Tag color="processing">{location.code || 'Room'}</Tag>
          <Tag>{location.category || 'Facility'}</Tag>
        </Space>
        <Title level={3}>{location.name}</Title>
        <Text type="secondary">
          <CompassOutlined /> {location.floor?.startsWith('Blok') ? location.floor : `Floor ${location.floor}`}
          {location.capacity ? ` · ${location.capacity} seats` : ''}
        </Text>
      </div>

      <div className="placard-qr">
        <QRCode value={qrUrl} size={184} bordered={false} errorLevel="M" />
        <Text strong><QrcodeOutlined /> Scan to open the room portal</Text>
        <Text type="secondary">Book the room, report an issue, or leave feedback.</Text>
      </div>

      <Descriptions size="small" column={1} className="placard-details">
        <Descriptions.Item label="Room portal">
          <Text copyable={{ text: qrUrl }} ellipsis>{qrUrl.replace(/^https?:\/\//, '')}</Text>
        </Descriptions.Item>
      </Descriptions>

      {!isPrintPreview && (
        <div className="placard-actions no-print">
          <Space wrap>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
              Print
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadQR}>Download QR</Button>
            <Button icon={<CopyOutlined />} onClick={handleCopyLink}>Copy link</Button>
            <Button type="link" icon={<LinkOutlined />} href={qrUrl} target="_blank" rel="noopener noreferrer">
              Open portal
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
}
