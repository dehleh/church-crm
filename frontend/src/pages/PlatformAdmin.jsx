import { useEffect, useState } from 'react';
import {
  Building2, Users, ShieldAlert, ShieldCheck, Trash2,
  Search, Loader2, BarChart3, Eye, RefreshCw, Plus, Copy, CheckCircle2, KeyRound, Settings as SettingsIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { platformAPI } from '../api/services';
import Modal from '../components/ui/Modal';

export default function PlatformAdmin() {
  const [stats, setStats] = useState(null);
  const [churches, setChurches] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
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
        platformAPI.listChurches({ search, status, page, limit: 20 }),
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

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [page, status]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-sm text-gray-500">Manage all onboarded churches</p>
        </div>
        <div className="flex items-center gap-2">
        <button onClick={loadAll} className="btn-outline gap-2">
          <RefreshCw size={16}/> Refresh
        </button>
        <button onClick={() => setCreateOpen(true)} className="btn-primary gap-2">
          <Plus size={16}/> New Church
        </button>
        </div>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={Building2} color="brand"  label="Total Churches" value={stats.churches.total}/>
          <StatCard icon={ShieldCheck} color="green" label="Active"          value={stats.churches.active}/>
          <StatCard icon={ShieldAlert} color="red"   label="Suspended"      value={stats.churches.suspended}/>
          <StatCard icon={BarChart3} color="purple"  label="New (30d)"      value={stats.churches.new_30d}/>
          <StatCard icon={Users} color="blue"        label="Total Users"    value={stats.users.total_users}/>
          <StatCard icon={Users} color="amber"       label="Active Users (30d)" value={stats.users.active_30d}/>
        </div>
      )}

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <form onSubmit={onSearch} className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search by name, slug, denomination…"
            className="input pl-9" />
        </form>
        <select value={status} onChange={(e)=>{setPage(1);setStatus(e.target.value);}} className="input max-w-[180px]">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-brand-600" size={28}/></div>
        ) : churches.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No churches found</div>
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
                  <th className="text-left px-4 py-3">Last Login</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {churches.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">/{c.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.denomination || '—'}</td>
                    <td className="px-4 py-3 text-right">{c.user_count}</td>
                    <td className="px-4 py-3 text-right">{c.member_count}</td>
                    <td className="px-4 py-3 text-right">{c.branch_count}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={c.subscription_plan} multiBranch={c.multi_branch_enabled} whitelisted={c.is_whitelisted} />
                    </td>
                    <td className="px-4 py-3">
                      {c.is_active
                        ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Active</span>
                        : <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Suspended</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={()=>showDetail(c)} disabled={busyId===c.id}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="View"><Eye size={14}/></button>
                        <button onClick={()=>openSettings(c)} disabled={busyId===c.id}
                          className="p-1.5 hover:bg-indigo-50 rounded text-indigo-700" title="Plan & access"><SettingsIcon size={14}/></button>
                        {c.is_active
                          ? <button onClick={()=>suspend(c)} disabled={busyId===c.id}
                              className="p-1.5 hover:bg-amber-50 rounded text-amber-700" title="Suspend"><ShieldAlert size={14}/></button>
                          : <button onClick={()=>activate(c)} disabled={busyId===c.id}
                              className="p-1.5 hover:bg-green-50 rounded text-green-700" title="Activate"><ShieldCheck size={14}/></button>}
                        <button onClick={()=>resetPassword(c)} disabled={busyId===c.id}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Reset admin password"><KeyRound size={14}/></button>
                        <button onClick={()=>setConfirmDelete(c)} disabled={busyId===c.id}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Delete"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <option value="starter">Starter — ₦25,000 (single branch)</option>
                <option value="growth">Growth — ₦60,000 (≤3 branches / ≤500 members)</option>
                <option value="enterprise">Enterprise — Contact admin (10+ branches / 5,000+ members)</option>
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
              <label className="label">Subscription expires</label>
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
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  const colors = {
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-green-100 text-green-700',
    red:   'bg-red-100 text-red-700',
    purple:'bg-purple-100 text-purple-700',
    blue:  'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon size={18}/>
      </div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-display text-xl font-bold text-gray-900">{value ?? 0}</div>
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

function PlanBadge({ plan, multiBranch, whitelisted }) {
  const map = {
    starter:    { label: 'Starter',    cls: 'bg-gray-100 text-gray-700' },
    growth:     { label: 'Growth',     cls: 'bg-indigo-100 text-indigo-700' },
    enterprise: { label: 'Enterprise', cls: 'bg-purple-100 text-purple-700' },
    free:       { label: 'Free',       cls: 'bg-gray-100 text-gray-500' },
    pro:        { label: 'Pro',        cls: 'bg-indigo-100 text-indigo-700' },
  };
  const p = map[plan] || { label: plan || '—', cls: 'bg-gray-100 text-gray-500' };
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className={`px-2 py-0.5 text-[11px] rounded-full font-semibold ${p.cls}`}>{p.label}</span>
      {multiBranch && <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700 font-semibold">multi</span>}
      {whitelisted && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700 font-semibold">licensed</span>}
    </div>
  );
}
