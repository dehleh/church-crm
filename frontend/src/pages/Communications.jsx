import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, Send, Trash2, Loader2, Mail, Phone, Bell,
  ImagePlus, X, Users, Clock, CheckCircle2, AlertTriangle, Check,
  Search, Calendar, MapPin, RefreshCw, Smartphone, Eye
} from 'lucide-react';
import {
  communicationsAPI, departmentsAPI, groupsAPI, branchesAPI,
  pastoralAppointmentsAPI, membersAPI
} from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CHANNEL_ICON = { email: Mail, sms: Phone, whatsapp: Phone, push: Bell, in_app: Bell };
const CHANNEL_BADGE = { email: 'badge-blue', sms: 'badge-green', whatsapp: 'badge-green', push: 'badge-purple', in_app: 'badge-gray' };
const STATUS_BADGE = { draft: 'badge-gray', scheduled: 'badge-yellow', sent: 'badge-green', failed: 'badge-red' };

const AUDIENCE_OPTIONS = [
  { value: 'all',               label: 'All Active Members' },
  { value: 'all_leaders',       label: '🌟 All Leaders (Pastors, Directors, HODs, Cell & Group Leaders)' },
  { value: 'hods',              label: '👑 Heads of Department (HODs) & Unit Heads' },
  { value: 'directors',         label: '🏛️ Church Directors' },
  { value: 'pastors_ministers', label: '✝️ Pastors & Ministers' },
  { value: 'cell_leaders',      label: '🏡 House Fellowship & Cell Leaders' },
  { value: 'workers',           label: '🤝 Church Workforce / Active Servants' },
  { value: 'designation',       label: '🎯 Specific Leadership Designation…' },
  { value: 'department',        label: '🏢 Members of a Department' },
  { value: 'group',             label: '👥 Members of a Group' },
  { value: 'branch',            label: '📍 Members of a Branch' },
  { value: 'first_timers',      label: '🌱 First Timers' },
  { value: 'male_members',      label: '👨 All Male Members' },
  { value: 'female_members',    label: '👩 All Female Members' },
  { value: 'parents',           label: '👪 All Parents (Married or with Children)' },
  { value: 'parents_children',   label: '👶 Parents of Toddlers & Children (0 - 12 yrs)' },
  { value: 'parents_teens',      label: '🎒 Parents of Teenagers (13 - 17 yrs)' },
  { value: 'teens',              label: '⚡ Teenagers / Youth Members (13 - 17 yrs)' },
  { value: 'birthday',          label: '🎂 Birthday on a Specific Date' },
  { value: 'anniversary',       label: '💍 Wedding Anniversary on a Specific Date' },
];

const AUDIENCE_LABEL = Object.fromEntries(AUDIENCE_OPTIONS.map(o => [o.value, o.label]));

const VENUE_SUGGESTIONS = [
  "Senior Pastor's Office",
  'Sanctuary Front Pew (After Service)',
  'Vestry / Pastoral Boardroom',
  'Church Counseling Room',
  'Virtual / Video Conference Call',
];

