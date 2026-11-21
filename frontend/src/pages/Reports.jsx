import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2, Download, Loader2, Users, DollarSign, CalendarDays, UserPlus,
  Printer, Sparkles, Filter, ChevronDown, CheckCircle2, TrendingUp,
  PieChart as PieIcon, ShoppingBag, Landmark, ArrowUpRight, ArrowDownRight,
  Heart, Building2, HelpCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid, LabelList
} from 'recharts';
import { reportsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const currency = n => `₦${Number(n || 0).toLocaleString()}`;

// Executive Infographic Color Palette matching the board report specs
const COLORS = {
  primaryNavy: '#0e6080',
  accentSky: '#a4d8eb',
  accentTeal: '#0284c7',
  lightGray: '#e2e8f0',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  purple: '#8b5cf6',
};

const PIE_PALETTE = ['#0e6080', '#0284c7', '#38bdf8', '#7dd3fc', '#a4d8eb', '#e2e8f0'];
const GENDER_PALETTE = ['#0e6080', '#a4d8eb']; // Female (Navy), Male (Sky)
const YES_NO_PALETTE = ['#0e6080', '#e2e8f0']; // Yes (Navy), No (Light Gray)

// Custom Center Label for Donut Charts
function DonutCenterLabel({ cx, cy, label, sublabel }) {
  return (
    <g>
      <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" className="text-xl sm:text-2xl font-bold fill-gray-900 font-display">
        {label}
      </text>
      {sublabel && (
        <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-semibold fill-gray-400 uppercase tracking-wider">
          {sublabel}
        </text>
      )}
    </g>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const reportRef = useRef(null);

  // Active Report View
  const [activeReport, setActiveReport] = useState('friendship'); 
  // 'friendship' | 'hangout' | 'finance' | 'budget' | 'procurement' | 'raw_data'

  // Period Filters
  const [selectedYear, setSelectedYear] = useState('2026');
  const [periodPreset, setPeriodPreset] = useState('Jan-Apr 2026');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });

  // Report Data States
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Raw Tabular Data States
  const [rawEntity, setRawEntity] = useState('members');
  const [rawData, setRawData] = useState(null);
  const [rawSummary, setRawSummary] = useState(null);

  const churchTitle = user?.churchName || user?.church_name || 'ChurchOS';

  const fetchActiveReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { year: selectedYear };
      if (customRange.startDate) params.startDate = customRange.startDate;
      if (customRange.endDate) params.endDate = customRange.endDate;

      let res;
      if (activeReport === 'friendship') {
        res = await reportsAPI.friendshipUnit(params);
      } else if (activeReport === 'hangout') {
        res = await reportsAPI.hangoutAssimilation(params);
      } else if (activeReport === 'finance') {
        res = await reportsAPI.financeExecutive(params);
      } else if (activeReport === 'budget') {
        res = await reportsAPI.budgetPerformance(params);
      } else if (activeReport === 'procurement') {
        res = await reportsAPI.procurementAudit(params);
      } else if (activeReport === 'raw_data') {
        if (rawEntity === 'members') res = await reportsAPI.members(params);
        else if (rawEntity === 'finance') res = await reportsAPI.finance(params);
        else if (rawEntity === 'attendance') res = await reportsAPI.attendance(params);
        else res = await reportsAPI.firstTimers(params);
        setRawData(res.data.data);
        setRawSummary(res.data.summary);
      }

      if (res?.data?.data) {
        setReportData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeReport, selectedYear, customRange, rawEntity]);

  useEffect(() => {
    fetchActiveReport();
  }, [fetchActiveReport]);

  const handlePrint = () => {
    window.print();
  };

  const handlePresetChange = (preset) => {
    setPeriodPreset(preset);
    if (preset === 'Jan-Apr 2026') {
      setSelectedYear('2026');
      setCustomRange({ startDate: '2026-01-01', endDate: '2026-04-30' });
    } else if (preset === 'Jan-Jun 2026') {
      setSelectedYear('2026');
      setCustomRange({ startDate: '2026-01-01', endDate: '2026-06-30' });
    } else if (preset === 'Full Year 2026') {
      setSelectedYear('2026');
      setCustomRange({ startDate: '2026-01-01', endDate: '2026-12-31' });
    } else if (preset === 'Q1 2026') {
      setSelectedYear('2026');
      setCustomRange({ startDate: '2026-01-01', endDate: '2026-03-31' });
    } else if (preset === 'Q2 2026') {
      setSelectedYear('2026');
      setCustomRange({ startDate: '2026-04-01', endDate: '2026-06-30' });
    } else {
      setCustomRange({ startDate: '', endDate: '' });
    }
  };

  const exportCSV = (rows, filename) => {
    if (!rows?.length) return toast.error('No data to export');
    const keys = Object.keys(rows[0]);
    const csv = [
      keys.join(','),
      ...rows.map(r =>
        keys
          .map(k => {
            const v = r[k];
            if (v === null || v === undefined) return '';
            const s = String(v).replace(/"/g, '""');
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
          })
          .join(',')
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('CSV downloaded!');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── TOP CONTROLS & NAVIGATION (HIDDEN ON PRINT) ───────── */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-gray-900 flex items-center gap-2">
            <BarChart2 className="text-brand-600" size={24} />
            Executive Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Board-level infographic summaries, assimilation tracking, financial performance, and audit reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {['Jan-Apr 2026', 'Jan-Jun 2026', 'Full Year 2026', 'Q1 2026', 'Q2 2026'].map(preset => (
              <button
                key={preset}
                onClick={() => handlePresetChange(preset)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  periodPreset === preset
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 bg-white hover:bg-gray-50"
            title="Print or Save as PDF"
          >
            <Printer size={15} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── REPORT VIEW TABS (HIDDEN ON PRINT) ────────────────── */}
      <div className="print:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
        {[
          { id: 'friendship', label: 'Friendship Unit Report', icon: Heart },
          { id: 'hangout', label: "First Timers' Hangout", icon: Users },
          { id: 'finance', label: 'Financial Performance', icon: DollarSign },
          { id: 'budget', label: 'Budget & Variance Audit', icon: Landmark },
          { id: 'procurement', label: 'Procurement & Requisitions', icon: ShoppingBag },
          { id: 'raw_data', label: 'Tabular Data & CSV', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/70'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── PRINT-OPTIMIZED CONTAINER ─────────────────────────── */}
      <div id="churchos-printable-report" ref={reportRef} className="print:m-0 print:p-0">
        {loading ? (
          <div className="p-20 text-center bg-white rounded-2xl border border-gray-100">
            <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Generating executive analytics...</p>
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* REPORT 1: FRIENDSHIP UNIT REPORT (Exact match to Image 1)  */}
            {/* ========================================================= */}
            {activeReport === 'friendship' && reportData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#0e6080] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase font-display">
                      FRIENDSHIP UNIT REPORT {selectedYear}
                    </h2>
                    <p className="text-xs text-sky-100 font-medium mt-0.5">
                      {churchTitle} • Comprehensive Guest Intake & Service Experience Audit ({periodPreset})
                    </p>
                  </div>
                  <div className="bg-[#08455e] border border-sky-400/30 rounded-xl px-5 py-2.5 text-center shrink-0">
                    <p className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                      Total First Timers
                    </p>
                    <p className="text-3xl font-bold font-display text-white mt-0.5">
                      {reportData.totalFirstTimers || 0}
                    </p>
                  </div>
                </div>

                {/* Main Infographic Grid */}
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Row 1: Monthly Trend Bar Chart & Gender Donut */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Monthly Trend Bar Chart */}
                    <div className="lg:col-span-2 border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-4">
                        First timers through {selectedYear}
                      </h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={reportData.monthlyTrend || []} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 12, fill: '#475569' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip cursor={{ fill: '#f1f5f9' }} />
                          <Bar dataKey="count" fill="#0e6080" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="count" position="top" style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 12 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right: Gender Donut */}
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 flex flex-col items-center justify-between">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-2">
                        First timers by gender
                      </h3>
                      <div className="w-full h-52 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.genderBreakdown || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={75}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              {(reportData.genderBreakdown || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={GENDER_PALETTE[index % GENDER_PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-6 text-xs font-semibold text-gray-700 mt-2">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#a4d8eb]" />
                          Male: {reportData.genderBreakdown?.find(g => g.name === 'Male')?.value || 0}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#0e6080]" />
                          Female: {reportData.genderBreakdown?.find(g => g.name === 'Female')?.value || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Service Feedback, Born Again Status, Reason for Fellowship */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-100">
                    {/* Column 1: Part of service enjoyed most */}
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-4">
                        Part of service enjoyed most
                      </h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={reportData.serviceAspects || []}
                          layout="vertical"
                          margin={{ top: 5, right: 35, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={90} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0e6080" radius={[0, 4, 4, 0]} barSize={18}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Column 2: Born Again Status */}
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 flex flex-col items-center justify-between">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-2">
                        Born Again Status
                      </h3>
                      <div className="w-full h-44 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.bornAgainStatus || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              {(reportData.bornAgainStatus || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#0e6080' : '#dbeafe'} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-6 text-xs font-semibold text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#0e6080]" />
                          Yes: {reportData.bornAgainStatus?.find(b => b.name === 'Yes')?.value || 0}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#dbeafe] border border-gray-300" />
                          No: {reportData.bornAgainStatus?.find(b => b.name === 'No')?.value || 0}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Reason for fellowship */}
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-4">
                        Reason for fellowship
                      </h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={reportData.reasonForFellowship || []}
                          layout="vertical"
                          margin={{ top: 5, right: 35, left: 35, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={85} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0e6080" radius={[0, 4, 4, 0]} barSize={18}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 2: FIRST TIMERS' HANGOUT REPORT (Match to Image 2)  */}
            {/* ========================================================= */}
            {activeReport === 'hangout' && reportData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#0e6080] text-white p-5 sm:p-6 text-center">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase font-display">
                    FIRST TIMERS' HANGOUT REPORT
                  </h2>
                  <p className="text-xs text-sky-100 font-medium mt-0.5">
                    {churchTitle} • Assimilation, Discipleship (KIC), Tribez & Unit Integration
                  </p>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* Row 1: KPI Blocks, Joined Church, Done KIC */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Stack: KPI blocks */}
                    <div className="flex flex-col gap-4 justify-between">
                      <div className="bg-[#0e6080] text-white p-5 rounded-2xl text-center shadow-xs">
                        <p className="text-xs font-semibold text-sky-200">Total First Timers in Hangout</p>
                        <p className="text-4xl font-bold font-display mt-1">{reportData.totalHangout || 0}</p>
                      </div>
                      <div className="bg-[#0e6080] text-white p-5 rounded-2xl text-center shadow-xs">
                        <p className="text-xs font-semibold text-sky-200">Joined Tribez</p>
                        <p className="text-4xl font-bold font-display mt-1">{reportData.joinedTribezPct || 0}%</p>
                      </div>
                    </div>

                    {/* Middle: Joined Church Donut */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-1">Joined Church</h3>
                      <div className="w-full h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.joinedChurch?.chart || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              <Cell fill="#0e6080" />
                              <Cell fill="#e2e8f0" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold font-display text-gray-900">
                            {reportData.joinedChurch?.pct || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 mt-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0e6080]" /> Yes ({reportData.joinedChurch?.yes || 0})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] border border-gray-300" /> No ({reportData.joinedChurch?.no || 0})</span>
                      </div>
                    </div>

                    {/* Right: Done KIC (Believers Class) Donut */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-1">Done KIC</h3>
                      <div className="w-full h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.doneKic?.chart || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              <Cell fill="#0e6080" />
                              <Cell fill="#e2e8f0" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold font-display text-gray-900">
                            {reportData.doneKic?.pct || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 mt-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0e6080]" /> Yes ({reportData.doneKic?.yes || 0})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#e2e8f0] border border-gray-300" /> No ({reportData.doneKic?.no || 0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Joined Unit, Gender, Tribez */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-gray-100">
                    {/* Left: Joined Unit Donut */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-1">Joined unit</h3>
                      <div className="w-full h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.joinedUnit?.chart || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              {(reportData.joinedUnit?.chart || []).map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.name === 'No'
                                      ? '#e2e8f0'
                                      : PIE_PALETTE[index % PIE_PALETTE.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold font-display text-gray-900">
                            {reportData.joinedUnit?.pct || 0}%
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-gray-600 mt-1">
                        {(reportData.joinedUnit?.chart || []).map((u, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  u.name === 'No' ? '#cbd5e1' : PIE_PALETTE[i % PIE_PALETTE.length]
                              }}
                            />
                            {u.name} ({u.value})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Middle: Gender Donut */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-1">Gender</h3>
                      <div className="w-full h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={reportData.gender?.chart || []}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              stroke="#ffffff"
                              strokeWidth={2}
                            >
                              <Cell fill="#0e6080" />
                              <Cell fill="#a4d8eb" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center gap-5 text-xs font-semibold text-gray-600 mt-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0e6080]" /> Female ({reportData.gender?.female || 0})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a4d8eb]" /> Male ({reportData.gender?.male || 0})</span>
                      </div>
                    </div>

                    {/* Right: Tribez Horizontal Bar Chart */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                      <h3 className="text-center font-bold text-gray-800 text-sm mb-3">Tribez</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={reportData.tribez || []}
                          layout="vertical"
                          margin={{ top: 5, right: 35, left: 35, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={80} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0e6080" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 3: FINANCIAL PERFORMANCE & GIVING REPORT            */}
            {/* ========================================================= */}
            {activeReport === 'finance' && reportData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#0e6080] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase font-display">
                      FINANCIAL PERFORMANCE & GIVING REPORT {selectedYear}
                    </h2>
                    <p className="text-xs text-sky-100 font-medium mt-0.5">
                      {churchTitle} • Inflow, Outflow, Surplus & Channel Analytics ({periodPreset})
                    </p>
                  </div>
                  <div className="bg-[#08455e] border border-sky-400/30 rounded-xl px-5 py-2.5 text-center shrink-0">
                    <p className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                      Net Operating Surplus
                    </p>
                    <p className={`text-2xl sm:text-3xl font-bold font-display mt-0.5 ${reportData.netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currency(reportData.netSurplus)}
                    </p>
                    <span className="text-[11px] font-medium text-sky-200">
                      {reportData.operatingMargin}% operating margin
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* Top KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Total Income</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-emerald-700 mt-1">{currency(reportData.totalIncome)}</p>
                      <p className="text-[11px] text-emerald-800/80 mt-1 flex items-center gap-1 font-semibold">
                        <ArrowUpRight size={13} /> {reportData.totalTransactions} transactions
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                      <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">Total Expenditure</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-rose-700 mt-1">{currency(reportData.totalExpense)}</p>
                      <p className="text-[11px] text-rose-800/80 mt-1 flex items-center gap-1 font-semibold">
                        <ArrowDownRight size={13} /> Operating Outflows
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Active Donors</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-blue-700 mt-1">{reportData.uniqueDonors || 0}</p>
                      <p className="text-[11px] text-blue-800/80 mt-1">Unique contributing partners</p>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Net Reserve</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-purple-700 mt-1">{currency(reportData.netSurplus)}</p>
                      <p className="text-[11px] text-purple-800/80 mt-1">Free cash retained</p>
                    </div>
                  </div>

                  {/* Monthly Inflow vs Outflow Dual Bar Chart */}
                  <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                    <h3 className="font-bold text-gray-800 text-sm mb-4">
                      Monthly Inflow vs Outflow Trend ({selectedYear})
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={reportData.monthlyTrend || []} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#cbd5e1' }} tick={{ fontSize: 12, fill: '#475569' }} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip formatter={v => currency(v)} />
                        <Legend iconType="circle" iconSize={8} />
                        <Bar dataKey="income" name="Income (Inflow)" fill="#0e6080" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar dataKey="expense" name="Expense (Outflow)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Income by Category & Giving Channels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                    {/* Giving by Category */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-3">Giving by Stream / Category</h3>
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie
                            data={reportData.incomeByCategory || []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            stroke="#ffffff"
                            strokeWidth={2}
                          >
                            {(reportData.incomeByCategory || []).map((_, i) => (
                              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => currency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {(reportData.incomeByCategory || []).map((cat, i) => (
                          <span key={i} className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                            {cat.name}: {currency(cat.value)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Giving by Payment Channel */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 flex flex-col items-center">
                      <h3 className="font-bold text-gray-800 text-sm mb-3">Giving by Payment Channel</h3>
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie
                            data={reportData.givingByChannel || []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            stroke="#ffffff"
                            strokeWidth={2}
                          >
                            {(reportData.givingByChannel || []).map((_, i) => (
                              <Cell key={i} fill={PIE_PALETTE[(i + 2) % PIE_PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => currency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {(reportData.givingByChannel || []).map((ch, i) => (
                          <span key={i} className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_PALETTE[(i + 2) % PIE_PALETTE.length] }} />
                            {ch.name}: {currency(ch.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 4: BUDGET PERFORMANCE & VARIANCE AUDIT              */}
            {/* ========================================================= */}
            {activeReport === 'budget' && reportData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#0e6080] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase font-display">
                      BUDGET ALLOCATION & VARIANCE AUDIT {selectedYear}
                    </h2>
                    <p className="text-xs text-sky-100 font-medium mt-0.5">
                      {churchTitle} • Fiscal Control, Departmental Budget Cap & Utilization Audit
                    </p>
                  </div>
                  <div className="bg-[#08455e] border border-sky-400/30 rounded-xl px-5 py-2.5 text-center shrink-0">
                    <p className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                      Budget Utilization
                    </p>
                    <p className="text-3xl font-bold font-display text-white mt-0.5">
                      {reportData.overallUtilization || 0}%
                    </p>
                    <span className="text-[11px] font-medium text-sky-200">
                      {reportData.overallUtilization <= 100 ? 'Within approved threshold' : 'Exceeded approved budget'}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Approved Budget</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-blue-900 mt-1">{currency(reportData.totalApproved)}</p>
                      <p className="text-[11px] text-blue-700 mt-1 font-medium">Board allocated ceiling</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Actual Expenditure</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-amber-900 mt-1">{currency(reportData.totalSpent)}</p>
                      <p className="text-[11px] text-amber-700 mt-1 font-medium">Disbursed to date</p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Available Surplus</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-emerald-900 mt-1">{currency(reportData.variance)}</p>
                      <p className="text-[11px] text-emerald-700 mt-1 font-medium">Unspent margin</p>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Fiscal Status</p>
                      <p className="text-xl sm:text-2xl font-bold font-display text-purple-900 mt-1">Healthy</p>
                      <p className="text-[11px] text-purple-700 mt-1 font-medium">All units within caps</p>
                    </div>
                  </div>

                  {/* Departmental Utilization Horizontal Bar Chart */}
                  <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                    <h3 className="font-bold text-gray-800 text-sm mb-4">
                      Departmental Budget Utilization Rate (%)
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={reportData.departmentUtilization || []}
                        layout="vertical"
                        margin={{ top: 5, right: 45, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#334155' }} width={120} />
                        <Tooltip formatter={v => `${v}%`} />
                        <Bar dataKey="rate" fill="#0e6080" radius={[0, 4, 4, 0]} barSize={20}>
                          <LabelList dataKey="rate" position="right" formatter={v => `${v}%`} style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 5: PROCUREMENT & REQUISITIONS AUDIT                */}
            {/* ========================================================= */}
            {activeReport === 'procurement' && reportData && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-[#0e6080] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-wide uppercase font-display">
                      PROCUREMENT & REQUISITIONS AUDIT {selectedYear}
                    </h2>
                    <p className="text-xs text-sky-100 font-medium mt-0.5">
                      {churchTitle} • Purchasing Pipeline, Departmental Spend & Vendor Audit
                    </p>
                  </div>
                  <div className="bg-[#08455e] border border-sky-400/30 rounded-xl px-5 py-2.5 text-center shrink-0">
                    <p className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                      Total Disbursed Spend
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold font-display text-white mt-0.5">
                      {currency(reportData.totalDisbursed)}
                    </p>
                    <span className="text-[11px] font-medium text-sky-200">
                      {reportData.approvalRate}% requisition approval rate
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* KPI Blocks */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Disbursed Orders</p>
                      <p className="text-2xl font-bold font-display text-emerald-700 mt-1">{reportData.disbursedCount || 0}</p>
                      <p className="text-[11px] text-emerald-800/80 mt-1 font-semibold">{currency(reportData.totalDisbursed)}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Approved Orders</p>
                      <p className="text-2xl font-bold font-display text-blue-700 mt-1">{reportData.approvedCount || 0}</p>
                      <p className="text-[11px] text-blue-800/80 mt-1 font-medium">Ready for payment</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pending Review</p>
                      <p className="text-2xl font-bold font-display text-amber-700 mt-1">{reportData.pendingCount || 0}</p>
                      <p className="text-[11px] text-amber-800/80 mt-1 font-medium">Awaiting sign-off</p>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                      <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Total Processed</p>
                      <p className="text-2xl font-bold font-display text-purple-700 mt-1">{reportData.totalRequisitions || 0}</p>
                      <p className="text-[11px] text-purple-800/80 mt-1 font-medium">Requisition requests</p>
                    </div>
                  </div>

                  {/* Spend by Department & Top Vendors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                    {/* Left: Spend by Department */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                      <h3 className="font-bold text-gray-800 text-sm mb-4">
                        Procurement Spend by Department
                      </h3>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart
                          data={reportData.spendByDepartment || []}
                          layout="vertical"
                          margin={{ top: 5, right: 40, left: 35, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={100} />
                          <Tooltip formatter={v => currency(v)} />
                          <Bar dataKey="amount" fill="#0e6080" radius={[0, 4, 4, 0]} barSize={18}>
                            <LabelList dataKey="amount" position="right" formatter={v => `₦${(v / 1000).toFixed(0)}k`} style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right: Top Vendors */}
                    <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40">
                      <h3 className="font-bold text-gray-800 text-sm mb-4">
                        Top Suppliers & Vendors by Volume
                      </h3>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart
                          data={reportData.topVendors || []}
                          layout="vertical"
                          margin={{ top: 5, right: 40, left: 35, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#334155' }} width={110} />
                          <Tooltip formatter={v => currency(v)} />
                          <Bar dataKey="amount" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={18}>
                            <LabelList dataKey="amount" position="right" formatter={v => `₦${(v / 1000).toFixed(0)}k`} style={{ fill: '#0f172a', fontWeight: 'bold', fontSize: 11 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* REPORT 6: RAW TABULAR RECORDS & CSV EXPORT                */}
            {/* ========================================================= */}
            {activeReport === 'raw_data' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {['members', 'finance', 'attendance', 'first-timers'].map(ent => (
                      <button
                        key={ent}
                        onClick={() => setRawEntity(ent)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                          rawEntity === ent
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {ent.replace('-', ' ')}
                      </button>
                    ))}
                  </div>

                  {rawData?.length > 0 && (
                    <button onClick={() => exportCSV(rawData, rawEntity)} className="btn-secondary text-xs">
                      <Download size={14} /> Export CSV
                    </button>
                  )}
                </div>

                {rawData && (
                  <div className="table-wrapper overflow-x-auto">
                    <p className="text-xs font-semibold text-gray-500 mb-2">{rawData.length} records found</p>
                    <table className="crm-table">
                      <thead>
                        <tr>
                          {Object.keys(rawData[0] || {}).slice(0, 8).map(col => (
                            <th key={col} className="capitalize text-xs font-semibold">
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 50).map((row, idx) => (
                          <tr key={idx}>
                            {Object.keys(rawData[0] || {}).slice(0, 8).map(col => (
                              <td key={col} className="text-xs text-gray-600">
                                {typeof row[col] === 'boolean'
                                  ? row[col] ? 'Yes' : 'No'
                                  : String(row[col] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
