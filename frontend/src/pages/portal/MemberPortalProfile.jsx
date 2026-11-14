import { useRef, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Loader2, Save, Camera, Download, Bell, Smartphone, Mail, MessageSquare, Send, CheckCircle2,
  CalendarOff, Plus, Trash2, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import { memberPortalAPI } from '../../api/memberClient';
import { isPushSupported, subscribeUserToPush } from '../../utils/pushNotifications';

const fmtDate = (d) => d ? String(d).slice(0, 10) : '';

export default function MemberPortalProfile() {
  const { me, refresh } = useOutletContext();
  const [exporting, setExporting] = useState(false);
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

  // Volunteer Blockout Dates State
  const [blockouts, setBlockouts] = useState([]);
  const [loadingBlockouts, setLoadingBlockouts] = useState(false);
  const [showBlockoutForm, setShowBlockoutForm] = useState(false);
  const [blockoutStartDate, setBlockoutStartDate] = useState('');
  const [blockoutEndDate, setBlockoutEndDate] = useState('');
  const [blockoutReason, setBlockoutReason] = useState('Personal Unavailability');
  const [savingBlockout, setSavingBlockout] = useState(false);

  const [prefs, setPrefs] = useState({
    push_enabled: true,
    email_enabled: true,
    whatsapp_enabled: true,
    notify_devotionals: true,
    notify_prayers: true,
    notify_announcements: true,
    notify_events: true,
    notify_giving: true,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    memberPortalAPI.getPreferences()
      .then(res => {
        if (res.data?.data) {
          setPrefs(prev => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
    fetchBlockouts();
  }, []);

  const fetchBlockouts = () => {
    setLoadingBlockouts(true);
    memberPortalAPI.listBlockouts()
      .then(res => setBlockouts(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingBlockouts(false));
  };

  const handleAddBlockout = async (e) => {
    e.preventDefault();
    if (!blockoutStartDate || !blockoutEndDate) {
      return toast.error('Start and end dates are required');
    }
    if (new Date(blockoutStartDate) > new Date(blockoutEndDate)) {
      return toast.error('Start date cannot be after end date');
    }
    setSavingBlockout(true);
    try {
      await memberPortalAPI.addBlockout({
        startDate: blockoutStartDate,
        endDate: blockoutEndDate,
        reason: blockoutReason || 'Unavailable',
      });
      toast.success('Blockout dates recorded. Leadership will be notified of your unavailability.');
      setShowBlockoutForm(false);
      setBlockoutStartDate('');
      setBlockoutEndDate('');
      setBlockoutReason('Personal Unavailability');
      fetchBlockouts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save blockout');
    } finally {
      setSavingBlockout(false);
    }
  };

  const handleDeleteBlockout = async (id) => {
    try {
      await memberPortalAPI.deleteBlockout(id);
      toast.success('Blockout date removed');
      fetchBlockouts();
    } catch {
      toast.error('Failed to remove blockout');
    }
  };

  const togglePref = (k) => {
    setPrefs(p => ({ ...p, [k]: !p[k] }));
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await memberPortalAPI.updatePreferences(prefs);
      toast.success('Notification preferences updated successfully');
    } catch (err) {
      toast.error('Failed to update notification preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await memberPortalAPI.sendTestPush();
      if (res.data?.data?.sent > 0) {
        toast.success('Test pop-up sent to your phone!');
      } else {
        toast('No active push subscription found on this device. Tap "Enable Phone Pop-ups" on Home first.');
      }
    } catch (err) {
      toast.error('Failed to send test notification');
    } finally {
      setTestingPush(false);
    }
  };

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

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await memberPortalAPI.exportData();
      const blob = new Blob([JSON.stringify(res.data?.data || res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church-member-data-${me.id || 'archive'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Your complete personal data archive has been downloaded!');
    } catch {
      toast.error('Failed to export personal data');
    } finally {
      setExporting(false);
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Download My Personal Data (GDPR / NDPR)</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg w-full sm:w-auto justify-center"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Phone Pop-ups & Notification Settings Card */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Phone Pop-ups & Notifications</h2>
              <p className="text-xs text-gray-500">Manage what pops up on your phone screen, email inbox & WhatsApp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSendTestPush}
            disabled={testingPush}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {testingPush ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Test Phone Pop-up</span>
          </button>
        </div>

        {loadingPrefs ? (
          <div className="py-6 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Delivery Channels */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Notification Channels</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50/80 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={18} className="text-indigo-600" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Phone Pop-ups</div>
                      <div className="text-[11px] text-gray-500">Lock screen & push</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.push_enabled}
                    onChange={() => togglePref('push_enabled')}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50/80 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Mail size={18} className="text-blue-600" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">Email Digest</div>
                      <div className="text-[11px] text-gray-500">Inbox summaries</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.email_enabled}
                    onChange={() => togglePref('email_enabled')}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50/80 transition-all">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={18} className="text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-gray-900">WhatsApp</div>
                      <div className="text-[11px] text-gray-500">Direct messages</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.whatsapp_enabled}
                    onChange={() => togglePref('whatsapp_enabled')}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Notification Topics */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">What You Receive</h3>
              <div className="space-y-2.5">
                {[
                  { key: 'notify_devotionals', title: 'Daily Morning Devotionals', desc: 'Receive morning scripture, reflections, faith declarations & Bible reading at 6:00 AM' },
                  { key: 'notify_prayers', title: 'Urgent Prayer Alerts', desc: 'Instant notifications when prayer requests are received or urgent intercession is needed' },
                  { key: 'notify_announcements', title: 'Church Announcements', desc: 'Important notices, special services, and administrative broadcasts' },
                  { key: 'notify_events', title: 'Service & Event Reminders', desc: '24-hour and 1-hour reminders before Sunday services, conferences, and programs' },
                  { key: 'notify_giving', title: 'Giving & Tithe Confirmations', desc: 'Instant notifications and digital receipts for contributions' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="pr-4">
                      <div className="text-xs font-semibold text-gray-900">{item.title}</div>
                      <div className="text-[11px] text-gray-500">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs[item.key]}
                      onChange={() => togglePref(item.key)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={savingPrefs}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                {savingPrefs ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Notification Preferences</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Volunteer Unavailability & Blockout Dates Card */}
      <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CalendarOff size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Volunteer Availability & Blockout Dates</h2>
              <p className="text-xs text-gray-500">Set dates when you are traveling or unavailable so you are not rostered on duty</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBlockoutForm(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Plus size={14} />
            <span>{showBlockoutForm ? 'Cancel' : 'Add Blockout Date'}</span>
          </button>
        </div>

        {/* Add Blockout Form */}
        {showBlockoutForm && (
          <form onSubmit={handleAddBlockout} className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-purple-900">Schedule Unavailable Date Range</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={blockoutStartDate}
                  onChange={e => setBlockoutStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input
                  type="date"
                  required
                  className={inputCls}
                  value={blockoutEndDate}
                  onChange={e => setBlockoutEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Reason / Notes</label>
              <input
                className={inputCls}
                placeholder="e.g. Annual Leave, Family Wedding, Out of town"
                value={blockoutReason}
                onChange={e => setBlockoutReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingBlockout}
                className="btn-primary text-xs bg-purple-600 hover:bg-purple-700 h-8 px-4"
              >
                {savingBlockout ? <Loader2 size={13} className="animate-spin" /> : 'Save Blockout Window'}
              </button>
            </div>
          </form>
        )}

        {/* Blockouts List */}
        {loadingBlockouts ? (
          <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : blockouts.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            <Calendar className="mx-auto text-gray-300 mb-1" size={24} />
            <p>You have no scheduled blockout dates. You are marked available for service rosters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {blockouts.map(b => (
              <div key={b.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-50/50 transition-colors">
                <div>
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    <CalendarOff size={13} className="text-purple-600" />
                    <span>{b.start_date ? String(b.start_date).slice(0, 10) : ''} to {b.end_date ? String(b.end_date).slice(0, 10) : ''}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{b.reason || 'Personal Unavailability'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBlockout(b.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                  title="Remove blockout date"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
