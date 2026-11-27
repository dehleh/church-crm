import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, HeartHandshake, CheckCircle2, Clock, Calendar, Globe,
  Plus, Search, Filter, Trash2, Edit3, User, MessageCircle, AlertCircle,
  Eye, Loader2, Check, X, Share2, Image as ImageIcon
} from 'lucide-react';
import { testimoniesAPI, assetsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../api/client';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'breakthrough', label: 'Breakthrough', color: 'bg-purple-100 text-purple-800' },
  { value: 'healing', label: 'Divine Healing', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'provision', label: 'Supernatural Provision', color: 'bg-amber-100 text-amber-800' },
  { value: 'salvation', label: 'Salvation / Rededication', color: 'bg-blue-100 text-blue-800' },
  { value: 'fruit_of_the_womb', label: 'Fruit of the Womb', color: 'bg-rose-100 text-rose-800' },
  { value: 'academic_career', label: 'Career & Academic Promotion', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'deliverance', label: 'Deliverance & Protection', color: 'bg-teal-100 text-teal-800' },
  { value: 'family', label: 'Family & Marriage Restoration', color: 'bg-pink-100 text-pink-800' },
  { value: 'other', label: 'Praise & Thanksgiving', color: 'bg-gray-100 text-gray-800' },
];

const STATUS_TABS = [
  { id: 'all', label: 'All Testimonies' },
  { id: 'pending_review', label: '⏳ Pending Review' },
  { id: 'approved_for_service', label: '⛪ Sunday Service Ready' },
  { id: 'approved_online', label: '🌐 Online Bulletin' },
  { id: 'shared_in_service', label: '✅ Shared in Service' },
];

function getNextSunday() {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d.toISOString().split('T')[0];
}

