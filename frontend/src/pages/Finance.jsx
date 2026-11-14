import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Loader2, ArrowUpRight,
  ArrowDownRight, FileSpreadsheet, HeartHandshake, ClipboardList, FileText, Printer, Check
} from 'lucide-react';
import { financeAPI, givingAPI, membersAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import Modal from '../components/ui/Modal';
import CsvImportModal from '../components/ui/CsvImportModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#3b6ef6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Finance() {
  const { user } = useAuth();
  const currency = (n) => formatCurrency(n, user?.currency);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState('month');
  const [catSearch, setCatSearch] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const catRef = useRef(null);

  // Annual Giving Statement State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [statementYear, setStatementYear] = useState(new Date().getFullYear());
  const [statementData, setStatementData] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  const fetchMembersList = async () => {
    try {
      const res = await membersAPI.list({ limit: 300, status: 'active' });
      const mems = res.data.data || [];
      setMembersList(mems);
      if (mems.length > 0 && !selectedMemberId) {
        setSelectedMemberId(mems[0].id);
        fetchStatementForMember(mems[0].id, statementYear);
      }
    } catch {}
  };

  const fetchStatementForMember = async (memberId, yr) => {
    if (!memberId) return;
    setLoadingStatement(true);
    try {
      const res = await givingAPI.getStatement(memberId, { year: yr });
      setStatementData(res.data.data);
    } catch {
      toast.error('Failed to generate statement for member');
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    const handler = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await financeAPI.summary({ period });
      const d = res.data.data;
      setSummary(d.summary);
      setMonthlyTrend((d.monthlyTrend || []).map(r => ({
        month: r.month ? format(new Date(r.month), 'MMM') : '',
        income: Number(r.income || 0),
        expense: Number(r.expense || 0),
      })));
      setByCategory(d.byCategory || []);
      setAccounts(d.accounts || []);
    } catch { toast.error('Failed to load finance summary'); }
  }, [period]);

  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const params = { page, limit: 15, ...(typeFilter && { type: typeFilter }) };
      const res = await financeAPI.transactions(params);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    finally { setTxLoading(false); }
  }, [typeFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchTransactions(1), financeAPI.categories().then(r => setCategories(r.data.data))])
      .finally(() => setLoading(false));
  }, [fetchSummary, fetchTransactions]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAddCategory = async () => {
    if (!catSearch.trim()) return;
    setCreatingCat(true);
    try {
      const res = await financeAPI.createCategory({ name: catSearch.trim() });
      const cat = res.data.data;
      if (!categories.find(c => c.id === cat.id)) {
        setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setForm(f => ({ ...f, categoryId: cat.id }));
      setCatSearch(cat.name);
      setCatDropdownOpen(false);
      toast.success(`Category "${cat.name}" added`);
    } catch { toast.error('Failed to create category'); }
    finally { setCreatingCat(false); }
  };

  const handleSave = async () => {
    if (!form.transactionType || !form.amount) return toast.error('Type and amount required');
    setSaving(true);
    try {
      await financeAPI.createTransaction({ ...form, transactionDate: form.transactionDate || format(new Date(), 'yyyy-MM-dd') });
      toast.success('Transaction recorded!');
      setModal(null);
      fetchSummary(); fetchTransactions(1);
    } catch { toast.error('Failed to save transaction'); }
    finally { setSaving(false); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map(p => <p key={p.name} style={{ color: p.color }}>{currency(p.value)}</p>)}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;

  const netBalance = Number(summary.total_income || 0) - Number(summary.total_expense || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="text-gray-500 text-sm mt-1">Track giving, expenses, and financial health</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/giving-campaigns"
            className="h-9 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <HeartHandshake size={15} className="text-emerald-600" />
            <span>Projects & Campaigns</span>
          </Link>
          <Link
            to="/procurement"
            className="h-9 px-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ClipboardList size={15} className="text-indigo-600" />
            <span>Requisitions & Payouts</span>
          </Link>
          <select className="input h-9 text-sm w-auto py-1" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={() => {
              setShowStatementModal(true);
              fetchMembersList();
            }}
            className="h-9 px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileText size={15} className="text-gray-500" />
            <span>Giving Statement</span>
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-1.5">
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <button onClick={() => { setForm({ transactionDate: format(new Date(), 'yyyy-MM-dd') }); setCatSearch(''); setModal('add'); }} className="btn-primary">
            <Plus size={16} /> Record Transaction
          </button>
        </div>
      </div>

      {/* Campaign Spotlight Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-linear-to-r from-emerald-900 via-teal-900 to-brand-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
            <HeartHandshake size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Church Giving Projects & Special Campaigns
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">Fundraising Hub</span>
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              Launch targeted campaigns for building expansions, event sponsorships, harvest seeds, missions, and community welfare.
            </p>
          </div>
        </div>
        <Link
          to="/giving-campaigns"
          className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all text-center"
        >
          Manage Projects →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card border-l-4 border-l-emerald-500">
          <div className="flex items-start gap-4">
            <div className="stat-icon bg-emerald-50 text-emerald-600"><TrendingUp size={22} /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Period Income</p>
              <p className="text-2xl font-bold font-display text-emerald-600">{currency(summary.period_income)}</p>
              <p className="text-xs text-gray-400 mt-0.5">All time: {currency(summary.total_income)}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-red-400">
          <div className="flex items-start gap-4">
            <div className="stat-icon bg-red-50 text-red-500"><TrendingDown size={22} /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Period Expense</p>
              <p className="text-2xl font-bold font-display text-red-500">{currency(summary.period_expense)}</p>
              <p className="text-xs text-gray-400 mt-0.5">All time: {currency(summary.total_expense)}</p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-brand-500">
          <div className="flex items-start gap-4">
            <div className="stat-icon bg-brand-50 text-brand-600"><Wallet size={22} /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Net Balance</p>
              <p className={`text-2xl font-bold font-display ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{currency(netBalance)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">Monthly Trend</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data available</div>}
        </div>
        <div className="card">
          <h3 className="section-title mb-4">Giving by Category</h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="total" nameKey="name" cx="50%" cy="45%" outerRadius={75} paddingAngle={3}>
                  {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Tooltip formatter={(v) => currency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Accounts row */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {accounts.map(acc => (
            <div key={acc.id} className="card py-3 px-4">
              <p className="text-xs text-gray-500 truncate">{acc.name}</p>
              <p className="text-lg font-bold font-display text-gray-900 mt-0.5">{currency(acc.balance)}</p>
              <p className="text-xs text-gray-400 capitalize">{acc.account_type?.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Transactions table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <h3 className="section-title">Transactions</h3>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        {txLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Member</th><th>Method</th><th>Type</th><th>Amount</th></tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{format(new Date(tx.transaction_date), 'MMM d, yyyy')}</td>
                  <td>
                    <p className="font-medium text-gray-800">{tx.description || '—'}</p>
                    <p className="text-xs text-gray-400">{tx.reference}</p>
                  </td>
                  <td><span className="text-sm text-gray-600">{tx.category_name || '—'}</span></td>
                  <td className="text-sm text-gray-500">{tx.member_name || '—'}</td>
                  <td><span className="capitalize text-sm text-gray-500">{tx.payment_method || '—'}</span></td>
                  <td>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${tx.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.transaction_type === 'income' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className={`font-bold text-sm ${tx.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.transaction_type === 'expense' ? '-' : '+'}{currency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {transactions.length} of {pagination.total}</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchTransactions(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTransactions(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Record Transaction" size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Save Transaction'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.transactionType || ''} onChange={set('transactionType')}>
                <option value="">Select type</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Amount *</label>
              <input type="number" className="input" placeholder="0.00" value={form.amount || ''} onChange={set('amount')} min="0" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category <span className="text-gray-400 font-normal text-xs ml-1">type to add new</span></label>
              <div className="relative" ref={catRef}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search or add category…"
                  value={catSearch}
                  onChange={e => { setCatSearch(e.target.value); setCatDropdownOpen(true); setForm(f => ({ ...f, categoryId: '' })); }}
                  onFocus={() => setCatDropdownOpen(true)}
                />
                {catDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {categories
                      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 ${form.categoryId === c.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700'}`}
                          onClick={() => { setForm(f => ({ ...f, categoryId: c.id })); setCatSearch(c.name); setCatDropdownOpen(false); }}
                        >
                          {c.name}
                        </button>
                      ))
                    }
                    {catSearch.trim() && !categories.some(c => c.name.toLowerCase() === catSearch.toLowerCase()) && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-brand-600 font-medium hover:bg-brand-50 border-t border-gray-100 flex items-center gap-1.5"
                        onClick={handleAddCategory}
                        disabled={creatingCat}
                      >
                        {creatingCat ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Add &ldquo;{catSearch.trim()}&rdquo;
                      </button>
                    )}
                    {!catSearch.trim() && categories.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">No categories yet — type to create one</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.paymentMethod || ''} onChange={set('paymentMethod')}>
                <option value="">Select method</option>
                {['cash','transfer','card','cheque','ussd'].map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Transaction Date</label><input type="date" className="input" value={form.transactionDate || ''} onChange={set('transactionDate')} /></div>
          </div>
          <div><label className="label">Description</label><input className="input" placeholder="Describe this transaction…" value={form.description || ''} onChange={set('description')} /></div>
          <div><label className="label">Notes</label><textarea className="input min-h-[70px]" value={form.notes || ''} onChange={set('notes')} /></div>
        </div>
      </Modal>

      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() => { fetchSummary(); fetchTransactions(1); }}
        entityType="transactions"
        importFn={financeAPI.importTransactions}
      />

      {/* ── ANNUAL GIVING & TAX STATEMENT MODAL (STAFF VIEW) ── */}
      <Modal
        open={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        title="Annual Giving & Tax Contribution Statement"
        size="xl"
        footer={<>
          <button onClick={() => setShowStatementModal(false)} className="btn-secondary">Close</button>
          {statementData && (
            <button onClick={() => window.print()} className="btn-primary">
              <Printer size={15} /> Print / Save Statement PDF
            </button>
          )}
        </>}
      >
        <div className="space-y-6">
          {/* Controls: Member & Year Selector */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex-1 min-w-[220px]">
              <label className="label">Select Member / Donor *</label>
              <select
                className="input text-xs"
                value={selectedMemberId}
                onChange={e => {
                  setSelectedMemberId(e.target.value);
                  fetchStatementForMember(e.target.value, statementYear);
                }}
              >
                <option value="">Select a member...</option>
                {membersList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} ({m.member_number || m.phone || 'Member'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Tax Year</label>
              <select
                className="input text-xs"
                value={statementYear}
                onChange={e => {
                  const yr = parseInt(e.target.value, 10);
                  setStatementYear(yr);
                  fetchStatementForMember(selectedMemberId, yr);
                }}
              >
                {[0, 1, 2, 3].map(offset => {
                  const y = new Date().getFullYear() - offset;
                  return <option key={y} value={y}>Tax Year {y}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Statement Content */}
          {loadingStatement ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 size={32} className="animate-spin text-brand-600" />
              <p className="text-xs text-gray-500">Generating member contribution statement…</p>
            </div>
          ) : statementData ? (
            <div className="border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6 print:border-none print:p-0">
              {/* Church Letterhead */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h2 className="text-2xl font-bold font-display text-gray-900">{statementData.church?.name}</h2>
                  {statementData.church?.denomination && (
                    <p className="text-xs text-brand-600 font-semibold">{statementData.church.denomination}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">{statementData.church?.address || 'Church Headquarters'}</p>
                  <p className="text-xs text-gray-400">{statementData.church?.phone} • {statementData.church?.email}</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    Official Tax Statement
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-2 font-mono">{statementData.statementNumber}</p>
                  <p className="text-xs text-gray-500">Tax Year: <strong>{statementData.year}</strong></p>
                  <p className="text-[11px] text-gray-400">Nonprofit Tax ID: <strong>{statementData.church?.taxId || 'EXEMPT-NONPROFIT'}</strong></p>
                </div>
              </div>

              {/* Donor Information */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-gray-100 text-xs flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <p className="text-gray-400 uppercase font-semibold text-[10px]">Donor Information</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{statementData.member?.name}</p>
                  <p className="text-gray-500">{statementData.member?.email} • {statementData.member?.phone}</p>
                  {statementData.member?.address && <p className="text-gray-500 mt-0.5">{statementData.member.address}</p>}
                </div>

                <div className="sm:text-right">
                  <p className="text-gray-400 uppercase font-semibold text-[10px]">Member Number</p>
                  <p className="font-bold text-gray-800 text-sm mt-0.5 font-mono">{statementData.member?.memberNumber || 'MBR-001'}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Generated: {format(new Date(statementData.generatedAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>

              {/* Categorized Giving Summary */}
              <div>
                <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Category Summary</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-left">
                      <th className="py-2">Category</th>
                      <th className="py-2 text-center">Gifts</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statementData.summary?.map((s, idx) => (
                      <tr key={idx} className="text-gray-700">
                        <td className="py-2 font-medium">{s.category}</td>
                        <td className="py-2 text-center text-gray-500">{s.count}</td>
                        <td className="py-2 text-right font-semibold">{statementData.currency} {Number(s.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Giving Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-white flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-emerald-100">Total Tax-Deductible Contribution</p>
                  <p className="text-xs text-white/80">Jan 1, {statementData.year} – Dec 31, {statementData.year}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black font-display tracking-tight">
                    {statementData.currency} {Number(statementData.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-emerald-100">Official Non-Profit Record</p>
                </div>
              </div>

              {/* Itemized Table */}
              {statementData.items?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Itemized Donations</h4>
                  <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl print:max-h-none print:border-0">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500 sticky top-0 print:static">
                        <tr className="border-b border-gray-200 text-left">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Reference</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {statementData.items.map(it => (
                          <tr key={it.id} className="text-gray-700">
                            <td className="py-2 px-3 whitespace-nowrap">{format(new Date(it.date), 'MMM d, yyyy')}</td>
                            <td className="py-2 px-3 font-medium">{it.category}</td>
                            <td className="py-2 px-3 text-gray-400 font-mono text-[10px]">{it.reference || it.paymentMethod || 'Direct'}</td>
                            <td className="py-2 px-3 text-right font-semibold">{statementData.currency} {Number(it.amount).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Legal Disclaimer & Signatory */}
              <div className="pt-4 border-t border-gray-100 space-y-4 text-xs">
                <p className="text-gray-500 italic text-[11px] leading-relaxed">
                  "{statementData.disclaimer}"
                </p>

                <div className="flex justify-between items-end pt-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Electronic verification ID: {statementData.statementNumber}</p>
                    <p className="text-[10px] text-gray-400">Issued by Church Operating System (ChurchOS)</p>
                  </div>

                  <div className="text-right border-t border-gray-300 pt-2 min-w-[180px]">
                    <p className="font-bold text-gray-900 text-xs">{statementData.signatory?.name}</p>
                    <p className="text-[10px] text-gray-500">{statementData.signatory?.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              Please select a member to generate their annual giving statement.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
