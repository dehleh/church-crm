import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase, Users,
  Calendar, Heart, Edit2, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { membersAPI, departmentsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TABS = ['Overview', 'Departments', 'Attendance', 'Giving'];

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function MemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [depts, setDepts] = useState([]);
  const [allDepts, setAllDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editModal, setEditModal] = useState(false);
  const [addDeptModal, setAddDeptModal] = useState(false);
  const [form, setForm] = useState({});
  const [deptForm, setDeptForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchMember = async () => {
    try {
      const res = await membersAPI.get(id);
      setMember(res.data.data);
      setDepts(res.data.data.departments || []);
    } catch { toast.error('Member not found'); navigate('/members'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMember(); }, [id]);
  useEffect(() => { departmentsAPI.list().then(r => setAllDepts(r.data.data)).catch(() => {}); }, []);

  const getInitials = (fn, ln) => `${fn?.[0]||''}${ln?.[0]||''}`.toUpperCase();

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await membersAPI.update(id, form);
      toast.success('Member updated!');
      setEditModal(false);
      fetchMember();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleAddDept = async () => {
    if (!deptForm.departmentId) return toast.error('Select a department');
    setSaving(true);
    try {
      await departmentsAPI.addMember(deptForm.departmentId, { memberId: id, role: deptForm.role || 'member' });
      toast.success('Added to department!');
      setAddDeptModal(false);
      fetchMember();
    } catch { toast.error('Failed to add'); }
    finally { setSaving(false); }
  };

  const handleRemoveDept = async (deptId) => {
    try {
      await departmentsAPI.removeMember(deptId, id);
      toast.success('Removed from department');
      fetchMember();
    } catch { toast.error('Failed to remove'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;
  if (!member) return null;

  const age = member.date_of_birth ? Math.floor((new Date() - new Date(member.date_of_birth)) / (365.25 * 24 * 3600 * 1000)) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-5 transition-colors">
        <ArrowLeft size={16} /> Back to Members
      </button>

      {/* Header card */}
      <div className="card mb-5">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold flex-shrink-0">
            {getInitials(member.first_name, member.last_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display text-gray-900">
                  {member.first_name} {member.middle_name || ''} {member.last_name}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5 font-mono">{member.member_number}</p>
              </div>
              <button onClick={() => { setForm({ firstName: member.first_name, lastName: member.last_name, middleName: member.middle_name, email: member.email, phone: member.phone, gender: member.gender, occupation: member.occupation, address: member.address, notes: member.notes }); setEditModal(true); }} className="btn-secondary btn-sm">
                <Edit2 size={14} /> Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className={`badge capitalize ${member.membership_status === 'active' ? 'badge-green' : member.membership_status === 'pending_review' ? 'badge-yellow' : 'badge-gray'}`}>{member.membership_status}</span>
              <span className="badge badge-blue capitalize">{member.membership_class} member</span>
              {member.branch_name && <span className="badge badge-gray">{member.branch_name}</span>}
              {age && <span className="badge badge-gray">{age} years old</span>}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              {member.email && <span className="flex items-center gap-1.5"><Mail size={13} />{member.email}</span>}
              {member.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{member.phone}</span>}
              {member.join_date && <span className="flex items-center gap-1.5"><Calendar size={13} />Member since {format(new Date(member.join_date), 'MMMM yyyy')}</span>}
            </div>
          </div>
        </div>

        {/* Spiritual badges */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${member.water_baptized ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            {member.water_baptized ? <CheckCircle size={12} /> : <XCircle size={12} />} Water Baptized
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${member.holy_ghost_baptized ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
            {member.holy_ghost_baptized ? <CheckCircle size={12} /> : <XCircle size={12} />} Holy Ghost Baptized
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-5">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="section-title mb-3">Personal Information</h3>
            <InfoRow icon={User} label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null} />
            <InfoRow icon={Calendar} label="Date of Birth" value={member.date_of_birth ? format(new Date(member.date_of_birth), 'MMMM d, yyyy') : null} />
            <InfoRow icon={Heart} label="Marital Status" value={member.marital_status} />
            <InfoRow icon={Briefcase} label="Occupation" value={member.occupation} />
            <InfoRow icon={Briefcase} label="Employer" value={member.employer} />
            <InfoRow icon={MapPin} label="Address" value={[member.address, member.city, member.state].filter(Boolean).join(', ')} />
          </div>
          <div className="card">
            <h3 className="section-title mb-3">Next of Kin</h3>
            <InfoRow icon={User} label="Name" value={member.next_of_kin_name} />
            <InfoRow icon={Phone} label="Phone" value={member.next_of_kin_phone} />
            <InfoRow icon={Heart} label="Relationship" value={member.next_of_kin_relationship} />
            {member.notes && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-gray-700">{member.notes}</p>
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="section-title mb-3">Spiritual Timeline</h3>
            <InfoRow icon={Calendar} label="Salvation Date" value={member.salvation_date ? format(new Date(member.salvation_date), 'MMMM d, yyyy') : null} />
            <InfoRow icon={Calendar} label="Baptism Date" value={member.baptism_date ? format(new Date(member.baptism_date), 'MMMM d, yyyy') : null} />
            <InfoRow icon={Calendar} label="Join Date" value={member.join_date ? format(new Date(member.join_date), 'MMMM d, yyyy') : null} />
          </div>
        </div>
      )}

      {activeTab === 'Departments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Department Memberships ({depts.length})</h3>
            <button onClick={() => { setDeptForm({}); setAddDeptModal(true); }} className="btn-primary btn-sm"><Users size={14} /> Add to Department</button>
          </div>
          {depts.length === 0 ? (
            <div className="card text-center py-10">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Not in any department yet</p>
              <button onClick={() => { setDeptForm({}); setAddDeptModal(true); }} className="btn-primary btn-sm mt-3 inline-flex"><Users size={14} /> Add</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {depts.map(dept => (
                <div key={dept.id} className="card flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{dept.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{dept.role}</p>
                  </div>
                  <button onClick={() => handleRemoveDept(dept.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="card text-center py-16">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Attendance history coming soon</p>
          <p className="text-gray-400 text-sm">Record attendance at events to see history here</p>
        </div>
      )}

      {activeTab === 'Giving' && (
        <div className="card text-center py-16">
          <Heart size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Giving history</p>
          <p className="text-gray-400 text-sm">Link transactions to this member to see giving history</p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Member" size="md"
        footer={<><button onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button><button onClick={handleEditSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}</button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name</label><input className="input" value={form.firstName||''} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} /></div>
            <div><label className="label">Last Name</label><input className="input" value={form.lastName||''} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input type="email" className="input" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
          </div>
          <div><label className="label">Occupation</label><input className="input" value={form.occupation||''} onChange={e=>setForm(f=>({...f,occupation:e.target.value}))} /></div>
          <div><label className="label">Address</label><input className="input" value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
          <div><label className="label">Notes</label><textarea className="input min-h-[70px]" value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
        </div>
      </Modal>

      {/* Add to Dept Modal */}
      <Modal open={addDeptModal} onClose={() => setAddDeptModal(false)} title="Add to Department"
        footer={<><button onClick={() => setAddDeptModal(false)} className="btn-secondary">Cancel</button><button onClick={handleAddDept} disabled={saving} className="btn-primary">{saving ? <Loader2 size={14} className="animate-spin" /> : 'Add'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Department</label>
            <select className="input" value={deptForm.departmentId||''} onChange={e=>setDeptForm(f=>({...f,departmentId:e.target.value}))}>
              <option value="">Select department</option>
              {allDepts.filter(d => !depts.find(md => md.id === d.id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={deptForm.role||'member'} onChange={e=>setDeptForm(f=>({...f,role:e.target.value}))}>
              <option value="member">Member</option>
              <option value="leader">Leader</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
