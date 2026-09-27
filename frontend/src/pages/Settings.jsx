import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Building2, User, Lock, Save, Loader2, CheckCircle,
  Mail, MessageCircle, Phone, Send, ToggleLeft, ToggleRight, Users, Plus, Trash2,
  Edit3, Image, Globe, Sparkles, AlertCircle, CreditCard, Shield, QrCode, Key,
  Copy, Check, ExternalLink, Palette, Clock, LayoutDashboard, CheckCircle2, Tag,
  Eye, Sliders, Layers, Radio, FileText, HeartHandshake, Heart, BookOpen,
  GraduationCap, Bell, Film, Cake, DollarSign, Calendar, MapPin, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { twoFactorAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import api from '../api/client';

const TABS = [
  { id: 'church',    label: 'Profile & Brand Identity',  icon: Building2 },
  { id: 'theme',     label: 'Visual Theme & Colors',     icon: Palette },
  { id: 'services',  label: 'Service Times & Schedule',  icon: Clock },
  { id: 'portal',    label: 'Member Portal Experience',  icon: LayoutDashboard },
  { id: 'public',    label: 'Public Connect & Forms',    icon: Globe },
  { id: 'pastors',   label: 'Pastoral Leadership',       icon: Users },
  { id: 'messaging', label: 'Messaging & WhatsApp',      icon: Mail },
  { id: 'giving',    label: 'Online Giving & Payments',  icon: CreditCard },
  { id: 'security',  label: 'Security & 2FA',            icon: Shield },
  { id: 'profile',   label: 'My Profile',                icon: User },
  { id: 'password',  label: 'Change Password',           icon: Lock },
];

const THEME_PRESETS = [
  { name: 'Royal Sapphire',   primary: '#1d4ed8', accent: '#3b82f6', bgGradient: 'from-blue-700 via-blue-800 to-indigo-950', desc: 'Authoritative, trustworthy & global' },
  { name: 'Emerald Cathedral', primary: '#047857', accent: '#10b981', bgGradient: 'from-emerald-700 via-emerald-800 to-slate-950', desc: 'Growth, flourishing & eternal life' },
  { name: 'Grace Purple',     primary: '#7c3aed', accent: '#8b5cf6', bgGradient: 'from-purple-700 via-purple-800 to-indigo-950', desc: 'Divine majesty, worship & royalty' },
  { name: 'Crimson Flame',    primary: '#b91c1c', accent: '#ef4444', bgGradient: 'from-rose-700 via-red-800 to-slate-950', desc: 'Pentecostal fire, prayer & zeal' },
  { name: 'Warm Amber',       primary: '#b45309', accent: '#f59e0b', bgGradient: 'from-amber-600 via-orange-700 to-stone-950', desc: 'Harvest, kingdom warmth & fellowship' },
  { name: 'Midnight Charcoal', primary: '#0f172a', accent: '#475569', bgGradient: 'from-slate-800 via-slate-900 to-black', desc: 'Modern, minimalist & sleek' },
  { name: 'Ocean Teal',       primary: '#0f766e', accent: '#14b8a6', bgGradient: 'from-teal-700 via-teal-800 to-slate-950', desc: 'Peace, renewal & mission vision' },
  { name: 'Rose Gold',        primary: '#be185d', accent: '#ec4899', bgGradient: 'from-pink-700 via-rose-800 to-slate-950', desc: 'Love, grace & community care' },
];

const FONT_OPTIONS = [
  { id: 'Inter',            name: 'Inter (Modern & Clean)' },
  { id: 'Plus Jakarta Sans',name: 'Plus Jakarta Sans (Contemporary)' },
  { id: 'Outfit',           name: 'Outfit (Geometric & Bold)' },
  { id: 'Poppins',          name: 'Poppins (Friendly & Welcoming)' },
];

const PORTAL_MODULES = [
  { key: 'devotionals',   label: 'Daily Devotionals',       icon: BookOpen,      desc: 'Daily word of faith, scripture & audio stream' },
  { key: 'discipleship',  label: 'Discipleship School',     icon: GraduationCap, desc: 'Interactive lessons, milestones & certificates' },
  { key: 'announcements', label: 'Broadcast Notices',       icon: Bell,          desc: 'Official broadcasts and pastoral announcements' },
  { key: 'media',         label: 'Media & Sermons',         icon: Film,          desc: 'Audio sermon library, video streams & podcasts' },
  { key: 'birthdays',     label: 'Birthday Celebrations',   icon: Cake,          desc: "Today's celebrants & family congratulations" },
  { key: 'giving',        label: 'Online Giving & Tithes',  icon: DollarSign,    desc: 'Offerings, building pledges & payment receipts' },
  { key: 'events',        label: 'Events & Church Calendar',icon: Calendar,      desc: 'Upcoming programs, registration & QR check-in' },
  { key: 'fellowship',    label: 'Cell Fellowship / Centers',icon: MapPin,       desc: 'Home fellowship cells and neighborhood centers' },
  { key: 'groups',        label: 'Ministries & Units',      icon: Users,         desc: 'Choir, ushering, youth and department groups' },
  { key: 'counseling',    label: 'Pastoral Counseling',     icon: MessageCircle, desc: 'Confidential appointment booking with ministers' },
  { key: 'welfare',       label: 'Welfare & Benevolence',   icon: Heart,         desc: 'Emergency assistance requests and welfare packages' },
  { key: 'prayer',        label: 'Prayer Requests',         icon: HeartHandshake,desc: 'Submit private or church-wide prayer petitions' },
];

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button onClick={() => onClick(tab.id)}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium w-full transition-all text-left
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
  const [messaging, setMessaging] = useState({ email: {}, sms: {}, whatsapp: {} });
  const [testRecipient, setTestRecipient] = useState({ email: '', sms: '', whatsapp: '' });
  const [testing, setTesting] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Visual Theme & Branding State
  const [theme, setTheme] = useState({
    primaryColor: '#1d4ed8',
    accentColor: '#3b82f6',
    fontFamily: 'Inter',
    presetName: 'Royal Sapphire',
  });

  // Worship & Service Schedule State
  const [services, setServices] = useState([]);
  const [serviceModal, setServiceModal] = useState({ open: false, index: null, data: { name: '', day: 'Sunday', time: '', venue: '' } });

  // Member Portal Digital Experience State
  const [portalConfig, setPortalConfig] = useState({
    welcomeTitle: 'Welcome to your digital church family',
    welcomeMessage: 'We are delighted to have you connect, grow, and fellowship with us.',
    bannerNotice: '',
    bannerNoticeActive: false,
    enabledModules: {
      devotionals: true,
      discipleship: true,
      announcements: true,
      media: true,
      birthdays: true,
      giving: true,
      events: true,
      fellowship: true,
      groups: true,
      counseling: true,
      welfare: true,
      prayer: true,
    }
  });

  // Public Connect & Forms Customization State
  const [publicConnect, setPublicConnect] = useState({
    firstTimerGreeting: 'Welcome Home! We are blessed and honored to have you worship with us today.',
    firstTimerThankYou: 'Thank you for connecting with our church family. A minister will reach out to bless you this week!',
    givingScripture: 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.',
    givingVerse: '2 Corinthians 9:7',
    prayerGreeting: 'The prayer of a righteous person is powerful and effective. Share your prayer burdens with our pastoral intercession team.',
  });

  // Church Core Values State
  const [coreValues, setCoreValues] = useState(['Faith', 'Love', 'Excellence', 'Integrity', 'Community', 'Discipleship']);
  const [newValueInput, setNewValueInput] = useState('');

  // Pastors management state
  const [pastorModal, setPastorModal] = useState({ open: false, index: null, data: {} });

  // Online Giving & Payments State
  const [paymentSettings, setPaymentSettings] = useState({
    paystackPublicKey: '',
    paystackSecretKey: '',
    bankDetails: { bankName: '', accountName: '', accountNumber: '' },
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // Security & 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorModal, setTwoFactorModal] = useState({
    open: false,
    step: 'setup',
    qrCode: '',
    secret: '',
    code: '',
    backupCodes: [],
  });
  const [disable2FAModal, setDisable2FAModal] = useState({ open: false, password: '', code: '' });

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/settings/stats'),
      api.get('/settings/messaging').catch(() => ({ data: { data: { email: {}, sms: {}, whatsapp: {} } } })),
      twoFactorAPI.getStatus().catch(() => ({ data: { data: { twoFactorEnabled: false } } })),
    ]).then(([churchRes, statsRes, msgRes, twoFaRes]) => {
      const c = churchRes.data.data;
      const s = c.settings || {};
      const th = s.theme || {};
      setTheme({
        primaryColor: th.primaryColor || '#1d4ed8',
        accentColor: th.accentColor || '#3b82f6',
        fontFamily: th.fontFamily || 'Inter',
        presetName: th.presetName || 'Royal Sapphire',
      });
      const pt = s.portal || {};
      setPortalConfig({
        welcomeTitle: pt.welcomeTitle || 'Welcome to your digital church family',
        welcomeMessage: pt.welcomeMessage || 'We are delighted to have you connect, grow, and fellowship with us.',
        bannerNotice: pt.bannerNotice || '',
        bannerNoticeActive: Boolean(pt.bannerNoticeActive),
        enabledModules: {
          devotionals: pt.enabledModules?.devotionals ?? true,
          discipleship: pt.enabledModules?.discipleship ?? true,
          announcements: pt.enabledModules?.announcements ?? true,
          media: pt.enabledModules?.media ?? true,
          birthdays: pt.enabledModules?.birthdays ?? true,
          giving: pt.enabledModules?.giving ?? true,
          events: pt.enabledModules?.events ?? true,
          fellowship: pt.enabledModules?.fellowship ?? true,
          groups: pt.enabledModules?.groups ?? true,
          counseling: pt.enabledModules?.counseling ?? true,
          welfare: pt.enabledModules?.welfare ?? true,
          prayer: pt.enabledModules?.prayer ?? true,
        }
      });
      setServices(Array.isArray(s.serviceSchedule) && s.serviceSchedule.length > 0 ? s.serviceSchedule : [
        { id: '1', name: 'Sunday 1st Service', day: 'Sunday', time: '08:00 AM - 10:00 AM', venue: 'Main Auditorium & Online' },
        { id: '2', name: 'Sunday 2nd Service', day: 'Sunday', time: '10:15 AM - 12:15 PM', venue: 'Main Auditorium' },
        { id: '3', name: 'Midweek Bible Study', day: 'Wednesday', time: '06:00 PM - 07:30 PM', venue: 'Chapel of Grace' },
      ]);
      setPublicConnect(s.publicConnect || {
        firstTimerGreeting: 'Welcome Home! We are blessed and honored to have you worship with us today.',
        firstTimerThankYou: 'Thank you for connecting with our church family. A minister will reach out to bless you this week!',
        givingScripture: 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.',
        givingVerse: '2 Corinthians 9:7',
        prayerGreeting: 'The prayer of a righteous person is powerful and effective. Share your prayer burdens with our pastoral intercession team.',
      });
      if (Array.isArray(s.coreValues) && s.coreValues.length > 0) {
        setCoreValues(s.coreValues);
      }

      setChurch({
        slug: c.slug || '',
        name: c.name || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        country: c.country || '',
        phone: c.phone || '',
        email: c.email || '',
        website: c.website || '',
        denomination: c.denomination || '',
        timezone: c.timezone || 'Africa/Lagos',
        currency: c.currency || 'NGN',
        logoUrl: c.logo_url || '',
        bannerUrl: c.banner_url || '',
        tagline: c.tagline || '',
        mission: c.mission || '',
        vision: c.vision || '',
        socialLinks: c.social_links || { facebook: '', instagram: '', youtube: '', twitter: '', tiktok: '', spotify: '' },
        pastors: Array.isArray(c.pastors) ? c.pastors : [],
        settings: s,
      });
      setChurchStats(statsRes.data.data);
      setMessaging(msgRes.data.data || { email: {}, sms: {}, whatsapp: {} });
      if (c.payment_settings) {
        setPaymentSettings({
          paystackPublicKey: c.payment_settings.paystackPublicKey || '',
          paystackSecretKey: c.payment_settings.paystackSecretKey || '',
          bankDetails: c.payment_settings.bankDetails || { bankName: '', accountName: '', accountNumber: '' },
        });
      }
      setTwoFactorEnabled(Boolean(twoFaRes.data?.data?.twoFactorEnabled));
    }).catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));

    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
  }, [user]);

  const setC = k => e => setChurch(f => ({ ...f, [k]: e.target.value }));
  const setSocial = k => e => setChurch(f => ({
    ...f,
    socialLinks: { ...(f.socialLinks || {}), [k]: e.target.value }
  }));
  const setP = k => e => setProfile(f => ({ ...f, [k]: e.target.value }));
  const setPw = k => e => setPasswords(f => ({ ...f, [k]: e.target.value }));

  const saveCustomization = async (updatedSettingsPatch, successMsg) => {
    setSaving(true);
    try {
      const payload = {
        ...church,
        settings: {
          theme,
          portal: portalConfig,
          serviceSchedule: services,
          publicConnect,
          coreValues,
          ...updatedSettingsPatch
        }
      };
      await api.put('/settings/church', payload);
      setChurch(prev => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          ...updatedSettingsPatch
        }
      }));
      toast.success(successMsg || 'Customization saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveChurch = async (customChurchObj) => {
    setSaving(true);
    try {
      const payload = {
        ...(customChurchObj || church),
        settings: {
          ...(church.settings || {}),
          theme,
          portal: portalConfig,
          serviceSchedule: services,
          publicConnect,
          coreValues,
        }
      };
      await api.put('/settings/church', payload);
      toast.success('Church profile & branding saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings/profile', profile);
      const updated = res.data.data;
      const tokens = { accessToken: localStorage.getItem('accessToken'), refreshToken: localStorage.getItem('refreshToken') };
      login({ ...user, firstName: updated.first_name, lastName: updated.last_name, phone: updated.phone }, tokens);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
  };

  const setM = (section, key) => e => setMessaging(m => ({
    ...m,
    [section]: {
      ...m[section],
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    }
  }));

  const saveMessaging = async () => {
    setSaving(true);
    try {
      await api.put('/settings/messaging', messaging);
      toast.success('Messaging settings saved!');
    } catch {
      toast.error('Failed to save messaging settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel) => {
    const recipient = testRecipient[channel];
    if (!recipient) return toast.error(`Enter a ${channel === 'email' ? 'email address' : 'phone number'} to test`);
    setTesting(channel);
    try {
      const res = await api.post('/settings/messaging/test', { channel, recipient });
      toast.success(res.data.message || 'Test sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setTesting('');
    }
  };

  // Pastors Handlers
  const handleSavePastor = () => {
    if (!pastorModal.data.name || !pastorModal.data.role) {
      return toast.error('Name and Role/Title are required');
    }
    const currentPastors = [...(church.pastors || [])];
    if (pastorModal.index !== null) {
      currentPastors[pastorModal.index] = pastorModal.data;
    } else {
      currentPastors.push(pastorModal.data);
    }
    const updated = { ...church, pastors: currentPastors };
    setChurch(updated);
    setPastorModal({ open: false, index: null, data: {} });
    saveChurch(updated);
  };

  const handleDeletePastor = (idx) => {
    if (!window.confirm('Are you sure you want to remove this minister from the roster?')) return;
    const currentPastors = (church.pastors || []).filter((_, i) => i !== idx);
    const updated = { ...church, pastors: currentPastors };
    setChurch(updated);
    saveChurch(updated);
  };

  // Service Schedule Handlers
  const handleSaveService = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!serviceModal.data.name?.trim()) return toast.error('Service name is required');
    if (!serviceModal.data.time?.trim()) return toast.error('Service time is required');
    let updated;
    if (serviceModal.index !== null) {
      updated = [...services];
      updated[serviceModal.index] = { ...serviceModal.data };
    } else {
      updated = [...services, { ...serviceModal.data, id: String(Date.now()) }];
    }
    setServices(updated);
    saveCustomization({ serviceSchedule: updated }, 'Worship schedule updated!');
    setServiceModal({ open: false, index: null, data: { name: '', day: 'Sunday', time: '', venue: '' } });
  };

  const handleDeleteService = (idx) => {
    if (!window.confirm('Remove this service from schedule?')) return;
    const updated = services.filter((_, i) => i !== idx);
    setServices(updated);
    saveCustomization({ serviceSchedule: updated }, 'Service removed');
  };

  // Core Values Handlers
  const handleAddCoreValue = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = newValueInput.trim();
    if (!val) return;
    if (coreValues.includes(val)) return toast.error('Value already added');
    const updated = [...coreValues, val];
    setCoreValues(updated);
    setNewValueInput('');
  };

  const handleRemoveCoreValue = (idx) => {
    setCoreValues(coreValues.filter((_, i) => i !== idx));
  };

  const savePaymentSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings/church', { paymentSettings });
      toast.success('Online giving & payment settings saved!');
    } catch {
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyGivingLink = () => {
    const url = `${window.location.origin}/give/${church.slug || ''}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Public giving link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStart2FA = async () => {
    try {
      const res = await twoFactorAPI.setup();
      setTwoFactorModal({
        open: true,
        step: 'setup',
        qrCode: res.data?.data?.qrCode,
        secret: res.data?.data?.secret,
        code: '',
        backupCodes: [],
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate 2FA setup');
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFactorModal.code.trim()) return toast.error('Enter the 6-digit code');
    setSaving(true);
    try {
      const res = await twoFactorAPI.enable({ code: twoFactorModal.code.trim() });
      setTwoFactorEnabled(true);
      setTwoFactorModal(m => ({
        ...m,
        step: 'success',
        backupCodes: res.data?.data?.backupCodes || [],
      }));
      toast.success('Two-factor authentication enabled!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FAModal.password || !disable2FAModal.code) {
      return toast.error('Password and verification code are required');
    }
    setSaving(true);
    try {
      await twoFactorAPI.disable(disable2FAModal);
      setTwoFactorEnabled(false);
      setDisable2FAModal({ open: false, password: '', code: '' });
      toast.success('2FA has been disabled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setSaving(false);
    }
  };

  const DENOMINATIONS = ['Pentecostal', 'Baptist', 'Anglican', 'Catholic', 'Methodist', 'Presbyterian', 'Evangelical', 'Non-denominational', 'Others'];
  const TIMEZONES = ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'UTC'];
  const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP'];

  if (loading) return <div className="flex items-center justify-center min-h-96"><Loader2 size={28} className="animate-spin text-brand-500" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Settings & Configuration</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your church branding, pastoral team, automated messaging, and account</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-60 flex-shrink-0 space-y-1">
          {TABS.map(tab => <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={setActiveTab} />)}

          {/* Church stats */}
          <div className="mt-6 pt-4 border-t border-gray-100 hidden md:block">
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
          {/* TAB 1: CHURCH PROFILE & BRANDING */}
          {activeTab === 'church' && (
            <div className="card space-y-6">
              {/* Header preview */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gradient-to-r from-brand-800 to-indigo-950 text-white min-h-[140px] flex items-end p-6">
                {church.bannerUrl && (
                  <img src={church.bannerUrl} alt="Cover Banner" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative z-10 flex items-center gap-4">
                  {church.logoUrl ? (
                    <img src={church.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl bg-white p-1 object-contain border-2 border-white/30 shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl border border-white/30">⛪</div>
                  )}
                  <div>
                    <h2 className="font-display font-bold text-white text-xl sm:text-2xl drop-shadow-sm">{church.name || 'Your Church Name'}</h2>
                    <p className="text-brand-200 text-sm italic">{church.tagline || 'Add a church tagline or motto below'}</p>
                  </div>
                </div>
              </div>

              {/* Visual Branding Section */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-600 mb-3 flex items-center gap-2">
                  <Sparkles size={16} /> Visual Branding & Cover Graphics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Church Banner / Cover Photo URL</label>
                    <input className="input" placeholder="https://images.unsplash.com/... or uploaded URL" value={church.bannerUrl || ''} onChange={setC('bannerUrl')} />
                    <p className="text-xs text-gray-400 mt-1">Displayed in Member Portal header & event reminder emails (16:9 ratio recommended)</p>
                  </div>
                  <div>
                    <label className="label">Church Logo URL</label>
                    <input className="input" placeholder="https://mychurch.org/logo.png" value={church.logoUrl || ''} onChange={setC('logoUrl')} />
                    <p className="text-xs text-gray-400 mt-1">Square or circular transparent PNG recommended</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Church Tagline / Motto</label>
                    <input className="input" placeholder="Transforming Lives, Impacting Nations" value={church.tagline || ''} onChange={setC('tagline')} />
                  </div>
                </div>
              </div>

              {/* Mission & Vision */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Mission & Vision</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Mission Statement</label>
                    <textarea className="input min-h-[90px]" placeholder="To preach the gospel of grace..." value={church.mission || ''} onChange={setC('mission')} />
                  </div>
                  <div>
                    <label className="label">Vision Statement</label>
                    <textarea className="input min-h-[90px]" placeholder="To raise passionate disciples..." value={church.vision || ''} onChange={setC('vision')} />
                  </div>
                </div>
              </div>

              {/* General Church Profile Details */}
              <div className="pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">General Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Church Name *</label>
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
                    <label className="label">Year Founded</label>
                    <input type="number" className="input" placeholder="e.g. 2005" value={church.foundedYear || ''} onChange={setC('foundedYear')} />
                  </div>
                  <div>
                    <label className="label">Official Phone</label>
                    <input className="input" value={church.phone || ''} onChange={setC('phone')} />
                  </div>
                  <div>
                    <label className="label">Official Email</label>
                    <input type="email" className="input" value={church.email || ''} onChange={setC('email')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Official Website</label>
                    <input type="url" className="input" placeholder="https://mychurch.org" value={church.website || ''} onChange={setC('website')} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Headquarters Address</label>
                    <input className="input" value={church.address || ''} onChange={setC('address')} />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={church.city || ''} onChange={setC('city')} />
                  </div>
                  <div>
                    <label className="label">State / Region</label>
                    <input className="input" value={church.state || ''} onChange={setC('state')} />
                  </div>
                  <div>
                    <label className="label">Timezone</label>
                    <select className="input" value={church.timezone || 'Africa/Lagos'} onChange={setC('timezone')}>
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Operating Currency</label>
                    <select className="input" value={church.currency || 'NGN'} onChange={setC('currency')}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mission & Vision */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Mission & Vision</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Mission Statement</label>
                    <textarea className="input min-h-[90px]" placeholder="To preach the gospel of grace..." value={church.mission || ''} onChange={setC('mission')} />
                  </div>
                  <div>
                    <label className="label">Vision Statement</label>
                    <textarea className="input min-h-[90px]" placeholder="To raise passionate disciples..." value={church.vision || ''} onChange={setC('vision')} />
                  </div>
                </div>
              </div>

              {/* Core Values */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2">
                  <Tag size={16} /> Church Core Values & Pillars
                </h3>
                <p className="text-xs text-gray-400 mb-3">Define the spiritual pillars and cultural values of your ministry</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {coreValues.map((val, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                      {val}
                      <button type="button" onClick={() => handleRemoveCoreValue(idx)} className="hover:text-red-600 transition">
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 max-w-md">
                  <input
                    className="input text-xs"
                    placeholder="Add core value (e.g. Excellence, Grace, Prayer)..."
                    value={newValueInput}
                    onChange={e => setNewValueInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCoreValue(e); } }}
                  />
                  <button type="button" onClick={handleAddCoreValue} className="btn-secondary px-3 text-xs shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
                  <Globe size={16} /> Social Media & Streaming Channels
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Facebook Page URL</label>
                    <input className="input" placeholder="https://facebook.com/mychurch" value={church.socialLinks?.facebook || ''} onChange={setSocial('facebook')} />
                  </div>
                  <div>
                    <label className="label">Instagram URL</label>
                    <input className="input" placeholder="https://instagram.com/mychurch" value={church.socialLinks?.instagram || ''} onChange={setSocial('instagram')} />
                  </div>
                  <div>
                    <label className="label">YouTube Channel / Livestream</label>
                    <input className="input" placeholder="https://youtube.com/@mychurch" value={church.socialLinks?.youtube || ''} onChange={setSocial('youtube')} />
                  </div>
                  <div>
                    <label className="label">Twitter / X Profile</label>
                    <input className="input" placeholder="https://x.com/mychurch" value={church.socialLinks?.twitter || ''} onChange={setSocial('twitter')} />
                  </div>
                  <div>
                    <label className="label">TikTok Account</label>
                    <input className="input" placeholder="https://tiktok.com/@mychurch" value={church.socialLinks?.tiktok || ''} onChange={setSocial('tiktok')} />
                  </div>
                  <div>
                    <label className="label">Spotify / Podcast Link</label>
                    <input className="input" placeholder="https://open.spotify.com/show/..." value={church.socialLinks?.spotify || ''} onChange={setSocial('spotify')} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button onClick={() => saveChurch()} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Church Profile
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL THEME & COLORS */}
          {activeTab === 'theme' && (
            <div className="card space-y-6">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Palette size={20} className="text-brand-600" /> Visual Theme, Brand Colors & Typography
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Customize the visual identity of ChurchOS for your church. Changes automatically reflect across the Member Portal, public registration forms, and church banners.
                </p>
              </div>

              {/* Real-time Interactive Live Mockup Card */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Eye size={14} /> Live Branding Preview</span>
                  <span className="text-gray-400 font-normal">How your members see your church</span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 text-white shadow-md transition-all duration-300"
                  style={{
                    backgroundColor: theme.primaryColor,
                    backgroundImage: `linear-gradient(135deg, ${theme.primaryColor} 0%, #090d16 100%)`,
                    fontFamily: theme.fontFamily
                  }}
                >
                  {church.bannerUrl && (
                    <img src={church.bannerUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-[0.5px]" />
                  )}
                  <div className="relative z-10 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {church.logoUrl ? (
                        <img src={church.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl bg-white p-1 object-contain border-2 border-white/40 shadow-md" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl border border-white/30">⛪</div>
                      )}
                      <div>
                        <div className="text-xs uppercase tracking-wider font-semibold opacity-80">Welcome to</div>
                        <h3 className="text-2xl font-bold tracking-tight drop-shadow-sm">{church.name || 'Your Church Name'}</h3>
                        <p className="text-sm opacity-90 italic mt-0.5">{church.tagline || 'Add your church tagline or slogan'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-transform"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        Give Online Now
                      </span>
                      <span className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/25 text-white">
                        Worship With Us
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Curated Theme Presets */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-600" /> Curated Church Brand Presets
                </h3>
                <p className="text-xs text-gray-500 mb-4">Click any preset to instantly apply harmonious brand colors:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {THEME_PRESETS.map((p) => {
                    const isSelected = theme.primaryColor === p.primary;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setTheme(t => ({ ...t, primaryColor: p.primary, accentColor: p.accent, presetName: p.name }))}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-brand-600 ring-2 ring-brand-500/20 bg-brand-50/20 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-5 h-5 rounded-full shadow-xs border border-white" style={{ backgroundColor: p.primary }} />
                          <span className="w-5 h-5 rounded-full shadow-xs border border-white" style={{ backgroundColor: p.accent }} />
                          {isSelected && <Check size={14} className="text-brand-600 ml-auto" />}
                        </div>
                        <div className="font-bold text-gray-900 text-xs truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Controls */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
                  <Sliders size={16} /> Custom Color Palette (Hex Codes)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Primary Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.primaryColor}
                        onChange={e => setTheme(t => ({ ...t, primaryColor: e.target.value, presetName: 'Custom' }))}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5 bg-white shrink-0"
                      />
                      <input
                        className="input font-mono uppercase text-sm"
                        value={theme.primaryColor}
                        onChange={e => setTheme(t => ({ ...t, primaryColor: e.target.value, presetName: 'Custom' }))}
                        placeholder="#1D4ED8"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Used for main headers, banners, and primary church buttons</p>
                  </div>

                  <div>
                    <label className="label">Secondary / Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.accentColor}
                        onChange={e => setTheme(t => ({ ...t, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200 p-0.5 bg-white shrink-0"
                      />
                      <input
                        className="input font-mono uppercase text-sm"
                        value={theme.accentColor}
                        onChange={e => setTheme(t => ({ ...t, accentColor: e.target.value }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Used for highlights, giving call-to-actions, and active pills</p>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Font & Typography Style</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTheme(t => ({ ...t, fontFamily: f.id }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        theme.fontFamily === f.id
                          ? 'border-brand-600 ring-2 ring-brand-500/20 bg-brand-50/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-gray-900 text-sm">{f.id}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{f.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo & Banner URLs */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3">Graphics & Cover Visuals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Church Logo Image URL</label>
                    <input className="input" placeholder="https://mychurch.org/logo.png" value={church.logoUrl || ''} onChange={setC('logoUrl')} />
                    <p className="text-xs text-gray-400 mt-1">Square or transparent PNG recommended for high clarity</p>
                  </div>
                  <div>
                    <label className="label">Church Header Banner Photo URL</label>
                    <input className="input" placeholder="https://images.unsplash.com/... or uploaded photo" value={church.bannerUrl || ''} onChange={setC('bannerUrl')} />
                    <p className="text-xs text-gray-400 mt-1">Landscape photo of your auditorium or congregation (16:9 ratio)</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Church Tagline / Motto</label>
                    <input className="input" placeholder="Transforming Lives, Impacting Nations" value={church.tagline || ''} onChange={setC('tagline')} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => saveCustomization({ theme }, 'Visual theme & brand colors saved!')}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Visual Theme
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE TIMES & WORSHIP SCHEDULE */}
          {activeTab === 'services' && (
            <div className="card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Clock size={20} className="text-brand-600" /> Weekly Service Times & Worship Schedule
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Publish your regular Sunday services, midweek gatherings, and prayer vigils. These appear on the Member Portal, public connect pages, and event reminders.
                  </p>
                </div>
                <button
                  onClick={() => setServiceModal({ open: true, index: null, data: { name: '', day: 'Sunday', time: '09:00 AM - 11:30 AM', venue: 'Main Auditorium & Online' } })}
                  className="btn-primary"
                >
                  <Plus size={15} /> Add Service Time
                </button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                  <Clock size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600 font-semibold">No regular service times added</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Add your Sunday services, midweek bible study, or youth fellowships so members and visitors know when to join.</p>
                  <button
                    onClick={() => setServiceModal({ open: true, index: null, data: { name: 'Sunday Celebration Service', day: 'Sunday', time: '09:00 AM - 11:30 AM', venue: 'Main Auditorium' } })}
                    className="btn-primary mt-4 inline-flex"
                  >
                    <Plus size={14} /> Add First Service
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {services.map((s, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200/80 bg-white hover:shadow-sm transition-shadow flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                            {s.day}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            🕒 {s.time}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm truncate">{s.name}</h4>
                        {s.venue && <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {s.venue}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setServiceModal({ open: true, index: idx, data: { ...s } })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition"
                          title="Edit Service"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                          title="Remove Service"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEMBER PORTAL DIGITAL EXPERIENCE */}
          {activeTab === 'portal' && (
            <div className="card space-y-6">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
                  <LayoutDashboard size={20} className="text-brand-600" /> Member Portal Experience & Feature Toggles
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Control what members see and interact with when they log into their member portal. Turn off features you don't use or customize the welcome experience.
                </p>
              </div>

              {/* Welcome Headline & Pastor's Greeting */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Portal Welcome Headline</label>
                    <input
                      className="input"
                      placeholder="Welcome to your digital church family"
                      value={portalConfig.welcomeTitle || ''}
                      onChange={e => setPortalConfig(p => ({ ...p, welcomeTitle: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Displayed at the top of the member home page</p>
                  </div>
                  <div>
                    <label className="label">Welcome Subtitle / Pastor's Welcome Quote</label>
                    <input
                      className="input"
                      placeholder="We are delighted to have you connect, grow, and fellowship with us."
                      value={portalConfig.welcomeMessage || ''}
                      onChange={e => setPortalConfig(p => ({ ...p, welcomeMessage: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Pinned Urgent Alert / Broadcast Banner */}
                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-amber-600" />
                      <span className="font-bold text-gray-900 text-sm">Pinned Portal Notice Banner</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPortalConfig(p => ({ ...p, bannerNoticeActive: !p.bannerNoticeActive }))}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                        portalConfig.bannerNoticeActive ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {portalConfig.bannerNoticeActive ? 'Active on Portal' : 'Disabled'}
                    </button>
                  </div>
                  <div>
                    <label className="label text-xs">Pinned Announcement Text</label>
                    <input
                      className="input text-xs"
                      placeholder="e.g., Annual Leadership Retreat registration closes this Friday! Contact the church office."
                      value={portalConfig.bannerNotice || ''}
                      onChange={e => setPortalConfig(p => ({ ...p, bannerNotice: e.target.value }))}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">When active, this banner appears at the top of every member's portal dashboard</p>
                  </div>
                </div>
              </div>

              {/* Module Visibility Controls */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                      <Sliders size={16} /> Member Portal Module Matrix (12 Modules)
                    </h3>
                    <p className="text-xs text-gray-400">Toggle modules ON/OFF depending on your church's programs and structure</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {PORTAL_MODULES.map(({ key, label, icon: Icon, desc }) => {
                    const isEnabled = portalConfig.enabledModules?.[key] !== false;
                    return (
                      <div
                        key={key}
                        onClick={() => setPortalConfig(p => ({
                          ...p,
                          enabledModules: {
                            ...p.enabledModules,
                            [key]: !isEnabled
                          }
                        }))}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isEnabled
                            ? 'border-brand-200 bg-brand-50/20 shadow-xs'
                            : 'border-gray-200 bg-gray-50/40 opacity-60'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isEnabled ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-xs truncate">{label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {isEnabled ? 'Enabled' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => saveCustomization({ portal: portalConfig }, 'Member portal experience saved!')}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Portal Experience
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: PUBLIC CONNECT & INTAKE FORMS */}
          {activeTab === 'public' && (
            <div className="card space-y-6">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Globe size={20} className="text-brand-600" /> Public Connect & Visitor Form Customization
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Customize the greetings, scriptures, and thank-you notes visitors see when filling out connection forms or giving online.
                </p>
              </div>

              {/* First-Timers Connect Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-600 flex items-center gap-2">
                  <UserPlus size={16} /> First-Timers & New Visitors Intake Form
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="label">Visitor Welcome Headline</label>
                    <input
                      className="input"
                      value={publicConnect.firstTimerGreeting || ''}
                      onChange={e => setPublicConnect(p => ({ ...p, firstTimerGreeting: e.target.value }))}
                      placeholder="Welcome Home! We are blessed and honored to have you worship with us today."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Post-Submission Thank-You / Follow-Up Note</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={publicConnect.firstTimerThankYou || ''}
                      onChange={e => setPublicConnect(p => ({ ...p, firstTimerThankYou: e.target.value }))}
                      placeholder="Thank you for connecting with our church family. A minister will reach out to bless you this week!"
                    />
                    <p className="text-xs text-gray-400 mt-1">Shown to the first-timer on screen immediately after submitting the form</p>
                  </div>
                </div>
              </div>

              {/* Public Giving Page Customization */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                  <CreditCard size={16} /> Online Giving Page Scripture & Encouragement
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Scripture Reference</label>
                    <input
                      className="input"
                      value={publicConnect.givingVerse || ''}
                      onChange={e => setPublicConnect(p => ({ ...p, givingVerse: e.target.value }))}
                      placeholder="2 Corinthians 9:7"
                    />
                  </div>
                  <div>
                    <label className="label">Public Giving Link</label>
                    <div className="flex items-center gap-2">
                      <input
                        className="input text-xs bg-gray-50"
                        readOnly
                        value={`${window.location.origin}/give/${church.slug || ''}`}
                      />
                      <button
                        type="button"
                        onClick={handleCopyGivingLink}
                        className="btn-secondary px-3 shrink-0"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Giving Scripture Passage Text</label>
                    <textarea
                      className="input min-h-[80px]"
                      value={publicConnect.givingScripture || ''}
                      onChange={e => setPublicConnect(p => ({ ...p, givingScripture: e.target.value }))}
                      placeholder="Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
                    />
                  </div>
                </div>
              </div>

              {/* Public Prayer Request Form */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2">
                  <HeartHandshake size={16} /> Prayer Request Page Encouragement
                </h3>
                <div>
                  <label className="label">Pastoral Prayer Encouragement Note</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={publicConnect.prayerGreeting || ''}
                    onChange={e => setPublicConnect(p => ({ ...p, prayerGreeting: e.target.value }))}
                    placeholder="The prayer of a righteous person is powerful and effective. Share your prayer burdens with our pastoral intercession team."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => saveCustomization({ publicConnect }, 'Public connect & forms customization saved!')}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Public Connect Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PASTORAL LEADERSHIP */}
          {activeTab === 'pastors' && (
            <div className="card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-lg">Pastoral Team & Leadership Roster</h2>
                  <p className="text-xs text-gray-400">Showcase your senior pastors, campus pastors, and ministers across platforms</p>
                </div>
                <button onClick={() => setPastorModal({ open: true, index: null, data: {} })} className="btn-primary">
                  <Plus size={15} /> Add Minister
                </button>
              </div>

              {(!church.pastors || church.pastors.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                  <Users size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600 font-semibold">No pastors or ministers added yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Add your lead pastor, resident pastors, or associate ministers so members can know and connect with them.</p>
                  <button onClick={() => setPastorModal({ open: true, index: null, data: {} })} className="btn-primary mt-4 inline-flex">
                    <Plus size={14} /> Add First Minister
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {church.pastors.map((p, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200/80 bg-white hover:shadow-md transition-shadow relative group">
                      <div className="flex items-start gap-3.5">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shadow-sm flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-lg border border-brand-100 flex-shrink-0">
                            {(p.name || 'P')[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-900 text-base leading-snug truncate">{p.name}</h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                            {p.role || 'Minister'}
                          </span>
                          {p.bio && <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">{p.bio}</p>}
                          <div className="flex flex-col gap-0.5 mt-2 text-xs text-gray-400">
                            {p.phone && <span>📞 {p.phone}</span>}
                            {p.email && <span>✉️ {p.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 absolute top-3 right-3 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPastorModal({ open: true, index: idx, data: { ...p } })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeletePastor(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MESSAGING (WHATSAPP, EMAIL, SMS) */}
          {activeTab === 'messaging' && (
            <div className="space-y-5">
              {/* WhatsApp Configuration */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><MessageCircle size={22} /></div>
                    <div>
                      <h3 className="font-display font-bold text-gray-900">WhatsApp Broadcast & Reminders</h3>
                      <p className="text-xs text-gray-400">Direct Meta WhatsApp Business Cloud API or Twilio WhatsApp</p>
                    </div>
                  </div>
                  <button onClick={() => setMessaging(m => ({ ...m, whatsapp: { ...m.whatsapp, enabled: !m.whatsapp?.enabled } }))}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${messaging.whatsapp?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {messaging.whatsapp?.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {messaging.whatsapp?.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">WhatsApp Integration Provider</label>
                    <select className="input" value={messaging.whatsapp?.provider || 'meta'} onChange={setM('whatsapp', 'provider')}>
                      <option value="meta">Meta WhatsApp Cloud API (Recommended — 1,000 free conversations/month)</option>
                      <option value="twilio">Twilio WhatsApp Business API</option>
                    </select>
                  </div>

                  {messaging.whatsapp?.provider === 'meta' ? (
                    <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <div className="flex items-start gap-2 text-xs text-emerald-800">
                        <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                        <div>
                          <strong>Meta WhatsApp Cloud API</strong> provides direct delivery without third-party markups. Obtain your Phone Number ID and Permanent Access Token from <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">developers.facebook.com</a>.
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label">Meta Phone Number ID *</label>
                          <input className="input font-mono text-sm" placeholder="1058472918274..." value={messaging.whatsapp?.metaPhoneNumberId || ''} onChange={setM('whatsapp', 'metaPhoneNumberId')} />
                        </div>
                        <div>
                          <label className="label">WhatsApp Business Account ID (WABA)</label>
                          <input className="input font-mono text-sm" placeholder="1029384756..." value={messaging.whatsapp?.metaBusinessAccountId || ''} onChange={setM('whatsapp', 'metaBusinessAccountId')} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">System User Permanent Access Token *</label>
                          <input type="password" className="input font-mono text-sm" placeholder="EAAB..." value={messaging.whatsapp?.metaAccessToken || ''} onChange={setM('whatsapp', 'metaAccessToken')} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500">Twilio WhatsApp uses your Twilio Account SID, Auth Token, and registered WhatsApp Sender Number.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label">Twilio SID (optional if set in SMS)</label>
                          <input className="input font-mono text-sm" placeholder="ACxxxxxxxxxxxx" value={messaging.whatsapp?.twilioSid || ''} onChange={setM('whatsapp', 'twilioSid')} />
                        </div>
                        <div>
                          <label className="label">Twilio Auth Token</label>
                          <input type="password" className="input font-mono text-sm" value={messaging.whatsapp?.twilioAuthToken || ''} onChange={setM('whatsapp', 'twilioAuthToken')} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Sender WhatsApp Number</label>
                    <input className="input" placeholder="+2348012345678" value={messaging.whatsapp?.whatsappNumber || ''} onChange={setM('whatsapp', 'whatsappNumber')} />
                    <p className="text-xs text-gray-400 mt-1">E.164 formatted registered church WhatsApp number</p>
                  </div>

                  <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="label">Send Test WhatsApp</label>
                      <input type="tel" className="input" placeholder="+2348012345678" value={testRecipient.whatsapp} onChange={e => setTestRecipient(r => ({ ...r, whatsapp: e.target.value }))} />
                    </div>
                    <button onClick={() => handleTest('whatsapp')} disabled={testing === 'whatsapp'} className="btn-secondary h-[42px] whitespace-nowrap">
                      {testing === 'whatsapp' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Configuration */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Mail size={20} /></div>
                    <div>
                      <h3 className="font-display font-bold text-gray-900">Email Notifications & Broadcasts</h3>
                      <p className="text-xs text-gray-400">SendGrid or custom SMTP for automated email delivery</p>
                    </div>
                  </div>
                  <button onClick={() => setMessaging(m => ({ ...m, email: { ...m.email, enabled: !m.email?.enabled } }))}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${messaging.email?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {messaging.email?.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {messaging.email?.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Provider</label>
                    <select className="input" value={messaging.email?.provider || 'smtp'} onChange={setM('email', 'provider')}>
                      <option value="smtp">SMTP (Google Workspace, Zoho, Microsoft 365, Mailgun)</option>
                      <option value="sendgrid">SendGrid</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">From Email Address</label>
                      <input className="input" placeholder="noreply@mychurch.org" value={messaging.email?.fromEmail || ''} onChange={setM('email', 'fromEmail')} />
                    </div>
                    <div>
                      <label className="label">From Display Name</label>
                      <input className="input" placeholder="My Church" value={messaging.email?.fromName || ''} onChange={setM('email', 'fromName')} />
                    </div>
                  </div>
                  {messaging.email?.provider === 'sendgrid' ? (
                    <div>
                      <label className="label">SendGrid API Key</label>
                      <input type="password" className="input font-mono text-sm" placeholder="SG.xxxxxxxxxx" value={messaging.email?.sendgridApiKey || ''} onChange={setM('email', 'sendgridApiKey')} />
                      <p className="text-xs text-gray-400 mt-1">Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">SendGrid Dashboard</a></p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">SMTP Host</label>
                        <input className="input" placeholder="smtp.gmail.com" value={messaging.email?.smtpHost || ''} onChange={setM('email', 'smtpHost')} />
                      </div>
                      <div>
                        <label className="label">SMTP Port</label>
                        <input className="input" placeholder="587" value={messaging.email?.smtpPort || ''} onChange={setM('email', 'smtpPort')} />
                      </div>
                      <div>
                        <label className="label">SMTP Username</label>
                        <input className="input" value={messaging.email?.smtpUser || ''} onChange={setM('email', 'smtpUser')} />
                      </div>
                      <div>
                        <label className="label">SMTP Password</label>
                        <input type="password" className="input" value={messaging.email?.smtpPass || ''} onChange={setM('email', 'smtpPass')} />
                      </div>
                    </div>
                  )}
                  {/* Test email */}
                  <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="label">Test Email Address</label>
                      <input type="email" className="input" placeholder="pastor@example.com" value={testRecipient.email} onChange={e => setTestRecipient(r => ({ ...r, email: e.target.value }))} />
                    </div>
                    <button onClick={() => handleTest('email')} disabled={testing === 'email'} className="btn-secondary h-[42px] whitespace-nowrap">
                      {testing === 'email' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Test
                    </button>
                  </div>
                </div>
              </div>

              {/* SMS Configuration */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><Phone size={20} /></div>
                    <div>
                      <h3 className="font-display font-bold text-gray-900">SMS Notifications</h3>
                      <p className="text-xs text-gray-400">Twilio for quick SMS delivery</p>
                    </div>
                  </div>
                  <button onClick={() => setMessaging(m => ({ ...m, sms: { ...m.sms, enabled: !m.sms?.enabled } }))}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${messaging.sms?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {messaging.sms?.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {messaging.sms?.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Twilio Account SID</label>
                      <input className="input font-mono text-sm" placeholder="ACxxxxxxxxxxxxxxxx" value={messaging.sms?.twilioSid || ''} onChange={setM('sms', 'twilioSid')} />
                    </div>
                    <div>
                      <label className="label">Twilio Auth Token</label>
                      <input type="password" className="input font-mono text-sm" value={messaging.sms?.twilioAuthToken || ''} onChange={setM('sms', 'twilioAuthToken')} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Twilio Phone Number</label>
                    <input className="input" placeholder="+1234567890" value={messaging.sms?.twilioPhone || ''} onChange={setM('sms', 'twilioPhone')} />
                  </div>
                  <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
                    <div className="flex-1">
                      <label className="label">Test SMS</label>
                      <input type="tel" className="input" placeholder="+2348012345678" value={testRecipient.sms} onChange={e => setTestRecipient(r => ({ ...r, sms: e.target.value }))} />
                    </div>
                    <button onClick={() => handleTest('sms')} disabled={testing === 'sms'} className="btn-secondary h-[42px] whitespace-nowrap">
                      {testing === 'sms' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Test
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={saveMessaging} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Messaging Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MY PROFILE */}
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
                    <input value={user?.email || ''} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact your system admin.</p>
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

          {/* TAB 5: CHANGE PASSWORD */}
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

          {/* TAB: ONLINE GIVING & PAYMENTS */}
          {activeTab === 'giving' && (
            <div className="space-y-6">
              {/* Public Giving Link Card */}
              <div className="card bg-gradient-to-r from-brand-900 to-indigo-900 text-white border-0 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-brand-200 border border-white/20">
                      Live Kingdom Portal
                    </span>
                    <h2 className="text-lg font-bold font-display mt-2">Public Online Giving Link</h2>
                    <p className="text-xs text-brand-200 mt-1 max-w-xl">
                      Share this dedicated URL with your church congregation, live stream viewers, and international donors.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyGivingLink}
                      className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    <a
                      href={`/give/${church.slug || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white text-brand-900 hover:bg-brand-50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                    >
                      <span>Open Giving Page</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
                <div className="mt-4 p-2.5 rounded-xl bg-black/25 font-mono text-xs text-brand-100 truncate">
                  {`${window.location.origin}/give/${church.slug || ''}`}
                </div>
              </div>

              {/* Direct Bank Transfer Details */}
              <div className="card">
                <h3 className="font-display font-bold text-gray-900 text-base mb-1">Church Bank Transfer Details</h3>
                <p className="text-xs text-gray-500 mb-4">
                  These bank details are displayed on the public giving page for members who prefer direct bank transfers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Bank Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Access Bank, Zenith Bank"
                      value={paymentSettings.bankDetails?.bankName || ''}
                      onChange={e => setPaymentSettings(p => ({
                        ...p,
                        bankDetails: { ...(p.bankDetails || {}), bankName: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="label">Account Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. The Baptizing Church Lekki"
                      value={paymentSettings.bankDetails?.accountName || ''}
                      onChange={e => setPaymentSettings(p => ({
                        ...p,
                        bankDetails: { ...(p.bankDetails || {}), accountName: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="label">Account Number</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 0123456789"
                      value={paymentSettings.bankDetails?.accountNumber || ''}
                      onChange={e => setPaymentSettings(p => ({
                        ...p,
                        bankDetails: { ...(p.bankDetails || {}), accountNumber: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Paystack Integration */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-base">Paystack Payment Gateway</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enter your church's Paystack API credentials to receive card, USSD, and bank transfers directly into your church account.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Gateway
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Paystack Public Key</label>
                    <input
                      type="text"
                      className="input font-mono text-xs"
                      placeholder="pk_live_... or pk_test_..."
                      value={paymentSettings.paystackPublicKey || ''}
                      onChange={e => setPaymentSettings(p => ({ ...p, paystackPublicKey: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Paystack Secret Key</label>
                    <input
                      type="password"
                      className="input font-mono text-xs"
                      placeholder="sk_live_... or sk_test_..."
                      value={paymentSettings.paystackSecretKey || ''}
                      onChange={e => setPaymentSettings(p => ({ ...p, paystackSecretKey: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-5">
                  <button onClick={savePaymentSettings} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Save Giving Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & 2FA */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      twoFactorEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      <Shield size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display font-bold text-gray-900 text-lg">Two-Factor Authentication (2FA)</h2>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          twoFactorEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {twoFactorEnabled ? 'Active & Protected' : 'Not Configured'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-xl">
                        Add an extra layer of defense to your pastoral or staff account. In addition to your password, you will be required to enter a 6-digit TOTP code generated by Google Authenticator, Authy, or 1Password.
                      </p>
                    </div>
                  </div>

                  <div>
                    {twoFactorEnabled ? (
                      <button
                        type="button"
                        onClick={() => setDisable2FAModal({ open: true, password: '', code: '' })}
                        className="btn-danger text-xs py-2 px-3.5"
                      >
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStart2FA}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                      >
                        <Shield size={14} /> Enable 2FA
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Recommended Authenticator Apps</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 text-xs">
                      <p className="font-semibold text-gray-800">Google Authenticator</p>
                      <p className="text-gray-400 mt-0.5">Free for Android and iOS</p>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 text-xs">
                      <p className="font-semibold text-gray-800">1Password / Bitwarden</p>
                      <p className="text-gray-400 mt-0.5">Desktop & Cloud sync</p>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 text-xs">
                      <p className="font-semibold text-gray-800">Microsoft Authenticator</p>
                      <p className="text-gray-400 mt-0.5">Secure mobile verification</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        open={twoFactorModal.open}
        onClose={() => setTwoFactorModal(m => ({ ...m, open: false }))}
        title={twoFactorModal.step === 'success' ? '2FA Enabled Successfully' : 'Set Up Two-Factor Authentication'}
        size="md"
        footer={
          twoFactorModal.step === 'success' ? (
            <button
              onClick={() => setTwoFactorModal(m => ({ ...m, open: false }))}
              className="btn-primary"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => setTwoFactorModal(m => ({ ...m, open: false }))}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEnable2FA}
                disabled={saving || !twoFactorModal.code}
                className="btn-primary"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                <span>Verify & Activate 2FA</span>
              </button>
            </>
          )
        }
      >
        {twoFactorModal.step === 'success' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              <span>Two-Factor Authentication is now actively protecting your account!</span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1">
                Emergency Recovery Backup Codes
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Save these backup codes in a secure password manager. If you lose your phone, you can use these to regain access. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl font-mono text-xs text-gray-700">
                {twoFactorModal.backupCodes?.map((c, i) => (
                  <div key={i} className="py-1 px-2 bg-white rounded border border-gray-200 text-center font-semibold">
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-xs text-gray-500">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, or 1Password).
            </p>
            {twoFactorModal.qrCode && (
              <div className="flex justify-center p-3 bg-white rounded-2xl border border-gray-200 w-fit mx-auto shadow-sm">
                <img src={twoFactorModal.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-700">
              <span className="text-gray-400 block text-[10px] uppercase font-sans font-semibold">Or enter secret key manually:</span>
              <span className="font-bold text-brand-700">{twoFactorModal.secret}</span>
            </div>

            <div className="text-left pt-2">
              <label className="label">Enter 6-Digit Authenticator Code *</label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                className="input text-center text-lg tracking-widest font-mono font-bold"
                value={twoFactorModal.code}
                onChange={e => setTwoFactorModal(m => ({ ...m, code: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal
        open={disable2FAModal.open}
        onClose={() => setDisable2FAModal({ open: false, password: '', code: '' })}
        title="Disable Two-Factor Authentication"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDisable2FAModal({ open: false, password: '', code: '' })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDisable2FA}
              disabled={saving || !disable2FAModal.password || !disable2FAModal.code}
              className="btn-danger"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              <span>Disable 2FA</span>
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            For security, please enter your password and a current 2FA security code to disable two-factor authentication.
          </p>
          <div>
            <label className="label">Current Account Password *</label>
            <input
              type="password"
              className="input"
              value={disable2FAModal.password}
              onChange={e => setDisable2FAModal(d => ({ ...d, password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Current 6-Digit Code (or Backup Key) *</label>
            <input
              type="text"
              className="input text-center font-mono font-bold"
              placeholder="123456 or XXXX-XXXX"
              value={disable2FAModal.code}
              onChange={e => setDisable2FAModal(d => ({ ...d, code: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Add / Edit Minister Modal */}
      <Modal
        open={pastorModal.open}
        onClose={() => setPastorModal({ open: false, index: null, data: {} })}
        title={pastorModal.index !== null ? 'Edit Minister' : 'Add Minister / Pastor'}
        size="md"
        footer={
          <>
            <button onClick={() => setPastorModal({ open: false, index: null, data: {} })} className="btn-secondary">Cancel</button>
            <button onClick={handleSavePastor} className="btn-primary">Save Minister</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Minister Full Name *</label>
            <input className="input" placeholder="Pastor David Adeleke" value={pastorModal.data.name || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
          </div>
          <div>
            <label className="label">Role / Designation *</label>
            <input className="input" placeholder="Lead Pastor, Resident Pastor, Youth Minister..." value={pastorModal.data.role || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, role: e.target.value } }))} />
          </div>
          <div>
            <label className="label">Photo / Picture URL</label>
            <input className="input" placeholder="https://images.unsplash.com/... or uploaded photo URL" value={pastorModal.data.photoUrl || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, photoUrl: e.target.value } }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone Number</label>
              <input className="input" placeholder="+234..." value={pastorModal.data.phone || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, phone: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="pastor@church.org" value={pastorModal.data.email || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, email: e.target.value } }))} />
            </div>
          </div>
          <div>
            <label className="label">Brief Bio / Overview</label>
            <textarea className="input min-h-[80px]" placeholder="Serving as Lead Pastor since 2018..." value={pastorModal.data.bio || ''} onChange={e => setPastorModal(m => ({ ...m, data: { ...m.data, bio: e.target.value } }))} />
          </div>
        </div>
      </Modal>

      {/* Add / Edit Worship Service Modal */}
      <Modal
        open={serviceModal.open}
        onClose={() => setServiceModal({ open: false, index: null, data: { name: '', day: 'Sunday', time: '', venue: '' } })}
        title={serviceModal.index !== null ? 'Edit Worship Service' : 'Add Worship Service'}
        size="md"
        footer={
          <>
            <button onClick={() => setServiceModal({ open: false, index: null, data: { name: '', day: 'Sunday', time: '', venue: '' } })} className="btn-secondary">Cancel</button>
            <button onClick={handleSaveService} className="btn-primary">Save Service</button>
          </>
        }
      >
        <form onSubmit={handleSaveService} className="space-y-3">
          <div>
            <label className="label">Service Name *</label>
            <input className="input" placeholder="Sunday Celebration Service, Midweek Bible Study..." value={serviceModal.data.name || ''} onChange={e => setServiceModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Day of the Week *</label>
              <select className="input" value={serviceModal.data.day || 'Sunday'} onChange={e => setServiceModal(m => ({ ...m, data: { ...m.data, day: e.target.value } }))}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Service Time *</label>
              <input className="input" placeholder="08:00 AM - 10:00 AM" value={serviceModal.data.time || ''} onChange={e => setServiceModal(m => ({ ...m, data: { ...m.data, time: e.target.value } }))} />
            </div>
          </div>
          <div>
            <label className="label">Venue / Channel</label>
            <input className="input" placeholder="Main Auditorium & YouTube / Online" value={serviceModal.data.venue || ''} onChange={e => setServiceModal(m => ({ ...m, data: { ...m.data, venue: e.target.value } }))} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
