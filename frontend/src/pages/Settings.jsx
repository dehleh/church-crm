import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, User, Lock, Save, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../api/client';

const TABS = [
  { id: 'church',   label: 'Church Profile',  icon: Building2 },
  { id: 'profile',  label: 'My Profile',       icon: User },
  { id: 'password', label: 'Change Password',  icon: Lock },
];

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button onClick={() => onClick(tab.id)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium w-full transition-all
        ${active ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={16} /> {tab.label}
    </button>
  );
}

export default function Settings() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState('church');
  const [church, setChurch] = useState({});
  const [churchStats, setChurchStats] = useState({});
  const [profile, setProfile] = useState({});
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/settings/stats'),
    ]).then(([churchRes, statsRes]) => {
      const c = churchRes.data.data;
      setChurch({
        name: c.name, address: c.address, city: c.city, state: c.state,
        country: c.country, phone: c.phone, email: c.email, website: c.website,
        denomination: c.denomination, timezone: c.timezone, currency: c.currency,
      });
      setChurchStats(statsRes.data.data);
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));

    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const setC = k => e => setChurch(f => ({ ...f, [k]: e.target.value }));
  const setP = k => e => setProfile(f => ({ ...f, [k]: e.target.value }));
  const setPw = k => e => setPasswords(f => ({ ...f, [k]: e.target.value }));

  const saveChurch = async () => {
    setSaving(true);
    try {
      await api.put('/settings/church', church);
      toast.success('Church settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/profile', profile);
      // Update auth context user
      const updated = res.data.data;
      const tokens = { accessToken: localStorage.getItem('accessToken'), refreshToken: localStorage.getItem('refreshToken') };
      login({ ...user, firstName: updated.first_name, lastName: updated.last_name, phone: updated.phone }, tokens);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to save profile'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post('/settings/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const DENOMINATIONS = ['Pentecostal', 'Baptist', 'Anglican', 'Catholic', 'Methodist', 'Presbyterian', 'Evangelical', 'Non-denominational', 'Others'];
  const TIMEZONES = ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'UTC'];
  const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP'];

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your church and account preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {TABS.map(tab => <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={setActiveTab} />)}

          {/* Church stats */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">Overview</p>
            {[
              { label: 'Members', value: churchStats.active_members },
              { label: 'Staff Users', value: churchStats.staff_users },
              { label: 'Branches', value: churchStats.branches },
              { label: 'Departments', value: churchStats.departments },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-1 py-1.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-900">{value || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'church' && (
            <div className="card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 text-2xl">⛪</div>
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-lg">{church.name}</h2>
                  <p className="text-xs text-gray-400">Church profile and preferences</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Church Name</label>
                    <input className="input" value={church.name || ''} onChange={setC('name')} />
                  </div>
                  <div>
                    <label className="label">Denomination</label>
                    <select className="input" value={church.denomination || ''} onChange={setC('denomination')}>
                      <option value="">Select</option>
                      {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={church.phone || ''} onChange={setC('phone')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Email</label>
                    <input type="email" className="input" value={church.email || ''} onChange={setC('email')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Website</label>
                    <input type="url" className="input" placeholder="https://mychurch.org" value={church.website || ''} onChange={setC('website')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input className="input" value={church.address || ''} onChange={setC('address')} />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={church.city || ''} onChange={setC('city')} />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input className="input" value={church.state || ''} onChange={setC('state')} />
                  </div>
                  <div>
                    <label className="label">Timezone</label>
                    <select className="input" value={church.timezone || 'Africa/Lagos'} onChange={setC('timezone')}>
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Currency</label>
                    <select className="input" value={church.currency || 'NGN'} onChange={setC('currency')}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={saveChurch} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="font-display font-bold text-gray-900 text-lg mb-6">My Profile</h2>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold">
                  {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full capitalize mt-1 inline-block">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input className="input" value={profile.firstName || ''} onChange={setP('firstName')} />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={profile.lastName || ''} onChange={setP('lastName')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Phone</label>
                    <input type="tel" className="input" value={profile.phone || ''} onChange={setP('phone')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Email</label>
                    <input className="input" value={user?.email || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact your admin.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={saveProfile} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="card">
              <h2 className="font-display font-bold text-gray-900 text-lg mb-2">Change Password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password with at least 8 characters.</p>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" className="input" value={passwords.currentPassword} onChange={setPw('currentPassword')} />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" className="input" value={passwords.newPassword} onChange={setPw('newPassword')} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input type="password" className="input" value={passwords.confirmPassword} onChange={setPw('confirmPassword')} />
                  {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword && passwords.newPassword.length >= 8 && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle size={11} /> Passwords match</p>
                  )}
                </div>
                <div className="pt-2">
                  <button onClick={savePassword} disabled={saving || !passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword} className="btn-primary">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
