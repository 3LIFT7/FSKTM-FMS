import React, { useState, useEffect, useRef } from 'react';
import { Modal, Descriptions, Tag, Button, Typography, Space, message, Tabs, Empty, Spin, Rate, Table } from 'antd';
import {
  LaptopOutlined,
  EditOutlined,
  BarcodeOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  CopyOutlined,
  AppstoreAddOutlined,
  HistoryOutlined,
  StarFilled,
  PrinterOutlined,
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
  const historyPrintRef = useRef(null);

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

  // Keep the complete approved loan lifecycle; omit requests still awaiting approval and rejected loans.
  const approvedLoanHistory = loanHistory.filter((loan) =>
    ['approved', 'checked_out', 'returned'].includes(loan.status)
  );
  const totalBorrowed = approvedLoanHistory.length;

  function printBorrowingHistory() {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      message.error('Allow pop-ups to print the borrowing history.');
      return;
    }

    const doc = printWindow.document;
    doc.title = `${currentDevice.name || 'Device'} - Borrowing History`;
    const style = doc.createElement('style');
    style.textContent = `
      @page { margin: 16mm; }
      body { font-family: Arial, sans-serif; color: #172033; font-size: 12px; margin: 0; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      .print-subtitle { color: #64748b; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; border: 1px solid #d9d9d9; text-align: left; vertical-align: top; }
      th { background: #fafafa; font-weight: 600; }
      .ant-pagination { display: none; }
    `;
    doc.head.appendChild(style);

    const header = doc.createElement('header');
    const title = doc.createElement('h1');
    title.textContent = `${currentDevice.name || 'Device'} - Borrowing History`;
    const subtitle = doc.createElement('div');
    subtitle.className = 'print-subtitle';
    subtitle.textContent = `Serial: ${currentDevice.serial_number || '—'}  |  Asset ID: #${currentDevice.device_id}  |  ${totalBorrowed} record${totalBorrowed === 1 ? '' : 's'}`;
    header.append(title, subtitle);

    const content = doc.createElement('main');
    content.innerHTML = historyPrintRef.current?.innerHTML || '';
    doc.body.append(header, content);

    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, { once: true });
    doc.close();
  }

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

  const historyColumns = [
    {
      title: 'Loan',
      dataIndex: 'loan_id',
      key: 'loan_id',
      width: 78,
      render: (loanId) => <Text code>#{loanId}</Text>,
    },
    {
      title: 'Borrower',
      key: 'borrower',
      width: 190,
      render: (_, loan) => (
        <div>
          <Text strong>{loan.borrower_name || '—'}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{loan.matric_or_staff_id || loan.user_role || '—'}</Text></div>
        </div>
      ),
    },
    {
      title: 'Purpose',
      dataIndex: 'purpose',
      key: 'purpose',
      ellipsis: true,
      render: (purpose) => purpose || '—',
    },
    {
      title: 'Borrowed',
      dataIndex: 'checkout_time',
      key: 'checkout_time',
      width: 132,
      render: (time) => time ? formatDateTime(time) : 'Approved, not collected',
    },
    {
      title: 'Returned',
      dataIndex: 'actual_return_time',
      key: 'actual_return_time',
      width: 132,
      render: (time, loan) => time ? formatDateTime(time) : loan.status === 'checked_out' ? 'On loan' : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => <StatusTag status={status} />,
    },
  ];

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <Text type="secondary">{totalBorrowed} approved record{totalBorrowed === 1 ? '' : 's'}</Text>
                        <Button icon={<PrinterOutlined />} onClick={printBorrowingHistory} disabled={loadingDetails || totalBorrowed === 0}>
                          Print History
                        </Button>
                      </div>

                      <div ref={historyPrintRef}>
                        {loadingDetails ? (
                          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
                        ) : (
                          <Table
                            columns={historyColumns}
                            dataSource={approvedLoanHistory}
                            rowKey="loan_id"
                            size="small"
                            pagination={{ pageSize: 6, hideOnSinglePage: true, showSizeChanger: false }}
                            scroll={{ x: 720 }}
                            locale={{ emptyText: <Empty description="No approved borrowing history for this device." /> }}
                          />
                        )}
                      </div>
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
