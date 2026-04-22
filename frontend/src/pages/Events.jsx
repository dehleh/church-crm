import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Search, Users, Clock, MapPin, Video, Loader2, CheckSquare, QrCode } from 'lucide-react';
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
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
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
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);
  useEffect(() => { branchesAPI.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title || !form.startDatetime) return toast.error('Title and start date/time are required');
    setSaving(true);
    try {
      await eventsAPI.create(form);
      toast.success('Event created!');
      setModal(null); fetchEvents(1);
    } catch { toast.error('Failed to create event'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="text-gray-500 text-sm mt-1">Manage services, programs, and activities</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> Create Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Upcoming', value: stats.upcoming, color: 'text-brand-600' },
          { label: 'This Month', value: stats.this_month, color: 'text-purple-600' },
          { label: 'Avg Attendance', value: Math.round(stats.avg_attendance || 0), color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search events…"
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
            <p className="text-gray-500 font-medium">No events yet</p>
            <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Create Event</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr><th>Event</th><th>Type</th><th>Date & Time</th><th>Location</th><th>Attendance</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">{ev.title}</p>
                      <p className="text-xs text-gray-400">{ev.branch_name || 'All branches'}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`badge capitalize ${TYPE_BADGE[ev.event_type] || 'badge-gray'}`}>
                      {ev.event_type?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-sm text-gray-700"><CalendarDays size={12} className="text-gray-400" />
                        {ev.start_datetime ? format(parseISO(ev.start_datetime), 'MMM d, yyyy') : '—'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />
                        {ev.start_datetime ? format(parseISO(ev.start_datetime), 'h:mm a') : '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {ev.is_online
                      ? <span className="flex items-center gap-1 text-xs text-purple-600"><Video size={12} /> Online</span>
                      : ev.location
                        ? <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={12} />{ev.location}</span>
                        : '—'}
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <Users size={13} className="text-gray-400" />
                      {ev.attendance_count || 0}
                      {ev.expected_attendance ? <span className="text-gray-400 text-xs">/ {ev.expected_attendance}</span> : ''}
                    </span>
                  </td>
                  <td><span className={`badge capitalize ${STATUS_BADGE[ev.status] || 'badge-gray'}`}>{ev.status}</span></td>
                  <td>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      {churchSlug && (
                        <button onClick={() => setShareEvent(ev)} className="flex items-center gap-1 text-xs text-amber-600 hover:underline font-medium">
                          <QrCode size={13} /> QR Check-in
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/events/${ev.id}/attendance`)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                      >
                        <CheckSquare size={13} /> Mark
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

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Create New Event" size="lg"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Create Event'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Event Title *</label><input className="input" placeholder="Sunday Service, Easter Concert…" value={form.title || ''} onChange={set('title')} /></div>
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
            <div><label className="label">Start Date & Time *</label><input type="datetime-local" className="input" value={form.startDatetime || ''} onChange={set('startDatetime')} /></div>
            <div><label className="label">End Date & Time</label><input type="datetime-local" className="input" value={form.endDatetime || ''} onChange={set('endDatetime')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Location</label><input className="input" placeholder="Main Auditorium" value={form.location || ''} onChange={set('location')} /></div>
            <div><label className="label">Expected Attendance</label><input type="number" className="input" placeholder="500" value={form.expectedAttendance || ''} onChange={set('expectedAttendance')} /></div>
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <input type="checkbox" checked={form.isOnline || false} onChange={e => setForm(f => ({ ...f, isOnline: e.target.checked }))} />
              Online Event
            </label>
          </div>
          {form.isOnline && <div><label className="label">Online Link</label><input className="input" placeholder="https://meet.google.com/…" value={form.onlineLink || ''} onChange={set('onlineLink')} /></div>}
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description || ''} onChange={set('description')} /></div>
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
