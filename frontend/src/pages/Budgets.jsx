import { useState, useEffect } from 'react';
import { PiggyBank, Plus, Loader2, TrendingUp } from 'lucide-react';
import { budgetsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const currency = n => `₦${Number(n||0).toLocaleString()}`;

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const res = await budgetsAPI.list(); setBudgets(res.data.data); }
    catch { toast.error('Failed to load budgets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.totalAmount || !form.startDate || !form.endDate) return toast.error('All fields required');
    setSaving(true);
    try {
      await budgetsAPI.create(form);
      toast.success('Budget created!');
      setModal(false); fetch();
    } catch { toast.error('Failed to create budget'); }
    finally { setSaving(false); }
  };

  const totalBudgeted = budgets.reduce((s, b) => s + Number(b.total_amount||0), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent_amount||0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Budgets</h1><p className="text-gray-500 text-sm mt-1">Plan and track financial allocations</p></div>
        <button onClick={() => { setForm({ periodType: 'monthly' }); setModal(true); }} className="btn-primary"><Plus size={16} /> New Budget</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Budgeted', value: currency(totalBudgeted), color: 'text-brand-600' },
          { label: 'Total Spent', value: currency(totalSpent), color: 'text-red-500' },
          { label: 'Remaining', value: currency(totalBudgeted - totalSpent), color: totalBudgeted - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-16">
          <PiggyBank size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No budgets yet</p>
          <button onClick={() => { setForm({ periodType: 'monthly' }); setModal(true); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Create Budget</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(budget => {
            const pct = Math.min(100, Number(budget.spend_pct||0));
            const overBudget = Number(budget.spent_amount) > Number(budget.total_amount);
            return (
              <div key={budget.id} className="card hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{budget.period_type} · {budget.branch_name || 'Church-wide'}</p>
                  </div>
                  <span className={`badge capitalize ${budget.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{budget.status}</span>
                </div>

                <div className="flex justify-between text-sm mb-2 mt-4">
                  <span className="text-gray-500">Spent: <span className={`font-semibold ${overBudget ? 'text-red-500' : 'text-gray-800'}`}>{currency(budget.spent_amount)}</span></span>
                  <span className="text-gray-500">Budget: <span className="font-semibold text-gray-800">{currency(budget.total_amount)}</span></span>
                </div>

                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className={overBudget ? 'text-red-500 font-medium' : ''}>{pct}% used</span>
                  <span>{format(new Date(budget.start_date), 'MMM d')} – {format(new Date(budget.end_date), 'MMM d, yyyy')}</span>
                </div>
                {budget.created_by_name && <p className="text-xs text-gray-400 mt-2">Created by {budget.created_by_name}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Create Budget"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Budget Name *</label><input className="input" placeholder="2025 Annual Budget" value={form.name||''} onChange={set('name')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Period Type</label>
              <select className="input" value={form.periodType||'monthly'} onChange={set('periodType')}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div><label className="label">Total Amount (₦) *</label><input type="number" className="input" placeholder="1000000" value={form.totalAmount||''} onChange={set('totalAmount')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date *</label><input type="date" className="input" value={form.startDate||''} onChange={set('startDate')} /></div>
            <div><label className="label">End Date *</label><input type="date" className="input" value={form.endDate||''} onChange={set('endDate')} /></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
