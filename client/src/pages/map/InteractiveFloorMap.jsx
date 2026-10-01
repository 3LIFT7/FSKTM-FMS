import React, { useState, useEffect } from 'react';
import { FLOOR_PLANS } from './floorData';
import RoomDetailModal from './RoomDetailModal';
import BookRoomModal from '../booking/BookRoomModal';
import { 
  Building, 
  Layers, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Info, 
  RefreshCw, 
  Filter,
  Maximize2,
  Calendar as CalendarIcon,
  MapPin,
  Sparkles
} from 'lucide-react';

export default function InteractiveFloorMap({ onBookRoom }) {
  const [currentFloor, setCurrentFloor] = useState('Ground');
  const [locations, setLocations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Time-slot availability filter
  const [viewTimeMode, setViewTimeMode] = useState('now'); // 'now' or 'custom'
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customTime, setCustomTime] = useState('10:00');

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
        fetch('/api/bookings')
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

  // Create lookup map by room code & name
  const locationLookup = {};
  locations.forEach(loc => {
    locationLookup[loc.code.toUpperCase()] = loc;
    locationLookup[loc.name.toUpperCase()] = loc;
  });

  // Target timestamp to evaluate availability against
  const targetCheckTime = viewTimeMode === 'now'
    ? new Date()
    : new Date(`${customDate}T${customTime}:00`);

  // Active bookings at targetCheckTime (approved or pending)
  const activeBookingsAtTime = {};
  bookings
    .filter(b => b.status === 'approved' || b.status === 'pending')
    .forEach(b => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      if (bStart <= targetCheckTime && bEnd >= targetCheckTime) {
        activeBookingsAtTime[b.location_id] = b;
      }
    });

  const floorPlan = FLOOR_PLANS[currentFloor] || FLOOR_PLANS.Ground;

  // Render individual room card
  const renderRoomBox = (roomDef, customClass = '') => {
    const backendLoc = locationLookup[roomDef.code.toUpperCase()] || locationLookup[roomDef.name.toUpperCase()];
    const isMaintenance = backendLoc?.status === 'maintenance';
    const activeBooking = backendLoc ? activeBookingsAtTime[backendLoc.location_id] : null;
    const isBooked = Boolean(activeBooking);
    const isPending = activeBooking?.status === 'pending';

    let bgStyle = 'bg-white hover:bg-emerald-50/50 border-emerald-300 text-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500';
    let statusDot = 'bg-emerald-500';

    if (isMaintenance) {
      bgStyle = 'maintenance-stripe bg-amber-50/90 border-amber-400 text-amber-950 opacity-95 hover:opacity-100 ring-2 ring-amber-300/60 shadow-xs';
      statusDot = 'bg-amber-500 animate-pulse';
    } else if (isBooked) {
      if (isPending) {
        bgStyle = 'bg-amber-50/80 border-amber-300 border-dashed text-amber-950 hover:bg-amber-100 shadow-xs hover:shadow-md';
        statusDot = 'bg-amber-500';
      } else {
        bgStyle = 'bg-blue-50/90 border-blue-400 text-blue-950 hover:bg-blue-100 hover:border-blue-600 shadow-xs hover:shadow-md';
        statusDot = 'bg-blue-600';
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
        className={`rounded-2xl border-2 p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 ${bgStyle} ${customClass}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-black text-xs sm:text-sm tracking-tight text-slate-900">
            {roomDef.code}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot}`} />
        </div>

        <div className="font-semibold text-[11px] sm:text-xs leading-snug my-1 line-clamp-2 text-slate-700">
          {roomDef.name}
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider pt-1 border-t border-slate-100">
          {isMaintenance ? (
            <span className="text-amber-700 flex items-center gap-1 font-semibold">
              <Wrench className="w-3 h-3 inline" /> Maintenance
            </span>
          ) : isBooked ? (
            <span className={isPending ? 'text-amber-800 font-semibold' : 'text-blue-700 font-semibold'}>
              {isPending ? 'Pending Req' : 'Booked'}
            </span>
          ) : (
            <span className="text-emerald-700 font-semibold">Available</span>
          )}

          <span className="text-slate-400 font-medium lowercase">
            {backendLoc?.capacity || roomDef.capacity} pax
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Floor Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Interactive Floor Map
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500">
            FSKTM Faculty Building Navigation & Real-Time Facility Availability
          </p>
        </div>

        {/* Floor Tabs - scrollable horizontally on narrow phones */}
        <div className="flex bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl gap-1 overflow-x-auto max-w-full">
          {['Ground', 'First', 'Second', 'Third'].map(floor => (
            <button
              key={floor}
              onClick={() => setCurrentFloor(floor)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                currentFloor === floor
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{floor} Floor</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px]">Room Status:</span>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-md bg-emerald-500 border border-emerald-600"></span>
            <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">Available</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-md bg-blue-500 border border-blue-600"></span>
            <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">In Use / Booked</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-md bg-amber-400 border border-amber-500 maintenance-stripe"></span>
            <span className="font-semibold text-amber-800 text-[11px] sm:text-xs">Under Maintenance</span>
          </div>
        </div>

        <button
          onClick={fetchData}
          title="Refresh Live Status"
          className="p-1.5 sm:p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition border border-slate-200 flex items-center gap-1.5 text-xs font-medium shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">Refresh Status</span>
        </button>
      </div>

      {/* Time Slot Availability Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 text-xs">Availability For:</span>
          <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl gap-0.5 sm:gap-1">
            <button
              onClick={() => setViewTimeMode('now')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition ${
                viewTimeMode === 'now' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setViewTimeMode('custom')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-[11px] sm:text-xs transition ${
                viewTimeMode === 'custom' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Time Slot
            </button>
          </div>
        </div>

        {viewTimeMode === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2 sm:px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600 flex-1 sm:flex-initial"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="px-2 sm:px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600"
            />
          </div>
        )}

        <div className="text-slate-500 text-[10px] sm:text-[11px] w-full sm:w-auto text-right">
          Target Slot:{' '}
          <strong className="text-slate-800 font-mono">
            {targetCheckTime.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}{' '}
            {targetCheckTime.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
          </strong>
        </div>
      </div>

      {/* Architectural Schematic Canvas matching the kiosk map */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 3xl:p-10 shadow-xs relative overflow-hidden">
        {/* Floor Watermark Banner */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl md:text-4xl 3xl:text-5xl font-black text-amber-500/90 tracking-tighter uppercase select-none">
              {floorPlan.label}
            </span>
            <span className="hidden sm:inline-block text-xs bg-amber-100/80 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
              Schematic Kiosk View
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
            Tap room to view schedule & book
          </span>
        </div>

        {/* Building Plan Schematic Grid: 1 col on mobile, 12 cols on desktop/tablets landscape */}
        <div className="grid grid-cols-1 lg:grid-cols-12 3xl:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* ================= LEFT / WEST WING (Angled corridor in physical layout) ================= */}
          <div className="lg:col-span-5 bg-amber-50/40 border-2 border-dashed border-amber-200/80 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-amber-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
                  West Wing (Tutorials, Labs & Study)
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700/70 bg-amber-100 px-2 py-0.5 rounded-md">
                Angled Wing
              </span>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {/* Row Top (Main Rooms / Study / Labs) */}
              <div className={`grid gap-3 ${floorPlan.westWing.rowTop.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {floorPlan.westWing.rowTop.map(room => renderRoomBox(room))}
              </div>

              {/* Corridor Line Visual */}
              {floorPlan.westWing.rowBottom.length > 0 && (
                <div className="relative py-1 flex items-center justify-center">
                  <div className="w-full border-t-2 border-dashed border-amber-300" />
                  <span className="absolute bg-amber-100 text-amber-800 text-[9px] font-bold px-2 rounded-full uppercase tracking-wider">
                    West Corridor
                  </span>
                </div>
              )}

              {/* Row Bottom (Postgraduate Rooms / Pantry on Ground) */}
              {floorPlan.westWing.rowBottom.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {floorPlan.westWing.rowBottom.map(room => renderRoomBox(room, 'p-2 sm:p-2.5'))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800 font-semibold">
              <span>🚻 Restroom & Water Stations</span>
              <span>🚪 Staircase A</span>
            </div>
          </div>

          {/* ================= CENTER SPINE (Offices - EXCLUDED AS DIRECTED) ================= */}
          <div className="lg:col-span-2 bg-slate-100/70 border-2 border-slate-200 rounded-3xl p-4 flex flex-col justify-between items-center text-center relative shadow-inner">
            <div className="w-full flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                CENTRAL CORE
              </span>

              {/* Lift Box */}
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-2xs flex flex-col items-center">
                <span className="text-2xl mb-1">🛗</span>
                <span className="font-black text-xs text-slate-700">ELEVATOR LOBBY</span>
                <span className="text-[10px] text-slate-400 font-medium">Core Lifts 1 & 2</span>
              </div>

              {/* Central Passage / Corridor */}
              <div className="w-3 h-16 bg-slate-300 rounded-full my-2" />

              {/* Office Exclusion Zone Banner */}
              <div className="w-full bg-slate-200/80 border border-slate-300 rounded-2xl p-3 text-slate-600 flex flex-col items-center">
                <Building className="w-5 h-5 text-slate-500 mb-1" />
                <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-tight">
                  Office Suites
                </span>
                <span className="text-[10px] text-slate-500 leading-tight mt-1">
                  Faculty Administrative & Lecturer Offices (Private Area)
                </span>
              </div>
            </div>

            {currentFloor === 'Ground' && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span>You are here (Kiosk)</span>
              </div>
            )}

            <div className="w-full pt-3 border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Central Circulation
            </div>
          </div>

          {/* ================= RIGHT / EAST WING (Labs in 2 Rows) ================= */}
          <div className="lg:col-span-5 bg-sky-50/40 border-2 border-dashed border-sky-200/80 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-sky-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="font-extrabold text-xs uppercase tracking-wider text-sky-900">
                  East Wing (Computer Labs & Studios)
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                Dual Row Labs
              </span>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {/* Top Row Labs */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700/80 block mb-1.5">
                  North Row Labs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {floorPlan.eastWing.rowTop.map(room => renderRoomBox(room))}
                </div>
              </div>

              {/* Main Hallway Corridor */}
              <div className="relative py-1 flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-sky-300" />
                <span className="absolute bg-sky-100 text-sky-800 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  East Lab Corridor
                </span>
              </div>

              {/* Bottom Row Labs */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700/80 block mb-1.5">
                  South Row Labs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {floorPlan.eastWing.rowBottom.map(room => renderRoomBox(room))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11px] text-sky-800 font-semibold">
              <span>🕌 Surau (Musalla)</span>
              <span>🚻 Restrooms & Staircase B</span>
            </div>
          </div>

        </div>
      </div>

      {/* Slide-over / Modal for Clicked Room Details */}
      <RoomDetailModal
        locationId={selectedLocationId}
        onClose={() => setSelectedLocationId(null)}
        onBookClick={(loc) => {
          setSelectedLocationId(null);
          setBookingModalLocation(loc);
          setIsBookModalOpen(true);
          if (onBookRoom) onBookRoom(loc);
        }}
        onStatusChanged={() => {
          fetchData();
        }}
      />

      {/* Embedded Facility Booking Modal */}
      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookingModalLocation(null);
        }}
        initialLocation={bookingModalLocation}
        onBookingCreated={() => {
          fetchData();
        }}
      />
    </div>
  );
}
