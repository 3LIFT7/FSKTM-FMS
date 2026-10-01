import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Laptop, AlertTriangle, Clock, CheckCircle2, Trash2 } from 'lucide-react';

export default function MyActivity() {
  const { user } = useAuth();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyData();
  }, []);

  async function fetchMyData() {
    setLoading(true);
    try {
      const [bRes, lRes, rRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/device-loans'),
        fetch('/api/issues')
      ]);
      const bData = await bRes.json();
      const lData = await lRes.json();
      const rData = await rRes.json();

      if (bData.success) setBookings(bData.bookings.filter(b => b.user_id === user.user_id));
      if (lData.success) setLoans(lData.loans);
      if (rData.success) setReports(rData.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(id) {
    if (!confirm('Cancel this room reservation?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchMyData();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          My Activity, Bookings & Requests
        </h1>
        <p className="text-xs text-slate-500">
          Track your room reservations, borrowed devices, and submitted breakdown tickets.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('bookings')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            tab === 'bookings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Room Reservations ({bookings.length})</span>
        </button>
        <button
          onClick={() => setTab('loans')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            tab === 'loans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Device Loans ({loans.length})</span>
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            tab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Damage Reports ({reports.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        {tab === 'bookings' && (
          bookings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No reservations scheduled.</div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.booking_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{b.location_name} ({b.location_code})</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {b.status === 'pending' ? 'Pending Admin Approval' : b.status === 'approved' ? 'Confirmed / Booked' : 'Rejected'}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">{b.purpose}</div>
                    <div className="text-blue-700 font-mono text-[11px] mt-1">
                      {new Date(b.start_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' - '}
                      {new Date(b.end_time).toLocaleTimeString('en-MY', { timeStyle: 'short' })}
                    </div>
                    {b.rejection_reason && (
                      <div className="text-red-600 font-medium text-[11px] mt-1">
                        Reason: {b.rejection_reason}
                      </div>
                    )}
                  </div>
                  {b.status !== 'rejected' && b.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancelBooking(b.booking_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition self-start sm:self-center"
                      title="Cancel Reservation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'loans' && (
          loans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No device loans found.</div>
          ) : (
            <div className="space-y-3">
              {loans.map(l => (
                <div key={l.loan_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{l.device_name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">SN: {l.serial_number}</div>
                    <div className="text-slate-600 mt-0.5">{l.purpose}</div>
                    <div className="text-blue-700 text-[11px] mt-1">
                      Return deadline: {new Date(l.expected_return_time).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
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
          )
        )}

        {tab === 'reports' && (
          reports.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No damage reports filed.</div>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.report_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {r.location_name || r.device_name || `Ticket #${r.report_id}`}
                    </div>
                    <p className="text-slate-600 mt-0.5">{r.description}</p>
                    <div className="text-slate-400 text-[10px] mt-1">
                      Submitted on {new Date(r.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                    </div>
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
          )
        )}
      </div>
    </div>
  );
}
