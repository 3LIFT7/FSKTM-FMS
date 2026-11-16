import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tag, Button, Typography, Space, message, Tabs, Empty, Spin, Row, Col, Rate } from 'antd';
import {
  LaptopOutlined,
  EditOutlined,
  BarcodeOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  CopyOutlined,
  AppstoreAddOutlined,
  HistoryOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
  IdcardOutlined,
  StarFilled,
} from '@ant-design/icons';
import StatusTag from './StatusTag';
import { formatDateTime } from '../utils/date';
import { useAuth } from '../context/AuthContext';

const { Text, Paragraph } = Typography;

export default function DeviceDetailModal({
  isOpen,
  onClose,
  device,
  onEdit,
  canEdit = true,
  initialTab = 'details',
}) {
  const { user } = useAuth();
  const isStaff = ['technician', 'manager'].includes(user?.role);
  const [activeTab, setActiveTab] = useState(isStaff ? initialTab : 'details');
  const [fullDevice, setFullDevice] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && device) {
      setActiveTab(isStaff ? (initialTab || 'details') : 'details');
      setFullDevice(device);
      if (isStaff) {
        fetchDeviceHistory(device.device_id);
      }
    }
  }, [isOpen, device, initialTab, isStaff]);

  async function fetchDeviceHistory(deviceId) {
    if (!deviceId) return;
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.device) {
        setFullDevice(data.device);
      }
    } catch (err) {
      console.error('Error loading device history:', err);
    } finally {
      setLoadingDetails(false);
    }
  }

  if (!device) return null;

  const currentDevice = fullDevice || device;
  const accessories = Array.isArray(currentDevice.accessories) ? currentDevice.accessories : [];
  const loanHistory = Array.isArray(currentDevice.loan_history)
    ? currentDevice.loan_history
    : Array.isArray(currentDevice.recent_loans)
    ? currentDevice.recent_loans
    : [];

  const totalBorrowed = loanHistory.length;
  const activeCount = loanHistory.filter((l) => ['checked_out', 'approved'].includes(l.status)).length;
  const returnedCount = loanHistory.filter((l) => l.status === 'returned').length;
  const pendingCount = loanHistory.filter((l) => ['pending', 'pending_lecturer', 'pending_technician'].includes(l.status)).length;

  const copyBarcode = () => {
    if (currentDevice.barcode) {
      navigator.clipboard.writeText(currentDevice.barcode);
      message.success(`Copied barcode "${currentDevice.barcode}" to clipboard!`);
    }
  };

  const copySerial = () => {
    if (currentDevice.serial_number) {
      navigator.clipboard.writeText(currentDevice.serial_number);
      message.success(`Copied serial number "${currentDevice.serial_number}" to clipboard!`);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Asset ID: #{currentDevice.device_id}{isStaff ? ` • Total Loan Records: ${totalBorrowed}` : ''}
          </Text>
          <Space>
            <Button onClick={onClose}>Close</Button>
            {canEdit && onEdit && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  onEdit(currentDevice);
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
      width={780}
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
                {currentDevice.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{currentDevice.category || 'Hardware'} • SN: {currentDevice.serial_number}</span>
                {isStaff && currentDevice.avg_rating && (
                  <Tag color="gold" style={{ margin: 0, fontWeight: 700, fontSize: 11 }}>
                    <StarFilled style={{ color: '#F59E0B', marginRight: 3 }} />
                    {currentDevice.avg_rating} / 5 ({currentDevice.rating_count})
                  </Tag>
                )}
              </div>
            </div>
          </div>
          <StatusTag status={currentDevice.status} />
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'details',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6 }} />
                Asset Specs &amp; Details
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>
                {/* Device Image Banner if available */}
                {currentDevice.image_url && (
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
                      src={currentDevice.image_url}
                      alt={currentDevice.name}
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
                    <span>Asset Identifiers &amp; Barcode</span>
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
                        {currentDevice.barcode && (
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

                      {currentDevice.barcode ? (
                        <div>
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
                              justifyContent: 'center',
                            }}
                            title={currentDevice.barcode}
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
                            {currentDevice.barcode}
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
                        {currentDevice.serial_number && (
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
                          {currentDevice.serial_number}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications & Notes Section */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileTextOutlined style={{ color: '#2563EB' }} />
                    <span>Technical Specifications &amp; Notes</span>
                  </div>

                  <div
                    style={{
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: 10,
                      padding: '14px 16px',
                    }}
                  >
                    {currentDevice.specs ? (
                      <Paragraph
                        style={{
                          margin: 0,
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: '#0C4A6E',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {currentDevice.specs}
                      </Paragraph>
                    ) : (
                      <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: 12 }}>
                        No technical specifications or notes recorded for this hardware item.
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Accessories Section */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AppstoreAddOutlined style={{ color: '#2563EB' }} />
                    <span>Optional Accessories</span>
                  </div>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: '12px 16px',
                    }}
                  >
                    {accessories.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {accessories.map((acc) => (
                          <Tag key={acc} color="geekblue" style={{ margin: 0, borderRadius: 6, fontWeight: 500 }}>
                            {acc}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                        No optional accessories listed for this device.
                      </Text>
                    )}
                  </div>
                </div>

                {/* Hardware Details Table */}
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Category">
                    <Tag color="blue">{currentDevice.category || 'General'}</Tag>
                  </Descriptions.Item>

                  {isStaff && (
                    <Descriptions.Item label="Overall Return Rating">
                      {currentDevice.avg_rating ? (
                        <Space align="center">
                          <Rate disabled allowHalf value={Number(currentDevice.avg_rating)} style={{ fontSize: 14 }} />
                          <Tag color="gold" style={{ fontWeight: 700 }}>{currentDevice.avg_rating} / 5 ({currentDevice.rating_count} rating{currentDevice.rating_count === 1 ? '' : 's'})</Tag>
                        </Space>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          Not rated yet (rated after device is returned)
                        </Text>
                      )}
                    </Descriptions.Item>
                  )}

                  <Descriptions.Item label="Allocation Mode">
                    {currentDevice.is_loanable ? (
                      <Tag color="cyan">Portable Loan Pool (Available for student/staff checkout)</Tag>
                    ) : (
                      <Tag color="purple">Fixed In Lab / Room (Dedicated Facility Equipment)</Tag>
                    )}
                  </Descriptions.Item>

                  {currentDevice.location_name && (
                    <Descriptions.Item label="Assigned Location">
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        <EnvironmentOutlined style={{ marginRight: 6, color: '#2563EB' }} />
                        {currentDevice.location_name}
                        {currentDevice.location_code ? ` (${currentDevice.location_code})` : ''}
                        {currentDevice.location_floor ? ` — ${currentDevice.location_floor?.startsWith('Blok') ? currentDevice.location_floor : `Floor ${currentDevice.location_floor}`}` : ''}
                      </span>
                    </Descriptions.Item>
                  )}

                  <Descriptions.Item label="Operational Status">
                    <StatusTag status={currentDevice.status} />
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ),
          },
          ...(isStaff
            ? [
                {
                  key: 'history',
                  label: (
                    <span>
                      <HistoryOutlined style={{ marginRight: 6 }} />
                      Borrowing History ({totalBorrowed})
                    </span>
                  ),
                  children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 4 }}>
                {/* Summary KPI Strip */}
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={6}>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Total Records</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{totalBorrowed}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF', textTransform: 'uppercase' }}>Active / Checked Out</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#1D4ED8' }}>{activeCount}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#065F46', textTransform: 'uppercase' }}>Returned</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{returnedCount}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase' }}>Avg Rating</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>
                        {currentDevice.avg_rating ? `★ ${currentDevice.avg_rating}` : '—'}
                      </div>
                    </div>
                  </Col>
                </Row>

                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin />
                  </div>
                ) : loanHistory.length === 0 ? (
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '32px 16px', border: '1px dashed #CBD5E1' }}>
                    <Empty description="This device has not been borrowed yet. Borrowing records will appear here automatically." />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
                    {loanHistory.map((loan) => {
                      const selAcc = Array.isArray(loan.selected_accessories) ? loan.selected_accessories : [];
                      const lecturerName = loan.lecturer_approved_by_name || loan.lecturer_approver_name;
                      const lecturerEmail = loan.lecturer_approved_by_email || loan.lecturer_approver_email;
                      const techName = loan.technician_approver_name || loan.approver_name;
                      const techEmail = loan.technician_approver_email || loan.approver_email;
                      const effectiveRating = loan.return_rating || loan.device_rating;

                      return (
                        <div
                          key={loan.loan_id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '14px 16px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          {/* Top Header Row: Loan ID, Borrower, Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <Tag color="blue" style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                                Loan #{loan.loan_id}
                              </Tag>
                              <div>
                                <Text strong style={{ fontSize: 14, color: '#0F172A' }}>
                                  <UserOutlined style={{ marginRight: 5, color: '#2563EB' }} />
                                  {loan.borrower_name}
                                </Text>
                                <Tag color={loan.user_role === 'lecturer' ? 'gold' : 'cyan'} style={{ marginLeft: 8, fontSize: 11, textTransform: 'capitalize' }}>
                                  {loan.user_role || 'Borrower'}
                                </Tag>
                              </div>
                            </div>
                            <Space size={6} wrap>
                              {effectiveRating && (
                                <Tag color="gold" style={{ margin: 0, fontWeight: 700 }}>
                                  <StarFilled style={{ color: '#F59E0B', marginRight: 3 }} />
                                  {effectiveRating} / 5 {loan.return_condition ? `• ${loan.return_condition}` : ''}
                                </Tag>
                              )}
                              {loan.is_overdue && <Tag color="error">OVERDUE</Tag>}
                              <StatusTag status={loan.status} />
                            </Space>
                          </div>

                          {/* Borrower Details Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 10, fontSize: 12, color: '#475569', background: '#F8FAFC', padding: '8px 12px', borderRadius: 8 }}>
                            <div>
                              <IdcardOutlined style={{ marginRight: 5, color: '#64748B' }} />
                              <strong>Matric / Staff ID:</strong> <span style={{ fontFamily: 'monospace' }}>{loan.matric_or_staff_id || '—'}</span>
                            </div>
                            <div>
                              <MailOutlined style={{ marginRight: 5, color: '#64748B' }} />
                              <strong>Email:</strong> {loan.borrower_email || '—'}
                            </div>
                            {loan.borrower_department && (
                              <div>
                                <strong>Department:</strong> {loan.borrower_department}
                                {loan.borrower_specialization ? ` (${loan.borrower_specialization})` : ''}
                              </div>
                            )}
                          </div>

                          {/* Purpose & Accessories */}
                          <div style={{ marginBottom: 10, fontSize: 12 }}>
                            <div style={{ marginBottom: 6 }}>
                              <strong style={{ color: '#1E293B' }}>Purpose / Project: </strong>
                              <span style={{ color: '#334155' }}>{loan.purpose || '—'}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                              <strong style={{ color: '#1E293B' }}>Borrowed Accessories: </strong>
                              {selAcc.length > 0 ? (
                                selAcc.map((acc) => (
                                  <Tag key={acc} color="geekblue" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                                    + {acc}
                                  </Tag>
                                ))
                              ) : (
                                <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                                  None (Device only)
                                </Text>
                              )}
                            </div>

                            {loan.pickup_location && (
                              <div style={{ marginBottom: 6 }}>
                                <EnvironmentOutlined style={{ marginRight: 5, color: '#16A34A' }} />
                                <strong style={{ color: '#1E293B' }}>Pickup Location: </strong>
                                <span style={{ color: '#0F172A' }}>{loan.pickup_location}</span>
                              </div>
                            )}

                            {/* Post-Return Rating & Feedback Box */}
                            {(loan.return_rating || loan.device_rating || loan.return_notes || loan.device_review) && (
                              <div
                                style={{
                                  background: '#FFFBEB',
                                  border: '1px solid #FDE68A',
                                  borderRadius: 8,
                                  padding: '8px 12px',
                                  marginTop: 6,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <strong style={{ color: '#92400E', fontSize: 12 }}>Post-Return Device Rating:</strong>
                                  <Rate disabled value={Number(effectiveRating || 5)} style={{ fontSize: 13 }} />
                                  {loan.return_condition && (
                                    <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                                      Condition: {loan.return_condition}
                                    </Tag>
                                  )}
                                </div>
                                {loan.return_notes && (
                                  <div style={{ fontSize: 12, color: '#78350F', marginTop: 4 }}>
                                    <strong>Technician Notes:</strong> {loan.return_notes}
                                  </div>
                                )}
                                {loan.device_review && (
                                  <div style={{ fontSize: 12, color: '#78350F', marginTop: 4 }}>
                                    <strong>Borrower Review ({loan.device_rating}/5 ★):</strong> {loan.device_review}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Timestamps Grid */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
                              gap: 8,
                              background: '#F0F9FF',
                              border: '1px solid #E0F2FE',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 11,
                              marginBottom: (lecturerName || techName) ? 10 : 0,
                            }}
                          >
                            <div>
                              <div style={{ color: '#64748B', fontWeight: 600 }}>
                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                Requested At
                              </div>
                              <div style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                                {loan.created_at ? formatDateTime(loan.created_at) : '—'}
                              </div>
                            </div>

                            <div>
                              <div style={{ color: '#64748B', fontWeight: 600 }}>
                                <CheckCircleOutlined style={{ marginRight: 4, color: '#2563EB' }} />
                                Checked Out At
                              </div>
                              <div style={{ fontWeight: 700, color: '#1E3A8A', fontFamily: 'monospace' }}>
                                {loan.checkout_time ? formatDateTime(loan.checkout_time) : 'Not checked out'}
                              </div>
                            </div>

                            <div>
                              <div style={{ color: '#64748B', fontWeight: 600 }}>
                                <ClockCircleOutlined style={{ marginRight: 4, color: '#D97706' }} />
                                Expected Return
                              </div>
                              <div style={{ fontWeight: 700, color: '#92400E', fontFamily: 'monospace' }}>
                                {loan.expected_return_time ? formatDateTime(loan.expected_return_time) : '—'}
                              </div>
                            </div>

                            <div>
                              <div style={{ color: '#64748B', fontWeight: 600 }}>
                                <CheckCircleOutlined style={{ marginRight: 4, color: '#059669' }} />
                                Actual Returned At
                              </div>
                              <div style={{ fontWeight: 700, color: loan.actual_return_time ? '#065F46' : '#64748B', fontFamily: 'monospace' }}>
                                {loan.actual_return_time
                                  ? formatDateTime(loan.actual_return_time)
                                  : loan.status === 'checked_out'
                                  ? 'Currently on loan'
                                  : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Approval Chain */}
                          {(lecturerName || techName) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 11, color: '#475569', paddingTop: 6 }}>
                              {lecturerName && (
                                <div>
                                  <SafetyCertificateOutlined style={{ marginRight: 4, color: '#D97706' }} />
                                  <strong>Lecturer Approver:</strong> {lecturerName}
                                  {lecturerEmail ? ` (${lecturerEmail})` : ''}
                                </div>
                              )}
                              {techName && (
                                <div>
                                  <SafetyCertificateOutlined style={{ marginRight: 4, color: '#16A34A' }} />
                                  <strong>Staff / Technician Approver:</strong> {techName}
                                  {techEmail ? ` (${techEmail})` : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
              ]
            : []),
        ]}
      />
    </Modal>
  );
}