export default function Communications() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' | 'pastoral_summons'

  // Broadcasts State
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);

  // Lookups for audience selectors
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [branches, setBranches] = useState([]);
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Pastoral Appointments / Summons State
  const [pastoralItems, setPastoralItems] = useState([]);
  const [pastoralLoading, setPastoralLoading] = useState(false);
  const [pastoralSearch, setPastoralSearch] = useState('');
  const [pastoralStatusFilter, setPastoralStatusFilter] = useState('');
  const [pastoralUrgencyFilter, setPastoralUrgencyFilter] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [pastoralForm, setPastoralForm] = useState({
    selectedMembers: [],
    pastorName: '',
    meetingTime: '',
    venue: "Senior Pastor's Office",
    urgency: 'normal',
    notes: '',
    sendWhatsApp: true,
    sendSms: false,
  });
  const [memberSearchText, setMemberSearchText] = useState('');
  const [savingPastoral, setSavingPastoral] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        communicationsAPI.list({ ...(statusFilter && { status: statusFilter }) }),
        communicationsAPI.stats(),
      ]);
      setItems(res.data.data);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchPastoralAppointments = useCallback(async () => {
    setPastoralLoading(true);
    try {
      const params = {};
      if (pastoralStatusFilter) params.status = pastoralStatusFilter;
      if (pastoralUrgencyFilter) params.urgency = pastoralUrgencyFilter;
      if (pastoralSearch) params.search = pastoralSearch;
      const res = await pastoralAppointmentsAPI.list(params);
      setPastoralItems(res.data.data || []);
    } catch {
      toast.error('Failed to load pastoral summons');
    } finally {
      setPastoralLoading(false);
    }
  }, [pastoralStatusFilter, pastoralUrgencyFilter, pastoralSearch]);

  useEffect(() => {
    if (activeTab === 'broadcasts') {
      fetchBroadcasts();
    } else {
      fetchPastoralAppointments();
    }
  }, [activeTab, fetchBroadcasts, fetchPastoralAppointments]);

  // Load lookups once
  useEffect(() => {
    (async () => {
      try {
        const [d, g, b, m] = await Promise.all([
          departmentsAPI.list().catch(() => ({ data: { data: [] } })),
          groupsAPI.list().catch(() => ({ data: { data: [] } })),
          branchesAPI.list().catch(() => ({ data: { data: [] } })),
          membersAPI.list({ limit: 1000 }).catch(() => ({ data: { data: [] } })),
        ]);
        setDepartments(d.data.data || []);
        setGroups(g.data.data || []);
        setBranches(b.data.data || []);
        setAllMembers(m.data.data || []);
      } catch { /* silent */ }
    })();
  }, []);

  // Live audience count whenever audience or filter changes
  useEffect(() => {
    if (modal !== 'compose') return;
    const audience = form.audience || 'all';
    const filter = form.audienceFilter || {};
    if (audience === 'department' && !filter.departmentId) { setAudiencePreview(null); return; }
    if (audience === 'group' && !filter.groupId) { setAudiencePreview(null); return; }
    if (audience === 'branch' && !filter.branchId) { setAudiencePreview(null); return; }
    if (audience === 'designation' && !filter.designation) { setAudiencePreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    communicationsAPI.previewAudience({ audience, audienceFilter: filter })
      .then(res => { if (!cancelled) setAudiencePreview(res.data.data); })
      .catch(() => { if (!cancelled) setAudiencePreview(null); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [modal, form.audience, form.audienceFilter]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCompose = async () => {
    if (!form.title || !form.body || !form.channel) return toast.error('Title, body, and channel are required');
    setSaving(true);
    try {
      await communicationsAPI.create(form);
      toast.success(form.scheduledAt ? 'Broadcast scheduled successfully!' : 'Message saved as draft!');
      setModal(null);
      fetchBroadcasts();
    } catch {
      toast.error('Failed to save message');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Only image files allowed');
    setUploading(true);
    try {
      const res = await communicationsAPI.uploadImage(file);
      setForm(f => ({ ...f, imageUrl: res.data.data.imageUrl }));
      toast.success('Image uploaded!');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (id) => {
    try {
      await communicationsAPI.send(id);
      toast.success('Message queued for sending!');
      fetchBroadcasts();
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await communicationsAPI.delete(id);
      toast.success('Draft deleted');
      fetchBroadcasts();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const previewMsg = (item) => {
    setSelected(item);
    setModal('preview');
  };

  // ── Pastoral Summons Handlers ───────────────────────────────
  const openNewPastoralModal = () => {
    const defaultPastor = user
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Senior Pastor'
      : 'Senior Pastor';

    // Format current time + 1 hour as default datetime-local
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setPastoralForm({
      selectedMembers: [],
      pastorName: defaultPastor,
      meetingTime: localIso,
      venue: "Senior Pastor's Office",
      urgency: 'normal',
      notes: '',
      sendWhatsApp: true,
      sendSms: false,
    });
    setMemberSearchText('');
    setModal('pastoral_summons');
  };

  const handleAddMemberToSummons = (member) => {
    if (pastoralForm.selectedMembers.some(m => m.id === member.id)) return;
    setPastoralForm(f => ({
      ...f,
      selectedMembers: [...f.selectedMembers, member],
    }));
    setMemberSearchText('');
  };

  const handleRemoveMemberFromSummons = (memberId) => {
    setPastoralForm(f => ({
      ...f,
      selectedMembers: f.selectedMembers.filter(m => m.id !== memberId),
    }));
  };

  const handleSavePastoralSummons = async (e) => {
    e.preventDefault();
    if (pastoralForm.selectedMembers.length === 0) {
      return toast.error('Please select at least one member to see the pastor');
    }
    if (!pastoralForm.meetingTime) {
      return toast.error('Please specify the meeting date and time');
    }
    if (!pastoralForm.venue.trim()) {
      return toast.error('Please specify the meeting venue');
    }

    setSavingPastoral(true);
    try {
      const payload = {
        memberIds: pastoralForm.selectedMembers.map(m => m.id),
        title: `Pastoral Meeting Request (${pastoralForm.venue})`,
        meetingTime: new Date(pastoralForm.meetingTime).toISOString(),
        venue: pastoralForm.venue.trim(),
        urgency: pastoralForm.urgency,
        notes: pastoralForm.notes.trim() || null,
        pastorName: pastoralForm.pastorName.trim(),
        sendWhatsApp: pastoralForm.sendWhatsApp,
        sendSms: pastoralForm.sendSms,
      };

      const res = await pastoralAppointmentsAPI.create(payload);
      toast.success(res.data.message || 'Pastoral summons successfully dispatched!');
      setModal(null);
      fetchPastoralAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch pastoral summons');
    } finally {
      setSavingPastoral(false);
    }
  };

  const handleUpdatePastoralStatus = async (id, status) => {
    try {
      await pastoralAppointmentsAPI.updateStatus(id, { status });
      toast.success(`Meeting status updated to ${status}`);
      fetchPastoralAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResendPastoralNotice = async (id) => {
    try {
      await pastoralAppointmentsAPI.resend(id, { sendWhatsApp: true, sendSms: false });
      toast.success('Pastoral notice reminder resent via WhatsApp / SMS!');
      fetchPastoralAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend notice');
    }
  };

  const handleDeletePastoralAppointment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pastoral summons record?')) return;
    try {
      await pastoralAppointmentsAPI.delete(id);
      toast.success('Pastoral summons deleted');
      fetchPastoralAppointments();
    } catch {
      toast.error('Failed to delete pastoral summons');
    }
  };

  // Filter members for member picker
  const filteredMemberChoices = memberSearchText.trim()
    ? allMembers
        .filter(m =>
          !pastoralForm.selectedMembers.some(sm => sm.id === m.id) &&
          (`${m.first_name} ${m.last_name} ${m.phone || ''} ${m.email || ''}`)
            .toLowerCase()
            .includes(memberSearchText.toLowerCase())
        )
        .slice(0, 8)
    : [];

  // Pastoral stats
  const pendingCount = pastoralItems.filter(p => p.status === 'pending').length;
  const acknowledgedCount = pastoralItems.filter(p => p.status === 'acknowledged').length;
  const completedCount = pastoralItems.filter(p => p.status === 'completed').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Communications & Pastoral Notices</h1>
          <p className="text-gray-500 text-sm mt-1">
            Send bulk congregation announcements or schedule direct pastoral summons and appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'broadcasts' ? (
            <button
              onClick={() => { setForm({ audience: 'all' }); setModal('compose'); }}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus size={16} /> Compose Message
            </button>
          ) : (
            <button
              onClick={openNewPastoralModal}
              className="btn-primary inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800"
            >
              <Users size={16} /> + New Pastoral Request / Summons
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'broadcasts'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={16} /> Broadcasts & Announcements
        </button>
        <button
          onClick={() => setActiveTab('pastoral_summons')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pastoral_summons'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} /> Pastoral Summons & Notices
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: BROADCASTS & MESSAGES ────────────────────────── */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Messages', value: stats.total },
              { label: 'Sent', value: stats.sent, color: 'text-emerald-600' },
              { label: 'Drafts', value: stats.drafts, color: 'text-amber-600' },
              { label: 'Total Recipients', value: Number(stats.total_recipients || 0).toLocaleString(), color: 'text-brand-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card py-4 px-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
                <p className={`text-2xl font-bold font-display ${color || 'text-gray-900'}`}>{value || 0}</p>
              </div>
            ))}
          </div>

          <div className="table-wrapper">
            <div className="px-4 py-3 border-b border-gray-100 flex gap-3 bg-white">
              <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Drafts</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <button onClick={() => { setForm({ audience: 'all' }); setModal('compose'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Compose Message</button>
              </div>
            ) : (
              <table className="crm-table">
                <thead><tr><th>Message</th><th>Channel</th><th>Audience</th><th>Status</th><th>Sent</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map(item => {
                    const Icon = CHANNEL_ICON[item.channel] || MessageSquare;
                    return (
                      <tr key={item.id} className="cursor-pointer" onClick={() => previewMsg(item)}>
                        <td>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.body}</p>
                        </td>
                        <td>
                          <span className={`badge uppercase text-xs ${CHANNEL_BADGE[item.channel] || 'badge-gray'}`}>
                            <Icon size={10} /> {item.channel}
                          </span>
                        </td>
                        <td><span className="text-sm text-gray-600 capitalize">{AUDIENCE_LABEL[item.audience] || item.audience?.replace('_', ' ')}</span></td>
                        <td>
                          {item.status === 'scheduled' && item.scheduled_at ? (
                            <span className="badge badge-yellow flex items-center gap-1 w-fit whitespace-nowrap">
                              <Clock size={11} /> {format(new Date(item.scheduled_at), 'MMM d, h:mm a')}
                            </span>
                          ) : (
                            <span className={`badge capitalize ${STATUS_BADGE[item.status] || 'badge-gray'}`}>{item.status}</span>
                          )}
                        </td>
                        <td className="text-sm text-gray-600">{item.sent_count > 0 ? `${item.sent_count.toLocaleString()} recipients` : '—'}</td>
                        <td className="text-sm text-gray-500 whitespace-nowrap">{format(new Date(item.created_at), 'MMM d, yyyy')}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {(item.status === 'draft' || item.status === 'scheduled') && (
                              <>
                                <button onClick={() => handleSend(item.id)} className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title={item.status === 'scheduled' ? 'Send immediately now' : 'Send now'}>
                                  <Send size={14} />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: PASTORAL SUMMONS & NOTICES ───────────────────── */}
      {activeTab === 'pastoral_summons' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Summons</p>
              <p className="text-2xl font-bold font-display text-gray-900">{pastoralItems.length}</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Pending Confirmation</p>
              <p className="text-2xl font-bold font-display text-amber-600">{pendingCount}</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Acknowledged / Confirmed</p>
              <p className="text-2xl font-bold font-display text-indigo-600">{acknowledgedCount}</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Completed</p>
              <p className="text-2xl font-bold font-display text-emerald-600">{completedCount}</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-wrapper">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={pastoralSearch}
                    onChange={e => setPastoralSearch(e.target.value)}
                    placeholder="Search by member, pastor, venue..."
                    className="input pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pastoralStatusFilter}
                  onChange={e => setPastoralStatusFilter(e.target.value)}
                  className="input h-9 text-xs w-auto py-1 pr-8"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={pastoralUrgencyFilter}
                  onChange={e => setPastoralUrgencyFilter(e.target.value)}
                  className="input h-9 text-xs w-auto py-1 pr-8"
                >
                  <option value="">All Priorities</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                <button
                  onClick={fetchPastoralAppointments}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={pastoralLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {pastoralLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin text-brand-500" />
              </div>
            ) : pastoralItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-800">No Pastoral Summons Found</h3>
                <p className="text-gray-500 text-xs mt-1 max-w-md mx-auto">
                  Pastoral summons notify members that the Senior Pastor wishes to meet with them at a specific time and venue, dispatching instant WhatsApp and SMS alerts.
                </p>
                <button onClick={openNewPastoralModal} className="btn-primary mt-4 inline-flex items-center gap-1.5">
                  <Plus size={15} /> Create Pastoral Request
                </button>
              </div>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Member Requested</th>
                    <th>Pastor</th>
                    <th>Meeting Time & Venue</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Reason / Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pastoralItems.map(item => {
                    let formattedMeeting = item.meeting_time;
                    try {
                      formattedMeeting = format(new Date(item.meeting_time), 'EEE, MMM d, yyyy @ h:mm a');
                    } catch {}

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {item.member_name ? item.member_name[0] : 'M'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{item.member_name}</div>
                              {item.member_phone && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <Phone size={10} /> {item.member_phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-sm font-medium text-gray-800">{item.pastor_name}</div>
                        </td>
                        <td>
                          <div className="text-sm font-semibold text-gray-900">{formattedMeeting}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-brand-500 shrink-0" /> {item.venue}
                          </div>
                        </td>
                        <td>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            item.urgency === 'urgent'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.urgency === 'high'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.urgency}
                          </span>
                        </td>
                        <td>
                          {item.status === 'acknowledged' ? (
                            <div>
                              <span className="badge badge-green flex items-center gap-1 w-fit">
                                <CheckCircle2 size={11} /> Acknowledged
                              </span>
                              {item.acknowledged_at && (
                                <span className="text-[10px] text-gray-400 block mt-0.5">
                                  {format(new Date(item.acknowledged_at), 'MMM d, h:mm a')}
                                </span>
                              )}
                            </div>
                          ) : item.status === 'completed' ? (
                            <span className="badge badge-blue">Completed</span>
                          ) : item.status === 'cancelled' ? (
                            <span className="badge badge-red">Cancelled</span>
                          ) : (
                            <span className="badge badge-yellow">Pending</span>
                          )}
                        </td>
                        <td className="max-w-xs">
                          <p className="text-xs text-gray-600 line-clamp-2">{item.notes || '—'}</p>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {item.status !== 'completed' && item.status !== 'cancelled' && (
                              <button
                                onClick={() => handleUpdatePastoralStatus(item.id, 'completed')}
                                className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Mark Meeting Completed"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {item.status !== 'cancelled' && item.status !== 'completed' && (
                              <button
                                onClick={() => handleResendPastoralNotice(item.id)}
                                className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                                title="Resend WhatsApp/SMS Notice"
                              >
                                <Send size={13} />
                              </button>
                            )}
                            {item.status !== 'cancelled' && item.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdatePastoralStatus(item.id, 'cancelled')}
                                className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                                title="Cancel Summons"
                              >
                                <X size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePastoralAppointment(item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Record"
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
          </div>
        </div>
      )}

      {/* ── MODAL: COMPOSE BROADCAST ────────────────────────────── */}
      <Modal
        open={modal === 'compose'}
        onClose={() => setModal(null)}
        title="Compose Broadcast Message"
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleCompose} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : form.scheduledAt ? 'Schedule Broadcast' : 'Save as Draft'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Subject / Title *</label>
            <input className="input" placeholder="Sunday Service Reminder" value={form.title || ''} onChange={set('title')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Channel *</label>
              <select className="input" value={form.channel || ''} onChange={set('channel')}>
                <option value="">Select channel</option>
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="in_app">🔔 In-App</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">SMS &amp; WhatsApp require provider keys in Settings.</p>
            </div>
            <div>
              <label className="label">Audience</label>
              <select
                className="input"
                value={form.audience || 'all'}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value, audienceFilter: {} }))}
              >
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Audience filter selectors */}
          {form.audience === 'designation' && (
            <div>
              <label className="label">Target Designation *</label>
              <select
                className="input"
                value={form.audienceFilter?.designation || ''}
                onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), designation: e.target.value } }))}
              >
                <option value="">Select leadership designation</option>
                <option value="hod">Head of Department (HOD) / Unit Head</option>
                <option value="director">Director</option>
                <option value="pastor">Pastor</option>
                <option value="minister">Minister</option>
                <option value="elder">Elder / Presbyter</option>
                <option value="deacon">Deacon / Deaconess</option>
                <option value="leader">Leader / Coordinator</option>
                <option value="worker">Church Worker</option>
              </select>
            </div>
          )}

          {form.audience === 'department' && (
            <div className="space-y-2">
              <label className="label">Department *</label>
              <select
                className="input"
                value={form.audienceFilter?.departmentId || ''}
                onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), departmentId: e.target.value } }))}
              >
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(form.audienceFilter?.leadersOnly)}
                  onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), leadersOnly: e.target.checked } }))}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Target only HOD &amp; unit leaders of this department</span>
              </label>
            </div>
          )}
          {form.audience === 'group' && (
            <div>
              <label className="label">Group *</label>
              <select
                className="input"
                value={form.audienceFilter?.groupId || ''}
                onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), groupId: e.target.value } }))}
              >
                <option value="">Select group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {form.audience === 'branch' && (
            <div>
              <label className="label">Branch *</label>
              <select
                className="input"
                value={form.audienceFilter?.branchId || ''}
                onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), branchId: e.target.value } }))}
              >
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {(form.audience === 'birthday' || form.audience === 'anniversary') && (
            <div>
              <label className="label">Date {form.audience === 'birthday' ? '(birthday)' : '(anniversary)'} </label>
              <input
                type="date"
                className="input"
                value={form.audienceFilter?.date || ''}
                onChange={e => setForm(f => ({ ...f, audienceFilter: { ...(f.audienceFilter || {}), date: e.target.value } }))}
              />
              <p className="text-xs text-gray-400 mt-1">Only the month and day are used. Leave blank to target today.</p>
            </div>
          )}

          {/* Live audience preview */}
          <div className="flex items-center gap-2 text-xs bg-brand-50/60 border border-brand-100 text-brand-700 rounded-lg px-3 py-2">
            <Users size={14} />
            {previewLoading ? (
              <span>Calculating recipients…</span>
            ) : audiencePreview ? (
              <span>
                <strong>{audiencePreview.total.toLocaleString()}</strong> recipient{audiencePreview.total === 1 ? '' : 's'}
                {form.channel === 'email' && <> · {audiencePreview.reachable.email} have email</>}
                {(form.channel === 'sms' || form.channel === 'whatsapp') && <> · {audiencePreview.reachable.phone} have phone</>}
              </span>
            ) : (
              <span className="text-gray-500">Pick the audience options above to preview the recipient count.</span>
            )}
          </div>
          <div>
            <label className="label">Message Body *</label>
            <textarea
              className="input min-h-[160px]"
              placeholder="Type your message here…"
              value={form.body || ''}
              onChange={set('body')}
            />
            {form.channel === 'sms' && (
              <p className="text-xs text-gray-400 mt-1">
                {(form.body || '').length}/160 characters · {Math.ceil((form.body || '').length / 160) || 1} SMS
              </p>
            )}
          </div>
          <div>
            <label className="label">Attach Image (optional)</label>
            {form.imageUrl ? (
              <div className="relative inline-block">
                <img src={form.imageUrl} alt="Attachment" className="w-32 h-32 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-colors w-fit">
                {uploading ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <ImagePlus size={16} className="text-gray-400" />}
                <span className="text-sm text-gray-500">{uploading ? 'Uploading…' : 'Choose image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <div>
            <label className="label">Schedule (optional)</label>
            <input type="datetime-local" className="input" value={form.scheduledAt || ''} onChange={set('scheduledAt')} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to send immediately when you click Send</p>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: NEW PASTORAL SUMMONS / REQUEST ──────────────── */}
      <Modal
        open={modal === 'pastoral_summons'}
        onClose={() => setModal(null)}
        title="New Pastoral Summons & Meeting Request"
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSavePastoralSummons} disabled={savingPastoral} className="btn-primary inline-flex items-center gap-1.5">
              {savingPastoral ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Dispatch Pastoral Summons ({pastoralForm.selectedMembers.length})
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePastoralSummons} className="space-y-4">
          {/* Member Picker */}
          <div>
            <label className="label">Target Member(s) to See Pastor *</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={memberSearchText}
                onChange={e => setMemberSearchText(e.target.value)}
                placeholder="Search member by name, phone or email..."
                className="input pl-9"
              />
            </div>

            {filteredMemberChoices.length > 0 && (
              <div className="mt-1 p-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto space-y-1 z-20 relative">
                {filteredMemberChoices.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleAddMemberToSummons(m)}
                    className="w-full text-left p-2 rounded-lg hover:bg-brand-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-xs text-gray-900">{m.first_name} {m.last_name}</div>
                      <div className="text-[11px] text-gray-500">{m.phone || m.email || 'No contact'}</div>
                    </div>
                    <span className="text-[11px] font-bold text-brand-600 bg-brand-100/60 px-2 py-0.5 rounded">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Members Chips */}
            {pastoralForm.selectedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                {pastoralForm.selectedMembers.map(m => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 bg-brand-100 text-brand-800 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  >
                    {m.first_name} {m.last_name} {m.phone ? `(${m.phone})` : ''}
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberFromSummons(m.id)}
                      className="hover:text-red-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Select one or more members the pastor wants to meet with.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Meeting Date & Time *</label>
              <input
                type="datetime-local"
                value={pastoralForm.meetingTime}
                onChange={e => setPastoralForm(f => ({ ...f, meetingTime: e.target.value }))}
                required
                className="input"
              />
            </div>

            <div>
              <label className="label">Pastor Name / Title</label>
              <input
                type="text"
                value={pastoralForm.pastorName}
                onChange={e => setPastoralForm(f => ({ ...f, pastorName: e.target.value }))}
                placeholder="Senior Pastor David"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Meeting Venue / Location *</label>
            <input
              type="text"
              value={pastoralForm.venue}
              onChange={e => setPastoralForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="e.g. Senior Pastor's Office"
              required
              className="input"
            />
            {/* Quick Venue Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VENUE_SUGGESTIONS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPastoralForm(f => ({ ...f, venue: v }))}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    pastoralForm.venue === v
                      ? 'bg-brand-50 border-brand-300 text-brand-700 font-semibold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Priority / Urgency</label>
              <select
                value={pastoralForm.urgency}
                onChange={e => setPastoralForm(f => ({ ...f, urgency: e.target.value }))}
                className="input"
              >
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">⚠️ Urgent Summons</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Purpose / Private Note for Member</label>
            <textarea
              rows={2}
              value={pastoralForm.notes}
              onChange={e => setPastoralForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Follow-up regarding department leadership transition. Please bring your quarterly review report."
              className="input"
            />
          </div>

          {/* Instant Dispatch Channels */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <span className="text-xs font-bold text-gray-800 block">Dispatch Channels</span>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-700">
                <input
                  type="checkbox"
                  checked={pastoralForm.sendWhatsApp}
                  onChange={e => setPastoralForm(f => ({ ...f, sendWhatsApp: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Phone size={14} className="text-emerald-600" /> Instant WhatsApp Notice
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-blue-700">
                <input
                  type="checkbox"
                  checked={pastoralForm.sendSms}
                  onChange={e => setPastoralForm(f => ({ ...f, sendSms: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Smartphone size={14} className="text-blue-600" /> Instant SMS Notice
              </label>

              <span className="text-gray-500 text-[11px] inline-flex items-center gap-1">
                <Bell size={12} className="text-indigo-600" /> Member Portal In-App Banner is always active
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: PREVIEW BROADCAST ───────────────────────────── */}
      <Modal
        open={modal === 'preview'}
        onClose={() => setModal(null)}
        title={selected?.title || 'Message Preview'}
        size="md"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Close</button>
            {(selected?.status === 'draft' || selected?.status === 'scheduled') && (
              <button onClick={() => { handleSend(selected.id); setModal(null); }} className="btn-primary">
                <Send size={14} /> Send Now
              </button>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <span className={`badge uppercase ${CHANNEL_BADGE[selected.channel] || 'badge-gray'}`}>{selected.channel}</span>
              <span className={`badge capitalize ${STATUS_BADGE[selected.status] || 'badge-gray'}`}>{selected.status}</span>
              <span className="badge badge-gray capitalize">{selected.audience}</span>
            </div>
            {selected.scheduled_at && selected.status === 'scheduled' && (
              <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                <Clock size={12} /> Scheduled for {format(new Date(selected.scheduled_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
            {selected.sent_at && (
              <p className="text-xs text-gray-400">
                Sent {format(new Date(selected.sent_at), 'MMM d, yyyy h:mm a')} · {selected.sent_count} recipients
              </p>
            )}
            {selected.image_url && (
              <img src={selected.image_url} alt="Attachment" className="w-full max-h-64 object-contain rounded-lg border" />
            )}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selected.body}
            </div>
            {selected.created_by_name && <p className="text-xs text-gray-400">Created by {selected.created_by_name}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
