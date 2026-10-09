import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Result } from 'antd';
import { MailOutlined, KeyOutlined } from '@ant-design/icons';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [responseInfo, setResponseInfo] = useState(null);

  const handleFinish = async (values) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit password reset request.');
      }

      setResponseInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setError('');
    setResponseInfo(null);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyOutlined style={{ color: '#1E3A8A' }} />
          <span>Reset Account Password</span>
        </div>
      }
    >
      <div style={{ marginTop: 12 }}>
        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {responseInfo ? (
          <Result
            status="success"
            title="Reset Request Registered"
            subTitle={responseInfo.message}
            extra={
              responseInfo.stub_token ? (
                <div style={{ textAlign: 'left', background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Dev Stub Reset Token:</div>
                  <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{responseInfo.stub_token}</code>
                </div>
              ) : null
            }
          >
            <Button type="primary" block onClick={handleCancel}>
              Close
            </Button>
          </Result>
        ) : (
          <>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              Enter your registered faculty email address to receive a secure password reset token.
            </p>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
              <Form.Item
                name="email"
                label="University Email Address"
                rules={[
                  { required: true, message: 'Please enter your email address' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#94A3B8' }} />}
                  placeholder="name@fsktm.um.edu.my"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Send Reset Link
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </>
        )}
      </div>
    </Modal>
  );
}
