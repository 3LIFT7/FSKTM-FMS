import React, { useState, useRef, useEffect } from 'react';
import { Form, Input, Button, Tag, Typography, Spin, Space, message } from 'antd';
import {
  UploadOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
  LinkOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export default function ImageInputPreview({
  form,
  fieldName = 'image_url',
  label = 'Facility Display Image URL',
  extra = 'Provide an image link (e.g. Unsplash, faculty asset URL, or web link) or upload a photo to showcase this facility.',
  placeholder = '',
  presets = [],
  saveReminder = 'Click Save Facility Changes below to apply this image.'
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [retryKey, setRetryKey] = useState(0);

  // Live watch the field in the form
  const rawUrl = Form.useWatch(fieldName, form);
  const imageUrl = (rawUrl || '').trim();

  // Whenever the URL changes, reset loading status
  useEffect(() => {
    if (!imageUrl) {
      setLoadStatus('idle');
    } else {
      setLoadStatus('loading');
    }
  }, [imageUrl, retryKey]);

  // Handle local file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('Please select a valid image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error('Image size must be less than 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');

      // Update form value
      form.setFieldValue(fieldName, data.url);
      message.success('Image uploaded successfully!');
      setLoadStatus('loading');
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    form.setFieldValue(fieldName, '');
    setLoadStatus('idle');
  };

  const handlePresetClick = (presetUrl) => {
    form.setFieldValue(fieldName, presetUrl);
    setLoadStatus('loading');
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <Form.Item
        name={fieldName}
        label={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            {imageUrl && (
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleClear}
                style={{ padding: 0, height: 'auto' }}
              >
                Clear Image
              </Button>
            )}
          </div>
        }
        extra={extra}
        style={{ marginBottom: 8 }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder={placeholder}
            prefix={<LinkOutlined style={{ color: '#94A3B8' }} />}
            allowClear
            onChange={(e) => {
              if (!e.target.value) setLoadStatus('idle');
            }}
          />
          <Button
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload File
          </Button>
        </div>
      </Form.Item>

      {/* Quick Presets (if available) */}
      {presets.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
            Quick Presets:
          </Text>
          {presets.map((preset, idx) => (
            <Tag
              key={idx}
              color="blue"
              style={{ cursor: 'pointer', fontSize: 11, margin: 0 }}
              onClick={() => handlePresetClick(preset.url)}
            >
              + {preset.label}
            </Tag>
          ))}
        </div>
      )}

      {/* Live Image Preview Box */}
      <div
        style={{
          border: '1.5px dashed #CBD5E1',
          borderRadius: 12,
          padding: 12,
          background: '#F8FAFC',
          minHeight: 110,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >
        {imageUrl ? (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 12, color: '#334155' }}>
                <PictureOutlined style={{ marginRight: 6, color: '#2563EB' }} />
                Live Preview
              </Text>
              <div>
                {loadStatus === 'loading' && (
                  <Tag color="processing" icon={<Spin size="small" style={{ marginRight: 4 }} />}>
                    Loading image...
                  </Tag>
                )}
                {loadStatus === 'success' && (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Image Loaded OK
                  </Tag>
                )}
                {loadStatus === 'error' && (
                  <Space size={4}>
                    <Tag color="error" icon={<WarningOutlined />}>
                      Load Failed
                    </Tag>
                    <Button
                      size="small"
                      type="text"
                      icon={<ReloadOutlined />}
                      onClick={() => setRetryKey(k => k + 1)}
                    >
                      Retry
                    </Button>
                  </Space>
                )}
              </div>
            </div>

            {/* Container for Image Banner */}
            <div
              style={{
                width: '100%',
                maxHeight: 180,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#E2E8F0',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {loadStatus === 'loading' && (
                <div style={{ padding: '28px 0', width: '100%', background: '#F1F5F9' }}>
                  <Spin tip="Verifying image URL..." />
                </div>
              )}

              <img
                key={`${imageUrl}-${retryKey}`}
                src={imageUrl}
                alt="Preview"
                referrerPolicy="no-referrer"
                style={{
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  display: loadStatus === 'error' ? 'none' : 'block',
                }}
                onLoad={() => setLoadStatus('success')}
                onError={() => setLoadStatus('error')}
              />

              {loadStatus === 'error' && (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    width: '100%',
                  }}
                >
                  <WarningOutlined style={{ fontSize: 24, color: '#EF4444', marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#991B1B', marginBottom: 4 }}>
                    Unable to display this image link
                  </div>
                  <div style={{ fontSize: 11, color: '#B91C1C', maxWidth: 440, margin: '0 auto', lineHeight: 1.4 }}>
                    Make sure the link points directly to an image file (ending in <code>.jpg</code>, <code>.png</code>, or <code>.webp</code>).
                    Alternatively, click <b>Upload File</b> above to upload the photo directly from your device.
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: '#0369A1', fontWeight: 600, textAlign: 'left' }}>
              ℹ️ {saveReminder}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: '#94A3B8' }}>
            <PictureOutlined style={{ fontSize: 32, marginBottom: 8, color: '#CBD5E1' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
              No Facility Image Set
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              Paste an image link above or click <b>Upload File</b> to pick a picture from your computer.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
