import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Filter, MoreHorizontal, Mail, Phone, Edit2, Trash2,
  Loader2, ExternalLink, FileSpreadsheet, QrCode, CheckCircle2, Cake, Baby,
  Briefcase, Home, Send, MessageCircle, Sparkles, MapPin, Calendar, Check,
  Award, Shield, UserCheck, Heart
} from 'lucide-react';
import { membersAPI, branchesAPI, departmentsAPI, fellowshipAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import CsvImportModal from '../components/ui/CsvImportModal';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { email as validateEmail, phone as validatePhone } from '../utils/validation';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  active: 'badge-green',
  inactive: 'badge-gray',
  transferred: 'badge-blue',
  deceased: 'badge-red',
  pending_review: 'badge-yellow',
};

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function MemberForm({ form, setForm, branches = [], departments = [], fellowshipCenters = [], errors = {} }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name *</label>
          <input className={`input ${errors.firstName ? 'border-red-400' : ''}`} required value={form.firstName || ''} onChange={set('firstName')} />
          {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="label">Last Name *</label>
          <input className={`input ${errors.lastName ? 'border-red-400' : ''}`} required value={form.lastName || ''} onChange={set('lastName')} />
          {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Email *</label>
          <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`} value={form.email || ''} onChange={set('email')} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="label">Phone *</label>
          <input type="tel" className={`input ${errors.phone ? 'border-red-400' : ''}`} value={form.phone || ''} onChange={set('phone')} placeholder="+234..." />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Gender *</label>
          <select className={`input ${errors.gender ? 'border-red-400' : ''}`} value={form.gender || ''} onChange={set('gender')}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
        </div>
        <div>
          <label className="label">Date of Birth * (For Birthday Celebrations)</label>
          <input type="date" className={`input ${errors.dateOfBirth ? 'border-red-400' : ''}`} value={form.dateOfBirth || ''} onChange={set('dateOfBirth')} />
          {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Marital Status *</label>
          <select className={`input ${errors.maritalStatus ? 'border-red-400' : ''}`} value={form.maritalStatus || ''} onChange={set('maritalStatus')}>
            <option value="">Select</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widow</option>
            <option value="widower">Widower</option>
          </select>
          {errors.maritalStatus && <p className="text-xs text-red-500 mt-1">{errors.maritalStatus}</p>}
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

      {form.maritalStatus === 'married' && (
        <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-3">
          <div>
            <label className="label text-xs font-semibold text-rose-900 flex items-center gap-1.5">
              <Heart size={14} className="text-rose-600 fill-rose-500" /> Wedding Anniversary Date
            </label>
            <input
              type="date"
              className="input bg-white text-sm"
              value={form.weddingAnniversaryDate || ''}
              onChange={set('weddingAnniversaryDate')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-rose-200/50">
            <div>
              <label className="label text-xs font-semibold text-rose-900">Spouse's Full Name</label>
              <input
                type="text"
                className="input bg-white text-sm"
                placeholder="e.g. Mary Doe"
                value={form.spouseName || ''}
                onChange={set('spouseName')}
              />
            </div>
            <div>
              <label className="label text-xs font-semibold text-rose-900">Spouse's Phone Number</label>
              <input
                type="tel"
                className="input bg-white text-sm"
                placeholder="e.g. 08012345678"
                value={form.spousePhone || ''}
                onChange={set('spousePhone')}
              />
            </div>
          </div>
          <p className="text-[11px] text-rose-700/80">
            Providing spouse details automatically unifies the family household and deduplicates children counts in church statistics.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Branch</label>
          <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Join Date</label>
          <input type="date" className="input" value={form.joinDate || ''} onChange={set('joinDate')} />
        </div>
      </div>

      <div>
        <label className="label">Residential Address & Landmark *</label>
        <input className={`input ${errors.address ? 'border-red-400' : ''}`} placeholder="e.g. 12 Victoria Island Way, near Civic Center, Lagos" value={form.address || ''} onChange={set('address')} />
        {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
      </div>

      {/* Fellowship Cell / Cluster Auto-Assignment */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2">
        <label className="label flex items-center gap-1.5 font-semibold text-indigo-900 mb-0">
          <Home size={15} className="text-indigo-600" /> Fellowship Cell / House Cluster
        </label>
        <select className="input bg-white text-sm" value={form.fellowshipCellId || ''} onChange={set('fellowshipCellId')}>
          <option value="">⚡ Auto-assign to nearest cell by address/location</option>
          {fellowshipCenters.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.meeting_day ? `(${c.meeting_day} ${c.meeting_time || ''})` : ''} — {c.host_address || c.zone_name || 'No address specified'}
            </option>
          ))}
        </select>
        <p className="text-xs text-indigo-700/80">
          If left on &quot;Auto-assign&quot;, our system analyzes residential landmarks and proximity to match this member to the closest house cell automatically.
        </p>
      </div>

      {/* Children & Teenagers Section */}
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
          <span className="text-xs text-sky-700">Church demographic accounting</span>
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
              <label className="label text-xs">Children / Teenagers Names & Ages (Optional)</label>
              <input
                className="input bg-white text-sm"
                placeholder="e.g. Samuel (7), Miracle (11), David (14)"
                value={form.childrenDetails || ''}
                onChange={set('childrenDetails')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Leadership Designation & Ministry Office */}
      <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-purple-950 flex items-center gap-2">
            <Award size={16} className="text-purple-600" />
            Ecclesiastical Role & Designation
          </label>
          <span className="text-xs text-purple-700 font-medium">Leadership Rank</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Designation / Role</label>
            <select
              className="input bg-white text-sm"
              value={form.designation || 'member'}
              onChange={e => {
                const des = e.target.value;
                setForm(f => ({
                  ...f,
                  designation: des,
                  isWorker: des !== 'member' ? true : f.isWorker
                }));
              }}
            >
              <option value="member">General Member</option>
              <option value="pastor">Pastor / Resident Minister</option>
              <option value="director">Ministry Director</option>
              <option value="hod">Head of Department (HOD)</option>
              <option value="minister">Ordained Minister / Elder / Deacon</option>
              <option value="worker">Church Worker</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Office / Portfolio Title</label>
            <input
              className="input bg-white text-sm"
              placeholder={
                form.designation === 'pastor' ? 'e.g. Resident Pastor, Youth Pastor' :
                form.designation === 'director' ? 'e.g. Director of Creatives, Operations' :
                form.designation === 'hod' ? 'e.g. HOD Choir, Protocol Lead' :
                'e.g. Associate Pastor, Lead Elder'
              }
              value={form.leadershipTitle || ''}
              onChange={set('leadershipTitle')}
            />
          </div>
        </div>
      </div>

      {/* Church Worker & Ministry Unit Section */}
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
            Active Church Worker / Serves in a Unit
          </label>
          <span className="text-xs text-emerald-700">Department enrollment</span>
        </div>

        {form.isWorker && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
            <div>
              <label className="label text-xs">Department / Service Unit</label>
              <select className="input bg-white text-sm" value={form.workerUnit || ''} onChange={set('workerUnit')}>
                <option value="">Select Unit</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Role in Unit</label>
              <select className="input bg-white text-sm" value={form.workerRole || 'worker'} onChange={set('workerRole')}>
                <option value="worker">Worker</option>
                <option value="assistant_leader">Assistant Leader</option>
                <option value="leader">Unit Leader / HOD</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Occupation</label>
          <input className="input" value={form.occupation || ''} onChange={set('occupation')} />
        </div>
        <div>
          <label className="label">Company / Employer</label>
          <input className="input" value={form.employer || ''} onChange={set('employer')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.waterBaptized || false} onChange={e => setForm(f => ({ ...f, waterBaptized: e.target.checked }))} />
            Water Baptized
          </label>
        </div>
        <div>
          <label className="label flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.holyGhostBaptized || false} onChange={e => setForm(f => ({ ...f, holyGhostBaptized: e.target.checked }))} />
            Holy Ghost Baptized
          </label>
        </div>
      </div>

      <div>
        <label className="label">Notes / Pastoral Remarks</label>
        <textarea className="input min-h-[70px]" value={form.notes || ''} onChange={set('notes')} placeholder="Add any background notes..." />
      </div>
    </div>
  );
}

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [fellowshipCenters, setFellowshipCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [childrenFilter, setChildrenFilter] = useState('');
  const [cellFilter, setCellFilter] = useState('');
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');

  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showBirthdaysModal, setShowBirthdaysModal] = useState(false);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(false);
  const [sendingWishId, setSendingWishId] = useState(null);

  const [showAnniversariesModal, setShowAnniversariesModal] = useState(false);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState([]);
  const [loadingAnniversaries, setLoadingAnniversaries] = useState(false);
  const [sendingAnniversaryWishId, setSendingAnniversaryWishId] = useState(null);

  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(workerFilter && { isWorker: workerFilter === 'workers' }),
        ...(childrenFilter && { hasChildren: true }),
        ...(cellFilter && { cellId: cellFilter }),
        ...(birthdayMonthFilter && { birthdayMonth: birthdayMonthFilter }),
        ...(designationFilter && { designation: designationFilter }),
      };
      const [membersRes, statsRes] = await Promise.all([
        membersAPI.list(params),
        membersAPI.stats()
      ]);
      setMembers(membersRes.data.data);
      setPagination(membersRes.data.pagination);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, workerFilter, childrenFilter, cellFilter, birthdayMonthFilter, designationFilter]);

  useEffect(() => { fetchMembers(1); }, [fetchMembers]);

  useEffect(() => {
    branchesAPI.list().then(r => setBranches(r.data.data || [])).catch(() => {});
    departmentsAPI.list().then(r => setDepartments(r.data.data || [])).catch(() => {});
    fellowshipAPI.centers().then(r => setFellowshipCenters(r.data.data || [])).catch(() => {});
  }, []);

  const loadBirthdays = async (month = null) => {
    setLoadingBirthdays(true);
    try {
      const params = { days: 30, ...(month && { month }) };
      const res = await membersAPI.birthdays(params);
      setUpcomingBirthdays(res.data.data || []);
    } catch {
      toast.error('Failed to load upcoming birthdays');
    } finally {
      setLoadingBirthdays(false);
    }
  };

  const openBirthdaysDialog = () => {
    setShowBirthdaysModal(true);
    loadBirthdays();
  };

  const handleSendWish = async (member, channel = 'whatsapp') => {
    setSendingWishId(member.id);
    try {
      await membersAPI.sendBirthdayWish(member.id, { channel });
      toast.success(`Birthday greeting sent to ${member.first_name}! 🎂`);
      loadBirthdays();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to dispatch birthday wish');
    } finally {
      setSendingWishId(null);
    }
  };

  const loadAnniversaries = async (month = null) => {
    setLoadingAnniversaries(true);
    try {
      const params = { days: 30, ...(month && { month }) };
      const res = await membersAPI.anniversaries(params);
      setUpcomingAnniversaries(res.data.data || []);
    } catch {
      toast.error('Failed to load upcoming wedding anniversaries');
    } finally {
      setLoadingAnniversaries(false);
    }
  };

  const openAnniversariesDialog = () => {
    setShowAnniversariesModal(true);
    loadAnniversaries();
  };

  const handleSendAnniversaryWish = async (member, channel = 'whatsapp') => {
    setSendingAnniversaryWishId(member.id);
    try {
      await membersAPI.sendAnniversaryWish(member.id, { channel });
      toast.success(`Anniversary blessing sent to ${member.first_name}! 💍`);
      loadAnniversaries();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to dispatch wedding anniversary wish');
    } finally {
      setSendingAnniversaryWishId(null);
    }
  };

  const churchSlug = user?.church_slug || user?.churchSlug;
  const publicMemberFormUrl = useMemo(() => {
    if (!churchSlug || typeof window === 'undefined') return '';
    return `${window.location.origin}/connect/${churchSlug}/member`;
  }, [churchSlug]);

  const navigate = useNavigate();

  const openAdd = () => {
    setForm({
      membershipClass: 'full',
      weddingAnniversaryDate: '',
      spouseName: '',
      spousePhone: '',
      hasChildren: false,
      childrenCount: 0,
      teenagersCount: 0,
      isWorker: false,
      workerRole: 'worker',
      designation: 'member',
      leadershipTitle: '',
      assignedPastorId: '',
    });
    setFormErrors({});
    setModal('add');
  };

  const openEdit = (m) => {
    setForm({
      ...m,
      firstName: m.first_name,
      lastName: m.last_name,
      dateOfBirth: m.date_of_birth ? String(m.date_of_birth).slice(0, 10) : '',
      weddingAnniversaryDate: m.wedding_anniversary_date ? String(m.wedding_anniversary_date).slice(0, 10) : '',
      spouseName: m.spouse_name || '',
      spousePhone: m.spouse_phone || '',
      spouseId: m.spouse_id || '',
      maritalStatus: m.marital_status,
      membershipClass: m.membership_class,
      joinDate: m.join_date ? String(m.join_date).slice(0, 10) : '',
      waterBaptized: m.water_baptized,
      holyGhostBaptized: m.holy_ghost_baptized,
      branchId: m.branch_id,
      hasChildren: m.has_children || (m.children_count > 0) || (m.teenagers_count > 0),
      childrenCount: m.children_count || 0,
      teenagersCount: m.teenagers_count || 0,
      childrenDetails: m.children_details || '',
      isWorker: m.is_worker || false,
      workerUnit: m.worker_unit || '',
      workerRole: m.worker_role || 'worker',
      fellowshipCellId: m.fellowship_cell_id || '',
      designation: m.designation || 'member',
      leadershipTitle: m.leadership_title || '',
      assignedPastorId: m.assigned_pastor_id || '',
    });
    setFormErrors({});
    setSelectedMember(m);
    setModal('edit');
  };

  const handleSave = async () => {
    const errs = {};
    if (!form.firstName?.trim()) errs.firstName = 'First name is required';
    if (!form.lastName?.trim()) errs.lastName = 'Last name is required';
    if (!form.email?.trim()) errs.email = 'Email is required';
    else { const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr; }
    if (!form.phone?.trim()) errs.phone = 'Phone is required';
    else { const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr; }
    if (!form.gender) errs.gender = 'Gender is required';
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required';
    if (!form.maritalStatus) errs.maritalStatus = 'Marital status is required';
    if (!form.address?.trim()) errs.address = 'Address is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return toast.error('Please fill all required fields');

    setSaving(true);
    try {
      if (modal === 'add') {
        await membersAPI.create(form);
        toast.success('Member added! Fellowship cell assigned automatically.');
      } else {
        await membersAPI.update(selectedMember.id, form);
        toast.success('Member updated!');
      }
      setModal(null);
      fetchMembers(pagination.page);
    } catch {
      toast.error('Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this member?')) return;
    try {
      await membersAPI.delete(id);
      toast.success('Member deactivated');
      fetchMembers(pagination.page);
    } catch {
      toast.error('Failed to deactivate member');
    }
  };

  const handleApprove = async (id) => {
    try {
      await membersAPI.update(id, { membershipStatus: 'active' });
      toast.success('Member approved');
      fetchMembers(pagination.page);
    } catch {
      toast.error('Failed to approve member');
    }
  };

  const [designateForm, setDesignateForm] = useState({});
  const [savingDesignation, setSavingDesignation] = useState(false);

  const handleSaveDesignation = async () => {
    if (!selectedMember) return;
    setSavingDesignation(true);
    try {
      await membersAPI.update(selectedMember.id, {
        designation: designateForm.designation || 'member',
        leadershipTitle: designateForm.leadershipTitle || null,
        workerUnit: designateForm.workerUnit || null,
        workerRole: designateForm.workerRole || 'worker',
        isWorker: (designateForm.designation && designateForm.designation !== 'member') || !!designateForm.workerUnit,
      });
      toast.success(`Updated designation for ${selectedMember.first_name} to ${(designateForm.designation || 'member').toUpperCase()}`);
      setModal(null);
      fetchMembers(pagination.page);
    } catch {
      toast.error('Failed to update designation');
    } finally {
      setSavingDesignation(false);
    }
  };

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            Members
            <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2.5 py-0.5 rounded-full border border-brand-200">
              {(stats.active || 0).toLocaleString()} Active
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage church membership, track family demographics, church workers, cell clusters, birthdays, and wedding anniversaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openBirthdaysDialog} className="btn-secondary flex items-center gap-1.5 text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100">
            <Cake size={16} className="text-pink-600" />
            <span>Birthdays</span>
            {(stats.birthdays_this_month || 0) > 0 && (
              <span className="bg-pink-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {stats.birthdays_this_month}
              </span>
            )}
          </button>
          <button onClick={openAnniversariesDialog} className="btn-secondary flex items-center gap-1.5 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100">
            <Heart size={16} className="text-rose-600 fill-rose-500" />
            <span>Anniversaries</span>
            {(stats.anniversaries_this_month || 0) > 0 && (
              <span className="bg-rose-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {stats.anniversaries_this_month}
              </span>
            )}
          </button>
          {publicMemberFormUrl && (
            <button onClick={() => setShowShare(true)} className="btn-secondary flex items-center gap-1.5">
              <QrCode size={16} /> Member Form
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-1.5">
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {/* Mini stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Members', value: stats.active, icon: Users, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Pastors & Leads', value: (stats.pastors_count || 0) + (stats.directors_count || 0) + (stats.hods_count || 0), icon: Award, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
          { label: 'Church Workers', value: stats.workers_count, icon: Briefcase, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
          { label: 'Anniversaries Month', value: stats.anniversaries_this_month || 0, icon: Heart, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', badge: stats.anniversaries_today ? `${stats.anniversaries_today} Today!` : null },
          { label: 'Birthdays Month', value: stats.birthdays_this_month, icon: Cake, color: 'text-pink-700', bg: 'bg-pink-50 border-pink-100', badge: stats.birthdays_today ? `${stats.birthdays_today} Today!` : null },
          { label: 'Pending Review', value: stats.pending_review, icon: CheckCircle2, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
        ].map(({ label, value, icon: Icon, color, bg, badge }) => (
          <div key={label} className={`card p-4 border ${bg} transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
              <Icon size={15} className={color} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-bold font-display ${color}`}>{(value || 0).toLocaleString()}</p>
              {badge && (
                <span className="text-[10px] font-bold bg-pink-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                  {badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="table-wrapper">
        {/* Filters */}
        <div className="p-3.5 border-b border-gray-100 flex flex-wrap gap-2.5 items-center bg-white">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 py-1.5 h-9 text-xs"
              placeholder="Search name, phone, email, cell, title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8 font-semibold text-purple-800 bg-purple-50/70 border-purple-200" value={designationFilter} onChange={e => setDesignationFilter(e.target.value)}>
            <option value="">All Designations</option>
            <option value="pastor">Pastors</option>
            <option value="director">Directors</option>
            <option value="hod">HODs / Unit Leads</option>
            <option value="minister">Ministers & Elders</option>
            <option value="worker">Church Workers</option>
            <option value="member">General Members</option>
          </select>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_review">Pending Review</option>
            <option value="inactive">Inactive</option>
            <option value="transferred">Transferred</option>
          </select>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8" value={workerFilter} onChange={e => setWorkerFilter(e.target.value)}>
            <option value="">All Service Status</option>
            <option value="workers">Workers Only</option>
            <option value="members">Non-Workers</option>
          </select>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8" value={childrenFilter} onChange={e => setChildrenFilter(e.target.value)}>
            <option value="">All Families</option>
            <option value="true">With Children / Teens</option>
          </select>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8" value={cellFilter} onChange={e => setCellFilter(e.target.value)}>
            <option value="">All Fellowship Cells</option>
            {fellowshipCenters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select className="input h-9 text-xs w-auto py-1.5 pr-8" value={birthdayMonthFilter} onChange={e => setBirthdayMonthFilter(e.target.value)}>
            <option value="">Birthday Month (All)</option>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {(search || statusFilter || workerFilter || childrenFilter || cellFilter || birthdayMonthFilter || designationFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setWorkerFilter('');
                setChildrenFilter('');
                setCellFilter('');
                setBirthdayMonthFilter('');
                setDesignationFilter('');
              }}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : members.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No members match your criteria</p>
            <p className="text-gray-400 text-sm">Add a member or adjust your filter query</p>
            <button onClick={openAdd} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Add Member</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>ID</th>
                <th>Contact</th>
                <th>Demographics</th>
                <th>Worker / Unit</th>
                <th>Fellowship Cell</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const hasFamily = (m.children_count > 0) || (m.teenagers_count > 0) || m.has_children;
                const isBdayToday = m.date_of_birth && (
                  new Date(m.date_of_birth).getMonth() === new Date().getMonth() &&
                  new Date(m.date_of_birth).getDate() === new Date().getDate()
                );
                const isAnnivToday = m.wedding_anniversary_date && (
                  new Date(m.wedding_anniversary_date).getMonth() === new Date().getMonth() &&
                  new Date(m.wedding_anniversary_date).getDate() === new Date().getDate()
                );
                return (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0 relative">
                          {getInitials(m.first_name, m.last_name)}
                          {isBdayToday && (
                            <span className="absolute -top-1 -right-1 text-sm" title="Birthday Today!">🎂</span>
                          )}
                          {isAnnivToday && !isBdayToday && (
                            <span className="absolute -top-1 -right-1 text-sm" title="Wedding Anniversary Today!">💍</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900">{m.first_name} {m.last_name}</span>
                            {m.designation && m.designation !== 'member' && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider border ${
                                m.designation === 'pastor' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                m.designation === 'director' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                m.designation === 'hod' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                                m.designation === 'minister' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {m.designation}
                              </span>
                            )}
                            {isBdayToday && (
                              <span className="badge badge-pink text-[10px] py-0 px-1 font-bold">Birthday!</span>
                            )}
                            {isAnnivToday && (
                              <span className="badge badge-rose text-[10px] py-0 px-1 font-bold flex items-center gap-0.5">
                                <Heart size={9} className="fill-rose-500" /> Anniversary!
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            {m.leadership_title && <span className="text-purple-700 font-semibold">{m.leadership_title} · </span>}
                            <span>{m.branch_name || 'Main Sanctuary'}</span>
                          </div>
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

                    <td>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="capitalize text-xs font-medium text-gray-700">{m.marital_status || m.membership_class || 'Full'}</span>
                          {m.wedding_anniversary_date && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded" title={`Wedding Anniversary: ${format(new Date(m.wedding_anniversary_date), 'MMMM d')}`}>
                              <Heart size={9} className="fill-rose-500 text-rose-500" />
                              {format(new Date(m.wedding_anniversary_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                        {(m.linked_spouse_name || m.spouse_name) && (
                          <span className="text-[10px] text-gray-500 truncate max-w-[140px]" title={`Spouse: ${m.linked_spouse_name || m.spouse_name}`}>
                            💍 {m.linked_spouse_name || m.spouse_name}
                          </span>
                        )}
                        {hasFamily ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
                              m.is_primary_family_contact === false
                                ? 'text-sky-600 bg-sky-50/60 border border-sky-100'
                                : 'text-sky-700 bg-sky-50 border border-sky-200'
                            }`}
                            title={m.is_primary_family_contact === false ? 'Shared household (secondary contact)' : 'Household children'}
                          >
                            <Baby size={11} />
                            {[
                              m.children_count > 0 ? `${m.children_count} kids` : null,
                              m.teenagers_count > 0 ? `${m.teenagers_count} teens` : null,
                            ].filter(Boolean).join(', ') || 'Has children'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {m.is_worker ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <Briefcase size={11} className="text-emerald-600" />
                            {m.worker_unit || 'Worker'}
                          </span>
                          {m.worker_role && m.worker_role !== 'worker' && (
                            <span className="text-[10px] text-emerald-600 font-medium capitalize pl-1">
                              {m.worker_role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Congregant</span>
                      )}
                    </td>

                    <td>
                      {m.fellowship_cell_name ? (
                        <div className="flex flex-col gap-0.5 max-w-[170px]">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md truncate">
                            <Home size={11} className="text-indigo-600 flex-shrink-0" />
                            <span className="truncate">{m.fellowship_cell_name}</span>
                          </span>
                          {m.fellowship_meeting_day && (
                            <span className="text-[10px] text-indigo-500 font-medium pl-1">
                              {m.fellowship_meeting_day} {m.fellowship_meeting_time || ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${STATUS_BADGE[m.membership_status] || 'badge-gray'} capitalize`}>
                        {m.membership_status}
                      </span>
                    </td>

                    <td className="text-xs text-gray-500">
                      {m.join_date ? format(new Date(m.join_date), 'MMM d, yyyy') : '—'}
                    </td>

                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isBdayToday && (
                          <button
                            onClick={() => handleSendWish(m, 'whatsapp')}
                            className="p-1.5 rounded hover:bg-pink-100 text-pink-600 transition-colors"
                            title="Send Birthday Greeting via WhatsApp"
                          >
                            <Cake size={14} />
                          </button>
                        )}
                        {m.membership_status === 'pending_review' && (
                          <button
                            onClick={() => handleApprove(m.id)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Approve member"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setDesignateForm({
                              designation: m.designation || 'member',
                              leadershipTitle: m.leadership_title || '',
                              workerUnit: m.worker_unit || '',
                              workerRole: m.worker_role || 'worker',
                            });
                            setModal('designate');
                          }}
                          className="p-1.5 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Designate Leadership Role (Pastor, Director, HOD...)"
                        >
                          <Award size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/members/${m.id}`)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="View profile"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors"
                          title="Edit member"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {members.length} of {pagination.total.toLocaleString()} members</span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchMembers(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchMembers(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Member' : 'Edit Member'}
        size="lg"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'add' ? 'Add Member' : 'Save Changes'}
          </button>
        </>}
      >
        <MemberForm
          form={form}
          setForm={setForm}
          branches={branches}
          departments={departments}
          fellowshipCenters={fellowshipCenters}
          errors={formErrors}
        />
      </Modal>

      {/* Quick Designate Modal */}
      <Modal
        open={modal === 'designate'}
        onClose={() => setModal(null)}
        title={`Designate Leadership Role · ${selectedMember?.first_name} ${selectedMember?.last_name}`}
        size="md"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveDesignation} disabled={savingDesignation} className="btn-primary">
            {savingDesignation ? <Loader2 size={15} className="animate-spin" /> : 'Confirm Designation'}
          </button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Set an ecclesiastical rank and ministry portfolio for <strong>{selectedMember?.first_name} {selectedMember?.last_name}</strong>. This updates their directory badge, ministerial reporting, and access tier.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'member', label: 'General Member', icon: Users },
              { id: 'pastor', label: 'Pastor', icon: Award },
              { id: 'director', label: 'Director', icon: Shield },
              { id: 'hod', label: 'Head of Dept (HOD)', icon: UserCheck },
              { id: 'minister', label: 'Minister / Elder', icon: Sparkles },
              { id: 'worker', label: 'Church Worker', icon: Briefcase },
            ].map(tier => {
              const isSelected = (designateForm.designation || 'member') === tier.id;
              const Icon = tier.icon;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setDesignateForm(d => ({ ...d, designation: tier.id }))}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-brand-600 ring-2 ring-brand-500/20 bg-brand-50/50 shadow-xs font-bold text-brand-900'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <Icon size={16} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
                  <span className="text-xs">{tier.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="label text-xs">Office / Portfolio Title</label>
            <input
              className="input text-sm"
              placeholder="e.g. Resident Pastor, Director of Operations, HOD Media, Youth Pastor"
              value={designateForm.leadershipTitle || ''}
              onChange={e => setDesignateForm(d => ({ ...d, leadershipTitle: e.target.value }))}
            />
          </div>

          <div>
            <label className="label text-xs">Serving Unit / Department</label>
            <select
              className="input text-sm bg-white"
              value={designateForm.workerUnit || ''}
              onChange={e => setDesignateForm(d => ({ ...d, workerUnit: e.target.value }))}
            >
              <option value="">Select Directorate / Department (Optional)</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
              <option value="Pastoral Council">Pastoral Council / Ministry Board</option>
              <option value="Executive Directorate">Executive Directorate</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Upcoming Birthdays Celebration Modal */}
      <Modal
        open={showBirthdaysModal}
        onClose={() => setShowBirthdaysModal(false)}
        title="🎂 Member Birthdays & Celebrations"
        size="lg"
        footer={<>
          <button onClick={() => setShowBirthdaysModal(false)} className="btn-secondary">Close</button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-pink-50/70 border border-pink-100 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Cake className="text-pink-600" size={24} />
              <div>
                <p className="text-sm font-bold text-pink-950">Celebrate Church Family Birthdays</p>
                <p className="text-xs text-pink-800">
                  ChurchOS automatically schedules daily greetings via WhatsApp/SMS/Email, and you can also send one-click personal wishes right here!
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadBirthdays()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-pink-100 text-pink-800 hover:bg-pink-200"
            >
              Upcoming (Next 30 Days)
            </button>
            <select
              className="input text-xs py-1.5 h-8 w-auto pr-7"
              onChange={e => loadBirthdays(e.target.value)}
              defaultValue=""
            >
              <option value="">Filter by specific month...</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {loadingBirthdays ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-pink-600" />
            </div>
          ) : upcomingBirthdays.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
              <Cake size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No birthdays in this selected window</p>
              <p className="text-xs text-gray-400">Ensure member birth dates are entered in the system</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto pr-1">
              {upcomingBirthdays.map(b => {
                const isToday = b.is_today || b.days_until === 0;
                const formattedDate = b.date_of_birth ? format(new Date(b.date_of_birth), 'MMMM d') : '';
                return (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isToday ? 'bg-pink-600 text-white shadow-md' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {getInitials(b.first_name, b.last_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">
                            {b.first_name} {b.last_name}
                          </p>
                          {isToday ? (
                            <span className="badge badge-pink font-bold text-[10px] animate-bounce">
                              Today! 🎂
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">
                              in {b.days_until} day{b.days_until === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-pink-700">
                            <Calendar size={12} /> {formattedDate}
                          </span>
                          {b.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {b.phone}
                            </span>
                          )}
                          {b.email && (
                            <span className="hidden sm:flex items-center gap-1">
                              <Mail size={11} /> {b.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.phone && (
                        <a
                          href={`https://wa.me/${b.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Happy Birthday, ${b.first_name}! 🎂🎉\n\nThe leadership and church family celebrate God's grace and blessings over your life today! May this new year overflow with health, joy, and peace in Jesus' name! Have a glorious celebration! ✨`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          title="Open WhatsApp Chat"
                        >
                          <MessageCircle size={13} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleSendWish(b, 'whatsapp')}
                        disabled={sendingWishId === b.id}
                        className="btn-primary text-xs py-1 px-3 flex items-center gap-1 bg-pink-600 hover:bg-pink-700 text-white"
                        title="Dispatch system greeting"
                      >
                        {sendingWishId === b.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Wish</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Upcoming Wedding Anniversaries Celebration Modal */}
      <Modal
        open={showAnniversariesModal}
        onClose={() => setShowAnniversariesModal(false)}
        title="💍 Married Couples & Wedding Anniversaries"
        size="lg"
        footer={<>
          <button onClick={() => setShowAnniversariesModal(false)} className="btn-secondary">Close</button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-rose-50/70 border border-rose-100 p-3.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Heart className="text-rose-600 fill-rose-500 shrink-0" size={24} />
              <div>
                <p className="text-sm font-bold text-rose-950">Pastoral Wedding Anniversary Blessings</p>
                <p className="text-xs text-rose-800">
                  ChurchOS automatically schedules daily anniversary greetings via WhatsApp, SMS, and Email. You can also send personal pastoral blessings with one click below!
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAnniversaries()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200"
            >
              Upcoming (Next 30 Days)
            </button>
            <select
              className="input text-xs py-1.5 h-8 w-auto pr-7"
              onChange={e => loadAnniversaries(e.target.value)}
              defaultValue=""
            >
              <option value="">Filter by specific month...</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {loadingAnniversaries ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-rose-600" />
            </div>
          ) : upcomingAnniversaries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
              <Heart size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No wedding anniversaries in this selected window</p>
              <p className="text-xs text-gray-400">Ensure married members have their wedding anniversary date recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto pr-1">
              {upcomingAnniversaries.map(a => {
                const isToday = a.is_today || a.days_until === 0;
                const formattedDate = a.wedding_anniversary_date ? format(new Date(a.wedding_anniversary_date), 'MMMM d') : '';
                return (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isToday ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {getInitials(a.first_name, a.last_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">
                            {a.first_name} {a.last_name}
                          </p>
                          {a.years_married ? (
                            <span className="badge badge-purple text-[10px] font-bold">
                              {a.years_married} Year{a.years_married === 1 ? '' : 's'}
                            </span>
                          ) : null}
                          {isToday ? (
                            <span className="badge badge-rose font-bold text-[10px] animate-bounce">
                              Today! 💍
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">
                              in {a.days_until} day{a.days_until === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-rose-700">
                            <Calendar size={12} /> {formattedDate}
                          </span>
                          {a.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {a.phone}
                            </span>
                          )}
                          {a.email && (
                            <span className="hidden sm:flex items-center gap-1">
                              <Mail size={11} /> {a.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {a.phone && (
                        <a
                          href={`https://wa.me/${a.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Happy Wedding Anniversary, ${a.first_name}! 💍❤️\n\nThe pastoral leadership and entire church family celebrate the grace of God upon your marriage! May the Lord continuously bless your union with peace, enduring love, joy, and fruitfulness in Jesus' name! Happy Anniversary!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          title="Open WhatsApp Chat"
                        >
                          <MessageCircle size={13} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleSendAnniversaryWish(a, 'whatsapp')}
                        disabled={sendingAnniversaryWishId === a.id}
                        className="btn-primary text-xs py-1 px-3 flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white"
                        title="Dispatch automated pastoral blessing"
                      >
                        {sendingAnniversaryWishId === a.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                        <span>Wish</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() => fetchMembers(1)}
        entityType="members"
        importFn={membersAPI.importCsv}
      />

      <PublicIntakeShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="Member Registration Form"
        description="Share this QR code or link with members so they can submit their details, family demographic counts, worker unit, and receive automatic cell cluster assignment."
        url={publicMemberFormUrl}
        allowDesignationSelect={true}
      />
    </div>
  );
}
