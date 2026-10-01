import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Clock, 
  Layers, 
  Calendar,
  Sparkles
} from 'lucide-react';

export default function ScheduleImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function handleDownloadTemplate() {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Course ID,Day,Start Time,End Time,Lab,Purpose\n" +
      "WIF2002,Monday,09:00,11:00,MSD,Operating Systems Lab Group 1\n" +
      "WIX1002,Tuesday,14:00,16:00,MINFO,Data Structures Lab Practical\n" +
      "WIE3001,Wednesday,10:00,12:00,CISCO,Advanced Networking Configuration\n" +
      "WIB7001,Thursday,15:00,17:00,SEM-2,Postgraduate Software Engineering Seminar\n" +
      "WIC2001,Friday,09:00,11:00,MTW,Web Technologies Frontend Lab\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fsktm_semester_schedule_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/schedule/import-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process CSV');

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Semester Timetable CSV Bulk Import
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Automatically populate recurring 14-week class bookings from university timetable files.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV Template</span>
        </button>
      </div>

      {/* Upload Zone & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Upload Timetable File (.csv)</h2>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                {file ? (
                  <div className="text-sm font-bold text-slate-800">
                    Selected file: <span className="text-emerald-600">{file.name}</span>
                    <div className="text-xs text-slate-400 font-normal mt-0.5">Click to choose a different file</div>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-slate-700">Choose timetable CSV or drag & drop</span>
                    <span className="text-xs text-slate-400">Supported columns: Course ID, Day, Start Time, End Time, Lab</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {loading ? 'Processing Schedule Import...' : 'Import & Generate Recurring Bookings'}
            </button>
          </form>
        </div>

        {/* Column Mapping Reference Guide */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-4 text-xs">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Expected Columns</span>
          </div>

          <p className="text-slate-500 leading-relaxed">
            The CSV parser automatically maps column headers to FSKTM facilities and booking slots:
          </p>

          <ul className="space-y-2 text-slate-700 font-mono text-[11px]">
            <li className="p-2 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900">Course ID:</strong> Course code (e.g. WIF2002)
            </li>
            <li className="p-2 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900">Day:</strong> Monday, Tuesday, etc.
            </li>
            <li className="p-2 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900">Start Time:</strong> 24h format (e.g. 09:00)
            </li>
            <li className="p-2 bg-white rounded-lg border border-slate-200">
              <strong className="text-slate-900">Lab:</strong> Room code (MSD, MINFO, CISCO, etc.)
            </li>
          </ul>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            <strong>Core Rule:</strong> If any listed room is currently under maintenance, bookings for that room will be skipped and reported in the summary!
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>{result.message}</span>
          </div>

          {result.importedCourses && result.importedCourses.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Populated Course Bookings ({result.importedCourses.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Facility</th>
                      <th className="p-3">Day & Time</th>
                      <th className="p-3">Generated Weeks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.importedCourses.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-700">{c.courseId}</td>
                        <td className="p-3 font-semibold text-slate-800">{c.lab}</td>
                        <td className="p-3 text-slate-600 capitalize">{c.day}, {c.time}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {c.weeksCreated} Weeks Recurring
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Skipped Rows & Warnings ({result.errors.length})
              </h4>
              <div className="space-y-1.5">
                {result.errors.map((err, idx) => (
                  <div key={idx} className="p-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
                    Row {err.row}: {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
