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

  // The live scanning URL that students/lecturers open when scanning the QR code in class
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const qrUrl = `${baseUrl}/room-feedback/${encodeURIComponent(location.code || location.location_id)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      message.success(`Copied QR scan URL for ${location.name} to clipboard!`);
    } catch {
      message.info(`Scan URL: ${qrUrl}`);
    }
  };

  const handleDownloadQR = () => {
    const canvas = placardRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `FSKTM-QR-${location.code || 'Room'}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success(`Downloaded QR code for ${location.name}`);
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
      {/* Top Universiti Malaya & FSKTM Crest Banner */}
      <div
        style={{
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 0.5,
              boxShadow: '0 4px 10px rgba(30, 58, 138, 0.3)'
            }}
          >
            FSKTM
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#1E3A8A',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              Universiti Malaya
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
              Fakulti Sains Komputer & Teknologi Maklumat
            </div>
          </div>
        </div>

        <Tag
          color="blue"
          style={{
            borderRadius: 20,
            padding: '4px 12px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.03em',
            margin: 0,
            border: '1px solid #93C5FD'
          }}
        >
          SMART CLASSROOM
        </Tag>
      </div>

      {/* Classroom Identification */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
            color="cyan"
            style={{
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 12
            }}
          >
            {location.category || 'Classroom'}
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
            size={190}
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
            fontSize: 14,
            color: '#1E3A8A'
          }}
        >
          <MobileOutlined style={{ fontSize: 16 }} />
          <span>SCAN WITH MOBILE CAMERA</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          Instant room feedback & defect reporting • No app installation needed
        </div>
      </div>

      {/* What You Can Do (Scan Features) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          marginBottom: 20
        }}
      >
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '10px 8px',
            textAlign: 'center'
          }}
        >
          <AlertOutlined style={{ color: '#DC2626', fontSize: 18, marginBottom: 4 }} />
          <div style={{ fontWeight: 800, fontSize: 11, color: '#991B1B' }}>Report Issue</div>
          <div style={{ fontSize: 10, color: '#7F1D1D', lineHeight: 1.2, marginTop: 2 }}>
            AC, Projector, Socket, PC
          </div>
        </div>

        <div
          style={{
            background: '#FEFCE8',
            border: '1px solid #FEF08A',
            borderRadius: 10,
            padding: '10px 8px',
            textAlign: 'center'
          }}
        >
          <StarOutlined style={{ color: '#D97706', fontSize: 18, marginBottom: 4 }} />
          <div style={{ fontWeight: 800, fontSize: 11, color: '#92400E' }}>Class Feedback</div>
          <div style={{ fontSize: 10, color: '#78350F', lineHeight: 1.2, marginTop: 2 }}>
            Cleanliness & Comfort Rating
          </div>
        </div>

        <div
          style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 10,
            padding: '10px 8px',
            textAlign: 'center'
          }}
        >
          <CalendarOutlined style={{ color: '#2563EB', fontSize: 18, marginBottom: 4 }} />
          <div style={{ fontWeight: 800, fontSize: 11, color: '#1E40AF' }}>Room Timetable</div>
          <div style={{ fontSize: 10, color: '#1E3A8A', lineHeight: 1.2, marginTop: 2 }}>
            Today's Scheduled Classes
          </div>
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
          <span>URL: </span>
          <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#334155' }}>
            {qrUrl.replace(/^https?:\/\//, '')}
          </code>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>FSKTM Facilities & Maintenance Management</span>
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
            Open Live Report Page &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}
