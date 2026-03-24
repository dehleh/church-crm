import { useState, useEffect, useCallback } from 'react';
import { Film, Plus, Play, Download, Eye, Loader2, Music, FileText, Image } from 'lucide-react';
import { mediaAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TYPE_ICON = { sermon: Play, worship: Music, podcast: Music, document: FileText, image: Image };
const TYPE_BADGE = { sermon: 'badge-blue', worship: 'badge-purple', video: 'badge-peach', podcast: 'badge-yellow', document: 'badge-gray', image: 'badge-green' };

export default function Media() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        mediaAPI.list({ ...(typeFilter && { type: typeFilter }), limit: 20 }),
        mediaAPI.stats(),
      ]);
      setItems(res.data.data);
      setStats(statsRes.data.data);
    } catch { toast.error('Failed to load media'); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title || !form.mediaType) return toast.error('Title and type required');
    setSaving(true);
    try {
      await mediaAPI.create(form);
      toast.success('Media item added!');
      setModal(null); fetch();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="page-title">Media Library</h1><p className="text-gray-500 text-sm mt-1">Sermons, worship recordings, and resources</p></div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary"><Plus size={16} /> Add Media</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Items', value: stats.total },
          { label: 'Published', value: stats.published },
          { label: 'Total Views', value: stats.total_views },
          { label: 'Downloads', value: stats.total_downloads },
        ].map(({ label, value }) => (
          <div key={label} className="card py-4 px-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
            <p className="text-2xl font-bold font-display text-gray-900">{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-gray-100 flex gap-3 bg-white">
          <select className="input h-9 text-sm w-auto py-2 pr-8" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {['sermon','worship','video','podcast','document','image'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Film size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No media items yet</p>
            <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary mt-4 inline-flex"><Plus size={15} /> Add Media</button>
          </div>
        ) : (
          <table className="crm-table">
            <thead><tr><th>Title</th><th>Type</th><th>Minister</th><th>Series</th><th>Views</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {items.map(item => {
                const Icon = TYPE_ICON[item.media_type] || Play;
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.scripture_reference && <p className="text-xs text-gray-400">{item.scripture_reference}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge capitalize ${TYPE_BADGE[item.media_type] || 'badge-gray'}`}>{item.media_type}</span></td>
                    <td className="text-sm text-gray-600">{item.minister_name || '—'}</td>
                    <td className="text-sm text-gray-500">{item.series_name || '—'}</td>
                    <td><span className="flex items-center gap-1 text-sm text-gray-500"><Eye size={13} />{item.view_count || 0}</span></td>
                    <td><span className={`badge ${item.is_published ? 'badge-green' : 'badge-gray'}`}>{item.is_published ? 'Published' : 'Draft'}</span></td>
                    <td className="text-sm text-gray-500">{item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Media Item"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Add Media'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Title *</label><input className="input" placeholder="Sunday Service — Faith That Moves Mountains" value={form.title || ''} onChange={set('title')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Media Type *</label>
              <select className="input" value={form.mediaType || ''} onChange={set('mediaType')}>
                <option value="">Select type</option>
                {['sermon','worship','video','podcast','document','image'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div><label className="label">Minister/Speaker</label><input className="input" value={form.ministerName || ''} onChange={set('ministerName')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Series</label><input className="input" placeholder="Faith Series" value={form.seriesName || ''} onChange={set('seriesName')} /></div>
            <div><label className="label">Scripture</label><input className="input" placeholder="Matthew 17:20" value={form.scriptureReference || ''} onChange={set('scriptureReference')} /></div>
          </div>
          <div><label className="label">File URL</label><input className="input" placeholder="https://..." value={form.fileUrl || ''} onChange={set('fileUrl')} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" value={form.description || ''} onChange={set('description')} /></div>
          <div>
            <label className="label flex items-center gap-2">
              <input type="checkbox" checked={form.isPublished || false} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))} />
              Publish immediately
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
