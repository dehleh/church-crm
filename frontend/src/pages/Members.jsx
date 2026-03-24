import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter, MoreHorizontal, Mail, Phone, Edit2, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { membersAPI, branchesAPI, departmentsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_BADGE = {
  active: 'badge-green', inactive: 'badge-gray',
  transferred: 'badge-blue', deceased: 'badge-red',
};

function MemberForm({ form, setForm, branches }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">First Name *</label><input className="input" required value={form.firstName || ''} onChange={set('firstName')} /></div>
        <div><label className="label">Last Name *</label><input className="input" required value={form.lastName || ''} onChange={set('lastName')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={set('email')} /></div>
        <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone || ''} onChange={set('phone')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender || ''} onChange={set('gender')}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div><label className="label">Date of Birth</label><input type="date" className="input" value={form.dateOfBirth || ''} onChange={set('dateOfBirth')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Marital Status</label>
          <select className="input" value={form.maritalStatus || ''} onChange={set('maritalStatus')}>
            <option value="">Select</option>
            {['single','married','divorced','widowed'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Membership Class</label>
          <select className="input" value={form.membershipClass || 'full'} onChange={set('membershipClass')}>
            <option value="full">Full Member</option>
            <option value="associate">Associate</option>
            <option value="youth">Youth</option>
            <option value="child">Child</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Branch</label>
          <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="label">Join Date</label><input type="date" className="input" value={form.joinDate || ''} onChange={set('joinDate')} /></div>
      </div>
      <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Occupation</label><input className="input" value={form.occupation || ''} onChange={set('occupation')} /></div>
        <div><label className="label">Employer</label><input className="input" value={form.employer || ''} onChange={set('employer')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label flex items-center gap-2">
            <input type="checkbox" checked={form.waterBaptized || false} onChange={e => setForm(f => ({ ...f, waterBaptized: e.target.checked }))} />
            Water Baptized
          </label>
        </div>
        <div>
          <label className="label flex items-center gap-2">
            <input type="checkbox" checked={form.holyGhostBaptized || false} onChange={e => setForm(f => ({ ...f, holyGhostBaptized: e.target.checked }))} />
            Holy Ghost Baptized
          </label>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-[70px]" value={form.notes || ''} onChange={set('notes')} />
      </div>
    </div>
  );
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
      const [membersRes, statsRes] = await Promise.all([membersAPI.list(params), membersAPI.stats()]);
      setMembers(membersRes.data.data);
      setPagination(membersRes.data.pagination);
      setStats(statsRes.data.data);
    } catch (e) { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchMembers(1); }, [fetchMembers]);
  useEffect(() => { branchesAPI.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const navigate = useNavigate();
  const openAdd = () => { setForm({}); setModal('add'); };
  const openEdit = (m) => { setForm({ ...m, firstName: m.first_name, lastName: m.last_name, dateOfBirth: m.date_of_birth, maritalStatus: m.marital_status, membershipClass: m.membership_class, joinDate: m.join_date, waterBaptized: m.water_baptized, holyGhostBaptized: m.holy_ghost_baptized, branchId: m.branch_id }); setSelectedMember(m); setModal('edit'); };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) return toast.error('First and last name required');
    setSaving(true);
    try {
      if (modal === 'add') {
        await membersAPI.create(form);
        toast.success('Member added!');
      } else {
        await membersAPI.update(selectedMember.id, form);
        toast.success('Member updated!');
      }
      setModal(null);
      fetchMembers(pagination.page);
    } catch (e) { toast.error('Failed to save member'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this member?')) return;
    try {
      await membersAPI.delete(id);
      toast.success('Member deactivated');
      fetchMembers(pagination.page);
    } catch { toast.error('Failed to deactivate member'); }
  };

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="text-gray-500 text-sm mt-1">{(stats.active || 0).toLocaleString()} active members</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active', value: stats.active, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'New This Month', value: stats.new_this_month, color: 'text-brand-600 bg-brand-50' },
          { label: 'Male', value: stats.male, color: 'text-blue-600 bg-blue-50' },
          { label: 'Female', value: stats.female, color: 'text-pink-600 bg-pink-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display rounded-lg ${color}`}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="table-wrapper">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search by name, email, phone…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No members found</p>
            <p className="text-gray-400 text-sm">Add your first church member to get started</p>
            <button onClick={openAdd} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Add Member</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Contact</th>
                <th>Class</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                        {getInitials(m.first_name, m.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                        <p className="text-xs text-gray-400">{m.branch_name || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs font-mono text-gray-500">{m.member_number}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      {m.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} />{m.email}</span>}
                      {m.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} />{m.phone}</span>}
                    </div>
                  </td>
                  <td><span className="capitalize text-sm">{m.membership_class || '—'}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[m.membership_status] || 'badge-gray'} capitalize`}>{m.membership_status}</span></td>
                  <td className="text-sm text-gray-500">{m.join_date ? format(new Date(m.join_date), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/members/${m.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="View profile"><ExternalLink size={14} /></button>
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {members.length} of {pagination.total.toLocaleString()} members</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchMembers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchMembers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Add New Member' : 'Edit Member'} size="lg"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'add' ? 'Add Member' : 'Save Changes'}
          </button>
        </>}>
        <MemberForm form={form} setForm={setForm} branches={branches} />
      </Modal>
    </div>
  );
}
