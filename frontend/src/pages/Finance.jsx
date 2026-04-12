import { useState, useEffect, useCallback, useRef } from 'react';
import { DollarSign, Plus, TrendingUp, TrendingDown, Wallet, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { financeAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#3b6ef6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

const currency = (n) => `₦${Number(n || 0).toLocaleString()}`;

export default function Finance() {
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
  const catRef = useRef(null);

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
        {payload.map(p => <p key={p.name} style={{ color: p.color }}>₦{Number(p.value).toLocaleString()}</p>)}
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
        <div className="flex gap-2">
          <select className="input h-9 text-sm w-auto py-2" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={() => { setForm({ transactionDate: format(new Date(), 'yyyy-MM-dd') }); setCatSearch(''); setModal('add'); }} className="btn-primary">
            <Plus size={16} /> Record Transaction
          </button>
        </div>
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
    </div>
  );
}
