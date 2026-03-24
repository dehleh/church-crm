import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Check, Users, Save, Loader2, CalendarDays, ChevronRight } from 'lucide-react';
import { eventsAPI, membersAPI } from '../api/services';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

function EventPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsAPI.list({ limit: 50, status: 'upcoming' })
      .then(r => setEvents(r.data.data))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="page-title mb-2">Mark Attendance</h1>
      <p className="text-gray-500 text-sm mb-6">Select an event to record attendance for</p>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : events.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No upcoming events</p>
          <p className="text-gray-400 text-sm">Create events first, then mark attendance here</p>
          <button onClick={() => navigate('/events')} className="btn-primary mt-4 inline-flex">Go to Events</button>
        </div>
      ) : (
        <div className="table-wrapper">
          {events.map(ev => (
            <button key={ev.id} onClick={() => navigate(`/events/${ev.id}/attendance`)}
              className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-brand-50/40 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <CalendarDays size={18} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{ev.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ev.start_datetime ? format(parseISO(ev.start_datetime), 'MMM d, yyyy · h:mm a') : ''}
                  {ev.branch_name ? ` · ${ev.branch_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="flex items-center gap-1 text-sm text-gray-500"><Users size={13} />{ev.attendance_count || 0} checked in</span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { eventId } = useParams();
  if (!eventId) return <EventPicker />;
  return <AttendanceRecorder eventId={eventId} />;
}

function AttendanceRecorder({ eventId }) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [existing, setExisting] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, attendanceRes, evRes] = await Promise.all([
        membersAPI.list({ limit: 500, status: 'active' }),
        eventsAPI.getAttendance(eventId),
        eventsAPI.list({ limit: 100 }),
      ]);
      const ev = evRes.data.data.find(e => e.id === eventId);
      setEvent(ev);
      setMembers(membersRes.data.data);
      const existingIds = new Set(attendanceRes.data.data.map(a => a.member_id).filter(Boolean));
      setExisting(existingIds);
      setChecked(new Set(existingIds));
    } catch { toast.error('Failed to load attendance data'); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)
      || (m.member_number || '').toLowerCase().includes(q)
      || (m.phone || '').includes(q);
  });

  const toggle = (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (!existing.has(id)) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setChecked(new Set(filtered.map(m => m.id)));
  const clearAll = () => setChecked(new Set(existing));

  const handleSave = async () => {
    const newIds = [...checked].filter(id => !existing.has(id));
    if (newIds.length === 0) return toast('No new check-ins to record', { icon: 'ℹ️' });
    setSaving(true);
    try {
      await eventsAPI.recordAttendance(eventId, { memberIds: newIds, checkInMethod: 'manual' });
      toast.success(`${newIds.length} attendance record(s) saved!`);
      fetchData();
    } catch { toast.error('Failed to save attendance'); }
    finally { setSaving(false); }
  };

  const getInitials = (fn, ln) => `${fn?.[0]||''}${ln?.[0]||''}`.toUpperCase();

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;

  const newCount = [...checked].filter(id => !existing.has(id)).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-5 transition-colors">
        <ArrowLeft size={16} /> Back to Events
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Mark Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">{event?.title || 'Event'}</p>
        </div>
        <button onClick={handleSave} disabled={saving || newCount === 0} className="btn-primary">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save {newCount > 0 ? `(${newCount} new)` : ''}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card py-3 px-4 text-center">
          <p className="text-2xl font-bold font-display text-brand-600">{checked.size}</p>
          <p className="text-xs text-gray-500 mt-0.5">Checked In</p>
        </div>
        <div className="card py-3 px-4 text-center">
          <p className="text-2xl font-bold font-display text-emerald-600">{existing.size}</p>
          <p className="text-xs text-gray-500 mt-0.5">Already Recorded</p>
        </div>
        <div className="card py-3 px-4 text-center">
          <p className="text-2xl font-bold font-display text-gray-700">{members.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Members</p>
        </div>
      </div>

      <div className="table-wrapper">
        {/* Search + controls */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search members…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={selectAll} className="btn-secondary btn-sm">Select All ({filtered.length})</button>
            <button onClick={clearAll} className="btn-secondary btn-sm">Clear New</button>
          </div>
        </div>

        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {filtered.map(m => {
            const isChecked = checked.has(m.id);
            const isExisting = existing.has(m.id);
            return (
              <div
                key={m.id}
                onClick={() => !isExisting && toggle(m.id)}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${isExisting ? 'bg-emerald-50/50 cursor-default' : 'hover:bg-brand-50/40 cursor-pointer'}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors
                  ${isExisting ? 'border-emerald-500 bg-emerald-500' : isChecked ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                  {(isChecked || isExisting) && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                  {getInitials(m.first_name, m.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-gray-400">{m.member_number} {m.branch_name ? `· ${m.branch_name}` : ''}</p>
                </div>
                {isExisting && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckSquare size={12} /> Recorded</span>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-gray-400">No members match your search</div>
          )}
        </div>
      </div>
    </div>
  );
}
