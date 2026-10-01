import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LogMaintenanceModal from './LogMaintenanceModal';
import { 
  Wrench, 
  Plus, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Laptop, 
  Link as LinkIcon, 
  Bell, 
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function MaintenanceList() {
  const { isStaff } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' or 'reminders'
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [viewFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const url = viewFilter === 'reminders' 
        ? '/api/maintenance?upcoming_reminders=true' 
        : '/api/maintenance';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalCost = logs.reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Maintenance Logs & Servicing
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Historical repair records, scheduled calibrations, servicing costs, and breakdown links.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Log Maintenance</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Servicing Jobs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{logs.length}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expenditure Incurred</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            MYR {totalCost.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Check-ups</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {logs.filter(l => l.scheduled_reminder_date).length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex gap-2">
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Work History
          </button>
          <button
            onClick={() => setViewFilter('reminders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              viewFilter === 'reminders'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Scheduled Routine Reminders</span>
          </button>
        </div>

        <button
          onClick={fetchLogs}
          className="p-1.5 text-slate-500 hover:text-slate-900 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Retrieving maintenance records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No maintenance records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.log_id} className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      LOG #{log.log_id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {log.location_name || log.device_name || 'General Servicing'}
                    </span>
                    {log.location_code && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800">
                        {log.location_code} ({log.location_floor} Flr)
                      </span>
                    )}
                    {log.device_serial && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700">
                        SN: {log.device_serial}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {log.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-1">
                    <span>
                      Performed by <strong className="text-slate-700">{log.technician_name}</strong> on{' '}
                      {new Date(log.date_performed).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                    </span>

                    {log.linked_report_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                        <LinkIcon className="w-3 h-3 text-amber-600" />
                        Linked Breakdown Ticket #{log.linked_report_id}
                      </span>
                    )}

                    {log.scheduled_reminder_date && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[10px]">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        Next Servicing: {new Date(log.scheduled_reminder_date).toLocaleDateString('en-MY', { dateStyle: 'medium' })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Job Cost</div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    MYR {parseFloat(log.cost).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LogMaintenanceModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onLogged={() => fetchLogs()}
      />
    </div>
  );
}
