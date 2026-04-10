import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Loader2, Search, Filter, ArrowLeft, Edit2, Trash2,
  MapPin, Calendar, DollarSign, User, Tag, AlertTriangle, CheckCircle,
  Wrench, Archive
} from 'lucide-react';
import { assetsAPI, membersAPI, branchesAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'musical_instrument', label: 'Musical Instruments', icon: '🎸' },
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'vehicle', label: 'Vehicles', icon: '🚐' },
  { value: 'building', label: 'Buildings & Property', icon: '🏢' },
  { value: 'equipment', label: 'Equipment', icon: '⚙️' },
  { value: 'general', label: 'General', icon: '📦' },
  { value: 'other', label: 'Other', icon: '🏷️' },
];

const CONDITIONS = [
  { value: 'good', label: 'Good', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'fair', label: 'Fair', color: 'bg-amber-100 text-amber-700' },
  { value: 'poor', label: 'Poor', color: 'bg-orange-100 text-orange-700' },
  { value: 'needs_repair', label: 'Needs Repair', color: 'bg-red-100 text-red-700' },
  { value: 'decommissioned', label: 'Decommissioned', color: 'bg-gray-200 text-gray-600' },
];

const STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'in_use', label: 'In Use', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_storage', label: 'In Storage', color: 'bg-gray-100 text-gray-600' },
  { value: 'under_repair', label: 'Under Repair', color: 'bg-amber-100 text-amber-700' },
  { value: 'disposed', label: 'Disposed', color: 'bg-red-100 text-red-600' },
];

const canManage = (role) => ['head_pastor', 'pastor', 'director', 'hod'].includes(role);
const canDelete = (role) => ['head_pastor', 'pastor'].includes(role);
const getCatIcon = (cat) => CATEGORIES.find(c => c.value === cat)?.icon || '📦';
const getCondBadge = (cond) => CONDITIONS.find(c => c.value === cond) || CONDITIONS[0];
const getStatusBadge = (st) => STATUSES.find(s => s.value === st) || STATUSES[0];
const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—';

