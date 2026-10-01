import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Layers, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter,
  Calendar,
  Clock,
  User,
  XCircle,
  Check,
  Edit2,
  Monitor,
  Plus
} from 'lucide-react';
import EditRoomModal from '../../components/EditRoomModal';

export default function RoomsControl() {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' or 'facilities'
  
  // Facilities state
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  // Bookings approvals state
  const [bookings, setBookings] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRoomStatus(loc) {
    const nextStatus = loc.status === 'maintenance' ? 'available' : 'maintenance';
    setUpdatingId(loc.location_id);
    try {
      const res = await fetch(`/api/locations/${loc.location_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: nextStatus,
          reason: `Admin toggle status from Rooms Control console.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLocations(prev =>
        prev.map(item =>
          item.location_id === loc.location_id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleApproveBooking(bookingId) {
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve booking.');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRejectBooking(bookingId) {
    const reason = prompt('Please enter rejection reason (optional):', 'Schedule conflict or administrative review.');
    if (reason === null) return;
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reject', reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject booking.');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setActionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel booking.');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredLocations = locations.filter(l => {
    if (floorFilter !== 'All' && l.floor !== floorFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredBookings = bookings.filter(b => {
    if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.location_name?.toLowerCase().includes(q) ||
        b.location_code?.toLowerCase().includes(q) ||
        b.user_name?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const maintenanceCount = locations.filter(l => l.status === 'maintenance').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Facility Control & Booking Approvals
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Comprehensive administrative console for facility maintenance overrides and student/lecturer reservation approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            title="Refresh"
            className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition border border-slate-200 flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'approvals' 
              ? 'border-purple-600 text-purple-700' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Room Booking Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'facilities' 
              ? 'border-blue-600 text-blue-700' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Room Maintenance Switch ({maintenanceCount} Offline)</span>
        </button>
      </div>

      {/* ================= TAB 1: BOOKING APPROVALS ================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {[
                  { id: 'pending', label: `Pending (${pendingCount})` },
                  { id: 'approved', label: 'Approved & Booked' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'all', label: 'All Bookings' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setBookingStatusFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      bookingStatusFilter === tab.id
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requester, room, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Bookings Table / List */}
          {filteredBookings.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
              No bookings match the selected status filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(b => {
                const isPending = b.status === 'pending';
                const isApproved = b.status === 'approved';
                const isRejected = b.status === 'rejected';

                return (
                  <div 
                    key={b.booking_id}
                    className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black bg-blue-50 text-blue-900 px-2.5 py-0.5 rounded-lg border border-blue-100">
                          {b.location_code}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {b.location_name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({b.location_floor} Floor)
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isPending ? 'Pending Approval' : isApproved ? 'Confirmed / Booked' : 'Rejected'}
                        </span>

                        {b.is_recurring && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">
                            Weekly Recurring
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-slate-800 text-xs">
                        {b.purpose}
                        {b.course_id && <span className="ml-2 font-mono text-purple-700 font-bold">[{b.course_id}]</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-500 text-[11px] pt-1">
                        <div className="flex items-center gap-1.5 text-blue-700 font-mono">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                            {' '}&rarr;{' '}
                            {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Requester: <strong className="text-slate-700">{b.user_name}</strong> ({b.user_role}) • <span className="font-mono">{b.matric_or_staff_id || b.user_email}</span>
                          </span>
                        </div>

                        {b.approver_name && (
                          <div className="text-emerald-700 font-medium">
                            Approved by: {b.approver_name}
                          </div>
                        )}

                        {b.rejection_reason && (
                          <div className="text-red-600 font-medium">
                            Reason: {b.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && (
                        <>
                          <button
                            disabled={actionLoadingId === b.booking_id}
                            onClick={() => handleRejectBooking(b.booking_id)}
                            className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 font-bold hover:bg-red-50 transition text-xs disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            disabled={actionLoadingId === b.booking_id}
                            onClick={() => handleApproveBooking(b.booking_id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs text-xs flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>{actionLoadingId === b.booking_id ? 'Approving...' : 'Approve Request'}</span>
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          disabled={actionLoadingId === b.booking_id}
                          onClick={() => handleCancelBooking(b.booking_id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition text-xs disabled:opacity-50"
                        >
                          Revoke / Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: FACILITIES MAINTENANCE SWITCH ================= */}
      {activeTab === 'facilities' && (
        <div className="space-y-4">
          {/* CORE RULE BANNER */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-amber-300">
                  Auto-Hide Sync Engine: {maintenanceCount} {maintenanceCount === 1 ? 'room is' : 'rooms are'} Under Maintenance
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Toggle any room below to observe immediate auto-hiding on the Calendar and Interactive Floor Map!
                </p>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search room name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {['All', 'Ground', 'First', 'Second', 'Third'].map(floor => (
                  <button
                    key={floor}
                    onClick={() => setFloorFilter(floor)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      floorFilter === floor
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {floor === 'All' ? 'All Floors' : `${floor} Flr`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Room Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map(loc => {
              const isMaintenance = loc.status === 'maintenance';
              return (
                <div
                  key={loc.location_id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                    isMaintenance
                      ? 'maintenance-stripe bg-amber-50/90 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        {loc.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isMaintenance ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isMaintenance ? 'Under Maintenance' : 'Available'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {loc.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>{loc.floor} Floor • Capacity: {loc.capacity} • {loc.category || 'Lab'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                        <Monitor className="w-3.5 h-3.5 text-slate-500" />
                        {loc.device_count || 0} Devices
                      </span>
                    </div>

                    {loc.description && (
                      <p className="text-[11px] text-slate-600 mt-2 line-clamp-2">
                        {loc.description}
                      </p>
                    )}
                  </div>

                  {/* Actions: Edit Room Details & Toggle Maintenance */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setEditingLocation(loc)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-1.5 border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      disabled={updatingId === loc.location_id}
                      onClick={() => toggleRoomStatus(loc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                        isMaintenance
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {updatingId === loc.location_id
                        ? 'Updating...'
                        : isMaintenance ? 'Restore Available' : 'Set to Maintenance'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingLocation && (
        <EditRoomModal
          isOpen={!!editingLocation}
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSaved={() => {
            setEditingLocation(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
