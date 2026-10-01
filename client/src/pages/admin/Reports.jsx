import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Layers, AlertTriangle, Building2, Wrench, RefreshCw } from 'lucide-react';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports/summary', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setData(json.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold">Compiling faculty analytical reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Reports & Facility Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Overview of facility utilization, breakdown frequency, and maintenance financial expenditure.
          </p>
        </div>

        <button onClick={fetchStats} className="p-2 text-slate-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facility Utilization</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{data.bookings?.total_bookings || 0}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {data.bookings?.upcoming_bookings || 0} active/upcoming slots
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Maintenance Expenditure</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            MYR {parseFloat(data.maintenance?.total_maintenance_expenditure || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {data.maintenance?.total_maintenance_jobs || 0} completed work orders
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rooms Under Maintenance</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {data.locations?.maintenance_locations || 0}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            Auto-hidden from calendar
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Open Breakdown Tickets</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {data.issues?.open_reports || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.issues?.in_progress_reports || 0} in progress
          </div>
        </div>
      </div>

      {/* Analytics Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Utilized Rooms */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Top Utilized Facilities</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Rooms with the highest volume of reservations.</p>

          <div className="space-y-3">
            {data.top_facilities && data.top_facilities.map((fac, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{fac.name}</div>
                  <div className="text-slate-400 text-[10px]">{fac.code} • {fac.floor} Floor</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-blue-600 text-sm">{fac.booking_count}</span>
                  <div className="text-[10px] text-slate-400">Total Bookings</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Broken Items */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-red-600" />
            <span>Frequently Broken Items & Areas</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Facilities and devices requiring repeated repair attention.</p>

          <div className="space-y-3">
            {data.frequent_breakdowns && data.frequent_breakdowns.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{item.facility_name}</div>
                  <div className="text-slate-500 text-[11px]">{item.device_name}</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-red-600 text-sm">{item.report_count}</span>
                  <div className="text-[10px] text-slate-400">Breakdown Reports</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
