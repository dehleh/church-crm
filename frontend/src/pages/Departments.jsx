import { useState, useEffect } from 'react';
import { Building2, Plus, Users, ChevronRight, Loader2 } from 'lucide-react';
import { departmentsAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  ministry: 'bg-brand-50 text-brand-700', service: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-gray-100 text-gray-600', media: 'bg-purple-50 text-purple-700',
  music: 'bg-amber-50 text-amber-700', welfare: 'bg-pink-50 text-pink-700',
};

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await departmentsAPI.list();
      setDepartments(res.data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return toast.error('Department name is required');
    setSaving(true);
    try {
      await departmentsAPI.create(form);
      toast.success('Department created!');
      setModal(null); fetch();
    } catch { toast.error('Failed to create department'); }
    finally { setSaving(false); }
  };

  const grouped = departments.reduce((acc, d) => {
    const cat = d.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Departments & Units</h1>
          <p className="text-gray-500 text-sm mt-1">{departments.length} departments across the church</p>
        </div>
        <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary">
          <Plus size={16} /> New Department
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : departments.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No departments yet</p>
          <p className="text-gray-400 text-sm mb-4">Create departments like Choir, Ushering, Media, etc.</p>
          <button onClick={() => { setForm({}); setModal('add'); }} className="btn-primary inline-flex"><Plus size={15} /> New Department</button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, depts]) => (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 capitalize">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {depts.map(dept => (
                <div key={dept.id} className="card hover:shadow-card-hover transition-shadow cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{dept.name}</h3>
                      {dept.category && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${CATEGORY_COLORS[dept.category] || 'bg-gray-100 text-gray-600'}`}>
                          {dept.category}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors mt-0.5" />
                  </div>
                  {dept.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{dept.description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                      <Users size={14} />
                      <span>{dept.member_count || 0} members</span>
                    </div>
                    {dept.head_name && <p className="text-xs text-gray-400">Head: {dept.head_name}</p>}
                  </div>
                  {dept.branch_name && <p className="text-xs text-gray-400 mt-1">{dept.branch_name}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Create Department"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Create'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Department Name *</label><input className="input" placeholder="Choir, Ushering, Media Team…" value={form.name || ''} onChange={set('name')} /></div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category || ''} onChange={set('category')}>
              <option value="">Select category</option>
              {['ministry','service','admin','media','music','welfare'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div><label className="label">Meeting Schedule</label><input className="input" placeholder="Every Sunday, 8am" value={form.meetingSchedule || ''} onChange={set('meetingSchedule')} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-[80px]" value={form.description || ''} onChange={set('description')} /></div>
        </div>
      </Modal>
    </div>
  );
}
