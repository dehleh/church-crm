import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Search, Calendar, Send, Sparkles, Settings,
  Edit2, Trash2, Loader2, MessageCircle, Mail, CheckCircle2, Clock
} from 'lucide-react';
import { devotionalsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function DailyDevotionals() {
  const [devotionals, setDevotionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [broadcastingId, setBroadcastingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Edit / Create Modal
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    themeScripture: '',
    scriptureText: '',
    content: '',
    confession: '',
    prayerPoint: '',
    bibleReadingPlan: '',
    author: 'Senior Pastor',
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);

  // Automated Reminder Settings Modal
  const [settingsModal, setSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    enabled: false,
    schedule: 'morning',
    channels: ['whatsapp'],
    morning_time: '06:00',
    night_time: '21:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchDevotionals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devotionalsAPI.list({
        search: search || undefined,
        month: monthFilter || undefined,
      });
      setDevotionals(res.data.data || []);
    } catch {
      toast.error('Failed to load devotionals');
    } finally {
      setLoading(false);
    }
  }, [search, monthFilter]);

  useEffect(() => {
    fetchDevotionals();
  }, [fetchDevotionals]);

  const openNewDevotional = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      title: '',
      themeScripture: '',
      scriptureText: '',
      content: '',
      confession: '',
      prayerPoint: '',
      bibleReadingPlan: '',
      author: 'Senior Pastor',
      isPublished: true,
    });
    setModal(true);
  };

  const openEdit = (dev) => {
    setForm({
      id: dev.id,
      date: dev.date ? String(dev.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      title: dev.title,
      themeScripture: dev.theme_scripture,
      scriptureText: dev.scripture_text || '',
      content: dev.content,
      confession: dev.confession || '',
      prayerPoint: dev.prayer_point || '',
      bibleReadingPlan: dev.bible_reading_plan || '',
      author: dev.author || 'Senior Pastor',
      isPublished: dev.is_published !== false,
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.date || !form.title.trim() || !form.themeScripture.trim() || !form.content.trim()) {
      return toast.error('Please complete date, title, scripture, and content');
    }
    setSaving(true);
    try {
      if (form.id) {
        await devotionalsAPI.update(form.id, form);
        toast.success('Devotional updated successfully!');
      } else {
        await devotionalsAPI.create(form);
        toast.success('Devotional scheduled successfully!');
      }
      setModal(false);
      fetchDevotionals();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save devotional');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this devotional?')) return;
    try {
      await devotionalsAPI.delete(id);
      toast.success('Devotional removed');
      fetchDevotionals();
    } catch {
      toast.error('Failed to delete devotional');
    }
  };

  const handleBroadcast = async (dev, channel = 'whatsapp') => {
    if (!window.confirm(`Broadcast "${dev.title}" to active members via ${channel}?`)) return;
    setBroadcastingId(dev.id);
    try {
      const res = await devotionalsAPI.broadcast(dev.id, { channel });
      toast.success(res.data.message || 'Devotional broadcast sent to church family!');
      fetchDevotionals();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Broadcast failed');
    } finally {
      setBroadcastingId(null);
    }
  };

  const openSettings = async () => {
    try {
      const res = await devotionalsAPI.getSettings();
      setSettingsForm(res.data.data || {
        enabled: false,
        schedule: 'morning',
        channels: ['whatsapp'],
        morning_time: '06:00',
        night_time: '21:00',
      });
      setSettingsModal(true);
    } catch {
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await devotionalsAPI.updateSettings(settingsForm);
      toast.success('Automated reminder schedule saved!');
      setSettingsModal(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    try {
      const res = await devotionalsAPI.seedSamples();
      toast.success(res.data.message || 'Sample devotionals loaded!');
      fetchDevotionals();
    } catch {
      toast.error('Failed to load sample devotionals');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            Daily Devotionals
            <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2.5 py-0.5 rounded-full border border-brand-200">
              {devotionals.length} Published
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Inspire your congregation daily with spiritual reflections, Bible verses, guided prayers, and automated morning/evening reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {devotionals.length === 0 && (
            <button
              onClick={handleSeedSamples}
              disabled={seeding}
              className="btn-secondary flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-brand-600" />}
              <span>Load Sample Devotionals</span>
            </button>
          )}

          <button
            onClick={openSettings}
            className="btn-secondary flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
          >
            <Clock size={15} />
            <span>Reminder Automation</span>
          </button>

          <button onClick={openNewDevotional} className="btn-primary flex items-center gap-1.5 text-xs">
            <Plus size={15} /> Write Devotional
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 text-xs py-1.5 h-9"
            placeholder="Search devotionals by title, scripture, or prayer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input text-xs h-9 w-auto pr-8 py-1.5"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
        >
          <option value="">All Months</option>
          {MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Devotionals Feed / List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-600" />
        </div>
      ) : devotionals.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen size={44} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-800">No devotionals scheduled yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Write your first daily devotional or click below to populate inspiring starter devotionals for your church.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={handleSeedSamples} disabled={seeding} className="btn-secondary text-xs">
              <Sparkles size={14} /> Load Samples
            </button>
            <button onClick={openNewDevotional} className="btn-primary text-xs">
              <Plus size={14} /> Create Devotional
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {devotionals.map(dev => {
            const formattedDate = dev.date ? format(new Date(dev.date), 'EEEE, MMMM d, yyyy') : '';
            const isToday = dev.date && new Date(dev.date).toDateString() === new Date().toDateString();

            return (
              <div
                key={dev.id}
                className={`card p-5 transition-all hover:shadow-md border ${
                  isToday ? 'border-brand-300 ring-2 ring-brand-100 bg-brand-50/10' : 'border-gray-100'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 flex items-center gap-1">
                        <Calendar size={12} className="text-gray-500" /> {formattedDate}
                      </span>
                      {isToday && (
                        <span className="badge badge-brand text-[10px] font-bold py-0.5 px-2">
                          Today&apos;s Devotional ✨
                        </span>
                      )}
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        📖 {dev.theme_scripture}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold font-display text-gray-900">{dev.title}</h2>

                    {dev.scripture_text && (
                      <blockquote className="text-xs italic text-gray-600 bg-gray-50 p-2.5 rounded-lg border-l-2 border-indigo-500">
                        &quot;{dev.scripture_text}&quot;
                      </blockquote>
                    )}

                    <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {dev.content}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
                      {dev.confession && (
                        <div className="bg-amber-50/70 border border-amber-200 p-2 rounded-lg text-amber-950">
                          <strong className="text-amber-800">Faith Declaration:</strong> {dev.confession}
                        </div>
                      )}
                      {dev.prayer_point && (
                        <div className="bg-rose-50/70 border border-rose-200 p-2 rounded-lg text-rose-950">
                          <strong className="text-rose-800">Prayer Point:</strong> {dev.prayer_point}
                        </div>
                      )}
                    </div>

                    {dev.bible_reading_plan && (
                      <p className="text-xs text-gray-400 font-medium">
                        📚 Bible Reading Plan: <strong>{dev.bible_reading_plan}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex md:flex-col items-center justify-end gap-2 flex-shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => handleBroadcast(dev, 'whatsapp')}
                      disabled={broadcastingId === dev.id}
                      className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      title="Broadcast to active church members via WhatsApp"
                    >
                      {broadcastingId === dev.id ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                      <span>Broadcast WhatsApp</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(dev)}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                        title="Edit Devotional"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(dev.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Delete Devotional"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Devotional Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={form.id ? 'Edit Daily Devotional' : 'Schedule Daily Devotional'}
        size="lg"
        footer={<>
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={15} className="animate-spin" /> : 'Publish Devotional'}
          </button>
        </>}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Author / Ministry Voice</label>
              <input
                className="input"
                value={form.author}
                onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                placeholder="Senior Pastor, Pastoral Team..."
              />
            </div>
          </div>

          <div>
            <label className="label">Devotional Title *</label>
            <input
              className="input text-sm font-semibold"
              placeholder="e.g. Walking in Divine Favor and Grace"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Theme Scripture *</label>
              <input
                className="input text-sm"
                placeholder="e.g. Psalm 23:1-6 or Philippians 4:6-7"
                value={form.themeScripture}
                onChange={e => setForm(f => ({ ...f, themeScripture: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Today&apos;s Bible in a Year Reading</label>
              <input
                className="input text-sm"
                placeholder="e.g. Genesis 1-3, Matthew 1"
                value={form.bibleReadingPlan}
                onChange={e => setForm(f => ({ ...f, bibleReadingPlan: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Scripture Passage Text</label>
            <textarea
              className="input min-h-[60px] text-xs italic"
              placeholder="Quote the full Bible verse here..."
              value={form.scriptureText}
              onChange={e => setForm(f => ({ ...f, scriptureText: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Devotional Reflection &amp; Message *</label>
            <textarea
              className="input min-h-[140px] text-sm"
              placeholder="Share the biblical teaching and inspiration for today..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Faith Declaration / Confession</label>
              <textarea
                className="input min-h-[70px] text-xs"
                placeholder="e.g. I declare that goodness and mercy follow me all the days of my life..."
                value={form.confession}
                onChange={e => setForm(f => ({ ...f, confession: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Daily Prayer Point</label>
              <textarea
                className="input min-h-[70px] text-xs"
                placeholder="e.g. Father, lead me beside still waters and renew my soul today..."
                value={form.prayerPoint}
                onChange={e => setForm(f => ({ ...f, prayerPoint: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Automated Reminder Settings Modal */}
      <Modal
        open={settingsModal}
        onClose={() => setSettingsModal(false)}
        title="Automated Devotional Reminders Schedule"
        size="md"
        footer={<>
          <button onClick={() => setSettingsModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveSettings} disabled={savingSettings} className="btn-primary">
            {savingSettings ? <Loader2 size={14} className="animate-spin" /> : 'Save Schedule'}
          </button>
        </>}
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-indigo-950 text-sm">
              <input
                type="checkbox"
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                checked={settingsForm.enabled}
                onChange={e => setSettingsForm(f => ({ ...f, enabled: e.target.checked }))}
              />
              Enable Automated Daily Devotional Broadcast
            </label>
            <p className="text-xs text-indigo-800 mt-1 pl-6">
              When enabled, ChurchOS automatically delivers today&apos;s devotional to registered members every morning or night.
            </p>
          </div>

          {settingsForm.enabled && (
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="label">Delivery Window</label>
                <select
                  className="input"
                  value={settingsForm.schedule}
                  onChange={e => setSettingsForm(f => ({ ...f, schedule: e.target.value }))}
                >
                  <option value="morning">Morning Reminder (6:00 AM – 8:00 AM)</option>
                  <option value="night">Evening / Night Reminder (8:00 PM – 10:00 PM)</option>
                  <option value="both">Both Morning &amp; Night</option>
                </select>
              </div>

              <div>
                <label className="label">Broadcast Channels</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-brand-600"
                      checked={settingsForm.channels?.includes('whatsapp')}
                      onChange={e => {
                        const checked = e.target.checked;
                        setSettingsForm(f => ({
                          ...f,
                          channels: checked
                            ? [...new Set([...(f.channels || []), 'whatsapp'])]
                            : (f.channels || []).filter(c => c !== 'whatsapp')
                        }));
                      }}
                    />
                    <span>WhatsApp Broadcast (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-brand-600"
                      checked={settingsForm.channels?.includes('email')}
                      onChange={e => {
                        const checked = e.target.checked;
                        setSettingsForm(f => ({
                          ...f,
                          channels: checked
                            ? [...new Set([...(f.channels || []), 'email'])]
                            : (f.channels || []).filter(c => c !== 'email')
                        }));
                      }}
                    />
                    <span>Email Broadcast</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
