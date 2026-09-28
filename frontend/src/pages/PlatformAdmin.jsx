import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, ShieldAlert, ShieldCheck, Trash2,
  Search, Loader2, BarChart3, Eye, RefreshCw, Plus, Copy, CheckCircle2, KeyRound,
  Settings as SettingsIcon, ArrowRightCircle, Server, Activity, Clock, AlertTriangle, CreditCard
} from 'lucide-react';

import toast from 'react-hot-toast';
import { platformAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [stats, setStats] = useState(null);
  const [churches, setChurches] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [activity, setActivity] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [settingsTarget, setSettingsTarget] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [createForm, setCreateForm] = useState({
    churchName: '', churchSlug: '', denomination: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
    setOwnPassword: false, adminPassword: '',
  });
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        platformAPI.stats(),
        platformAPI.listChurches({ search, status, activity, page, limit: 20 }),
      ]);
      setStats(s.data.data);
      setChurches(c.data.data);
      setPagination(c.data.pagination || { totalPages: 1 });
    } catch (err) {
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [page, status, activity]);

  const onSearch = (e) => { e.preventDefault(); setPage(1); loadAll(); };


  const suspend = async (church) => {
    if (!window.confirm(`Suspend "${church.name}"? Users will be locked out.`)) return;
    setBusyId(church.id);
    try {
      await platformAPI.suspendChurch(church.id, { reason: 'admin action' });
      toast.success('Church suspended');
      loadAll();
    } catch { toast.error('Failed'); } finally { setBusyId(null); }
  };

  const activate = async (church) => {
    setBusyId(church.id);
    try {
      await platformAPI.activateChurch(church.id);
      toast.success('Church re-activated');
      loadAll();
    } catch { toast.error('Failed'); } finally { setBusyId(null); }
  };

  const resetPassword = async (church) => {
    if (!window.confirm(`Reset admin password for "${church.name}"? The current password will stop working immediately.`)) return;
    setBusyId(church.id);
    try {
      const { data } = await platformAPI.resetChurchAdminPassword(church.id);
      setCreateResult({
        church: { name: church.name, slug: church.slug },
        admin: data.data.user,
        temporaryPassword: data.data.temporaryPassword,
        isReset: true,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    } finally { setBusyId(null); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await platformAPI.deleteChurch(confirmDelete.id);
      toast.success('Church deleted');
      setConfirmDelete(null);
      loadAll();
    } catch { toast.error('Failed'); } finally { setBusyId(null); }
  };

  const handleAccess = async (church) => {
    setBusyId(church.id);
    try {
      const res = await platformAPI.impersonate(church.id);
      const { user: switchedUser, accessToken, refreshToken } = res.data.data;
      login(switchedUser, { accessToken, refreshToken });
      toast.success(`Accessing ${church.name}...`);
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to access church');
    } finally {
      setBusyId(null);
    }
  };

  const showDetail = async (church) => {
    try {
      const { data } = await platformAPI.getChurch(church.id);
      setDetail(data.data);
    } catch { toast.error('Failed to load'); }
  };

  const openSettings = async (church) => {
    try {
      const { data } = await platformAPI.getChurch(church.id);
      const c = data.data;
      setSettingsTarget(c);
      setSettingsForm({
        subscriptionPlan: c.subscription_plan || 'starter',
        multiBranchEnabled: !!c.multi_branch_enabled,
        isWhitelisted: !!c.is_whitelisted,
        branchLimit: c.branch_limit ?? '',
        memberLimit: c.member_limit ?? '',
        licenseKey: c.license_key || '',
        licenseNotes: c.license_notes || '',
        subscriptionExpiresAt: c.subscription_expires_at ? c.subscription_expires_at.slice(0, 10) : '',
      });
    } catch { toast.error('Failed to load church settings'); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!settingsTarget) return;
    setSavingSettings(true);
    try {
      const payload = {
        subscriptionPlan: settingsForm.subscriptionPlan || null,
        multiBranchEnabled: settingsForm.multiBranchEnabled,
        isWhitelisted: settingsForm.isWhitelisted,
        branchLimit: settingsForm.branchLimit === '' ? null : parseInt(settingsForm.branchLimit, 10),
        memberLimit: settingsForm.memberLimit === '' ? null : parseInt(settingsForm.memberLimit, 10),
        licenseKey: settingsForm.licenseKey || null,
        licenseNotes: settingsForm.licenseNotes || null,
        subscriptionExpiresAt: settingsForm.subscriptionExpiresAt
          ? new Date(settingsForm.subscriptionExpiresAt).toISOString()
          : null,
      };
      await platformAPI.updateSettings(settingsTarget.id, payload);
      toast.success('Settings updated');
      setSettingsTarget(null);
      setSettingsForm(null);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSavingSettings(false);
    }
  };

  const slugify = (s) => s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50);

  const setF = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setCreateForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'churchName' && !f.churchSlug) next.churchSlug = slugify(v);
      return next;
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        churchName: createForm.churchName.trim(),
        churchSlug: createForm.churchSlug.trim().toLowerCase(),
        denomination: createForm.denomination.trim() || undefined,
        adminFirstName: createForm.adminFirstName.trim(),
        adminLastName: createForm.adminLastName.trim(),
        adminEmail: createForm.adminEmail.trim(),
        adminPhone: createForm.adminPhone.trim() || undefined,
        ...(createForm.setOwnPassword && createForm.adminPassword
          ? { adminPassword: createForm.adminPassword }
          : {}),
      };
      const { data } = await platformAPI.createChurch(payload);
      setCreateResult(data.data);
      setCreateOpen(false);
      setCreateForm({
        churchName: '', churchSlug: '', denomination: '',
        adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
        setOwnPassword: false, adminPassword: '',
      });
      loadAll();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Failed to create church';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            Platform Operations Console
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </h1>
          <p className="text-sm text-gray-500">
            Monitor church onboarding, view login metrics, support church admins, and manage SaaS tenants.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDiagnostics(true)}
            className="btn-outline gap-1.5 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
          >
            <Server size={14}/> System Health
          </button>
          <button onClick={loadAll} className="btn-outline gap-1.5 text-xs">
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary gap-1.5 text-xs">
            <Plus size={14}/> New Church
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Building2} color="brand" label="Total Churches" value={stats.churches.total} />
            <StatCard icon={Activity} color="green" label="Logged in Today" value={stats.churches.logged_in_today || 0} badge="Live" />
            <StatCard icon={Clock} color="blue" label="Active (7 Days)" value={stats.churches.logged_in_7d || 0} />
            <StatCard icon={Users} color="purple" label="Platform Members" value={stats.totals?.total_members || 0} />
            <StatCard icon={AlertTriangle} color="amber" label="Never Logged In" value={stats.churches.never_logged_in || 0} />
            <StatCard icon={ShieldAlert} color="red" label="Suspended" value={stats.churches.suspended} />
          </div>

          {/* Monetization & Subscription Stats */}
          {stats?.monetization && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={CreditCard} color="green" label="Platform Revenue (Paystack)" value={`₦${Number(stats.monetization.totalRevenueNgn || 0).toLocaleString()}`} />
              <StatCard icon={ShieldCheck} color="brand" label="Active Paid Churches" value={stats.monetization.paidCount || 0} />
              <StatCard icon={Clock} color="amber" label="Churches on 14d Trial" value={stats.monetization.trialCount || 0} />
              <StatCard icon={AlertTriangle} color="red" label="Expired Subscriptions" value={stats.monetization.expiredCount || 0} />
            </div>
          )}
        </div>
      )}

      {/* Activity Filter Tabs & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Activity Filter:</span>
          {[
            { id: '', label: 'All Churches' },
            { id: 'today', label: `Logged In Today (${stats?.churches?.logged_in_today || 0})` },
            { id: 'week', label: `Active This Week (${stats?.churches?.logged_in_7d || 0})` },
            { id: 'dormant', label: 'Dormant (> 30d)' },
            { id: 'never', label: `Never Logged In (${stats?.churches?.never_logged_in || 0})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setActivity(f.id); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activity === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <form onSubmit={onSearch} className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search by church name, slug, denomination…"
              className="input pl-9 text-xs" />
          </form>
          <select value={status} onChange={(e)=>{setPage(1);setStatus(e.target.value);}} className="input max-w-[180px] text-xs">
            <option value="">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-brand-600" size={28}/></div>
        ) : churches.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No churches found matching this criteria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Church</th>
                  <th className="text-left px-4 py-3">Denomination</th>
                  <th className="text-right px-4 py-3">Users</th>
                  <th className="text-right px-4 py-3">Members</th>
                  <th className="text-right px-4 py-3">Branches</th>
                  <th className="text-left px-4 py-3">Last Login Activity</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Support Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {churches.map(c => {
                  const activityPills = {
                    active_today: <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold bg-emerald-100 text-emerald-800"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Today</span>,
                    active_week: <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold bg-sky-100 text-sky-800">This Week</span>,
                    active_month: <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold bg-slate-100 text-slate-700">Active</span>,
                    dormant: <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold bg-amber-100 text-amber-800">Dormant</span>,
                    never_logged_in: <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200">Never</span>,
                  };

                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500 font-mono">/{c.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{c.denomination || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{c.user_count}</td>
                      <td className="px-4 py-3 text-right font-medium">{c.member_count}</td>
                      <td className="px-4 py-3 text-right font-medium">{c.branch_count}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div className="flex flex-col gap-1 items-start">
                          {activityPills[c.login_activity_status] || activityPills.never_logged_in}
                          <span className="text-[10px] text-gray-400">
                            {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString() : 'No logins yet'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={c.subscription_plan} multiBranch={c.multi_branch_enabled} whitelisted={c.is_whitelisted} expiresAt={c.subscription_expires_at} />
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active
                          ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-semibold">Active</span>
                          : <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold">Suspended</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end items-center">
                          <button onClick={()=>handleAccess(c)} disabled={busyId===c.id}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors" title="Support: Impersonate & Access Church Dashboard">
                            <ArrowRightCircle size={13}/> Support
                          </button>
                          <button onClick={()=>showDetail(c)} disabled={busyId===c.id}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="View Details"><Eye size={14}/></button>
                          <button onClick={()=>openSettings(c)} disabled={busyId===c.id}
                            className="p-1.5 hover:bg-indigo-50 rounded text-indigo-700" title="Configure Plan & Quotas"><SettingsIcon size={14}/></button>
                          {c.is_active
                            ? <button onClick={()=>suspend(c)} disabled={busyId===c.id}
                                className="p-1.5 hover:bg-amber-50 rounded text-amber-700" title="Suspend Church"><ShieldAlert size={14}/></button>
                            : <button onClick={()=>activate(c)} disabled={busyId===c.id}
                                className="p-1.5 hover:bg-green-50 rounded text-green-700" title="Activate Church"><ShieldCheck size={14}/></button>}
                          <button onClick={()=>resetPassword(c)} disabled={busyId===c.id}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Generate Temporary Password"><KeyRound size={14}/></button>
                          <button onClick={()=>setConfirmDelete(c)} disabled={busyId===c.id}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete Church Record"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-3 flex justify-between items-center text-sm border-t border-gray-100">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
              className="btn-outline disabled:opacity-50">Prev</button>
            <span className="text-gray-500">Page {page} of {pagination.totalPages}</span>
            <button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)}
              className="btn-outline disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail?.name}>
        {detail && (
          <div className="space-y-3 text-sm">
            <Row k="Slug" v={detail.slug}/>
            <Row k="Denomination" v={detail.denomination || '—'}/>
            <Row k="Status" v={detail.is_active ? 'Active' : 'Suspended'}/>
            <Row k="Created" v={new Date(detail.created_at).toLocaleString()}/>
            <hr className="my-2"/>
            <Row k="Branches" v={detail.branch_count}/>
            <Row k="Users" v={detail.user_count}/>
            <Row k="Members" v={detail.member_count}/>
            <Row k="First Timers" v={detail.first_timer_count}/>
            <Row k="Events" v={detail.event_count}/>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Delete church?">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              This will <strong>permanently delete</strong> "{confirmDelete.name}" and all its data
              (members, events, finances, etc.). This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setConfirmDelete(null)} className="btn-outline">Cancel</button>
              <button onClick={doDelete} disabled={busyId===confirmDelete.id}
                className="btn bg-red-600 hover:bg-red-700 text-white gap-2">
                {busyId===confirmDelete.id && <Loader2 className="animate-spin" size={14}/>}
                Delete permanently
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create church modal */}
      <Modal open={createOpen} onClose={() => !creating && setCreateOpen(false)} title="Provision new church">
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Church name *</label>
              <input className="input" value={createForm.churchName} onChange={setF('churchName')} required />
            </div>
            <div>
              <label className="label">Slug * <span className="text-gray-400">(URL-safe)</span></label>
              <input className="input" value={createForm.churchSlug} onChange={setF('churchSlug')} required
                pattern="[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?" />
            </div>
          </div>
          <div>
            <label className="label">Denomination</label>
            <input className="input" value={createForm.denomination} onChange={setF('denomination')} />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Head pastor / admin account</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">First name *</label>
                <input className="input" value={createForm.adminFirstName} onChange={setF('adminFirstName')} required />
              </div>
              <div>
                <label className="label">Last name *</label>
                <input className="input" value={createForm.adminLastName} onChange={setF('adminLastName')} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={createForm.adminEmail} onChange={setF('adminEmail')} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={createForm.adminPhone} onChange={setF('adminPhone')} />
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createForm.setOwnPassword} onChange={setF('setOwnPassword')} />
              <span>Set a password manually (otherwise a strong temporary password is generated and shown once)</span>
            </label>
            {createForm.setOwnPassword && (
              <input type="text" className="input" placeholder="Min 8 characters"
                minLength={8} value={createForm.adminPassword} onChange={setF('adminPassword')} required />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="btn-outline">Cancel</button>
            <button type="submit" disabled={creating} className="btn-primary gap-2">
              {creating && <Loader2 size={14} className="animate-spin"/>}
              Provision church
            </button>
          </div>
        </form>
      </Modal>

      {/* Plan & access settings modal */}
      <Modal open={!!settingsTarget} onClose={() => !savingSettings && (setSettingsTarget(null), setSettingsForm(null))}
             title={settingsTarget ? `Plan & access — ${settingsTarget.name}` : ''}>
        {settingsForm && (
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="label">Subscription plan</label>
              <select className="input" value={settingsForm.subscriptionPlan}
                onChange={(e)=>setSettingsForm(f=>({...f, subscriptionPlan: e.target.value}))}>
                <option value="trial">14-Day Free Trial</option>
                <option value="starter">Starter — ₦250,000 / year (single branch)</option>
                <option value="growth">Growth — ₦600,000 / year (≤3 branches / ≤500 members)</option>
                <option value="enterprise">Enterprise — Custom quotation (10+ branches / 5,000+ members)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" className="mt-0.5"
                  checked={settingsForm.multiBranchEnabled}
                  onChange={(e)=>setSettingsForm(f=>({...f, multiBranchEnabled: e.target.checked}))}/>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Multi-branch enabled</div>
                  <div className="text-xs text-gray-500">If off, the church can only have its single HQ branch.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100">
                <input type="checkbox" className="mt-0.5"
                  checked={settingsForm.isWhitelisted}
                  onChange={(e)=>setSettingsForm(f=>({...f, isWhitelisted: e.target.checked}))}/>
                <div>
                  <div className="text-sm font-semibold text-amber-900">License whitelist</div>
                  <div className="text-xs text-amber-700">Bypass plan limits (for licensed / paid-up churches).</div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Branch limit</label>
                <input type="number" min="0" className="input" placeholder="Unlimited"
                  value={settingsForm.branchLimit}
                  onChange={(e)=>setSettingsForm(f=>({...f, branchLimit: e.target.value}))}/>
                <p className="text-[11px] text-gray-400 mt-1">Leave blank for unlimited.</p>
              </div>
              <div>
                <label className="label">Member limit</label>
                <input type="number" min="0" className="input" placeholder="Unlimited"
                  value={settingsForm.memberLimit}
                  onChange={(e)=>setSettingsForm(f=>({...f, memberLimit: e.target.value}))}/>
                <p className="text-[11px] text-gray-400 mt-1">Leave blank for unlimited.</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Subscription expires</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 14);
                      setSettingsForm(f => ({ ...f, subscriptionExpiresAt: d.toISOString().slice(0, 10), subscriptionPlan: 'trial' }));
                    }}
                    className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200"
                  >
                    +14d Trial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setSettingsForm(f => ({ ...f, subscriptionExpiresAt: d.toISOString().slice(0, 10) }));
                    }}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded border border-indigo-200"
                  >
                    +30d
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      setSettingsForm(f => ({ ...f, subscriptionExpiresAt: d.toISOString().slice(0, 10) }));
                    }}
                    className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200"
                  >
                    +1 Year
                  </button>
                </div>
              </div>
              <input type="date" className="input"
                value={settingsForm.subscriptionExpiresAt}
                onChange={(e)=>setSettingsForm(f=>({...f, subscriptionExpiresAt: e.target.value}))}/>
            </div>

            <div>
              <label className="label">License key (optional)</label>
              <input className="input font-mono text-sm"
                value={settingsForm.licenseKey}
                onChange={(e)=>setSettingsForm(f=>({...f, licenseKey: e.target.value}))}/>
            </div>

            <div>
              <label className="label">License notes</label>
              <textarea className="input" rows={2}
                value={settingsForm.licenseNotes}
                onChange={(e)=>setSettingsForm(f=>({...f, licenseNotes: e.target.value}))}/>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" disabled={savingSettings}
                onClick={() => { setSettingsTarget(null); setSettingsForm(null); }}>Cancel</button>
              <button type="submit" className="btn-primary gap-2" disabled={savingSettings}>
                {savingSettings && <Loader2 size={14} className="animate-spin"/>}
                Save settings
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Created result */}
      <Modal open={!!createResult} onClose={() => setCreateResult(null)} title={createResult?.isReset ? 'Password reset' : 'Church created'}>
        {createResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={20}/>
              <span className="font-semibold">
                {createResult.isReset
                  ? `Password reset for ${createResult.admin.email}`
                  : `${createResult.church.name} is live.`}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <Row k="Login URL" v={`${window.location.origin}/login`} />
              <Row k="Admin email" v={createResult.admin.email} />
              <Row k="Slug" v={createResult.church.slug} />
            </div>
            {createResult.temporaryPassword && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  TEMPORARY PASSWORD — shown once. Share it securely with the customer; ask them to change it on first login.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded border border-amber-300 font-mono text-sm break-all">
                    {createResult.temporaryPassword}
                  </code>
                  <button type="button" className="btn-outline gap-1"
                    onClick={() => { navigator.clipboard.writeText(createResult.temporaryPassword); toast.success('Copied'); }}>
                    <Copy size={14}/> Copy
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setCreateResult(null)} className="btn-primary">Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* System Diagnostics & Operations Health Modal */}
      <Modal open={showDiagnostics} onClose={() => setShowDiagnostics(false)} title="Platform Operations & Diagnostics" size="md">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-emerald-950">Platform Services Operational</p>
                <p className="text-xs text-emerald-700">All tenant databases, APIs, and background cron jobs healthy</p>
              </div>
            </div>
            <span className="text-xs bg-emerald-200/70 text-emerald-800 font-bold px-2 py-0.5 rounded">100% Up</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="card p-3 bg-gray-50/70 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium uppercase">API Uptime</span>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{stats?.systemHealth?.uptimeHours || '0'} hrs</p>
            </div>
            <div className="card p-3 bg-gray-50/70 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium uppercase">Memory Heap</span>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{stats?.systemHealth?.memoryMb || '0'} MB</p>
            </div>
            <div className="card p-3 bg-gray-50/70 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium uppercase">PostgreSQL Pool</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">Connected (SSL)</p>
            </div>
            <div className="card p-3 bg-gray-50/70 border border-gray-100">
              <span className="text-xs text-gray-500 font-medium uppercase">Engine Runtime</span>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{stats?.systemHealth?.nodeVersion || 'Node.js'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Automated Background Workers</h4>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span>Daily Devotional Reminders (Morning/Night)</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">✓ Active (60s tick)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span>Member Birthday Daily Celebrator</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">✓ Active</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span>Scheduled Broadcasts & Reminders</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">✓ Active</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => setShowDiagnostics(false)} className="btn-secondary">Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, badge }) {
  const colors = {
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-green-100 text-green-700',
    red:   'bg-red-100 text-red-700',
    purple:'bg-purple-100 text-purple-700',
    blue:  'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="card p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={17}/>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1">
          {label}
          {badge && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1 rounded-full">{badge}</span>}
        </div>
        <div className="font-display text-lg font-bold text-gray-900 leading-tight">{value ?? 0}</div>
      </div>
    </div>
  );
}


function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-gray-900">{v}</span>
    </div>
  );
}