// ── Asset Detail ────────────────────────────────────────────
function AssetDetail({ asset, onBack, onEdit, onDelete }) {
  const { user } = useAuth();
  const cond = getCondBadge(asset.condition);
  const stat = getStatusBadge(asset.status);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-600 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Inventory
      </button>

      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{getCatIcon(asset.category)}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.color}`}>{stat.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                {asset.asset_tag && <span className="text-xs text-gray-400 font-mono">#{asset.asset_tag}</span>}
              </div>
            </div>
          </div>
          {canManage(user?.role) && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(asset)} className="btn-secondary text-sm"><Edit2 size={14} /> Edit</button>
              {canDelete(user?.role) && (
                <button onClick={() => onDelete(asset.id)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {asset.description && <p className="text-gray-600 mb-4">{asset.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Category</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{(asset.category || '').replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Quantity</p>
            <p className="text-sm font-medium text-gray-900">{asset.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              {asset.location ? <><MapPin size={13} /> {asset.location}</> : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Purchase Date</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              {asset.purchase_date ? <><Calendar size={13} /> {new Date(asset.purchase_date).toLocaleDateString()}</> : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Purchase Price</p>
            <p className="text-sm font-medium text-gray-900">{fmt(asset.purchase_price)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Value</p>
            <p className="text-sm font-medium text-gray-900">{fmt(asset.current_value)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Branch</p>
            <p className="text-sm font-medium text-gray-900">{asset.branch_name || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Custodian (In Charge)</p>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
              {asset.custodian_name ? (
                <>
                  <User size={13} /> {asset.custodian_name}
                  {asset.custodian_phone && <span className="text-gray-400 ml-2">({asset.custodian_phone})</span>}
                </>
              ) : '— Not assigned'}
            </p>
          </div>
        </div>

        {asset.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Assets Page ────────────────────────────────────────
export default function Assets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', status: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      const res = await assetsAPI.list(params);
      setAssets(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load assets'); }
    finally { setLoading(false); }
  }, [page, filters]);

  const fetchStats = async () => {
    try { const res = await assetsAPI.stats(); setStats(res.data.data); } catch {}
  };

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { fetchStats(); }, []);

  const loadFormData = async () => {
    try {
      const [m, b] = await Promise.all([
        membersAPI.list({ limit: 200 }),
        branchesAPI.list(),
      ]);
      setMembers(m.data.data);
      setBranches(b.data.data);
    } catch {}
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openAdd = async () => {
    setForm({ category: 'general', condition: 'good', status: 'active', quantity: 1 });
    await loadFormData();
    setModal('add');
  };

  const openEdit = async (asset) => {
    setForm({
      name: asset.name, description: asset.description || '', category: asset.category,
      assetTag: asset.asset_tag || '', quantity: asset.quantity, condition: asset.condition,
      status: asset.status, purchaseDate: asset.purchase_date?.split('T')[0] || '',
      purchasePrice: asset.purchase_price || '', currentValue: asset.current_value || '',
      location: asset.location || '', custodianId: asset.custodian_id || '',
      branchId: asset.branch_id || '', notes: asset.notes || '',
    });
    await loadFormData();
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Asset name is required');
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const res = await assetsAPI.update(selected.id, form);
        setSelected(res.data.data);
        toast.success('Asset updated!');
      } else {
        await assetsAPI.create(form);
        toast.success('Asset added!');
      }
      setModal(null);
      fetchAssets();
      fetchStats();
    } catch { toast.error('Failed to save asset'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Dispose this asset? It will be marked as disposed.')) return;
    try {
      await assetsAPI.delete(id);
      toast.success('Asset disposed');
      setSelected(null);
      fetchAssets();
      fetchStats();
    } catch { toast.error('Failed to dispose asset'); }
  };

  // If viewing detail
  if (selected) {
    return (
      <AssetDetail
        asset={selected}
        onBack={() => setSelected(null)}
        onEdit={(a) => openEdit(a)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Inventory & Assets</h1>
          <p className="text-gray-500 text-sm mt-1">Track church properties, equipment, and who's in charge</p>
        </div>
        {canManage(user?.role) && (
          <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Asset</button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Assets', value: stats.total, icon: Package, color: 'text-brand-600 bg-brand-50' },
            { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Needs Repair', value: stats.needs_repair, icon: Wrench, color: 'text-amber-600 bg-amber-50' },
            { label: 'Total Value', value: fmt(stats.total_value), icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          ].map((s, i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search assets…"
            value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} />
        </div>
        <select className="input w-auto" value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
        <select className="input w-auto" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Asset List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20">
          <Package size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No assets found</p>
          <p className="text-gray-400 text-sm mb-4">Start tracking church property and equipment</p>
          {canManage(user?.role) && (
            <button onClick={openAdd} className="btn-primary inline-flex"><Plus size={15} /> Add First Asset</button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Asset</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Custodian</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Condition</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map(a => {
                  const cond = getCondBadge(a.condition);
                  const stat = getStatusBadge(a.status);
                  return (
                    <tr key={a.id} onClick={() => setSelected(a)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{getCatIcon(a.category)}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{a.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stat.color}`}>{stat.label}</span>
                              {a.asset_tag && <span className="text-[10px] text-gray-400 font-mono">#{a.asset_tag}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize hidden md:table-cell">{(a.category || '').replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{a.location || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{a.custodian_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{a.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40">Prev</button>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit Asset' : 'Add New Asset'}
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'edit' ? 'Update' : 'Add Asset'}
          </button>
        </>}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Asset Name *</label>
              <input className="input" placeholder="e.g. Yamaha Keyboard PSR-E473" value={form.name || ''} onChange={set('name')} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category || 'general'} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Asset Tag / Code</label>
              <input className="input" placeholder="e.g. TBC-MUS-001" value={form.assetTag || ''} onChange={set('assetTag')} />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity || 1} onChange={set('quantity')} />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition || 'good'} onChange={set('condition')}>
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status || 'active'} onChange={set('status')}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="e.g. Main Auditorium" value={form.location || ''} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={form.purchaseDate || ''} onChange={set('purchaseDate')} />
            </div>
            <div>
              <label className="label">Purchase Price (₦)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchasePrice || ''} onChange={set('purchasePrice')} />
            </div>
            <div>
              <label className="label">Current Value (₦)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.currentValue || ''} onChange={set('currentValue')} />
            </div>
            <div>
              <label className="label">Custodian (In Charge)</label>
              <select className="input" value={form.custodianId || ''} onChange={set('custodianId')}>
                <option value="">— None —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
                <option value="">— Default —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input min-h-[60px]" placeholder="Brief description…" value={form.description || ''} onChange={set('description')} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input min-h-[60px]" placeholder="Additional notes, maintenance history, etc." value={form.notes || ''} onChange={set('notes')} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
