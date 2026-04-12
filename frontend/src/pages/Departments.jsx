import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Users, ChevronRight, Loader2, ArrowLeft, UserPlus, X, Mail, Phone, Calendar, Search, UserMinus, Crown } from 'lucide-react';
import { departmentsAPI, membersAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  ministry: 'bg-brand-50 text-brand-700', unit: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-gray-100 text-gray-600', media: 'bg-purple-50 text-purple-700',
  music: 'bg-amber-50 text-amber-700', welfare: 'bg-pink-50 text-pink-700',
};

const ROLE_BADGES = {
  leader: 'bg-amber-100 text-amber-700', assistant: 'bg-blue-50 text-blue-700',
  secretary: 'bg-emerald-50 text-emerald-700', member: 'bg-gray-100 text-gray-600',
};

const canManage = (role) => ['head_pastor', 'pastor', 'director', 'hod'].includes(role);

// ── Department Detail View ──────────────────────────────────
function DepartmentDetail({ dept, onBack, onMemberChange }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [addRole, setAddRole] = useState('member');

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.members(dept.id);
      setMembers(res.data.data);
    } catch { toast.error('Failed to load members'); }
    finally { setLoading(false); }
  }, [dept.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setSearchTerm('');
    setAddRole('member');
    try {
      const res = await membersAPI.list({ limit: 200 });
      setAllMembers(res.data.data);
    } catch { toast.error('Failed to load members list'); }
  };

  const handleAdd = async (memberId) => {
    setAddingId(memberId);
    try {
      await departmentsAPI.addMember(dept.id, { memberId, role: addRole });
      toast.success('Member added to department');
      fetchMembers();
      onMemberChange();
    } catch { toast.error('Failed to add member'); }
    finally { setAddingId(null); }
  };

  const handleRemove = async (memberId) => {
    setRemovingId(memberId);
    try {
      await departmentsAPI.removeMember(dept.id, memberId);
      toast.success('Member removed from department');
      setMembers(prev => prev.filter(m => m.id !== memberId));
      onMemberChange();
    } catch { toast.error('Failed to remove member'); }
    finally { setRemovingId(null); }
  };

  const existingIds = new Set(members.map(m => m.id));
  const filteredForAdd = allMembers.filter(m =>
    !existingIds.has(m.id) &&
    (`${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (m.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-brand-600 text-sm mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Departments
      </button>

      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
              {dept.category && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${CATEGORY_COLORS[dept.category] || 'bg-gray-100 text-gray-600'}`}>
                  {dept.category}
                </span>
              )}
            </div>
            {dept.description && <p className="text-gray-500 mb-3">{dept.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Users size={14} /> {members.length} members</span>
              {dept.meeting_schedule && <span className="flex items-center gap-1.5"><Calendar size={14} /> {dept.meeting_schedule}</span>}
              {dept.branch_name && <span className="flex items-center gap-1.5"><Building2 size={14} /> {dept.branch_name}</span>}
            </div>
            {dept.head_name && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Department Head:</span> {dept.head_name}
              </p>
            )}
          </div>
          {canManage(user?.role) && (
            <button onClick={openAddModal} className="btn-primary shrink-0">
              <UserPlus size={16} /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Department Members</h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
        ) : members.length === 0 ? (
          <div className="text-center py-10">
            <Users size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No members in this department yet</p>
            {canManage(user?.role) && (
              <button onClick={openAddModal} className="btn-primary inline-flex mt-3"><UserPlus size={15} /> Add First Member</button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3">
                  {m.profile_photo_url ? (
                    <img src={m.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-sm">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {m.email && <span className="flex items-center gap-1"><Mail size={11} /> {m.email}</span>}
                      {m.phone && <span className="flex items-center gap-1"><Phone size={11} /> {m.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_BADGES[m.dept_role] || ROLE_BADGES.member}`}>
                    {m.dept_role || 'member'}
                  </span>
                  {canManage(user?.role) && (
                    <button onClick={() => handleRemove(m.id)} disabled={removingId === m.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove from department">
                      {removingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Member to Department"
        footer={<button onClick={() => setShowAddModal(false)} className="btn-secondary">Close</button>}>
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search members by name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label className="label">Role in Department</label>
            <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="leader">Leader</option>
              <option value="assistant">Assistant</option>
              <option value="secretary">Secretary</option>
            </select>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {filteredForAdd.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">
                {searchTerm ? 'No matching members found' : 'All members are already in this department'}
              </p>
            ) : filteredForAdd.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-semibold text-xs">
                    {m.first_name?.[0]}{m.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-400">{m.email || m.phone || ''}</p>
                  </div>
                </div>
                <button onClick={() => handleAdd(m.id)} disabled={addingId === m.id}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                  {addingId === m.id ? <Loader2 size={14} className="animate-spin" /> : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main Departments Page ───────────────────────────────────
export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [allMembers, setAllMembers] = useState([]);

  const fetchMembers = async () => {
    try { const res = await membersAPI.list({ limit: 500 }); setAllMembers(res.data.data || []); } catch {}
  };

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.list();
      setDepartments(res.data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepts(); fetchMembers(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Department name is required');
    setSaving(true);
    try {
      await departmentsAPI.create(form);
      toast.success('Department created!');
      setModal(null); fetchDepts();
    } catch { toast.error('Failed to create department'); }
    finally { setSaving(false); }
  };

  // If a department is selected, show its detail view
  if (selectedDept) {
    return (
      <DepartmentDetail
        dept={selectedDept}
        onBack={() => { setSelectedDept(null); fetchDepts(); }}
        onMemberChange={fetchDepts}
      />
    );
  }

  const grouped = departments.reduce((acc, d) => {
    const cat = d.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Departments & Units</h1>
          <p className="text-gray-500 text-sm mt-1">{departments.length} departments across the church</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> New Department
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : departments.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No departments yet</p>
          <p className="text-gray-400 text-sm mb-4">Create departments like Choir, Ushering, Media, etc.</p>
          <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary inline-flex"><Plus size={15} /> New Department</button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, depts]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 capitalize">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {depts.map(dept => (
                <div key={dept.id} onClick={() => setSelectedDept(dept)}
                  className="card hover:shadow-card-hover transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{dept.name}</h3>
                      {dept.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${CATEGORY_COLORS[dept.category] || 'bg-gray-100 text-gray-600'}`}>
                          {dept.category}
                        </span>
                      )}
                    </div>
                    {dept.head_name ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full shrink-0">
                        <Crown size={12} /> {dept.head_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">No HOD</span>
                    )}
                  </div>
                  {dept.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{dept.description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <Users size={14} />
                      <span>{dept.member_count || 0} members</span>
                    </div>
                  </div>
                  {dept.branch_name && <p className="text-xs text-gray-400 mt-1">{dept.branch_name}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Create Department"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Department Name *</label><input className="input" placeholder="Choir, Ushering, Media Team…" value={form.name || ''} onChange={set('name')} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category || ''} onChange={set('category')}>
              <option value="">Select category</option>
              {['ministry','unit','admin','media','music','welfare'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Head of Department (HOD)</label>
            <select className="input" value={form.headMemberId || ''} onChange={set('headMemberId')}>
              <option value="">Select HOD</option>
              {allMembers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div><label className="label">Meeting Schedule</label><input className="input" placeholder="Every Sunday, 8am" value={form.meetingSchedule || ''} onChange={set('meetingSchedule')} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description || ''} onChange={set('description')} /></div>
        </div>
      </Modal>
    </div>
  );
}
