import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Plus, Search, Users, Clock, MapPin, Video, Loader2,
  CheckSquare, QrCode, Bell, MessageCircle, Mail, Phone, Edit3, Trash2,
  Image, Sparkles, Send, CheckCircle2, ChevronRight, ListOrdered, UserCheck,
  Copy, ArrowUp, ArrowDown, Shield, Mic, Music, BookOpen, Gift, Megaphone, Play
} from 'lucide-react';
import { eventsAPI, branchesAPI, servicePlansAPI, membersAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const TYPE_BADGE = {
  sunday_service: 'badge-blue', midweek: 'badge-purple', special: 'badge-yellow',
  conference: 'badge-peach', outreach: 'badge-green', concert: 'badge-gray',
};
const STATUS_BADGE = { upcoming: 'badge-blue', ongoing: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' };

const ITEM_TYPE_ICONS = {
  prayer: Clock,
  worship: Music,
  word: BookOpen,
  giving: Gift,
  announcement: Megaphone,
  special: Sparkles,
  general: CheckCircle2,
};

export default function Events() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'plans'
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [remindingId, setRemindingId] = useState(null);
  const [shareEvent, setShareEvent] = useState(null);
  const navigate = useNavigate();

  // ── Service Plans State ──────────────────────────────────────
  const [servicePlans, setServicePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planModal, setPlanModal] = useState(null); // 'add' | 'edit'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planForm, setPlanForm] = useState({});
  const [savingPlan, setSavingPlan] = useState(false);

  // Timeline Builder Modal
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelinePlan, setTimelinePlan] = useState(null);
  const [timelineItems, setTimelineItems] = useState([]);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', item_type: 'worship', duration_minutes: 10, minister_name: '', notes: '' });

  // Volunteer Scheduling Modal
  const [showVolunteersModal, setShowVolunteersModal] = useState(false);
  const [volunteerPlan, setVolunteerPlan] = useState(null);
  const [volunteerList, setVolunteerList] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [newVolunteer, setNewVolunteer] = useState({ role_title: 'Usher', member_id: '', notes: '' });
  const [savingVolunteer, setSavingVolunteer] = useState(false);
  const [remindingVolunteerId, setRemindingVolunteerId] = useState(null);

  const churchSlug = user?.church_slug || user?.churchSlug;
  const publicCheckInUrl = useMemo(() => {
    if (!churchSlug || !shareEvent || typeof window === 'undefined') return '';
    return `${window.location.origin}/connect/${churchSlug}/events/${shareEvent.id}/check-in`;
  }, [churchSlug, shareEvent]);

  const fetchEvents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(statusFilter && { status: statusFilter }), ...(typeFilter && { type: typeFilter }), ...(search && { search }) };
      const [res, statsRes] = await Promise.all([eventsAPI.list(params), eventsAPI.stats()]);
      setEvents(res.data.data);
      setPagination(res.data.pagination);
      setStats(statsRes.data.data);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);
  useEffect(() => {
    branchesAPI.list().then(r => setBranches(r.data.data || [])).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => {
    setForm({
      reminderEnabled: true,
      reminderTimeBefore: '24h',
      reminderChannels: ['whatsapp'],
      reminderTarget: 'all_members',
      branchId: user?.branch_id || '',
    });
    setModal('add');
  };

  const openEdit = (ev) => {
    setForm({
      ...ev,
      startDatetime: ev.start_datetime ? ev.start_datetime.substring(0, 16) : '',
      endDatetime: ev.end_datetime ? ev.end_datetime.substring(0, 16) : '',
      reminderEnabled: ev.reminder_enabled ?? false,
      reminderTimeBefore: ev.reminder_time_before || '24h',
      reminderChannels: ev.reminder_channels || ['whatsapp'],
      reminderTarget: ev.reminder_target || 'all_members',
      reminderCustomText: ev.reminder_custom_text || '',
      bannerUrl: ev.banner_url || '',
    });
    setModal('edit');
  };

  const toggleChannel = (ch) => {
    const current = form.reminderChannels || ['whatsapp'];
    const updated = current.includes(ch)
      ? current.filter(c => c !== ch)
      : [...current, ch];
    setForm(f => ({ ...f, reminderChannels: updated.length ? updated : ['whatsapp'] }));
  };

  const handleSave = async () => {
    if (!form.title || !form.startDatetime) return toast.error('Title and start date/time are required');
    setSaving(true);
    try {
      if (modal === 'edit') {
        await eventsAPI.update(form.id, form);
        toast.success('Event updated!');
      } else {
        await eventsAPI.create(form);
        toast.success('Event created with automated reminders!');
      }
      setModal(null);
      fetchEvents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete event "${title}"? Attendance data associated with this event will be affected.`)) return;
    try {
      await eventsAPI.delete(id);
      toast.success('Event deleted');
      fetchEvents(pagination.page);
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleManualRemind = async (ev) => {
    if (!window.confirm(`Send instant event reminder for "${ev.title}" to members now?`)) return;
    setRemindingId(ev.id);
    try {
      const res = await eventsAPI.sendReminder(ev.id);
      toast.success(res.data.message || 'Reminder sent!');
      fetchEvents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setRemindingId(null);
    }
  };

  // ── Service Plans Handlers ────────────────────────────────────
  const fetchServicePlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await servicePlansAPI.list();
      setServicePlans(res.data.data || []);
    } catch {
      toast.error('Failed to load service plans');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchServicePlans();
    }
  }, [activeTab, fetchServicePlans]);

  useEffect(() => {
    membersAPI.list({ limit: 200, status: 'active' })
      .then(r => setAllMembers(r.data.data || []))
      .catch(() => {});
  }, []);

  const openAddPlan = () => {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
    setPlanForm({
      title: 'Sunday Celebration Service',
      service_date: format(nextSunday, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '11:00',
      theme: '',
      series_title: '',
      notes: '',
      status: 'published',
      branch_id: user?.branch_id || '',
    });
    setPlanModal('add');
  };

  const openEditPlan = (plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      title: plan.title,
      service_date: plan.service_date ? plan.service_date.split('T')[0] : '',
      start_time: plan.start_time?.substring(0, 5) || '09:00',
      end_time: plan.end_time?.substring(0, 5) || '11:00',
      theme: plan.theme || '',
      series_title: plan.series_title || '',
      notes: plan.notes || '',
      status: plan.status || 'published',
      branch_id: plan.branch_id || '',
    });
    setPlanModal('edit');
  };

  const handleSavePlan = async () => {
    if (!planForm.title || !planForm.service_date || !planForm.start_time) {
      return toast.error('Title, date, and start time are required');
    }
    setSavingPlan(true);
    try {
      if (planModal === 'edit') {
        await servicePlansAPI.update(selectedPlan.id, planForm);
        toast.success('Service plan updated!');
      } else {
        await servicePlansAPI.create(planForm);
        toast.success('Sunday service plan created!');
      }
      setPlanModal(null);
      fetchServicePlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save service plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDuplicatePlan = async (id) => {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + 7);
    const nextDate = format(nextSunday, 'yyyy-MM-dd');
    const newDate = window.prompt('Enter service date for duplicated run-sheet (YYYY-MM-DD):', nextDate);
    if (!newDate) return;
    try {
      await servicePlansAPI.duplicate(id, { serviceDate: newDate });
      toast.success('Service plan & run-sheet duplicated!');
      fetchServicePlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to duplicate plan');
    }
  };

  const handleDeletePlan = async (id, title) => {
    if (!window.confirm(`Delete service plan "${title}"?`)) return;
    try {
      await servicePlansAPI.delete(id);
      toast.success('Service plan deleted');
      fetchServicePlans();
    } catch {
      toast.error('Failed to delete service plan');
    }
  };

  // Timeline handlers
  const openTimelineModal = async (plan) => {
    setTimelinePlan(plan);
    setShowTimelineModal(true);
    try {
      const res = await servicePlansAPI.get(plan.id);
      setTimelineItems(res.data.data.timeline || []);
    } catch {
      toast.error('Failed to load timeline items');
    }
  };

  const handleAddTimelineItem = () => {
    if (!newItem.title.trim()) return toast.error('Segment title is required');
    setTimelineItems(prev => [
      ...prev,
      {
        ...newItem,
        id: `temp-${Date.now()}`,
        sort_order: prev.length,
        duration_minutes: parseInt(newItem.duration_minutes) || 10,
      }
    ]);
    setNewItem({ title: '', item_type: 'worship', duration_minutes: 10, minister_name: '', notes: '' });
  };

  const handleMoveTimelineItem = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= timelineItems.length) return;
    const copy = [...timelineItems];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setTimelineItems(copy);
  };

  const handleRemoveTimelineItem = (index) => {
    setTimelineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveTimeline = async () => {
    setSavingTimeline(true);
    try {
      await servicePlansAPI.setTimeline(timelinePlan.id, timelineItems);
      toast.success('Run-sheet timeline saved!');
      setShowTimelineModal(false);
      fetchServicePlans();
    } catch (err) {
      toast.error('Failed to save timeline');
    } finally {
      setSavingTimeline(false);
    }
  };

  // Volunteer handlers
  const openVolunteersModal = async (plan) => {
    setVolunteerPlan(plan);
    setShowVolunteersModal(true);
    try {
      const res = await servicePlansAPI.get(plan.id);
      setVolunteerList(res.data.data.volunteers || []);
    } catch {
      toast.error('Failed to load volunteers');
    }
  };

  const handleAddVolunteer = async () => {
    if (!newVolunteer.member_id) return toast.error('Please select a member');
    if (!newVolunteer.role_title) return toast.error('Role title is required');
    setSavingVolunteer(true);
    try {
      await servicePlansAPI.addVolunteer(volunteerPlan.id, newVolunteer);
      toast.success('Volunteer added to roster!');
      const res = await servicePlansAPI.get(volunteerPlan.id);
      setVolunteerList(res.data.data.volunteers || []);
      setNewVolunteer({ role_title: 'Usher', member_id: '', notes: '' });
      fetchServicePlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add volunteer');
    } finally {
      setSavingVolunteer(false);
    }
  };

  const handleRemoveVolunteer = async (volunteerId) => {
    try {
      await servicePlansAPI.removeVolunteer(volunteerPlan.id, volunteerId);
      toast.success('Volunteer removed');
      setVolunteerList(prev => prev.filter(v => v.id !== volunteerId));
      fetchServicePlans();
    } catch {
      toast.error('Failed to remove volunteer');
    }
  };

  const handleRemindVolunteer = async (volunteerId) => {
    setRemindingVolunteerId(volunteerId);
    try {
      const res = await servicePlansAPI.sendVolunteerReminder(volunteerPlan.id, volunteerId, { channel: 'whatsapp' });
      toast.success(res.data.message || 'Reminder dispatched to volunteer!');
      const r = await servicePlansAPI.get(volunteerPlan.id);
      setVolunteerList(r.data.data.volunteers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send volunteer reminder');
    } finally {
      setRemindingVolunteerId(null);
    }
  };

  const calculateTimelineTimes = (startTimeStr, items) => {
    const baseTime = startTimeStr || '09:00:00';
    const [h, m] = baseTime.split(':').map(Number);
    let currentMinutes = (h || 9) * 60 + (m || 0);

    return items.map(item => {
      const segH = Math.floor(currentMinutes / 60) % 24;
      const segM = currentMinutes % 60;
      const period = segH >= 12 ? 'PM' : 'AM';
      const dispH = segH % 12 || 12;
      const timeStr = `${dispH}:${segM.toString().padStart(2, '0')} ${period}`;
      currentMinutes += parseInt(item.duration_minutes) || 10;
      return { ...item, computedTime: timeStr };
    });
  };

  const calculateGrandTotal = (startTimeStr, items) => {
    const totalMins = items.reduce((acc, it) => acc + (parseInt(it.duration_minutes) || 0), 0);
    const baseTime = startTimeStr || '09:00:00';
    const [h, m] = baseTime.split(':').map(Number);
    const endMinutes = (h || 9) * 60 + (m || 0) + totalMins;
    const endH = Math.floor(endMinutes / 60) % 24;
    const endM = endMinutes % 60;
    const period = endH >= 12 ? 'PM' : 'AM';
    const dispH = endH % 12 || 12;
    const endTimeStr = `${dispH}:${endM.toString().padStart(2, '0')} ${period}`;
    return { totalMins, endTimeStr };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'events' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={16} /> Church Events & Reminders
        </button>
        <button
          onClick={() => { setActiveTab('plans'); fetchServicePlans(); }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'plans' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListOrdered size={16} /> Sunday Service Run-Sheets & Volunteers
        </button>
      </div>

      {activeTab === 'events' && (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="page-title">Events & Automated Reminders</h1>
              <p className="text-gray-500 text-sm mt-1">Plan church services, design promotional flyers, and automate WhatsApp/Email reminders</p>
            </div>
            <button onClick={openAdd} className="btn-primary">
              <Plus size={16} /> Create Event
            </button>
          </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Upcoming Events', value: stats.upcoming, color: 'text-brand-600' },
          { label: 'This Month', value: stats.this_month, color: 'text-purple-600' },
          { label: 'Avg Attendance', value: Math.round(stats.avg_attendance || 0), color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table Wrapper */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search events, venues…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="sunday_service">Sunday Service</option>
            <option value="midweek">Midweek</option>
            <option value="special">Special</option>
            <option value="conference">Conference</option>
            <option value="outreach">Outreach</option>
            <option value="concert">Concert</option>
          </select>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No events found</p>
            <button onClick={openAdd} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Create First Event</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Event & Flyer</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>Automated Reminders</th>
                <th>Attendance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {ev.banner_url ? (
                        <img src={ev.banner_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-xs flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                          <CalendarDays size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 leading-tight">{ev.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{ev.branch_name || 'All branches'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge capitalize ${TYPE_BADGE[ev.event_type] || 'badge-gray'}`}>
                      {ev.event_type?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm text-gray-700">
                        <CalendarDays size={12} className="text-gray-400" />
                        {ev.start_datetime ? format(parseISO(ev.start_datetime), 'MMM d, yyyy') : '—'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {ev.start_datetime ? format(parseISO(ev.start_datetime), 'h:mm a') : '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {ev.is_online ? (
                      <span className="flex items-center gap-1 text-xs text-purple-600 font-medium"><Video size={12} /> Online</span>
                    ) : ev.location ? (
                      <span className="flex items-center gap-1 text-xs text-gray-600"><MapPin size={12} className="text-gray-400" />{ev.location}</span>
                    ) : '—'}
                  </td>
                  <td>
                    {ev.reminder_enabled ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Bell size={10} /> {ev.reminder_time_before || '24h'} before
                          </span>
                          {(ev.reminder_channels || ['whatsapp']).map(c => (
                            <span key={c} className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {c}
                            </span>
                          ))}
                        </div>
                        {ev.reminder_sent_at && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            Sent {format(parseISO(ev.reminder_sent_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Disabled</span>
                    )}
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-700 whitespace-nowrap">
                      <Users size={13} className="text-gray-400" />
                      {ev.attendance_count || 0}
                      {ev.expected_attendance ? <span className="text-gray-400 text-xs">/ {ev.expected_attendance}</span> : ''}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button
                        onClick={() => handleManualRemind(ev)}
                        disabled={remindingId === ev.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 transition-colors"
                        title="Dispatch immediate reminder flyer to members"
                      >
                        {remindingId === ev.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Remind Now
                      </button>

                      {churchSlug && (
                        <button onClick={() => setShareEvent(ev)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="QR Check-in">
                          <QrCode size={15} />
                        </button>
                      )}

                      <button onClick={() => navigate(`/events/${ev.id}/attendance`)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors" title="Mark Attendance">
                        <CheckSquare size={15} />
                      </button>

                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Edit Event">
                        <Edit3 size={15} />
                      </button>

                      <button onClick={() => handleDelete(ev.id, ev.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete Event">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {events.length} of {pagination.total} events</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetchEvents(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchEvents(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── SERVICE PLANS TAB ── */}
      {activeTab === 'plans' && (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="page-title">Sunday Service Run-Sheets & Volunteer Rosters</h1>
              <p className="text-gray-500 text-sm mt-1">Design minute-by-minute order of service timelines, compute service duration, and schedule volunteer rosters with automated reminders</p>
            </div>
            <button onClick={openAddPlan} className="btn-primary">
              <Plus size={16} /> New Service Plan
            </button>
          </div>

          {/* Service Plans Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Service Plans</p>
              <p className="text-2xl font-bold font-display text-gray-800">{servicePlans.length}</p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Published Services</p>
              <p className="text-2xl font-bold font-display text-emerald-600">
                {servicePlans.filter(p => p.status === 'published').length}
              </p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Run-Sheet Segments</p>
              <p className="text-2xl font-bold font-display text-brand-600">
                {servicePlans.reduce((acc, p) => acc + parseInt(p.item_count || 0), 0)}
              </p>
            </div>
            <div className="card py-4 px-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Scheduled Volunteers</p>
              <p className="text-2xl font-bold font-display text-purple-600">
                {servicePlans.reduce((acc, p) => acc + parseInt(p.volunteer_count || 0), 0)}
              </p>
            </div>
          </div>

          {/* Service Plans List */}
          <div className="table-wrapper">
            {loadingPlans ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : servicePlans.length === 0 ? (
              <div className="text-center py-16">
                <ListOrdered size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No Sunday service run-sheets created yet</p>
                <p className="text-gray-400 text-xs mt-1">Create an Order of Service to schedule segments and assign volunteer workers</p>
                <button onClick={openAddPlan} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Create First Service Plan</button>
              </div>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Service & Theme</th>
                    <th>Date & Time</th>
                    <th>Run-Sheet (Segments)</th>
                    <th>Volunteer Roster</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {servicePlans.map(plan => (
                    <tr key={plan.id}>
                      <td>
                        <div>
                          <p className="font-semibold text-gray-900">{plan.title}</p>
                          {plan.theme && (
                            <p className="text-xs text-brand-700 font-medium mt-0.5">Theme: “{plan.theme}”</p>
                          )}
                          {plan.series_title && (
                            <p className="text-[11px] text-gray-400">Series: {plan.series_title}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5 whitespace-nowrap">
                          <span className="flex items-center gap-1 text-sm font-medium text-gray-800">
                            <CalendarDays size={13} className="text-brand-600" />
                            {plan.service_date ? format(new Date(plan.service_date), 'EEE, MMM d, yyyy') : '—'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={11} />
                            {plan.start_time ? plan.start_time.substring(0, 5) : '09:00'} - {plan.end_time ? plan.end_time.substring(0, 5) : '11:00'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => openTimelineModal(plan)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
                        >
                          <ListOrdered size={14} />
                          <span>{plan.item_count || 0} Segments ({plan.total_duration || 0}m)</span>
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => openVolunteersModal(plan)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                        >
                          <Users size={14} />
                          <span>{plan.volunteer_count || 0} Volunteers</span>
                        </button>
                      </td>
                      <td>
                        <span className={`badge uppercase text-[10px] font-bold ${
                          plan.status === 'published' ? 'badge-green' :
                          plan.status === 'completed' ? 'badge-blue' :
                          'badge-yellow'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDuplicatePlan(plan.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Duplicate Plan for Next Sunday"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => openEditPlan(plan)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit Service Details"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id, plan.title)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Service Plan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}


      {/* Add / Edit Event Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit Event & Reminders' : 'Create New Event'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'edit' ? 'Save Changes' : 'Create Event'}
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Title & Basic Details */}
          <div>
            <label className="label">Event Title *</label>
            <input className="input" placeholder="Sunday Celebration Service, Easter Revival..." value={form.title || ''} onChange={set('title')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Event Type</label>
              <select className="input" value={form.eventType || ''} onChange={set('eventType')}>
                <option value="">Select type</option>
                {['sunday_service','midweek','special','conference','outreach','concert'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
                <option value="">All branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date & Time *</label>
              <input type="datetime-local" className="input" value={form.startDatetime || ''} onChange={set('startDatetime')} />
            </div>
            <div>
              <label className="label">End Date & Time</label>
              <input type="datetime-local" className="input" value={form.endDatetime || ''} onChange={set('endDatetime')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Physical Venue / Location</label>
              <input className="input" placeholder="Main Auditorium, 12 Church Way" value={form.location || ''} onChange={set('location')} />
            </div>
            <div>
              <label className="label">Expected Attendance</label>
              <input type="number" className="input" placeholder="500" value={form.expectedAttendance || ''} onChange={set('expectedAttendance')} />
            </div>
          </div>

          {/* Program Banner Flyer */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Image size={14} className="text-brand-600" /> Program Banner / Promotional Flyer URL
              </label>
            </div>
            <input className="input" placeholder="https://images.unsplash.com/... or flyer image URL" value={form.bannerUrl || ''} onChange={set('bannerUrl')} />
            {form.bannerUrl && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 max-h-40 bg-black">
                <img src={form.bannerUrl} alt="Flyer Preview" className="w-full h-40 object-cover" />
              </div>
            )}
            <p className="text-[11px] text-gray-400">Attached to WhatsApp broadcasts and email reminders sent to members.</p>
          </div>

          {/* Online details */}
          <div>
            <label className="label flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isOnline || false} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} />
              <span className="font-semibold text-gray-800">This is an Online / Hybrid Stream Event</span>
            </label>
            {form.isOnline && (
              <div className="mt-2">
                <label className="label">Live Stream Link (YouTube / Zoom / Mixlr)</label>
                <input className="input" placeholder="https://youtube.com/live/..." value={form.onlineLink || ''} onChange={set('onlineLink')} />
              </div>
            )}
          </div>

          {/* Automated Reminders Engine */}
          <div className="p-4 rounded-xl border-2 border-brand-100 bg-brand-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-brand-600" />
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Automated Event Reminders</h4>
                  <p className="text-xs text-gray-500">Automatically broadcast reminder flyers before the service holds</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.reminderEnabled || false}
                onChange={e => setForm(f => ({ ...f, reminderEnabled: e.target.checked }))}
                className="w-4 h-4 rounded text-brand-600 cursor-pointer"
              />
            </div>

            {form.reminderEnabled && (
              <div className="space-y-3 pt-2 border-t border-brand-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Send Reminder At</label>
                    <select className="input" value={form.reminderTimeBefore || '24h'} onChange={set('reminderTimeBefore')}>
                      <option value="24h">24 Hours Before Event</option>
                      <option value="2h">2 Hours Before Event</option>
                      <option value="1h">1 Hour Before Event</option>
                      <option value="morning_of">Morning of Event (8:00 AM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Audience Target</label>
                    <select className="input" value={form.reminderTarget || 'all_members'} onChange={set('reminderTarget')}>
                      <option value="all_members">All Active Church Members</option>
                      <option value="attendees">Registered Attendees Only</option>
                      <option value="branch">Branch Members Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Dispatch Channels</label>
                  <div className="flex items-center gap-4">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
                      { id: 'email',    label: 'Email',    icon: Mail,          color: 'text-blue-600' },
                      { id: 'sms',      label: 'SMS',      icon: Phone,         color: 'text-purple-600' },
                    ].map(({ id, label, icon: Icon, color }) => (
                      <label key={id} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={(form.reminderChannels || ['whatsapp']).includes(id)}
                          onChange={() => toggleChannel(id)}
                          className="rounded text-brand-600"
                        />
                        <Icon size={14} className={color} /> {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Custom Reminder Note / Scripture (Optional)</label>
                  <input className="input" placeholder="Come expectant with your family and loved ones!" value={form.reminderCustomText || ''} onChange={set('reminderCustomText')} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Event Description & Notes</label>
            <textarea className="input min-h-[70px]" placeholder="Brief background or prayer focus..." value={form.description || ''} onChange={set('description')} />
          </div>
        </div>
      </Modal>

      <PublicIntakeShareModal
        open={!!shareEvent}
        onClose={() => setShareEvent(null)}
        title={shareEvent ? `Check-In QR: ${shareEvent.title}` : 'Check-In QR'}
        description="Share this QR code at the event entrance so members can self check-in using their member ID and phone number."
        url={publicCheckInUrl}
      />

      {/* ── Plan Modal (Add / Edit) ── */}
      <Modal
        open={planModal === 'add' || planModal === 'edit'}
        onClose={() => setPlanModal(null)}
        title={planModal === 'edit' ? 'Edit Service Plan' : 'Create Sunday Service Plan'}
        size="lg"
        footer={<>
          <button onClick={() => setPlanModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleSavePlan} disabled={savingPlan} className="btn-primary">
            {savingPlan ? <Loader2 size={15} className="animate-spin" /> : planModal === 'edit' ? 'Save Changes' : 'Create Plan'}
          </button>
        </>}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Service Title *</label>
            <input
              className="input"
              placeholder="e.g. Sunday Celebration & Thanksgiving Service"
              value={planForm.title || ''}
              onChange={e => setPlanForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Service Date *</label>
              <input
                type="date"
                className="input"
                value={planForm.service_date || ''}
                onChange={e => setPlanForm(f => ({ ...f, service_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Start Time *</label>
              <input
                type="time"
                className="input"
                value={planForm.start_time || '09:00'}
                onChange={e => setPlanForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Scheduled End Time</label>
              <input
                type="time"
                className="input"
                value={planForm.end_time || '11:00'}
                onChange={e => setPlanForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Service Theme (Optional)</label>
              <input
                className="input"
                placeholder="e.g. Walking in Supernatural Fruitfulness"
                value={planForm.theme || ''}
                onChange={e => setPlanForm(f => ({ ...f, theme: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Teaching Series (Optional)</label>
              <input
                className="input"
                placeholder="e.g. Faith Dynamics Part 4"
                value={planForm.series_title || ''}
                onChange={e => setPlanForm(f => ({ ...f, series_title: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Branch</label>
              <select
                className="input"
                value={planForm.branch_id || ''}
                onChange={e => setPlanForm(f => ({ ...f, branch_id: e.target.value }))}
              >
                <option value="">All Branches / Main Sanctuary</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={planForm.status || 'published'}
                onChange={e => setPlanForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft (Private to Pastors)</option>
                <option value="published">Published (Visible on Roster)</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Pastoral & Liturgical Notes</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Special altar setup, communion elements, guest speaker instructions..."
              value={planForm.notes || ''}
              onChange={e => setPlanForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Run-Sheet Timeline Builder Modal ── */}
      <Modal
        open={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        title={timelinePlan ? `Order of Service Run-Sheet: ${timelinePlan.title}` : 'Run-Sheet Timeline'}
        size="xl"
        footer={<>
          <button onClick={() => setShowTimelineModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveTimeline} disabled={savingTimeline} className="btn-primary">
            {savingTimeline ? <Loader2 size={15} className="animate-spin" /> : 'Save Run-Sheet'}
          </button>
        </>}
      >
        {timelinePlan && (() => {
          const { totalMins, endTimeStr } = calculateGrandTotal(timelinePlan.start_time, timelineItems);
          const computedItems = calculateTimelineTimes(timelinePlan.start_time, timelineItems);

          return (
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Grand Total Duration Banner */}
              <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-brand-900 text-xs">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-brand-600 flex-shrink-0" />
                  <span>
                    Service Start: <strong>{timelinePlan.start_time ? timelinePlan.start_time.substring(0, 5) : '09:00'}</strong> • Total Duration: <strong>{totalMins} minutes</strong> ({Math.floor(totalMins / 60)}h {totalMins % 60}m)
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  <span>Planned Dismissal: {endTimeStr}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="crm-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">#</th>
                      <th className="w-24">Time</th>
                      <th>Type</th>
                      <th>Segment Title</th>
                      <th>Minister / Team</th>
                      <th className="w-24 text-center">Duration</th>
                      <th className="w-24 text-right">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400">
                          No segments added yet. Add the first segment below (e.g. Opening Prayer, Praise & Worship).
                        </td>
                      </tr>
                    ) : (
                      computedItems.map((item, idx) => {
                        const Icon = ITEM_TYPE_ICONS[item.item_type] || CheckCircle2;
                        return (
                          <tr key={item.id || idx}>
                            <td className="text-center font-bold text-gray-400">{idx + 1}</td>
                            <td>
                              <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                                {item.computedTime}
                              </span>
                            </td>
                            <td>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full capitalize text-[11px] font-semibold bg-gray-100 text-gray-700">
                                <Icon size={11} /> {item.item_type}
                              </span>
                            </td>
                            <td>
                              <input
                                className="input py-1 px-2 text-xs font-semibold h-8"
                                value={item.title || ''}
                                onChange={e => {
                                  const copy = [...timelineItems];
                                  copy[idx] = { ...copy[idx], title: e.target.value };
                                  setTimelineItems(copy);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                className="input py-1 px-2 text-xs h-8"
                                placeholder="Lead minister / unit"
                                value={item.minister_name || ''}
                                onChange={e => {
                                  const copy = [...timelineItems];
                                  copy[idx] = { ...copy[idx], minister_name: e.target.value };
                                  setTimelineItems(copy);
                                }}
                              />
                            </td>
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  className="input py-1 px-2 text-xs w-16 text-center h-8 font-bold"
                                  value={item.duration_minutes || 10}
                                  onChange={e => {
                                    const copy = [...timelineItems];
                                    copy[idx] = { ...copy[idx], duration_minutes: parseInt(e.target.value) || 0 };
                                    setTimelineItems(copy);
                                  }}
                                />
                                <span className="text-gray-400 text-[10px]">m</span>
                              </div>
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveTimelineItem(idx, -1)}
                                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
                                  title="Move Up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === computedItems.length - 1}
                                  onClick={() => handleMoveTimelineItem(idx, 1)}
                                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
                                  title="Move Down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimelineItem(idx)}
                                  className="p-1 rounded hover:bg-red-50 text-red-500"
                                  title="Remove Item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Item Form */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Add Service Segment</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      className="input text-xs h-9"
                      placeholder="Segment title (e.g. Praise & Worship)"
                      value={newItem.title}
                      onChange={e => setNewItem(n => ({ ...n, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <select
                      className="input text-xs h-9"
                      value={newItem.item_type}
                      onChange={e => setNewItem(n => ({ ...n, item_type: e.target.value }))}
                    >
                      <option value="prayer">Prayer</option>
                      <option value="worship">Worship / Praise</option>
                      <option value="word">The Word / Sermon</option>
                      <option value="giving">Offering / Tithes</option>
                      <option value="announcement">Announcements</option>
                      <option value="special">Special Ministration</option>
                      <option value="general">General Segment</option>
                    </select>
                  </div>
                  <div>
                    <input
                      className="input text-xs h-9"
                      placeholder="Minister / Team"
                      value={newItem.minister_name}
                      onChange={e => setNewItem(n => ({ ...n, minister_name: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="input text-xs h-9 w-20 text-center font-bold"
                      placeholder="Mins"
                      value={newItem.duration_minutes}
                      onChange={e => setNewItem(n => ({ ...n, duration_minutes: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={handleAddTimelineItem}
                      className="btn-primary text-xs h-9 flex-1"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Volunteer Roster & Scheduling Modal ── */}
      <Modal
        open={showVolunteersModal}
        onClose={() => setShowVolunteersModal(false)}
        title={volunteerPlan ? `Volunteer Roster: ${volunteerPlan.title}` : 'Volunteer Roster'}
        size="xl"
        footer={<button onClick={() => setShowVolunteersModal(false)} className="btn-secondary">Close</button>}
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Details */}
          {volunteerPlan && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
              <span className="flex items-center gap-1.5 font-bold">
                <CalendarDays size={14} /> {volunteerPlan.service_date ? format(new Date(volunteerPlan.service_date), 'EEE, MMMM d, yyyy') : ''} • {volunteerPlan.start_time?.substring(0, 5) || '09:00'}
              </span>
              <span>{volunteerList.length} volunteers scheduled for duty</span>
            </div>
          )}

          {/* Volunteer Roster Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="crm-table text-xs">
              <thead>
                <tr>
                  <th>Role / Duty</th>
                  <th>Assigned Volunteer</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Reminder Sent</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {volunteerList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No volunteers assigned yet. Use the assignment form below to schedule workers.
                    </td>
                  </tr>
                ) : (
                  volunteerList.map(vol => (
                    <tr key={vol.id}>
                      <td>
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Shield size={12} className="text-purple-600" />
                          {vol.role_title}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-semibold text-gray-800">{vol.first_name} {vol.last_name}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{vol.membership_status || 'Member'}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5 text-[11px] text-gray-500">
                          {vol.phone && <span>{vol.phone}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge uppercase text-[10px] font-bold ${
                          vol.status === 'confirmed' ? 'badge-green' :
                          vol.status === 'declined' ? 'badge-red' :
                          'badge-yellow'
                        }`}>
                          {vol.status}
                        </span>
                      </td>
                      <td className="text-gray-400 text-[11px]">
                        {vol.reminder_sent_at ? format(new Date(vol.reminder_sent_at), 'MMM d, h:mm a') : 'Not sent yet'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemindVolunteer(vol.id)}
                            disabled={remindingVolunteerId === vol.id}
                            className="btn-secondary btn-sm text-xs flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            title="Send shift reminder via WhatsApp"
                          >
                            {remindingVolunteerId === vol.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <MessageCircle size={12} />
                            )}
                            <span>Remind</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVolunteer(vol.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            title="Remove Volunteer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Volunteer Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Assign Member to Duty</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Role Title *</label>
                <input
                  className="input text-xs"
                  placeholder="e.g. Head Usher, Sound Engineer, Choir Lead"
                  value={newVolunteer.role_title}
                  onChange={e => setNewVolunteer(v => ({ ...v, role_title: e.target.value }))}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Head Usher', 'Audio/Sound', 'Choir Lead', 'Media/Slides', 'Greeter', 'Altar Minister'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewVolunteer(v => ({ ...v, role_title: preset }))}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Select Member *</label>
                <select
                  className="input text-xs"
                  value={newVolunteer.member_id}
                  onChange={e => setNewVolunteer(v => ({ ...v, member_id: e.target.value }))}
                >
                  <option value="">Select a church member...</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Duty Notes (Optional)</label>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    placeholder="e.g. Arrive by 8:30 AM"
                    value={newVolunteer.notes}
                    onChange={e => setNewVolunteer(v => ({ ...v, notes: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleAddVolunteer}
                    disabled={savingVolunteer}
                    className="btn-primary text-xs h-9 px-3"
                  >
                    {savingVolunteer ? <Loader2 size={13} className="animate-spin" /> : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

