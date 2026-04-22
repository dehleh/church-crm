import { useState, useEffect, useCallback, useMemo } from 'react';
import { Heart, Plus, Package, ClipboardList, CheckCircle, XCircle, DollarSign, QrCode } from 'lucide-react';
import { welfareAPI, membersAPI } from '../api/services';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';

const PACKAGE_TYPES = ['financial', 'material', 'medical', 'educational', 'other'];
const APP_STATUSES = ['pending', 'under_review', 'approved', 'disbursed', 'rejected'];
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', under_review: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', disbursed: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

export default function Welfare() {
  const { user } = useAuth();
  const [tab, setTab] = useState('applications'); // 'applications' | 'packages'
  const [packages, setPackages] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'addPkg' | 'apply' | 'review'
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [pkgFilter, setPkgFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showShare, setShowShare] = useState(false);

  const [pkgForm, setPkgForm] = useState({ name: '', description: '', packageType: 'financial' });
  const [appForm, setAppForm] = useState({ packageId: '', memberId: '', applicantName: '', reason: '', amountRequested: '' });
  const [reviewForm, setReviewForm] = useState({ status: '', amountApproved: '', reviewNotes: '' });

  const fetchPackages = async () => {
    try { const { data } = await welfareAPI.packages(); setPackages(data.data || []); } catch {}
  };

  const fetchApplications = useCallback(async () => {
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (pkgFilter) params.packageId = pkgFilter;
      const { data } = await welfareAPI.applications(params);
      setApplications(data.data || []);
      setPagination(data.pagination || {});
    } catch { toast.error('Failed to load applications'); }
    finally { setLoading(false); }
  }, [page, statusFilter, pkgFilter]);

  const fetchStats = async () => {
    try { const { data } = await welfareAPI.stats(); setStats(data.data || {}); } catch {}
  };

  const fetchMembers = async () => {
    try { const { data } = await membersAPI.list({ limit: 500 }); setMembers(data.data || []); } catch {}
  };

  useEffect(() => { fetchPackages(); fetchStats(); fetchMembers(); }, []);
  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const churchSlug = user?.church_slug || user?.churchSlug;
  const publicWelfareFormUrl = useMemo(() => {
    if (!churchSlug || typeof window === 'undefined') return '';
    return `${window.location.origin}/connect/${churchSlug}/welfare`;
  }, [churchSlug]);

  const handleAddPackage = async () => {
    if (!pkgForm.name) return toast.error('Name is required');
    try {
      await welfareAPI.createPackage(pkgForm);
      toast.success('Package created');
      setModal(null);
      fetchPackages();
      fetchStats();
    } catch { toast.error('Failed to create package'); }
  };

  const handleApply = async () => {
    if (!appForm.packageId) return toast.error('Select a package');
    if (!appForm.reason) return toast.error('Reason is required');
    try {
      await welfareAPI.createApplication({
        ...appForm,
        amountRequested: appForm.amountRequested ? parseFloat(appForm.amountRequested) : undefined,
      });
      toast.success('Application submitted');
      setModal(null);
      fetchApplications();
      fetchStats();
    } catch { toast.error('Failed to submit application'); }
  };

  const handleReview = async () => {
    if (!selected) return;
    try {
      await welfareAPI.reviewApplication(selected.id, {
        status: reviewForm.status || undefined,
        amountApproved: reviewForm.amountApproved ? parseFloat(reviewForm.amountApproved) : undefined,
        reviewNotes: reviewForm.reviewNotes || undefined,
      });
      toast.success('Application updated');
      setModal(null);
      fetchApplications();
      fetchStats();
    } catch { toast.error('Failed to update'); }
  };

  const openReview = (app) => {
    setSelected(app);
    setReviewForm({ status: app.status, amountApproved: app.amount_approved || '', reviewNotes: app.review_notes || '' });
    setModal('review');
  };

  const fmt = (v) => v != null ? `₦${Number(v).toLocaleString()}` : '—';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <Heart className="text-brand-600" size={28} /> Welfare
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage welfare packages and applications</p>
        </div>
        <div className="flex gap-2">
          {publicWelfareFormUrl && (
            <button onClick={() => setShowShare(true)} className="btn-secondary flex items-center gap-2"><QrCode size={16} /> Welfare Form</button>
          )}
          <button onClick={() => { setPkgForm({ name: '', description: '', packageType: 'financial' }); setModal('addPkg'); }} className="btn-secondary flex items-center gap-2"><Package size={16} /> New Package</button>
          <button onClick={() => { setAppForm({ packageId: '', memberId: '', applicantName: '', reason: '', amountRequested: '' }); setModal('apply'); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Application</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Active Packages', value: stats.active_packages || 0, color: 'text-brand-600' },
          { label: 'Total Applications', value: stats.total_applications || 0, color: 'text-blue-600' },
          { label: 'Pending', value: stats.pending || 0, color: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved || 0, color: 'text-green-600' },
          { label: 'Total Disbursed', value: fmt(stats.total_disbursed), color: 'text-emerald-600', raw: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.raw ? s.value : s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('applications')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'applications' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>Applications</button>
        <button onClick={() => setTab('packages')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'packages' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>Packages</button>
      </div>

      {/* Applications Tab */}
      {tab === 'applications' && (
        <>
          <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-40">
              <option value="">All Status</option>
              {APP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
            <select value={pkgFilter} onChange={e => { setPkgFilter(e.target.value); setPage(1); }} className="input-field w-48">
              <option value="">All Packages</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No applications found</td></tr>
                  )}
                  {applications.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.applicant_display_name || a.applicant_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{a.package_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{a.reason}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(a.amount_requested)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(a.amount_approved)}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[a.status])}>{a.status?.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => openReview(a)} className="text-xs text-brand-600 hover:underline">Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Packages Tab */}
      {tab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.length === 0 && <div className="col-span-full text-center text-gray-400 py-12">No packages yet</div>}
          {packages.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 capitalize">{p.package_type}</span>
                </div>
                {!p.is_active && <span className="text-xs text-red-500">Inactive</span>}
              </div>
              {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{p.total_applications || 0} applications</span>
                <span>{p.pending_applications || 0} pending</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Package Modal */}
      {modal === 'addPkg' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create Welfare Package</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} className="input-field w-full" placeholder="e.g. Medical Aid Fund" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={pkgForm.packageType} onChange={e => setPkgForm(f => ({ ...f, packageType: e.target.value }))} className="input-field w-full">
                  {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} className="input-field w-full" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddPackage} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {modal === 'apply' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Welfare Application</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package *</label>
                <select value={appForm.packageId} onChange={e => setAppForm(f => ({ ...f, packageId: e.target.value }))} className="input-field w-full">
                  <option value="">Select package</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.package_type})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member (optional)</label>
                <select value={appForm.memberId} onChange={e => setAppForm(f => ({ ...f, memberId: e.target.value }))} className="input-field w-full">
                  <option value="">Select member or type name below</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
                <input value={appForm.applicantName} onChange={e => setAppForm(f => ({ ...f, applicantName: e.target.value }))} className="input-field w-full" placeholder="If not a member" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea value={appForm.reason} onChange={e => setAppForm(f => ({ ...f, reason: e.target.value }))} className="input-field w-full" rows={3} placeholder="Describe the need..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested</label>
                <input type="number" value={appForm.amountRequested} onChange={e => setAppForm(f => ({ ...f, amountRequested: e.target.value }))} className="input-field w-full" placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleApply} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {modal === 'review' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Review Application</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Applicant</span><span className="font-medium">{selected.applicant_display_name || selected.applicant_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Package</span><span>{selected.package_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reason</span><span className="text-right max-w-[60%]">{selected.reason}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Requested</span><span>{fmt(selected.amount_requested)}</span></div>
              {selected.reviewed_by_name && <div className="flex justify-between"><span className="text-gray-500">Reviewed by</span><span>{selected.reviewed_by_name}</span></div>}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} className="input-field w-full">
                  {APP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Approved</label>
                <input type="number" value={reviewForm.amountApproved} onChange={e => setReviewForm(f => ({ ...f, amountApproved: e.target.value }))} className="input-field w-full" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
                <textarea value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} className="input-field w-full" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReview} className="btn-primary">Update</button>
            </div>
          </div>
        </div>
      )}

      <PublicIntakeShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="Welfare Application Form"
        description="Share this QR code or link so people can submit welfare requests directly into the Welfare page for review."
        url={publicWelfareFormUrl}
      />
    </div>
  );
}
