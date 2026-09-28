import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, Plus, Users, MapPin, Phone, Mail, Crown, Loader2, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { branchesAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function Branches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try { const res = await branchesAPI.list(); setBranches(res.data.data); }
    catch { toast.error('Failed to load branches'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const onAddClick = () => {
    if (!user?.multiBranchEnabled && !user?.isWhitelisted && branches.length >= 1) {
      setModal('upgrade');
      return;
    }
    setForm({});
    setModal('add');
  };

  const handleSave = async () => {
    if (!form.name) return toast.error('Branch name required');
    setSaving(true);
    try {
      await branchesAPI.create(form);
      toast.success('Branch created!');
      setModal(null); fetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create branch');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Single Branch Upgrade Banner */}
      {!user?.multiBranchEnabled && !user?.isWhitelisted && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Single-Branch Mode Active</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Your church is currently configured as a single campus. To create multiple branch locations, assign campus pastors, and get multi-site metrics, upgrade to the Growth plan.
              </p>
            </div>
          </div>
          <Link
            to="/settings?tab=subscription"
            className="btn-primary text-xs px-3.5 py-1.5 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white border-none shadow-xs flex items-center gap-1.5"
          >
            Upgrade to Multi-Branch <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Branches & Campuses</h1>
          <p className="text-gray-500 text-sm mt-1">{branches.length} campus{branches.length !== 1 ? 'es' : ''} in your church network</p>
        </div>
        <button onClick={onAddClick} className="btn-primary">
          <Plus size={16} /> Add Branch
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${branch.is_headquarters ? 'bg-gold-400/20 text-gold-600' : 'bg-brand-50 text-brand-600'}`}>
                    <GitBranch size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                    {branch.code && <p className="text-xs text-gray-400 font-mono">{branch.code}</p>}
                  </div>
                </div>
                {branch.is_headquarters && (
                  <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-1 rounded-full">
                    <Crown size={10} /> HQ
                  </span>
                )}
              </div>

              <div className="space-y-1.5 mb-4">
                {branch.address && <p className="flex items-center gap-2 text-sm text-gray-500"><MapPin size={13} className="text-gray-400 flex-shrink-0" />{branch.city ? `${branch.address}, ${branch.city}` : branch.address}</p>}
                {branch.phone && <p className="flex items-center gap-2 text-sm text-gray-500"><Phone size={13} className="text-gray-400 flex-shrink-0" />{branch.phone}</p>}
                {branch.email && <p className="flex items-center gap-2 text-sm text-gray-500"><Mail size={13} className="text-gray-400 flex-shrink-0" />{branch.email}</p>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Users size={13} />{branch.member_count || 0} members</span>
                {branch.pastor_name && <span className="text-xs text-gray-400">Pastor: {branch.pastor_name}</span>}
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${branch.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add New Branch" size="md"
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Loader2 size={15} className="animate-spin" /> : 'Add Branch'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Branch Name *</label><input className="input" placeholder="Victoria Island Branch" value={form.name || ''} onChange={set('name')} /></div>
            <div><label className="label">Branch Code</label><input className="input" placeholder="VIB" value={form.code || ''} onChange={set('code')} /></div>
          </div>
          <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={form.city || ''} onChange={set('city')} /></div>
            <div><label className="label">State</label><input className="input" value={form.state || ''} onChange={set('state')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input type="tel" className="input" value={form.phone || ''} onChange={set('phone')} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email || ''} onChange={set('email')} /></div>
          </div>
          <div><label className="label">Pastor / Branch Head</label><input className="input" placeholder="Pastor James Okafor" value={form.pastorName || ''} onChange={set('pastorName')} /></div>
        </div>
      </Modal>

      {/* Upgrade Modal for Single Branch */}
      <Modal
        open={modal === 'upgrade'}
        onClose={() => setModal(null)}
        title="Multi-Branch Management"
        size="md"
        footer={(
          <>
            <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            <Link to="/settings?tab=subscription" className="btn-primary flex items-center gap-1.5">
              View Plans & Upgrade <ArrowRight size={14} />
            </Link>
          </>
        )}
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <GitBranch size={24} />
          </div>
          <h3 className="font-display font-bold text-gray-900 text-lg">Unlock Multi-Branch Network</h3>
          <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
            Your church is currently on the Single-Branch setup. Upgrading to the <strong>Growth Plan</strong> (₦600,000 / year — billed annually) unlocks up to 3 physical campuses, campus pastor delegation, and cross-site attendance.
          </p>
          <div className="mt-4 p-3.5 bg-gray-50 rounded-xl text-xs text-gray-600 border border-gray-100 text-left space-y-2">
            <div className="flex items-center gap-2 font-medium">✓ Up to 3 independent branch locations</div>
            <div className="flex items-center gap-2 font-medium">✓ Campus-scoped member rosters & event check-in</div>
            <div className="flex items-center gap-2 font-medium">✓ Branch-specific finance, tithes & offerings</div>
            <div className="flex items-center gap-2 font-medium">✓ Network-wide pastoral dashboard for General Overseers</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
