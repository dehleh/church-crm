import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, FileText, Ticket, Loader2, Send, CheckCircle,
  XCircle, Clock, AlertTriangle, FileSpreadsheet, RotateCcw, DollarSign,
  Eye, Edit3, HelpCircle, Check, Building, ArrowRight, ShieldAlert,
  ArrowUpRight, Landmark
} from 'lucide-react';
import { procurementAPI, departmentsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import CsvImportModal from '../components/ui/CsvImportModal';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const REQ_STATUSES = ['draft', 'submitted', 'approved', 'disputed', 'correction', 'disbursed', 'rejected'];
const PR_STATUSES = ['pending', 'reviewed', 'approved', 'purchased', 'rejected'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  disputed: 'bg-amber-50 text-amber-800 border-amber-200',
  correction: 'bg-purple-50 text-purple-700 border-purple-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  disbursed: 'bg-teal-50 text-teal-800 border-teal-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  reviewed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  purchased: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const fmtStatus = s => {
  if (s === 'correction') return 'Needs Correction';
  if (s === 'disbursed') return 'Disbursed / Paid';
  return s?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function Procurement() {
  const { user } = useAuth();
  const currency = (n) => formatCurrency(n, user?.currency);
  const currencySymbol = getCurrencySymbol(user?.currency);
  const [tab, setTab] = useState('requisitions');
  const [stats, setStats] = useState({});
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [importType, setImportType] = useState(null);
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
  const [reqForm, setReqForm] = useState({
    title: '', description: '', requisitionMonth: '', departmentId: '', notes: '',
    items: [{ name: '', quantity: 1, unitPrice: '' }]
  });

  // Action review modal (for dispute, return for correction, approve note)
  const [reviewAction, setReviewAction] = useState({ type: '', note: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Disbursement state
  const [disbursementForm, setDisbursementForm] = useState({
    paymentMethod: 'paystack',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    amount: '',
    notes: '',
  });
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [disbursing, setDisbursing] = useState(false);

  // Purchase request form
  const [prForm, setPrForm] = useState({
    title: '', description: '', vendorName: '', priority: 'normal',
    items: [{ name: '', quantity: 1, unitPrice: '' }]
  });
  const [prReviewForm, setPrReviewForm] = useState({ status: '', reviewNotes: '' });

  const fetchStats = async () => {
    try { const { data } = await procurementAPI.stats(); setStats(data.data || {}); } catch {}
  };
  const fetchDepts = async () => {
    try { const { data } = await departmentsAPI.list(); setDepartments(data.data || []); } catch {}
  };
  const fetchBanks = async () => {
    try { const { data } = await procurementAPI.banks(); setBanks(data.data || []); } catch {}
  };

  const fetchRequisitions = useCallback(async () => {
    try {
      const params = { page: reqPage, limit: 20 };
      if (reqStatusFilter) params.status = reqStatusFilter;
      const { data } = await procurementAPI.requisitions(params);
      setRequisitions(data.data || []);
      setReqPagination(data.pagination || {});
    } catch {
      toast.error('Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  }, [reqPage, reqStatusFilter]);

  const fetchPurchaseRequests = useCallback(async () => {
    try {
      const params = { page: prPage, limit: 20 };
      if (prStatusFilter) params.status = prStatusFilter;
      const { data } = await procurementAPI.purchaseRequests(params);
      setPurchaseRequests(data.data || []);
      setPrPagination(data.pagination || {});
    } catch {
      toast.error('Failed to load purchase requests');
    }
  }, [prPage, prStatusFilter]);

  useEffect(() => {
    fetchStats();
    fetchDepts();
    fetchBanks();
  }, []);

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
  const calcTotal = (items) => (items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

  // ── Requisition Handlers ──
  const handleSaveRequisition = async (submitDirectly = false) => {
    if (!reqForm.title || !reqForm.requisitionMonth) return toast.error('Title and month are required');
    const validItems = (reqForm.items || []).filter(i => i.name?.trim());
    if (validItems.length === 0) return toast.error('Add at least one item');

    const totalAmount = calcTotal(validItems);
    try {
      if (reqForm.id) {
        // Edit existing requisition (correction or draft)
        await procurementAPI.updateRequisition(reqForm.id, {
          title: reqForm.title,
          description: reqForm.description,
          requisitionMonth: reqForm.requisitionMonth,
          departmentId: reqForm.departmentId || null,
          notes: reqForm.notes,
          items: validItems,
          totalAmount,
          status: submitDirectly ? 'submitted' : undefined,
        });
        toast.success(submitDirectly ? 'Requisition resubmitted for approval' : 'Requisition updated');
      } else {
        // Create new
        await procurementAPI.createRequisition({
          ...reqForm,
          totalAmount,
          items: validItems,
          status: submitDirectly ? 'submitted' : 'draft',
        });
        toast.success(submitDirectly ? 'Requisition created and submitted' : 'Requisition created');
      }
      setModal(null);
      fetchRequisitions();
      fetchStats();
    } catch {
      toast.error('Failed to save requisition');
    }
  };

  const handleSubmitRequisition = async (req) => {
    try {
      await procurementAPI.updateRequisition(req.id, { status: 'submitted' });
      toast.success('Requisition submitted for approval');
      fetchRequisitions(); fetchStats();
    } catch { toast.error('Failed to submit'); }
  };

  const openActionModal = (req, type) => {
    setSelected(req);
    setReviewAction({ type, note: '' });
    setModal('actionReq');
  };

  const handleConfirmAction = async () => {
    if (!selected) return;
    const { type, note } = reviewAction;
    if ((type === 'dispute' || type === 'correction') && !note.trim()) {
      return toast.error(`Please provide a reason / instruction for ${type === 'dispute' ? 'dispute' : 'correction'}`);
    }

    setSubmittingAction(true);
    try {
      let status = '';
      const payload = {};
      if (type === 'approve') {
        status = 'approved';
        payload.approvalNotes = note || 'Approved';
      } else if (type === 'dispute') {
        status = 'disputed';
        payload.disputeReason = note;
      } else if (type === 'correction') {
        status = 'correction';
        payload.correctionNotes = note;
      } else if (type === 'reject') {
        status = 'rejected';
        payload.notes = note || 'Rejected';
      }

      await procurementAPI.updateRequisition(selected.id, { status, ...payload });
      toast.success(`Requisition updated: ${fmtStatus(status)}`);
      setModal(null);
      setSelected(null);
      fetchRequisitions();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update requisition');
    } finally {
      setSubmittingAction(false);
    }
  };

  const openEditRequisition = (req) => {
    const monthStr = req.requisition_month ? format(new Date(req.requisition_month), 'yyyy-MM') : isCurrentMonth();
    setReqForm({
      id: req.id,
      title: req.title || '',
      description: req.description || '',
      requisitionMonth: monthStr + '-01',
      departmentId: req.department_id || '',
      notes: req.notes || '',
      items: Array.isArray(req.items) && req.items.length > 0 ? req.items : [{ name: '', quantity: 1, unitPrice: '' }],
    });
    setModal('editReq');
  };

  const openDisbursement = (req) => {
    setSelected(req);
    setDisbursementForm({
      paymentMethod: 'paystack',
      bankCode: '',
      bankName: '',
      accountNumber: '',
      accountName: '',
      amount: req.total_amount || '',
      notes: `Requisition disbursement for ${req.title}`,
    });
    fetchBanks();
    setModal('disburseReq');
  };

  const handleVerifyAccount = async () => {
    if (!disbursementForm.accountNumber || !disbursementForm.bankCode) {
      return toast.error('Enter 10-digit account number and select a bank');
    }
    setVerifyingAccount(true);
    try {
      const res = await procurementAPI.resolveAccount({
        accountNumber: disbursementForm.accountNumber,
        bankCode: disbursementForm.bankCode,
      });
      if (res.data?.accountName) {
        setDisbursementForm(f => ({ ...f, accountName: res.data.accountName }));
        toast.success(`Verified: ${res.data.accountName}`);
      } else {
        toast(res.data?.message || 'Verification unavailable. You can enter account name manually.', { icon: 'ℹ️' });
      }
    } catch {
      toast.error('Could not verify account name. Enter manually.');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleConfirmDisbursement = async () => {
    if (!selected) return;
    const amountNum = Number(disbursementForm.amount);
    if (!amountNum || amountNum <= 0) return toast.error('Valid disbursement amount is required');

    if (disbursementForm.paymentMethod === 'paystack') {
      if (!disbursementForm.accountNumber || !disbursementForm.bankCode) {
        return toast.error('Bank selection and account number are required for transfer');
      }
    }

    setDisbursing(true);
    try {
      const payload = {
        paymentMethod: disbursementForm.paymentMethod,
        amount: amountNum,
        notes: disbursementForm.notes,
        beneficiary: {
          bankCode: disbursementForm.bankCode,
          bankName: disbursementForm.bankName || banks.find(b => b.code === disbursementForm.bankCode)?.name || '',
          accountNumber: disbursementForm.accountNumber,
          accountName: disbursementForm.accountName,
        },
      };

      const res = await procurementAPI.disburseRequisition(selected.id, payload);
      toast.success(res.data?.message || 'Funds disbursed and ledger recorded!');
      setModal(null);
      setSelected(null);
      fetchRequisitions();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Disbursement failed');
    } finally {
      setDisbursing(false);
    }
  };

  // ── PR Handlers ──
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
      await procurementAPI.reviewPurchaseRequest(selected.id, {
        status: prReviewForm.status || undefined,
        reviewNotes: prReviewForm.reviewNotes || undefined
      });
      toast.success('Purchase request updated');
      setModal(null);
      fetchPurchaseRequests(); fetchStats();
    } catch { toast.error('Failed to update'); }
  };

  const openReviewPR = (pr) => {
    setSelected(pr);
    setPrReviewForm({ status: pr.status, reviewNotes: pr.review_notes || '' });
    setModal('reviewPR');
  };

  const canApprove = ['head_pastor', 'pastor', 'director', 'finance', 'accountant', 'admin'].includes(user?.role);
  const isCurrentMonth = () => format(new Date(), 'yyyy-MM');

  // ── Items Editor Component ──
  const ItemsEditor = ({ items, form, setForm }) => (
    <div className="space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Breakdown</label>
        <button type="button" onClick={() => addItem(setForm)} className="text-xs text-brand-600 hover:underline font-medium">+ Add Item</button>
      </div>
      {(items || []).map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <input placeholder="Item name" value={item.name} onChange={e => updateItem(form, setForm, idx, 'name', e.target.value)} className="input text-sm flex-1" />
          <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(form, setForm, idx, 'quantity', e.target.value)} className="input text-sm w-16" min={1} />
          <input type="number" placeholder="Unit price" value={item.unitPrice} onChange={e => updateItem(form, setForm, idx, 'unitPrice', e.target.value)} className="input text-sm w-28" />
          <span className="text-xs text-gray-500 w-24 pt-2.5 text-right font-medium">{currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
          {(items.length > 1) && (
            <button type="button" onClick={() => removeItem(setForm, idx)} className="text-red-400 hover:text-red-600 pt-2 text-sm px-1">✕</button>
          )}
        </div>
      ))}
      <div className="text-right text-sm font-bold text-gray-800 pt-2 border-t border-gray-200">
        Estimated Total: {currency(calcTotal(items))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-brand-600" size={28} /> Procurement & Requisitions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Multi-stage approvals, dispute resolution, corrections, and disbursements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportType(tab === 'requisitions' ? 'requisitions' : 'purchaseRequests')} className="btn-secondary flex items-center gap-1.5"><FileSpreadsheet size={16} /> Import CSV</button>
          <button onClick={() => { setReqForm({ title: '', description: '', requisitionMonth: isCurrentMonth() + '-01', departmentId: '', notes: '', items: [{ name: '', quantity: 1, unitPrice: '' }] }); setModal('addReq'); }} className="btn-secondary flex items-center gap-2"><FileText size={16} /> New Requisition</button>
          <button onClick={() => { setPrForm({ title: '', description: '', vendorName: '', priority: 'normal', items: [{ name: '', quantity: 1, unitPrice: '' }] }); setModal('addPR'); }} className="btn-primary flex items-center gap-2"><Ticket size={16} /> Raise Purchase Request</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Requisitions', value: stats.total_requisitions || 0, color: 'text-brand-600' },
          { label: 'Pending Review', value: stats.pending_requisitions || 0, color: 'text-yellow-600' },
          { label: 'Disbursed Payouts', value: stats.disbursed_requisitions || 0, sub: currency(stats.disbursed_amount), color: 'text-teal-700' },
          { label: 'Approved Tickets', value: stats.total_purchase_requests || 0, color: 'text-blue-600' },
          { label: 'Approved Amount', value: currency(stats.approved_amount), color: 'text-emerald-600', raw: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={clsx('text-2xl font-bold', s.color)}>{s.raw ? s.value : s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            {s.sub && <div className="text-[11px] font-medium text-teal-800 mt-0.5">{s.sub} total</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('requisitions')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'requisitions' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <span className="flex items-center gap-1.5"><FileText size={14} /> Monthly Requisitions</span>
        </button>
        <button onClick={() => setTab('purchase-requests')} className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', tab === 'purchase-requests' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          <span className="flex items-center gap-1.5"><Ticket size={14} /> Purchase Requests</span>
        </button>
      </div>

      {/* ── REQUISITIONS TAB ── */}
      {tab === 'requisitions' && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={reqStatusFilter} onChange={e => { setReqStatusFilter(e.target.value); setReqPage(1); }} className="input w-44 text-sm">
                <option value="">All Statuses</option>
                {REQ_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
            <span className="text-xs text-gray-400 font-medium">{reqPagination.total || requisitions.length} requisitions recorded</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 py-3">Title & Details</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Unit / Dept</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Raised By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requisitions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center text-gray-400">
                        <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                        No requisitions matching filter.
                      </td>
                    </tr>
                  )}
                  {requisitions.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{r.title}</div>
                        {r.dispute_reason && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1 border border-amber-200">
                            <ShieldAlert size={11} /> Dispute: {r.dispute_reason}
                          </div>
                        )}
                        {r.correction_notes && (
                          <div className="text-[11px] text-purple-700 bg-purple-50 rounded px-1.5 py-0.5 mt-1 inline-flex items-center gap-1 border border-purple-200">
                            <RotateCcw size={11} /> Correction: {r.correction_notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.requisition_month ? format(new Date(r.requisition_month), 'MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.department_name || 'General'}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {currency(r.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {r.raised_by_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border', STATUS_COLORS[r.status])}>
                          {fmtStatus(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details view */}
                          <button
                            onClick={() => { setSelected(r); setModal('viewReq'); }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Requisition"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Draft state: Submit or edit */}
                          {r.status === 'draft' && (
                            <>
                              <button
                                onClick={() => openEditRequisition(r)}
                                className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSubmitRequisition(r)}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center gap-1 shadow-sm"
                              >
                                <Send size={11} /> Submit
                              </button>
                            </>
                          )}

                          {/* Needs Correction: Edit & Resubmit */}
                          {r.status === 'correction' && (
                            <button
                              onClick={() => openEditRequisition(r)}
                              className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1"
                            >
                              <Edit3 size={12} /> Correct & Resubmit
                            </button>
                          )}

                          {/* Submitted: Approver can Approve, Dispute, Return for correction */}
                          {r.status === 'submitted' && canApprove && (
                            <>
                              <button
                                onClick={() => openActionModal(r, 'approve')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => openActionModal(r, 'dispute')}
                                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1"
                              >
                                <ShieldAlert size={12} /> Dispute
                              </button>
                              <button
                                onClick={() => openActionModal(r, 'correction')}
                                className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1"
                              >
                                <RotateCcw size={12} /> Correction
                              </button>
                            </>
                          )}

                          {/* Disputed: Approvers can resolve or return for correction */}
                          {r.status === 'disputed' && canApprove && (
                            <>
                              <button
                                onClick={() => openActionModal(r, 'approve')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                              >
                                Resolve & Approve
                              </button>
                              <button
                                onClick={() => openActionModal(r, 'correction')}
                                className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg"
                              >
                                Send for Correction
                              </button>
                            </>
                          )}

                          {/* Approved: Approver/Finance can DISBURSE FUNDS */}
                          {r.status === 'approved' && canApprove && (
                            <button
                              onClick={() => openDisbursement(r)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-sm"
                            >
                              <DollarSign size={13} /> Disburse Funds
                            </button>
                          )}

                          {/* Disbursed: View Receipt */}
                          {r.status === 'disbursed' && (
                            <button
                              onClick={() => { setSelected(r); setModal('viewReceipt'); }}
                              className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1"
                            >
                              <Check size={12} /> Payout Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reqPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
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
            <select value={prStatusFilter} onChange={e => { setPrStatusFilter(e.target.value); setPrPage(1); }} className="input w-40 text-sm">
              <option value="">All Statuses</option>
              {PR_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Raised By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchaseRequests.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No purchase requests found</td></tr>}
                  {purchaseRequests.map(pr => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {pr.title}
                        {pr.requisition_title && <div className="text-xs text-gray-400">From: {pr.requisition_title}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{pr.vendor_name || '—'}</td>
                      <td className="px-4 py-3 font-semibold">{currency(pr.total_amount)}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[pr.priority])}>{fmtStatus(pr.priority)}</span></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{pr.raised_by_name}</td>
                      <td className="px-4 py-3"><span className={clsx('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[pr.status])}>{fmtStatus(pr.status)}</span></td>
                      <td className="px-4 py-3">
                        {canApprove && pr.status !== 'purchased' && pr.status !== 'rejected' && (
                          <button onClick={() => openReviewPR(pr)} className="text-xs text-brand-600 hover:underline">Review</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CREATE / EDIT REQUISITION MODAL ── */}
      {(modal === 'addReq' || modal === 'editReq') && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title={modal === 'editReq' ? 'Edit Requisition' : 'New Monthly Requisition'}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleSaveRequisition(false)} className="btn-secondary">Save Draft</button>
              <button onClick={() => handleSaveRequisition(true)} className="btn-primary flex items-center gap-1.5">
                <Send size={14} /> Submit Requisition
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input value={reqForm.title} onChange={e => setReqForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Choir Sound Accessories & Uniforms" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Target Month *</label>
                <input
                  type="month"
                  value={reqForm.requisitionMonth ? reqForm.requisitionMonth.slice(0, 7) : isCurrentMonth()}
                  onChange={e => setReqForm(f => ({ ...f, requisitionMonth: e.target.value + '-01' }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Department / Unit</label>
                <select value={reqForm.departmentId} onChange={e => setReqForm(f => ({ ...f, departmentId: e.target.value }))} className="input">
                  <option value="">General Church-Wide</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description & Purpose</label>
              <textarea value={reqForm.description} onChange={e => setReqForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} placeholder="Explain justification and details..." />
            </div>
            <ItemsEditor items={reqForm.items} form={reqForm} setForm={setReqForm} />
            <div>
              <label className="label">Notes / Instructions</label>
              <textarea value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={2} placeholder="Special instructions for approvers or vendor suggestions..." />
            </div>
          </div>
        </Modal>
      )}

      {/* ── APPROVER WORKFLOW MODAL (APPROVE / DISPUTE / RETURN FOR CORRECTION) ── */}
      {modal === 'actionReq' && selected && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title={`Requisition Action: ${fmtStatus(reviewAction.type)}`}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary" disabled={submittingAction}>Cancel</button>
              <button
                onClick={handleConfirmAction}
                disabled={submittingAction}
                className={clsx(
                  'px-4 py-2 text-white text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors',
                  reviewAction.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  reviewAction.type === 'dispute' ? 'bg-amber-600 hover:bg-amber-700' :
                  reviewAction.type === 'correction' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-rose-600 hover:bg-rose-700'
                )}
              >
                {submittingAction && <Loader2 size={14} className="animate-spin" />}
                Confirm {fmtStatus(reviewAction.type)}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <div className="font-semibold text-gray-900">{selected.title}</div>
              <div className="text-gray-500 mt-0.5">Amount: <strong className="text-gray-900">{currency(selected.total_amount)}</strong> · Raised by: {selected.raised_by_name}</div>
            </div>

            {reviewAction.type === 'approve' && (
              <div>
                <label className="label">Approval Remarks (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Approved as per quarterly budget allocation..."
                  value={reviewAction.note}
                  onChange={e => setReviewAction(a => ({ ...a, note: e.target.value }))}
                />
              </div>
            )}

            {reviewAction.type === 'dispute' && (
              <div>
                <label className="label text-amber-900">Reason for Dispute *</label>
                <textarea
                  className="input border-amber-300 focus:border-amber-500"
                  rows={3}
                  placeholder="Detail why this requisition is contested (e.g. quote exceeds allocated threshold, duplicate items, vendor inquiry)..."
                  value={reviewAction.note}
                  onChange={e => setReviewAction(a => ({ ...a, note: e.target.value }))}
                />
                <p className="text-xs text-amber-700 mt-1">This will pause the requisition and notify the department lead of the dispute.</p>
              </div>
            )}

            {reviewAction.type === 'correction' && (
              <div>
                <label className="label text-purple-900">Required Corrections & Instructions *</label>
                <textarea
                  className="input border-purple-300 focus:border-purple-500"
                  rows={3}
                  placeholder="Detail exactly what the requester should fix before re-submitting (e.g. reduce microphone quantity to 2, attach updated invoice)..."
                  value={reviewAction.note}
                  onChange={e => setReviewAction(a => ({ ...a, note: e.target.value }))}
                />
                <p className="text-xs text-purple-700 mt-1">The requester will be able to edit items/pricing and re-submit for review.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── DISBURSEMENT / PAYMENT INTEGRATION MODAL ── */}
      {modal === 'disburseReq' && selected && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title="Disburse Requisition Funds"
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary" disabled={disbursing}>Cancel</button>
              <button
                onClick={handleConfirmDisbursement}
                disabled={disbursing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {disbursing ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
                Confirm & Disburse Funds
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-sm flex items-start gap-3">
              <Landmark className="text-emerald-700 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-emerald-950">Approved Requisition: {selected.title}</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Amount: <strong className="text-emerald-950">{currency(selected.total_amount)}</strong> · Department: {selected.department_name || 'General'}
                </p>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="label">Disbursement Channel / Integration</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'paystack', label: 'Paystack Transfer', desc: 'Online Payout' },
                  { id: 'bank_transfer', label: 'Bank Transfer', desc: 'Manual / Direct' },
                  { id: 'cash', label: 'Petty Cash', desc: 'Physical Cash' },
                  { id: 'cheque', label: 'Cheque', desc: 'Bank Cheque' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDisbursementForm(f => ({ ...f, paymentMethod: m.id }))}
                    className={clsx(
                      'p-2.5 rounded-xl border text-left transition-all',
                      disbursementForm.paymentMethod === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 font-semibold'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    )}
                  >
                    <div className="text-xs">{m.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bank details if Transfer */}
            {(disbursementForm.paymentMethod === 'paystack' || disbursementForm.paymentMethod === 'bank_transfer') && (
              <div className="space-y-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">Beneficiary Banking Information</div>

                <div>
                  <label className="label text-xs">Beneficiary Bank *</label>
                  <select
                    className="input text-sm"
                    value={disbursementForm.bankCode}
                    onChange={e => {
                      const code = e.target.value;
                      const b = banks.find(item => item.code === code);
                      setDisbursementForm(f => ({ ...f, bankCode: code, bankName: b?.name || '' }));
                    }}
                  >
                    <option value="">Select Bank</option>
                    {banks.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Account Number *</label>
                    <div className="flex gap-2">
                      <input
                        className="input text-sm"
                        placeholder="0123456789"
                        maxLength={10}
                        value={disbursementForm.accountNumber}
                        onChange={e => setDisbursementForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyAccount}
                        disabled={verifyingAccount}
                        className="btn-secondary text-xs shrink-0 px-2.5"
                      >
                        {verifyingAccount ? <Loader2 size={13} className="animate-spin" /> : 'Verify'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Beneficiary Account Name *</label>
                    <input
                      className="input text-sm"
                      placeholder="Account holder name"
                      value={disbursementForm.accountName}
                      onChange={e => setDisbursementForm(f => ({ ...f, accountName: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Disbursement Amount ({currencySymbol.trim()}) *</label>
                <input
                  type="number"
                  className="input font-bold"
                  value={disbursementForm.amount}
                  onChange={e => setDisbursementForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Payment Reference</label>
                <input
                  className="input text-xs"
                  placeholder="Auto-generated if empty"
                  value={disbursementForm.reference || ''}
                  onChange={e => setDisbursementForm(f => ({ ...f, reference: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="label">Payment Memo / Narration</label>
              <input
                className="input text-sm"
                placeholder="Narration displayed on bank statement and financial ledger"
                value={disbursementForm.notes}
                onChange={e => setDisbursementForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <p className="text-[11px] text-gray-400">
              ℹ️ Executing this disbursement automatically logs a completed expense transaction in the church finance ledger.
            </p>
          </div>
        </Modal>
      )}

      {/* ── VIEW REQUISITION DETAIL MODAL ── */}
      {modal === 'viewReq' && selected && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title="Requisition Breakdown"
          footer={<button onClick={() => setModal(null)} className="btn-secondary">Close</button>}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{selected.title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Target Month: {selected.requisition_month ? format(new Date(selected.requisition_month), 'MMMM yyyy') : '—'} · Unit: {selected.department_name || 'General'}
                </p>
              </div>
              <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold border', STATUS_COLORS[selected.status])}>
                {fmtStatus(selected.status)}
              </span>
            </div>

            {selected.description && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Description</span>
                <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{selected.description}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Itemized Budget</span>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selected.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium text-gray-900">{item.name}</td>
                        <td className="p-2.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="p-2.5 text-right text-gray-600">{currency(item.unitPrice)}</td>
                        <td className="p-2.5 text-right font-semibold text-gray-900">
                          {currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right text-gray-700">Total Requested:</td>
                      <td className="p-2.5 text-right text-brand-600">{currency(selected.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Workflow audit trail */}
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-500 border-t border-gray-100">
              <div>Raised By: <strong className="text-gray-700">{selected.raised_by_name}</strong></div>
              {selected.approved_by_name && <div>Approved By: <strong className="text-gray-700">{selected.approved_by_name}</strong></div>}
              {selected.disputed_by_name && <div>Disputed By: <strong className="text-gray-700">{selected.disputed_by_name}</strong></div>}
              {selected.returned_by_name && <div>Returned By: <strong className="text-gray-700">{selected.returned_by_name}</strong></div>}
              {selected.disbursed_by_name && <div>Disbursed By: <strong className="text-gray-700">{selected.disbursed_by_name}</strong></div>}
            </div>
          </div>
        </Modal>
      )}

      {/* ── VIEW DISBURSEMENT RECEIPT MODAL ── */}
      {modal === 'viewReceipt' && selected && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title="Disbursement Payment Receipt"
          footer={<button onClick={() => setModal(null)} className="btn-secondary">Close</button>}
        >
          <div className="space-y-4">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-1">
              <CheckCircle className="text-teal-600 mx-auto" size={32} />
              <div className="text-lg font-bold text-teal-950">Funds Disbursed</div>
              <div className="text-2xl font-black text-teal-800">{currency(selected.disbursement_amount || selected.total_amount)}</div>
              <p className="text-xs text-teal-700">Requisition: {selected.title}</p>
            </div>

            <div className="space-y-2 text-xs text-gray-700 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Reference:</span>
                <span className="font-mono font-semibold">{selected.disbursement_reference || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Method:</span>
                <span className="font-medium capitalize">{selected.disbursement_method || 'transfer'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Date Paid:</span>
                <span>{selected.disbursed_at ? format(new Date(selected.disbursed_at), 'PPP p') : '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Authorized Disburser:</span>
                <span>{selected.disbursed_by_name || 'Finance Officer'}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REVIEW PURCHASE REQUEST MODAL ── */}
      {modal === 'reviewPR' && selected && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title="Review Purchase Request Ticket"
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReviewPR} className="btn-primary">Update Ticket</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Title</span><span className="font-medium">{selected.title}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-gray-900">{currency(selected.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vendor</span><span>{selected.vendor_name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Raised By</span><span>{selected.raised_by_name}</span></div>
            </div>

            <div>
              <label className="label">Status</label>
              <select value={prReviewForm.status} onChange={e => setPrReviewForm(f => ({ ...f, status: e.target.value }))} className="input">
                {PR_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Review Notes</label>
              <textarea value={prReviewForm.reviewNotes} onChange={e => setPrReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} className="input" rows={3} placeholder="Notes for the requester..." />
            </div>
          </div>
        </Modal>
      )}

      {/* ── CREATE PR MODAL ── */}
      {modal === 'addPR' && (
        <Modal
          open={true}
          onClose={() => setModal(null)}
          title="Raise Purchase Request"
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreatePR} className="btn-primary">Raise Ticket</button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input value={prForm.title} onChange={e => setPrForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Auditorium Sound System Speakers" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Vendor</label>
                <input value={prForm.vendorName} onChange={e => setPrForm(f => ({ ...f, vendorName: e.target.value }))} className="input" placeholder="Vendor / Supplier name" />
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={prForm.priority} onChange={e => setPrForm(f => ({ ...f, priority: e.target.value }))} className="input">
                  {PRIORITIES.map(p => <option key={p} value={p}>{fmtStatus(p)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={prForm.description} onChange={e => setPrForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} placeholder="Explain requirement..." />
            </div>
            <ItemsEditor items={prForm.items} form={prForm} setForm={setPrForm} />
          </div>
        </Modal>
      )}

      <CsvImportModal
        open={importType === 'requisitions'}
        onClose={() => setImportType(null)}
        onComplete={() => fetchRequisitions()}
        entityType="requisitions"
        importFn={procurementAPI.importRequisitions}
      />
      <CsvImportModal
        open={importType === 'purchaseRequests'}
        onClose={() => setImportType(null)}
        onComplete={() => fetchPurchaseRequests()}
        entityType="purchaseRequests"
        importFn={procurementAPI.importPurchaseRequests}
      />
    </div>
  );
}
