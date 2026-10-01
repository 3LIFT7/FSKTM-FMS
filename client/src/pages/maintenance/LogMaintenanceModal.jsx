import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Wrench, DollarSign, Calendar, AlertTriangle, CheckCircle2, Link as LinkIcon } from 'lucide-react';

export default function LogMaintenanceModal({ isOpen, onClose, prefillTicket, onLogged }) {
  const { user } = useAuth();

  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [reports, setReports] = useState([]);

  const [locationId, setLocationId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('0.00');
  const [datePerformed, setDatePerformed] = useState(new Date().toISOString().split('T')[0]);
  const [linkedReportId, setLinkedReportId] = useState('');
  const [scheduledReminderDate, setScheduledReminderDate] = useState('');
  const [setStatus, setSetStatus] = useState(''); // 'available', 'maintenance'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      if (prefillTicket) {
        if (prefillTicket.location_id) setLocationId(prefillTicket.location_id);
        if (prefillTicket.device_id) setDeviceId(prefillTicket.device_id);
        setLinkedReportId(prefillTicket.report_id);
        setDescription(`Repair work performed for Ticket #${prefillTicket.report_id}: ${prefillTicket.description}`);
        setSetStatus('available'); // default resolve
      }
      setError('');
      setSuccess('');
    }
  }, [isOpen, prefillTicket]);

  async function fetchDropdowns() {
    try {
      const [locRes, devRes, repRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/devices'),
        fetch('/api/issues')
      ]);
      const locData = await locRes.json();
      const devData = await devRes.json();
      const repData = await repRes.json();
      if (locData.success) setLocations(locData.locations);
      if (devData.success) setDevices(devData.devices);
      if (repData.success) setReports(repData.reports);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        location_id: locationId || null,
        device_id: deviceId || null,
        description,
        cost: parseFloat(cost) || 0.0,
        date_performed: datePerformed,
        linked_report_id: linkedReportId || null,
        scheduled_reminder_date: scheduledReminderDate || null,
        set_status: setStatus || null
      };

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record maintenance');

      setSuccess('Maintenance job recorded successfully!');
      if (onLogged) onLogged();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20">
              Operations & Servicing
            </span>
          </div>
          <h2 className="text-xl font-black">Log Maintenance Record</h2>
          <p className="text-xs text-indigo-200 mt-1">
            Record maintenance work, parts cost, service history, and link with breakdown tickets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Location & Device */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Facility
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- None / Device Specific --</option>
                {locations.map(l => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Device
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- None / Room Facility --</option>
                {devices.map(d => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.name} ({d.serial_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Link to Issue Ticket */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-blue-600" />
              Link to Breakdown Ticket (Optional)
            </label>
            <select
              value={linkedReportId}
              onChange={(e) => setLinkedReportId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            >
              <option value="">-- Unlinked Maintenance Job --</option>
              {reports.map(r => (
                <option key={r.report_id} value={r.report_id}>
                  Ticket #{r.report_id} - {r.description.slice(0, 45)}... [{r.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Work Performed / Diagnostic Summary *
            </label>
            <textarea
              required
              rows="3"
              placeholder="e.g. Replaced optical lenses, cleaned thermal paste, patched switch firmware, fixed projector cabling..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Cost & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Cost (MYR)
              </label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Date Completed
              </label>
              <input
                type="date"
                required
                value={datePerformed}
                onChange={(e) => setDatePerformed(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Scheduled Maintenance Reminder */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Next Scheduled Maintenance / Calibration Date
            </label>
            <input
              type="date"
              value={scheduledReminderDate}
              onChange={(e) => setScheduledReminderDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Facility Status Update Trigger */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-bold uppercase tracking-wider text-slate-600 text-[10px]">
              Post-Maintenance Operational State
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="setStatus"
                  value=""
                  checked={setStatus === ''}
                  onChange={() => setSetStatus('')}
                />
                <span>Leave Unchanged</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="setStatus"
                  value="available"
                  checked={setStatus === 'available'}
                  onChange={() => setSetStatus('available')}
                />
                <span className="text-emerald-700 font-bold">Mark Available</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="setStatus"
                  value="maintenance"
                  checked={setStatus === 'maintenance'}
                  onChange={() => setSetStatus('maintenance')}
                />
                <span className="text-amber-700 font-bold">Flag Under Maintenance</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Maintenance Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
