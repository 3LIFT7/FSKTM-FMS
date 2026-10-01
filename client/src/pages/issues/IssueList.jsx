import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NewIssueModal from './NewIssueModal';
import { 
  AlertTriangle, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  MapPin, 
  Laptop, 
  Filter, 
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';

export default function IssueList({ onLogMaintenanceForIssue }) {
  const { user, isStaff } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    setLoading(true);
    try {
      const res = await fetch('/api/issues');
      const data = await res.json();
      if (data.success) setReports(data.reports);
    } catch (err) {
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(reportId, newStatus) {
    try {
      const res = await fetch(`/api/issues/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchIssues();
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-bold text-xs">Open</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">In Progress</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">Resolved</span>;
      case 'closed':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full font-bold text-xs">Closed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Damage & Breakdown Tickets
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {isStaff 
              ? 'Operational ticketing queue for facility breakdowns and equipment repairs.' 
              : 'Submit and track reported breakdowns across FSKTM.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Breakdown</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex gap-1">
          {['All', 'open', 'in_progress', 'resolved', 'closed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={fetchIssues}
          className="p-1.5 text-slate-500 hover:text-slate-900 transition flex items-center gap-1 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ticket Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No damage tickets found in this view.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Report Breakdown" to file a new repair request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map(ticket => (
            <div
              key={ticket.report_id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                      TICKET #{ticket.report_id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {ticket.location_name || ticket.device_name || 'General Faculty Issue'}
                    </h3>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                  {ticket.description}
                </p>

                {/* Location & Device Tags */}
                <div className="flex flex-wrap gap-2 text-xs mb-3">
                  {ticket.location_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-medium text-[11px]">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {ticket.location_code} ({ticket.location_floor} Flr)
                    </span>
                  )}
                  {ticket.device_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-medium text-[11px]">
                      <Laptop className="w-3 h-3 text-indigo-600" />
                      {ticket.device_name}
                    </span>
                  )}
                  {ticket.photo_url && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(ticket.photo_url)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition"
                    >
                      <Eye className="w-3 h-3" />
                      View Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Footer Meta & Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <div>
                  Reported by <span className="font-semibold text-slate-600">{ticket.reporter_name}</span> on{' '}
                  {new Date(ticket.created_at).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                </div>

                {/* Staff Actions */}
                {isStaff && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => updateStatus(ticket.report_id, 'in_progress')}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        Start Work
                      </button>
                    )}
                    {ticket.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(ticket.report_id, 'resolved')}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {ticket.status === 'resolved' && (
                      <button
                        onClick={() => updateStatus(ticket.report_id, 'closed')}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold"
                      >
                        Close Ticket
                      </button>
                    )}
                    {onLogMaintenanceForIssue && (
                      <button
                        onClick={() => onLogMaintenanceForIssue(ticket)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        Log Maintenance
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Issue Modal */}
      <NewIssueModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={() => fetchIssues()}
      />

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden p-2">
            <img src={selectedPhoto} alt="Damage evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="mt-2 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              Close Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
