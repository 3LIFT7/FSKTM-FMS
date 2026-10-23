import React, { useState, useMemo } from 'react';
import { Modal, Select, Checkbox, Button, Typography, Space, Tag, Row, Col, Empty, Card, Divider } from 'antd';
import {
  PrinterOutlined,
  QrcodeOutlined,
  FilterOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  CompassOutlined
} from '@ant-design/icons';
import ClassroomQRPlacard from './ClassroomQRPlacard';

const { Title, Text, Paragraph } = Typography;

export default function BatchPlacardsModal({ isOpen, onClose, locations = [] }) {
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);

  // Extract distinct floors/blocks
  const floorOptions = useMemo(() => {
    const set = new Set();
    locations.forEach(l => {
      if (l.floor) set.add(l.floor);
    });
    const arr = Array.from(set).sort();
    return ['All', ...arr];
  }, [locations]);

  // Filter locations by selected floor
  const displayedLocations = useMemo(() => {
    if (selectedFloor === 'All') return locations;
    return locations.filter(l => l.floor === selectedFloor);
  }, [locations, selectedFloor]);

  // Handle floor change: preselect all rooms in that floor
  const handleFloorChange = (floor) => {
    setSelectedFloor(floor);
    const rooms = floor === 'All' ? locations : locations.filter(l => l.floor === floor);
    setSelectedRoomIds(rooms.map(r => r.location_id));
  };

  // Select all currently displayed
  const handleSelectAll = () => {
    setSelectedRoomIds(displayedLocations.map(l => l.location_id));
  };

  const handleDeselectAll = () => {
    setSelectedRoomIds([]);
  };

  const toggleSelectRoom = (locId) => {
    setSelectedRoomIds(prev =>
      prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]
    );
  };

  // Pre-populate selections when modal opens
  React.useEffect(() => {
    if (isOpen && locations.length > 0 && selectedRoomIds.length === 0) {
      setSelectedRoomIds(locations.map(l => l.location_id));
    }
  }, [isOpen, locations]);

  const selectedLocations = useMemo(() => {
    return locations.filter(l => selectedRoomIds.includes(l.location_id));
  }, [locations, selectedRoomIds]);

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      destroyOnClose
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QrcodeOutlined style={{ color: '#1E3A8A', fontSize: 22 }} />
          <div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Classroom QR Placards & Print Hub</span>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
              Print official scannable QR placards for classrooms, labs, and lecture theaters
            </div>
          </div>
        </div>
      }
    >
      {/* Top Filter and Action Bar (Hidden during print) */}
      <div
        className="no-print"
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 20px',
          marginTop: 12,
          marginBottom: 20
        }}
      >
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Text strong style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                <CompassOutlined style={{ marginRight: 4, color: '#2563EB' }} />
                Filter Block / Floor:
              </Text>
              <Select
                value={selectedFloor}
                onChange={handleFloorChange}
                style={{ width: '100%' }}
                options={floorOptions.map(f => ({
                  value: f,
                  label: f === 'All' ? 'All Blocks & Floors' : (f.startsWith('Blok') ? f : `Floor ${f}`)
                }))}
              />
            </div>
          </Col>

          <Col xs={24} md={14}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <Button size="small" icon={<CheckSquareOutlined />} onClick={handleSelectAll}>
                Select All ({displayedLocations.length})
              </Button>
              <Button size="small" icon={<CloseSquareOutlined />} onClick={handleDeselectAll}>
                Deselect All
              </Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                disabled={selectedLocations.length === 0}
                onClick={handlePrintAll}
                style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700 }}
              >
                Print Selected ({selectedLocations.length})
              </Button>
            </div>
          </Col>
        </Row>

        {/* Room Checkbox Badges */}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {displayedLocations.map(loc => {
            const isChecked = selectedRoomIds.includes(loc.location_id);
            return (
              <Tag.CheckableTag
                key={loc.location_id}
                checked={isChecked}
                onChange={() => toggleSelectRoom(loc.location_id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: isChecked ? '1px solid #2563EB' : '1px solid #CBD5E1',
                  background: isChecked ? '#EFF6FF' : '#FFFFFF',
                  color: isChecked ? '#1E40AF' : '#475569',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {loc.code} — {loc.name}
              </Tag.CheckableTag>
            );
          })}
        </div>
      </div>

      {/* Placards Render Container */}
      <div
        className="placard-print-container"
        style={{
          maxHeight: '65vh',
          overflowY: 'auto',
          padding: '8px 4px'
        }}
      >
        {selectedLocations.length === 0 ? (
          <Empty description="No classroom selected. Select one or more rooms above to preview and print placards." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {selectedLocations.map((loc, idx) => (
              <div key={loc.location_id}>
                <ClassroomQRPlacard location={loc} />
                {idx < selectedLocations.length - 1 && (
                  <Divider className="no-print" style={{ margin: '24px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Page Break (Will print on separate A4 pages)
                    </Text>
                  </Divider>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar in Modal (Hidden during print) */}
      <div
        className="no-print"
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ fontSize: 12, color: '#64748B' }}>
          Selected <strong>{selectedLocations.length}</strong> of <strong>{locations.length}</strong> faculty rooms. Each placard prints centered on a single sheet.
        </Text>
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            disabled={selectedLocations.length === 0}
            onClick={handlePrintAll}
            style={{ background: '#1E3A8A', borderColor: '#1E3A8A', fontWeight: 700 }}
          >
            Print {selectedLocations.length} Placards
          </Button>
        </Space>
      </div>
    </Modal>
  );
}
