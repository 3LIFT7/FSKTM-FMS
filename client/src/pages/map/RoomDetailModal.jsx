import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import EditRoomModal from '../../components/EditRoomModal';
import EditDeviceModal from '../../components/EditDeviceModal';
import { 
  X, 
  MapPin, 
  Users, 
  Monitor, 
  Calendar, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  Info,
  Edit2,
  Plus,
  Trash2,
  Lock
} from 'lucide-react';

export default function RoomDetailModal({ locationId, onClose, onBookClick, onStatusChanged, onRoomUpdated }) {
  const { isStaff, isManager, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Modal controls
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [unassigningDevId, setUnassigningDevId] = useState(null);

  useEffect(() => {
    if (!locationId) return;
    fetchDetails();
  }, [locationId]);

  async function fetchDetails() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/locations/${locationId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load room details');
      setData(json.location);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!data) return;
    const newStatus = data.status === 'maintenance' ? 'available' : 'maintenance';
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/locations/${data.location_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus, 
          reason: `Manual status override by ${user.name} (${user.role})` 
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Status update failed');
      setData(prev => ({ ...prev, status: newStatus }));
      if (onStatusChanged) onStatusChanged(data.location_id, newStatus);
      if (onRoomUpdated) onRoomUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUnassignDevice(dev) {
    if (!confirm(`Remove "${dev.name}" from this room? It will be moved to the General Pool.`)) return;
    setUnassigningDevId(dev.device_id);
    try {
      const res = await fetch(`/api/devices/${dev.device_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ location_id: null })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to remove equipment from room.');

      // Refresh room details
      await fetchDetails();
      if (onStatusChanged) onStatusChanged();
      if (onRoomUpdated) onRoomUpdated();
    } catch (err) {
      alert(err.message);
    } finally {
      setUnassigningDevId(null);
    }
  }

  function handleRoomSaved(updatedLocation) {
    setData(prev => ({ ...prev, ...updatedLocation }));
    if (onStatusChanged) onStatusChanged();
    if (onRoomUpdated) onRoomUpdated();
    fetchDetails();
  }

  function handleDeviceSaved() {
    setEditingDevice(null);
    fetchDetails();
    if (onStatusChanged) onStatusChanged();
    if (onRoomUpdated) onRoomUpdated();
  }

  if (!locationId) return null;

  const isUnderMaintenance = data?.status === 'maintenance';
  const hasActiveBooking = data?.upcoming_bookings?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className={`p-4 sm:p-6 border-b text-white relative ${
          isUnderMaintenance 
            ? 'bg-gradient-to-r from-amber-700 to-amber-900' 
            : 'bg-gradient-to-r from-blue-700 to-indigo-800'
        }`}>
          <button 
            onClick={onClose}
            className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-white/20 text-white">
              {data ? `${data.floor} Floor • ${data.category || 'Lab'}` : 'Loading...'}
            </span>
            <span className="font-mono text-[11px] sm:text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded">
              {data?.code}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-black tracking-tight leading-tight">
              {data?.name || 'Facility Overview'}
            </h2>
          </div>

          {/* Live Status Pill & Edit Action */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
              {isUnderMaintenance ? (
                <span className="bg-amber-500 text-amber-950 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 animate-spin" />
                  Under Maintenance (Auto-Hidden from Calendar)
                </span>
              ) : hasActiveBooking ? (
                <span className="bg-blue-200 text-blue-900 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Currently Reserved / Booked
                </span>
              ) : (
                <span className="bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Available for Booking
                </span>
              )}
            </div>

            {/* Admin / Staff Edit Button */}
            {isStaff && (
              <button
                type="button"
                onClick={() => setIsEditRoomOpen(true)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white flex items-center gap-1.5 transition shadow-xs backdrop-blur-xs"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Room Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm">Fetching live room details & equipment...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          ) : data && (
            <>
              {/* Quick Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Capacity</div>
                    <div className="text-base font-bold text-slate-800">{data.capacity} Persons</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Devices</div>
                    <div className="text-base font-bold text-slate-800">{data.devices?.length || 0} Registered</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              {data.description && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Facility Description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {data.description}
                  </p>
                </div>
              )}

              {/* Equipment Inventory */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-slate-500" />
                    Equipment in this Room ({data.devices?.length || 0})
                  </h4>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => setIsEditRoomOpen(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage Equipment</span>
                    </button>
                  )}
                </div>

                {data.devices && data.devices.length > 0 ? (
                  <div className="space-y-2">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {data.devices.map(dev => (
                        <div 
                          key={dev.device_id}
                          className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs hover:border-slate-300 transition gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">{dev.name}</div>
                            <div className="text-slate-400 font-mono text-[10px]">SN: {dev.serial_number}</div>
                            {dev.specs && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed bg-slate-50/80 p-1.5 rounded-lg border border-slate-100">
                                {dev.specs}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> In-Room Hardware
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              dev.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                              dev.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                              dev.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {dev.status?.replace('_', ' ')}
                            </span>

                            {isStaff && (
                              <div className="flex items-center gap-1 pt-1 sm:pt-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingDevice(dev)}
                                  title="Edit equipment specs"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={unassigningDevId === dev.device_id}
                                  onClick={() => handleUnassignDevice(dev)}
                                  title="Remove from room (move to General Pool)"
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>In-Room Hardware:</strong> These non-loanable devices are physically installed in this room and ready for use when you book this facility.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 text-center">
                    No specialized devices currently stationed in this room.
                  </div>
                )}
              </div>

              {/* Upcoming Bookings */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Upcoming Reservations
                </h4>
                {data.upcoming_bookings && data.upcoming_bookings.length > 0 ? (
                  <div className="space-y-2">
                    {data.upcoming_bookings.map(b => (
                      <div key={b.booking_id} className={`p-3 rounded-xl text-xs border ${
                        b.status === 'pending' ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/50 border-blue-100'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900">{b.purpose}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                            b.status === 'pending' ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
                          }`}>
                            {b.status === 'pending' ? 'Pending Approval' : 'Confirmed'}
                          </span>
                        </div>
                        <div className="text-blue-700 text-[11px] mt-0.5 font-mono">
                          {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                          {' '}&rarr;{' '}
                          {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                        </div>
                        <div className="text-slate-500 text-[10px] mt-1">
                          Booked by: <span className="font-medium text-slate-700">{b.booked_by}</span> ({b.booked_by_role})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                    No upcoming bookings scheduled for today.
                  </div>
                )}
              </div>

              {/* Staff Status Override Toggle */}
              {isStaff && (
                <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Operational Override (Staff)</div>
                      <div className="text-[11px] text-slate-500">
                        {isUnderMaintenance 
                          ? 'Restore room to available to reactivate booking.' 
                          : 'Flag room under maintenance to immediately hide from calendar.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={statusUpdating}
                      onClick={handleToggleStatus}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                        isUnderMaintenance
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {statusUpdating 
                        ? 'Updating...' 
                        : isUnderMaintenance ? 'Mark Available' : 'Set Under Maintenance'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-white transition"
          >
            Close
          </button>

          {/* Core Rule Enforcement on Book Button */}
          {isUnderMaintenance ? (
            <button
              disabled
              title="This facility is under maintenance and cannot be booked"
              className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 font-semibold text-sm cursor-not-allowed flex items-center gap-2 border border-slate-300 shadow-inner"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Hidden from booking (maintenance)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (onBookClick && data) onBookClick(data);
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
            >
              <span>Book this room</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Room Modal */}
      {isEditRoomOpen && data && (
        <EditRoomModal
          isOpen={isEditRoomOpen}
          location={data}
          onClose={() => setIsEditRoomOpen(false)}
          onSaved={handleRoomSaved}
        />
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={!!editingDevice}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={handleDeviceSaved}
        />
      )}
    </div>
  );
}
