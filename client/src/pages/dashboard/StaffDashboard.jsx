import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogMaintenanceModal from '../maintenance/LogMaintenanceModal';
import { 
  Wrench, 
  Layers, 
  Laptop, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  FileSpreadsheet, 
  ShieldCheck,
  Building2,
  RefreshCw
} from 'lucide-react';

export default function StaffDashboard() {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [maintenanceLocations, setMaintenanceLocations] = useState([]);
  const [openIssues, setOpenIssues] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLogMaintOpen, setIsLogMaintOpen] = useState(false);

  useEffect(() => {
    fetchOperationalData();
  }, []);

  async function fetchOperationalData() {
    setLoading(true);
    try {
      const [locRes, issueRes, loanRes, statsRes, bookRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/issues'),
        fetch('/api/device-loans'),
        fetch('/api/admin/reports/summary', { credentials: 'include' }).catch(() => ({ json: () => ({ stats: {} }) })),
        fetch('/api/bookings?status=pending')
      ]);

      const locData = await locRes.json();
      const issueData = await issueRes.json();
      const loanData = await loanRes.json();
      const statsData = await statsRes.json();
      const bookData = await bookRes.json();

      if (locData.success) {
        setMaintenanceLocations(locData.locations.filter(l => l.status === 'maintenance'));
      }
      if (issueData.success) {
        setOpenIssues(issueData.reports.filter(r => r.status === 'open' || r.status === 'in_progress'));
      }
      if (loanData.success) {
        setPendingLoans(loanData.loans.filter(l => l.status === 'pending' || l.is_overdue));
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (bookData.success) {
        setPendingBookings(bookData.bookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      fetchOperationalData();
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
      fetchOperationalData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300">
            {isManager ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
            <span>{isManager ? 'Faculty Lab Manager & Administrator' : 'Technical Operations Specialist'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Operations & Facility Hub
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm">
            Staff ID: <strong className="text-white font-mono">{user?.matric_or_staff_id}</strong> • IT & Infrastructure Services
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          <button
            onClick={() => setIsLogMaintOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Log Maintenance</span>
          </button>
          <Link
            to="/rooms"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition"
          >
            <Layers className="w-4 h-4" />
            <span>Rooms Control Switch</span>
          </Link>
          {isManager && (
            <Link
              to="/admin/schedule-import"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Timetable CSV</span>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-purple-400 transition shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Room Approvals Queue</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{pendingBookings.length}</div>
          <div className="text-[11px] text-purple-700 font-semibold mt-1">Pending admin decision</div>
        </div>

        <Link to="/rooms" className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 transition shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rooms in Maintenance</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{maintenanceLocations.length}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">Auto-hidden from calendar</div>
        </Link>

        <Link to="/tickets" className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-red-400 transition shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Damage Tickets</div>
          <div className="text-2xl font-black text-red-600 mt-1">{openIssues.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Require repair action</div>
        </Link>

        <Link to="/devices/manage" className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 transition shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loan Action Queue</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{pendingLoans.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending approval or overdue</div>
        </Link>
      </div>

      {/* CORE AUTO-HIDE STATUS SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>Facilities Currently Under Maintenance (Auto-Hidden)</span>
          </h3>
          <Link to="/rooms" className="text-xs font-bold text-blue-600 hover:underline">
            Manage Room Statuses &rarr;
          </Link>
        </div>

        {maintenanceLocations.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            All 40 faculty facilities are currently available and open for booking.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {maintenanceLocations.map(loc => (
              <div key={loc.location_id} className="p-3.5 maintenance-stripe bg-amber-50 rounded-2xl border border-amber-300 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">{loc.name}</span>
                  <span className="font-mono text-[10px] font-extrabold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                    {loc.code}
                  </span>
                </div>
                <div className="text-[11px] text-amber-800 mt-1">
                  {loc.floor} Floor • {loc.category || 'Lab'}
                </div>
                <div className="text-[10px] text-amber-900 font-bold mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  Hidden from public booking calendar
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ROOM BOOKING REQUESTS AWAITING APPROVAL */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Room Booking Requests Awaiting Approval
              </h3>
              <p className="text-xs text-slate-500">
                Student and lecturer facility reservations requiring administrative approval.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold rounded-full text-xs">
            {pendingBookings.length} Pending
          </span>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
            No room booking requests awaiting review. All requests have been addressed!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingBookings.map(b => (
              <div 
                key={b.booking_id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-purple-300 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      {b.location_name} ({b.location_code})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      {b.location_floor} Floor
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                      Pending Admin Review
                    </span>
                  </div>

                  <div className="text-slate-700 font-semibold text-xs">
                    Purpose: <span className="font-normal">{b.purpose}</span>
                    {b.course_id && <span className="ml-2 font-mono text-[11px] text-purple-700">[{b.course_id}]</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1 text-blue-700 font-mono">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                        {' '}&rarr;{' '}
                        {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                      </span>
                    </div>

                    <div>
                      Requester: <strong className="text-slate-800">{b.user_name}</strong> ({b.user_role}) • <span className="font-mono">{b.matric_or_staff_id || b.user_email}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={actionLoadingId === b.booking_id}
                    onClick={() => handleRejectBooking(b.booking_id)}
                    className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 font-bold hover:bg-red-50 transition disabled:opacity-50 text-xs flex items-center gap-1.5"
                  >
                    <span>Reject</span>
                  </button>

                  <button
                    disabled={actionLoadingId === b.booking_id}
                    onClick={() => handleApproveBooking(b.booking_id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs disabled:opacity-50 text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{actionLoadingId === b.booking_id ? 'Processing...' : 'Approve & Confirm'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two columns: Breakdown Tickets & Pending Device Loans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Open Breakdown Tickets */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Pending Repair Work</span>
            </h3>
            <Link to="/tickets" className="text-xs text-blue-600 hover:underline font-bold">
              View All ({openIssues.length})
            </Link>
          </div>

          {openIssues.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No open breakdown tickets requiring attention!
            </div>
          ) : (
            <div className="space-y-3">
              {openIssues.slice(0, 4).map(ticket => (
                <div key={ticket.report_id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {ticket.location_name || ticket.device_name || `Ticket #${ticket.report_id}`}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ticket.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-1 text-[11px]">{ticket.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Loans Action Queue */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Loans Awaiting Action</span>
            </h3>
            <Link to="/devices/manage" className="text-xs text-blue-600 hover:underline font-bold">
              Open Queue ({pendingLoans.length})
            </Link>
          </div>

          {pendingLoans.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No pending loan requests or overdue returns.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLoans.slice(0, 4).map(loan => (
                <div key={loan.loan_id} className={`p-3 rounded-2xl text-xs space-y-1 border ${
                  loan.is_overdue ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{loan.device_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      loan.is_overdue ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {loan.is_overdue ? 'Overdue Return' : loan.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Borrower: <span className="font-semibold text-slate-700">{loan.borrower_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LogMaintenanceModal
        isOpen={isLogMaintOpen}
        onClose={() => setIsLogMaintOpen(false)}
        onLogged={() => fetchOperationalData()}
      />
    </div>
  );
}
