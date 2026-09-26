import { useState, useEffect } from 'react';
import {
  Home, MapPin, Users, Calendar, Clock, Phone, Mail, Award,
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, ExternalLink,
  Loader2, FileText, Check, Navigation, Send
} from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

export default function MemberPortalFellowship() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [browseList, setBrowseList] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [joinModal, setJoinModal] = useState(null);
  const [joinNote, setJoinNote] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);

  // Leader Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    meetingDate: new Date().toISOString().split('T')[0],
    attendanceMen: 0,
    attendanceWomen: 0,
    attendanceChildren: 0,
    attendanceFirstTimers: 0,
    offeringAmount: '',
    topic: '',
    testimonies: '',
    careNotes: '',
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchFellowship = async () => {
    setLoading(true);
    try {
      const res = await memberPortalAPI.myFellowship();
      setData(res.data.data);
      if (!res.data.data.enrolled) {
        fetchBrowse();
      }
    } catch {
      toast.error('Failed to load fellowship details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBrowse = async () => {
    setBrowseLoading(true);
    try {
      const res = await memberPortalAPI.browseNearbyFellowships();
      setBrowseList(res.data.data || []);
    } catch {
      toast.error('Failed to find nearby centers');
    } finally {
      setBrowseLoading(false);
    }
  };

  useEffect(() => {
    fetchFellowship();
  }, []);

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    if (!joinModal) return;
    setSubmittingJoin(true);
    try {
      await memberPortalAPI.joinFellowship({ centerId: joinModal.id, note: joinNote });
      toast.success('Join request sent to fellowship leader!');
      setJoinModal(null);
      setJoinNote('');
      fetchFellowship();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit join request');
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleSubmitLeaderReport = async (e) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await memberPortalAPI.submitCellReport(reportForm);
      toast.success('Fellowship meeting report submitted!');
      setShowReportModal(false);
      fetchFellowship();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-brand-600" size={24} /> Loading your fellowship hub...
      </div>
    );
  }

  const terms = data?.terms || {
    systemName: 'House Fellowship',
    singularTerm: 'Fellowship Center',
    pluralTerm: 'Fellowship Centers',
    zoneTerm: 'Zone',
  };

  // ENROLLED VIEW
  if (data?.enrolled && data.center) {
    const center = data.center;
    const members = data.members || [];
    const isLeader = data.isLeader;
    const mapsQuery = encodeURIComponent(`${center.host_address} ${center.city || ''}`);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Banner Card */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-indigo-900 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Home size={140} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded font-semibold tracking-wider">
                {center.code || 'CENTER'}
              </span>
              {center.zone_name && (
                <span className="text-xs text-brand-200">{terms.zoneTerm}: {center.zone_name}</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold">{center.name}</h1>
            <p className="text-brand-100 text-sm mt-1 max-w-xl">
              Meets every <strong>{center.meeting_day}</strong> at <strong>{center.meeting_time}</strong> ({center.meeting_frequency})
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-white text-brand-900 text-xs font-bold hover:bg-brand-50 transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <MapPin size={14} className="text-red-500" /> Open Directions in Maps <ExternalLink size={12} />
              </a>

              {center.leader_phone && (
                <a
                  href={`https://wa.me/${center.leader_phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Phone size={14} /> Message Leader
                </a>
              )}

              {isLeader && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <FileText size={14} /> Submit Meeting Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Host & Venue */}
          <div className="card p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <MapPin size={16} className="text-brand-600" /> Meeting Venue & Host
            </h3>
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="font-semibold text-gray-900">{center.host_address}</div>
              {center.landmark && (
                <div className="text-xs text-gray-500 mt-1">Landmark: {center.landmark}</div>
              )}
              {center.city && (
                <div className="text-xs text-gray-400 mt-0.5">{center.city} {center.state ? `, ${center.state}` : ''}</div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              Host: <strong>{center.host_name || 'Church Host Home'}</strong> {center.host_phone && `(${center.host_phone})`}
            </div>
          </div>

          {/* Leaders */}
          <div className="card p-5 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Fellowship Leadership
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Cell Leader</div>
                  <div className="font-bold text-gray-900 text-sm">{center.leader_name || 'Unassigned'}</div>
                  {center.leader_phone && <div className="text-xs text-gray-500">{center.leader_phone}</div>}
                </div>
                {center.leader_phone && (
                  <a
                    href={`tel:${center.leader_phone}`}
                    className="p-2 rounded-full bg-white text-brand-600 shadow-sm hover:bg-brand-50"
                  >
                    <Phone size={14} />
                  </a>
                )}
              </div>

              {center.assistant_leader_name && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-medium">Assistant Leader</div>
                    <div className="font-bold text-gray-800 text-sm">{center.assistant_leader_name}</div>
                  </div>
                  {center.assistant_leader_phone && (
                    <a
                      href={`tel:${center.assistant_leader_phone}`}
                      className="p-2 rounded-full bg-white text-gray-600 shadow-sm"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members Roster */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-brand-600" /> Center Members ({members.length})
              </h3>
              <p className="text-xs text-gray-400">Believers who fellowship together at this center</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
              Capacity: {members.length} / {center.max_capacity || 15}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map(m => {
              const initials = `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase();
              return (
                <div key={m.id} className="p-3 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors flex items-center gap-3">
                  {m.profile_photo_url ? (
                    <img src={m.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{m.first_name} {m.last_name}</div>
                    <div className="text-[11px] text-gray-400 capitalize">{m.fellowship_role.replace('_', ' ')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL: SUBMIT LEADER WEEKLY REPORT */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-gray-900 text-lg">Submit Meeting Report</h3>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleSubmitLeaderReport} className="space-y-3">
                <div>
                  <label className="label">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={reportForm.meetingDate}
                    onChange={e => setReportForm(f => ({ ...f, meetingDate: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Lesson Topic / Study Outline</label>
                  <input
                    type="text"
                    placeholder="e.g. Walking in the Spirit"
                    value={reportForm.topic}
                    onChange={e => setReportForm(f => ({ ...f, topic: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-xs font-bold text-gray-700 uppercase mb-2">Attendance Headcount</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500">Men</label>
                      <input
                        type="number"
                        min="0"
                        value={reportForm.attendanceMen}
                        onChange={e => setReportForm(f => ({ ...f, attendanceMen: e.target.value }))}
                        className="input text-center text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">Women</label>
                      <input
                        type="number"
                        min="0"
                        value={reportForm.attendanceWomen}
                        onChange={e => setReportForm(f => ({ ...f, attendanceWomen: e.target.value }))}
                        className="input text-center text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">Children</label>
                      <input
                        type="number"
                        min="0"
                        value={reportForm.attendanceChildren}
                        onChange={e => setReportForm(f => ({ ...f, attendanceChildren: e.target.value }))}
                        className="input text-center text-xs py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">Visitors</label>
                      <input
                        type="number"
                        min="0"
                        value={reportForm.attendanceFirstTimers}
                        onChange={e => setReportForm(f => ({ ...f, attendanceFirstTimers: e.target.value }))}
                        className="input text-center text-xs py-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Offering Collected (₦)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={reportForm.offeringAmount}
                    onChange={e => setReportForm(f => ({ ...f, offeringAmount: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Testimonies / Praise Reports</label>
                  <textarea
                    rows={2}
                    placeholder="God did something in our center..."
                    value={reportForm.testimonies}
                    onChange={e => setReportForm(f => ({ ...f, testimonies: e.target.value }))}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Pastoral Care / Welfare Concerns</label>
                  <textarea
                    rows={2}
                    placeholder="Sick members, followup or prayer needs..."
                    value={reportForm.careNotes}
                    onChange={e => setReportForm(f => ({ ...f, careNotes: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button type="button" onClick={() => setShowReportModal(false)} className="btn-outline">Cancel</button>
                  <button type="submit" disabled={submittingReport} className="btn-primary">
                    {submittingReport ? 'Submitting...' : 'Submit Weekly Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // NOT ENROLLED VIEW -> BROWSE NEARBY
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Notice Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <Home size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-gray-900">Find Your Nearest {terms.singularTerm}</h2>
            <p className="text-sm text-gray-600">
              You are not yet registered with a local {terms.singularTerm.toLowerCase()}. Meeting with believers who live close to you is one of the best ways to grow, pray, and fellowship during the week!
            </p>
          </div>
        </div>

        {data?.pendingRequest && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <span>
                Join request pending for <strong>{data.pendingRequest.center_name}</strong>. The leader will review soon.
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Pending</span>
          </div>
        )}
      </div>

      {/* Recommended Centers Near Member's Address */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Navigation size={18} className="text-brand-600" /> Recommended Centers Near You
          </h3>
          <span className="text-xs text-gray-500">Ranked by location proximity</span>
        </div>

        {browseLoading ? (
          <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Finding centers near your residential address...
          </div>
        ) : browseList.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <p>No active {terms.pluralTerm.toLowerCase()} found at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {browseList.map((center, idx) => (
              <div
                key={center.id}
                className={`card p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                  idx === 0 ? 'border-2 border-brand-500/60 shadow-sm' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {idx === 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 mb-1.5 inline-block">
                          ★ Closest to your address
                        </span>
                      )}
                      <h4 className="font-bold text-gray-900 text-base">{center.name}</h4>
                    </div>
                    {center.zone_name && (
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-medium">
                        {center.zone_name}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <span>{center.host_address} {center.landmark ? `(${center.landmark})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400 shrink-0" />
                      <span>Every {center.meeting_day} at {center.meeting_time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={14} className="text-gray-400 shrink-0" />
                      <span>Leader: {center.leader_name || 'Unassigned'}</span>
                    </div>
                  </div>

                  {center.matchReasons && center.matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {center.matchReasons.map((r, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {center.member_count} members enrolled
                  </span>
                  <button
                    onClick={() => {
                      setJoinModal(center);
                      setJoinNote('');
                    }}
                    className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                  >
                    Request to Join <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOIN REQUEST MODAL */}
      {joinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Join {joinModal.name}</h3>
            <p className="text-xs text-gray-500">
              Meets at <strong>{joinModal.host_address}</strong> on {joinModal.meeting_day}s at {joinModal.meeting_time}.
            </p>

            <form onSubmit={handleJoinRequest} className="space-y-3">
              <div>
                <label className="label">Note to Fellowship Leader (Optional)</label>
                <textarea
                  rows={3}
                  value={joinNote}
                  onChange={e => setJoinNote(e.target.value)}
                  placeholder="e.g. Hi! I live just down the street on Admiralty Way and would love to join your cell meeting this week."
                  className="input text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setJoinModal(null)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={submittingJoin} className="btn-primary inline-flex items-center gap-1">
                  <Send size={13} /> {submittingJoin ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
