import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from './BookRoomModal';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Layers, 
  Clock, 
  Building2, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react';

export default function CalendarView() {
  const { isStudent, isLecturer, isStaff } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [selectedLocationId, setSelectedLocationId] = useState('All');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [bookRes, locRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/locations')
      ]);
      const bookData = await bookRes.json();
      const locData = await locRes.json();
      if (bookData.success) setBookings(bookData.bookings);
      if (locData.success) setLocations(locData.locations);
    } catch (err) {
      console.error('Error fetching calendar bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  // Count maintenance rooms to demonstrate the auto-hide rule
  const maintenanceRooms = locations.filter(l => l.status === 'maintenance');

  // Filter bookings based on selected floor, location, and active status
  const filteredBookings = bookings.filter(b => {
    if (b.status === 'rejected' || b.status === 'cancelled') return false;
    if (selectedFloor !== 'All' && b.location_floor !== selectedFloor) return false;
    if (selectedLocationId !== 'All' && String(b.location_id) !== String(selectedLocationId)) return false;
    return true;
  });

  // Simple 7-day week schedule generator
  const getWeekDays = (baseDate) => {
    const start = new Date(baseDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    start.setDate(diff);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(currentDate);

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  function today() {
    setCurrentDate(new Date());
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Facility Booking Calendar
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Real-time availability schedule for FSKTM computer laboratories and lecture halls.
          </p>
        </div>

        {/* Action button: Available to all authenticated users */}
        <button
          onClick={() => setIsBookModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isStaff ? 'New Facility Booking' : 'Request Room Booking'}</span>
        </button>
      </div>

      {/* CORE RULE ALERT BANNER: Demonstrating auto-hide */}
      {maintenanceRooms.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Core Auto-Hide Rule Active: </span>
              {maintenanceRooms.length} {maintenanceRooms.length === 1 ? 'room is' : 'rooms are'} currently flagged as{' '}
              <span className="font-semibold underline">Under Maintenance</span> (
              {maintenanceRooms.map(r => `${r.name} [${r.code}]`).join(', ')}
              ) and have been automatically removed from the public calendar schedule.
            </div>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg shrink-0 text-[10px] uppercase tracking-wider">
            Auto-Sync 100%
          </span>
        </div>
      )}

      {/* Filters & Week Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={today}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition text-slate-700"
          >
            Current Week
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-700 ml-2">
            {weekDays[0].toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Floor filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Floors</option>
              <option value="Ground">Ground Floor</option>
              <option value="First">First Floor</option>
              <option value="Second">Second Floor</option>
              <option value="Third">Third Floor</option>
            </select>
          </div>

          {/* Room filter */}
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 max-w-[200px]"
          >
            <option value="All">All Bookable Facilities</option>
            {locations
              .filter(l => l.status !== 'maintenance') // Excluded!
              .map(loc => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 px-2 text-xs">
        <span className="font-bold text-slate-500">Legend:</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>
          <span>Approved / Booked</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 border-dashed"></span>
          <span>Pending Admin Approval</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200"></span>
          <span>Open / Available</span>
        </div>
      </div>

      {/* Week Grid Calendar with horizontal scroll on small devices */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="min-w-[680px] lg:min-w-full">
          {/* Header Row (7 Days) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center divide-x divide-slate-200">
            {weekDays.map((day, idx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={idx} className={`py-2.5 sm:py-3 px-1.5 sm:px-2 ${isToday ? 'bg-blue-50/80 text-blue-800' : 'text-slate-600'}`}>
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                    {day.toLocaleDateString('en-MY', { weekday: 'short' })}
                  </div>
                  <div className={`text-xs sm:text-sm font-black mt-0.5 ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Body Slots */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[420px] sm:min-h-[480px]">
            {weekDays.map((day, colIdx) => {
              const dayDateStr = day.toISOString().split('T')[0];
              const dayBookings = filteredBookings.filter(b => {
                const bStart = new Date(b.start_time).toISOString().split('T')[0];
                return bStart === dayDateStr;
              });

            return (
              <div key={colIdx} className="p-2 space-y-2 bg-white min-h-[450px]">
                {dayBookings.length > 0 ? (
                  dayBookings.map(b => {
                    const isPending = b.status === 'pending';
                    return (
                      <div
                        key={b.booking_id}
                        className={`p-2.5 rounded-xl border transition text-xs shadow-2xs group cursor-pointer ${
                          isPending 
                            ? 'border-amber-300 border-dashed bg-amber-50/90 hover:bg-amber-100/90' 
                            : 'border-blue-200 bg-blue-50/80 hover:bg-blue-100/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-extrabold text-[11px] truncate ${isPending ? 'text-amber-900' : 'text-blue-900'}`}>
                            {b.location_code}
                          </span>
                          <div className="flex items-center gap-1">
                            {isPending ? (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-amber-200 text-amber-900">
                                Pending
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-blue-200 text-blue-900">
                                Booked
                              </span>
                            )}
                            {b.is_recurring && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase bg-indigo-200 text-indigo-800">
                                Weekly
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="font-semibold text-slate-800 line-clamp-2 text-[11px]">
                          {b.purpose}
                        </div>

                        <div className={`text-[10px] font-mono mt-1 flex items-center gap-1 ${isPending ? 'text-amber-700' : 'text-blue-700'}`}>
                          <Clock className={`w-3 h-3 ${isPending ? 'text-amber-600' : 'text-blue-500'}`} />
                          <span>
                            {new Date(b.start_time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(b.end_time).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-500 mt-1 truncate">
                          {b.user_name} ({b.user_role})
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-3 text-slate-300 text-xs">
                    No reservations
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchData()}
      />
    </div>
  );
}

