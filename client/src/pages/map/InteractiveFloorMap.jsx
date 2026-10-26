import React, { useState, useEffect, useMemo } from 'react';
import { Card, Segmented, DatePicker, TimePicker, Button, Space, Typography, Tag, Row, Col, Alert, Tooltip, Grid } from 'antd';
import {
  CompassOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  BankOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { FLOOR_PLANS } from './floorData';
import RoomDetailModal from './RoomDetailModal';
import BookRoomModal from '../booking/BookRoomModal';
import StatusTag from '../../components/StatusTag';
import PageHeader from '../../components/PageHeader';
import { DATE_FORMAT, TIME_FORMAT } from '../../utils/date';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function InteractiveFloorMap({ onBookRoom }) {
  const screens = useBreakpoint();
  const isPhone = screens.md === false;
  const [currentFloor, setCurrentFloor] = useState('Ground');
  const [lastFsktmFloor, setLastFsktmFloor] = useState('Ground');
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Time-slot availability filter (custom date and time)
  const [customDate, setCustomDate] = useState(dayjs());
  const [customTime, setCustomTime] = useState(dayjs());

  // Booking modal state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingModalLocation, setBookingModalLocation] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [locRes, bookRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/bookings'),
      ]);
      const locData = await locRes.json();
      const bookData = await bookRes.json();
      if (locData.success) setLocations(locData.locations);
      if (bookData.success) setBookings(bookData.bookings);
    } catch (err) {
      console.error('Error fetching map data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Lookup map by room code & name (supports floor prefix matching to avoid collisions)
  const locationLookup = useMemo(() => {
    const map = {};
    locations.forEach(loc => {
      map[`${loc.floor}_${loc.code}`.toUpperCase()] = loc;
      map[`${loc.floor}_${loc.name}`.toUpperCase()] = loc;
      if (!map[loc.code.toUpperCase()]) map[loc.code.toUpperCase()] = loc;
      if (!map[loc.name.toUpperCase()]) map[loc.name.toUpperCase()] = loc;
    });
    return map;
  }, [locations]);

  // Target timestamp to evaluate availability against
  const targetCheckTime = useMemo(() => {
    if (!customDate || !customTime) return new Date();
    const dateStr = customDate.format('YYYY-MM-DD');
    const timeStr = customTime.format('HH:mm:00');
    return new Date(`${dateStr}T${timeStr}`);
  }, [customDate, customTime]);

  // Active bookings at check time
  const activeBookingsAtTime = useMemo(() => {
    const map = {};
    bookings
      .filter(b => b.status === 'approved' || b.status === 'pending')
      .forEach(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (bStart <= targetCheckTime && bEnd >= targetCheckTime) {
          map[b.location_id] = b;
        }
      });
    return map;
  }, [bookings, targetCheckTime]);

  const floorPlan = FLOOR_PLANS[currentFloor] || FLOOR_PLANS.Ground;
  const isFsktmFloor = ['Ground', 'First', 'Second', 'Third'].includes(currentFloor);
  const selectedBuilding = isFsktmFloor ? 'FSKTM' : currentFloor;

  // Render individual architectural room box
  const renderRoomBox = (roomDef, extraClass = '') => {
    const floorKey = currentFloor === 'Library' ? 'BLOK L PERPUSTAKAAN' : currentFloor;
    const backendLoc =
      locationLookup[`${currentFloor}_${roomDef.code}`.toUpperCase()] ||
      locationLookup[`${currentFloor}_${roomDef.name}`.toUpperCase()] ||
      locationLookup[`${floorKey}_${roomDef.code}`.toUpperCase()] ||
      locationLookup[`${floorKey}_${roomDef.name}`.toUpperCase()] ||
      locationLookup[roomDef.code.toUpperCase()] ||
      locationLookup[roomDef.name.toUpperCase()];
    const isMaintenance = backendLoc?.status === 'maintenance';
    const activeBooking = backendLoc ? activeBookingsAtTime[backendLoc.location_id] : null;
    const isBooked = Boolean(activeBooking);
    const isPending = activeBooking?.status === 'pending';

    let borderStyle = '1px solid #BBF7D0';
    let bgStyle = '#F0FDF4';
    let titleColor = '#166534';
    let status = 'Available';

    if (isMaintenance) {
      borderStyle = '2px dashed #F59E0B';
      bgStyle = '#FFFBEB';
      titleColor = '#92400E';
      status = 'Maintenance';
    } else if (isBooked) {
      if (isPending) {
        borderStyle = '1px dashed #FCD34D';
        bgStyle = '#FEFCE8';
        titleColor = '#854D0E';
        status = 'In Progress';
      } else {
        borderStyle = '1px solid #93C5FD';
        bgStyle = '#EFF6FF';
        titleColor = '#1E40AF';
        status = 'Booked';
      }
    }

    return (
      <div
        key={roomDef.code}
        onClick={() => {
          if (backendLoc) {
            setSelectedLocationId(backendLoc.location_id);
          }
        }}
        style={{
          border: borderStyle,
          background: bgStyle,
          borderRadius: 12,
          padding: '12px 14px',
          cursor: backendLoc ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
        className={`hover:scale-[1.02] hover:shadow-md ${extraClass}`}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: titleColor }}>
              {roomDef.code}
            </span>
            <StatusTag status={status} />
          </div>

          <div style={{ fontSize: 11, color: '#334155', fontWeight: 600, lineHeight: 1.3 }}>
            {roomDef.name}
          </div>

          {activeBooking && (
            <div style={{ fontSize: 10, color: '#2563EB', marginTop: 4, fontStyle: 'italic' }}>
              {activeBooking.purpose?.slice(0, 24)}...
            </div>
          )}

          {roomDef.pic && (
            <div style={{ fontSize: 10, color: '#475569', marginTop: 6, background: '#F8FAFC', padding: '2px 6px', borderRadius: 6, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, color: '#1E293B' }}>PIC:</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomDef.pic}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 10, color: '#64748B' }}>
          <span>{backendLoc?.capacity || roomDef.capacity || 30} seats</span>
          {backendLoc && (
            <span style={{ color: '#1E3A8A', fontWeight: 700 }}>
              Details &rarr;
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Interactive Floor Map & Facility Availability"
        subtitle="Architectural kiosk map of FSKTM featuring 4 floor plans with live room availability and maintenance indicators."
      />

      {/* Control Panel: Building & Time Switcher */}
      <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} xl={16} lg={15}>
            {/* Select Building */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                Select Building:
              </div>
              <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
                <Segmented
                  size={isPhone ? 'small' : 'middle'}
                  value={selectedBuilding}
                  onChange={(val) => {
                    if (val === 'FSKTM') {
                      setCurrentFloor(lastFsktmFloor || 'Ground');
                    } else {
                      setCurrentFloor(val);
                    }
                  }}
                  options={[
                    { label: 'FSKTM', value: 'FSKTM' },
                    { label: 'Blok B8', value: 'Blok B8' },
                    { label: 'Blok C12', value: 'Blok C12' },
                    { label: 'Library', value: 'Library' },
                  ]}
                />
              </div>
            </div>

            {/* Floor Selection (when FSKTM building is selected) */}
            {isFsktmFloor && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                  Select Floor Level:
                </div>
                <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
                  <Segmented
                    size={isPhone ? 'small' : 'middle'}
                    value={currentFloor}
                    onChange={(val) => {
                      setCurrentFloor(val);
                      setLastFsktmFloor(val);
                    }}
                    options={[
                      { label: 'Ground Floor', value: 'Ground' },
                      { label: 'First Floor', value: 'First' },
                      { label: 'Second Floor', value: 'Second' },
                      { label: 'Third Floor', value: 'Third' },
                    ]}
                  />
                </div>
              </div>
            )}
          </Col>

          <Col xs={24} xl={7} lg={8}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
              Evaluate Room Availability At:
            </div>
            <Space wrap>
              <DatePicker
                value={customDate}
                onChange={(val) => setCustomDate(val || dayjs())}
                format={DATE_FORMAT}
                allowClear={false}
              />
              <TimePicker
                value={customTime}
                onChange={(val) => setCustomTime(val || dayjs())}
                format={TIME_FORMAT}
                minuteStep={15}
                allowClear={false}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Status Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '0 4px' }}>
        <Text strong style={{ fontSize: 12, color: '#475569' }}>Status Legend:</Text>
        <Space size="middle" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>Available</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>Booked / In Session</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>Under Maintenance</Text>
          </div>
        </Space>
      </div>

      {/* Main Architectural Floor Plan Visualizer */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Space>
              <CompassOutlined style={{ color: '#1E3A8A' }} />
              <span style={{ fontWeight: 800 }}>
                {isFsktmFloor ? `FSKTM ${floorPlan.name.toUpperCase()} MAP` : `${floorPlan.name.toUpperCase()} MAP`}
              </span>
            </Space>
            <Tag color="blue">{floorPlan.label}</Tag>
          </div>
        }
        bordered={false}
        style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        {/* If building is a single unit (Blok B8, Blok C12, Library) */}
        {floorPlan.isSingleUnit ? (
          <div
            style={{
              background: '#F8FAFC',
              border: '2px solid #E2E8F0',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
              <Text strong style={{ color: '#1E293B', fontSize: 15 }}>
                {floorPlan.facilityTitle || `${floorPlan.name} Facilities`}
              </Text>
              <Tag color="blue" style={{ fontSize: 11, padding: '2px 8px' }}>
                {floorPlan.facilityTag || 'Single Unit Facility'}
              </Tag>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {floorPlan.allRooms.map((room) => renderRoomBox(room))}
            </div>

            <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              <span>Restrooms & Facilities Access</span>
              <span>Main Entrance & Circulation</span>
            </div>
          </div>
        ) : (
          <Row gutter={[16, 16]} align="stretch">
            {/* ================= WEST WING ================= */}
            {currentFloor !== 'Ground' && floorPlan.westWing && (
              <Col xs={24} lg={10}>
                <div
                  style={{
                    height: '100%',
                    background: '#FFFBEB',
                    border: '2px dashed #FDE68A',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #FEF3C7', pb: 8 }}>
                      <Text strong style={{ color: '#92400E', fontSize: 13 }}>
                        {floorPlan.westWing.title || 'West Wing (Tutorial Rooms & Labs)'}
                      </Text>
                      <Tag color="gold" style={{ fontSize: 10 }}>{floorPlan.westWing.tag || 'Wing A'}</Tag>
                    </div>

                    {/* West Wing Top Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: floorPlan.westWing.rowTop.length > 2 ? 'repeat(2, 1fr)' : '1fr', gap: 10, marginBottom: 12 }}>
                      {floorPlan.westWing.rowTop.map(room => renderRoomBox(room))}
                    </div>

                    {/* Corridor Line */}
                    {floorPlan.westWing.rowBottom.length > 0 && (
                      <div style={{ textAlign: 'center', margin: '8px 0', borderTop: '2px dashed #FCD34D', position: 'relative' }}>
                        <span style={{ position: 'relative', top: -10, background: '#FEF3C7', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, color: '#92400E' }}>
                          West Corridor
                        </span>
                      </div>
                    )}

                    {/* West Wing Bottom Row */}
                    {floorPlan.westWing.rowBottom.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                        {floorPlan.westWing.rowBottom.map(room => renderRoomBox(room))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #FEF3C7', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                    <span>Restrooms & Water Station</span>
                    <span>Staircase A</span>
                  </div>
                </div>
              </Col>
            )}

            {/* ================= CENTRAL CORE (Elevator Lobby & Offices) - FSKTM floors ================= */}
            <Col xs={24} lg={currentFloor === 'Ground' ? 8 : 4}>
              <div
                style={{
                  height: '100%',
                  background: '#F1F5F9',
                  border: '2px solid #E2E8F0',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                    CENTRAL CORE
                  </div>

                  {/* Lift Box */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>
                      🛗
                    </div>
                    <Text strong style={{ fontSize: 12, color: '#334155', display: 'block' }}>
                      ELEVATOR LOBBY
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      Core Lifts 1 & 2
                    </Text>
                  </div>

                  <div style={{ width: 10, height: 40, background: '#CBD5E1', borderRadius: 99, margin: '8px auto' }} />

                  {/* Office Suite area */}
                  <div style={{ background: '#E2E8F0', borderRadius: 12, padding: 12, marginTop: 8 }}>
                    <BankOutlined style={{ fontSize: 18, color: '#64748B', marginBottom: 4 }} />
                    <div style={{ fontWeight: 800, fontSize: 11, color: '#475569' }}>
                      Administrative Offices
                    </div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                      Dean's Office & Academic Suites
                    </div>
                  </div>
                </div>

                {currentFloor === 'Ground' && (
                  <div style={{ marginTop: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#1E3A8A' }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} /> Kiosk Terminal
                  </div>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginTop: 12 }}>
                  Central Spine
                </div>
              </div>
            </Col>

            {/* ================= EAST WING (Dual Row Labs / Main Facilities) ================= */}
            <Col xs={24} lg={currentFloor === 'Ground' ? 16 : 10}>
              <div
                style={{
                  height: '100%',
                  background: '#F0F9FF',
                  border: '2px dashed #BAE6FD',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #E0F2FE', pb: 8 }}>
                    <Text strong style={{ color: '#0369A1', fontSize: 13 }}>
                      {floorPlan.eastWing.title || 'East Wing (Specialized Computer Labs)'}
                    </Text>
                    <Tag color="cyan" style={{ fontSize: 10 }}>{floorPlan.eastWing.tag || 'Wing B'}</Tag>
                  </div>

                  {/* East Wing Top Row */}
                  {floorPlan.eastWing.rowTop.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        {floorPlan.eastWing.rowBottom.length > 0 ? 'North Row' : 'Facility Area'}
                      </Text>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        {floorPlan.eastWing.rowTop.map(room => renderRoomBox(room))}
                      </div>
                    </div>
                  )}

                  {/* Main Hallway Corridor */}
                  {floorPlan.eastWing.rowBottom.length > 0 && (
                    <div style={{ textAlign: 'center', margin: '10px 0', borderTop: '2px dashed #7DD3FC', position: 'relative' }}>
                      <span style={{ position: 'relative', top: -10, background: '#E0F2FE', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, color: '#0369A1' }}>
                        Corridor
                      </span>
                    </div>
                  )}

                  {/* East Wing Bottom Row */}
                  {floorPlan.eastWing.rowBottom.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        South Row
                      </Text>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        {floorPlan.eastWing.rowBottom.map(room => renderRoomBox(room))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #E0F2FE', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0369A1', fontWeight: 600 }}>
                  <span>Surau (Musalla)</span>
                  <span>Restrooms & Staircase B</span>
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Room Detail Drawer (Section 6: Floor map side panel) */}
      <RoomDetailModal
        locationId={selectedLocationId}
        onClose={() => setSelectedLocationId(null)}
        onBookClick={(loc) => {
          setSelectedLocationId(null);
          setBookingModalLocation(loc);
          setIsBookModalOpen(true);
          if (onBookRoom) onBookRoom(loc);
        }}
        onStatusChanged={() => fetchData()}
        onRoomUpdated={() => fetchData()}
      />

      {/* Booking Modal */}
      <BookRoomModal
        isOpen={isBookModalOpen}
        initialLocation={bookingModalLocation}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookingModalLocation(null);
        }}
        onBookingCreated={() => fetchData()}
      />
    </div>
  );
}
