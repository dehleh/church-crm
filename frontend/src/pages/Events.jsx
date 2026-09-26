import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Plus, Search, Users, Clock, MapPin, Video, Loader2,
  CheckSquare, QrCode, Bell, MessageCircle, Mail, Phone, Edit3, Trash2,
  Image, Sparkles, Send, CheckCircle2, ChevronRight
} from 'lucide-react';
import { eventsAPI, branchesAPI } from '../api/services';
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

export default function Events() {
  const { user } = useAuth();
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
    </div>
  );
}
