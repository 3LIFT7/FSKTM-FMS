import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BookRoomModal from '../booking/BookRoomModal';
import { 
  GraduationCap, 
  MapPin, 
  Calendar, 
  Laptop, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  Plus
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  async function fetchStudentData() {
    setLoading(true);
    try {
      const [bookRes, loanRes, repRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/device-loans'),
        fetch('/api/issues')
      ]);
      const bookData = await bookRes.json();
      const loanData = await loanRes.json();
      const repData = await repRes.json();

      if (bookData.success) {
        setMyBookings(bookData.bookings.filter(b => b.user_id === user.user_id));
      }
      if (loanData.success) {
        setMyLoans(loanData.loans);
      }
      if (repData.success) {
        setMyReports(repData.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) fetchStudentData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-blue-100">
            <GraduationCap className="w-4 h-4" />
            <span>Welcome back, {user?.name.split(' ')[0]}!</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            FSKTM Student Facility Portal
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm max-w-xl">
            Matric: <strong className="text-white font-mono">{user?.matric_or_staff_id}</strong> • Department of Software Engineering
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Request Room Booking</span>
          </button>
          <Link
            to="/map"
            className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Interactive Floor Map</span>
          </Link>
          <Link
            to="/reports/new"
            className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Breakdown</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/map"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Explore Floor Plan</div>
          <p className="text-slate-400 text-xs mt-0.5">Clickable 4-floor map with live availability.</p>
        </Link>

        <Link
          to="/calendar"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Booking Calendar</div>
          <p className="text-slate-400 text-xs mt-0.5">View public lab slots & schedule.</p>
        </Link>

        <Link
          to="/devices"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Laptop className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Borrow Hardware</div>
          <p className="text-slate-400 text-xs mt-0.5">Request VR headsets, testing devices, & kits.</p>
        </Link>

        <Link
          to="/reports/new"
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-red-400 hover:shadow-md transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Report Damage</div>
          <p className="text-slate-400 text-xs mt-0.5">Log broken equipment or faulty rooms.</p>
        </Link>
      </div>

      {/* Two Columns: My Active Bookings & Equipment Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Bookings */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>My Active Bookings</span>
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {myBookings.length}
            </span>
          </div>

          {myBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              You do not have any room bookings scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map(b => (
                <div key={b.booking_id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{b.location_name} ({b.location_code})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        b.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {b.status === 'pending' ? 'Pending Approval' : b.status === 'approved' ? 'Confirmed' : 'Rejected'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{b.purpose}</div>
                    <div className="text-blue-700 text-[10px] font-mono mt-1">
                      {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' })}
                      {' '}&rarr;{' '}
                      {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                    </div>
                    {b.rejection_reason && (
                      <div className="text-red-600 text-[10px] mt-0.5 font-medium">
                        Rejection reason: {b.rejection_reason}
                      </div>
                    )}
                  </div>
                  {b.status !== 'rejected' && b.status !== 'cancelled' && (
                    <button
                      onClick={() => cancelBooking(b.booking_id)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold transition shrink-0 self-start sm:self-center"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Equipment Loans */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600" />
              <span>Borrowed Equipment Status</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {myLoans.length}
            </span>
          </div>

          {myLoans.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No active equipment loan requests found.
            </div>
          ) : (
            <div className="space-y-3">
              {myLoans.map(l => (
                <div key={l.loan_id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{l.device_name}</div>
                    <div className="text-slate-400 text-[10px] font-mono">SN: {l.serial_number}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Return by: {new Date(l.expected_return_time).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    l.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                    l.status === 'approved' ? 'bg-indigo-100 text-indigo-800' :
                    l.status === 'returned' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reported Breakdown Tickets */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>My Breakdown Reports</span>
          </h3>
          <Link to="/tickets" className="text-xs text-blue-600 hover:underline font-bold">
            View All &rarr;
          </Link>
        </div>

        {myReports.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            You haven't submitted any damage reports yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myReports.slice(0, 3).map(r => (
              <div key={r.report_id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{r.location_name || r.device_name || 'General Issue'}</div>
                  <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{r.description}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  r.status === 'open' ? 'bg-red-100 text-red-800' :
                  r.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                  r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {r.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookRoomModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingCreated={() => fetchStudentData()}
      />
    </div>
  );
}
