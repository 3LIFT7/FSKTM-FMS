import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, AlertTriangle, Upload, CheckCircle2, ShieldAlert, Image } from 'lucide-react';

export default function NewIssueModal({ isOpen, onClose, onCreated }) {
  const { user } = useAuth();

  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  async function fetchData() {
    try {
      const [locRes, devRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/devices')
      ]);
      const locData = await locRes.json();
      const devData = await devRes.json();
      if (locData.success) setLocations(locData.locations);
      if (devData.success) setDevices(devData.devices);
    } catch (err) {
      console.error(err);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      if (selectedLocationId) formData.append('location_id', selectedLocationId);
      if (selectedDeviceId) formData.append('device_id', selectedDeviceId);
      formData.append('description', description);
      if (photoFile) formData.append('photo', photoFile);

      const res = await fetch('/api/issues', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');

      setSuccess('Report submitted successfully! Technicians have been alerted.');
      if (onCreated) onCreated();
      setTimeout(() => {
        onClose();
        setDescription('');
        setPhotoFile(null);
        setPhotoPreview('');
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
        <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20">
              Ticketing
            </span>
          </div>
          <h2 className="text-xl font-black">Report Damage / Breakdown</h2>
          <p className="text-xs text-red-100 mt-1">
            Help keep FSKTM facilities operational by logging damaged equipment or room issues.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Room / Lab Location
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-600"
            >
              <option value="">-- Choose Location (Optional if specific device) --</option>
              {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.code} - {loc.name} ({loc.floor} Floor)
                </option>
              ))}
            </select>
          </div>

          {/* Device */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Specific Device / Equipment (Optional)
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-600"
            >
              <option value="">-- Choose Device (Optional if room facility issue) --</option>
              {devices.map(dev => (
                <option key={dev.device_id} value={dev.device_id}>
                  {dev.name} [SN: {dev.serial_number}] - ({dev.status})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Problem Description *
            </label>
            <textarea
              required
              rows="3"
              placeholder="Describe what is broken, abnormal sounds, error messages, physical damage, or leakages..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-600"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Attach Photo of Breakdown
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {photoPreview ? (
                <div className="space-y-2">
                  <img src={photoPreview} alt="Preview" className="h-32 mx-auto rounded-lg object-cover border" />
                  <span className="text-xs text-blue-600 font-semibold block">Click to replace photo</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-medium">Click or drag photo here to upload</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG up to 10MB</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'File Damage Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
