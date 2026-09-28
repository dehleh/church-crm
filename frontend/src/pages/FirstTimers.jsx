import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Plus, Search, Phone, Mail, ArrowRightCircle, Loader2, CheckCircle, Edit2, FileSpreadsheet, QrCode, Bot, Sparkles, Clock, Send, MessageSquare, Play, XCircle } from 'lucide-react';
import { firstTimersAPI, branchesAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import CsvImportModal from '../components/ui/CsvImportModal';
import PublicIntakeShareModal from '../components/ui/PublicIntakeShareModal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { email as validateEmail, phone as validatePhone } from '../utils/validation';
import { useAuth } from '../context/AuthContext';

const FOLLOW_UP_BADGE = {
  pending: 'badge-yellow', contacted: 'badge-blue',
  converted: 'badge-green', inactive: 'badge-gray',
  visitor: 'badge-purple',
};

export default function FirstTimers() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Automated Drip Follow-up Sequence state
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [savingSequence, setSavingSequence] = useState(false);
  const [sequenceSettings, setSequenceSettings] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [queueVisitor, setQueueVisitor] = useState(null);
  const [queueList, setQueueList] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const churchSlug = user?.church_slug || user?.churchSlug;
  const publicFirstTimerFormUrl = useMemo(() => {
    if (!churchSlug || typeof window === 'undefined') return '';
    return `${window.location.origin}/connect/${churchSlug}/first-timer`;
  }, [churchSlug]);

  const openSequenceModal = async () => {
    setShowSequenceModal(true);
    try {
      const res = await firstTimersAPI.getSequenceSettings();
      setSequenceSettings(res.data.data);
    } catch {
      toast.error('Failed to load automation settings');
    }
  };

  const handleSaveSequence = async () => {
    if (!sequenceSettings) return;
    setSavingSequence(true);
    try {
      await firstTimersAPI.updateSequenceSettings(sequenceSettings);
      toast.success('Automated drip sequence updated!');
      setShowSequenceModal(false);
    } catch {
      toast.error('Failed to save sequence settings');
    } finally {
      setSavingSequence(false);
    }
  };

  const openQueueModal = async (visitor) => {
    setQueueVisitor(visitor);
    setShowQueueModal(true);
    setLoadingQueue(true);
    try {
      const res = await firstTimersAPI.getMemberQueue(visitor.id);
      setQueueList(res.data.data || []);
    } catch {
      toast.error('Failed to load sequence queue');
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleCancelQueue = async (visitorId) => {
    if (!window.confirm('Cancel remaining automated follow-up messages for this visitor?')) return;
    try {
      await firstTimersAPI.cancelMemberQueue(visitorId);
      toast.success('Automated sequence cancelled');
      const res = await firstTimersAPI.getMemberQueue(visitorId);
      setQueueList(res.data.data || []);
    } catch {
      toast.error('Failed to cancel sequence');
    }
  };

  const handleTriggerQueue = async (visitorId) => {
    try {
      await firstTimersAPI.triggerMemberSequence(visitorId);
      toast.success('Automated sequence re-enrolled!');
      const res = await firstTimersAPI.getMemberQueue(visitorId);
      setQueueList(res.data.data || []);
    } catch {
      toast.error('Failed to trigger sequence');
    }
  };

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(search && { search }), ...(statusFilter && { followUpStatus: statusFilter }) };
      const [res, statsRes] = await Promise.all([firstTimersAPI.list(params), firstTimersAPI.stats()]);
      setItems(res.data.data);
      setPagination(res.data.pagination);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load first timers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(1); }, [fetch]);
  useEffect(() => { branchesAPI.list().then(r => setBranches(r.data.data)).catch(() => {}); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    const errs = {};
    if (!form.firstName?.trim()) errs.firstName = 'First name is required';
    if (!form.lastName?.trim()) errs.lastName = 'Last name is required';
    if (!form.phone?.trim()) errs.phone = 'Phone is required';
    else { const phoneErr = validatePhone(form.phone); if (phoneErr) errs.phone = phoneErr; }
    if (!form.email?.trim()) errs.email = 'Email is required';
    else { const emailErr = validateEmail(form.email); if (emailErr) errs.email = emailErr; }
    if (!form.gender) errs.gender = 'Gender is required';
    if (!form.visitDate) errs.visitDate = 'Visit date is required';
    if (!form.howDidYouHear) errs.howDidYouHear = 'This field is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return toast.error('Please fill all required fields');
    setSaving(true);
    try {
      if (modal === 'edit') {
        await firstTimersAPI.update(selected.id, form);
        toast.success('First timer updated!');
      } else {
        await firstTimersAPI.create(form);
        toast.success('First timer recorded!');
      }
      setModal(null); fetch(modal === 'edit' ? pagination.page : 1);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      firstName: item.first_name, lastName: item.last_name,
      phone: item.phone || '', email: item.email || '',
      gender: item.gender || '', visitDate: item.visit_date ? item.visit_date.split('T')[0] : '',
      dateOfBirth: item.date_of_birth ? item.date_of_birth.split('T')[0] : '',
      howDidYouHear: item.how_did_you_hear || '', branchId: item.branch_id || '',
      prayerRequest: item.prayer_request || '', address: item.address || '',
    });
    setFormErrors({});
    setModal('edit');
  };

  const handleFollowUp = async () => {
    setSaving(true);
    try {
      await firstTimersAPI.updateFollowUp(selected.id, {
        followUpStatus: form.followUpStatus,
        followUpNotes: form.followUpNotes,
      });
      toast.success('Follow-up updated!');
      setModal(null); fetch(pagination.page);
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this first timer to a full member?')) return;
    try {
      await firstTimersAPI.convert(id);
      toast.success('Converted to member! 🎉');
      fetch(pagination.page);
    } catch { toast.error('Conversion failed'); }
  };

  const getInitials = (fn, ln) => `${fn?.[0] || ''}${ln?.[0] || ''}`.toUpperCase();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">First Timers</h1>
          <p className="text-gray-500 text-sm mt-1">Track and follow up on new visitors</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openSequenceModal} className="btn-secondary flex items-center gap-1.5 text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100">
            <Bot size={16} /> Automated Drip
          </button>
          {publicFirstTimerFormUrl && (
            <button onClick={() => setShowShare(true)} className="btn-secondary flex items-center gap-1.5">
              <QrCode size={16} /> Visitor Form
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-1.5">
            <FileSpreadsheet size={16} /> Import CSV
          </button>
          <button onClick={() => { setForm({ visitDate: format(new Date(), 'yyyy-MM-dd') }); setFormErrors({}); setModal('add'); }} className="btn-primary">
            <Plus size={16} /> Record Visitor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Visitors', value: stats.total, color: 'text-gray-700' },
          { label: 'Pending Follow-up', value: stats.pending, color: 'text-amber-600' },
          { label: 'Contacted', value: stats.contacted, color: 'text-brand-600' },
          { label: 'Converted', value: stats.converted, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color}`}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 bg-white">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2 h-9 text-sm" placeholder="Search visitors…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="visitor">Visitor</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No first timers recorded</p>
            <button onClick={() => { setForm({ visitDate: format(new Date(), 'yyyy-MM-dd') }); setFormErrors({}); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Record Visitor</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Visit Date</th>
                <th>Contact</th>
                <th>How They Heard</th>
                <th>Follow-up</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                        {getInitials(item.first_name, item.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.first_name} {item.last_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{item.gender || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600">{item.visit_date ? format(new Date(item.visit_date), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      {item.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={11} />{item.phone}</span>}
                      {item.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={11} />{item.email}</span>}
                    </div>
                  </td>
                  <td className="text-sm text-gray-500 capitalize">{item.how_did_you_hear || '—'}</td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`badge capitalize ${FOLLOW_UP_BADGE[item.follow_up_status] || 'badge-gray'}`}>
                        {item.follow_up_status}
                      </span>
                      <button
                        onClick={() => openQueueModal(item)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 transition-colors"
                        title="View Automated Follow-up Drip Schedule"
                      >
                        <Bot size={11} /> Drip Queue
                      </button>
                    </div>
                  </td>

                  <td className="text-sm text-gray-500">{item.assigned_to_name || 'Unassigned'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {!item.converted_to_member && (
                        <>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => { setSelected(item); setForm({ followUpStatus: item.follow_up_status, followUpNotes: item.follow_up_notes }); setModal('followup'); }}
                            className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title="Update Follow-up">
                            <ArrowRightCircle size={15} />
                          </button>
                          <button
                            onClick={() => handleConvert(item.id)}
                            className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors" title="Convert to Member">
                            <CheckCircle size={15} />
                          </button>
                        </>
                      )}
                      {item.converted_to_member && <span className="badge badge-green text-xs">Converted</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Showing {items.length} of {pagination.total} visitors</span>
            <div className="flex gap-2">
              <button disabled={pagination.page <= 1} onClick={() => fetch(pagination.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetch(pagination.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit First Timer' : 'Record First Timer'} size="lg"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleAdd} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : modal === 'edit' ? 'Save Changes' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">First Name *</label><input className={`input ${formErrors.firstName ? 'border-red-400' : ''}`} value={form.firstName || ''} onChange={set('firstName')} />{formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}</div>
            <div><label className="label">Last Name *</label><input className={`input ${formErrors.lastName ? 'border-red-400' : ''}`} value={form.lastName || ''} onChange={set('lastName')} />{formErrors.lastName && <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone *</label><input type="tel" className={`input ${formErrors.phone ? 'border-red-400' : ''}`} value={form.phone || ''} onChange={set('phone')} placeholder="+234..." />{formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}</div>
            <div><label className="label">Email *</label><input type="email" className={`input ${formErrors.email ? 'border-red-400' : ''}`} value={form.email || ''} onChange={set('email')} />{formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gender *</label>
              <select className={`input ${formErrors.gender ? 'border-red-400' : ''}`} value={form.gender || ''} onChange={set('gender')}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
              </select>
              {formErrors.gender && <p className="text-xs text-red-500 mt-1">{formErrors.gender}</p>}
            </div>
            <div><label className="label">Visit Date *</label><input type="date" className={`input ${formErrors.visitDate ? 'border-red-400' : ''}`} value={form.visitDate || ''} onChange={set('visitDate')} />{formErrors.visitDate && <p className="text-xs text-red-500 mt-1">{formErrors.visitDate}</p>}</div>
          </div>
          <div><label className="label">Date of Birth</label><input type="date" max={new Date().toISOString().slice(0,10)} className="input" value={form.dateOfBirth || ''} onChange={set('dateOfBirth')} /></div>
          <div>
            <label className="label">How did they hear about us? *</label>
            <select className={`input ${formErrors.howDidYouHear ? 'border-red-400' : ''}`} value={form.howDidYouHear || ''} onChange={set('howDidYouHear')}>
              <option value="">Select</option>
              {['social_media','friend','walk_in','online_service','flyer','event','others'].map(v => (
                <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {formErrors.howDidYouHear && <p className="text-xs text-red-500 mt-1">{formErrors.howDidYouHear}</p>}
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
          <div>
            <label className="label">Branch</label>
            <select className="input" value={form.branchId || ''} onChange={set('branchId')}>
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div><label className="label">Prayer Request</label><textarea className="input min-h-[70px]" value={form.prayerRequest || ''} onChange={set('prayerRequest')} /></div>
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={modal === 'followup'} onClose={() => setModal(null)} title="Update Follow-up"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleFollowUp} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Update'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Follow-up Status</label>
            <select className="input" value={form.followUpStatus || ''} onChange={set('followUpStatus')}>
              <option value="pending">Pending</option>
              <option value="visitor">Visitor</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input min-h-[100px]" placeholder="Add notes about your follow-up interaction…" value={form.followUpNotes || ''} onChange={set('followUpNotes')} /></div>
        </div>
      </Modal>

      <CsvImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={() => fetch(1)}
        entityType="firstTimers"
        importFn={firstTimersAPI.importCsv}
      />

      <PublicIntakeShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="First Timer Form"
        description="Share this QR code or link with first-timers so they can fill their details themselves and appear on the First Timers page."
        url={publicFirstTimerFormUrl}
      />

      {/* Automated Follow-up Drip Sequence Settings Modal */}
      <Modal
        open={showSequenceModal}
        onClose={() => setShowSequenceModal(false)}
        title="Automated Drip Follow-up Sequence"
        size="lg"
        footer={<>
          <button onClick={() => setShowSequenceModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveSequence} disabled={savingSequence} className="btn-primary">
            {savingSequence ? <Loader2 size={15} className="animate-spin" /> : 'Save Automation Rules'}
          </button>
        </>}
      >
        {sequenceSettings ? (
          <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
            <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-3">
              <Bot className="text-brand-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm">
                <p className="font-semibold text-brand-900">Multi-Step Automated Follow-up</p>
                <p className="text-brand-700 text-xs mt-0.5">
                  When a first-timer registers or is recorded, ChurchOS automatically enrolls them in a timed 3-step drip campaign via WhatsApp/SMS to warm their heart and integrate them into fellowship.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <label className="text-sm font-semibold text-gray-800">Enable Automated Drip Campaign</label>
                <p className="text-xs text-gray-500">Automatically queue messages for all new connect-card entries</p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 accent-brand-600 cursor-pointer rounded"
                checked={sequenceSettings.is_active ?? true}
                onChange={e => setSequenceSettings(s => ({ ...s, is_active: e.target.checked }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Delivery Channel</label>
                <select
                  className="input"
                  value={sequenceSettings.channel || 'whatsapp'}
                  onChange={e => setSequenceSettings(s => ({ ...s, channel: e.target.value }))}
                >
                  <option value="whatsapp">WhatsApp (Recommended)</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both (WhatsApp + SMS Fallback)</option>
                </select>
              </div>
              <div>
                <label className="label">Available Dynamic Placeholders</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['{{firstName}}', '{{lastName}}', '{{churchName}}', '{{serviceTheme}}'].map(tag => (
                    <span key={tag} className="text-[11px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 1: Day 0 */}
            <div className="p-4 border border-gray-200 rounded-xl space-y-2.5 bg-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock size={12} /> Step 1: Day 0 (Immediate Welcome)
                </span>
                <span className="text-xs text-gray-400">Sent ~1 hour after service/intake</span>
              </div>
              <textarea
                className="input min-h-[90px] text-sm font-sans"
                value={sequenceSettings.step1_template || ''}
                onChange={e => setSequenceSettings(s => ({ ...s, step1_template: e.target.value }))}
                placeholder="Welcome template..."
              />
            </div>

            {/* Step 2: Day 3 */}
            <div className="p-4 border border-gray-200 rounded-xl space-y-2.5 bg-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  <Clock size={12} /> Step 2: Day 3 (Midweek Check-in & Prayer)
                </span>
                <span className="text-xs text-gray-400">Sent on Wednesday or 72 hours later</span>
              </div>
              <textarea
                className="input min-h-[90px] text-sm font-sans"
                value={sequenceSettings.step2_template || ''}
                onChange={e => setSequenceSettings(s => ({ ...s, step2_template: e.target.value }))}
                placeholder="Midweek prayer check-in template..."
              />
            </div>

            {/* Step 3: Day 7 */}
            <div className="p-4 border border-gray-200 rounded-xl space-y-2.5 bg-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Clock size={12} /> Step 3: Day 7 (Sunday Return Reminder)
                </span>
                <span className="text-xs text-gray-400">Sent Saturday morning before next Sunday</span>
              </div>
              <textarea
                className="input min-h-[90px] text-sm font-sans"
                value={sequenceSettings.step3_template || ''}
                onChange={e => setSequenceSettings(s => ({ ...s, step3_template: e.target.value }))}
                placeholder="Next Sunday reminder template..."
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-brand-600" />
          </div>
        )}
      </Modal>

      {/* Visitor Sequence Queue Modal */}
      <Modal
        open={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        title={queueVisitor ? `Automated Follow-up: ${queueVisitor.first_name} ${queueVisitor.last_name}` : 'Follow-up Queue'}
        size="lg"
        footer={<>
          <button onClick={() => setShowQueueModal(false)} className="btn-secondary">Close</button>
          {queueVisitor && (
            <>
              <button
                onClick={() => handleCancelQueue(queueVisitor.id)}
                className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel Remaining
              </button>
              <button
                onClick={() => handleTriggerQueue(queueVisitor.id)}
                className="btn-primary"
              >
                Re-Enroll in Sequence
              </button>
            </>
          )}
        </>}
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs text-gray-600">
            <span><strong>Visitor:</strong> {queueVisitor?.first_name} {queueVisitor?.last_name}</span>
            <span><strong>Phone:</strong> {queueVisitor?.phone || 'No phone'}</span>
            <span><strong>Visited:</strong> {queueVisitor?.visit_date ? format(new Date(queueVisitor.visit_date), 'MMM d, yyyy') : '—'}</span>
          </div>

          {loadingQueue ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-brand-600" />
            </div>
          ) : queueList.length === 0 ? (
            <div className="text-center py-10">
              <Bot size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 font-medium">No messages currently in queue for this visitor</p>
              <p className="text-xs text-gray-400 mt-1">You can click "Re-Enroll in Sequence" to generate and schedule the 3-step follow-up.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueList.map((item, idx) => (
                <div key={item.id} className="p-3.5 border rounded-xl bg-white shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                        {item.step_number}
                      </span>
                      Step {item.step_number}: Day {item.scheduled_days_after ?? (idx === 0 ? 0 : idx === 1 ? 3 : 7)}
                    </span>
                    <span className={`badge uppercase text-[10px] font-bold ${
                      item.status === 'sent' ? 'badge-green' :
                      item.status === 'cancelled' ? 'badge-gray' :
                      item.status === 'failed' ? 'badge-red' :
                      'badge-blue'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">
                    {item.message_body}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Channel: {item.channel?.toUpperCase() || 'WHATSAPP'}</span>
                    <span>
                      {item.status === 'sent' && item.sent_at
                        ? `Sent: ${format(new Date(item.sent_at), 'MMM d, h:mm a')}`
                        : `Scheduled: ${item.scheduled_for ? format(new Date(item.scheduled_for), 'MMM d, h:mm a') : 'Due soon'}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

