import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import { 
  Award, 
  Layers, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  Power,
  Pause,
  Play
} from 'lucide-react';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingGroupId, setTogglingGroupId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  async function fetchLecturerData() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setMyBookings(data.bookings.filter(b => b.user_id === user.user_id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSeries(groupId, action) {
    if (!groupId) return;
    setTogglingGroupId(groupId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/bookings/recurring/${groupId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to update recurring schedule.');
      } else {
        setActionSuccess(data.message);
        await fetchLecturerData();
      }
    } catch (err) {
      console.error(err);
      setActionError('Network error while updating recurring series.');
    } finally {
      setTogglingGroupId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-amber-600/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-amber-100">
            <Award className="w-4 h-4" />
            <span>Academic Staff Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {user?.name}
          </h1>
          <p className="text-amber-200 text-xs sm:text-sm">
            Staff ID: <strong className="text-white font-mono">{user?.matric_or_staff_id}</strong> • Artificial Intelligence Department
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>Book Lab / Classroom</span>
          </button>
          <Link
            to="/map"
            className="px-4 py-2.5 bg-amber-600/60 hover:bg-amber-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition"
          >
            <MapPin className="w-4 h-4" />
            <span>Interactive Floor Map</span>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-900 ml-4 hover:underline">Dismiss</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-red-900 ml-4 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setIsBookModalOpen(true)}
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Layers className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Reserve Class / Lab</div>
          <p className="text-slate-400 text-xs mt-0.5">Book for single slot or 14-week semester recurrence.</p>
        </button>

        <Link
          to="/calendar"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Faculty Calendar</div>
          <p className="text-slate-400 text-xs mt-0.5">Review faculty-wide timetable and room availability.</p>
        </Link>

        <Link
          to="/map"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Floor Plan Explorer</div>
          <p className="text-slate-400 text-xs mt-0.5">Explore 4-floor layout and equipment inventories.</p>
        </Link>
      </div>

      {/* Lecturer's Active Schedules */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">My Course Lab Reservations</h3>
            <p className="text-xs text-slate-400">Scheduled classroom bookings for lectures and labs.</p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            {myBookings.length} Total Records
          </span>
        </div>

        {myBookings.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No course sessions scheduled. Click "Book Lab / Classroom" to reserve a room.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBookings.map(b => {
              const isPending = b.status === 'pending';
              const isApproved = b.status === 'approved';
              const isRejected = b.status === 'rejected';
              const isCancelled = b.status === 'cancelled';
              const isPaused = b.series_status === 'paused';
              const isToggling = togglingGroupId === b.recurrence_group_id;

              return (
                <div key={b.booking_id} className={`p-4 rounded-2xl text-xs space-y-2 border ${
                  isPending ? 'bg-amber-50/50 border-amber-200 border-dashed' :
                  isCancelled || isPaused ? 'bg-slate-50 border-slate-200 opacity-80' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {b.course_id || 'Class Session'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isPending ? 'bg-amber-200 text-amber-900' :
                          isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isCancelled ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isPending ? 'Pending Approval' : isApproved ? 'Confirmed' : isCancelled ? 'Cancelled/Paused' : 'Rejected'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{b.purpose}</h4>
                    </div>
                    {b.is_recurring && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 shrink-0">
                        {b.recurrence_pattern ? b.recurrence_pattern.split(':')[2] || 'Weekly' : 'Weekly'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.location_name} ({b.location_code}) • {b.location_floor} Floor</span>
                  </div>

                  <div className="flex items-center gap-2 text-blue-700 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' - '}
                      {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                    </span>
                  </div>

                  {b.rejection_reason && (
                    <div className="text-amber-700 text-[10px] font-medium pt-1 border-t border-slate-200">
                      Note: {b.rejection_reason}
                    </div>
                  )}

                  {/* Series Status & Toggle Control */}
                  {b.is_recurring && b.recurrence_group_id && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="text-[11px] font-bold text-slate-600">
                          Series: {isPaused ? 'Paused' : 'Active'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleSeries(b.recurrence_group_id, isPaused ? 'activate' : 'pause')}
                        disabled={isToggling}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shadow-2xs ${
                          isPaused
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                        } disabled:opacity-50`}
                      >
                        {isToggling ? (
                          'Updating...'
                        ) : isPaused ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Activate Series</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Pause Series</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchLecturerData()}
      />
    </div>
  );
}

