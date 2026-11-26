import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, Check, Users, Save, Loader2, CalendarDays, ChevronRight,
  ShieldCheck, Baby, Bell, Printer, KeyRound, AlertTriangle, Plus, Phone, UserCheck, X,
  Calculator, Globe, Minus, Sparkles, RotateCcw, CheckCircle2, BarChart3, Building2, Clock, Info
} from 'lucide-react';
import { eventsAPI, membersAPI, childCheckInAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

function EventPicker() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'sunday_service' | 'midweek' | 'special'
  const [creatingQuick, setCreatingQuick] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventsAPI.list({ limit: 50 });
      setEvents(res.data.data || []);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleQuickCreate = async (type) => {
    const isSunday = type === 'sunday_service';
    const now = new Date();
    const title = isSunday
      ? `Sunday Celebration Service — ${format(now, 'MMM d, yyyy')}`
      : `Midweek Service & Bible Study — ${format(now, 'MMM d, yyyy')}`;
    setCreatingQuick(true);
    try {
      const res = await eventsAPI.create({
        title,
        eventType: type,
        startDatetime: now.toISOString(),
        location: 'Main Auditorium',
        description: `Regular weekly ${isSunday ? 'Sunday celebration' : 'midweek'} service session.`,
        reminderEnabled: false,
      });
      toast.success(`${isSunday ? 'Sunday' : 'Midweek'} service session ready for check-in!`);
      navigate(`/events/${res.data.data.id}/attendance`);
    } catch {
      toast.error('Failed to create quick service session');
    } finally {
      setCreatingQuick(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (filterType === 'all') return true;
    if (filterType === 'sunday_service') return ev.event_type === 'sunday_service' || ev.title?.toLowerCase().includes('sunday');
    if (filterType === 'midweek') return ev.event_type === 'midweek' || ev.title?.toLowerCase().includes('midweek') || ev.title?.toLowerCase().includes('wednesday');
    return ev.event_type !== 'sunday_service' && ev.event_type !== 'midweek';
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Title & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title mb-1">Attendance & Child Check-In</h1>
          <p className="text-gray-500 text-sm">Select a weekly service or special event to record congregation attendance and secure child check-in</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleQuickCreate('sunday_service')}
            disabled={creatingQuick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            {creatingQuick ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={14} />}
            + Today's Sunday Service
          </button>
          <button
            onClick={() => handleQuickCreate('midweek')}
            disabled={creatingQuick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors"
          >
            {creatingQuick ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={14} />}
            + Today's Midweek Service
          </button>
          <button
            onClick={() => navigate('/events')}
            className="btn-secondary text-xs inline-flex"
          >
            <Plus size={14} /> Schedule Event
          </button>
        </div>
      </div>

      {/* Feature Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Calculator size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Rapid Usher Headcount</p>
            <p className="text-xs text-emerald-700 mt-0.5">For large crowds: ushers enter category tallies (Men, Women, Children, Visitors, Online) in 10 seconds without needing individual member phones.</p>
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Weekly Member Roster</p>
            <p className="text-xs text-blue-700 mt-0.5">Individual name-by-name attendance check-in. Auto-triggers pastoral care alerts if a member misses 3 consecutive weeks.</p>
          </div>
        </div>
        <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <Baby size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-900 uppercase tracking-wide">KidCheck Safeguarding</p>
            <p className="text-xs text-purple-700 mt-0.5">Fast family lookup, classroom routing, security claim tags, WhatsApp/SMS codes, and verified child pickup.</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'all', label: `All Services (${events.length})` },
          { id: 'sunday_service', label: 'Sunday Services' },
          { id: 'midweek', label: 'Midweek Services' },
          { id: 'special', label: 'Special Events & Conferences' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterType === tab.id
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
      ) : filteredEvents.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700 font-semibold text-base">No services found in this category</p>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">Click "+ Today's Sunday Service" or "+ Today's Midweek Service" above to start taking attendance immediately.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
          {filteredEvents.map(ev => {
            const isSunday = ev.event_type === 'sunday_service' || ev.title?.toLowerCase().includes('sunday');
            const isMidweek = ev.event_type === 'midweek' || ev.title?.toLowerCase().includes('midweek') || ev.title?.toLowerCase().includes('wednesday');
            const headcount = ev.actual_attendance || ev.attendance_count || 0;
            const bd = ev.attendance_breakdown && typeof ev.attendance_breakdown === 'object' ? ev.attendance_breakdown : null;
            return (
              <div key={ev.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSunday ? 'bg-blue-50 border border-blue-100 text-blue-600' : isMidweek ? 'bg-purple-50 border border-purple-100 text-purple-600' : 'bg-gray-50 border border-gray-100 text-gray-600'
                  }`}>
                    <CalendarDays size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">{ev.title}</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isSunday ? 'bg-blue-100 text-blue-700' : isMidweek ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isSunday ? 'Sunday' : isMidweek ? 'Midweek' : 'Event'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>{ev.start_datetime ? format(parseISO(ev.start_datetime), 'EEEE, MMM d, yyyy · h:mm a') : 'Scheduled Service'}</span>
                      {ev.branch_name && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px]">{ev.branch_name}</span>}
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <Calculator size={12} /> {headcount} Headcount
                      </span>
                      {bd && (Number(bd.men) > 0 || Number(bd.women) > 0) && (
                        <span className="text-[11px] text-gray-400">
                          ({bd.men || 0}M · {bd.women || 0}W · {bd.children || 0}C{bd.visitors ? ` · ${bd.visitors}V` : ''})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => navigate(`/events/${ev.id}/attendance?tab=headcount`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    <Calculator size={13} /> Usher Headcount
                  </button>
                  <button
                    onClick={() => navigate(`/events/${ev.id}/attendance?tab=general`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Users size={13} className="text-blue-600" /> Member Roster
                  </button>
                  <button
                    onClick={() => navigate(`/events/${ev.id}/attendance?tab=children`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    <Baby size={14} /> KidCheck
                  </button>
                </div>
              </div>
            );
          })}
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    urlTab === 'children' ? 'children' : urlTab === 'general' ? 'general' : 'headcount'
  );
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (urlTab === 'children' || urlTab === 'general' || urlTab === 'headcount') {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Usher Headcount State
  const [headcountForm, setHeadcountForm] = useState({
    men: 0,
    women: 0,
    children: 0,
    visitors: 0,
    online: 0,
    notes: '',
    countedBy: '',
    countingTiming: 'during_offering',
    sections: [
      { name: 'Main Sanctuary', count: 0 },
      { name: 'Balcony / Gallery', count: 0 },
      { name: 'Overflow Canopy / Hall B', count: 0 },
      { name: 'Children Wing', count: 0 },
    ]
  });
  const [showSections, setShowSections] = useState(false);
  const [savingHeadcount, setSavingHeadcount] = useState(false);

  // Sync headcount form when event is loaded
  useEffect(() => {
    if (event?.attendance_breakdown && typeof event.attendance_breakdown === 'object') {
      const bd = event.attendance_breakdown;
      setHeadcountForm(prev => ({
        ...prev,
        men: Number(bd.men || 0),
        women: Number(bd.women || 0),
        children: Number(bd.children || 0),
        visitors: Number(bd.visitors || 0),
        online: Number(bd.online || 0),
        notes: bd.notes || '',
        countedBy: bd.counted_by || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : ''),
        countingTiming: bd.counting_timing || prev.countingTiming,
        sections: Array.isArray(bd.sections) && bd.sections.length > 0 ? bd.sections : prev.sections,
      }));
      if (Array.isArray(bd.sections) && bd.sections.some(s => Number(s.count) > 0)) {
        setShowSections(true);
      }
    } else if (user && !headcountForm.countedBy) {
      setHeadcountForm(prev => ({
        ...prev,
        countedBy: `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }));
    }
  }, [event, user]);

  const handleStepCount = (field, delta) => {
    setHeadcountForm(prev => ({
      ...prev,
      [field]: Math.max(0, (Number(prev[field]) || 0) + delta)
    }));
  };

  const handleDirectCountChange = (field, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setHeadcountForm(prev => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num
    }));
  };

  const handleSectionCountChange = (idx, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setHeadcountForm(prev => {
      const nextSections = [...prev.sections];
      nextSections[idx] = { ...nextSections[idx], count: isNaN(num) ? 0 : num };
      return { ...prev, sections: nextSections };
    });
  };

  const totalInPerson = (Number(headcountForm.men) || 0) +
    (Number(headcountForm.women) || 0) +
    (Number(headcountForm.children) || 0) +
    (Number(headcountForm.visitors) || 0);
  const totalOverall = totalInPerson + (Number(headcountForm.online) || 0);

  const handleSaveHeadcount = async () => {
    setSavingHeadcount(true);
    try {
      const res = await eventsAPI.saveHeadcount(eventId, {
        ...headcountForm,
        totalInPerson,
        totalOverall
      });
      toast.success(res.data?.message || 'Headcount tally saved successfully!');
      if (res.data?.data) {
        setEvent(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save headcount tally');
    } finally {
      setSavingHeadcount(false);
    }
  };

  const handleResetHeadcount = () => {
    if (!window.confirm('Reset all headcount tallies for this service to zero?')) return;
    setHeadcountForm(prev => ({
      ...prev,
      men: 0,
      women: 0,
      children: 0,
      visitors: 0,
      online: 0,
      notes: '',
      sections: prev.sections.map(s => ({ ...s, count: 0 }))
    }));
  };

  // General Attendance State
  const [members, setMembers] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [existing, setExisting] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Child Check-In State
  const [childrenList, setChildrenList] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [childSearch, setChildSearch] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [activeClaimTag, setActiveClaimTag] = useState(null);

  // Child Check-in Form
  const [childForm, setChildForm] = useState({
    childName: '',
    classroom: 'Toddlers',
    parentName: '',
    parentPhone: '',
    allergiesMedical: '',
    notes: '',
  });
  const [submittingChild, setSubmittingChild] = useState(false);

  // Fast Family Lookup State
  const [familyLookupQuery, setFamilyLookupQuery] = useState('');
  const [familySearchResults, setFamilySearchResults] = useState([]);
  const [searchingFamily, setSearchingFamily] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedChildIds, setSelectedChildIds] = useState(new Set());
  const [checkInMode, setCheckInMode] = useState('family'); // 'family' | 'manual'

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [securityCodeInput, setSecurityCodeInput] = useState('');
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  // Paging Parent State
  const [pageTarget, setPageTarget] = useState(null);
  const [pageReason, setPageReason] = useState('Please attend to your child at the children wing.');
  const [paging, setPaging] = useState(false);

  const fetchGeneralData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, attendanceRes, evRes] = await Promise.all([
        membersAPI.list({ limit: 500, status: 'active' }),
        eventsAPI.getAttendance(eventId),
        eventsAPI.get(eventId).catch(() => eventsAPI.list({ limit: 100 })),
      ]);
      const ev = evRes.data?.data && !Array.isArray(evRes.data.data)
        ? evRes.data.data
        : (evRes.data?.data || []).find(e => e.id === eventId);
      setEvent(ev);
      setMembers(membersRes.data?.data || []);
      const existingIds = new Set((attendanceRes.data?.data || []).map(a => a.member_id).filter(Boolean));
      setExisting(existingIds);
      setChecked(new Set(existingIds));
    } catch {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchChildren = useCallback(async () => {
    setLoadingChildren(true);
    try {
      const res = await childCheckInAPI.list({ eventId, status: 'all' });
      setChildrenList(res.data.data || []);
    } catch {
      toast.error('Failed to load child check-in list');
    } finally {
      setLoadingChildren(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchGeneralData();
    fetchChildren();
  }, [fetchGeneralData, fetchChildren]);

  // General Attendance Handlers
  const filteredMembers = members.filter(m => {
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

  const selectAll = () => setChecked(new Set(filteredMembers.map(m => m.id)));
  const clearAll = () => setChecked(new Set(existing));

  const handleSaveGeneral = async () => {
    const newIds = [...checked].filter(id => !existing.has(id));
    if (newIds.length === 0) return toast('No new check-ins to record', { icon: 'ℹ️' });
    setSaving(true);
    try {
      await eventsAPI.recordAttendance(eventId, { memberIds: newIds, checkInMethod: 'manual' });
      toast.success(`${newIds.length} attendance record(s) saved!`);
      fetchGeneralData();
    } catch {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Child Check-In Handlers
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!childForm.childName.trim() || !childForm.parentName.trim() || !childForm.parentPhone.trim()) {
      return toast.error('Child name, parent name, and parent phone are required');
    }

    setSubmittingChild(true);
    try {
      const res = await childCheckInAPI.checkIn({
        eventId,
        ...childForm,
      });
      toast.success(res.data.message || 'Child checked in securely!');
      setActiveClaimTag(res.data.data);
      setShowCheckInModal(false);
      setShowTagModal(true);
      setChildForm({
        childName: '',
        classroom: 'Toddlers',
        parentName: '',
        parentPhone: '',
        allergiesMedical: '',
        notes: '',
      });
      fetchChildren();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in child');
    } finally {
      setSubmittingChild(false);
    }
  };

  const handleSearchFamily = async (e) => {
    if (e) e.preventDefault();
    if (!familyLookupQuery.trim()) return toast.error('Enter parent phone or name to lookup');
    setSearchingFamily(true);
    try {
      const res = await childCheckInAPI.familyLookup({ search: familyLookupQuery.trim(), eventId });
      const families = res.data.data || [];
      setFamilySearchResults(families);
      if (families.length === 0) {
        toast('No matching family found. You can enter details manually below.', { icon: 'ℹ️' });
      } else if (families.length === 1) {
        handleSelectFamily(families[0]);
      }
    } catch {
      toast.error('Failed to lookup family');
    } finally {
      setSearchingFamily(false);
    }
  };

  const handleSelectFamily = (fam) => {
    setSelectedFamily(fam);
    // Auto-select children who are not yet checked in
    const unChecked = new Set((fam.children || []).filter(c => !c.isCheckedIn).map(c => c.id));
    setSelectedChildIds(unChecked);
  };

  const toggleSelectChild = (childId) => {
    setSelectedChildIds(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const handleBulkCheckInFamily = async () => {
    if (!selectedFamily || selectedChildIds.size === 0) {
      return toast.error('Please select at least one child to check in');
    }
    const childrenToCheckIn = selectedFamily.children.filter(c => selectedChildIds.has(c.id));
    setSubmittingChild(true);
    try {
      let lastCreatedTag = null;
      for (const ch of childrenToCheckIn) {
        const res = await childCheckInAPI.checkIn({
          eventId,
          childName: ch.name,
          childMemberId: ch.id,
          classroom: ch.suggestedClassroom || 'Children',
          parentName: selectedFamily.parent.name,
          parentPhone: selectedFamily.parent.phone,
          parentMemberId: selectedFamily.parent.id,
          allergiesMedical: ch.allergiesMedical,
        });
        lastCreatedTag = res.data.data;
      }
      toast.success(`${childrenToCheckIn.length} child(ren) checked in securely! Security codes sent via SMS/WhatsApp.`);
      setActiveClaimTag(lastCreatedTag);
      setShowCheckInModal(false);
      setShowTagModal(true);
      setSelectedFamily(null);
      setFamilySearchResults([]);
      setFamilyLookupQuery('');
      fetchChildren();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in children');
    } finally {
      setSubmittingChild(false);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!securityCodeInput.trim()) {
      return toast.error('Please enter the security claim code');
    }

    setCheckingOut(true);
    try {
      const res = await childCheckInAPI.checkOut(checkoutTarget.id, {
        securityCode: securityCodeInput.trim(),
        pickupPersonName: pickupPersonName.trim() || checkoutTarget.parent_name,
      });
      toast.success(res.data.message || 'Child successfully checked out!');
      setCheckoutTarget(null);
      setSecurityCodeInput('');
      setPickupPersonName('');
      fetchChildren();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout verification failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePageParentSubmit = async (e) => {
    e.preventDefault();
    setPaging(true);
    try {
      const res = await childCheckInAPI.pageParent(pageTarget.id, { reason: pageReason });
      toast.success(res.data.message || 'Parent paged successfully via SMS and WhatsApp');
      setPageTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to page parent');
    } finally {
      setPaging(false);
    }
  };

  const filteredChildren = childrenList.filter(c => {
    const matchClass = classroomFilter === 'all' || c.classroom === classroomFilter;
    if (!matchClass) return false;
    if (!childSearch) return true;
    const q = childSearch.toLowerCase();
    return c.child_name.toLowerCase().includes(q)
      || c.parent_name.toLowerCase().includes(q)
      || c.security_code.toLowerCase().includes(q)
      || c.parent_phone.includes(q);
  });

  const checkedInChildren = childrenList.filter(c => c.status === 'checked_in');
  const checkedOutChildren = childrenList.filter(c => c.status === 'checked_out');

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;

  const newCount = [...checked].filter(id => !existing.has(id)).length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Title */}
      <div>
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-3 transition-colors">
          <ArrowLeft size={16} /> Back to Events
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">{event?.title || 'Event Attendance'}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {event?.start_datetime ? format(parseISO(event.start_datetime), 'EEEE, MMMM d, yyyy · h:mm a') : 'Service Session'}
            </p>
          </div>
          {activeTab === 'headcount' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetHeadcount}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
                title="Reset counters"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={handleSaveHeadcount}
                disabled={savingHeadcount}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1.5"
              >
                {savingHeadcount ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Headcount Tally
              </button>
            </div>
          ) : activeTab === 'general' ? (
            <button onClick={handleSaveGeneral} disabled={saving || newCount === 0} className="btn-primary">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Attendance {newCount > 0 ? `(${newCount} new)` : ''}
            </button>
          ) : (
            <button onClick={() => setShowCheckInModal(true)} className="btn-primary">
              <Plus size={16} /> Check In Child
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('headcount')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'headcount'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Calculator size={16} className={activeTab === 'headcount' ? 'text-emerald-600' : 'text-gray-400'} />
          <span>Usher Headcount ({totalInPerson > 0 ? totalInPerson : event?.actual_attendance || 0})</span>
        </button>
        <button
          onClick={() => handleTabChange('general')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'general'
              ? 'border-brand-600 text-brand-600 bg-brand-50/40'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={16} className={activeTab === 'general' ? 'text-brand-600' : 'text-gray-400'} />
          <span>Member Roster ({checked.size})</span>
        </button>
        <button
          onClick={() => handleTabChange('children')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'children'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheck size={16} className={activeTab === 'children' ? 'text-purple-600' : 'text-gray-400'} />
          <span>Child Safety & Security Tags ({checkedInChildren.length})</span>
        </button>
      </div>

      {/* ── TAB 1: RAPID USHER HEADCOUNT TALLY ── */}
      {activeTab === 'headcount' && (
        <div className="space-y-6">
          {/* Informational Guidance Alert */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calculator size={18} />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-emerald-950 uppercase tracking-wide text-[11px]">
                  Rapid Congregation Head Count & Service Tally
                </p>
                {event?.attendance_breakdown?.counted_at && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} /> Last recorded {format(parseISO(event.attendance_breakdown.counted_at), 'MMM d, h:mm a')}
                    {event.attendance_breakdown.counted_by ? ` by ${event.attendance_breakdown.counted_by}` : ''}
                  </span>
                )}
              </div>
              <p className="text-emerald-800 mt-1 leading-relaxed">
                Designed for large services where members don't need smartphones. Ushers walk the aisles during offering or sermon with handheld clickers, enter category totals or tap the step buttons below, and hit <strong>Save Headcount Tally</strong>.
              </p>
            </div>
          </div>

          {/* Demographic Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Adult Men */}
            <div className="card p-4 border-t-4 border-t-blue-500 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Users size={15} className="text-blue-600" /> Adult Men
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  {totalInPerson > 0 ? `${Math.round(((headcountForm.men || 0) / totalInPerson) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  className="input h-14 text-center font-display font-black text-3xl text-gray-900 tracking-tight"
                  value={headcountForm.men || ''}
                  placeholder="0"
                  onChange={e => handleDirectCountChange('men', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleStepCount('men', -1)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Minus 1"
                >
                  -1
                </button>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 50].map(step => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepCount('men', step)}
                      className="px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Adult Women */}
            <div className="card p-4 border-t-4 border-t-pink-500 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-900 flex items-center gap-1.5">
                  <Users size={15} className="text-pink-600" /> Adult Women
                </span>
                <span className="text-[10px] bg-pink-100 text-pink-800 font-semibold px-2 py-0.5 rounded-full">
                  {totalInPerson > 0 ? `${Math.round(((headcountForm.women || 0) / totalInPerson) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  className="input h-14 text-center font-display font-black text-3xl text-gray-900 tracking-tight"
                  value={headcountForm.women || ''}
                  placeholder="0"
                  onChange={e => handleDirectCountChange('women', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleStepCount('women', -1)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Minus 1"
                >
                  -1
                </button>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 50].map(step => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepCount('women', step)}
                      className="px-2 py-1 text-xs font-bold rounded bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 transition-colors"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Children & Youth */}
            <div className="card p-4 border-t-4 border-t-purple-500 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Baby size={15} className="text-purple-600" /> Children & Teens
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-full">
                  {totalInPerson > 0 ? `${Math.round(((headcountForm.children || 0) / totalInPerson) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  className="input h-14 text-center font-display font-black text-3xl text-gray-900 tracking-tight"
                  value={headcountForm.children || ''}
                  placeholder="0"
                  onChange={e => handleDirectCountChange('children', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleStepCount('children', -1)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Minus 1"
                >
                  -1
                </button>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 50].map(step => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepCount('children', step)}
                      className="px-2 py-1 text-xs font-bold rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* First-Time Guests */}
            <div className="card p-4 border-t-4 border-t-amber-500 space-y-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-600" /> First-Time Visitors
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  {totalInPerson > 0 ? `${Math.round(((headcountForm.visitors || 0) / totalInPerson) * 100)}%` : '0%'}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  className="input h-14 text-center font-display font-black text-3xl text-gray-900 tracking-tight"
                  value={headcountForm.visitors || ''}
                  placeholder="0"
                  onChange={e => handleDirectCountChange('visitors', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleStepCount('visitors', -1)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Minus 1"
                >
                  -1
                </button>
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 25].map(step => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepCount('visitors', step)}
                      className="px-2 py-1 text-xs font-bold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Summary Board */}
          <div className="card p-5 bg-gradient-to-br from-gray-900 to-slate-900 text-white rounded-2xl shadow-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
              <div className="text-center sm:text-left sm:pr-4">
                <p className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Users size={14} /> Total In-Person Congregation
                </p>
                <p className="text-4xl font-extrabold font-display text-white mt-1 tracking-tight">
                  {totalInPerson.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Men + Women + Children + Visitors</p>
              </div>

              <div className="text-center sm:text-left sm:px-4 pt-3 sm:pt-0">
                <p className="text-xs uppercase font-bold tracking-wider text-cyan-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <Globe size={14} /> Online Live Stream
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <input
                    type="number"
                    min="0"
                    className="w-28 h-10 px-2 text-center bg-gray-800/90 border border-gray-700 rounded-lg text-xl font-bold font-display text-cyan-200"
                    value={headcountForm.online || ''}
                    placeholder="0"
                    onChange={e => handleDirectCountChange('online', e.target.value)}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepCount('online', 10)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepCount('online', 50)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300"
                    >
                      +50
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">YouTube, Facebook & Zoom Viewers</p>
              </div>

              <div className="text-center sm:text-left sm:pl-4 pt-3 sm:pt-0">
                <p className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center justify-center sm:justify-start gap-1.5">
                  <BarChart3 size={14} /> Overall Attendance Total
                </p>
                <p className="text-4xl font-extrabold font-display text-purple-200 mt-1 tracking-tight">
                  {totalOverall.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">In-Person + Online Stream</p>
              </div>
            </div>

            {/* Proportion Bar */}
            {totalInPerson > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-800">
                <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden flex">
                  <div style={{ width: `${((headcountForm.men || 0) / totalInPerson) * 100}%` }} className="bg-blue-500 h-full" title="Men" />
                  <div style={{ width: `${((headcountForm.women || 0) / totalInPerson) * 100}%` }} className="bg-pink-500 h-full" title="Women" />
                  <div style={{ width: `${((headcountForm.children || 0) / totalInPerson) * 100}%` }} className="bg-purple-500 h-full" title="Children" />
                  <div style={{ width: `${((headcountForm.visitors || 0) / totalInPerson) * 100}%` }} className="bg-amber-500 h-full" title="Visitors" />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Men ({headcountForm.men || 0})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500 inline-block" /> Women ({headcountForm.women || 0})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Children ({headcountForm.children || 0})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Visitors ({headcountForm.visitors || 0})</span>
                </div>
              </div>
            )}
          </div>

          {/* Section & Audit Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audit & Timing Card */}
            <div className="card p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Clock size={14} className="text-gray-400" /> Count Accountability & Timing
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-[11px]">Counted By (Usher / Lead)</label>
                  <input
                    className="input text-xs"
                    placeholder="e.g. Bro Emmanuel (Head Usher)"
                    value={headcountForm.countedBy}
                    onChange={e => setHeadcountForm(prev => ({ ...prev, countedBy: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Counting Moment</label>
                  <select
                    className="input text-xs"
                    value={headcountForm.countingTiming}
                    onChange={e => setHeadcountForm(prev => ({ ...prev, countingTiming: e.target.value }))}
                  >
                    <option value="during_worship">During Praise & Worship</option>
                    <option value="during_offering">During 2nd Offering / Tithes</option>
                    <option value="during_sermon">During Sermon</option>
                    <option value="post_service">Post-Service Reconciliation</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label text-[11px]">Service Notes / Observations</label>
                <textarea
                  rows={2}
                  className="input text-xs"
                  placeholder="e.g. Heavy rainfall in the morning, youth anniversary special service"
                  value={headcountForm.notes}
                  onChange={e => setHeadcountForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Optional Multi-Section Breakdown */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" /> Hall / Section Breakdown (Optional)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSections(!showSections)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  {showSections ? 'Hide Sections' : 'Show Sections'}
                </button>
              </div>

              {showSections ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-500">Log counts by specific auditorium or overflow halls:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {headcountForm.sections.map((sec, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-lg text-xs">
                        <span className="font-medium text-gray-800 flex-1 truncate">{sec.name}</span>
                        <input
                          type="number"
                          min="0"
                          className="input h-8 w-24 text-center font-bold text-xs"
                          placeholder="0"
                          value={sec.count || ''}
                          onChange={e => handleSectionCountChange(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center text-xs text-gray-500 space-y-1">
                  <p>Have an overflow hall, gallery, or separate youth chapel?</p>
                  <button
                    type="button"
                    onClick={() => setShowSections(true)}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    Enable Multi-Section Hall Counts
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <Info size={16} className="text-brand-500 flex-shrink-0" />
              <span>
                Saving updates this service's official attendance across all church executive reports, charts, and dashboards.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetHeadcount}
                className="btn-secondary text-xs"
              >
                <RotateCcw size={13} /> Reset
              </button>
              <button
                type="button"
                onClick={handleSaveHeadcount}
                disabled={savingHeadcount}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-5 py-2.5 font-bold shadow-md"
              >
                {savingHeadcount ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Headcount Tally ({totalInPerson})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: GENERAL ATTENDANCE ── */}
      {activeTab === 'general' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
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
            <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3 bg-white">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9 py-2 h-9 text-sm"
                  placeholder="Search members…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 ml-auto">
                <button onClick={selectAll} className="btn-secondary btn-sm">Select All ({filteredMembers.length})</button>
                <button onClick={clearAll} className="btn-secondary btn-sm">Clear New</button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
              {filteredMembers.map(m => {
                const isChecked = checked.has(m.id);
                const isExisting = existing.has(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => !isExisting && toggle(m.id)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isExisting ? 'bg-emerald-50/50 cursor-default' : 'hover:bg-brand-50/40 cursor-pointer'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      isExisting ? 'border-emerald-500 bg-emerald-500' : isChecked ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                    }`}>
                      {(isChecked || isExisting) && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                      {getInitials(m.first_name, m.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{m.first_name} {m.last_name}</p>
                      <p className="text-xs text-gray-400">{m.member_number} {m.branch_name ? `· ${m.branch_name}` : ''}</p>
                    </div>
                    {isExisting && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><UserCheck size={12} /> Recorded</span>}
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="text-center py-10 text-gray-400">No members match your search</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CHILD SAFETY & SECURITY TAGS ── */}
      {activeTab === 'children' && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Baby size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-emerald-950">{checkedInChildren.length}</p>
                <p className="text-xs font-medium text-emerald-700">Active Children in Class</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-blue-950">{checkedOutChildren.length}</p>
                <p className="text-xs font-medium text-blue-700">Verified Pickups Today</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <KeyRound size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-purple-950">100%</p>
                <p className="text-xs font-medium text-purple-700">Security Code Protected</p>
              </div>
            </div>
          </div>

          {/* Classroom Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'Nursery', 'Toddlers', 'Primary', 'Pre-Teens', 'Teens'].map(cls => (
                <button
                  key={cls}
                  onClick={() => setClassroomFilter(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    classroomFilter === cls
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cls === 'all' ? 'All Classrooms' : cls}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-8 py-1.5 h-8 text-xs"
                placeholder="Search child, parent, code…"
                value={childSearch}
                onChange={e => setChildSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Children List */}
          {loadingChildren ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
          ) : filteredChildren.length === 0 ? (
            <div className="card text-center py-12">
              <Baby size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No children checked in for this classroom</p>
              <p className="text-gray-400 text-xs mt-1">Click "Check In Child" to record a new arrival and generate security claim tags</p>
              <button onClick={() => setShowCheckInModal(true)} className="btn-primary mt-4 inline-flex">
                <Plus size={15} /> Check In Child
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChildren.map(c => {
                const isCheckedIn = c.status === 'checked_in';
                return (
                  <div
                    key={c.id}
                    className={`card p-4 transition-all border ${
                      isCheckedIn ? 'border-gray-200 hover:border-brand-300 bg-white shadow-xs' : 'border-gray-100 bg-gray-50/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-base">{c.child_name}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                            {c.classroom}
                          </span>
                          {!isCheckedIn && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                              Checked Out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                          <span>Parent: <strong>{c.parent_name}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Phone size={11} />{c.parent_phone}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div
                          onClick={() => { setActiveClaimTag(c); setShowTagModal(true); }}
                          className="cursor-pointer bg-slate-900 text-amber-400 font-mono font-black text-sm px-3 py-1 rounded-lg border border-slate-700 shadow-xs hover:bg-slate-800 transition-colors inline-block"
                          title="Click to view & reprint security claim tag"
                        >
                          {c.security_code}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Claim Code</p>
                      </div>
                    </div>

                    {c.allergies_medical && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                        <span className="font-semibold">Medical / Allergy Alert:</span>
                        <span className="truncate">{c.allergies_medical}</span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {c.checked_in_at ? format(parseISO(c.checked_in_at), 'h:mm a') : ''}
                        {c.pickup_person_name ? ` · Picked up by ${c.pickup_person_name}` : ''}
                      </span>

                      {isCheckedIn ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setPageTarget(c); setPageReason('Please attend to your child at the children wing.'); }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold flex items-center gap-1 transition-colors"
                            title="Send instant WhatsApp and SMS to parent"
                          >
                            <Bell size={12} /> Page Parent
                          </button>
                          <button
                            onClick={() => { setCheckoutTarget(c); setSecurityCodeInput(''); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <KeyRound size={12} /> Check Out
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Check size={13} /> Securely Released
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: CHECK IN CHILD ── */}
      <Modal
        open={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        title="Child Safety & Safeguarding Check-In"
        size="lg"
        footer={<>
          <button onClick={() => setShowCheckInModal(false)} className="btn-secondary">Cancel</button>
          {checkInMode === 'family' ? (
            <button
              onClick={handleBulkCheckInFamily}
              disabled={submittingChild || !selectedFamily || selectedChildIds.size === 0}
              className="btn-primary"
            >
              {submittingChild ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              Check In Selected ({selectedChildIds.size})
            </button>
          ) : (
            <button onClick={handleCheckInSubmit} disabled={submittingChild} className="btn-primary">
              {submittingChild ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              Generate Security Tag
            </button>
          )}
        </>}
      >
        <div className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCheckInMode('family')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                checkInMode === 'family' ? 'bg-white text-brand-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ⚡ Fast Family Phone Lookup
            </button>
            <button
              type="button"
              onClick={() => setCheckInMode('manual')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                checkInMode === 'manual' ? 'bg-white text-brand-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📝 Manual / First-Timer Entry
            </button>
          </div>

          {checkInMode === 'family' ? (
            <div className="space-y-4">
              {/* Parent Phone / Name Search */}
              <form onSubmit={handleSearchFamily} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input pl-9 text-xs sm:text-sm"
                    placeholder="Enter parent phone number (e.g. 080...) or name…"
                    value={familyLookupQuery}
                    onChange={e => setFamilyLookupQuery(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchingFamily}
                  className="btn-primary text-xs whitespace-nowrap px-4"
                >
                  {searchingFamily ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Lookup Family
                </button>
              </form>

              {/* Family Results */}
              {familySearchResults.length > 1 && !selectedFamily && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Family:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {familySearchResults.map(fam => (
                      <div
                        key={fam.parent.id}
                        onClick={() => handleSelectFamily(fam)}
                        className="p-3 rounded-xl border border-gray-200 hover:border-brand-500 hover:bg-brand-50/30 cursor-pointer transition"
                      >
                        <p className="font-bold text-sm text-gray-900">{fam.parent.name}</p>
                        <p className="text-xs text-gray-500">{fam.parent.phone}</p>
                        <p className="text-[11px] text-brand-600 font-semibold mt-1">{fam.children.length} child(ren) registered</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Family Details & Children Checkboxes */}
              {selectedFamily && (
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Family Account</p>
                      <h4 className="text-sm font-bold text-gray-900">{selectedFamily.parent.name}</h4>
                      <p className="text-xs text-gray-500">{selectedFamily.parent.phone}</p>
                    </div>
                    {familySearchResults.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedFamily(null)}
                        className="text-xs text-brand-600 font-semibold hover:underline"
                      >
                        Change Family
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Select Children to Check In:</p>
                    {selectedFamily.children.length === 0 ? (
                      <div className="p-4 bg-white rounded-xl text-center text-xs text-gray-500">
                        No registered children found under this family. You can switch to manual entry above.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedFamily.children.map(child => {
                          const isSelected = selectedChildIds.has(child.id);
                          const isAlreadyIn = child.isCheckedIn;

                          return (
                            <div
                              key={child.id}
                              onClick={() => !isAlreadyIn && toggleSelectChild(child.id)}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                                isAlreadyIn
                                  ? 'bg-gray-100/80 border-gray-200 cursor-not-allowed opacity-75'
                                  : isSelected
                                  ? 'bg-white border-brand-500 shadow-xs cursor-pointer ring-1 ring-brand-500'
                                  : 'bg-white border-gray-200 hover:border-gray-300 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                                  isAlreadyIn ? 'border-gray-400 bg-gray-400 text-white' : isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300'
                                }`}>
                                  {(isSelected || isAlreadyIn) && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-900">{child.name}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                                      {child.suggestedClassroom}
                                    </span>
                                    {child.age != null && (
                                      <span className="text-[10px] text-gray-500">
                                        ({child.age} yrs)
                                      </span>
                                    )}
                                  </div>
                                  {child.allergiesMedical && (
                                    <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-0.5">
                                      <AlertTriangle size={11} /> Allergies: {child.allergiesMedical}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                {isAlreadyIn ? (
                                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                    Checked In ({child.checkIn?.security_code})
                                  </span>
                                ) : (
                                  <span className="text-xs text-brand-600 font-semibold">
                                    {isSelected ? 'Ready' : 'Click to Select'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="label">Child Full Name *</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Samuel Adebayo"
                  value={childForm.childName}
                  onChange={e => setChildForm(f => ({ ...f, childName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Classroom / Ministry Room *</label>
                  <select
                    className="input"
                    value={childForm.classroom}
                    onChange={e => setChildForm(f => ({ ...f, classroom: e.target.value }))}
                  >
                    <option value="Nursery">Nursery / Crèche (0 - 2 yrs)</option>
                    <option value="Toddlers">Toddlers (2 - 4 yrs)</option>
                    <option value="Primary">Children's Church (5 - 8 yrs)</option>
                    <option value="Pre-Teens">Pre-Teens (9 - 12 yrs)</option>
                    <option value="Teens">Teens Church (13 - 17 yrs)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Parent / Guardian Name *</label>
                  <input
                    required
                    className="input"
                    placeholder="e.g. David Adebayo"
                    value={childForm.parentName}
                    onChange={e => setChildForm(f => ({ ...f, parentName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Parent Contact Phone *</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. +2348012345678"
                  value={childForm.parentPhone}
                  onChange={e => setChildForm(f => ({ ...f, parentPhone: e.target.value }))}
                />
              </div>

              <div>
                <label className="label text-amber-700">Allergies / Special Medical Notes</label>
                <textarea
                  rows={2}
                  className="input border-amber-300 focus:ring-amber-500"
                  placeholder="e.g. Peanut allergy, Asthma inhaler with teacher, Vegetarian diet only"
                  value={childForm.allergiesMedical}
                  onChange={e => setChildForm(f => ({ ...f, allergiesMedical: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Special Instructions / General Notes</label>
                <input
                  className="input"
                  placeholder="e.g. Mother will pick up after choir practice"
                  value={childForm.notes}
                  onChange={e => setChildForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ── MODAL 2: PRINTABLE SECURITY CLAIM TAG ── */}
      <Modal
        open={showTagModal}
        onClose={() => setShowTagModal(false)}
        title="Security Claim Tag (KidCheck Safeguard)"
        size="md"
        footer={<>
          <button onClick={() => setShowTagModal(false)} className="btn-secondary">Close</button>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer size={15} /> Print Badge & Claim Receipt
          </button>
        </>}
      >
        {activeClaimTag && (
          <div className="space-y-4">
            {/* Tag Preview */}
            <div className="p-6 bg-slate-950 text-white rounded-2xl border-2 border-amber-400/50 shadow-xl text-center space-y-4 print:border-black print:text-black print:bg-white">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold border-b border-white/10 pb-2">
                <span>CHILD SAFETY CLAIM RECEIPT</span>
                <span>{event?.title}</span>
              </div>

              <div>
                <p className="text-3xl font-black font-display tracking-tight text-white">{activeClaimTag.child_name}</p>
                <p className="text-sm text-brand-300 font-medium mt-1">Classroom: {activeClaimTag.classroom}</p>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-white/10">
                <p className="text-xs uppercase tracking-widest text-gray-400">Authorized Pickup Claim Code</p>
                <p className="text-5xl font-mono font-black text-amber-400 tracking-wider my-2">
                  {activeClaimTag.security_code}
                </p>
                <p className="text-[11px] text-gray-400">Must be presented upon child pickup</p>
              </div>

              <div className="text-xs text-left text-gray-400 space-y-1 pt-2 border-t border-white/10">
                <p>Parent: <strong className="text-white">{activeClaimTag.parent_name}</strong> ({activeClaimTag.parent_phone})</p>
                {activeClaimTag.allergies_medical && (
                  <p className="text-amber-400 font-medium">⚠️ Medical Alert: {activeClaimTag.allergies_medical}</p>
                )}
                <p>Checked In: {activeClaimTag.checked_in_at ? format(parseISO(activeClaimTag.checked_in_at), 'MMM d, yyyy · h:mm a') : 'Now'}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Hand this claim receipt to the parent or send the code to their phone. Child will only be released when this exact security code is matched.
            </p>
          </div>
        )}
      </Modal>

      {/* ── MODAL 3: SECURE CHECKOUT VERIFICATION ── */}
      <Modal
        open={Boolean(checkoutTarget)}
        onClose={() => setCheckoutTarget(null)}
        title="Secure Child Pickup Verification"
        size="md"
        footer={<>
          <button onClick={() => setCheckoutTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleCheckoutSubmit} disabled={checkingOut} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
            {checkingOut ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            Verify Code & Check Out
          </button>
        </>}
      >
        {checkoutTarget && (
          <form onSubmit={handleCheckoutSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                To ensure child safeguarding, verify the parent's claim receipt code before releasing <strong>{checkoutTarget.child_name}</strong>.
              </span>
            </div>

            <div>
              <label className="label">Enter Security Claim Code *</label>
              <input
                required
                autoFocus
                className="input uppercase font-mono font-bold text-center tracking-widest text-2xl h-14"
                placeholder="e.g. K724"
                maxLength={8}
                value={securityCodeInput}
                onChange={e => setSecurityCodeInput(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-gray-400 mt-1 text-center">4-character code from parent claim tag</p>
            </div>

            <div>
              <label className="label">Pickup Person Name</label>
              <input
                className="input"
                placeholder={checkoutTarget.parent_name}
                value={pickupPersonName}
                onChange={e => setPickupPersonName(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">Defaults to parent name if unchanged</p>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL 4: PAGE PARENT ── */}
      <Modal
        open={Boolean(pageTarget)}
        onClose={() => setPageTarget(null)}
        title="Page Parent via WhatsApp & SMS"
        size="md"
        footer={<>
          <button onClick={() => setPageTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handlePageParentSubmit} disabled={paging} className="btn-primary bg-amber-600 hover:bg-amber-700">
            {paging ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
            Send Emergency Page
          </button>
        </>}
      >
        {pageTarget && (
          <form onSubmit={handlePageParentSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              Paging <strong>{pageTarget.parent_name}</strong> ({pageTarget.parent_phone}) regarding <strong>{pageTarget.child_name}</strong> in {pageTarget.classroom}.
            </div>

            <div>
              <label className="label">Reason / Message to Parent</label>
              <textarea
                required
                rows={3}
                className="input"
                value={pageReason}
                onChange={e => setPageReason(e.target.value)}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
