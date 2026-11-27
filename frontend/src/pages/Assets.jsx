import { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Loader2, Search, Filter, ArrowLeft, Edit2, Trash2,
  MapPin, Calendar, DollarSign, User, Tag, AlertTriangle, CheckCircle,
  Wrench, Archive, Building2, AlertCircle, Camera, Check, Eye, Clock,
  ShieldAlert, ChevronRight, UploadCloud
} from 'lucide-react';
import { assetsAPI, membersAPI, branchesAPI, departmentsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../api/client';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'musical_instrument', label: 'Musical Instruments', icon: '🎸' },
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'media', label: 'Media', icon: '🎬' },
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

const INCIDENT_STATUSES = [
  { value: 'reported', label: 'Reported / New', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'investigating', label: 'Investigating', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'under_repair', label: 'Under Repair', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'resolved', label: 'Resolved / Fixed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'dismissed', label: 'Dismissed', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const SEVERITIES = [
  { value: 'critical', label: 'Critical / Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

const canManage = (role) => ['head_pastor', 'senior_pastor', 'pastor', 'director', 'hod'].includes(role);
const canDelete = (role) => ['head_pastor', 'senior_pastor', 'pastor'].includes(role);
const getCatIcon = (cat) => CATEGORIES.find(c => c.value === cat)?.icon || '📦';
const getCondBadge = (cond) => CONDITIONS.find(c => c.value === cond) || CONDITIONS[0];
const getStatusBadge = (st) => STATUSES.find(s => s.value === st) || STATUSES[0];
const fmt = (n, currencyCode = 'NGN') => n != null ? formatCurrency(n, currencyCode) : '—';

// ── Asset Detail View ─────────────────────────────────────────
function AssetDetail({ asset, onBack, onEdit, onDelete, onReportIncident }) {
  const { user } = useAuth();
  const fmtMoney = (n) => fmt(n, user?.currency);
  const cond = getCondBadge(asset.condition);
  const stat = getStatusBadge(asset.status);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-600 text-sm transition-colors">
        <ArrowLeft size={16} /> Back to Inventory
      </button>

      <div className="card overflow-hidden">
        {/* Photo Banner if Available */}
        {asset.photo_url && (
          <div className="relative h-64 bg-gray-900 overflow-hidden border-b border-gray-200">
            <img
              src={getAssetUrl(asset.photo_url)}
              alt={asset.name}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
              <span className="text-white text-xs font-medium px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-sm">
                Documented Visual Condition & State
              </span>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              {!asset.photo_url && <div className="text-4xl">{getCatIcon(asset.category)}</div>}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.color}`}>{stat.label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                  {asset.asset_tag && <span className="text-xs text-gray-400 font-mono">#{asset.asset_tag}</span>}
                  {asset.department_name && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <Building2 size={12} /> {asset.department_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onReportIncident(asset)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
              >
                <AlertTriangle size={13} /> Report Damage
              </button>
              {canManage(user?.role) && (
                <button onClick={() => onEdit(asset)} className="btn-secondary text-sm">
                  <Edit2 size={14} /> Edit
                </button>
              )}
              {canDelete(user?.role) && (
                <button onClick={() => onDelete(asset.id)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {asset.description && <p className="text-gray-600 mb-4">{asset.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Category</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{(asset.category || '').replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Department / Unit</p>
              <p className="text-sm font-medium text-gray-900">
                {asset.department_name ? asset.department_name : 'Church-wide (General)'}
              </p>
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
              <p className="text-sm font-medium text-gray-900">{fmtMoney(asset.purchase_price)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Value</p>
              <p className="text-sm font-medium text-gray-900">{fmtMoney(asset.current_value)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Branch</p>
              <p className="text-sm font-medium text-gray-900">{asset.branch_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Custodian (In Charge)</p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                {asset.custodian_name ? (
                  <>
                    <User size={13} /> {asset.custodian_name}
                    {asset.custodian_phone && <span className="text-gray-400 ml-1">({asset.custodian_phone})</span>}
                  </>
                ) : '— Not assigned'}
              </p>
            </div>
          </div>

          {asset.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Condition & Maintenance Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Assets & Facility Page ───────────────────────────────
export default function Assets() {
  const { user } = useAuth();
  const fmtMoney = (n) => fmt(n, user?.currency);
  const currencySymbol = getCurrencySymbol(user?.currency).trim();

  // Navigation tab: 'assets' | 'incidents'
  const [activeTab, setActiveTab] = useState('assets');

  // Asset states
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', category: '', status: '', departmentId: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [members, setMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Whistleblower / Incident states
  const [incidents, setIncidents] = useState([]);
  const [incidentStats, setIncidentStats] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentFilters, setIncidentFilters] = useState({ status: 'all', severity: 'all', search: '' });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingIncident, setReportingIncident] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    assetId: '',
    facilityLocation: '',
    issueType: 'damage',
    severity: 'medium',
    title: '',
    description: '',
    photoUrl: '',
    isAnonymous: false,
    reporterName: '',
    reporterPhone: '',
  });

  // Incident Status Update Modal
  const [activeIncident, setActiveIncident] = useState(null);
  const [incidentStatusForm, setIncidentStatusForm] = useState({ status: 'investigating', actionTaken: '' });
  const [savingIncidentStatus, setSavingIncidentStatus] = useState(false);

  // Photo preview modal
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await assetsAPI.list(params);
      setAssets(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const params = {};
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const res = await assetsAPI.stats(params);
      setStats(res.data?.data || null);
    } catch {}
  }, [filters.departmentId]);

  const fetchIncidents = useCallback(async () => {
    setIncidentLoading(true);
    try {
      const params = {};
      if (incidentFilters.status !== 'all') params.status = incidentFilters.status;
      if (incidentFilters.severity !== 'all') params.severity = incidentFilters.severity;
      if (incidentFilters.search) params.search = incidentFilters.search;
      const [res, statsRes] = await Promise.all([
        assetsAPI.incidents(params),
        assetsAPI.incidentStats(),
      ]);
      setIncidents(res.data?.data || []);
      setIncidentStats(statsRes.data?.data || null);
    } catch {
      toast.error('Failed to load facility incident reports');
    } finally {
      setIncidentLoading(false);
    }
  }, [incidentFilters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchIncidents();
    }
  }, [activeTab, fetchIncidents]);

  useEffect(() => {
    departmentsAPI.list().then(res => setDepartments(res.data?.data || [])).catch(() => {});
  }, []);

  const loadFormData = async () => {
    try {
      const [m, b, d] = await Promise.all([
        membersAPI.list({ limit: 200 }),
        branchesAPI.list(),
        departmentsAPI.list(),
      ]);
      setMembers(m.data?.data || []);
      setBranches(b.data?.data || []);
      setDepartments(d.data?.data || []);
    } catch {}
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAssetPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await assetsAPI.uploadPhoto(fd);
      setForm(f => ({ ...f, photoUrl: res.data?.url }));
      toast.success('Asset picture uploaded! 📸');
    } catch {
      toast.error('Failed to upload asset picture');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleIncidentPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await assetsAPI.uploadPhoto(fd);
      setIncidentForm(f => ({ ...f, photoUrl: res.data?.url }));
      toast.success('Damage photo uploaded! 🚨');
    } catch {
      toast.error('Failed to upload damage photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openAdd = async () => {
    setForm({
      category: 'general',
      condition: 'good',
      status: 'active',
      quantity: 1,
      departmentId: user?.role === 'hod' && user?.department_id ? user.department_id : '',
      photoUrl: '',
    });
    await loadFormData();
    setModal('add');
  };

  const openEdit = async (asset) => {
    setForm({
      name: asset.name,
      description: asset.description || '',
      category: asset.category,
      assetTag: asset.asset_tag || '',
      quantity: asset.quantity,
      condition: asset.condition,
      status: asset.status,
      purchaseDate: asset.purchase_date?.split('T')[0] || '',
      purchasePrice: asset.purchase_price || '',
      currentValue: asset.current_value || '',
      location: asset.location || '',
      custodianId: asset.custodian_id || '',
      branchId: asset.branch_id || '',
      departmentId: asset.department_id || '',
      notes: asset.notes || '',
      photoUrl: asset.photo_url || '',
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
        setSelected(res.data?.data);
        toast.success('Asset updated!');
      } else {
        await assetsAPI.create(form);
        toast.success('Asset documented and tagged!');
      }
      setModal(null);
      fetchAssets();
      fetchStats();
    } catch {
      toast.error('Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Dispose this asset? It will be marked as disposed.')) return;
    try {
      await assetsAPI.delete(id);
      toast.success('Asset disposed');
      setSelected(null);
      fetchAssets();
      fetchStats();
    } catch {
      toast.error('Failed to dispose asset');
    }
  };

  const openReportDamageModal = (targetAsset = null) => {
    setIncidentForm({
      assetId: targetAsset ? targetAsset.id : '',
      facilityLocation: targetAsset ? (targetAsset.location || '') : '',
      issueType: 'damage',
      severity: 'medium',
      title: targetAsset ? `Damage on ${targetAsset.name}` : '',
      description: '',
      photoUrl: '',
      isAnonymous: false,
      reporterName: '',
      reporterPhone: '',
    });
    setShowReportModal(true);
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.facilityLocation.trim()) return toast.error('Please specify the location in church');
    if (!incidentForm.title.trim()) return toast.error('Please provide a brief title for the issue');
    if (!incidentForm.description.trim()) return toast.error('Please describe the damage or issue');

    setReportingIncident(true);
    try {
      const res = await assetsAPI.reportIncident(incidentForm);
      toast.success(res.data?.message || 'Damage report logged successfully!');
      setShowReportModal(false);
      fetchIncidents();
    } catch {
      toast.error('Failed to report incident');
    } finally {
      setReportingIncident(false);
    }
  };

  const openIncidentStatusModal = (incident) => {
    setActiveIncident(incident);
    setIncidentStatusForm({
      status: incident.status,
      actionTaken: incident.action_taken || '',
    });
  };

  const handleSaveIncidentStatus = async () => {
    if (!activeIncident) return;
    setSavingIncidentStatus(true);
    try {
      await assetsAPI.updateIncidentStatus(activeIncident.id, incidentStatusForm);
      toast.success('Incident status updated');
      setActiveIncident(null);
      fetchIncidents();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSavingIncidentStatus(false);
    }
  };

  // If viewing detail
  if (selected) {
    return (
      <AssetDetail
        asset={selected}
        onBack={() => setSelected(null)}
        onEdit={(a) => openEdit(a)}
        onDelete={handleDelete}
        onReportIncident={openReportDamageModal}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Facility & Asset Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track church inventory, departmental asset ownership, condition pictures, and whistleblower damage reports
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => openReportDamageModal()}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldAlert size={15} /> 🚨 Report Damaged Asset
          </button>

          {canManage(user?.role) && (
            <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-xs py-2">
              <Plus size={15} /> Add New Asset
            </button>
          )}
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center border-b border-gray-200">
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors mr-6 ${
            activeTab === 'assets'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={16} /> Asset Inventory & Tagging ({stats?.total || 0})
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors relative ${
            activeTab === 'incidents'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={16} /> Facility Whistleblower & Incidents
          {incidentStats?.reported > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {incidentStats.reported}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'assets' ? (
        /* ASSET INVENTORY VIEW */
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Assets', value: stats.total, icon: Package, color: 'text-brand-600 bg-brand-50' },
                { label: 'Active in Use', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Needs Repair / Damaged', value: stats.needs_repair, icon: Wrench, color: 'text-rose-600 bg-rose-50' },
                { label: 'Total Inventory Value', value: fmtMoney(stats.total_value), icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
              ].map((s, i) => (
                <div key={i} className="card flex items-center gap-3 p-4">
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
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search assets by name, tag, or location…"
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
              />
            </div>
            <select
              className="input w-auto text-sm"
              value={filters.departmentId}
              onChange={e => { setFilters(f => ({ ...f, departmentId: e.target.value })); setPage(1); }}
            >
              <option value="">All Departments</option>
              <option value="none">No Department / Church-wide</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              className="input w-auto text-sm"
              value={filters.category}
              onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <select
              className="input w-auto text-sm"
              value={filters.status}
              onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Asset List */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
          ) : assets.length === 0 ? (
            <div className="text-center py-20 card">
              <Package size={44} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-700 font-medium">No assets documented yet</p>
              <p className="text-gray-400 text-sm mb-4">Start tagging church equipment, computers, and instruments with condition pictures</p>
              {canManage(user?.role) && (
                <button onClick={openAdd} className="btn-primary inline-flex items-center gap-1.5"><Plus size={15} /> Add First Asset</button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset & Photo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Department Ownership</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Category</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Location</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Custodian</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Condition</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assets.map(a => {
                      const cond = getCondBadge(a.condition);
                      const stat = getStatusBadge(a.status);
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelected(a)}
                          className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {a.photo_url ? (
                                <img
                                  src={getAssetUrl(a.photo_url)}
                                  alt={a.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">
                                  {getCatIcon(a.category)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate hover:text-brand-600">{a.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stat.color}`}>{stat.label}</span>
                                  {a.asset_tag && <span className="text-[10px] text-gray-400 font-mono">#{a.asset_tag}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {a.department_name ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                                <Building2 size={12} /> {a.department_name}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Church-wide (Unassigned)</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-600 capitalize hidden md:table-cell">
                            {(a.category || '').replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{a.location || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{a.custodian_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openReportDamageModal(a)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1"
                              title="Report Damaged Item"
                            >
                              Report Damage
                            </button>
                          </td>
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
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* WHISTLEBLOWER & INCIDENT REPORTS VIEW */
        <div className="space-y-6">
          {/* Incident Stats */}
          {incidentStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-200">
                <div className="flex items-center justify-between text-amber-700">
                  <span className="text-xs font-bold uppercase tracking-wider">New Reports</span>
                  <AlertTriangle size={18} />
                </div>
                <p className="text-2xl font-extrabold text-amber-900 mt-2">{incidentStats.reported || 0}</p>
                <p className="text-xs text-amber-700 mt-0.5">Awaiting facility inspection</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200">
                <div className="flex items-center justify-between text-blue-700">
                  <span className="text-xs font-bold uppercase tracking-wider">Investigating</span>
                  <Clock size={18} />
                </div>
                <p className="text-2xl font-extrabold text-blue-900 mt-2">{incidentStats.investigating || 0}</p>
                <p className="text-xs text-blue-700 mt-0.5">Assigned to maintenance technician</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-purple-50 to-white border-purple-200">
                <div className="flex items-center justify-between text-purple-700">
                  <span className="text-xs font-bold uppercase tracking-wider">Under Repair</span>
                  <Wrench size={18} />
                </div>
                <p className="text-2xl font-extrabold text-purple-900 mt-2">{incidentStats.under_repair || 0}</p>
                <p className="text-xs text-purple-700 mt-0.5">Parts ordered / in repair</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
                  <CheckCircle size={18} />
                </div>
                <p className="text-2xl font-extrabold text-emerald-900 mt-2">{incidentStats.resolved || 0}</p>
                <p className="text-xs text-emerald-700 mt-0.5">Repairs completed successfully</p>
              </div>
            </div>
          )}

          {/* Incident Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={incidentFilters.status}
                onChange={(e) => setIncidentFilters({ ...incidentFilters, status: e.target.value })}
                className="input w-auto text-xs py-1"
              >
                <option value="all">All Statuses</option>
                {INCIDENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              <select
                value={incidentFilters.severity}
                onChange={(e) => setIncidentFilters({ ...incidentFilters, severity: e.target.value })}
                className="input w-auto text-xs py-1"
              >
                <option value="all">All Severities</option>
                {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <button
              onClick={() => openReportDamageModal()}
              className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Plus size={14} /> Report Facility Damage
            </button>
          </div>

          {/* Incidents List */}
          {incidentLoading ? (
            <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
          ) : incidents.length === 0 ? (
            <div className="card text-center py-16">
              <ShieldAlert size={40} className="mx-auto text-emerald-400 mb-2" />
              <p className="font-semibold text-gray-800">No reported facility damage!</p>
              <p className="text-xs text-gray-400 mt-1">All church facilities and equipment are reported in good condition.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map((inc) => {
                const statusMeta = INCIDENT_STATUSES.find(s => s.value === inc.status) || INCIDENT_STATUSES[0];
                const sevMeta = SEVERITIES.find(s => s.value === inc.severity) || SEVERITIES[2];
                return (
                  <div key={inc.id} className="card p-5 flex flex-col justify-between hover:shadow-card-hover transition-all border-l-4"
                    style={{ borderLeftColor: inc.severity === 'critical' ? '#e11d48' : inc.severity === 'high' ? '#ea580c' : '#f59e0b' }}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sevMeta.color}`}>
                            {sevMeta.label}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {inc.issue_type}
                          </span>
                        </div>

                        <span className="text-[11px] text-gray-400">
                          {new Date(inc.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title & Location */}
                      <h3 className="font-bold text-gray-900 text-base mb-1">{inc.title}</h3>
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mb-2">
                        <MapPin size={13} className="text-brand-600 shrink-0" />
                        Location: <strong>{inc.facility_location}</strong>
                        {inc.asset_name && <span className="text-gray-400">({inc.asset_name})</span>}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-gray-600 mb-3 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                        "{inc.description}"
                      </p>

                      {/* Photo if attached */}
                      {inc.photo_url && (
                        <div className="mb-3">
                          <button
                            onClick={() => setPreviewPhoto(getAssetUrl(inc.photo_url))}
                            className="relative group rounded-lg overflow-hidden border border-gray-200 block w-full h-32 bg-gray-100"
                          >
                            <img
                              src={getAssetUrl(inc.photo_url)}
                              alt="Damage report picture"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                              <Eye size={14} /> View Damage Picture
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Action taken / assigned */}
                      {inc.action_taken && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-900 mb-3">
                          <span className="font-bold">Maintenance Action:</span> {inc.action_taken}
                        </div>
                      )}

                      {/* Reporter badge */}
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <User size={12} /> Logged by: <strong>{inc.is_anonymous ? 'Anonymous Church Member' : inc.reporter_name}</strong>
                      </p>
                    </div>

                    {/* Facility Team Action Bar */}
                    {canManage(user?.role) && (
                      <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between">
                        <button
                          onClick={() => openIncidentStatusModal(inc)}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                        >
                          <Wrench size={13} /> Update Maintenance Status <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT ASSET */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit Asset & Properties' : 'Tag New Asset / Equipment'}
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'edit' ? 'Update Asset' : 'Add Asset'}
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Photo Upload & Preview at top */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2">
            {form.photoUrl ? (
              <div className="relative group w-full h-44 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={getAssetUrl(form.photoUrl)}
                  alt="Asset Preview"
                  className="w-full h-full object-cover"
                />
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1 cursor-pointer">
                  <Camera size={16} /> Change Picture
                  <input type="file" accept="image/*" onChange={handleAssetPhotoUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1 cursor-pointer py-3 text-center">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Camera size={20} />
                </div>
                <span className="text-xs font-semibold text-brand-700">Upload Asset Picture</span>
                <span className="text-[11px] text-gray-400">Capture visual condition, color, and appearance</span>
                <input type="file" accept="image/*" onChange={handleAssetPhotoUpload} className="hidden" />
              </label>
            )}
            {uploadingPhoto && <p className="text-xs text-brand-600 animate-pulse">Uploading photo...</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Asset Name *</label>
              <input
                className="input"
                placeholder="e.g. Yamaha Keyboard PSR-E473, Dell XPS Media Laptop"
                value={form.name || ''}
                onChange={set('name')}
                required
              />
            </div>

            <div>
              <label className="label">Department Ownership *</label>
              <select className="input" value={form.departmentId || ''} onChange={set('departmentId')}>
                <option value="">— None / Church-wide —</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category || 'general'} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Asset Tag / Serial Number</label>
              <input className="input" placeholder="e.g. TBC-MED-001" value={form.assetTag || ''} onChange={set('assetTag')} />
            </div>

            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity || 1} onChange={set('quantity')} />
            </div>

            <div>
              <label className="label">Physical Condition</label>
              <select className="input" value={form.condition || 'good'} onChange={set('condition')}>
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Operational Status</label>
              <select className="input" value={form.status || 'active'} onChange={set('status')}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Location in Church</label>
              <input className="input" placeholder="e.g. Media Gallery, Children Sanctuary" value={form.location || ''} onChange={set('location')} />
            </div>

            <div>
              <label className="label">Custodian (In Charge)</label>
              <select className="input" value={form.custodianId || ''} onChange={set('custodianId')}>
                <option value="">— Select Member —</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Purchase Price ({currencySymbol})</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchasePrice || ''} onChange={set('purchasePrice')} />
            </div>

            <div>
              <label className="label">Current Estimated Value ({currencySymbol})</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.currentValue || ''} onChange={set('currentValue')} />
            </div>

            <div>
              <label className="label">Purchase Date</label>
              <input className="input" type="date" value={form.purchaseDate || ''} onChange={set('purchaseDate')} />
            </div>

            <div>
              <label className="label">Branch</label>
              <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
                <option value="">— Default Branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="label">Description & Physical Specs</label>
              <textarea
                className="input min-h-[60px]"
                placeholder="Color, model number, specifications, accessories included..."
                value={form.description || ''}
                onChange={set('description')}
              />
            </div>

            <div className="col-span-2">
              <label className="label">Maintenance History / Notes</label>
              <textarea
                className="input min-h-[60px]"
                placeholder="Past repairs, warranty info, or handling instructions..."
                value={form.notes || ''}
                onChange={set('notes')}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: WHISTLEBLOWER FACILITY DAMAGE REPORT */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="🚨 Whistleblower Facility Incident Report"
        footer={
          <>
            <button onClick={() => setShowReportModal(false)} className="btn-secondary" disabled={reportingIncident}>
              Cancel
            </button>
            <button onClick={handleReportIncident} className="btn-primary bg-rose-600 hover:bg-rose-700" disabled={reportingIncident}>
              {reportingIncident ? <Loader2 size={16} className="animate-spin" /> : 'Submit Damage Report'}
            </button>
          </>
        }
      >
        <form onSubmit={handleReportIncident} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Help protect church facilities and property!</p>
              <p className="mt-0.5 text-rose-800">
                Notice a broken pipe, damaged AC unit, torn seating, malfunctioning keyboard, or shattered window? Log it here so our facility team can repair it immediately.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Where is the damaged item located? *</label>
            <input
              className="input"
              placeholder="e.g. Gallery stairway, Restroom 1st floor, Generator house, Choir stand..."
              value={incidentForm.facilityLocation}
              onChange={(e) => setIncidentForm({ ...incidentForm, facilityLocation: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Issue Type *</label>
              <select
                className="input"
                value={incidentForm.issueType}
                onChange={(e) => setIncidentForm({ ...incidentForm, issueType: e.target.value })}
              >
                <option value="damage">Property Damage</option>
                <option value="broken">Broken / Shattered</option>
                <option value="malfunction">Equipment Malfunction</option>
                <option value="hazard">Safety Hazard / Electrical</option>
                <option value="vandalism_theft">Vandalism / Suspected Theft</option>
                <option value="other">Other Incident</option>
              </select>
            </div>

            <div>
              <label className="label">Urgency / Severity *</label>
              <select
                className="input"
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
              >
                <option value="critical">Critical (Immediate hazard)</option>
                <option value="high">High (Service impacting)</option>
                <option value="medium">Medium (Needs repair soon)</option>
                <option value="low">Low (Minor aesthetic)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Brief Headline of the Issue *</label>
            <input
              className="input"
              placeholder="e.g. Water leaking from ceiling onto choir mixer"
              value={incidentForm.title}
              onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Description of Damage & Condition *</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Explain what is damaged, what caused it (if known), and any danger to attendees..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="label">Attach Picture of Damaged Item</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleIncidentPhotoUpload}
              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
            />
            {uploadingPhoto && <p className="text-xs text-rose-600 mt-1">Uploading damage photo...</p>}
            {incidentForm.photoUrl && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <Check size={12} /> Damage photo attached
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="checkbox"
              id="anon-whistleblower"
              checked={incidentForm.isAnonymous}
              onChange={(e) => setIncidentForm({ ...incidentForm, isAnonymous: e.target.checked })}
              className="rounded text-rose-600"
            />
            <label htmlFor="anon-whistleblower" className="text-xs text-gray-700 font-semibold cursor-pointer">
              Report anonymously as whistleblower (hide my personal contact details)
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: UPDATE INCIDENT STATUS (FACILITY TEAM) */}
      <Modal
        open={Boolean(activeIncident)}
        onClose={() => setActiveIncident(null)}
        title="Update Facility Maintenance Status"
        footer={
          <>
            <button onClick={() => setActiveIncident(null)} className="btn-secondary" disabled={savingIncidentStatus}>
              Cancel
            </button>
            <button onClick={handleSaveIncidentStatus} className="btn-primary" disabled={savingIncidentStatus}>
              {savingIncidentStatus ? <Loader2 size={16} className="animate-spin" /> : 'Update Status'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
            Updating incident: <strong>"{activeIncident?.title}"</strong> at <strong>{activeIncident?.facility_location}</strong>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={incidentStatusForm.status}
              onChange={(e) => setIncidentStatusForm({ ...incidentStatusForm, status: e.target.value })}
            >
              <option value="reported">Reported (New)</option>
              <option value="investigating">Investigating (Technician Assigned)</option>
              <option value="under_repair">Under Repair (Parts Ordered / Work In Progress)</option>
              <option value="resolved">Resolved (Repaired / Replaced)</option>
              <option value="dismissed">Dismissed (No Action Required)</option>
            </select>
          </div>

          <div>
            <label className="label">Action Taken / Resolution Summary</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="e.g. Replacement valve installed by maintenance team; tested and leak stopped..."
              value={incidentStatusForm.actionTaken}
              onChange={(e) => setIncidentStatusForm({ ...incidentStatusForm, actionTaken: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: FULL PHOTO PREVIEW */}
      <Modal
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        title="Facility Damage Picture"
        footer={<button onClick={() => setPreviewPhoto(null)} className="btn-secondary">Close</button>}
      >
        <div className="flex justify-center p-2">
          {previewPhoto && (
            <img src={previewPhoto} alt="Preview" className="max-h-[70vh] rounded-xl object-contain shadow-md" />
          )}
        </div>
      </Modal>
    </div>
  );
}
