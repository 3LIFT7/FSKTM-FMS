import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Laptop, 
  MapPin, 
  AlertCircle, 
  Check, 
  Wrench, 
  Tag, 
  Cpu 
} from 'lucide-react';

export default function EditDeviceModal({ isOpen, onClose, device, onSaved }) {
  if (!isOpen || !device) return null;

  const [name, setName] = useState(device.name || '');
  const [category, setCategory] = useState(device.category || 'General');
  const [serialNumber, setSerialNumber] = useState(device.serial_number || '');
  const [locationId, setLocationId] = useState(device.location_id !== null && device.location_id !== undefined ? String(device.location_id) : '');
  const [status, setStatus] = useState(device.status || 'available');
  const [specs, setSpecs] = useState(device.specs || '');

  const [isLoanable, setIsLoanable] = useState(
    device.is_loanable !== undefined
      ? Boolean(device.is_loanable)
      : device.location_id === null
  );

  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error('Failed to load locations for device edit:', err);
    }
  }

  // Handle allocation mode change (Fixed in Room vs Loanable Pool)
  function handleModeChange(mode) {
    if (mode === 'room') {
      // Fixed in room: Non-loanable
      setIsLoanable(false);
      if (!locationId && locations.length > 0) {
        setLocationId(String(locations[0].location_id));
      }
    } else {
      // General Loan Pool: Loanable, no specific room
      setIsLoanable(true);
      setLocationId('');
    }
  }

  function handleLocationSelect(newLocId) {
    setLocationId(newLocId);
    if (newLocId) {
      // Stationed in room -> non-loanable
      setIsLoanable(false);
    } else {
      // Not in room -> loanable
      setIsLoanable(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !serialNumber.trim()) {
      setError('Device Name and Serial Number are required.');
      return;
    }

    if (!isLoanable && !locationId) {
      setError('Please select a specific room for non-loanable in-room equipment.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/devices/${device.device_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          serial_number: serialNumber.trim(),
          location_id: locationId ? parseInt(locationId, 10) : null,
          is_loanable: locationId ? false : Boolean(isLoanable),
          status,
          specs: specs.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update equipment details.');

      if (onSaved) {
        onSaved(data.device);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-4 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
              Technician Equipment Control
            </span>
            <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-emerald-200">
              {device.serial_number}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Modify Equipment
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Edit hardware specifications, category, station location, and operational status.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
              Device Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cisco Catalyst 2960-X Switch"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                Serial Number *
              </label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SW-CSC-2960X"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Networking, VR / AR, Workstation..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Equipment Allocation Type & Loan Eligibility */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-0.5">
                Device Allocation & Loan Eligibility *
              </label>
              <p className="text-[11px] text-slate-500">
                Determine whether this device is stationed in a specific room (non-loanable) or in the general pool (loanable).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleModeChange('room')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  !isLoanable || locationId
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    Fixed in Room
                  </span>
                  {(!isLoanable || locationId) && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Stationed in a specific room. Visible in room details, <strong>non-reservable</strong> by users.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('pool')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isLoanable && !locationId
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Loanable Pool
                  </span>
                  {isLoanable && !locationId && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Portable asset not tied to any room. <strong>Eligible for loan & reservation</strong> by users.
                </p>
              </button>
            </div>

            {/* If In-Room is chosen, show room selector */}
            {(!isLoanable || locationId) ? (
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Assign to Room / Facility *
                </label>
                <select
                  required
                  value={locationId}
                  onChange={(e) => handleLocationSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600 text-slate-800"
                >
                  <option value="">-- Select Room Location --</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.code} - {loc.name} ({loc.floor} Flr)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Non-loanable hardware assigned to this room cannot be booked by users.
                </p>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl">
                <span>✓ Mobile equipment in general loan pool (Reservable by students and lecturers)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
              Operational Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl font-bold ${
                status === 'available' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                status === 'checked_out' ? 'bg-blue-50 border-blue-300 text-blue-900' :
                status === 'maintenance' ? 'bg-amber-50 border-amber-300 text-amber-900' :
                'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <option value="available">Available</option>
              <option value="checked_out">Checked Out</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="broken">Broken / Decommissioned</option>
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
              Hardware Specs & Notes
            </label>
            <textarea
              rows="3"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="Processor, memory, storage, ports, firmware, accessories included..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
