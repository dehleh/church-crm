import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit2, KeyRound, Loader2, UserCheck, UserX, Trash2, AlertTriangle, Building2 } from 'lucide-react';
import { usersAPI, branchesAPI, departmentsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getRoleTitle, getRoleBadge, ROLE_DETAILS } from '../utils/rbac';

const ASSIGNABLE_ROLES = [
  'admin',
  'pastor',
  'director',
  'finance',
  'hod',
  'branch_pastor',
  'branch_admin',
  'member',
];

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tempPw, setTempPw] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes, deptsRes] = await Promise.all([
        usersAPI.list(),
        branchesAPI.list(),
        departmentsAPI.list(),
      ]);
      setUsers(usersRes.data.data);
      setBranches(branchesRes.data.data);
      setDepartments(deptsRes.data.data || []);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleInvite = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.role) return toast.error('All fields required');
    setSaving(true);
    try {
      const res = await usersAPI.invite(form);
      setTempPw(res.data.tempPassword || null);
      toast.success(res.data.message || 'User invited!');
      setModal('success');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite user'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await usersAPI.update(selected.id, form);
      toast.success('User updated!');
      setModal(null); fetch();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleResetPw = async (id) => {
    if (!window.confirm('Reset this user\'s password?')) return;
    try {
      const res = await usersAPI.resetPassword(id);
      if (res.data.tempPassword) {
        toast.success(`New temp password: ${res.data.tempPassword}`, { duration: 8000 });
      } else {
        toast.success(res.data.message || 'Password reset. New credentials sent via email.');
      }
    } catch { toast.error('Failed to reset password'); }
  };

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.update(user.id, { isActive: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteUser = async (permanent = false) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await usersAPI.delete(deleteTarget.id, { permanent });
      toast.success(res.data.message || (permanent ? 'User permanently deleted' : 'User deactivated'));
      setDeleteTarget(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove user');
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (user) => {
    setSelected(user);
    setForm({
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      branchId: user.branch_id,
      departmentId: user.department_id || '',
      isActive: user.is_active,
    });
    setModal('edit');
  };

  const getInitials = (fn, ln) => `${fn?.[0]||''}${ln?.[0]||''}`.toUpperCase();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage staff access and roles</p>
        </div>
        <button onClick={() => { setForm({ role: 'hod' }); setModal('invite'); }} className="btn-primary">
          <Plus size={16} /> Invite User
        </button>
      </div>

      {/* Role guide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
        {ASSIGNABLE_ROLES.map((role) => (
          <div key={role} className="card py-3 px-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${getRoleBadge(role)}`}>
              {getRoleTitle(role)}
            </span>
            <p className="text-xs text-gray-400 mt-1.5 leading-snug">{ROLE_DETAILS[role]?.description}</p>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>User</th><th>Role</th><th>Jurisdiction / Unit</th><th>Branch</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                        {getInitials(u.first_name, u.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.first_name} {u.last_name} {u.id === me?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${getRoleBadge(u.role)}`}>
                      {getRoleTitle(u.role)}
                    </span>
                  </td>
                  <td>
                    {u.department_name ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Building2 size={11} /> {u.department_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Church-wide</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-500">{u.branch_name || 'All Branches'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">
                    {u.last_login_at ? format(new Date(u.last_login_at), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td>
                    {u.id !== me?.id && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors" title="Edit user"><Edit2 size={14} /></button>
                        <button onClick={() => handleResetPw(u.id)} className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title="Reset password"><KeyRound size={14} /></button>
                        <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title={u.is_active ? 'Deactivate' : 'Activate'}>
                          {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete or Deactivate User">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={modal === 'invite'} onClose={() => setModal(null)} title="Invite Team Member"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleInvite} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Send Invite'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name *</label><input className="input" value={form.firstName||''} onChange={set('firstName')} /></div>
            <div><label className="label">Last Name *</label><input className="input" value={form.lastName||''} onChange={set('lastName')} /></div>
          </div>
          <div><label className="label">Email *</label><input type="email" className="input" value={form.email||''} onChange={set('email')} /></div>
          <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone||''} onChange={set('phone')} /></div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role||'hod'} onChange={set('role')}>
              {ASSIGNABLE_ROLES.map(r => (
                <option key={r} value={r} className="capitalize">{getRoleTitle(r)} — {ROLE_DETAILS[r]?.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId||''} onChange={set('branchId')}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned Department / Jurisdiction</label>
            <select className="input" value={form.departmentId||''} onChange={set('departmentId')}>
              <option value="">Church-wide / All Units</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.category || 'Unit'})</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">For HODs and directors, this restricts their access strictly to their assigned department's members &amp; checklists.</p>
          </div>
          <p className="text-xs text-gray-400 bg-amber-50 text-amber-700 p-3 rounded-lg">A temporary password will be generated. Share it securely with the new user.</p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit User"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleUpdate} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Save Changes'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input className="input" value={form.firstName||''} onChange={set('firstName')} /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.lastName||''} onChange={set('lastName')} /></div>
          </div>
          <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone||''} onChange={set('phone')} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role||''} onChange={set('role')}>
              {ASSIGNABLE_ROLES.map(r => (
                <option key={r} value={r} className="capitalize">{getRoleTitle(r)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId||''} onChange={set('branchId')}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assigned Department / Jurisdiction</label>
            <select className="input" value={form.departmentId||''} onChange={set('departmentId')}>
              <option value="">Church-wide / All Units</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.category || 'Unit'})</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">For HODs and directors, scopes access strictly to what pertains to their jurisdiction.</p>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal open={modal === 'success'} onClose={() => setModal(null)} title="User Invited Successfully 🎉">
        <div className="text-center py-2">
          <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
          {tempPw ? (
            <>
              <p className="text-gray-700 mb-4">Share this temporary password securely with the new user:</p>
              <div className="bg-gray-100 rounded-xl p-4 font-mono text-xl font-bold text-gray-900 tracking-widest">{tempPw}</div>
            </>
          ) : (
            <p className="text-gray-700 mb-4">Temporary login credentials have been generated and emailed directly to the invited user.</p>
          )}
          <p className="text-xs text-gray-400 mt-3">The user will be required to change their temporary password on first login.</p>
        </div>
      </Modal>

      {/* Delete / Deactivate User Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove Staff / System User"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50/70 border border-red-200 p-4 rounded-xl text-red-900 text-sm">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-950">
                  Are you sure you want to remove {deleteTarget.first_name} {deleteTarget.last_name}?
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Email: <span className="font-mono">{deleteTarget.email}</span> • Role: <span className="capitalize font-medium">{getRoleTitle(deleteTarget.role)}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Choose whether to <strong>deactivate</strong> this account (blocks login while preserving financial & audit history) or <strong>permanently delete</strong> the user record completely.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              {deleteTarget.is_active && (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(false)}
                  disabled={deleting}
                  className="btn-secondary text-amber-700 border-amber-200 hover:bg-amber-50 text-xs flex items-center justify-center gap-1.5"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
                  <span>Deactivate (Soft Delete)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteUser(true)}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white text-xs flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
