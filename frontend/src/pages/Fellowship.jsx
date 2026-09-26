import { useState, useEffect } from 'react';
import {
  Home, MapPin, Users, Calendar, Plus, Search, Filter,
  CheckCircle2, Clock, DollarSign, HeartHandshake, ShieldAlert,
  ChevronRight, AlertCircle, Sparkles, Navigation, Check, X,
  Edit2, Trash2, UserPlus, FileText, Settings, Award, Layers,
  Phone, Mail, ArrowRight, Loader2, RefreshCw
} from 'lucide-react';
import { fellowshipAPI, membersAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function Fellowship() {
  const [activeTab, setActiveTab] = useState('centers');
  const [stats, setStats] = useState(null);
  const [terms, setTerms] = useState({
    systemName: 'House Fellowship',
    singularTerm: 'Fellowship Center',
    pluralTerm: 'Fellowship Centers',
    zoneTerm: 'Zone',
  });
  const [loading, setLoading] = useState(true);

  // Centers Tab State
  const [centers, setCenters] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [centerSearch, setCenterSearch] = useState('');
  const [modal, setModal] = useState(null); // 'center_new' | 'center_edit' | 'center_roster' | 'zone_new' | 'zone_edit' | 'report_new'
  const [activeCenter, setActiveCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Roster State
  const [rosterMembers, setRosterMembers] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');

  // Proximity Matching State
  const [unassigned, setUnassigned] = useState([]);
  const [selectedUnassigned, setSelectedUnassigned] = useState(null);
  const [matchedCenters, setMatchedCenters] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [customSearchAddress, setCustomSearchAddress] = useState('');

  // Weekly Reports State
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportForm, setReportForm] = useState({});

  // Join Requests State
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes, cRes, zRes] = await Promise.all([
        fellowshipAPI.stats(),
        fellowshipAPI.getSettings(),
        fellowshipAPI.centers(),
        fellowshipAPI.zones(),
      ]);
      setStats(sRes.data.data);
      setTerms(tRes.data.data);
      setSettingsForm(tRes.data.data);
      setCenters(cRes.data.data);
      setZones(zRes.data.data);
    } catch {
      toast.error('Failed to load fellowship data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    membersAPI.list({ limit: 500 }).then(r => setAllMembers(r.data.data || [])).catch(() => {});
  }, []);

  // Refresh tab specific data
  useEffect(() => {
    if (activeTab === 'proximity') {
      fellowshipAPI.unassignedMembers().then(r => setUnassigned(r.data.data || [])).catch(() => {});
    } else if (activeTab === 'reports') {
      setReportsLoading(true);
      fellowshipAPI.reports().then(r => setReports(r.data.data || [])).catch(() => {}).finally(() => setReportsLoading(false));
    } else if (activeTab === 'requests') {
      setRequestsLoading(true);
      fellowshipAPI.joinRequests().then(r => setJoinRequests(r.data.data || [])).catch(() => {}).finally(() => setRequestsLoading(false));
    }
  }, [activeTab]);

  // Center Operations
  const handleSaveCenter = async (e) => {
    e.preventDefault();
    if (!centerForm.name || !centerForm.hostAddress) {
      return toast.error('Center name and host address are required');
    }
    setSaving(true);
    try {
      if (modal === 'center_edit') {
        await fellowshipAPI.updateCenter(activeCenter.id, centerForm);
        toast.success(`${terms.singularTerm} updated!`);
      } else {
        await fellowshipAPI.createCenter(centerForm);
        toast.success(`${terms.singularTerm} created!`);
      }
      setModal(null);
      loadAll();
    } catch {
      toast.error('Failed to save center');
    } finally {
      setSaving(false);
    }
  };

  const openRoster = async (center) => {
    setActiveCenter(center);
    setModal('center_roster');
    setRosterLoading(true);
    try {
      const res = await fellowshipAPI.centerMembers(center.id);
      setRosterMembers(res.data.data || []);
    } catch {
      toast.error('Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleAddMemberToCenter = async () => {
    if (!addMemberId) return toast.error('Select a member');
    try {
      await fellowshipAPI.addMember(activeCenter.id, { memberId: addMemberId, role: addMemberRole });
      toast.success('Member assigned to center');
      setAddMemberId('');
      const res = await fellowshipAPI.centerMembers(activeCenter.id);
      setRosterMembers(res.data.data || []);
      loadAll();
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await fellowshipAPI.removeMember(activeCenter.id, memberId);
      toast.success('Member removed');
      setRosterMembers(prev => prev.filter(m => m.id !== memberId));
      loadAll();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  // Proximity Match
  const runProximityMatch = async (member, customAddress) => {
    setMatchingLoading(true);
    try {
      const payload = member ? { memberId: member.id } : { address: customAddress };
      const res = await fellowshipAPI.proximityMatch(payload);
      setMatchedCenters(res.data.data || []);
    } catch {
      toast.error('Proximity matching failed');
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleQuickAssign = async (centerId, memberId) => {
    try {
      await fellowshipAPI.addMember(centerId, { memberId });
      toast.success('Member successfully assigned to nearest center!');
      setUnassigned(prev => prev.filter(m => m.id !== memberId));
      setSelectedUnassigned(null);
      setMatchedCenters([]);
      loadAll();
    } catch {
      toast.error('Failed to assign member');
    }
  };

  // Submit Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.centerId || !reportForm.meetingDate) {
      return toast.error('Select center and meeting date');
    }
    setSaving(true);
    try {
      await fellowshipAPI.submitReport(reportForm);
      toast.success('Weekly report submitted!');
      setModal(null);
      setReportForm({});
      fellowshipAPI.reports().then(r => setReports(r.data.data || []));
      loadAll();
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  // Review Join Request
  const handleReviewRequest = async (id, status) => {
    try {
      await fellowshipAPI.reviewJoinRequest(id, { status });
      toast.success(`Request ${status}!`);
      fellowshipAPI.joinRequests().then(r => setJoinRequests(r.data.data || []));
      loadAll();
    } catch {
      toast.error('Failed to process request');
    }
  };

  // Save Terminology
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fellowshipAPI.updateSettings(settingsForm);
      toast.success('Terminology & settings updated!');
      loadAll();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredCenters = centers.filter(c => {
    const matchesZone = !selectedZone || c.zone_id === selectedZone;
    const matchesSearch = !centerSearch ||
      c.name.toLowerCase().includes(centerSearch.toLowerCase()) ||
      (c.host_address && c.host_address.toLowerCase().includes(centerSearch.toLowerCase())) ||
      (c.leader_name && c.leader_name.toLowerCase().includes(centerSearch.toLowerCase()));
    return matchesZone && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-brand-600 font-semibold">{terms.systemName}</span>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-brand-50 text-brand-700 font-medium border border-brand-200">
              Proximity & Cluster System
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mt-1">{terms.pluralTerm}</h1>
          <p className="text-sm text-gray-500">
            Organize members living in close proximity into vibrant local fellowship and care centers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setCenterForm({
                meetingDay: terms.meetingDay || 'Wednesday',
                meetingTime: terms.meetingTime || '18:30',
                maxCapacity: terms.defaultCapacity || 15,
                meetingFrequency: 'weekly',
              });
              setModal('center_new');
            }}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> New {terms.singularTerm}
          </button>
          <button
            onClick={() => {
              setReportForm({ meetingDate: new Date().toISOString().split('T')[0] });
              setModal('report_new');
            }}
            className="btn-outline inline-flex items-center gap-1.5"
          >
            <FileText size={16} /> Submit Report
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Active {terms.pluralTerm}</span>
            <Home size={18} className="text-brand-600" />
          </div>
          <div className="text-2xl font-bold font-display text-gray-900 mt-2">{stats?.activeCenters || 0}</div>
          <div className="text-xs text-gray-400 mt-1">{stats?.totalCenters || 0} total registered</div>
        </div>

        <div className="card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Enrolled Members</span>
            <Users size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-display text-gray-900 mt-2">{stats?.enrolledMembers || 0}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">In active cells</div>
        </div>

        <div className="card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Unassigned Members</span>
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-600 mt-2">{stats?.unassignedMembers || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Needs proximity match</div>
        </div>

        <div className="card p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Avg Meeting Turnout</span>
            <Calendar size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-display text-gray-900 mt-2">{stats?.avgAttendancePerMeeting || 0}</div>
          <div className="text-xs text-gray-400 mt-1">Per fellowship meeting</div>
        </div>

        <div className="card p-4 border-l-4 border-l-purple-500 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Pending Join Requests</span>
            <HeartHandshake size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-display text-purple-600 mt-2">{stats?.pendingJoinRequests || 0}</div>
          <div className="text-xs text-gray-400 mt-1">From member portal</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto text-sm font-medium">
          {[
            { id: 'centers', label: `${terms.pluralTerm} (${centers.length})`, icon: Home },
            { id: 'proximity', label: `Proximity Match (${stats?.unassignedMembers || 0} unassigned)`, icon: Navigation },
            { id: 'reports', label: 'Weekly Reports', icon: FileText },
            { id: 'zones', label: `${terms.zoneTerm}s / Districts (${zones.length})`, icon: Layers },
            { id: 'requests', label: `Join Requests (${stats?.pendingJoinRequests || 0})`, icon: UserPlus },
            { id: 'settings', label: 'Custom Terminology', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-brand-600 text-brand-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: CENTERS DIRECTORY */}
      {activeTab === 'centers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${terms.pluralTerm} by name, address, or leader...`}
                value={centerSearch}
                onChange={e => setCenterSearch(e.target.value)}
                className="input pl-9 w-full text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedZone}
                onChange={e => setSelectedZone(e.target.value)}
                className="input text-sm py-1.5"
              >
                <option value="">All {terms.zoneTerm}s</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} /> Loading {terms.pluralTerm}...
            </div>
          ) : filteredCenters.length === 0 ? (
            <div className="card p-12 text-center text-gray-500">
              <Home size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No {terms.pluralTerm} found</p>
              <p className="text-sm text-gray-400 mt-1">Get started by creating your first meeting center.</p>
              <button
                onClick={() => setModal('center_new')}
                className="btn-primary mt-4 inline-flex items-center gap-1.5"
              >
                <Plus size={16} /> Create {terms.singularTerm}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCenters.map(center => {
                const isFull = center.member_count >= (center.max_capacity || 15);
                return (
                  <div key={center.id} className="card p-5 hover:shadow-md transition-shadow relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-semibold border border-brand-200">
                            {center.code || 'CENTER'}
                          </span>
                          <h3 className="font-bold text-gray-900 text-lg mt-1">{center.name}</h3>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          isFull
                            ? 'bg-amber-100 text-amber-800'
                            : center.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isFull ? 'Near Capacity' : center.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <div>{center.host_address}</div>
                            {center.landmark && (
                              <div className="text-xs text-gray-400">Landmark: {center.landmark}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-gray-400 shrink-0" />
                          <span>{center.meeting_day}s at {center.meeting_time} ({center.meeting_frequency})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Award size={16} className="text-gray-400 shrink-0" />
                          <span>Leader: <strong>{center.leader_name || 'Unassigned'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span className="font-bold text-gray-800 text-sm">{center.member_count}</span> / {center.max_capacity || 15} members
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openRoster(center)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-50 text-brand-700 hover:bg-brand-100"
                        >
                          Roster ({center.member_count})
                        </button>
                        <button
                          onClick={() => {
                            setActiveCenter(center);
                            setCenterForm(center);
                            setModal('center_edit');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROXIMITY MATCHING & ASSIGNMENT */}
      {activeTab === 'proximity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Navigation size={16} className="text-brand-600" />
                  Unassigned Members ({unassigned.length})
                </h3>
                <span className="text-xs text-gray-400">Click to find nearest cell</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                These active church members are not yet registered with any local {terms.singularTerm.toLowerCase()}.
              </p>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {unassigned.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-1" />
                    All active church members are enrolled in a {terms.singularTerm.toLowerCase()}!
                  </div>
                ) : (
                  unassigned.map(m => {
                    const isSelected = selectedUnassigned?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedUnassigned(m);
                          runProximityMatch(m);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-brand-50 border border-brand-300' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{m.first_name} {m.last_name}</div>
                          <div className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="shrink-0 text-gray-400" />
                            {m.address || 'No address registered'} {m.city ? `(${m.city})` : ''}
                          </div>
                        </div>
                        <ChevronRight size={16} className={isSelected ? 'text-brand-600' : 'text-gray-300'} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">Proximity Match Recommendations</h3>
                  <p className="text-xs text-gray-500">
                    {selectedUnassigned
                      ? `Matching nearest centers for ${selectedUnassigned.first_name} ${selectedUnassigned.last_name}`
                      : 'Select a member or search by neighborhood address'}
                  </p>
                </div>
                {selectedUnassigned && (
                  <button
                    onClick={() => runProximityMatch(selectedUnassigned)}
                    className="btn-outline text-xs py-1 px-2.5 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Recalculate
                  </button>
                )}
              </div>

              {matchingLoading ? (
                <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} /> Scoring nearest fellowship centers...
                </div>
              ) : !selectedUnassigned ? (
                <div className="py-16 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <Navigation size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Select an unassigned member on the left</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Our proximity algorithm will scan zone boundaries, streets, and city landmarks.
                  </p>
                </div>
              ) : matchedCenters.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <AlertCircle size={28} className="mx-auto text-amber-500 mb-1" />
                  <p className="text-sm font-semibold">No close match found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adding a new fellowship center in this neighborhood.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchedCenters.map((mc, idx) => (
                    <div
                      key={mc.id}
                      className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                        idx === 0
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{mc.name}</span>
                          {idx === 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Sparkles size={11} /> Top Recommendation
                            </span>
                          )}
                          <span className="text-xs font-mono text-gray-400">Score: {mc.matchScore}%</span>
                        </div>

                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin size={13} className="text-gray-400 shrink-0" />
                          {mc.host_address} {mc.landmark ? `· ${mc.landmark}` : ''}
                        </div>

                        <div className="text-xs text-gray-500">
                          Meets: {mc.meeting_day}s at {mc.meeting_time} · Leader: <strong>{mc.leader_name || 'Unassigned'}</strong>
                        </div>

                        {mc.matchReasons && mc.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mc.matchReasons.map((r, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleQuickAssign(mc.id, selectedUnassigned.id)}
                        className="btn-primary text-xs py-1.5 px-3 shrink-0 inline-flex items-center gap-1"
                      >
                        <Check size={14} /> Assign Here
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY MEETING REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Weekly fellowship accountability reports submitted by cell leaders and coordinators.
            </p>
            <button
              onClick={() => {
                setReportForm({ meetingDate: new Date().toISOString().split('T')[0] });
                setModal('report_new');
              }}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Log Meeting Report
            </button>
          </div>

          {reportsLoading ? (
            <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} /> Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <FileText size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-600">No meeting reports submitted yet</p>
              <p className="text-sm mt-1">Cell leaders can submit reports through the Member Portal or staff can log them here.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">{terms.singularTerm}</th>
                      <th className="p-3.5">Meeting Date</th>
                      <th className="p-3.5">Lesson / Topic</th>
                      <th className="p-3.5 text-center">Headcount</th>
                      <th className="p-3.5 text-right">Offering (₦)</th>
                      <th className="p-3.5">Submitted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reports.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/70">
                        <td className="p-3.5 font-semibold text-gray-900">{r.center_name}</td>
                        <td className="p-3.5 text-gray-600">{new Date(r.meeting_date).toLocaleDateString()}</td>
                        <td className="p-3.5 text-gray-700">{r.topic || 'General Fellowship'}</td>
                        <td className="p-3.5 text-center">
                          <span className="font-bold text-brand-700 px-2 py-0.5 rounded bg-brand-50 border border-brand-200 text-xs">
                            {r.total_attendance} attendees
                          </span>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {r.attendance_men}M · {r.attendance_women}W · {r.attendance_children}C · {r.attendance_first_timers}FT
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-mono font-medium text-gray-900">
                          ₦{Number(r.offering_amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-xs text-gray-500">
                          {r.submitted_by_member_name || r.submitted_by_user_name || 'Staff'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ZONES / DISTRICTS */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Divide your city or region into {terms.zoneTerm.toLowerCase()}s with designated coordinators.
            </p>
            <button
              onClick={() => {
                setCenterForm({});
                setModal('zone_new');
              }}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
            >
              <Plus size={15} /> Add {terms.zoneTerm}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map(z => (
              <div key={z.id} className="card p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-gray-900 text-base">{z.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                    {z.centers_count || 0} {terms.pluralTerm}
                  </span>
                </div>
                {z.description && <p className="text-xs text-gray-500 mt-1">{z.description}</p>}

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                  <div>Coordinator: <strong>{z.coordinator_name || 'Unassigned'}</strong></div>
                  {z.coordinator_phone && <div className="text-gray-400">Phone: {z.coordinator_phone}</div>}
                  {z.target_areas && z.target_areas.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Covered Areas:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {z.target_areas.map((a, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px]">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: JOIN REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Pending join requests submitted by church members via their self-service Member Portal.
          </p>

          {requestsLoading ? (
            <div className="py-12 text-center text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} /> Loading requests...
            </div>
          ) : joinRequests.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-gray-600">No pending join requests</p>
              <p className="text-xs text-gray-400 mt-1">Members can request to join nearby centers from their portal.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Member</th>
                      <th className="p-3.5">Requested Center</th>
                      <th className="p-3.5">Note / Address</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {joinRequests.map(jr => (
                      <tr key={jr.id} className="hover:bg-gray-50/60">
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-900">{jr.first_name} {jr.last_name}</div>
                          <div className="text-xs text-gray-400">{jr.phone || jr.email}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-brand-700">{jr.center_name}</div>
                          <div className="text-xs text-gray-400">{jr.host_address}</div>
                        </td>
                        <td className="p-3.5 text-xs text-gray-600 max-w-xs truncate">
                          {jr.request_note || jr.member_address || 'No note'}
                        </td>
                        <td className="p-3.5 text-xs text-gray-500">
                          {new Date(jr.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            jr.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : jr.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {jr.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {jr.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReviewRequest(jr.id, 'approved')}
                                className="btn-primary text-xs py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewRequest(jr.id, 'rejected')}
                                className="btn-outline text-xs py-1 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CUSTOM TERMINOLOGY */}
      {activeTab === 'settings' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="font-bold text-gray-900 text-lg mb-1">Custom Terminology & Defaults</h3>
          <p className="text-sm text-gray-500 mb-6">
            Customize the vocabulary across the platform to align with your church's culture (e.g. Life Groups, Cell Centers, House Fellowships).
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">System Name</label>
                <input
                  type="text"
                  value={settingsForm.systemName || ''}
                  onChange={e => setSettingsForm(f => ({ ...f, systemName: e.target.value }))}
                  placeholder="e.g. House Fellowship System"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Zone / District Term</label>
                <input
                  type="text"
                  value={settingsForm.zoneTerm || ''}
                  onChange={e => setSettingsForm(f => ({ ...f, zoneTerm: e.target.value }))}
                  placeholder="e.g. Zone, District, Cluster"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Singular Unit Term</label>
                <input
                  type="text"
                  value={settingsForm.singularTerm || ''}
                  onChange={e => setSettingsForm(f => ({ ...f, singularTerm: e.target.value }))}
                  placeholder="e.g. Fellowship Center, Cell, Life Group"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Plural Unit Term</label>
                <input
                  type="text"
                  value={settingsForm.pluralTerm || ''}
                  onChange={e => setSettingsForm(f => ({ ...f, pluralTerm: e.target.value }))}
                  placeholder="e.g. Fellowship Centers, Cells, Life Groups"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Default Meeting Day</label>
                <select
                  value={settingsForm.meetingDay || 'Wednesday'}
                  onChange={e => setSettingsForm(f => ({ ...f, meetingDay: e.target.value }))}
                  className="input"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Default Cell Capacity (Split Threshold)</label>
                <input
                  type="number"
                  value={settingsForm.defaultCapacity || 15}
                  onChange={e => setSettingsForm(f => ({ ...f, defaultCapacity: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Terminology'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE / EDIT CENTER */}
      {(modal === 'center_new' || modal === 'center_edit') && (
        <Modal
          title={modal === 'center_new' ? `Create New ${terms.singularTerm}` : `Edit ${terms.singularTerm}`}
          isOpen={true}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSaveCenter} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{terms.singularTerm} Name *</label>
                <input
                  type="text"
                  value={centerForm.name || ''}
                  onChange={e => setCenterForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Living Water Fellowship"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="label">{terms.zoneTerm}</label>
                <select
                  value={centerForm.zoneId || centerForm.zone_id || ''}
                  onChange={e => setCenterForm(f => ({ ...f, zoneId: e.target.value }))}
                  className="input"
                >
                  <option value="">None / Unassigned</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="label">Host Residential Address *</label>
                <input
                  type="text"
                  value={centerForm.hostAddress || centerForm.host_address || ''}
                  onChange={e => setCenterForm(f => ({ ...f, hostAddress: e.target.value }))}
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="label">Landmark / Directions</label>
                <input
                  type="text"
                  value={centerForm.landmark || ''}
                  onChange={e => setCenterForm(f => ({ ...f, landmark: e.target.value }))}
                  placeholder="e.g. Opposite Dominos Pizza"
                  className="input"
                />
              </div>

              <div>
                <label className="label">City / Town</label>
                <input
                  type="text"
                  value={centerForm.city || ''}
                  onChange={e => setCenterForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Lagos, Abuja"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Assigned Cell Leader</label>
                <select
                  value={centerForm.leaderMemberId || centerForm.leader_member_id || ''}
                  onChange={e => setCenterForm(f => ({ ...f, leaderMemberId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select Leader...</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Host Name</label>
                <input
                  type="text"
                  value={centerForm.hostName || centerForm.host_name || ''}
                  onChange={e => setCenterForm(f => ({ ...f, hostName: e.target.value }))}
                  placeholder="e.g. Bro. Emmanuel"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Meeting Day</label>
                <select
                  value={centerForm.meetingDay || centerForm.meeting_day || 'Wednesday'}
                  onChange={e => setCenterForm(f => ({ ...f, meetingDay: e.target.value }))}
                  className="input"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Meeting Time</label>
                <input
                  type="text"
                  value={centerForm.meetingTime || centerForm.meeting_time || '18:30'}
                  onChange={e => setCenterForm(f => ({ ...f, meetingTime: e.target.value }))}
                  placeholder="e.g. 18:30 (6:30 PM)"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Max Capacity (Split Alert)</label>
                <input
                  type="number"
                  value={centerForm.maxCapacity || centerForm.max_capacity || 15}
                  onChange={e => setCenterForm(f => ({ ...f, maxCapacity: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={centerForm.status || 'active'}
                  onChange={e => setCenterForm(f => ({ ...f, status: e.target.value }))}
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="multiplying">Multiplying</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Center'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CENTER ROSTER */}
      {modal === 'center_roster' && activeCenter && (
        <Modal
          title={`${activeCenter.name} — Member Roster`}
          isOpen={true}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100 flex items-center justify-between text-xs text-brand-900">
              <div>
                <div>Host: <strong>{activeCenter.host_name || 'N/A'}</strong></div>
                <div className="text-gray-500">{activeCenter.host_address}</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-brand-700">{rosterMembers.length}</span> / {activeCenter.max_capacity || 15} members
              </div>
            </div>

            {/* Add Member Bar */}
            <div className="flex items-center gap-2">
              <select
                value={addMemberId}
                onChange={e => setAddMemberId(e.target.value)}
                className="input text-sm flex-1"
              >
                <option value="">Enroll a church member...</option>
                {allMembers
                  .filter(m => !rosterMembers.some(rm => rm.id === m.id))
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.phone || m.city || 'No city'})</option>
                  ))}
              </select>
              <select
                value={addMemberRole}
                onChange={e => setAddMemberRole(e.target.value)}
                className="input text-sm w-32"
              >
                <option value="member">Member</option>
                <option value="leader">Leader</option>
                <option value="assistant_leader">Asst. Leader</option>
                <option value="host">Host</option>
              </select>
              <button
                onClick={handleAddMemberToCenter}
                className="btn-primary text-xs py-2 px-3 shrink-0"
              >
                <UserPlus size={14} /> Add
              </button>
            </div>

            {/* Roster List */}
            {rosterLoading ? (
              <div className="py-8 text-center text-gray-400">Loading members...</div>
            ) : rosterMembers.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No members assigned to this center yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {rosterMembers.map(rm => (
                  <div key={rm.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        {rm.first_name} {rm.last_name}
                        {rm.fellowship_role !== 'member' && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-brand-100 text-brand-800 capitalize">
                            {rm.fellowship_role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{rm.phone || rm.email} · {rm.address || rm.city || 'No address'}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(rm.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Remove from cell"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: SUBMIT REPORT */}
      {modal === 'report_new' && (
        <Modal
          title="Submit Weekly Fellowship Meeting Report"
          isOpen={true}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Select {terms.singularTerm} *</label>
                <select
                  value={reportForm.centerId || ''}
                  onChange={e => setReportForm(f => ({ ...f, centerId: e.target.value }))}
                  required
                  className="input"
                >
                  <option value="">Select Center...</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.meeting_day})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Meeting Date *</label>
                <input
                  type="date"
                  value={reportForm.meetingDate || ''}
                  onChange={e => setReportForm(f => ({ ...f, meetingDate: e.target.value }))}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="label">Facilitator / Preacher</label>
                <input
                  type="text"
                  value={reportForm.facilitator || ''}
                  onChange={e => setReportForm(f => ({ ...f, facilitator: e.target.value }))}
                  placeholder="e.g. Bro. David"
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Lesson Topic / Study Outline</label>
                <input
                  type="text"
                  value={reportForm.topic || ''}
                  onChange={e => setReportForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Overcoming Fear - Part 2"
                  className="input"
                />
              </div>

              {/* Headcounts */}
              <div className="sm:col-span-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="text-xs font-bold text-gray-700 uppercase mb-2">Attendance Headcount</div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Men</label>
                    <input
                      type="number"
                      min="0"
                      value={reportForm.attendanceMen || 0}
                      onChange={e => setReportForm(f => ({ ...f, attendanceMen: e.target.value }))}
                      className="input text-center text-sm py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Women</label>
                    <input
                      type="number"
                      min="0"
                      value={reportForm.attendanceWomen || 0}
                      onChange={e => setReportForm(f => ({ ...f, attendanceWomen: e.target.value }))}
                      className="input text-center text-sm py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Children</label>
                    <input
                      type="number"
                      min="0"
                      value={reportForm.attendanceChildren || 0}
                      onChange={e => setReportForm(f => ({ ...f, attendanceChildren: e.target.value }))}
                      className="input text-center text-sm py-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">First-Timers</label>
                    <input
                      type="number"
                      min="0"
                      value={reportForm.attendanceFirstTimers || 0}
                      onChange={e => setReportForm(f => ({ ...f, attendanceFirstTimers: e.target.value }))}
                      className="input text-center text-sm py-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Offering Collected (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reportForm.offeringAmount || ''}
                  onChange={e => setReportForm(f => ({ ...f, offeringAmount: e.target.value }))}
                  placeholder="0.00"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Testimonies</label>
                <textarea
                  rows={2}
                  value={reportForm.testimonies || ''}
                  onChange={e => setReportForm(f => ({ ...f, testimonies: e.target.value }))}
                  placeholder="Notable praise reports..."
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Pastoral Care & Welfare Notes</label>
                <textarea
                  rows={2}
                  value={reportForm.careNotes || ''}
                  onChange={e => setReportForm(f => ({ ...f, careNotes: e.target.value }))}
                  placeholder="Sick members, bereaved, needy, or followup requests..."
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD ZONE */}
      {modal === 'zone_new' && (
        <Modal
          title={`Add New ${terms.zoneTerm}`}
          isOpen={true}
          onClose={() => setModal(null)}
        >
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!centerForm.name) return toast.error('Zone name required');
            setSaving(true);
            try {
              await fellowshipAPI.createZone(centerForm);
              toast.success(`${terms.zoneTerm} created!`);
              setModal(null);
              loadAll();
            } catch {
              toast.error('Failed to create zone');
            } finally {
              setSaving(false);
            }
          }} className="space-y-4">
            <div>
              <label className="label">{terms.zoneTerm} Name *</label>
              <input
                type="text"
                value={centerForm.name || ''}
                onChange={e => setCenterForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Lekki Phase 1 Zone"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Coordinator / Overseer</label>
              <select
                value={centerForm.coordinatorMemberId || ''}
                onChange={e => setCenterForm(f => ({ ...f, coordinatorMemberId: e.target.value }))}
                className="input"
              >
                <option value="">Select Coordinator...</option>
                {allMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Covered Neighborhoods / Areas (Comma separated)</label>
              <input
                type="text"
                value={centerForm.targetAreas || ''}
                onChange={e => setCenterForm(f => ({ ...f, targetAreas: e.target.value }))}
                placeholder="e.g. Lekki, Oniru, Victoria Island"
                className="input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">Save {terms.zoneTerm}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
