import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Church, Loader2, Send, Award, Shield, UserCheck, Sparkles, Users, Briefcase, Heart, KeyRound, Copy, CheckCircle2, ArrowRight, Smartphone } from 'lucide-react';
import { publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';

export default function PublicMemberForm() {
  const { churchSlug } = useParams();
  const [searchParams] = useSearchParams();
  const queryDesignation = searchParams.get('designation') || '';

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);
  const [assignedCell, setAssignedCell] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    maritalStatus: '',
    weddingAnniversaryDate: '',
    spouseName: '',
    spousePhone: '',
    spouseAlreadyRegisteredChildren: false,
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
    designation: queryDesignation ? queryDesignation.toLowerCase() : 'member',
    leadershipTitle: '',
    assignedPastorId: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (queryDesignation) {
      const d = queryDesignation.toLowerCase();
      setForm(prev => ({
        ...prev,
        designation: d,
        isWorker: ['pastor', 'director', 'hod', 'minister', 'elder', 'worker'].includes(d) ? true : prev.isWorker,
      }));
    }
  }, [queryDesignation]);

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
      toast.error('Please complete all required fields');
      return;
    }

    if (form.maritalStatus === 'married' && !form.weddingAnniversaryDate) {
      toast.error('Please enter your Wedding Anniversary Date');
      return;
    }

    if (form.password) {
      if (form.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await publicIntakeAPI.submitMember(churchSlug, form);
      const data = res.data?.data;
      setSubmissionData(data);
      const cell = data?.assigned_cell || data?.assignedCell;
      if (cell) setAssignedCell(cell);
      setSubmitted(true);
      toast.success('Welcome to the family! Registration completed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyMemberNumber = () => {
    const num = submissionData?.memberNumber || submissionData?.member?.member_number;
    if (num) {
      navigator.clipboard.writeText(num);
      setCopiedId(true);
      toast.success('Member ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 3000);
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
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
                  Welcome to {meta.church.name}! 🎉
                </h2>
                <p className="text-gray-600 mt-2">
                  Your church membership profile has been officially cataloged into our central church family.
                </p>
              </div>

              {/* Official Member ID Card */}
              {(submissionData?.memberNumber || submissionData?.member?.member_number) && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 max-w-md mx-auto shadow-sm">
                  <p className="text-xs uppercase tracking-wider font-semibold text-emerald-800 mb-1">
                    Your Official Member ID
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-950">
                      {submissionData?.memberNumber || submissionData?.member?.member_number}
                    </span>
                    <button
                      type="button"
                      onClick={copyMemberNumber}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Copy size={13} />
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 mt-2">
                    Save this ID or check your email/phone for safe-keeping.
                  </p>
                </div>
              )}

              {/* Linked Household Badge */}
              {(submissionData?.spouseName || submissionData?.member?.spouse_name) && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl p-4 text-left max-w-lg mx-auto shadow-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-1">
                    <Heart size={16} className="text-amber-600 fill-amber-500/30" />
                    <span>Family Household Connected</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Linked with <strong>{submissionData?.spouseName || submissionData?.member?.spouse_name}</strong>. Your children and family records are unified under your shared household.
                  </p>
                </div>
              )}

              {/* Assigned Fellowship Cell */}
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

              {/* How to Access the Portal Next Steps */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left max-w-lg mx-auto space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Smartphone size={18} className="text-brand-600" />
                  <span>Church Mobile Portal Access</span>
                </div>
                {submissionData?.hasPassword ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ✅ <strong>Your password is active!</strong> You can sign in immediately on your phone to read daily devotionals, submit prayer requests, give online, and view church announcements.
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    📩 A 1-click password setup link has been sent to <strong>{form.email}</strong> and via WhatsApp/SMS to <strong>{form.phone}</strong>. You can also click below to create your password right now and sign in.
                  </p>
                )}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  {submissionData?.hasPassword ? (
                    <Link
                      to={`/portal/${churchSlug}/login`}
                      className="btn-primary w-full justify-center inline-flex items-center gap-2 py-2.5 text-sm font-semibold shadow-md shadow-emerald-600/20"
                    >
                      Enter Member Portal <ArrowRight size={16} />
                    </Link>
                  ) : (
                    <Link
                      to={`/portal/${churchSlug}/set-password`}
                      className="btn-primary w-full justify-center inline-flex items-center gap-2 py-2.5 text-sm font-semibold shadow-md shadow-emerald-600/20"
                    >
                      Create Password & Sign In <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setAssignedCell(null);
                    setSubmissionData(null);
                    setForm({
                      firstName: '', lastName: '', email: '', phone: '', gender: '', dateOfBirth: '', maritalStatus: '',
                      weddingAnniversaryDate: '', address: '', branchId: '', membershipClass: 'full', occupation: '', employer: '', notes: '',
                      joinDate: new Date().toISOString().slice(0, 10),
                      hasChildren: false, childrenCount: 0, teenagersCount: 0, childrenDetails: '',
                      isWorker: false, workerUnit: '', workerRole: 'worker',
                      designation: 'member', leadershipTitle: '', assignedPastorId: '',
                      password: '', confirmPassword: '',
                    });
                  }}
                  className="btn-secondary text-xs"
                >
                  Submit another member registration
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Leadership Intake Spotlight */}
              {form.designation && form.designation !== 'member' && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-300 shrink-0">
                  <Award size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      Leadership Intake
                    </span>
                    <span className="text-xs text-purple-200 font-semibold capitalize">
                      {form.designation} Onboarding
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white mt-0.5">
                    Registering as {form.designation.toUpperCase()}
                  </h3>
                  <p className="text-xs text-white/70">
                    Your ministerial profile will be cataloged directly into church leadership records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, designation: 'member' }))}
                className="text-[11px] text-white/60 hover:text-white underline shrink-0 text-left sm:text-right"
              >
                Register as Standard Member instead
              </button>
            </div>
          )}

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

                {form.maritalStatus === 'married' && (
                  <div className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 mb-1 text-amber-900 font-semibold text-xs uppercase tracking-wide">
                      <Heart size={15} className="text-amber-600 fill-amber-500/20" />
                      <span>Pastoral Marriage & Household Registry</span>
                    </div>

                    <div>
                      <label className="label text-amber-950 font-medium">
                        Wedding Anniversary Date * <span className="text-xs text-amber-700 font-normal">💍 For pastoral wedding blessings & prayers</span>
                      </label>
                      <input
                        type="date"
                        required={form.maritalStatus === 'married'}
                        className="input bg-white border-amber-300 focus:border-amber-500 focus:ring-amber-200"
                        value={form.weddingAnniversaryDate}
                        onChange={set('weddingAnniversaryDate')}
                      />
                      <p className="text-[11px] text-amber-800/80 mt-1.5">
                        Our pastoral leadership celebrates every couple! You will receive customized pastoral wedding anniversary wishes and prayers on your special day.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                      <div>
                        <label className="label text-amber-950 font-medium">Spouse&apos;s Full Name</label>
                        <input
                          className="input bg-white border-amber-300 focus:border-amber-500"
                          placeholder="e.g. Bukola Adebayo"
                          value={form.spouseName}
                          onChange={set('spouseName')}
                        />
                      </div>
                      <div>
                        <label className="label text-amber-950 font-medium">
                          Spouse&apos;s Phone Number <span className="text-xs text-amber-700 font-normal">(If also in church)</span>
                        </label>
                        <input
                          type="tel"
                          className="input bg-white border-amber-300 focus:border-amber-500"
                          placeholder="+234..."
                          value={form.spousePhone}
                          onChange={set('spousePhone')}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800/80">
                      💡 Entering your spouse&apos;s details allows ChurchOS to automatically connect your household and ensure family records are unified without duplication.
                    </p>
                  </div>
                )}
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
                    {form.maritalStatus === 'married' && (
                      <div className="bg-white/80 border border-emerald-200/80 rounded-xl p-3">
                        <label className="text-xs font-semibold text-emerald-950 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-emerald-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                            checked={form.spouseAlreadyRegisteredChildren}
                            onChange={setBool('spouseAlreadyRegisteredChildren')}
                          />
                          <span>My spouse has already registered our children/teenagers on ChurchOS</span>
                        </label>
                        <p className="text-[11px] text-emerald-700/90 mt-1 pl-6">
                          If checked, ChurchOS automatically links your profile to your spouse&apos;s household so your children are recorded once and shared under your family.
                        </p>
                      </div>
                    )}

                    {!form.spouseAlreadyRegisteredChildren && (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Church Designation & Leadership Status */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    4. Church Role & Designation
                  </h3>
                  <p className="text-xs text-gray-400">
                    Specify your ecclesiastical role, pastoral title, or serving department within {meta.church.name}
                  </p>
                </div>

                {/* Designation Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'member', label: 'General Member', icon: Users },
                    { id: 'pastor', label: 'Pastor / Minister', icon: Award },
                    { id: 'director', label: 'Ministry Director', icon: Shield },
                    { id: 'hod', label: 'HOD / Unit Lead', icon: UserCheck },
                    { id: 'minister', label: 'Elder / Deacon', icon: Sparkles },
                    { id: 'worker', label: 'Church Worker', icon: Briefcase },
                  ].map((tier) => {
                    const isSelected = form.designation === tier.id;
                    const TierIcon = tier.icon;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            designation: tier.id,
                            isWorker: tier.id !== 'member' ? true : f.isWorker
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold ring-2 ring-brand-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        <TierIcon size={16} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
                        <span className="text-xs">{tier.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Leadership & Worker Specific Details */}
                {form.designation !== 'member' && (
                  <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
                      <Award size={14} className="text-indigo-600" />
                      <span>{form.designation.toUpperCase()} Portfolio & Directorate</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-indigo-950 font-medium">Leadership Office / Title</label>
                        <input
                          className="input bg-white"
                          placeholder={
                            form.designation === 'pastor' ? 'e.g. Resident Pastor, Youth Pastor' :
                            form.designation === 'director' ? 'e.g. Director of Creatives, Director of Operations' :
                            form.designation === 'hod' ? 'e.g. HOD Choir, Lead Protocol' :
                            'e.g. Church Elder, Deaconess'
                          }
                          value={form.leadershipTitle}
                          onChange={set('leadershipTitle')}
                        />
                      </div>

                      <div>
                        <label className="label text-indigo-950 font-medium">Serving Unit / Department</label>
                        {meta.departments && meta.departments.length > 0 ? (
                          <select
                            className="input bg-white"
                            value={form.workerUnit}
                            onChange={set('workerUnit')}
                          >
                            <option value="">Select Directorate / Department</option>
                            {meta.departments.map((dept) => (
                              <option key={dept.id} value={dept.name}>{dept.name}</option>
                            ))}
                            <option value="Pastoral Council">Pastoral Council / Ministry Board</option>
                            <option value="Executive Directorate">Executive Directorate</option>
                            <option value="Other">Other Specialized Ministry</option>
                          </select>
                        ) : (
                          <input
                            className="input bg-white"
                            placeholder="e.g. Choir, Media, Protocol, Pastoral"
                            value={form.workerUnit}
                            onChange={set('workerUnit')}
                          />
                        )}
                      </div>

                      <div>
                        <label className="label text-indigo-950 font-medium">Role Responsibility</label>
                        <select className="input bg-white" value={form.workerRole} onChange={set('workerRole')}>
                          <option value="leader">Unit Head / HOD / Director</option>
                          <option value="assistant_leader">Assistant Lead / Associate</option>
                          <option value="coordinator">Coordinator / Supervisor</option>
                          <option value="worker">Team Worker</option>
                        </select>
                      </div>

                      {meta.pastors && meta.pastors.length > 0 && (
                        <div>
                          <label className="label text-indigo-950 font-medium">Pastoral Covering / Overseer</label>
                          <select className="input bg-white" value={form.assignedPastorId} onChange={set('assignedPastorId')}>
                            <option value="">Select Covering Pastor</option>
                            {meta.pastors.map(p => (
                              <option key={p.id} value={p.id}>{p.name} {p.leadership_title ? `(${p.leadership_title})` : ''}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Member Portal Access & Password Setup */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                      5. Member Portal & Mobile Access
                    </h3>
                    <p className="text-xs text-gray-500">
                      Create your password now to immediately sign in to your Church Mobile Portal, view daily devotionals, prayers, events, cell groups, and church notices.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4">
                  <div>
                    <label className="label text-emerald-950 font-medium">
                      Create Portal Password <span className="text-xs text-gray-400 font-normal">(Optional — min 8 chars)</span>
                    </label>
                    <input
                      type="password"
                      minLength={8}
                      className="input bg-white"
                      placeholder="Choose a secure password"
                      value={form.password}
                      onChange={set('password')}
                    />
                  </div>
                  <div>
                    <label className="label text-emerald-950 font-medium">Confirm Password</label>
                    <input
                      type="password"
                      minLength={8}
                      className="input bg-white"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                    />
                  </div>
                  <div className="md:col-span-2 text-xs text-gray-500 flex items-center gap-1.5 pt-1">
                    <span>💡</span>
                    <span>If left blank, a secure 1-click password setup link will be dispatched to your email and WhatsApp/SMS upon submitting.</span>
                  </div>
                </div>
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
          </>
        )}
        </div>
      </div>
    </div>
  );
}