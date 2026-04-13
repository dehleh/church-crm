import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, FileText, Ticket, Loader2, Send, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { procurementAPI, departmentsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import CsvImportModal from '../components/ui/CsvImportModal';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const REQ_STATUSES = ['draft', 'submitted', 'approved', 'rejected'];
const PR_STATUSES = ['pending', 'reviewed', 'approved', 'purchased', 'rejected'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600', submitted: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700', reviewed: 'bg-indigo-100 text-indigo-700',
  purchased: 'bg-emerald-100 text-emerald-700',
};
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
};
const currency = n => `₦${Number(n || 0).toLocaleString()}`;
const fmtStatus = s => s?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Procurement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requisitions');
  const [stats, setStats] = useState({});
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [importType, setImportType] = useState(null); // 'requisitions' | 'purchaseRequests' | null
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reqPage, setReqPage] = useState(1);
  const [prPage, setPrPage] = useState(1);
  const [reqPagination, setReqPagination] = useState({});
  const [prPagination, setPrPagination] = useState({});
  const [reqStatusFilter, setReqStatusFilter] = useState('');
  const [prStatusFilter, setPrStatusFilter] = useState('');

  // Requisition form
  const [reqForm, setReqForm] = useState({ title: '', description: '', requisitionMonth: '', departmentId: '', notes: '', items: [{ name: '', quantity: 1, unitPrice: '' }] });
  // Purchase request form
  const [prForm, setPrForm] = useState({ title: '', description: '', vendorName: '', priority: 'normal', items: [{ name: '', quantity: 1, unitPrice: '' }] });
  // Review form
  const [reviewForm, setReviewForm] = useState({ status: '', reviewNotes: '' });

  const fetchStats = async () => { try { const { data } = await procurementAPI.stats(); setStats(data.data || {}); } catch {} };
  const fetchDepts = async () => { try { const { data } = await departmentsAPI.list(); setDepartments(data.data || []); } catch {} };

  const fetchRequisitions = useCallback(async () => {
    try {
      const params = { page: reqPage, limit: 20 };
      if (reqStatusFilter) params.status = reqStatusFilter;
      const { data } = await procurementAPI.requisitions(params);
      setRequisitions(data.data || []);
      setReqPagination(data.pagination || {});
    } catch { toast.error('Failed to load requisitions'); }
    finally { setLoading(false); }
  }, [reqPage, reqStatusFilter]);

  const fetchPurchaseRequests = useCallback(async () => {
    try {
      const params = { page: prPage, limit: 20 };
      if (prStatusFilter) params.status = prStatusFilter;
      const { data } = await procurementAPI.purchaseRequests(params);
      setPurchaseRequests(data.data || []);
      setPrPagination(data.pagination || {});
    } catch { toast.error('Failed to load purchase requests'); }
  }, [prPage, prStatusFilter]);

  useEffect(() => { fetchStats(); fetchDepts(); }, []);
  useEffect(() => { fetchRequisitions(); }, [fetchRequisitions]);
  useEffect(() => { fetchPurchaseRequests(); }, [fetchPurchaseRequests]);

  // ── Items helpers ──
  const updateItem = (form, setForm, idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };
  const addItem = (setForm) => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: '' }] }));
  const removeItem = (setForm, idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const calcTotal = (items) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  // ── Handlers ──
  const handleCreateRequisition = async () => {
    if (!reqForm.title || !reqForm.requisitionMonth) return toast.error('Title and month are required');
    try {
      const totalAmount = calcTotal(reqForm.items);
      await procurementAPI.createRequisition({ ...reqForm, totalAmount, items: reqForm.items.filter(i => i.name) });
      toast.success('Requisition created');
      setModal(null);
      fetchRequisitions(); fetchStats();
    } catch { toast.error('Failed to create requisition'); }
  };

  const handleSubmitRequisition = async (req) => {
    try {
      await procurementAPI.updateRequisition(req.id, { status: 'submitted' });
      toast.success('Requisition submitted for approval');
      fetchRequisitions(); fetchStats();
    } catch { toast.error('Failed to submit'); }
  };

  const handleApproveRequisition = async (req, status) => {
    try {
      await procurementAPI.updateRequisition(req.id, { status });
      toast.success(`Requisition ${status}`);
      fetchRequisitions(); fetchStats();
    } catch { toast.error('Failed to update'); }
  };

  const handleCreatePR = async () => {
    if (!prForm.title) return toast.error('Title is required');
    const totalAmount = calcTotal(prForm.items);
    if (!totalAmount) return toast.error('Add at least one item with a price');
    try {
      await procurementAPI.createPurchaseRequest({ ...prForm, totalAmount, items: prForm.items.filter(i => i.name) });
      toast.success('Purchase request raised — finance will be notified');
      setModal(null);
      fetchPurchaseRequests(); fetchStats();
    } catch { toast.error('Failed to raise purchase request'); }
  };

  const handleReviewPR = async () => {
    if (!selected) return;
    try {
      await procurementAPI.reviewPurchaseRequest(selected.id, { status: reviewForm.status || undefined, reviewNotes: reviewForm.reviewNotes || undefined });
      toast.success('Purchase request updated');
      setModal(null);
      fetchPurchaseRequests(); fetchStats();
    } catch { toast.error('Failed to update'); }
  };

  const openReview = (pr) => {
    setSelected(pr);
    setReviewForm({ status: pr.status, reviewNotes: pr.review_notes || '' });
    setModal('reviewPR');
  };

  const canApprove = ['head_pastor', 'pastor', 'director'].includes(user?.role);
  const isCurrentMonth = () => format(new Date(), 'yyyy-MM');

  // ── Items Editor Component ──
  const ItemsEditor = ({ items, form, setForm }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Items</label>
        <button type="button" onClick={() => addItem(setForm)} className="text-xs text-brand-600 hover:underline">+ Add Item</button>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <input placeholder="Item name" value={item.name} onChange={e => updateItem(form, setForm, idx, 'name', e.target.value)} className="input-field flex-1 text-sm" />
          <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(form, setForm, idx, 'quantity', e.target.value)} className="input-field w-16 text-sm" min={1} />
          <input type="number" placeholder="Unit price" value={item.unitPrice} onChange={e => updateItem(form, setForm, idx, 'unitPrice', e.target.value)} className="input-field w-28 text-sm" />
          <span className="text-sm text-gray-500 w-24 pt-2 text-right">{currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
          {items.length > 1 && <button type="button" onClick={() => removeItem(setForm, idx)} className="text-red-400 hover:text-red-600 pt-2 text-sm">✕</button>}
        </div>
      ))}
      <div className="text-right text-sm font-semibold text-gray-700">Total: {currency(calcTotal(items))}</div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-brand-600" size={28} /> Procurement
          </h1>
          <p className="text-sm text-gray-500 mt-1">Requisitions & purchase requests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportType(tab === 'requisitions' ? 'requisitions' : 'purchaseRequests')} className="btn-secondary flex items-center gap-1.5"><FileSpreadsheet size={16} /> Import CSV</button>
          <button onClick={() => { setReqForm({ title: '', description: '', requisitionMonth: isCurrentMonth(), departmentId: '', notes: '', items: [{ name: '', quantity: 1, unitPrice: '' }] }); setModal('addReq'); }} className="btn-secondary flex items-center gap-2"><FileText size={16} /> New Requisition</button>
          <button onClick={() => { setPrForm({ title: '', description: '', vendorName: '', priority: 'normal', items: [{ name: '', quantity: 1, unitPrice: '' }] }); setModal('addPR'); }} className="btn-primary flex items-center gap-2"><Ticket size={16} /> Raise Purchase Request</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Requisitions', value: stats.total_requisitions || 0, color: 'text-brand-600' },
          { label: 'Pending Requisitions', value: stats.pending_requisitions || 0, color: 'text-yellow-600' },
          { label: 'Purchase Tickets', value: stats.total_purchase_requests || 0, color: 'text-blue-600' },
          { label: 'Pending Tickets', value: stats.pending_tickets || 0, color: 'text-orange-600' },
          { label: 'Approved Amount', value: currency(stats.approved_amount), color: 'text-green-600', raw: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.raw ? s.value : s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('requisitions')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'requisitions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <span className="flex items-center gap-1.5"><FileText size={14} /> Requisitions</span>
        </button>
        <button onClick={() => setTab('purchase-requests')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'purchase-requests' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <span className="flex items-center gap-1.5"><Ticket size={14} /> Purchase Requests</span>
        </button>
      </div>

      {/* ── REQUISITIONS TAB ── */}
      {tab === 'requisitions' && (
        <>
          <div className="flex gap-3">
            <select value={reqStatusFilter} onChange={e => { setReqStatusFilter(e.target.value); setReqPage(1); }} className="input-field w-40">
              <option value="">All Status</option>
              {REQ_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Raised By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {requisitions.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No requisitions found</td></tr>}
                  {requisitions.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                      <td className="px-4 py-3 text-gray-600">{r.requisition_month ? format(new Date(r.requisition_month), 'MMM yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.department_name || '—'}</td>
                      <td className="px-4 py-3 font-medium">{currency(r.total_amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{r.raised_by_name}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[r.status])}>{fmtStatus(r.status)}</span></td>
                      <td className="px-4 py-3 flex gap-1">
                        {r.status === 'draft' && (
                          <button onClick={() => handleSubmitRequisition(r)} className="text-xs text-brand-600 hover:underline flex items-center gap-1"><Send size={12} /> Submit</button>
                        )}
                        {r.status === 'submitted' && canApprove && (
                          <>
                            <button onClick={() => handleApproveRequisition(r, 'approved')} className="text-xs text-green-600 hover:underline flex items-center gap-1"><CheckCircle size={12} /> Approve</button>
                            <button onClick={() => handleApproveRequisition(r, 'rejected')} className="text-xs text-red-600 hover:underline flex items-center gap-1 ml-2"><XCircle size={12} /> Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reqPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
                <span>Page {reqPagination.page} of {reqPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={reqPage <= 1} onClick={() => setReqPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                  <button disabled={reqPage >= reqPagination.totalPages} onClick={() => setReqPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PURCHASE REQUESTS TAB ── */}
      {tab === 'purchase-requests' && (
        <>
          <div className="flex gap-3">
            <select value={prStatusFilter} onChange={e => { setPrStatusFilter(e.target.value); setPrPage(1); }} className="input-field w-40">
              <option value="">All Status</option>
              {PR_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Raised By</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {purchaseRequests.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No purchase requests found</td></tr>}
                  {purchaseRequests.map(pr => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {pr.title}
                        {pr.requisition_title && <div className="text-xs text-gray-400">From: {pr.requisition_title}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pr.vendor_name || '—'}</td>
                      <td className="px-4 py-3 font-medium">{currency(pr.total_amount)}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', PRIORITY_COLORS[pr.priority])}>{fmtStatus(pr.priority)}</span></td>
                      <td className="px-4 py-3 text-gray-600">{pr.raised_by_name}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[pr.status])}>{fmtStatus(pr.status)}</span></td>
                      <td className="px-4 py-3">
                        {canApprove && pr.status !== 'purchased' && pr.status !== 'rejected' && (
                          <button onClick={() => openReview(pr)} className="text-xs text-brand-600 hover:underline">Review</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {prPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
                <span>Page {prPagination.page} of {prPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={prPage <= 1} onClick={() => setPrPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-40">Prev</button>
                  <button disabled={prPage >= prPagination.totalPages} onClick={() => setPrPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CREATE REQUISITION MODAL ── */}
      {modal === 'addReq' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Monthly Requisition</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={reqForm.title} onChange={e => setReqForm(f => ({ ...f, title: e.target.value }))} className="input-field w-full" placeholder="e.g. April 2026 Office Supplies" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <input type="month" value={reqForm.requisitionMonth} onChange={e => setReqForm(f => ({ ...f, requisitionMonth: e.target.value + '-01' }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select value={reqForm.departmentId} onChange={e => setReqForm(f => ({ ...f, departmentId: e.target.value }))} className="input-field w-full">
                    <option value="">General</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} className="input-field w-full" rows={2} />
              </div>
              <ItemsEditor items={reqForm.items} form={reqForm} setForm={setReqForm} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} className="input-field w-full" rows={2} placeholder="Additional notes for approver..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateRequisition} className="btn-primary">Create Requisition</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE PURCHASE REQUEST MODAL ── */}
      {modal === 'addPR' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Raise Purchase Request</h2>
            <p className="text-sm text-gray-500 mb-4">This ticket will be sent to the finance team for review and approval.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={prForm.title} onChange={e => setPrForm(f => ({ ...f, title: e.target.value }))} className="input-field w-full" placeholder="e.g. Sound System Speakers" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input value={prForm.vendorName} onChange={e => setPrForm(f => ({ ...f, vendorName: e.target.value }))} className="input-field w-full" placeholder="Vendor/Supplier name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={prForm.priority} onChange={e => setPrForm(f => ({ ...f, priority: e.target.value }))} className="input-field w-full">
                    {PRIORITIES.map(p => <option key={p} value={p}>{fmtStatus(p)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={prForm.description} onChange={e => setPrForm(f => ({ ...f, description: e.target.value }))} className="input-field w-full" rows={2} placeholder="Describe what you need to purchase..." />
              </div>
              <ItemsEditor items={prForm.items} form={prForm} setForm={setPrForm} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreatePR} className="btn-primary">Raise Ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW PURCHASE REQUEST MODAL ── */}
      {modal === 'reviewPR' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Review Purchase Request</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium">{selected.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-medium">{currency(selected.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span>{selected.vendor_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[selected.priority])}>{fmtStatus(selected.priority)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Raised By</span><span>{selected.raised_by_name}</span></div>
              {selected.description && <div><span className="text-gray-500 block mb-1">Description</span><p className="text-gray-700">{selected.description}</p></div>}
              {selected.items && Array.isArray(selected.items) && selected.items.length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Items</span>
                  <div className="space-y-1">
                    {selected.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} className="input-field w-full">
                  {PR_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
                <textarea value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} className="input-field w-full" rows={3} placeholder="Notes for the requester..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReviewPR} className="btn-primary">Update</button>
            </div>
          </div>
        </div>
      )}

      <CsvImportModal
        open={importType === 'requisitions'}
        onClose={() => setImportType(null)}
        onComplete={() => fetchAll()}
        entityType="requisitions"
        importFn={procurementAPI.importRequisitions}
      />
      <CsvImportModal
        open={importType === 'purchaseRequests'}
        onClose={() => setImportType(null)}
        onComplete={() => fetchAll()}
        entityType="purchaseRequests"
        importFn={procurementAPI.importPurchaseRequests}
      />
    </div>
  );
}
