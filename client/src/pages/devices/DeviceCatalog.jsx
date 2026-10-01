import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BorrowDeviceModal from './BorrowDeviceModal';
import { 
  Laptop, 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Plus,
  Lock,
  Layers,
  Building2,
  ArrowRight
} from 'lucide-react';

export default function DeviceCatalog() {
  const { user, isStaff } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeTab, setTypeTab] = useState('all'); // 'all', 'loanable', 'room'
  const [selectedDeviceForLoan, setSelectedDeviceForLoan] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    setLoading(true);
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) setDevices(data.devices);
    } catch (err) {
      console.error('Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  }

  const isStudentOrLecturer = !isStaff || user?.role === 'student' || user?.role === 'lecturer';

  const categories = ['All', ...new Set(
    devices
      .filter(d => (isStudentOrLecturer ? d.is_loanable : true))
      .map(d => d.category)
      .filter(Boolean)
  )];

  const loanableCount = devices.filter(d => d.is_loanable).length;
  const inRoomCount = devices.filter(d => !d.is_loanable).length;

  const filteredDevices = devices.filter(d => {
    // For students and lecturers, non-bookable devices appear ONLY in the room booking section
    if (isStudentOrLecturer && !d.is_loanable) return false;
    
    // For staff, respect the segmented tabs
    if (!isStudentOrLecturer && typeTab === 'loanable' && !d.is_loanable) return false;
    if (!isStudentOrLecturer && typeTab === 'room' && d.is_loanable) return false;

    if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.serial_number.toLowerCase().includes(q) ||
        (d.specs && d.specs.toLowerCase().includes(q)) ||
        (d.location_name && d.location_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
      case 'checked_out':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Checked Out
          </span>
        );
      case 'maintenance':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Maintenance
          </span>
        );
      case 'broken':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1">
            Broken
          </span>
        );
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
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Laptop className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Equipment & Device Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            {isStudentOrLecturer 
              ? 'Browse and request portable faculty equipment available for loan (VR headsets, cameras, laptops, test kits).'
              : 'Browse loanable equipment (portable kits) and view fixed hardware stationed across faculty labs and rooms.'
            }
          </p>
        </div>

        {/* Segmented Type Tabs (Visible to Staff only) */}
        {isStaff && (
          <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 shrink-0 self-start md:self-auto text-xs font-bold">
            <button
              onClick={() => setTypeTab('all')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                typeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {devices.length}
              </span>
            </button>

            <button
              onClick={() => setTypeTab('loanable')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                typeTab === 'loanable'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span>Loanable Pool</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {loanableCount}
              </span>
            </button>

            <button
              onClick={() => setTypeTab('room')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                typeTab === 'room'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Fixed in Room</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                {inRoomCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Student & Lecturer Notice: In-room hardware belongs to Room Booking */}
      {isStudentOrLecturer && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Looking for in-room lab & studio equipment?</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Non-loanable hardware (such as <strong>Cisco Routers & Switches</strong>, <strong>Studio Audio Consoles</strong>, <strong>Rigol Oscilloscopes</strong>, and <strong>GPU Rigs</strong>) is stationed in specific faculty rooms. Reserve the room in the <strong>Room Booking</strong> section to use them.
              </p>
            </div>
          </div>
          <Link
            to="/map"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl whitespace-nowrap text-center transition flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>View Rooms & Facilities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by device name, serial number, facility, or specs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600"
          >
            <option value="All">All Statuses</option>
            <option value="available">Available Only</option>
            <option value="checked_out">Checked Out</option>
            <option value="maintenance">Under Maintenance</option>
          </select>
        </div>

        <button
          onClick={fetchDevices}
          className="p-2 text-slate-500 hover:text-blue-600 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Loading equipment catalog...</p>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No equipment found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map(dev => (
            <div
              key={dev.device_id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {dev.category}
                    </span>
                    {dev.is_loanable ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Laptop className="w-2.5 h-2.5" /> Loanable
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> Fixed In Room
                      </span>
                    )}
                  </div>
                  {getStatusBadge(dev.status)}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">
                  {dev.name}
                </h3>
                <div className="text-[11px] font-mono text-slate-400 mb-3">
                  SN: {dev.serial_number}
                </div>

                {dev.specs && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                    {dev.specs}
                  </p>
                )}

                {/* Location Station Information */}
                {dev.location_name ? (
                  <div className="text-xs text-slate-700 flex items-center gap-1.5 mb-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Stationed at: <strong className="text-slate-900">{dev.location_name}</strong> ({dev.location_floor} Flr)</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 flex items-center gap-1.5 mb-2 bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                    <Laptop className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">General Loan Pool (Mobile Asset)</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100 mt-2">
                {!dev.is_loanable ? (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-100 text-slate-500 font-semibold rounded-xl text-xs cursor-default flex items-center justify-center gap-1.5 border border-slate-200"
                    title="Fixed hardware assigned to a specific room; non-reservable"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Non-Reservable (In-Room Fixed Hardware)</span>
                  </button>
                ) : dev.status === 'available' ? (
                  <button
                    onClick={() => setSelectedDeviceForLoan(dev)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Request / Borrow Device</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs cursor-not-allowed"
                  >
                    Currently {dev.status.replace('_', ' ')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Borrow Modal */}
      <BorrowDeviceModal
        isOpen={!!selectedDeviceForLoan}
        onClose={() => setSelectedDeviceForLoan(null)}
        device={selectedDeviceForLoan}
        onRequested={() => fetchDevices()}
      />
    </div>
  );
}