export default function Testimonies() {
  const { user } = useAuth();
  const isPastor = ['senior_pastor', 'head_pastor', 'admin', 'church_admin', 'pastor'].includes(user?.role);

  const [testimonies, setTestimonies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    title: '',
    content: '',
    category: 'breakthrough',
    submitterName: '',
    submitterPhone: '',
    submitterEmail: '',
    isAnonymous: false,
    testimonyDate: new Date().toISOString().split('T')[0],
    photoUrl: '',
  });

  // Pastoral Review Modal
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'approved_for_service',
    scheduledServiceDate: getNextSunday(),
    pastoralNotes: '',
  });
  const [savingReview, setSavingReview] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await testimoniesAPI.stats();
      setStats(res.data?.data || null);
    } catch {}
  }, []);

  const fetchTestimonies = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await testimoniesAPI.list(params);
      setTestimonies(res.data?.data || []);
    } catch {
      toast.error('Failed to load testimonies');
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, searchTerm]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTestimonies();
  }, [fetchTestimonies]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await assetsAPI.uploadPhoto(fd);
      setSubmitForm(prev => ({ ...prev, photoUrl: res.data?.url }));
      toast.success('Testimony photo attached!');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitTestimony = async (e) => {
    e.preventDefault();
    if (!submitForm.title.trim()) return toast.error('Please enter a testimony title');
    if (!submitForm.content.trim()) return toast.error('Please provide testimony details');

    setSubmitting(true);
    try {
      await testimoniesAPI.submit(submitForm);
      toast.success('Testimony submitted for pastoral review! 🙌');
      setShowSubmitModal(false);
      setSubmitForm({
        title: '',
        content: '',
        category: 'breakthrough',
        submitterName: '',
        submitterPhone: '',
        submitterEmail: '',
        isAnonymous: false,
        testimonyDate: new Date().toISOString().split('T')[0],
        photoUrl: '',
      });
      fetchStats();
      fetchTestimonies();
    } catch {
      toast.error('Failed to submit testimony');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (testimony, defaultStatus = 'approved_for_service') => {
    setReviewTarget(testimony);
    setReviewForm({
      status: defaultStatus,
      scheduledServiceDate: testimony.scheduled_service_date?.split('T')[0] || getNextSunday(),
      pastoralNotes: testimony.pastoral_notes || '',
    });
  };

  const handleSaveReview = async () => {
    if (!reviewTarget) return;
    setSavingReview(true);
    try {
      const res = await testimoniesAPI.review(reviewTarget.id, reviewForm);
      toast.success(res.data?.message || 'Pastoral review updated');
      setReviewTarget(null);
      fetchStats();
      fetchTestimonies();
    } catch {
      toast.error('Failed to update pastoral review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDirectStatusChange = async (id, status) => {
    try {
      await testimoniesAPI.review(id, { status });
      toast.success(`Testimony marked as ${status.replace(/_/g, ' ')}`);
      fetchStats();
      fetchTestimonies();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTestimony = async (id) => {
    if (!confirm('Are you sure you want to delete this testimony?')) return;
    try {
      await testimoniesAPI.delete(id);
      toast.success('Testimony removed');
      fetchStats();
      fetchTestimonies();
    } catch {
      toast.error('Failed to delete testimony');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Praise Reports & Testimonies</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
              <Sparkles size={12} /> Church Life
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Review member praise reports, curate testimonies for Sunday service reading, and celebrate God's faithfulness
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="btn-primary flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={16} /> Share Testimony
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
              <Clock size={18} />
            </div>
            <p className="text-3xl font-extrabold text-amber-900 mt-2">{stats.pending_review || 0}</p>
            <p className="text-xs text-amber-700 mt-1">Awaiting pastoral review</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-xs font-bold uppercase tracking-wider">Sunday Service Ready</span>
              <Calendar size={18} />
            </div>
            <p className="text-3xl font-extrabold text-purple-900 mt-2">{stats.approved_for_service || 0}</p>
            <p className="text-xs text-purple-700 mt-1">Scheduled for church service</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-xs font-bold uppercase tracking-wider">Online Bulletin</span>
              <Globe size={18} />
            </div>
            <p className="text-3xl font-extrabold text-blue-900 mt-2">{stats.approved_online || 0}</p>
            <p className="text-xs text-blue-700 mt-1">Approved for digital display</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold uppercase tracking-wider">Shared in Service</span>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-3xl font-extrabold text-emerald-900 mt-2">{stats.shared_in_service || 0}</p>
            <p className="text-xs text-emerald-700 mt-1">Read before congregation</p>
          </div>
        </div>
      )}

      {/* Filters and Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-auto text-xs py-1"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search praise reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-8 py-1 text-xs w-48"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonies Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : testimonies.length === 0 ? (
        <div className="card text-center py-16">
          <Sparkles size={40} className="mx-auto text-gray-300 mb-2" />
          <p className="font-semibold text-gray-700">No testimonies found</p>
          <p className="text-xs text-gray-400 mt-1">Submit a testimony to encourage the body of Christ</p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn-primary mt-4 inline-flex items-center gap-1.5 text-xs"
          >
            <Plus size={14} /> Submit First Testimony
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonies.map((t) => {
            const cat = CATEGORIES.find(c => c.value === t.category) || CATEGORIES[0];
            return (
              <div key={t.id} className="card p-5 flex flex-col justify-between hover:shadow-card-hover transition-all">
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>
                      {cat.label}
                    </span>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      t.status === 'approved_for_service' ? 'bg-purple-100 text-purple-800' :
                      t.status === 'approved_online' ? 'bg-blue-100 text-blue-800' :
                      t.status === 'shared_in_service' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">{t.title}</h3>

                  {/* Submitter & Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <User size={12} /> {t.is_anonymous ? 'Anonymous Member' : t.submitter_name}
                    </span>
                    <span>•</span>
                    <span>{new Date(t.testimony_date || t.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Content preview */}
                  <p className="text-xs text-gray-600 line-clamp-4 mb-3 whitespace-pre-wrap leading-relaxed">
                    "{t.content}"
                  </p>

                  {/* Photo thumbnail */}
                  {t.photo_url && (
                    <div className="mb-3">
                      <button
                        onClick={() => setSelectedPhoto(getAssetUrl(t.photo_url))}
                        className="group relative rounded-lg overflow-hidden border border-gray-200 block"
                      >
                        <img
                          src={getAssetUrl(t.photo_url)}
                          alt="Testimony attachment"
                          className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                          <Eye size={14} /> View Photo
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Scheduled service badge */}
                  {t.scheduled_service_date && (
                    <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-900 flex items-center gap-2 mb-3">
                      <Calendar size={13} className="text-purple-600 shrink-0" />
                      <span>Scheduled for: <strong>{new Date(t.scheduled_service_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                    </div>
                  )}

                  {/* Pastoral notes */}
                  {t.pastoral_notes && (
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 mb-3">
                      <span className="font-bold text-gray-700">Pastoral Note:</span> {t.pastoral_notes}
                    </div>
                  )}
                </div>

                {/* Pastoral Action Toolbar */}
                {isPastor && (
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {t.status !== 'approved_for_service' && (
                        <button
                          onClick={() => openReviewModal(t, 'approved_for_service')}
                          className="text-[11px] font-semibold px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-colors"
                        >
                          Approve for Service
                        </button>
                      )}

                      {t.status === 'approved_for_service' && (
                        <button
                          onClick={() => handleDirectStatusChange(t.id, 'shared_in_service')}
                          className="text-[11px] font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                        >
                          Mark Shared
                        </button>
                      )}

                      {t.status !== 'approved_online' && (
                        <button
                          onClick={() => handleDirectStatusChange(t.id, 'approved_online')}
                          className="text-[11px] font-semibold px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                        >
                          Approve Online
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTestimony(t.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: SUBMIT TESTIMONY */}
      <Modal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Share a Praise Report / Testimony"
        footer={
          <>
            <button onClick={() => setShowSubmitModal(false)} className="btn-secondary" disabled={submitting}>
              Cancel
            </button>
            <button onClick={handleSubmitTestimony} className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Testimony'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitTestimony} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Testimony Headline *</label>
            <input
              className="input"
              placeholder="e.g. Healed of chronic back pain during communion"
              value={submitForm.title}
              onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={submitForm.category}
                onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Date of Miracle</label>
              <input
                type="date"
                className="input"
                value={submitForm.testimonyDate}
                onChange={(e) => setSubmitForm({ ...submitForm, testimonyDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">What did the Lord do? (Details) *</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Share the full story to inspire the congregation..."
              value={submitForm.content}
              onChange={(e) => setSubmitForm({ ...submitForm, content: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Your Name</label>
              <input
                className="input"
                placeholder="Full Name"
                disabled={submitForm.isAnonymous}
                value={submitForm.submitterName}
                onChange={(e) => setSubmitForm({ ...submitForm, submitterName: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                className="input"
                placeholder="080... or +234..."
                disabled={submitForm.isAnonymous}
                value={submitForm.submitterPhone}
                onChange={(e) => setSubmitForm({ ...submitForm, submitterPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anon-testimony"
              checked={submitForm.isAnonymous}
              onChange={(e) => setSubmitForm({ ...submitForm, isAnonymous: e.target.checked })}
              className="rounded text-brand-600"
            />
            <label htmlFor="anon-testimony" className="text-xs text-gray-700 font-medium cursor-pointer">
              Share anonymously (hide my personal name when reading before church)
            </label>
          </div>

          {/* Photo upload */}
          <div>
            <label className="label">Attach Medical Report / Photo (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            {uploadingPhoto && <p className="text-xs text-brand-600 mt-1">Uploading photo...</p>}
            {submitForm.photoUrl && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <Check size={12} /> Image attached successfully
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PASTORAL REVIEW & SERVICE SCHEDULER */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Pastoral Review & Service Approval"
        footer={
          <>
            <button onClick={() => setReviewTarget(null)} className="btn-secondary" disabled={savingReview}>
              Cancel
            </button>
            <button onClick={handleSaveReview} className="btn-primary" disabled={savingReview}>
              {savingReview ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Approval'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900">
            Reviewing: <strong>"{reviewTarget?.title}"</strong> by {reviewTarget?.is_anonymous ? 'Anonymous Member' : reviewTarget?.submitter_name}
          </div>

          <div>
            <label className="label">Approval Decision</label>
            <select
              className="input"
              value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
            >
              <option value="approved_for_service">⛪ Approve to be Shared in Sunday Service</option>
              <option value="approved_online">🌐 Approve for Online Bulletin & App Only</option>
              <option value="shared_in_service">✅ Already Shared in Service</option>
              <option value="pending_review">⏳ Keep Pending Further Verification</option>
              <option value="rejected">❌ Decline / Do Not Share</option>
            </select>
          </div>

          {reviewForm.status === 'approved_for_service' && (
            <div>
              <label className="label">Scheduled Service Date *</label>
              <input
                type="date"
                className="input"
                value={reviewForm.scheduledServiceDate}
                onChange={(e) => setReviewForm({ ...reviewForm, scheduledServiceDate: e.target.value })}
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">Select the Sunday or midweek celebration when this will be read on stage.</p>
            </div>
          )}

          <div>
            <label className="label">Pastoral Notes / Minister's Instructions</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g. 'Invite Mrs. X to the pulpit for a 2-minute live testimony', or 'Read out as praise point during thanksgiving'..."
              value={reviewForm.pastoralNotes}
              onChange={(e) => setReviewForm({ ...reviewForm, pastoralNotes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* PHOTO PREVIEW MODAL */}
      <Modal
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        title="Testimony Photo"
        footer={<button onClick={() => setSelectedPhoto(null)} className="btn-secondary">Close</button>}
      >
        <div className="flex justify-center p-2">
          {selectedPhoto && (
            <img src={selectedPhoto} alt="Testimony preview" className="max-h-[70vh] rounded-xl object-contain shadow-md" />
          )}
        </div>
      </Modal>
    </div>
  );
}
