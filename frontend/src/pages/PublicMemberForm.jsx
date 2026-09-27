import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Church, Loader2, Send } from 'lucide-react';
import { publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';

export default function PublicMemberForm() {
  const { churchSlug } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [assignedCell, setAssignedCell] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    address: '',
    branchId: '',
    membershipClass: 'full',
    occupation: '',
    employer: '',
    notes: '',
    joinDate: new Date().toISOString().slice(0, 10),
    hasChildren: false,
    childrenCount: 0,
    teenagersCount: 0,
    childrenDetails: '',
    isWorker: false,
    workerUnit: '',
    workerRole: 'worker',
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    publicIntakeAPI.getContext(churchSlug)
      .then((res) => {
        if (active) setMeta(res.data.data);
      })
      .catch(() => {
        if (active) toast.error('Unable to load church form');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [churchSlug]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setBool = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.checked }));

  const location = useMemo(() => {
    if (!meta?.church) return '';
    return [meta.church.city, meta.church.state, meta.church.country].filter(Boolean).join(', ');
  }, [meta]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim() || !form.gender || !form.dateOfBirth || !form.maritalStatus || !form.address.trim()) {
      toast.error('Please complete the required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await publicIntakeAPI.submitMember(churchSlug, form);
      const cell = res.data?.data?.assigned_cell;
      if (cell) setAssignedCell(cell);
      setSubmitted(true);
      toast.success('Membership details submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  }

  if (!meta?.church) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-center text-gray-600">This church form is not available.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          {meta.church.logoUrl ? (
            <img
              src={meta.church.logoUrl}
              alt={meta.church.name}
              className="mx-auto w-16 h-16 rounded-2xl object-contain bg-white p-1 border border-gray-200 shadow-md mb-4"
            />
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg mb-4">
              <Church size={28} />
            </div>
          )}
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">Member Registration & Membership Intake</p>
          {location && <p className="text-sm text-gray-400 mt-1">{location}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Welcome to {meta.church.name}! 🎉</h2>
                <p className="text-gray-600 mt-2">Your membership record has been received and added to our church directory.</p>
              </div>

              {assignedCell && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-left max-w-lg mx-auto shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-2">
                    <span className="text-xl">🏡</span>
                    <span>Your Assigned Fellowship / Cell Cluster</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{assignedCell.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    📍 <strong>Meeting Location:</strong> {assignedCell.hostAddress} {assignedCell.landmark ? `(near ${assignedCell.landmark})` : ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    ⏰ <strong>Meeting Schedule:</strong> Every {assignedCell.meetingDay} at {assignedCell.meetingTime}
                  </p>
                  {assignedCell.leaderName && (
                    <p className="text-sm text-emerald-900 font-medium mt-2 pt-2 border-t border-emerald-200">
                      👤 <strong>Cell Leader:</strong> {assignedCell.leaderName} {assignedCell.leaderPhone ? `· 📞 ${assignedCell.leaderPhone}` : ''}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setSubmitted(false);
                  setAssignedCell(null);
                  setForm({
                    firstName: '', lastName: '', email: '', phone: '', gender: '', dateOfBirth: '', maritalStatus: '',
                    address: '', branchId: '', membershipClass: 'full', occupation: '', employer: '', notes: '',
                    joinDate: new Date().toISOString().slice(0, 10),
                    hasChildren: false, childrenCount: 0, teenagersCount: 0, childrenDetails: '',
                    isWorker: false, workerUnit: '', workerRole: 'worker'
                  });
                }}
                className="btn-secondary"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">1. Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="label">First Name *</label><input className="input" required value={form.firstName} onChange={set('firstName')} /></div>
                  <div><label className="label">Last Name *</label><input className="input" required value={form.lastName} onChange={set('lastName')} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div><label className="label">Email *</label><input type="email" required className="input" value={form.email} onChange={set('email')} /></div>
                  <div><label className="label">Phone Number *</label><input className="input" required value={form.phone} onChange={set('phone')} placeholder="+234..." /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="label">Gender *</label>
                    <select className="input" required value={form.gender} onChange={set('gender')}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth * <span className="text-xs text-brand-600 font-normal">🎂 For Birthday Celebrations</span></label>
                    <input type="date" required className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="label">Marital Status *</label>
                    <select className="input" required value={form.maritalStatus} onChange={set('maritalStatus')}>
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Branch</label>
                    <select className="input" value={form.branchId} onChange={set('branchId')}>
                      <option value="">Select branch</option>
                      {(meta.branches || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location & Cell Proximity */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">2. Residence & Fellowship Cluster</h3>
                <div>
                  <label className="label">Home / Residential Address *</label>
                  <input
                    className="input"
                    required
                    placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                    value={form.address}
                    onChange={set('address')}
                  />
                  <p className="text-xs text-gray-400 mt-1">We will automatically locate and assign you to the nearest fellowship cell center in your area.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={set('occupation')} /></div>
                  <div><label className="label">Employer / Business</label><input className="input" value={form.employer} onChange={set('employer')} /></div>
                </div>
              </div>

              {/* Children & Teenagers Demographics */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">3. Family & Children / Teenagers</h3>
                    <p className="text-xs text-gray-400">Helps church accounting for children and teenage ministry</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                      checked={form.hasChildren}
                      onChange={setBool('hasChildren')}
                    />
                    <span className="text-sm font-medium text-gray-700">I have children / teenagers</span>
                  </label>
                </div>

                {form.hasChildren && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-emerald-950 font-medium">Children Count (Ages 0 - 12)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="input bg-white"
                          value={form.childrenCount}
                          onChange={set('childrenCount')}
                        />
                      </div>
                      <div>
                        <label className="label text-emerald-950 font-medium">Teenagers Count (Ages 13 - 19)</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className="input bg-white"
                          value={form.teenagersCount}
                          onChange={set('teenagersCount')}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label text-emerald-950 font-medium">Children / Teenagers Names & Ages</label>
                      <input
                        className="input bg-white"
                        placeholder="e.g. David (5), Grace (11), Joshua (15)"
                        value={form.childrenDetails}
                        onChange={set('childrenDetails')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Church Worker & Ministry Unit */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">4. Church Worker & Ministry Unit</h3>
                    <p className="text-xs text-gray-400">Indicate if you serve in any department or ministry team</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                      checked={form.isWorker}
                      onChange={setBool('isWorker')}
                    />
                    <span className="text-sm font-medium text-gray-700">I am a Church Worker</span>
                  </label>
                </div>

                {form.isWorker && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-indigo-950 font-medium">Serving Unit / Department *</label>
                        {meta.departments && meta.departments.length > 0 ? (
                          <select
                            className="input bg-white"
                            value={form.workerUnit}
                            onChange={set('workerUnit')}
                            required
                          >
                            <option value="">Select Department</option>
                            {meta.departments.map((dept) => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))}
                            <option value="Other">Other (Special Service)</option>
                          </select>
                        ) : (
                          <input
                            className="input bg-white"
                            placeholder="e.g. Choir, Ushering, Media, Prayer"
                            value={form.workerUnit}
                            onChange={set('workerUnit')}
                            required
                          />
                        )}
                      </div>
                      <div>
                        <label className="label text-indigo-950 font-medium">Role in Unit</label>
                        <select className="input bg-white" value={form.workerRole} onChange={set('workerRole')}>
                          <option value="worker">Worker</option>
                          <option value="team_lead">Team Lead / HOD</option>
                          <option value="assistant_lead">Assistant Lead</option>
                          <option value="volunteer">Volunteer</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Notes */}
              <div className="pt-4 border-t border-gray-100">
                <label className="label">Any additional notes or spiritual history?</label>
                <textarea
                  className="input min-h-[80px]"
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Tell us anything else you would like the pastor and church leadership to know"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center inline-flex items-center gap-2 py-3.5 text-base font-semibold shadow-lg shadow-emerald-500/20"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Submit Membership Form
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}