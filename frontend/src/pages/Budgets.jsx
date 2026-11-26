import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PiggyBank, Plus, Loader2, TrendingUp, ClipboardList, Building2,
  CheckCircle2, Clock, XCircle, AlertCircle, FileText, ChevronRight,
  Eye, Edit2, Trash2, Check, ArrowRight, DollarSign, Layers, Filter,
  Sparkles, MessageSquare, ShieldCheck, Calendar, RefreshCw
} from 'lucide-react';
import { budgetsAPI, departmentsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const ITEM_CATEGORIES = [
  { id: 'equipment', label: 'Equipment & Hardware' },
  { id: 'operational', label: 'Operational & Supplies' },
  { id: 'events', label: 'Events & Programs' },
  { id: 'training', label: 'Training, Retreat & Capacity' },
  { id: 'welfare', label: 'Welfare & Member Care' },
  { id: 'media_sound', label: 'Media, Sound & Tech' },
  { id: 'honorarium', label: 'Honorarium & Guest Ministers' },
  { id: 'printing', label: 'Printing & Publications' },
  { id: 'transport', label: 'Transport & Logistics' },
  { id: 'repairs', label: 'Repairs & Maintenance' },
  { id: 'utilities', label: 'Utilities & Subscriptions' },
  { id: 'other', label: 'Other Ministry Expense' },
];

const PERIOD_PRESETS = [
  { id: 'annual', label: 'Full Year (Annual)', detail: 'Full Year' },
  { id: 'half_year_h1', label: 'Half-Year H1 (Jan – Jun)', detail: 'H1 (Jan – Jun)' },
  { id: 'half_year_h2', label: 'Half-Year H2 (Jul – Dec)', detail: 'H2 (Jul – Dec)' },
  { id: 'quarterly_q1', label: 'Quarter 1 (Jan – Mar)', detail: 'Q1 (Jan – Mar)' },
  { id: 'quarterly_q2', label: 'Quarter 2 (Apr – Jun)', detail: 'Q2 (Apr – Jun)' },
  { id: 'quarterly_q3', label: 'Quarter 3 (Jul – Sep)', detail: 'Q3 (Jul – Sep)' },
  { id: 'quarterly_q4', label: 'Quarter 4 (Oct – Dec)', detail: 'Q4 (Oct – Dec)' },
  { id: 'monthly', label: 'Monthly Budget', detail: 'Monthly' },
  { id: 'project', label: 'Special Project / Event', detail: 'Project' },
];

const createBlankItem = () => ({
  id: Math.random().toString(36).substring(7),
  itemName: '',
  category: 'operational',
  description: '',
  quantity: 1,
  unitCost: '',
  totalAmount: '',
  priority: 'medium',
});

export default function Budgets() {
  const { user } = useAuth();
  const currency = (n) => formatCurrency(n, user?.currency);
  const currencySymbol = getCurrencySymbol(user?.currency);

  const isLeadership = ['admin', 'pastor', 'finance'].includes(user?.role);
  const isHOD = user?.role === 'hod';

  // Main State
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [searchParams] = useSearchParams();
  const urlDept = searchParams.get('dept');
  const [activeTab, setActiveTab] = useState(urlDept ? 'departmental' : 'all'); // 'all' | 'departmental' | 'churchwide' | 'pending'
  const [departmentFilter, setDepartmentFilter] = useState(urlDept || '');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (urlDept) {
      setDepartmentFilter(urlDept);
      setActiveTab('departmental');
    }
  }, [urlDept]);

  // Proposal Creation Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);

  // Proposal Form State
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    budgetType: isHOD ? 'department' : 'department', // 'department' | 'churchwide'
    departmentId: user?.department_id || '',
    name: '',
    periodTypePreset: 'annual',
    periodType: 'annual',
    periodDetail: `Full Year ${currentYear}`,
    fiscalYear: currentYear,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    notes: '',
    items: [createBlankItem()],
  });

  // Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Approval / Revision Modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);

  // Fetch Budgets & Summary
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (departmentFilter) params.departmentId = departmentFilter;
      if (periodFilter) params.periodType = periodFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const [budgetsRes, summaryRes, deptsRes] = await Promise.all([
        budgetsAPI.list(params),
        budgetsAPI.summary(),
        departmentsAPI.list().catch(() => ({ data: { data: [] } })),
      ]);

      setBudgets(budgetsRes.data?.data || []);
      setSummary(summaryRes.data?.data || null);
      setDepartments(deptsRes.data?.data || []);
    } catch {
      toast.error('Failed to load budgets and financial data');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, periodFilter, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Preset Timeframe Change
  const handlePeriodPresetChange = (presetId, year = form.fiscalYear) => {
    const yr = year || currentYear;
    let startDate = `${yr}-01-01`;
    let endDate = `${yr}-12-31`;
    let periodType = 'annual';
    let periodDetail = `Full Year ${yr}`;

    switch (presetId) {
      case 'annual':
        startDate = `${yr}-01-01`;
        endDate = `${yr}-12-31`;
        periodType = 'annual';
        periodDetail = `Full Year ${yr}`;
        break;
      case 'half_year_h1':
        startDate = `${yr}-01-01`;
        endDate = `${yr}-06-30`;
        periodType = 'half_year';
        periodDetail = `H1 (Jan – Jun ${yr})`;
        break;
      case 'half_year_h2':
        startDate = `${yr}-07-01`;
        endDate = `${yr}-12-31`;
        periodType = 'half_year';
        periodDetail = `H2 (Jul – Dec ${yr})`;
        break;
      case 'quarterly_q1':
        startDate = `${yr}-01-01`;
        endDate = `${yr}-03-31`;
        periodType = 'quarterly';
        periodDetail = `Q1 (Jan – Mar ${yr})`;
        break;
      case 'quarterly_q2':
        startDate = `${yr}-04-01`;
        endDate = `${yr}-06-30`;
        periodType = 'quarterly';
        periodDetail = `Q2 (Apr – Jun ${yr})`;
        break;
      case 'quarterly_q3':
        startDate = `${yr}-07-01`;
        endDate = `${yr}-09-30`;
        periodType = 'quarterly';
        periodDetail = `Q3 (Jul – Sep ${yr})`;
        break;
      case 'quarterly_q4':
        startDate = `${yr}-10-01`;
        endDate = `${yr}-12-31`;
        periodType = 'quarterly';
        periodDetail = `Q4 (Oct – Dec ${yr})`;
        break;
      case 'monthly':
        periodType = 'monthly';
        periodDetail = `Monthly Plan (${yr})`;
        break;
      case 'project':
        periodType = 'project';
        periodDetail = 'Project / Special Event';
        break;
      default:
        break;
    }

    setForm(prev => {
      // Auto-suggest budget name if not customized
      const dept = departments.find(d => d.id === prev.departmentId);
      const deptName = dept ? dept.name : (prev.budgetType === 'churchwide' ? 'Church-Wide' : 'Department');
      const suggestedName = `${deptName} ${periodDetail} Budget`;

      return {
        ...prev,
        periodTypePreset: presetId,
        periodType,
        periodDetail,
        startDate,
        endDate,
        name: prev.name && !prev.name.includes('Budget') ? prev.name : suggestedName,
      };
    });
  };

  // Open Create Modal
  const openCreateModal = (type = 'department', preselectedDeptId = '') => {
    setEditingBudgetId(null);
    const yr = currentYear;
    const initialDeptId = preselectedDeptId || (user?.department_id || '');
    const dept = departments.find(d => d.id === initialDeptId);
    const defaultName = dept ? `${dept.name} ${yr} Budget` : `Church-Wide ${yr} Annual Budget`;

    setForm({
      budgetType: type,
      departmentId: initialDeptId,
      name: defaultName,
      periodTypePreset: 'annual',
      periodType: 'annual',
      periodDetail: `Full Year ${yr}`,
      fiscalYear: yr,
      startDate: `${yr}-01-01`,
      endDate: `${yr}-12-31`,
      notes: '',
      items: [createBlankItem()],
    });
    setModalOpen(true);
  };

  // Line Item Handlers
  const handleItemChange = (index, field, value) => {
    setForm(prev => {
      const nextItems = [...prev.items];
      const item = { ...nextItems[index], [field]: value };

      if (field === 'quantity' || field === 'unitCost') {
        const qty = Number(field === 'quantity' ? value : item.quantity) || 1;
        const unit = Number(field === 'unitCost' ? value : item.unitCost) || 0;
        item.totalAmount = qty * unit;
      }

      nextItems[index] = item;
      return { ...prev, items: nextItems };
    });
  };

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, createBlankItem()],
    }));
  };

  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) {
      return toast.error('Budget must contain at least one line item');
    }
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Running Total of all line items
  const totalItemsSum = useMemo(() => {
    return form.items.reduce((acc, item) => {
      const total = Number(item.totalAmount) || (Number(item.quantity || 1) * Number(item.unitCost || 0));
      return acc + (isNaN(total) ? 0 : total);
    }, 0);
  }, [form.items]);

  // Save or Submit Budget
  const handleSaveBudget = async (status = 'draft') => {
    if (!form.name.trim()) return toast.error('Please enter a budget name');
    if (!form.startDate || !form.endDate) return toast.error('Please select valid start and end dates');
    if (form.budgetType === 'department' && !form.departmentId) {
      return toast.error('Please select the department raising this budget');
    }

    // Verify at least one item has a name and amount
    const validItems = form.items.filter(i => i.itemName.trim().length > 0);
    if (validItems.length === 0) {
      return toast.error('Please add at least one line item describing what this budget is for');
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        departmentId: form.budgetType === 'department' ? form.departmentId : null,
        periodType: form.periodType,
        periodDetail: form.periodDetail,
        fiscalYear: form.fiscalYear,
        startDate: form.startDate,
        endDate: form.endDate,
        totalAmount: totalItemsSum,
        notes: form.notes,
        status: status, // 'draft' or 'submitted' or 'approved'
        items: validItems.map(item => ({
          itemName: item.itemName.trim(),
          category: item.category,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unitCost: Number(item.unitCost) || 0,
          totalAmount: Number(item.totalAmount) || ((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)),
          priority: item.priority || 'medium',
        })),
      };

      if (editingBudgetId) {
        await budgetsAPI.update(editingBudgetId, payload);
        toast.success('Budget proposal updated successfully!');
      } else {
        const res = await budgetsAPI.create(payload);
        toast.success(res.data?.message || 'Budget saved successfully!');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  // Open Details Modal
  const openBudgetDetails = async (budget) => {
    setSelectedBudget(budget);
    setDetailModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await budgetsAPI.get(budget.id);
      setSelectedBudget(res.data?.data || budget);
    } catch {
      toast.error('Failed to load itemized details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Approval Modal
  const openApprovalModal = (budget, action) => {
    setSelectedBudget(budget);
    setApprovalAction(action);
    setReviewRemarks('');
    setApprovalModalOpen(true);
  };

  // Submit Approval or Rejection
  const handleConfirmApproval = async () => {
    if (!selectedBudget) return;
    if (approvalAction === 'reject' && !reviewRemarks.trim()) {
      return toast.error('Please provide a reason or revision note');
    }

    setProcessingApproval(true);
    try {
      if (approvalAction === 'approve') {
        const res = await budgetsAPI.approve(selectedBudget.id, { reviewNotes: reviewRemarks });
        toast.success(res.data?.message || 'Department budget approved into church general budget!');
      } else {
        const res = await budgetsAPI.reject(selectedBudget.id, { reason: reviewRemarks });
        toast.success(res.data?.message || 'Budget returned with revision feedback');
      }

      setApprovalModalOpen(false);
      setDetailModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process budget approval');
    } finally {
      setProcessingApproval(false);
    }
  };

  // 1-Click Submit for Draft Budget
  const handleSubmitProposal = async (budgetId) => {
    try {
      const res = await budgetsAPI.submit(budgetId);
      toast.success(res.data?.message || 'Budget submitted for leadership approval!');
      if (detailModalOpen && selectedBudget?.id === budgetId) {
        setDetailModalOpen(false);
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit proposal');
    }
  };

  // Filtered Budgets based on active Tab
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (activeTab === 'departmental') return Boolean(b.department_id);
      if (activeTab === 'churchwide') return !b.department_id;
      if (activeTab === 'pending') return b.status === 'submitted';
      return true;
    });
  }, [budgets, activeTab]);

  const pendingCount = budgets.filter(b => b.status === 'submitted').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title mb-0">Budgets & Department Allocations</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              FY {currentYear}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Empower church departments to raise annual, quarterly, or half-year itemized budgets and track planned vs. actual expenditures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/procurement" className="btn-secondary text-xs inline-flex items-center gap-1.5">
            <ClipboardList size={14} /> Requisitions & Payouts
          </Link>

          {/* Raise Department Budget Button */}
          <button
            onClick={() => openCreateModal('department')}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> Raise Department Budget
          </button>

          {/* General Churchwide Budget (Leadership only) */}
          {isLeadership && (
            <button
              onClick={() => openCreateModal('churchwide')}
              className="btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <PiggyBank size={14} /> Church-Wide Budget
            </button>
          )}
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Planned */}
        <div className="card p-4 border-l-4 border-l-blue-600 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Total Planned Budget</span>
            <DollarSign size={15} className="text-blue-600" />
          </p>
          <p className="text-2xl font-extrabold font-display text-gray-900">
            {currency(summary?.grandPlannedTotal || 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>General: {currency(summary?.churchwideTotal || 0)}</span>
            <span className="text-emerald-700 font-semibold">Depts: {currency(summary?.departmentApprovedTotal || 0)}</span>
          </div>
        </div>

        {/* Total Spent / Disbursed */}
        <div className="card p-4 border-l-4 border-l-amber-500 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Disbursed & Spent</span>
            <TrendingUp size={15} className="text-amber-600" />
          </p>
          <p className="text-2xl font-extrabold font-display text-amber-700">
            {currency(summary?.totalSpent || 0)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Utilization Rate</span>
            <span className="font-bold text-gray-800">{summary?.utilizationRate || 0}%</span>
          </div>
        </div>

        {/* Remaining Budget Variance */}
        <div className="card p-4 border-l-4 border-l-emerald-600 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Remaining Allocation</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </p>
          <p className={`text-2xl font-extrabold font-display ${(summary?.remainingBalance || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {currency(summary?.remainingBalance || 0)}
          </p>
          <p className="text-[11px] text-gray-400 pt-1">Uncommitted balance for fiscal year</p>
        </div>

        {/* Pending Department Proposals */}
        <div className="card p-4 border-l-4 border-l-purple-600 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center justify-between">
            <span>Awaiting Approval</span>
            <Clock size={15} className="text-purple-600" />
          </p>
          <p className="text-2xl font-extrabold font-display text-purple-900">
            {summary?.pendingProposalsCount || 0} <span className="text-xs font-normal text-gray-500">proposals</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
            <span>Requested Value</span>
            <span className="font-semibold text-purple-800">{currency(summary?.pendingProposalsAmount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search / Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: `All Budgets (${budgets.length})` },
            { id: 'departmental', label: 'Department Proposals' },
            { id: 'churchwide', label: 'Church-Wide General' },
            { id: 'pending', label: `Approval Queue ${pendingCount > 0 ? `(${pendingCount})` : ''}`, highlight: pendingCount > 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : tab.highlight
                    ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 font-extrabold'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {departments.length > 0 && (
            <select
              className="input text-xs h-8 py-1 px-2.5 max-w-[170px]"
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="churchwide">Church-Wide Only</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          <select
            className="input text-xs h-8 py-1 px-2.5 max-w-[140px]"
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
          >
            <option value="">All Periods</option>
            <option value="annual">Annual (Year)</option>
            <option value="half_year">Half-Year (H1/H2)</option>
            <option value="quarterly">Quarterly</option>
            <option value="monthly">Monthly</option>
            <option value="project">Project / Event</option>
          </select>

          <input
            className="input text-xs h-8 py-1 px-2.5 w-44"
            placeholder="Search budgets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {(departmentFilter || periodFilter || statusFilter || search) && (
            <button
              onClick={() => {
                setDepartmentFilter('');
                setPeriodFilter('');
                setStatusFilter('');
                setSearch('');
              }}
              className="text-xs text-gray-500 hover:text-gray-900 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Budget Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <PiggyBank size={44} className="mx-auto text-gray-300" />
          <h3 className="font-semibold text-gray-800 text-base">No budgets found in this view</h3>
          <p className="text-gray-500 text-xs max-w-md mx-auto">
            Departments can prepare itemized proposals for this year, quarter, or half of the year. Click below to raise your department's budget.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => openCreateModal('department')}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Raise Department Budget
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map(budget => {
            const isDept = Boolean(budget.department_id);
            const isApproved = budget.status === 'approved' || budget.status === 'active';
            const isSubmitted = budget.status === 'submitted';
            const isDraft = budget.status === 'draft';
            const isRejected = budget.status === 'rejected';

            const pct = Math.min(100, Number(budget.spend_pct || 0));
            const overBudget = Number(budget.spent_amount) > Number(budget.total_amount);

            return (
              <div
                key={budget.id}
                className="card p-5 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4 border border-gray-200"
              >
                <div>
                  {/* Top Category & Status Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        isDept ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isDept ? <Building2 size={11} /> : <PiggyBank size={11} />}
                        {budget.department_name || 'Church-Wide'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isSubmitted ? 'bg-amber-100 text-amber-800' :
                      isRejected ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {isApproved ? 'Approved & Active' :
                       isSubmitted ? 'Awaiting Approval' :
                       isRejected ? 'Revision Needed' : 'Draft'}
                    </span>
                  </div>

                  {/* Budget Title */}
                  <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                    {budget.name}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-700">{budget.period_detail || budget.period_type}</span>
                    <span>•</span>
                    <span>{budget.items_count || 0} line item{budget.items_count !== 1 ? 's' : ''}</span>
                    {budget.branch_name && (
                      <>
                        <span>•</span>
                        <span>{budget.branch_name}</span>
                      </>
                    )}
                  </p>

                  {/* Financial Figures */}
                  <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500">Planned Budget:</span>
                      <span className="font-extrabold text-gray-900 font-display text-base">
                        {currency(budget.total_amount)}
                      </span>
                    </div>

                    {isApproved && (
                      <>
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-gray-500">Disbursed:</span>
                          <span className={`font-bold ${overBudget ? 'text-red-600' : 'text-gray-700'}`}>
                            {currency(budget.spent_amount)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              overBudget ? 'bg-red-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>{pct}% utilized</span>
                          <span>Rem: {currency(budget.remaining_amount)}</span>
                        </div>
                      </>
                    )}

                    {isSubmitted && (
                      <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                        <Clock size={12} /> Submitted for leadership review
                      </p>
                    )}

                    {isRejected && budget.rejection_reason && (
                      <p className="text-[11px] text-red-600 font-medium line-clamp-2">
                        <strong>Feedback:</strong> {budget.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openBudgetDetails(budget)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Eye size={13} /> View Items & Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* HOD 1-Click Submit Draft */}
                    {isDraft && (
                      <button
                        onClick={() => handleSubmitProposal(budget.id)}
                        className="btn-primary text-[11px] py-1 px-2.5 bg-brand-600 hover:bg-brand-700"
                        title="Submit this budget to church leadership"
                      >
                        Submit
                      </button>
                    )}

                    {/* Leadership Quick Approve Button */}
                    {isSubmitted && isLeadership && (
                      <button
                        onClick={() => openApprovalModal(budget, 'approve')}
                        className="btn-primary text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: RAISE DEPARTMENT BUDGET (ITEMIZED BUILDER) ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudgetId ? 'Edit Budget Proposal' : 'Raise Budget Proposal'}
        size="2xl"
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
            <div className="text-xs text-gray-600">
              <span>Total Estimated Budget: </span>
              <strong className="text-base text-gray-900 font-display font-black">
                {currency(totalItemsSum)}
              </strong>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button onClick={() => setModalOpen(false)} className="btn-secondary text-xs">
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSaveBudget('draft')}
                disabled={saving}
                className="btn-secondary text-xs"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSaveBudget(isLeadership && form.budgetType === 'churchwide' ? 'approved' : 'submitted')}
                disabled={saving}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-4"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isLeadership && form.budgetType === 'churchwide' ? (
                  'Create & Activate'
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={e => { e.preventDefault(); handleSaveBudget('submitted'); }} className="space-y-5">
          {/* Classification & Department */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                Departmental Budget Submission
              </span>
              <p className="text-xs text-blue-700">
                Itemize required equipment, programs, and operational expenses for church approval.
              </p>
            </div>

            {isLeadership && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-700">Type:</label>
                <select
                  className="input text-xs py-1 h-8"
                  value={form.budgetType}
                  onChange={e => {
                    const newType = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      budgetType: newType,
                      departmentId: newType === 'churchwide' ? '' : prev.departmentId,
                    }));
                  }}
                >
                  <option value="department">Department Budget</option>
                  <option value="churchwide">Church-Wide General</option>
                </select>
              </div>
            )}
          </div>

          {/* Department & Budget Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.budgetType === 'department' && (
              <div>
                <label className="label">Department Raising Budget *</label>
                <select
                  required
                  className="input text-xs"
                  value={form.departmentId}
                  onChange={e => {
                    const deptId = e.target.value;
                    setForm(prev => {
                      const dept = departments.find(d => d.id === deptId);
                      const deptName = dept ? dept.name : 'Department';
                      return {
                        ...prev,
                        departmentId: deptId,
                        name: `${deptName} ${prev.periodDetail} Budget`,
                      };
                    });
                  }}
                >
                  <option value="">Select Department…</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={form.budgetType === 'churchwide' ? 'sm:col-span-2' : ''}>
              <label className="label">Budget Title *</label>
              <input
                required
                className="input text-xs font-medium"
                placeholder="e.g. Media Unit Q2 Equipment & Streaming Budget"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>

          {/* Timeframe & Period Selection */}
          <div className="card p-3.5 bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-500" /> Timeframe & Period ("Year, Half-Year, Quarter")
              </span>
              <span className="text-xs text-gray-500 font-medium">Fiscal Year: {form.fiscalYear}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label text-[11px]">Period Selection</label>
                <select
                  className="input text-xs"
                  value={form.periodTypePreset}
                  onChange={e => handlePeriodPresetChange(e.target.value)}
                >
                  {PERIOD_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-[11px]">Start Date *</label>
                <input
                  type="date"
                  required
                  className="input text-xs"
                  value={form.startDate}
                  onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="label text-[11px]">End Date *</label>
                <input
                  type="date"
                  required
                  className="input text-xs"
                  value={form.endDate}
                  onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* ── ITEMIZED LINE ITEMS (What is the budget for? What exact item?) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-600" /> Itemized Line Items ("What is it for? Exact Items")
                </h4>
                <p className="text-[11px] text-gray-500">
                  Itemize every piece of equipment, consumable, retreat or service item needed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="btn-secondary text-xs inline-flex items-center gap-1 py-1 px-2.5 font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus size={13} /> Add Another Item
              </button>
            </div>

            {/* Line items table / rows */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {form.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-xl border border-gray-200 bg-white shadow-xs space-y-2.5 hover:border-brand-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-500">Item #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Exact Item Name */}
                    <div className="sm:col-span-5">
                      <label className="label text-[10px]">Item Title / Description *</label>
                      <input
                        required
                        className="input text-xs font-medium"
                        placeholder="e.g. 2x Wireless Handheld Microphones"
                        value={item.itemName}
                        onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                      />
                    </div>

                    {/* Category */}
                    <div className="sm:col-span-3">
                      <label className="label text-[10px]">Category</label>
                      <select
                        className="input text-xs"
                        value={item.category}
                        onChange={e => handleItemChange(idx, 'category', e.target.value)}
                      >
                        {ITEM_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Qty */}
                    <div className="sm:col-span-1">
                      <label className="label text-[10px]">Qty</label>
                      <input
                        type="number"
                        min="1"
                        className="input text-xs text-center font-bold px-1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="sm:col-span-3">
                      <label className="label text-[10px]">Unit Cost ({currencySymbol.trim()})</label>
                      <input
                        type="number"
                        min="0"
                        className="input text-xs text-right font-bold"
                        placeholder="0.00"
                        value={item.unitCost}
                        onChange={e => handleItemChange(idx, 'unitCost', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Justification & Line Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
                    <div className="sm:col-span-9">
                      <input
                        className="input text-[11px] h-8 text-gray-600"
                        placeholder="Why is this needed? (e.g. Replaces 2 faulty choir mics for Sunday celebrations)"
                        value={item.description || ''}
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-3 text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Line Total</span>
                      <span className="text-xs font-extrabold text-gray-900 font-display">
                        {currency(Number(item.totalAmount) || ((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary Footer */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Total Proposal Value:
              </span>
              <span className="text-lg font-black text-emerald-900 font-display">
                {currency(totalItemsSum)}
              </span>
            </div>
          </div>

          {/* General Notes & Objectives */}
          <div>
            <label className="label">Department Objectives & Justification Notes</label>
            <textarea
              rows={2}
              className="input text-xs"
              placeholder="Provide strategic context or goals for this budget period (e.g. Preparing for Easter conference and youth retreat)"
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: VIEW BUDGET & LINE ITEMS BREAKDOWN ── */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedBudget?.name || 'Budget Details'}
        size="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <button onClick={() => setDetailModalOpen(false)} className="btn-secondary text-xs">
              Close
            </button>

            <div className="flex items-center gap-2">
              {/* Leadership approval actions */}
              {isLeadership && selectedBudget?.status === 'submitted' && (
                <>
                  <button
                    onClick={() => openApprovalModal(selectedBudget, 'reject')}
                    className="btn-secondary text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Request Revision
                  </button>
                  <button
                    onClick={() => openApprovalModal(selectedBudget, 'approve')}
                    className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve Budget
                  </button>
                </>
              )}

              {/* HOD 1-Click submit if draft */}
              {selectedBudget?.status === 'draft' && (
                <button
                  onClick={() => handleSubmitProposal(selectedBudget.id)}
                  className="btn-primary text-xs bg-brand-600 hover:bg-brand-700"
                >
                  Submit for Leadership Approval
                </button>
              )}
            </div>
          </div>
        }
      >
        {selectedBudget && (
          <div className="space-y-4">
            {/* Header overview */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-bold text-gray-800">
                  {selectedBudget.department_name || 'Church-Wide'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Period</span>
                <span className="font-bold text-gray-800">
                  {selectedBudget.period_detail || selectedBudget.period_type}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Budget</span>
                <span className="font-extrabold text-brand-600 text-sm">
                  {currency(selectedBudget.total_amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-bold capitalize">{selectedBudget.status}</span>
              </div>
            </div>

            {/* Rejection / revision feedback notice */}
            {selectedBudget.status === 'rejected' && selectedBudget.rejection_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-red-600" /> Leadership Revision Notes:
                </p>
                <p className="pl-5 leading-relaxed">{selectedBudget.rejection_reason}</p>
              </div>
            )}

            {/* Approval remarks notice */}
            {selectedBudget.status === 'approved' && selectedBudget.approved_by_name && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span>Approved by <strong>{selectedBudget.approved_by_name}</strong></span>
                {selectedBudget.approved_at && (
                  <span>{format(parseISO(selectedBudget.approved_at), 'MMM d, yyyy')}</span>
                )}
              </div>
            )}

            {/* Line Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Itemized Breakdown ({selectedBudget.items?.length || selectedBudget.items_count || 0} items)
                </h4>
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-brand-600" /></div>
              ) : (!selectedBudget.items || selectedBudget.items.length === 0) ? (
                <p className="text-xs text-gray-400 text-center py-6">No individual line items recorded for this budget.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {selectedBudget.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 hover:bg-gray-50 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 truncate">{item.item_name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                            {item.category}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-gray-500 text-[11px] leading-snug">{item.description}</p>
                        )}
                        <p className="text-gray-400 text-[10px]">
                          Qty: <strong>{item.quantity}</strong> × {currency(item.unit_cost)}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-gray-900 text-sm font-display block">
                          {currency(item.total_amount)}
                        </span>
                        {Number(item.spent_amount) > 0 && (
                          <span className="text-[10px] text-amber-600">
                            Spent: {currency(item.spent_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedBudget.notes && (
              <div className="text-xs text-gray-600 pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-700 block mb-0.5">Objective / Notes:</span>
                <p>{selectedBudget.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── MODAL 3: LEADERSHIP APPROVAL / REVISION ── */}
      <Modal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={approvalAction === 'approve' ? 'Approve Department Budget' : 'Request Budget Revision'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button onClick={() => setApprovalModalOpen(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handleConfirmApproval}
              disabled={processingApproval}
              className={`btn-primary text-xs ${
                approvalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {processingApproval ? (
                <Loader2 size={14} className="animate-spin" />
              ) : approvalAction === 'approve' ? (
                'Confirm Approval'
              ) : (
                'Send Revision Feedback'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {approvalAction === 'approve' ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" /> Incorporate into General Budget
              </p>
              <p>
                Approving this proposal allocates <strong>{currency(selectedBudget?.total_amount)}</strong> to <strong>{selectedBudget?.department_name}</strong> for {selectedBudget?.period_detail}. It will be integrated into the church's active budget plan.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <XCircle size={15} className="text-red-600" /> Return Proposal for Revision
              </p>
              <p>
                State what items should be modified or reduced so the department HOD can adjust and re-submit.
              </p>
            </div>
          )}

          <div>
            <label className="label">
              {approvalAction === 'approve' ? 'Optional Approval Remarks' : 'Revision Feedback / Reason *'}
            </label>
            <textarea
              required={approvalAction === 'reject'}
              rows={3}
              className="input text-xs"
              placeholder={approvalAction === 'approve' ? 'e.g. Approved during Church Council meeting' : 'e.g. Please reduce equipment line item by 15% and resubmit.'}
              value={reviewRemarks}
              onChange={e => setReviewRemarks(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
