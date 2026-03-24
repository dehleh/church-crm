import { useState } from 'react';
import { BarChart2, Download, Loader2, Users, DollarSign, CalendarDays, UserPlus } from 'lucide-react';
import { reportsAPI } from '../api/services';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const currency = n => `₦${Number(n||0).toLocaleString()}`;

const REPORTS = [
  { id: 'members',     icon: Users,      label: 'Member Report',       color: 'bg-brand-50 text-brand-600',   desc: 'Full member list with contact info, status, departments' },
  { id: 'finance',     icon: DollarSign, label: 'Finance Report',      color: 'bg-emerald-50 text-emerald-600', desc: 'All transactions with totals by category' },
  { id: 'attendance',  icon: CalendarDays, label: 'Attendance Report', color: 'bg-purple-50 text-purple-600',  desc: 'Event attendance history and fill rates' },
  { id: 'first-timers',icon: UserPlus,   label: 'First Timer Report',  color: 'bg-amber-50 text-amber-600',   desc: 'Visitor records, follow-up status, conversions' },
];

function exportCSV(rows, filename) {
  if (!rows?.length) return toast.error('No data to export');
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => {
    const v = r[k]; if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
  toast.success('CSV downloaded!');
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState('members');
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '', type: '' });
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const setF = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const runReport = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      let res;
      if (activeReport === 'members')      res = await reportsAPI.members(params);
      else if (activeReport === 'finance') res = await reportsAPI.finance(params);
      else if (activeReport === 'attendance') res = await reportsAPI.attendance(params);
      else res = await reportsAPI.firstTimers(params);
      setData(res.data.data);
      setSummary(res.data.summary);
      toast.success(`${res.data.total || res.data.data?.length || 0} records loaded`);
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const renderTable = () => {
    if (!data?.length) return <div className="text-center py-12 text-gray-400">No data — run the report first</div>;
    if (activeReport === 'members') return (
      <table className="crm-table">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th><th>Status</th><th>Branch</th><th>Joined</th></tr></thead>
        <tbody>{data.map((r, i) => (
          <tr key={i}>
            <td className="font-mono text-xs text-gray-400">{r.member_number}</td>
            <td className="font-medium">{r.first_name} {r.last_name}</td>
            <td className="text-sm text-gray-500">{r.email||'—'}</td>
            <td className="text-sm text-gray-500">{r.phone||'—'}</td>
            <td className="capitalize text-sm text-gray-500">{r.gender||'—'}</td>
            <td><span className={`badge capitalize ${r.membership_status==='active'?'badge-green':'badge-gray'}`}>{r.membership_status}</span></td>
            <td className="text-sm text-gray-500">{r.branch_name||'—'}</td>
            <td className="text-sm text-gray-500">{r.join_date ? format(new Date(r.join_date),'MMM d, yyyy') : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    );
    if (activeReport === 'finance') return (
      <table className="crm-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Member</th><th>Method</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>{data.map((r, i) => (
          <tr key={i}>
            <td className="text-sm text-gray-500 whitespace-nowrap">{r.transaction_date ? format(new Date(r.transaction_date),'MMM d, yyyy') : '—'}</td>
            <td className="text-sm font-medium">{r.description||'—'}</td>
            <td className="text-sm text-gray-500">{r.category_name||'—'}</td>
            <td className="text-sm text-gray-500">{r.member_name||'—'}</td>
            <td className="text-sm text-gray-500 capitalize">{r.payment_method||'—'}</td>
            <td><span className={`badge capitalize ${r.transaction_type==='income'?'badge-green':'badge-red'}`}>{r.transaction_type}</span></td>
            <td className={`font-bold text-sm ${r.transaction_type==='income'?'text-emerald-600':'text-red-500'}`}>{currency(r.amount)}</td>
          </tr>
        ))}</tbody>
      </table>
    );
    if (activeReport === 'attendance') return (
      <table className="crm-table">
        <thead><tr><th>Event</th><th>Type</th><th>Date</th><th>Expected</th><th>Actual</th><th>Fill Rate</th><th>Branch</th></tr></thead>
        <tbody>{data.map((r, i) => (
          <tr key={i}>
            <td className="font-medium">{r.title}</td>
            <td><span className="badge badge-blue capitalize text-xs">{r.event_type?.replace(/_/g,' ')||'—'}</span></td>
            <td className="text-sm text-gray-500 whitespace-nowrap">{r.start_datetime ? format(new Date(r.start_datetime),'MMM d, yyyy') : '—'}</td>
            <td className="text-sm text-gray-500">{r.expected_attendance||'—'}</td>
            <td className="font-semibold text-gray-800">{r.actual_attendance||0}</td>
            <td>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, r.fill_rate||0)}%` }} />
                </div>
                <span className="text-xs text-gray-500">{r.fill_rate||0}%</span>
              </div>
            </td>
            <td className="text-sm text-gray-500">{r.branch_name||'All'}</td>
          </tr>
        ))}</tbody>
      </table>
    );
    if (activeReport === 'first-timers') return (
      <table className="crm-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Visit Date</th><th>How They Heard</th><th>Follow-up</th><th>Assigned To</th><th>Converted</th></tr></thead>
        <tbody>{data.map((r, i) => (
          <tr key={i}>
            <td className="font-medium">{r.first_name} {r.last_name}</td>
            <td className="text-sm text-gray-500">{r.phone||'—'}</td>
            <td className="text-sm text-gray-500 whitespace-nowrap">{r.visit_date ? format(new Date(r.visit_date),'MMM d, yyyy') : '—'}</td>
            <td className="text-sm text-gray-500 capitalize">{r.how_did_you_hear?.replace(/_/g,' ')||'—'}</td>
            <td><span className={`badge capitalize ${r.follow_up_status==='converted'?'badge-green':r.follow_up_status==='pending'?'badge-yellow':'badge-blue'}`}>{r.follow_up_status}</span></td>
            <td className="text-sm text-gray-500">{r.assigned_to_name||'Unassigned'}</td>
            <td><span className={`badge ${r.converted_to_member?'badge-green':'badge-gray'}`}>{r.converted_to_member?'Yes':'No'}</span></td>
          </tr>
        ))}</tbody>
      </table>
    );
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Reports & Exports</h1><p className="text-gray-500 text-sm mt-1">Generate and download reports for any module</p></div>
        {data?.length > 0 && (
          <button onClick={() => exportCSV(data, activeReport)} className="btn-secondary">
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {/* Report selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {REPORTS.map(({ id, icon: Icon, label, color, desc }) => (
          <button key={id} onClick={() => { setActiveReport(id); setData(null); setSummary(null); }}
            className={`card text-left transition-all ${activeReport === id ? 'ring-2 ring-brand-500 shadow-card-hover' : 'hover:shadow-card-hover'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={20} /></div>
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <p className="text-xs text-gray-400 mt-1 leading-snug">{desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <h3 className="section-title mb-4">Filters</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={filters.startDate} onChange={setF('startDate')} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={filters.endDate} onChange={setF('endDate')} />
          </div>
          {activeReport === 'members' && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={filters.status} onChange={setF('status')}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          {activeReport === 'finance' && (
            <div>
              <label className="label">Type</label>
              <select className="input" value={filters.type} onChange={setF('type')}>
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-4">
          <button onClick={runReport} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <BarChart2 size={15} />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && activeReport === 'finance' && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Income', value: currency(summary.total_income), color: 'text-emerald-600' },
            { label: 'Total Expense', value: currency(summary.total_expense), color: 'text-red-500' },
            { label: 'Transactions', value: summary.total_transactions, color: 'text-brand-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
              <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}
      {summary && activeReport === 'attendance' && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Events', value: summary.totalEvents },
            { label: 'Total Attendance', value: summary.totalAttendance?.toLocaleString() },
            { label: 'Avg per Event', value: summary.avgAttendance },
          ].map(({ label, value }) => (
            <div key={label} className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
              <p className="text-2xl font-bold font-display text-gray-900">{value || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {data !== null && (
        <div className="table-wrapper">
          <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">{data.length} records</p>
            <button onClick={() => exportCSV(data, activeReport)} className="btn-secondary btn-sm">
              <Download size={13} /> Export CSV
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : (
            <div className="overflow-x-auto">{renderTable()}</div>
          )}
        </div>
      )}
    </div>
  );
}
