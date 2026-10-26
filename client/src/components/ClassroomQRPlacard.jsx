import React, { useRef } from 'react';
import { Card, QRCode, Typography, Tag, Space, Button, message, Tooltip } from 'antd';
import {
  PrinterOutlined,
  DownloadOutlined,
  CopyOutlined,
  LinkOutlined,
  AlertOutlined,
  StarOutlined,
  CalendarOutlined,
  MobileOutlined,
  CompassOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ClassroomQRPlacard({ location, isPrintPreview = false, onOpenLive }) {
  const placardRef = useRef(null);

  if (!location) return null;

  // The live scanning URL that students/lecturers open when scanning the QR code to book this room
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const qrUrl = `${baseUrl}/booking/new?code=${encodeURIComponent(location.code || location.location_id)}&book=true`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      message.success(`Copied room booking link for ${location.name} to clipboard!`);
    } catch {
      message.info(`Booking URL: ${qrUrl}`);
    }
  };

  const handleDownloadQR = () => {
    const canvas = placardRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `FSKTM-Booking-QR-${location.code || 'Room'}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success(`Downloaded Booking QR code for ${location.name}`);
    } else {
      message.error('Could not extract QR canvas.');
    }
  };

  return (
    <div
      ref={placardRef}
      className="placard-page"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '2px solid #1E293B',
        boxShadow: isPrintPreview ? 'none' : '0 10px 30px rgba(15, 23, 42, 0.08)',
        padding: '28px 32px',
        maxWidth: 620,
        margin: '0 auto',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#0F172A',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Classroom Identification & Booking Title */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Tag
            color="navy"
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: 18,
              fontWeight: 800,
              padding: '4px 16px',
              borderRadius: 8,
              border: 'none',
              letterSpacing: '0.05em'
            }}
          >
            {location.code}
          </Tag>
          <Tag
            color="blue"
            style={{
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            {location.category || 'Facility'}
          </Tag>
          <Tag
            color="green"
            style={{
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            INSTANT BOOKING
          </Tag>
        </div>

        <Title
          level={2}
          style={{
            margin: '4px 0 6px 0',
            fontWeight: 900,
            color: '#0F172A',
            fontSize: 'clamp(22px, 4vw, 28px)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          {location.name}
        </Title>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
          <span>
            <CompassOutlined style={{ marginRight: 4, color: '#2563EB' }} />
            {location.floor?.startsWith('Blok') ? location.floor : `Floor ${location.floor}`}
          </span>
          {location.capacity && (
            <span>• Capacity: <strong style={{ color: '#0F172A' }}>{location.capacity} seats</strong></span>
          )}
        </div>
      </div>

      {/* Center QR Code Showcase */}
      <div
        style={{
          background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%)',
          borderRadius: 16,
          padding: '24px 20px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          position: 'relative'
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            padding: 14,
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            border: '1px solid #CBD5E1',
            display: 'inline-block'
          }}
        >
          <QRCode
            value={qrUrl}
            size={200}
            bordered={false}
            errorLevel="M"
          />
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            fontSize: 15,
            color: '#1E3A8A'
          }}
        >
          <MobileOutlined style={{ fontSize: 18 }} />
          <span>SCAN TO BOOK THIS ROOM</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
          Scan with your mobile camera to check schedule and reserve instantly
        </div>
      </div>

      {/* Official Footer */}
      <div
        style={{
          borderTop: '1px dashed #CBD5E1',
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          color: '#64748B'
        }}
      >
        <div>
          <span>Booking Link: </span>
          <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#334155' }}>
            {qrUrl.replace(/^https?:\/\//, '')}
          </code>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>FSKTM Facility Reservation System</span>
        </div>
      </div>

      {/* Control Buttons (Strictly Hidden During Printing) */}
      {!isPrintPreview && (
        <div
          className="no-print"
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}
        >
          <Space wrap size="small">
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700 }}
            >
              Print Placard
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadQR}
              style={{ fontWeight: 600 }}
            >
              Download QR PNG
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyLink}
              style={{ fontWeight: 600 }}
            >
              Copy Link
            </Button>
          </Space>

          <Button
            type="link"
            icon={<LinkOutlined />}
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 700, color: '#2563EB', padding: 0 }}
          >
            Open Booking Page &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
