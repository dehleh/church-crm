import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Loader2, ScanLine } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { publicIntakeAPI } from '../api/services';
import toast from 'react-hot-toast';

export default function PublicEventCheckIn() {
  const { churchSlug, eventId } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ memberNumber: '', phone: '' });

  useEffect(() => {
    let active = true;
    publicIntakeAPI.getEventCheckIn(churchSlug, eventId)
      .then((res) => active && setMeta(res.data.data))
      .catch(() => active && toast.error('Unable to load check-in page'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [churchSlug, eventId]);

  const eventTime = useMemo(() => meta?.event?.start_datetime ? format(parseISO(meta.event.start_datetime), 'EEEE, MMM d, yyyy · h:mm a') : '', [meta]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.memberNumber.trim() || !form.phone.trim()) return toast.error('Member ID and phone are required');
    setSubmitting(true);
    try {
      const res = await publicIntakeAPI.submitEventCheckIn(churchSlug, eventId, form);
      setResult({ message: res.data.message, alreadyCheckedIn: !!res.data.alreadyCheckedIn });
      toast.success(res.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={28} /></div>;
  if (!meta?.event) return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-center text-gray-600">This check-in link is not available.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg mb-4">
            <ScanLine size={28} />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">{meta.church.name}</h1>
          <p className="text-gray-600 mt-2">Event Check-In</p>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 md:p-8 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-lg font-semibold text-gray-900">{meta.event.title}</p>
            <p className="text-sm text-gray-500 mt-1 inline-flex items-center gap-2"><CalendarDays size={14} /> {eventTime}</p>
            {meta.event.branch_name && <p className="text-sm text-gray-500 mt-1">{meta.event.branch_name}</p>}
          </div>

          {result ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 size={42} className={`mx-auto ${result.alreadyCheckedIn ? 'text-amber-500' : 'text-emerald-600'}`} />
              <p className="text-lg font-semibold text-gray-900">{result.alreadyCheckedIn ? 'Already Checked In' : 'Check-In Successful'}</p>
              <p className="text-gray-600">{result.message}</p>
              <button onClick={() => { setResult(null); setForm({ memberNumber: '', phone: '' }); }} className="btn-secondary">Check in another member</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Member ID *</label><input className="input" value={form.memberNumber} onChange={set('memberNumber')} placeholder="MBR-00001" /></div>
              <div><label className="label">Phone Number *</label><input className="input" value={form.phone} onChange={set('phone')} placeholder="Use the phone number on your member profile" /></div>
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center inline-flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16} />} Check In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}