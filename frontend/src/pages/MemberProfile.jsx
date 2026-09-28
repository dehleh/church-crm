import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase, Users,
  Calendar, Heart, Edit2, CheckCircle, XCircle, Loader2,
  Cake, Baby, Home, MessageCircle, Send, Award, Shield, UserCheck, Sparkles,
  Landmark, Copy, Check, RefreshCw
} from 'lucide-react';
import { membersAPI, departmentsAPI, fellowshipAPI } from '../api/services';
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
  const [allCenters, setAllCenters] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editModal, setEditModal] = useState(false);
  const [addDeptModal, setAddDeptModal] = useState(false);
  const [form, setForm] = useState({});
  const [deptForm, setDeptForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [sendingWish, setSendingWish] = useState(false);

  // Dedicated Virtual Bank Account State
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingVA, setLoadingVA] = useState(false);
  const [generatingVA, setGeneratingVA] = useState(false);
  const [copiedVA, setCopiedVA] = useState(false);

  const fetchVirtualAccount = useCallback(async () => {
    setLoadingVA(true);
    try {
      const res = await membersAPI.getVirtualAccount(id);
      setVirtualAccount(res.data.data);
    } catch {
      // not generated yet
    } finally {
      setLoadingVA(false);
    }
  }, [id]);

  const handleGenerateVirtualAccount = async () => {
    setGeneratingVA(true);
    try {
      const res = await membersAPI.generateVirtualAccount(id);
      setVirtualAccount(res.data.data);
      toast.success('Dedicated Virtual Bank Account assigned!');
    } catch {
      toast.error('Failed to assign virtual bank account');
    } finally {
      setGeneratingVA(false);
    }
  };

  const copyAccountNumber = (accNo) => {
    navigator.clipboard.writeText(accNo);
    setCopiedVA(true);
    toast.success('Account number copied to clipboard');
    setTimeout(() => setCopiedVA(false), 2500);
  };

  const fetchMember = async () => {
    try {
      const res = await membersAPI.get(id);
      setMember(res.data.data);
      setDepts(res.data.data.departments || []);
    } catch {
      toast.error('Member not found');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMember(); fetchVirtualAccount(); }, [id, fetchVirtualAccount]);
  useEffect(() => {
    departmentsAPI.list().then(r => setAllDepts(r.data.data || [])).catch(() => {});
    fellowshipAPI.centers().then(r => setAllCenters(r.data.data || [])).catch(() => {});
    membersAPI.list({ designation: 'pastor', limit: 100 }).then(r => setPastors(r.data.data || [])).catch(() => {});
  }, []);


  const getInitials = (fn, ln) => `${fn?.[0]||''}${ln?.[0]||''}`.toUpperCase();

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      );
      await membersAPI.update(id, payload);
      toast.success('Member updated!');
      setEditModal(false);
      fetchMember();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleSendWish = async () => {
    setSendingWish(true);
    try {
      await membersAPI.sendBirthdayWish(id, { channel: 'whatsapp' });
      toast.success(`Birthday greeting dispatched to ${member.first_name}! 🎂`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to dispatch birthday wish');
    } finally {
      setSendingWish(false);
    }
  };

  const handleAddDept = async () => {
    if (!deptForm.departmentId) return toast.error('Select a department');
    setSaving(true);
    try {
      await departmentsAPI.addMember(deptForm.departmentId, { memberId: id, role: deptForm.role || 'member' });
      toast.success('Added to department!');
      setAddDeptModal(false);
      fetchMember();
    } catch {
      toast.error('Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDept = async (deptId) => {
    try {
      await departmentsAPI.removeMember(deptId, id);
      toast.success('Removed from department');
      fetchMember();
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;
  if (!member) return null;

  const age = member.date_of_birth ? Math.floor((new Date() - new Date(member.date_of_birth)) / (365.25 * 24 * 3600 * 1000)) : null;
  const isBdayToday = member.date_of_birth && (
    new Date(member.date_of_birth).getMonth() === new Date().getMonth() &&
    new Date(member.date_of_birth).getDate() === new Date().getDate()
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-5 transition-colors">
        <ArrowLeft size={16} /> Back to Members
      </button>

      {/* Header card */}
      <div className="card mb-5">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold flex-shrink-0 relative">
            {getInitials(member.first_name, member.last_name)}
            {isBdayToday && (
              <span className="absolute -top-1 -right-1 text-lg" title="Birthday Today!">🎂</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2">
                  {member.first_name} {member.middle_name || ''} {member.last_name}
                  {isBdayToday && (
                    <span className="badge badge-pink font-bold text-xs py-0.5 px-2 animate-bounce">
                      Birthday Today! 🎂
                    </span>
                  )}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5 font-mono">{member.member_number}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSendWish}
                  disabled={sendingWish}
                  className="btn-secondary btn-sm flex items-center gap-1.5 text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100"
                  title="Send automated or manual birthday greeting"
                >
                  {sendingWish ? <Loader2 size={13} className="animate-spin" /> : <Cake size={13} className="text-pink-600" />}
                  <span>Birthday Wish</span>
                </button>

                {member.phone && (
                  <a
                    href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${member.first_name}, warm greetings from ${member.branch_name || 'Church'}! May God bless you abundantly today! ✨`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    title="Open WhatsApp chat"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setForm({
                      firstName: member.first_name,
                      lastName: member.last_name,
                      middleName: member.middle_name,
                      email: member.email,
                      phone: member.phone,
                      gender: member.gender,
                      dateOfBirth: member.date_of_birth ? String(member.date_of_birth).slice(0, 10) : '',
                      maritalStatus: member.marital_status,
                      weddingAnniversaryDate: member.wedding_anniversary_date ? String(member.wedding_anniversary_date).slice(0, 10) : '',
                      designation: member.designation || 'member',
                      leadershipTitle: member.leadership_title || '',
                      assignedPastorId: member.assigned_pastor_id || '',
                      hasChildren: member.has_children || (member.children_count > 0) || (member.teenagers_count > 0),
                      childrenCount: member.children_count ?? 0,
                      teenagersCount: member.teenagers_count ?? 0,
                      childrenDetails: member.children_details || '',
                      isWorker: member.is_worker || false,
                      workerUnit: member.worker_unit || '',
                      workerRole: member.worker_role || 'worker',
                      fellowshipCellId: member.fellowship_cell_id || '',
                      occupation: member.occupation,
                      employer: member.employer,
                      address: member.address,
                      notes: member.notes,
                    });
                    setEditModal(true);
                  }}
                  className="btn-secondary btn-sm"
                >
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-3">
              <span className={`badge capitalize ${member.membership_status === 'active' ? 'badge-green' : member.membership_status === 'pending_review' ? 'badge-yellow' : 'badge-gray'}`}>
                {member.membership_status}
              </span>
              <span className="badge badge-blue capitalize">{member.membership_class} member</span>

              {member.designation && member.designation !== 'member' && (
                <span className={`badge flex items-center gap-1.5 uppercase font-bold text-[11px] ${
                  member.designation === 'pastor' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  member.designation === 'director' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  member.designation === 'hod' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                  member.designation === 'minister' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {member.designation === 'pastor' && <Award size={12} />}
                  {member.designation === 'director' && <Shield size={12} />}
                  {member.designation === 'hod' && <UserCheck size={12} />}
                  {member.designation === 'minister' && <Sparkles size={12} />}
                  {member.designation === 'worker' && <Briefcase size={12} />}
                  <span>{member.leadership_title ? `${member.designation}: ${member.leadership_title}` : member.designation}</span>
                </span>
              )}

              {member.assigned_pastor_name && (
                <span className="badge bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                  <Award size={11} /> Covering Pastor: {member.assigned_pastor_name}
                </span>
              )}

              {member.is_worker && (
                <span className="badge badge-emerald flex items-center gap-1">
                  <Briefcase size={11} /> Worker: {member.worker_unit || 'Active Worker'}
                </span>
              )}

              {member.fellowship_cell_name && (
                <span className="badge badge-indigo flex items-center gap-1">
                  <Home size={11} /> Cell: {member.fellowship_cell_name}
                </span>
              )}

              {(member.children_count > 0 || member.teenagers_count > 0) && (
                <span className="badge badge-sky flex items-center gap-1">
                  <Baby size={11} />
                  {[
                    member.children_count > 0 ? `${member.children_count} kids` : null,
                    member.teenagers_count > 0 ? `${member.teenagers_count} teens` : null,
                  ].filter(Boolean).join(', ')}
                </span>
              )}

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
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Personal Information */}
          <div className="card">
            <h3 className="section-title mb-3">Personal & Family Information</h3>
            <InfoRow icon={User} label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : null} />
            <InfoRow icon={Calendar} label="Date of Birth" value={member.date_of_birth ? format(new Date(member.date_of_birth), 'MMMM d, yyyy') : null} />
            <InfoRow icon={Heart} label="Marital Status" value={member.marital_status} />
            <InfoRow icon={Briefcase} label="Occupation" value={member.occupation} />
            <InfoRow icon={Briefcase} label="Employer" value={member.employer} />
            <InfoRow icon={MapPin} label="Address" value={[member.address, member.city, member.state].filter(Boolean).join(', ')} />
          </div>

          {/* Children & Demographics Card */}
          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Baby size={18} className="text-sky-600" /> Children & Teenagers Accounting
            </h3>
            <InfoRow
              icon={Baby}
              label="Children (0–12 years)"
              value={member.children_count ? `${member.children_count} children` : '0 children'}
            />
            <InfoRow
              icon={Users}
              label="Teenagers (13–19 years)"
              value={member.teenagers_count ? `${member.teenagers_count} teenagers` : '0 teenagers'}
            />
            {member.children_details && (
              <div className="py-2.5 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Children Names & Details</p>
                <p className="text-sm text-gray-800 mt-1">{member.children_details}</p>
              </div>
            )}
            {!member.children_count && !member.teenagers_count && !member.children_details && (
              <p className="text-xs text-gray-400 py-3 italic">No children or teenagers recorded for this member.</p>
            )}
          </div>

          {/* Fellowship Cell / House Cluster Card */}
          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Home size={18} className="text-indigo-600" /> Fellowship Cell / Cluster
            </h3>
            {member.fellowship_cell_name ? (
              <div className="space-y-2">
                <InfoRow icon={Home} label="Cell / Center Name" value={member.fellowship_cell_name} />
                <InfoRow
                  icon={Calendar}
                  label="Meeting Day & Time"
                  value={member.fellowship_meeting_day ? `${member.fellowship_meeting_day} at ${member.fellowship_meeting_time || 'Scheduled Time'}` : null}
                />
                <InfoRow icon={MapPin} label="Host Center Address" value={member.fellowship_cell_address} />
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">Not assigned to a fellowship cell yet.</p>
                <p className="text-xs text-gray-400 mt-0.5">Edit this member to assign or run automatic location matching.</p>
              </div>
            )}
          </div>

          {/* Church Worker & Unit Card */}
          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Briefcase size={18} className="text-emerald-600" /> Ministry Unit & Service
            </h3>
            {member.is_worker ? (
              <div className="space-y-2">
                <InfoRow icon={Briefcase} label="Worker Status" value="Active Church Worker" />
                <InfoRow icon={Users} label="Unit / Department" value={member.worker_unit} />
                <InfoRow icon={User} label="Role in Unit" value={member.worker_role ? member.worker_role.replace('_', ' ') : 'Worker'} />
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">Not currently registered as a church worker.</p>
                <p className="text-xs text-gray-400 mt-0.5">Can be assigned to service units in the Departments tab.</p>
              </div>
            )}
          </div>

          {/* Church Office & Leadership Designation Card */}
          <div className="card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <Award size={18} className="text-purple-600" /> Church Office & Designation
            </h3>
            <div className="space-y-2">
              <InfoRow
                icon={Award}
                label="Ecclesiastical Tier"
                value={
                  member.designation && member.designation !== 'member'
                    ? member.designation.toUpperCase()
                    : 'General Church Member'
                }
              />
              <InfoRow icon={Briefcase} label="Office / Portfolio Title" value={member.leadership_title} />
              <InfoRow icon={User} label="Covering Pastor" value={member.assigned_pastor_name} />
              <InfoRow icon={Users} label="Serving Unit" value={member.worker_unit} />
            </div>
          </div>

          {/* Next of Kin */}
          <div className="card">
            <h3 className="section-title mb-3">Next of Kin</h3>
            <InfoRow icon={User} label="Name" value={member.next_of_kin_name} />
            <InfoRow icon={Phone} label="Phone" value={member.next_of_kin_phone} />
            <InfoRow icon={Heart} label="Relationship" value={member.next_of_kin_relationship} />
            {member.notes && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Pastoral Notes</p>
                <p className="text-sm text-gray-700">{member.notes}</p>
              </div>
            )}
          </div>

          {/* Spiritual Timeline */}
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
        <div className="space-y-5">
          {/* Dedicated Virtual Bank Account Card */}
          <div className="p-6 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                  <Landmark size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg font-display tracking-tight">Dedicated Giving Bank Account</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                      Auto-Reconciled
                    </span>
                  </div>
                  <p className="text-emerald-200/80 text-xs mt-0.5">
                    Personal NUBAN account for direct bank transfer tithes & kingdom investments
                  </p>
                </div>
              </div>

              {virtualAccount ? (
                <button
                  type="button"
                  onClick={handleGenerateVirtualAccount}
                  disabled={generatingVA}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Refresh / Re-verify Virtual Account"
                >
                  {generatingVA ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  <span>Re-sync Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateVirtualAccount}
                  disabled={generatingVA}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white text-emerald-900 hover:bg-emerald-50 shadow-md transition-all"
                >
                  {generatingVA ? <Loader2 size={15} className="animate-spin" /> : <Landmark size={15} />}
                  <span>Generate Virtual Account</span>
                </button>
              )}
            </div>

            {virtualAccount ? (
              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <span className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold block">Bank Name</span>
                  <span className="text-base font-bold text-white mt-1 block">{virtualAccount.bank_name || 'Wema Bank'}</span>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold block">NUBAN Account Number</span>
                    <span className="text-xl font-mono font-bold text-white mt-1 tracking-wider block">
                      {virtualAccount.account_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyAccountNumber(virtualAccount.account_number)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 transition"
                    title="Copy Account Number"
                  >
                    {copiedVA ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <span className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold block">Account Beneficiary</span>
                  <span className="text-sm font-semibold text-white mt-1 block truncate">
                    {virtualAccount.account_name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-white/10 text-xs text-emerald-200/90 relative z-10">
                This member does not have a dedicated NUBAN bank account yet. Click "Generate Virtual Account" to provision a personal Wema Bank NUBAN for direct mobile transfers.
              </div>
            )}

            {virtualAccount && (
              <div className="mt-4 flex items-center justify-between text-xs text-emerald-200/80 pt-3 border-t border-white/10">
                <span>Total Received via Direct Bank Transfer: <strong>₦{Number(virtualAccount.total_given || 0).toLocaleString()}</strong></span>
                <span className="text-[11px]">Instant settlement • Automated receipt SMS/WhatsApp</span>
              </div>
            )}
          </div>

          {/* Giving History Card */}
          <div className="card text-center py-12">
            <Heart size={36} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-gray-700 font-semibold text-base">Direct Giving History</p>
            <p className="text-gray-500 text-xs max-w-md mx-auto mt-1">
              All transfers made to the dedicated bank account above are automatically logged and credited to this member's profile.
            </p>
          </div>
        </div>
      )}


      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Member Profile"
        size="lg"
        footer={<>
          <button onClick={() => setEditModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEditSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
          </button>
        </>}
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName || ''} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName || ''} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" max={new Date().toISOString().split('T')[0]} className="input" value={form.dateOfBirth || ''} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender || ''} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Marital Status</label>
              <select className="input" value={form.maritalStatus || ''} onChange={e => setForm(f => ({ ...f, maritalStatus: e.target.value }))}>
                <option value="">Select</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>
            <div>
              <label className="label">Fellowship Cell / House Cluster</label>
              <select className="input" value={form.fellowshipCellId || ''} onChange={e => setForm(f => ({ ...f, fellowshipCellId: e.target.value }))}>
                <option value="">(No Cell Assigned)</option>
                {allCenters.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.meeting_day ? `(${c.meeting_day})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Designation & Leadership Role */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 space-y-3">
            <label className="text-sm font-semibold text-purple-950 flex items-center gap-2">
              <Award size={16} className="text-purple-600" />
              Ecclesiastical Designation & Office
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Designation / Rank</label>
                <select
                  className="input bg-white text-sm"
                  value={form.designation || 'member'}
                  onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                >
                  <option value="member">General Member</option>
                  <option value="pastor">Pastor</option>
                  <option value="director">Director</option>
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="minister">Minister / Elder</option>
                  <option value="worker">Church Worker</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Office / Portfolio Title</label>
                <input
                  className="input bg-white text-sm"
                  placeholder="e.g. Resident Pastor, Director of Music, HOD Ushering"
                  value={form.leadershipTitle || ''}
                  onChange={e => setForm(f => ({ ...f, leadershipTitle: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Assigned / Covering Pastor</label>
              <select
                className="input bg-white text-sm"
                value={form.assignedPastorId || ''}
                onChange={e => setForm(f => ({ ...f, assignedPastorId: e.target.value }))}
              >
                <option value="">(None assigned / Self)</option>
                {pastors.filter(p => p.id !== id).map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} {p.leadership_title ? `(${p.leadership_title})` : '(Pastor)'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Children & Demographics */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-sky-950 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                  checked={form.hasChildren || false}
                  onChange={e => setForm(f => ({ ...f, hasChildren: e.target.checked }))}
                />
                <Baby size={16} className="text-sky-600" />
                Has Children or Teenagers
              </label>
            </div>
            {form.hasChildren && (
              <div className="space-y-3 pt-2 border-t border-sky-200/60">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Children (0–12 years)</label>
                    <input
                      type="number"
                      min="0"
                      className="input bg-white text-sm"
                      value={form.childrenCount ?? 0}
                      onChange={e => setForm(f => ({ ...f, childrenCount: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Teenagers (13–19 years)</label>
                    <input
                      type="number"
                      min="0"
                      className="input bg-white text-sm"
                      value={form.teenagersCount ?? 0}
                      onChange={e => setForm(f => ({ ...f, teenagersCount: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Children / Teenagers Names & Details</label>
                  <input
                    className="input bg-white text-sm"
                    value={form.childrenDetails || ''}
                    onChange={e => setForm(f => ({ ...f, childrenDetails: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Worker Status */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-emerald-950 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                  checked={form.isWorker || false}
                  onChange={e => setForm(f => ({ ...f, isWorker: e.target.checked }))}
                />
                <Briefcase size={16} className="text-emerald-600" />
                Active Church Worker
              </label>
            </div>
            {form.isWorker && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                <div>
                  <label className="label text-xs">Department / Unit</label>
                  <select className="input bg-white text-sm" value={form.workerUnit || ''} onChange={e => setForm(f => ({ ...f, workerUnit: e.target.value }))}>
                    <option value="">Select Unit</option>
                    {allDepts.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Role in Unit</label>
                  <select className="input bg-white text-sm" value={form.workerRole || 'worker'} onChange={e => setForm(f => ({ ...f, workerRole: e.target.value }))}>
                    <option value="worker">Worker</option>
                    <option value="assistant_leader">Assistant Leader</option>
                    <option value="leader">Unit Leader / HOD</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Residential Address</label>
            <input className="input" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>

          <div>
            <label className="label">Pastoral Notes</label>
            <textarea className="input min-h-[70px]" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Add to Dept Modal */}
      <Modal
        open={addDeptModal}
        onClose={() => setAddDeptModal(false)}
        title="Add to Department"
        footer={<>
          <button onClick={() => setAddDeptModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddDept} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
          </button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Department</label>
            <select className="input" value={deptForm.departmentId || ''} onChange={e => setDeptForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Select department</option>
              {allDepts.filter(d => !depts.find(md => md.id === d.id)).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={deptForm.role || 'member'} onChange={e => setDeptForm(f => ({ ...f, role: e.target.value }))}>
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
