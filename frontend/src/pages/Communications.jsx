import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Send, Trash2, Loader2, Mail, Phone, Bell } from 'lucide-react';
import { communicationsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CHANNEL_ICON = { email: Mail, sms: Phone, whatsapp: Phone, push: Bell, in_app: Bell };
const CHANNEL_BADGE = { email: 'badge-blue', sms: 'badge-green', whatsapp: 'badge-green', push: 'badge-purple', in_app: 'badge-gray' };
const STATUS_BADGE = { draft: 'badge-gray', scheduled: 'badge-yellow', sent: 'badge-green', failed: 'badge-red' };

export default function Communications() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        communicationsAPI.list({ ...(statusFilter && { status: statusFilter }) }),
        communicationsAPI.stats(),
      ]);
      setItems(res.data.data);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load communications'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCompose = async () => {
    if (!form.title || !form.body || !form.channel) return toast.error('Title, body, and channel are required');
    setSaving(true);
    try {
      await communicationsAPI.create(form);
      toast.success('Message saved as draft!');
      setModal(null); fetch();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Send this message to all recipients now?')) return;
    try {
      const res = await communicationsAPI.send(id);
      toast.success(res.data.message || 'Message sent!');
      fetch();
    } catch { toast.error('Failed to send'); }
  };

  const handleDelete = async (id) => {
    try {
      await communicationsAPI.delete(id);
      toast.success('Draft deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
  };

  const previewMsg = (item) => { setSelected(item); setModal('preview'); };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Communications</h1>
          <p className="text-gray-500 text-sm mt-1">Send messages, announcements & alerts to your congregation</p>
        </div>
        <button onClick={() => { setForm({ audience: 'all' }); setModal('compose'); }} className="btn-primary">
          <Plus size={16} /> Compose Message
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Messages', value: stats.total },
          { label: 'Sent', value: stats.sent, color: 'text-emerald-600' },
          { label: 'Drafts', value: stats.drafts, color: 'text-amber-600' },
          { label: 'Total Recipients', value: Number(stats.total_recipients||0).toLocaleString(), color: 'text-brand-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className={`text-2xl font-bold font-display ${color || 'text-gray-900'}`}>{value || 0}</p>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex gap-3 bg-white">
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="draft">Drafts</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No messages yet</p>
            <button onClick={() => { setForm({ audience: 'all' }); setModal('compose'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Compose Message</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>Message</th><th>Channel</th><th>Audience</th><th>Status</th><th>Sent</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => {
                const Icon = CHANNEL_ICON[item.channel] || MessageSquare;
                return (
                  <tr key={item.id} className="cursor-pointer" onClick={() => previewMsg(item)}>
                    <td>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.body}</p>
                    </td>
                    <td>
                      <span className={`badge uppercase text-xs ${CHANNEL_BADGE[item.channel] || 'badge-gray'}`}>
                        <Icon size={10} /> {item.channel}
                      </span>
                    </td>
                    <td><span className="text-sm text-gray-600 capitalize">{item.audience?.replace('_', ' ')}</span></td>
                    <td><span className={`badge capitalize ${STATUS_BADGE[item.status] || 'badge-gray'}`}>{item.status}</span></td>
                    <td className="text-sm text-gray-600">{item.sent_count > 0 ? `${item.sent_count.toLocaleString()} recipients` : '—'}</td>
                    <td className="text-sm text-gray-500 whitespace-nowrap">{format(new Date(item.created_at), 'MMM d, yyyy')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {item.status === 'draft' && (
                          <>
                            <button onClick={() => handleSend(item.id)} className="p-1.5 rounded hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title="Send now">
                              <Send size={14} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete draft">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Compose Modal */}
      <Modal open={modal === 'compose'} onClose={() => setModal(null)} title="Compose Message" size="lg"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleCompose} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Save as Draft'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Subject / Title *</label><input className="input" placeholder="Sunday Service Reminder" value={form.title||''} onChange={set('title')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Channel *</label>
              <select className="input" value={form.channel||''} onChange={set('channel')}>
                <option value="">Select channel</option>
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="in_app">🔔 In-App</option>
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.audience||'all'} onChange={set('audience')}>
                <option value="all">All Members</option>
                <option value="members">Active Members</option>
                <option value="department">By Department</option>
                <option value="branch">By Branch</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Message Body *</label>
            <textarea className="input min-h-[160px]" placeholder="Type your message here…" value={form.body||''} onChange={set('body')} />
            {form.channel === 'sms' && (
              <p className="text-xs text-gray-400 mt-1">{(form.body||'').length}/160 characters · {Math.ceil((form.body||'').length/160) || 1} SMS</p>
            )}
          </div>
          <div>
            <label className="label">Schedule (optional)</label>
            <input type="datetime-local" className="input" value={form.scheduledAt||''} onChange={set('scheduledAt')} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to send immediately when you click Send</p>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={modal === 'preview'} onClose={() => setModal(null)} title={selected?.title || 'Message Preview'} size="md"
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Close</button>
          {selected?.status === 'draft' && (
            <button onClick={() => { handleSend(selected.id); setModal(null); }} className="btn-primary"><Send size={14} /> Send Now</button>
          )}
        </>}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <span className={`badge uppercase ${CHANNEL_BADGE[selected.channel] || 'badge-gray'}`}>{selected.channel}</span>
              <span className={`badge capitalize ${STATUS_BADGE[selected.status] || 'badge-gray'}`}>{selected.status}</span>
              <span className="badge badge-gray capitalize">{selected.audience}</span>
            </div>
            {selected.sent_at && <p className="text-xs text-gray-400">Sent {format(new Date(selected.sent_at), 'MMM d, yyyy h:mm a')} · {selected.sent_count} recipients</p>}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selected.body}
            </div>
            {selected.created_by_name && <p className="text-xs text-gray-400">Created by {selected.created_by_name}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
