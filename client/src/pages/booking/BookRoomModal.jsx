import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Calendar, Clock, Layers, ShieldAlert, CheckCircle2, AlertTriangle, Info, Laptop } from 'lucide-react';

export default function BookRoomModal({ isOpen, onClose, initialLocation, onBookingCreated }) {
  const { user, isLecturer, isManager, isTechnician } = useAuth();
  const isStaff = isManager || isTechnician;

  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [roomDevices, setRoomDevices] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [purpose, setPurpose] = useState('');
  const [courseId, setCourseId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [weeks, setWeeks] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch in-room devices whenever selectedLocationId changes
  useEffect(() => {
    if (selectedLocationId) {
      fetch(`/api/locations/${selectedLocationId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.location?.devices) {
            setRoomDevices(data.location.devices);
          } else {
            setRoomDevices([]);
          }
        })
        .catch(() => setRoomDevices([]));
    } else {
      setRoomDevices([]);
    }
  }, [selectedLocationId]);

  // Slot availability tracking for the chosen room & date
  const [existingBookingsOnDate, setExistingBookingsOnDate] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      if (initialLocation) {
        setSelectedLocationId(initialLocation.location_id);
      }
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialLocation]);

  useEffect(() => {
    if (isOpen && selectedLocationId && date) {
      fetchSlotsForDate(selectedLocationId, date);
    } else {
      setExistingBookingsOnDate([]);
    }
  }, [isOpen, selectedLocationId, date]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  }

  async function fetchSlotsForDate(locationId, chosenDate) {
    setFetchingSlots(true);
    try {
      const startOfDay = `${chosenDate}T00:00:00`;
      const endOfDay = `${chosenDate}T23:59:59`;
      const res = await fetch(`/api/bookings?location_id=${locationId}&startDate=${startOfDay}&endDate=${endOfDay}`);
      const data = await res.json();
      if (data.success) {
        // Only consider pending or approved bookings
        const active = data.bookings.filter(b => b.status === 'approved' || b.status === 'pending');
        setExistingBookingsOnDate(active);
      }
    } catch (err) {
      console.error('Error checking existing slots:', err);
    } finally {
      setFetchingSlots(false);
    }
  }

  // Real-time conflict check on client
  const hasTimeConflict = () => {
    if (!startTime || !endTime || existingBookingsOnDate.length === 0) return null;
    const userStart = new Date(`${date}T${startTime}:00`);
    const userEnd = new Date(`${date}T${endTime}:00`);

    return existingBookingsOnDate.find(b => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return bStart < userEnd && bEnd > userStart;
    });
  };

  const conflictingSlot = hasTimeConflict();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const startDateTime = `${date}T${startTime}:00`;
      const endDateTime = `${date}T${endTime}:00`;

      const payload = {
        location_id: selectedLocationId,
        start_time: startDateTime,
        end_time: endDateTime,
        purpose,
        course_id: courseId || null,
        is_recurring: isRecurring,
        weeks: isRecurring ? parseInt(weeks, 10) : 1
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit room reservation.');
      }

      setSuccessMsg(data.message || 'Booking successfully processed!');
      if (onBookingCreated) onBookingCreated();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const selectedLoc = locations.find(l => String(l.location_id) === String(selectedLocationId));
  const isSelectedUnderMaintenance = selectedLoc?.status === 'maintenance';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-5 right-3 sm:right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-white/20">
              Facility Reservation
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black">
            {isStaff ? 'Schedule Facility / Classroom' : 'Request Room Reservation'}
          </h2>
          <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5 sm:mt-1">
            FSKTM Operating Hours: 08:00 AM - 08:00 PM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Core policy explanation badge for Student/Lecturer */}
          {!isStaff && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Admin Approval Required: </strong>
                Your reservation request will be submitted as <em>Pending Approval</em>. Once approved by faculty administration, it will be officially confirmed and visible to everyone.
              </div>
            </div>
          )}

          {/* Location Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Facility / Room
            </label>
            <select
              required
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              <option value="">-- Choose a facility --</option>
              {locations.map(loc => (
                <option 
                  key={loc.location_id} 
                  value={loc.location_id}
                  disabled={loc.status === 'maintenance'}
                >
                  {loc.code} - {loc.name} ({loc.floor} Flr, Cap: {loc.capacity})
                  {loc.status === 'maintenance' ? ' [UNDER MAINTENANCE - UNAVAILABLE]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Stationed In-Room Equipment (Fixed / Non-Loanable Devices) */}
          {selectedLocationId && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Stationed Room Equipment ({roomDevices.length})
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  Fixed in Room
                </span>
              </div>

              {roomDevices.length > 0 ? (
                <>
                  <p className="text-[11px] text-slate-500">
                    These non-loanable devices are physically installed in this room and ready for use when you book this facility:
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {roomDevices.map(dev => (
                      <div 
                        key={dev.device_id}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-start justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{dev.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            SN: {dev.serial_number} {dev.specs ? `• ${dev.specs}` : ''}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          dev.status === 'available' || dev.status === 'operational'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : dev.status === 'maintenance'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {dev.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 italic py-0.5">
                  No specialized fixed hardware stationed in this room.
                </p>
              )}
            </div>
          )}

          {/* Alert if selected location is under maintenance */}
          {isSelectedUnderMaintenance && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Under Maintenance:</strong> This facility is temporarily offline and closed for reservations.
              </span>
            </div>
          )}

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Existing reserved time slots banner for chosen room & date */}
          {selectedLocationId && date && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span>Reserved Slots on {date}</span>
                {fetchingSlots && <span className="text-blue-600 lowercase font-normal">checking...</span>}
              </div>

              {existingBookingsOnDate.length === 0 ? (
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No reservations for this facility on this day. All hours open!</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {existingBookingsOnDate.map(b => (
                    <span 
                      key={b.booking_id}
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                        b.status === 'approved' 
                          ? 'bg-blue-100 text-blue-800 border-blue-200' 
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}({b.status === 'approved' ? 'Booked' : 'Pending'})
                    </span>
                  ))}
                </div>
              )}

              {conflictingSlot && (
                <div className="pt-1.5 text-red-600 font-semibold flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Conflict Warning: The chosen time overlaps with an existing {conflictingSlot.status === 'approved' ? 'booking' : 'pending request'} ({new Date(conflictingSlot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(conflictingSlot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Purpose & Course Code */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Booking Purpose / Event Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. WIF3001 Artificial Intelligence Practical or Peer Study"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Course Code (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. WIF2002 / WIX1002"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Recurring Weekly Bookings (Lecturers / Managers) */}
          {(isLecturer || isManager) && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Recurring Weekly Booking (Full Semester)
                </span>
              </label>

              {isRecurring && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Repeat weekly for:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="18"
                      value={weeks}
                      onChange={(e) => setWeeks(e.target.value)}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                    <span className="text-slate-500">weeks</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSelectedUnderMaintenance || Boolean(conflictingSlot)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading 
                ? 'Processing...' 
                : isStaff 
                  ? 'Confirm Reservation' 
                  : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
