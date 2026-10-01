import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import EditDeviceModal from '../../components/EditDeviceModal';
import { 
  Laptop, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  RefreshCw, 
  ArrowRightLeft, 
  Check, 
  X,
  XCircle,
  Wrench,
  Edit2,
  Trash2,
  Filter,
  ShieldAlert,
  MapPin
} from 'lucide-react';

export default function DeviceManage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('loans'); // 'loans' or 'inventory'
  const [loans, setLoans] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inventory filtering state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('All');
  const [inventoryStatus, setInventoryStatus] = useState('All');
  const [inventoryType, setInventoryType] = useState('All'); // 'All', 'loanable', 'room'

  // New device form state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newSerial, setNewSerial] = useState('');
  const [newSpecs, setNewSpecs] = useState('');
  const [newAllocationMode, setNewAllocationMode] = useState('room'); // 'room' or 'pool'
  const [newLocationId, setNewLocationId] = useState('');
  const [newIsLoanable, setNewIsLoanable] = useState(false);
  const [newStatus, setNewStatus] = useState('available');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [loanRes, devRes, locRes] = await Promise.all([
        fetch('/api/device-loans'),
        fetch('/api/devices'),
        fetch('/api/locations')
      ]);
      const loanData = await loanRes.json();
      const devData = await devRes.json();
      const locData = await locRes.json();

      if (loanData.success) setLoans(loanData.loans);
      if (devData.success) setDevices(devData.devices);
      if (locData.success) setLocations(locData.locations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoanAction(loanId, action) {
    try {
      const res = await fetch(`/api/device-loans/${loanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCreateDevice(e) {
    e.preventDefault();
    if (newAllocationMode === 'room' && !newLocationId) {
      alert('Please select a specific room for non-loanable in-room hardware.');
      return;
    }

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newDeviceName,
          category: newCategory,
          serial_number: newSerial,
          specs: newSpecs,
          location_id: newAllocationMode === 'room' && newLocationId ? parseInt(newLocationId, 10) : null,
          is_loanable: newAllocationMode === 'pool',
          status: newStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsAddDeviceOpen(false);
      setNewDeviceName('');
      setNewSerial('');
      setNewSpecs('');
      setNewLocationId('');
      setNewAllocationMode('room');
      setNewIsLoanable(false);
      setNewStatus('available');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteDevice() {
    if (!deletingDevice) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/devices/${deletingDevice.device_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove equipment.');

      setDeletingDevice(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  // Overdue count
  const overdueLoans = loans.filter(l => l.is_overdue);

  // Unique categories for inventory filter
  const categories = ['All', ...new Set(devices.map(d => d.category).filter(Boolean))];

  // Filtered devices list for Inventory tab
  const filteredDevices = devices.filter(dev => {
    if (inventoryType === 'loanable' && !dev.is_loanable) return false;
    if (inventoryType === 'room' && dev.is_loanable) return false;
    if (inventoryCategory !== 'All' && dev.category !== inventoryCategory) return false;
    if (inventoryStatus !== 'All' && dev.status !== inventoryStatus) return false;
    if (inventorySearch) {
      const q = inventorySearch.toLowerCase();
      return (
        dev.name.toLowerCase().includes(q) ||
        dev.serial_number.toLowerCase().includes(q) ||
        (dev.location_name && dev.location_name.toLowerCase().includes(q)) ||
        (dev.specs && dev.specs.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Laptop className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Device Inventory & Loan Management
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Control equipment check-outs, return logging, overdue monitoring, and catalog inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* OVERDUE ALERTS BANNER */}
      {overdueLoans.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-900 animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Overdue Alert: </span>
              {overdueLoans.length} borrowed equipment {overdueLoans.length === 1 ? 'item is' : 'items are'} past their expected return time!
            </div>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-lg shrink-0 text-[10px] uppercase tracking-wider">
            Urgent Return
          </span>
        </div>
      )}

      {/* Switcher Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('loans')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'loans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Active Loan & Return Requests ({loans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Inventory Master List ({devices.length})</span>
        </button>
      </div>

      {/* TAB 1: LOANS WORKFLOW */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Loan Records Queue
            </span>
            <button onClick={fetchData} className="p-1 hover:text-blue-600">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">Loan ID</th>
                  <th className="p-4">Device</th>
                  <th className="p-4">Borrower</th>
                  <th className="p-4">Expected Return</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map(loan => (
                  <tr key={loan.loan_id} className={`hover:bg-slate-50/80 transition ${loan.is_overdue ? 'bg-red-50/50' : ''}`}>
                    <td className="p-4 font-mono font-bold text-slate-500">#{loan.loan_id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{loan.device_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">SN: {loan.serial_number}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{loan.borrower_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{loan.matric_or_staff_id || loan.borrower_email}</div>
                    </td>
                    <td className="p-4">
                      <div className={loan.is_overdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                        {new Date(loan.expected_return_time).toLocaleString('en-MY', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                      {loan.is_overdue && (
                        <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        loan.status === 'approved' ? 'bg-indigo-100 text-indigo-800' :
                        loan.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                        loan.status === 'returned' ? 'bg-emerald-100 text-emerald-800' :
                        loan.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {loan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      {loan.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleLoanAction(loan.loan_id, 'approve')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan.loan_id, 'reject')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(loan.status === 'approved' || loan.status === 'pending') && (
                        <button
                          onClick={() => handleLoanAction(loan.loan_id, 'checkout')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Check Out
                        </button>
                      )}
                      {loan.status === 'checked_out' && (
                        <button
                          onClick={() => handleLoanAction(loan.loan_id, 'return')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          Log Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY LIST */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventory Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search equipment name, serial number, facility, specs..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <select
                value={inventoryType}
                onChange={(e) => setInventoryType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-600"
              >
                <option value="All">All Types (Pool & In-Room)</option>
                <option value="loanable">Loanable Pool (Portable)</option>
                <option value="room">Fixed In-Room (Non-Loanable)</option>
              </select>

              <select
                value={inventoryCategory}
                onChange={(e) => setInventoryCategory(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <select
                value={inventoryStatus}
                onChange={(e) => setInventoryStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-600"
              >
                <option value="All">All Statuses</option>
                <option value="available">Available Only</option>
                <option value="checked_out">Checked Out</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="broken">Broken</option>
              </select>
            </div>

            <button
              onClick={fetchData}
              title="Refresh Inventory"
              className="p-2 text-slate-500 hover:text-emerald-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                Registered Hardware Assets ({filteredDevices.length} items)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Serial Number</th>
                    <th className="p-4">Name & Specs</th>
                    <th className="p-4">Allocation & Loan Type</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Home Facility</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        No equipment found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map(dev => (
                      <tr key={dev.device_id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-slate-700">{dev.serial_number}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{dev.name}</div>
                          <div className="text-[11px] text-slate-500 max-w-sm truncate">{dev.specs || 'Standard equipment'}</div>
                        </td>
                        <td className="p-4">
                          {dev.is_loanable ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                              <Laptop className="w-3 h-3 text-emerald-600" />
                              Loanable Pool
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 w-max">
                              <MapPin className="w-3 h-3 text-indigo-600" />
                              Fixed In-Room
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-600">{dev.category}</td>
                        <td className="p-4 text-slate-700">
                          {dev.location_name ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-bold text-slate-800">{dev.location_name}</span>
                              <span className="text-slate-400 text-[10px]">({dev.location_floor} Flr)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-mono text-[11px]">General Pool (Mobile)</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            dev.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                            dev.status === 'checked_out' ? 'bg-blue-100 text-blue-800' :
                            dev.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {dev.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setEditingDevice(dev)}
                            className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center gap-1 font-bold text-xs border border-slate-200"
                            title="Modify equipment"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingDevice(dev)}
                            className="px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition inline-flex items-center gap-1 font-bold text-xs border border-slate-200"
                            title="Remove equipment"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-6 text-white relative shrink-0">
              <button
                onClick={() => setIsAddDeviceOpen(false)}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-black">Register New Equipment</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Add device to faculty inventory</p>
            </div>

            <form onSubmit={handleCreateDevice} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Device Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Catalyst 3850 Switch"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SW-CSC-3850"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Networking / VR / Testing"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Allocation Type & Loan Eligibility */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-0.5">
                    Equipment Allocation & Loan Eligibility *
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Station in a specific room (non-loanable) or place in general pool (loanable).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAllocationMode('room');
                      setNewIsLoanable(false);
                      if (!newLocationId && locations.length > 0) {
                        setNewLocationId(String(locations[0].location_id));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      newAllocationMode === 'room'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-600" />
                        Fixed in Room
                      </span>
                      {newAllocationMode === 'room' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">Non-reservable fixture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewAllocationMode('pool');
                      setNewIsLoanable(true);
                      setNewLocationId('');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      newAllocationMode === 'pool'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-emerald-600" />
                        Loanable Pool
                      </span>
                      {newAllocationMode === 'pool' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">Reservable mobile kit</span>
                  </button>
                </div>

                {newAllocationMode === 'room' ? (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Select Facility / Room *
                    </label>
                    <select
                      required
                      value={newLocationId}
                      onChange={(e) => setNewLocationId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="">-- Choose Target Room --</option>
                      {locations.map(loc => (
                        <option key={loc.location_id} value={loc.location_id}>
                          {loc.code} - {loc.name} ({loc.floor} Flr)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="pt-1 text-[10px] text-emerald-700 font-medium">
                    ✓ Item will be placed in the general loan pool (available for student/staff booking)
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="broken">Broken</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">Hardware Specs</label>
                <textarea
                  rows="2"
                  placeholder="Port specs, CPU/GPU, memory, storage..."
                  value={newSpecs}
                  onChange={(e) => setNewSpecs(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-xs hover:bg-emerald-700 transition"
                >
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={!!editingDevice}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={() => {
            setEditingDevice(null);
            fetchData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-black text-slate-900">
              Remove Equipment?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">{deletingDevice.name}</strong> (SN: <span className="font-mono text-slate-700 font-bold">{deletingDevice.serial_number}</span>) from the faculty inventory? This action cannot be undone.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingDevice(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteDevice}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
