import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Input, Select, Button, Tag, Space, Typography, Empty, Spin, Badge } from 'antd';
import {
  LaptopOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import BorrowDeviceModal from './BorrowDeviceModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';

const { Text, Paragraph } = Typography;

export default function DeviceCatalog() {
  const { user, isStaff } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeviceForLoan, setSelectedDeviceForLoan] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    setLoading(true);
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) setDevices(data.devices);
    } catch (err) {
      console.error('Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  }

  const isStudentOrLecturer = !isStaff || user?.role === 'student' || user?.role === 'lecturer';

  const categories = useMemo(() => {
    const list = devices
      .filter(d => (isStudentOrLecturer ? d.is_loanable : true))
      .map(d => d.category)
      .filter(Boolean);
    return ['All', ...new Set(list)];
  }, [devices, isStudentOrLecturer]);

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      if (isStudentOrLecturer && !d.is_loanable) return false;
      if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.serial_number.toLowerCase().includes(q) ||
          (d.specs && d.specs.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [devices, isStudentOrLecturer, categoryFilter, statusFilter, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Hardware & Equipment Catalog"
        subtitle="Borrow VR headsets, mobile testing devices, microcontrollers, and computing equipment for academic projects."
      />

      {/* Filter Row */}
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
              placeholder="Search by device model, serial number, or specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={12} md={7}>
            <Select
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map(c => ({ value: c, label: c === 'All' ? 'All Categories' : c }))}
            />
          </Col>

          <Col xs={12} md={7}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'available', label: 'Available Only' },
                { value: 'checked_out', label: 'Checked Out' },
                { value: 'maintenance', label: 'Under Maintenance' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Device Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 16 }}>
          <Empty description="No hardware equipment found matching your filter criteria" />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {filteredDevices.map(d => {
            const isAvailable = d.status === 'available';
            return (
              <Col xs={24} sm={12} lg={8} xl={6} key={d.device_id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 16,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  bodyStyle={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    {d.image_url ? (
                      <img
                        src={d.image_url}
                        alt={d.name}
                        referrerPolicy="no-referrer"
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 12,
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: '#EFF6FF',
                          color: '#1E3A8A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        <LaptopOutlined />
                      </div>
                    )}
                    <StatusTag status={d.status} />
                  </div>

                  <Text strong style={{ fontSize: 15, color: '#0F172A', lineHeight: 1.3 }}>
                    {d.name}
                  </Text>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace', margin: '4px 0 8px 0' }}>
                    SN: {d.serial_number}
                  </div>

                  {d.specs && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, flex: 1, margin: '4px 0 16px 0' }}
                    >
                      {d.specs}
                    </Paragraph>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Tag color="blue">{d.category || 'General Pool'}</Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {d.is_loanable ? 'Portable' : 'In-Room'}
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      block
                      disabled={!isAvailable || !d.is_loanable}
                      onClick={() => setSelectedDeviceForLoan(d)}
                      style={{ fontWeight: 600 }}
                    >
                      {isAvailable ? 'Request Loan' : d.status === 'checked_out' ? 'Checked Out' : 'Unavailable'}
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <BorrowDeviceModal
        isOpen={Boolean(selectedDeviceForLoan)}
        device={selectedDeviceForLoan}
        onClose={() => setSelectedDeviceForLoan(null)}
        onRequested={() => fetchDevices()}
      />
    </div>
  );
}
