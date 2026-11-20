import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Church, Loader2, Send, Camera, Upload, CheckCircle2, User, Sparkles, Heart } from 'lucide-react';
import { publicIntakeAPI } from '../api/services';
import { getAssetUrl } from '../api/client';
import toast from 'react-hot-toast';

const HEAR_OPTIONS = ['social_media', 'friend', 'walk_in', 'online_service', 'flyer', 'event', 'others'];

export default function PublicFirstTimerForm() {
  const { churchSlug } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: '',
    visitDate: new Date().toISOString().slice(0, 10),
    dateOfBirth: '',
    howDidYouHear: '',
    address: '',
    branchId: '',
    prayerRequest: '',
    serviceAttended: '',
    wantsToJoinChurch: false,
    decision: 'considering', // 'join_church' | 'considering' | 'visiting'
    photoUrl: '',
    profilePhotoUrl: '',
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Photo must be less than 5MB');
    }
    const formData = new FormData();
    formData.append('photo', file);
    setUploadingPhoto(true);
    try {
      const res = await publicIntakeAPI.uploadPhoto(churchSlug, formData);
      const url = res.data?.photoUrl || res.data?.data?.photoUrl;
      if (url) {
        setForm(prev => ({ ...prev, photoUrl: url, profilePhotoUrl: url }));
        toast.success('Photo uploaded successfully!');
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDecisionSelect = (dec) => {
    setForm(prev => ({
      ...prev,
      decision: dec,
      wantsToJoinChurch: dec === 'join_church',
    }));
  };

  const location = useMemo(() => {
    if (!meta?.church) return '';
    return [meta.church.city, meta.church.state, meta.church.country].filter(Boolean).join(', ');
  }, [meta]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.email.trim() || !form.gender || !form.visitDate || !form.howDidYouHear) {
      toast.error('Please complete the required fields');
      return;
    }

    setSubmitting(true);
    try {
      await publicIntakeAPI.submitFirstTimer(churchSlug, form);
      setSubmitted(true);
      toast.success('Your details have been submitted');
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

  const churchSettings = meta?.church?.settings || {};
  const publicConnect = churchSettings.publicConnect || {};
  const primaryColor = churchSettings.theme?.primaryColor || '#1d4ed8';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {meta.church.logoUrl ? (
            <img
              src={meta.church.logoUrl}
              alt={meta.church.name}
              className="mx-auto w-16 h-16 rounded-2xl object-contain bg-white p-1 border border-gray-200 shadow-md mb-4"
            />
          ) : (
            <div
              className="mx-auto w-16 h-16 rounded-2xl text-white flex items-center justify-center shadow-lg mb-4"
              style={{ backgroundColor: primaryColor }}
            >
              <Church size={28} />
            </div>
          )}
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">
            {publicConnect.visitorGreeting || 'First Timer Welcome & Connect Form'}
          </p>
          {location && <p className="text-sm text-gray-400 mt-1">{location}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-display font-bold text-gray-900">Welcome to Our Family! 🎉</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {publicConnect.thankYouText || 'Thank you for worshipping with us today! A member of our Friendship & Pastoral Care team will reach out to welcome you warmly.'}
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    firstName: '', lastName: '', phone: '', email: '', gender: '',
                    visitDate: new Date().toISOString().slice(0, 10), dateOfBirth: '',
                    howDidYouHear: '', address: '', branchId: '', prayerRequest: '',
                    serviceAttended: '', wantsToJoinChurch: false, decision: 'considering',
                    photoUrl: '', profilePhotoUrl: ''
                  });
                }}
                className="btn-secondary mt-2"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo Snapshot / Upload */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                {form.photoUrl ? (
                  <img
                    src={getAssetUrl(form.photoUrl)}
                    alt="Visitor Photo"
                    className="w-20 h-20 rounded-full object-cover border-2 border-brand-500 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center border-2 border-dashed border-brand-300">
                    <Camera size={26} />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900">Take or Upload Your Photo</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Helps our pastoral leadership and friendship team recognise and connect with you!</p>
                  <div className="mt-2.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1.5 py-1.5 px-3">
                      {uploadingPhoto ? <Loader2 size={13} className="animate-spin text-brand-600" /> : <Camera size={13} />}
                      {uploadingPhoto ? 'Uploading…' : form.photoUrl ? 'Change Photo' : 'Take / Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                    {form.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, photoUrl: '', profilePhotoUrl: '' }))}
                        className="text-xs text-red-600 hover:text-red-700 py-1.5 px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">First Name *</label><input required className="input" value={form.firstName} onChange={set('firstName')} placeholder="e.g. John" /></div>
                <div><label className="label">Last Name *</label><input required className="input" value={form.lastName} onChange={set('lastName')} placeholder="e.g. Doe" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Phone Number *</label><input required className="input" value={form.phone} onChange={set('phone')} placeholder="+23480..." /></div>
                <div><label className="label">Email Address *</label><input required type="email" className="input" value={form.email} onChange={set('email')} placeholder="john@example.com" /></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Gender *</label>
                  <select required className="input" value={form.gender} onChange={set('gender')}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div><label className="label">Visit Date *</label><input required type="date" className="input" value={form.visitDate} onChange={set('visitDate')} /></div>
              </div>

              {/* Home Church Decision Question */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={14} className="text-emerald-600" />
                  <span>Church Family Decision</span>
                </div>
                <label className="block text-sm font-bold text-gray-900">
                  Would you like to make {meta.church.name} your home church / join our family? *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { id: 'join_church', label: 'Yes, I want to join!', sub: 'Make this my church family', icon: '🎉' },
                    { id: 'considering', label: 'Still Considering', sub: 'Praying & visiting for now', icon: '🙏' },
                    { id: 'visiting', label: 'Just Visiting', sub: 'From out of town / guest', icon: '✈️' },
                  ].map((opt) => {
                    const isSelected = form.decision === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleDecisionSelect(opt.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-emerald-600 shadow-xs ring-2 ring-emerald-500'
                            : 'bg-white/80 border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-lg mb-1">{opt.icon}</div>
                        <p className="font-bold text-xs text-gray-900">{opt.label}</p>
                        <p className="text-[11px] text-gray-500">{opt.sub}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" max={new Date().toISOString().slice(0,10)} className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                </div>
                <div>
                  <label className="label">How did you hear about us? *</label>
                  <select required className="input" value={form.howDidYouHear} onChange={set('howDidYouHear')}>
                    <option value="">Select</option>
                    {HEAR_OPTIONS.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              {meta.branches?.length > 1 && (
                <div>
                  <label className="label">Campus Branch</label>
                  <select className="input" value={form.branchId} onChange={set('branchId')}>
                    <option value="">Select branch</option>
                    {meta.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Service Attended</label><input className="input" value={form.serviceAttended} onChange={set('serviceAttended')} placeholder="Sunday 1st Service, Midweek..." /></div>
                <div><label className="label">Residential Address</label><input className="input" value={form.address} onChange={set('address')} placeholder="e.g. 12 Broad Street..." /></div>
              </div>

              <div>
                <label className="label">Prayer Request / Note for Pastor</label>
                <textarea
                  rows={2}
                  className="input"
                  placeholder="How can we pray for you or support you this week?"
                  value={form.prayerRequest}
                  onChange={set('prayerRequest')}
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center inline-flex items-center gap-2 py-3">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Visitor Card
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}