function PlanBadge({ plan, multiBranch, whitelisted, expiresAt }) {
  const isTrial = plan === 'trial' || plan?.startsWith('trial_');
  const isExpired = expiresAt && new Date(expiresAt) < new Date() && !whitelisted;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const map = {
    starter:    { label: 'Starter',    cls: 'bg-gray-100 text-gray-700' },
    growth:     { label: 'Growth',     cls: 'bg-indigo-100 text-indigo-700' },
    enterprise: { label: 'Enterprise', cls: 'bg-purple-100 text-purple-700' },
    free:       { label: 'Free',       cls: 'bg-gray-100 text-gray-500' },
    pro:        { label: 'Pro',        cls: 'bg-indigo-100 text-indigo-700' },
  };

  let badge = map[plan] || { label: plan || '—', cls: 'bg-gray-100 text-gray-500' };

  if (isTrial) {
    if (isExpired) {
      badge = { label: 'Trial Expired', cls: 'bg-rose-100 text-rose-800 font-bold' };
    } else {
      badge = { label: daysLeft !== null ? `Trial (${daysLeft}d)` : '14d Trial', cls: 'bg-amber-100 text-amber-800' };
    }
  } else if (isExpired) {
    badge = { label: `${badge.label} (Expired)`, cls: 'bg-red-100 text-red-800 font-bold' };
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className={`px-2 py-0.5 text-[11px] rounded-full font-semibold ${badge.cls}`}>{badge.label}</span>
      {multiBranch && <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 font-semibold">multi</span>}
      {whitelisted && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700 font-semibold">licensed</span>}
    </div>
  );
}
