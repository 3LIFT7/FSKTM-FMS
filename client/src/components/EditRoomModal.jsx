import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Monitor, 
  Users, 
  Layers, 
  AlertCircle, 
  Check, 
  Search,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function EditRoomModal({ isOpen, onClose, location, onSaved }) {
  if (!isOpen || !location) return null;

  // Room details state
  const [name, setName] = useState(location.name || '');
  const [code, setCode] = useState(location.code || '');
  const [floor, setFloor] = useState(location.floor || 'Ground');
  const [capacity, setCapacity] = useState(location.capacity || 30);
  const [category, setCategory] = useState(location.category || 'Computer Lab');
  const [description, setDescription] = useState(location.description || '');
  const [status, setStatus] = useState(location.status || 'available');

  // Equipment in this room state
  const [assignedDevices, setAssignedDevices] = useState(location.devices || []);
  const [allInventoryDevices, setAllInventoryDevices] = useState([]);
  const [selectedDeviceToAssign, setSelectedDeviceToAssign] = useState('');
  
  // Quick-add new device state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickDevName, setQuickDevName] = useState('');
  const [quickDevSerial, setQuickDevSerial] = useState('');
  const [quickDevCategory, setQuickDevCategory] = useState('Workstation');
  const [quickDevSpecs, setQuickDevSpecs] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');

  // Fetch all devices in inventory on mount and ensure room devices are loaded
  useEffect(() => {
    fetchInventory();
    if (location && (!location.devices || location.devices.length === 0)) {
      fetchRoomFullDevices();
    }
  }, [location?.location_id]);

  async function fetchRoomFullDevices() {
    try {
      const res = await fetch(`/api/locations/${location.location_id}`);
      const data = await res.json();
      if (data.success && data.location?.devices) {
        setAssignedDevices(data.location.devices);
      }
    } catch (err) {
      console.error('Failed to load room devices:', err);
    }
  }

  async function fetchInventory() {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setAllInventoryDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to load inventory devices:', err);
    }
  }

  // Remove / unassign device from this room locally
  function handleRemoveDevice(deviceId) {
    setAssignedDevices(prev => prev.filter(d => d.device_id !== deviceId));
  }

  // Assign existing device from inventory to this room locally
  function handleAssignDevice() {
    if (!selectedDeviceToAssign) return;
    const devId = parseInt(selectedDeviceToAssign, 10);
    const dev = allInventoryDevices.find(d => d.device_id === devId);
    if (!dev) return;

    if (!assignedDevices.some(d => d.device_id === devId)) {
      setAssignedDevices(prev => [...prev, dev]);
    }
    setSelectedDeviceToAssign('');
  }

  // Quick create new equipment directly in this room
  async function handleQuickCreateDevice(e) {
    e.preventDefault();
    if (!quickDevName.trim() || !quickDevSerial.trim()) {
      setError('Please provide a name and serial number for the new equipment.');
      return;
    }

    setQuickAddLoading(true);
    setError('');
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: quickDevName.trim(),
          category: quickDevCategory,
          serial_number: quickDevSerial.trim(),
          specs: quickDevSpecs.trim(),
          location_id: location.location_id,
          is_loanable: false,
          status: 'available'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create new device.');

      // Add to assigned devices and inventory list
      setAssignedDevices(prev => [...prev, data.device]);
      setAllInventoryDevices(prev => [...prev, data.device]);
      
      // Reset quick add form
      setQuickDevName('');
      setQuickDevSerial('');
      setQuickDevSpecs('');
      setIsQuickAddOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setQuickAddLoading(false);
    }
  }

  // Save all room edits
  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Room Name and Room Code are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const deviceIds = assignedDevices.map(d => d.device_id);

      const res = await fetch(`/api/locations/${location.location_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          floor,
          capacity: parseInt(capacity, 10) || 0,
          category,
          description: description.trim(),
          status,
          device_ids: deviceIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update room details.');

      if (onSaved) {
        onSaved(data.location);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Devices available to assign (not already in this room)
  const assignableDevices = allInventoryDevices.filter(
    d => !assignedDevices.some(ad => ad.device_id === d.device_id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 text-white relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
              Admin Room Management
            </span>
            <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-blue-200">
              {location.code}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Edit Room & Equipment Details
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            Update room name, capacity, status, and manage the equipment stationed inside this facility.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Room Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm border-b border-slate-100 pb-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Room Information & Specifications</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Makmal Sains Data"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Room Code *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MSD"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Capacity (Persons) *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Facility Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-bold ${
                    status === 'maintenance'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}
                >
                  <option value="available">Available for Booking</option>
                  <option value="maintenance">Under Maintenance (Auto-Hide)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Computer Lab, Seminar Room, Testing Lab..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                Facility Description
              </label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description of room features, specialized stations, projector/whiteboard support..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Section 2: Equipment Inside this Room */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Monitor className="w-4 h-4 text-purple-600" />
                <span>Equipment Inside this Room ({assignedDevices.length})</span>
              </div>
              
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-1 border border-purple-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isQuickAddOpen ? 'Cancel Quick Add' : 'Register New Device'}</span>
              </button>
            </div>

            {/* Quick Register New Device Form (Collapsible) */}
            {isQuickAddOpen && (
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 animate-fade-in">
                <div className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Register & Assign Brand New Equipment to {code}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Device Name (e.g. VR Headset #03)"
                    value={quickDevName}
                    onChange={(e) => setQuickDevName(e.target.value)}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Serial Number (e.g. VR-MQ3-003)"
                    value={quickDevSerial}
                    onChange={(e) => setQuickDevSerial(e.target.value)}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Category (e.g. VR / AR, Workstation)"
                    value={quickDevCategory}
                    onChange={(e) => setQuickDevCategory(e.target.value)}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Specs (e.g. 512GB, Touch Pro controllers)"
                    value={quickDevSpecs}
                    onChange={(e) => setQuickDevSpecs(e.target.value)}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={quickAddLoading}
                    onClick={handleQuickCreateDevice}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{quickAddLoading ? 'Registering...' : 'Add Equipment to Room'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of currently assigned equipment */}
            {assignedDevices.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                No equipment is currently stationed inside this room.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {assignedDevices.map(dev => (
                  <div
                    key={dev.device_id}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{dev.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="font-mono">SN: {dev.serial_number}</span>
                          <span>•</span>
                          <span>{dev.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        dev.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                        dev.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                        dev.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {dev.status?.replace('_', ' ')}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveDevice(dev.device_id)}
                        title="Remove from room (move to General Pool)"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Assign Existing Device from Inventory */}
            {assignableDevices.length > 0 && (
              <div className="pt-2">
                <label className="block font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-1">
                  Assign Existing Hardware to this Room
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedDeviceToAssign}
                    onChange={(e) => setSelectedDeviceToAssign(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="">-- Choose hardware asset from inventory --</option>
                    {assignableDevices.map(d => (
                      <option key={d.device_id} value={d.device_id}>
                        {d.name} ({d.serial_number}) - Currently: {d.location_name || 'General Pool'} [{d.status}]
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedDeviceToAssign}
                    onClick={handleAssignDevice}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
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
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Room Details...' : 'Save Room Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
