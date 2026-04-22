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
      await publicIntakeAPI.submitMember(churchSlug, form);
      setSubmitted(true);
      toast.success('Membership details submitted');
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
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg mb-4">
            <Church size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">Member Registration Form</p>
          {location && <p className="text-sm text-gray-400 mt-1">{location}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-10 space-y-3">
              <h2 className="text-2xl font-display font-bold text-gray-900">Submission received</h2>
              <p className="text-gray-600">Your details are now in the church CRM and will appear for staff review before activation.</p>
              <button onClick={() => { setSubmitted(false); setForm({ firstName: '', lastName: '', email: '', phone: '', gender: '', dateOfBirth: '', maritalStatus: '', address: '', branchId: '', membershipClass: 'full', occupation: '', employer: '', notes: '', joinDate: new Date().toISOString().slice(0, 10) }); }} className="btn-secondary">Submit another response</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">First Name *</label><input className="input" value={form.firstName} onChange={set('firstName')} /></div>
                <div><label className="label">Last Name *</label><input className="input" value={form.lastName} onChange={set('lastName')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={set('email')} /></div>
                <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="+234..." /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Gender *</label>
                  <select className="input" value={form.gender} onChange={set('gender')}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div><label className="label">Date of Birth *</label><input type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Marital Status *</label>
                  <select className="input" value={form.maritalStatus} onChange={set('maritalStatus')}>
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="label">Membership Class</label>
                  <select className="input" value={form.membershipClass} onChange={set('membershipClass')}>
                    <option value="full">Full Member</option>
                    <option value="associate">Associate</option>
                    <option value="youth">Youth</option>
                    <option value="child">Child</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Branch</label>
                <select className="input" value={form.branchId} onChange={set('branchId')}>
                  <option value="">Select branch</option>
                  {meta.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>
              <div><label className="label">Address *</label><input className="input" value={form.address} onChange={set('address')} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={set('occupation')} /></div>
                <div><label className="label">Employer / Company</label><input className="input" value={form.employer} onChange={set('employer')} /></div>
              </div>
              <div><label className="label">Notes</label><textarea className="input min-h-[100px]" value={form.notes} onChange={set('notes')} placeholder="Any extra information you want the church office to have" /></div>
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center inline-flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Form
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}