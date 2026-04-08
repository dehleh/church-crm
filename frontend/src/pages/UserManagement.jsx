import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit2, KeyRound, Loader2, UserCheck, UserX } from 'lucide-react';
import { usersAPI, branchesAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  head_pastor: 'bg-red-100 text-red-700',
  pastor: 'bg-orange-100 text-orange-700',
  director: 'bg-purple-100 text-purple-700',
  hod: 'bg-brand-100 text-brand-700',
  member: 'bg-gray-100 text-gray-500',
};

const ROLE_DESC = {
  head_pastor: 'Full access to everything',
  pastor: 'Manage members, finance, events',
  director: 'Manage people & departments',
  hod: 'Record members, transactions, attendance',
  member: 'Read-only access',
};

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [tempPw, setTempPw] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([usersAPI.list(), branchesAPI.list()]);
      setUsers(usersRes.data.data);
      setBranches(branchesRes.data.data);
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
      setTempPw(res.data.tempPassword);
      toast.success('User invited!');
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
      toast.success(`New temp password: ${res.data.tempPassword}`, { duration: 8000 });
    } catch { toast.error('Failed to reset password'); }
  };

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.update(user.id, { isActive: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  const openEdit = (user) => {
    setSelected(user);
    setForm({ firstName: user.first_name, lastName: user.last_name, phone: user.phone, role: user.role, branchId: user.branch_id, isActive: user.is_active });
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        {Object.entries(ROLE_DESC).map(([role, desc]) => (
          <div key={role} className="card py-3 px-3">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[role]}`}>{role.replace('_', ' ')}</span>
            <p className="text-xs text-gray-400 mt-1.5 leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>User</th><th>Role</th><th>Branch</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
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
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-500'}`}>
                      {u.role?.replace('_', ' ')}
                    </span>
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
              {['pastor','director','hod','member'].map(r => (
                <option key={r} value={r} className="capitalize">{r.replace('_',' ')} — {ROLE_DESC[r]}</option>
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
              {['pastor','director','hod','member'].map(r => <option key={r} value={r} className="capitalize">{r.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId||''} onChange={set('branchId')}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Success Modal with temp password */}
      <Modal open={modal === 'success'} onClose={() => setModal(null)} title="User Invited Successfully 🎉">
        <div className="text-center py-2">
          <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-gray-700 mb-4">Share this temporary password securely with the new user:</p>
          <div className="bg-gray-100 rounded-xl p-4 font-mono text-xl font-bold text-gray-900 tracking-widest">{tempPw}</div>
          <p className="text-xs text-gray-400 mt-3">The user should change this password on their first login.</p>
        </div>
      </Modal>
    </div>
  );
}
