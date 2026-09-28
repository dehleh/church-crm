import { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake, Plus, Search, Calendar, Target, DollarSign,
  TrendingUp, Users, Copy, Check, ExternalLink, Edit3, Trash2,
  Clock, Share2, Sparkles, Building, Filter, CheckCircle2,
  AlertCircle, ChevronRight, X, Loader2, ArrowUpRight, ShieldCheck,
  Landmark, CreditCard, QrCode
} from 'lucide-react';
import { campaignsAPI, eventsAPI, financeAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fmt = (n) => '₦' + Number(n || 0).toLocaleString();

const CAMPAIGN_TYPES = [
  { value: 'project',   label: 'Church Project',     hue: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'building',  label: 'Building & Facility',hue: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'event',     label: 'Event & Conference', hue: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'program',   label: 'Ministry Program',   hue: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'missions',  label: 'Missions & Outreach',hue: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'welfare',   label: 'Welfare & Charity',  hue: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'equipment', label: 'Tech & Equipment',   hue: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'seed',      label: 'Special Seed / Vow', hue: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'pledge',    label: 'Faith Pledge',       hue: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const PRESET_GOALS = [500000, 1000000, 2500000, 5000000, 10000000, 25000000];

export default function GivingCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Events & Categories for dropdown selects
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shareCampaign, setShareCampaign] = useState(null);

  // Manual donation modal
  const [donationModal, setDonationModal] = useState(null); // campaign object
  const [donationForm, setDonationForm] = useState({
    amount: '',
    donorName: '',
    paymentMethod: 'transfer',
    transactionDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [recordingDonation, setRecordingDonation] = useState(false);

  // Contributions history modal
  const [historyModal, setHistoryModal] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state for Create / Edit
  const [form, setForm] = useState({
    title: '',
    type: 'project',
    targetAmount: '',
    currency: 'NGN',
    description: '',
    scriptureText: '',
    bannerUrl: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    eventId: '',
    categoryId: '',
    allowPublicDonations: true,
    allowMemberPortal: true,
    isFeatured: false,
    status: 'active',
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      const res = await campaignsAPI.list(params);
      setCampaigns(res.data.data || []);
    } catch {
      toast.error('Failed to load giving campaigns');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchCampaigns();
    eventsAPI.list({ limit: 50 }).then((r) => setEvents(r.data?.data || [])).catch(() => {});
    financeAPI.categories().then((r) => setCategories(r.data?.data || [])).catch(() => {});
  }, [fetchCampaigns]);

  const openCreateModal = () => {
    setEditingCampaign(null);
    setForm({
      title: '',
      type: 'project',
      targetAmount: '',
      currency: 'NGN',
      description: '',
      scriptureText: '',
      bannerUrl: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      eventId: '',
      categoryId: '',
      allowPublicDonations: true,
      allowMemberPortal: true,
      isFeatured: false,
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (c) => {
    setEditingCampaign(c);
    setForm({
      title: c.title || '',
      type: c.type || 'project',
      targetAmount: c.target_amount || '',
      currency: c.currency || 'NGN',
      description: c.description || '',
      scriptureText: c.scripture_text || '',
      bannerUrl: c.banner_url || '',
      startDate: c.start_date ? c.start_date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      endDate: c.end_date ? c.end_date.slice(0, 10) : '',
      eventId: c.event_id || '',
      categoryId: c.category_id || '',
      allowPublicDonations: c.allow_public_donations !== false,
      allowMemberPortal: c.allow_member_portal !== false,
      isFeatured: Boolean(c.is_featured),
      status: c.status || 'active',
    });
    setShowCreateModal(true);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Campaign title is required');

    setSaving(true);
    try {
      if (editingCampaign) {
        await campaignsAPI.update(editingCampaign.id, form);
        toast.success('Campaign updated successfully!');
      } else {
        await campaignsAPI.create(form);
        toast.success('Giving campaign launched successfully!');
      }
      setShowCreateModal(false);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (campaign) => {
    const churchSlug = user?.church_slug || 'my-church';
    const link = `${window.location.origin}/give/${churchSlug}?campaign=${campaign.slug || campaign.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Direct giving link copied to clipboard!');
  };

  const handleOpenHistory = async (campaign) => {
    setHistoryModal(campaign);
    setLoadingHistory(true);
    try {
      const res = await campaignsAPI.get(campaign.id);
      setContributions(res.data.data?.contributions || []);
    } catch {
      toast.error('Failed to load contributions history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenDonation = (campaign) => {
    setDonationModal(campaign);
    setDonationForm({
      amount: '',
      donorName: '',
      paymentMethod: 'transfer',
      transactionDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  const handleRecordDonation = async (e) => {
    e.preventDefault();
    if (!donationForm.amount || Number(donationForm.amount) <= 0) {
      return toast.error('Valid donation amount is required');
    }

    setRecordingDonation(true);
    try {
      await campaignsAPI.recordDonation(donationModal.id, donationForm);
      toast.success('Donation recorded and credited to campaign!');
      setDonationModal(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record donation');
    } finally {
      setRecordingDonation(false);
    }
  };

  // Aggregated totals
  const totalGoal = campaigns.reduce((acc, c) => acc + Number(c.target_amount || 0), 0);
  const totalRaised = campaigns.reduce((acc, c) => acc + Number(c.amount_raised || 0), 0);
  const totalDonors = campaigns.reduce((acc, c) => acc + Number(c.donors_count || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === 'active').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 mb-2">
            <HeartHandshake size={14} className="text-emerald-600" />
            <span>Fundraising & Projects</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">Giving Campaigns & Projects</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create and track special fundraisers, building projects, event offerings, and kingdom expansions.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus size={18} /> Launch New Campaign
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-gray-900 mt-2">{activeCount}</div>
          <div className="text-xs text-gray-400 mt-1">{campaigns.length} total campaigns</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Target Goal</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-gray-900 mt-2">{fmt(totalGoal)}</div>
          <div className="text-xs text-gray-400 mt-1">Across all fundraising goals</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Raised</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-emerald-600 mt-2">{fmt(totalRaised)}</div>
          <div className="text-xs text-emerald-700/80 font-medium mt-1">
            {totalGoal > 0 ? `${Math.round((totalRaised / totalGoal) * 100)}% of cumulative goal` : 'Open fundraising'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Givers & Donors</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-gray-900 mt-2">{totalDonors}</div>
          <div className="text-xs text-gray-400 mt-1">Contributions recorded</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns, scriptures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 h-10 w-full text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input h-10 text-xs w-auto py-1"
          >
            <option value="">All Categories</option>
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input h-10 text-xs w-auto py-1"
          >
            <option value="active">Active Only</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 size={32} className="animate-spin text-brand-600" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <HeartHandshake size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Giving Campaigns Found</h3>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Start a new church building fund, youth camp sponsorship, harvest offering, or mission drive.
          </p>
          <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((c) => {
            const typeInfo = CAMPAIGN_TYPES.find((t) => t.value === c.type) || CAMPAIGN_TYPES[0];
            const target = Number(c.target_amount || 0);
            const raised = Number(c.amount_raised || 0);
            const pct = c.progress_percent || 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Banner / Poster */}
                  <div className="aspect-[16/9] w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {c.banner_url ? (
                      <img
                        src={c.banner_url}
                        alt={c.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex flex-col items-center justify-center p-4 text-center">
                        <HeartHandshake size={36} className="text-emerald-400 mb-1 opacity-70" />
                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{typeInfo.label}</span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                        c.status === 'active'
                          ? 'bg-emerald-500/90 text-white border-emerald-400'
                          : c.status === 'completed'
                          ? 'bg-blue-600/90 text-white border-blue-400'
                          : 'bg-slate-700/90 text-white border-slate-600'
                      }`}>
                        {c.status}
                      </span>
                      {c.is_featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 flex items-center gap-1 shadow-xs">
                          <Sparkles size={10} /> Featured
                        </span>
                      )}
                    </div>

                    {/* Type badge */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold bg-white/90 backdrop-blur-md text-gray-800 shadow-xs">
                      {typeInfo.label}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-1 group-hover:text-emerald-600 transition">
                        {c.title}
                      </h3>
                      {c.scripture_text && (
                        <p className="text-xs text-emerald-800 italic mt-1 line-clamp-1">
                          "{c.scripture_text}"
                        </p>
                      )}
                      {c.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Amount */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Raised to date</span>
                        <span className="font-bold text-emerald-700">{fmt(raised)}</span>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{pct}% funded</span>
                        <span>Goal: {target > 0 ? fmt(target) : 'Open goal'}</span>
                      </div>
                    </div>

                    {/* Meta tags */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-gray-400" />
                        <span>{c.donors_count || 0} givers</span>
                      </span>

                      {c.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-gray-400" />
                          <span>Ends {format(new Date(c.end_date), 'MMM d, yyyy')}</span>
                        </span>
                      )}

                      {c.event_title && (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] truncate max-w-[140px]">
                          Event: {c.event_title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(c)}
                      className="p-2 rounded-xl text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition border border-gray-200/60 bg-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                      title="Copy direct shareable giving link"
                    >
                      <Share2 size={14} /> <span>Share</span>
                    </button>
                    <button
                      onClick={() => setShareCampaign(c)}
                      className="p-2 rounded-xl text-amber-700 hover:text-amber-800 hover:bg-amber-100 transition border border-amber-200 bg-amber-50 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                      title="Print campaign QR code poster or pew cards"
                    >
                      <QrCode size={14} /> <span>Print QR</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenDonation(c)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1"
                    >
                      <Plus size={13} className="text-emerald-600" /> Offline Seed
                    </button>

                    <button
                      onClick={() => handleOpenHistory(c)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                    >
                      Donors ({c.donors_count || 0})
                    </button>

                    <button
                      onClick={() => openEditModal(c)}
                      className="p-2 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                      title="Edit campaign settings"
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingCampaign ? 'Edit Giving Campaign' : 'Launch New Giving Campaign / Project'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveCampaign} className="space-y-4 pt-2">
          <div>
            <label className="label">Campaign Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026 Sanctuary Expansion Project, Youth Camp Sponsorship, Harvest & Thanksgiving"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Campaign Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Funding Goal Target (₦)</label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 5000000 (0 for open-ended)"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="input"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {PRESET_GOALS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setForm({ ...form, targetAmount: String(g) })}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    ₦{(g / 1000000).toFixed(g % 1000000 === 0 ? 0 : 1)}M
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Scripture Reference / Inspiration Quote</label>
            <input
              type="text"
              placeholder="e.g. Exodus 25:8 - And let them make me a sanctuary; that I may dwell among them."
              value={form.scriptureText}
              onChange={(e) => setForm({ ...form, scriptureText: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Vision & Purpose Description</label>
            <textarea
              rows={3}
              placeholder="Explain the vision, goals, breakdown of the budget, and how every seed sown advances God's work..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Target Deadline / End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Link to Church Event (Optional)</label>
              <select
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                className="input"
              >
                <option value="">None (Independent Project)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Link to Giving Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="input"
              >
                <option value="">Auto-create dedicated category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Banner Image / Project Flyer URL</label>
            <input
              type="url"
              placeholder="https://... image link or 3D architectural rendering"
              value={form.bannerUrl}
              onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
              className="input"
            />
          </div>

          {/* Visibility and Status Toggles */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600">Distribution & Visibility</div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowPublicDonations}
                  onChange={(e) => setForm({ ...form, allowPublicDonations: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Allow Public Guest Donations</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowMemberPortal}
                  onChange={(e) => setForm({ ...form, allowMemberPortal: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Display in Member Portal Giving</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Pin as Featured Campaign</span>
              </label>

              <div>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input h-8 text-xs py-0.5"
                >
                  <option value="active">Status: Active (Open for Giving)</option>
                  <option value="completed">Status: Completed (Goal Achieved)</option>
                  <option value="paused">Status: Paused</option>
                  <option value="draft">Status: Draft</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {editingCampaign ? 'Update Campaign' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD OFFLINE / MANUAL DONATION MODAL */}
      <Modal
        isOpen={Boolean(donationModal)}
        onClose={() => setDonationModal(null)}
        title={`Record Donation for: ${donationModal?.title}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleRecordDonation} className="space-y-4 pt-2">
          <p className="text-xs text-gray-500">
            Record cash, bank transfer, or cheque given towards this specific fundraising campaign.
          </p>

          <div>
            <label className="label">Donation Amount (₦) *</label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 50000"
              value={donationForm.amount}
              onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
              className="input text-lg font-bold"
            />
          </div>

          <div>
            <label className="label">Donor Name / Description</label>
            <input
              type="text"
              placeholder="e.g. Bro. Emmanuel Adebayo (or leave blank for Anonymous)"
              value={donationForm.donorName}
              onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payment Method</label>
              <select
                value={donationForm.paymentMethod}
                onChange={(e) => setDonationForm({ ...donationForm, paymentMethod: e.target.value })}
                className="input"
              >
                <option value="transfer">Direct Bank Transfer</option>
                <option value="cash">Cash Offering</option>
                <option value="pos">POS / Terminal</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="label">Date Received</label>
              <input
                type="date"
                value={donationForm.transactionDate}
                onChange={(e) => setDonationForm({ ...donationForm, transactionDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Notes / Purpose (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Building pledge redemption (batch 1)"
              value={donationForm.notes}
              onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setDonationModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={recordingDonation} className="btn-primary">
              {recordingDonation ? <Loader2 size={16} className="animate-spin" /> : 'Record Donation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONTRIBUTIONS & DONORS MODAL */}
      <Modal
        isOpen={Boolean(historyModal)}
        onClose={() => setHistoryModal(null)}
        title={`Contributions: ${historyModal?.title}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase font-semibold">Total Raised for Project</div>
              <div className="text-2xl font-bold font-display text-emerald-600 mt-0.5">
                {fmt(historyModal?.amount_raised)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase font-semibold">Goal Target</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                {historyModal?.target_amount > 0 ? fmt(historyModal.target_amount) : 'Open goal'}
              </div>
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
          ) : contributions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No contributions recorded for this campaign yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {contributions.map((c, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.is_anonymous ? '?' : (c.donor_name?.[0] || 'D').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {c.is_anonymous ? 'Anonymous Giver' : c.donor_name || 'Church Giver'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {format(new Date(c.created_at || Date.now()), 'MMM d, yyyy · p')} · {c.source === 'online' ? 'Online Card/Bank' : 'Manual / Offline'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">{fmt(c.amount)}</div>
                    {c.notes && <div className="text-[10px] text-gray-400 italic">{c.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Printable Campaign QR Poster Modal */}
      {shareCampaign && (
        <PublicIntakeShareModal
          open={!!shareCampaign}
          onClose={() => setShareCampaign(null)}
          title={`Giving Campaign: ${shareCampaign.title}`}
          description={`Printable QR code poster for ${shareCampaign.title}. Print as an A4 flyer or pew cards to place on seats and offering stands.`}
          url={`${window.location.origin}/give/${user?.churchSlug || 'my-church'}?campaign=${shareCampaign.slug || shareCampaign.id}`}
          churchName={user?.churchName}
        />
      )}
    </div>
  );
}
