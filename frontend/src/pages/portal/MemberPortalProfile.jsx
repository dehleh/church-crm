import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';

const fmtDate = (d) => d ? String(d).slice(0, 10) : '';

export default function MemberPortalProfile() {
  const { me, refresh } = useOutletContext();
  const [form, setForm] = useState({
    phone: me.phone || '',
    phoneAlt: me.phoneAlt || '',
    address: me.address || '',
    city: me.city || '',
    state: me.state || '',
    country: me.country || '',
    occupation: me.occupation || '',
    employer: me.employer || '',
    maritalStatus: me.maritalStatus || '',
    weddingAnniversaryDate: fmtDate(me.weddingAnniversaryDate),
    numChildren: me.numChildren ?? 0,
    nextOfKinName: me.nextOfKinName || '',
    nextOfKinPhone: me.nextOfKinPhone || '',
    nextOfKinRelationship: me.nextOfKinRelationship || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await memberPortalAPI.updateProfile(form);
      toast.success('Profile updated');
      refresh && refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none';

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setUploading(true);
    try {
      await memberPortalAPI.uploadAvatar(file);
      toast.success('Photo updated');
      refresh && refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  const initials = `${me.firstName?.[0] || ''}${me.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
      <p className="text-gray-500 text-sm mb-6">Keep your contact and family details current so the church can stay in touch.</p>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            {me.profilePhotoUrl ? (
              <img src={me.profilePhotoUrl} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-brand-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-2xl">{initials}</div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 truncate">{me.firstName} {me.middleName} {me.lastName}</div>
            <div className="text-xs text-gray-500">{me.memberNumber}</div>
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-brand-600 font-semibold hover:underline mt-1">
              Change profile photo
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs text-gray-400 uppercase font-semibold">Email</div><div className="text-gray-900 font-medium mt-0.5 break-all">{me.email || '—'}</div></div>
          <div><div className="text-xs text-gray-400 uppercase font-semibold">Date of Birth</div><div className="text-gray-900 font-medium mt-0.5">{fmtDate(me.dateOfBirth) || '—'}</div></div>
          <div><div className="text-xs text-gray-400 uppercase font-semibold">Gender</div><div className="text-gray-900 font-medium mt-0.5 capitalize">{me.gender || '—'}</div></div>
          <div><div className="text-xs text-gray-400 uppercase font-semibold">Joined</div><div className="text-gray-900 font-medium mt-0.5">{fmtDate(me.joinDate) || '—'}</div></div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Contact your church admin to change your name, email, member number, gender, or date of birth.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
          <Field label="Alternate phone"><input className={inputCls} value={form.phoneAlt} onChange={set('phoneAlt')} /></Field>
        </div>
        <Field label="Address"><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><input className={inputCls} value={form.city} onChange={set('city')} /></Field>
          <Field label="State"><input className={inputCls} value={form.state} onChange={set('state')} /></Field>
          <Field label="Country"><input className={inputCls} value={form.country} onChange={set('country')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Occupation"><input className={inputCls} value={form.occupation} onChange={set('occupation')} /></Field>
          <Field label="Employer"><input className={inputCls} value={form.employer} onChange={set('employer')} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Marital status">
            <select className={inputCls} value={form.maritalStatus} onChange={set('maritalStatus')}>
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Wedding anniversary"><input type="date" className={inputCls} value={form.weddingAnniversaryDate} onChange={set('weddingAnniversaryDate')} /></Field>
          <Field label="# Children"><input type="number" min={0} className={inputCls} value={form.numChildren} onChange={(e) => setForm(f => ({ ...f, numChildren: e.target.value === '' ? 0 : Number(e.target.value) }))} /></Field>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Next of kin</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name"><input className={inputCls} value={form.nextOfKinName} onChange={set('nextOfKinName')} /></Field>
            <Field label="Phone"><input className={inputCls} value={form.nextOfKinPhone} onChange={set('nextOfKinPhone')} /></Field>
            <Field label="Relationship"><input className={inputCls} value={form.nextOfKinRelationship} onChange={set('nextOfKinRelationship')} /></Field>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
