import { useState, useEffect, useCallback } from 'react';
import {
  Target, Award, TrendingUp, AlertCircle, Plus, CheckCircle2, Clock,
  User, Building2, ChevronRight, Edit3, Trash2, ShieldCheck, Filter,
  BarChart3, CheckSquare, Sparkles, AlertTriangle, Loader2
} from 'lucide-react';
import { okrsAPI, usersAPI, departmentsAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const PERIOD_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_year', label: 'Half-Year' },
  { value: 'annual', label: 'Annual / Full Year' },
  { value: 'monthly', label: 'Monthly' },
];

const STATUS_CONFIG = {
  in_progress: { label: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  achieved: { label: 'Achieved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  exceeded: { label: 'Exceeded', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  lagging: { label: 'Lagging', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  closed: { label: 'Closed', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function Okrs() {
  const { user } = useAuth();
  const isSeniorLeader = ['senior_pastor', 'head_pastor', 'admin', 'church_admin', 'pastor'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'okrs'
  const [loading, setLoading] = useState(true);
  const [scorecard, setScorecard] = useState([]);
  const [scorecardSummary, setScorecardSummary] = useState(null);
  const [okrs, setOkrs] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [targetRole, setTargetRole] = useState('all');
  const [periodType, setPeriodType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    targetRole: 'director',
    departmentId: '',
    title: '',
    description: '',
    periodType: 'quarterly',
    periodDetail: 'Q1 2026',
    fiscalYear: new Date().getFullYear(),
    targetMetric: 'Weekly Attendance / Engagement',
    targetValue: 100,
    weight: 1.0,
    keyResults: [
      { title: '', target: 100, current: 0, completed: false }
    ]
  });

  // Progress Update Modal
  const [progressTarget, setProgressTarget] = useState(null);
  const [progressForm, setProgressForm] = useState({
    currentValue: 0,
    progressPct: 0,
    selfAssessmentNotes: '',
    keyResults: []
  });
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Review Modal (Senior Pastor Evaluation)
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    evaluatorNotes: '',
    status: 'in_progress',
    progressPct: 0,
  });
  const [savingReview, setSavingReview] = useState(false);

  const fetchScorecard = useCallback(async () => {
    try {
      const res = await okrsAPI.scorecard({ fiscalYear });
      setScorecard(res.data?.data || []);
      setScorecardSummary(res.data?.summary || null);
    } catch {
      toast.error('Failed to load leadership performance scorecard');
    }
  }, [fiscalYear]);

  const fetchOkrs = useCallback(async () => {
    try {
      const params = { fiscalYear };
      if (targetRole !== 'all') params.targetRole = targetRole;
      if (periodType !== 'all') params.periodType = periodType;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await okrsAPI.list(params);
      setOkrs(res.data?.data || []);
    } catch {
      toast.error('Failed to load OKRs list');
    }
  }, [fiscalYear, targetRole, periodType, statusFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchScorecard(), fetchOkrs()]);
    setLoading(false);
  }, [fetchScorecard, fetchOkrs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    usersAPI.list({ limit: 100 }).then(res => {
      const allUsers = res.data?.data || [];
      const eligible = allUsers.filter(u => ['director', 'hod', 'pastor', 'head_pastor', 'senior_pastor'].includes(u.role));
      setStaffUsers(eligible);
    }).catch(() => {});

    departmentsAPI.list().then(res => {
      setDepartments(res.data?.data || []);
    }).catch(() => {});
  }, []);

  const handleKeyResultChange = (index, field, val) => {
    const list = [...form.keyResults];
    list[index][field] = val;
    setForm({ ...form, keyResults: list });
  };

  const addKeyResultRow = () => {
    setForm({
      ...form,
      keyResults: [...form.keyResults, { title: '', target: 100, current: 0, completed: false }]
    });
  };

  const removeKeyResultRow = (index) => {
    const list = form.keyResults.filter((_, i) => i !== index);
    setForm({ ...form, keyResults: list });
  };

  const handleCreateOkr = async (e) => {
    e.preventDefault();
    if (!form.userId) return toast.error('Please assign to a Ministry Director or HOD');
    if (!form.title.trim()) return toast.error('Please enter an OKR objective title');

    setCreating(true);
    try {
      await okrsAPI.create(form);
      toast.success('Leadership OKR established successfully! 🎯');
      setShowCreateModal(false);
      setForm({
        userId: '',
        targetRole: 'director',
        departmentId: '',
        title: '',
        description: '',
        periodType: 'quarterly',
        periodDetail: `Q1 ${fiscalYear}`,
        fiscalYear,
        targetMetric: 'Department Engagement',
        targetValue: 100,
        weight: 1.0,
        keyResults: [{ title: '', target: 100, current: 0, completed: false }]
      });
      loadData();
    } catch {
      toast.error('Failed to create OKR');
    } finally {
      setCreating(false);
    }
  };

  const openProgressModal = (okr) => {
    setProgressTarget(okr);
    setProgressForm({
      currentValue: okr.current_value || 0,
      progressPct: okr.progress_pct || 0,
      selfAssessmentNotes: okr.self_assessment_notes || '',
      keyResults: Array.isArray(okr.key_results) ? JSON.parse(JSON.stringify(okr.key_results)) : []
    });
  };

  const handleSaveProgress = async () => {
    if (!progressTarget) return;
    setUpdatingProgress(true);
    try {
      await okrsAPI.updateProgress(progressTarget.id, progressForm);
      toast.success('Progress self-assessment saved! 🚀');
      setProgressTarget(null);
      loadData();
    } catch {
      toast.error('Failed to update progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const openReviewModal = (okr) => {
    setReviewTarget(okr);
    setReviewForm({
      evaluatorNotes: okr.evaluator_notes || '',
      status: okr.status || 'in_progress',
      progressPct: okr.progress_pct || 0,
    });
  };

  const handleSaveReview = async () => {
    if (!reviewTarget) return;
    setSavingReview(true);
    try {
      await okrsAPI.review(reviewTarget.id, reviewForm);
      toast.success('Pastoral evaluation and grade recorded! 👑');
      setReviewTarget(null);
      loadData();
    } catch {
      toast.error('Failed to save review');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDeleteOkr = async (id, title) => {
    if (!confirm(`Delete OKR "${title}"?`)) return;
    try {
      await okrsAPI.delete(id);
      toast.success('OKR deleted');
      loadData();
    } catch {
      toast.error('Failed to delete OKR');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Leadership OKRs & Staff KPIs</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
              Senior Pastor Governance
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Establish performance metrics, quarterly milestones, and track percentage achievements for Directors and HODs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
            className="input w-auto text-sm py-1.5 font-semibold text-gray-700"
          >
            {[2027, 2026, 2025].map(y => (
              <option key={y} value={y}>Fiscal Year {y}</option>
            ))}
          </select>

          {isSeniorLeader && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus size={16} /> Set Leadership OKR
            </button>
          )}
        </div>
      </div>

      {/* High-Level Executive Summary Cards */}
      {scorecardSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-100 p-4">
            <div className="flex items-center justify-between text-brand-700">
              <span className="text-xs font-bold uppercase tracking-wider">Overall Church Achievement</span>
              <TrendingUp size={18} />
            </div>
            <p className="text-3xl font-extrabold text-brand-950 mt-2">
              {scorecardSummary.overallLeadershipAchievementPct}%
            </p>
            <div className="w-full bg-brand-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, scorecardSummary.overallLeadershipAchievementPct)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all evaluated Directors & HODs</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-xs font-bold uppercase tracking-wider">Leadership Roster</span>
              <User size={18} />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">
              {scorecardSummary.totalStaff}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {scorecardSummary.evaluatedStaffCount} active staff with assigned OKRs
            </p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold uppercase tracking-wider">Achieved Targets</span>
              <CheckCircle2 size={18} />
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {okrs.filter(o => o.status === 'achieved' || o.status === 'exceeded').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Milestones fully met or exceeded</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-bold uppercase tracking-wider">Lagging / Critical</span>
              <AlertTriangle size={18} />
            </div>
            <p className="text-3xl font-extrabold text-rose-600 mt-2">
              {okrs.filter(o => o.status === 'lagging').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Requires pastoral support or review</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'scorecard'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award size={16} /> Directors & HODs Performance Scorecard
          </button>
          <button
            onClick={() => setActiveTab('okrs')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'okrs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Target size={16} /> All OKR Objectives ({okrs.length})
          </button>
        </div>

        {activeTab === 'okrs' && (
          <div className="flex items-center gap-2 pb-2">
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="input w-auto text-xs py-1"
            >
              <option value="all">All Roles</option>
              <option value="director">Directors Only</option>
              <option value="hod">HODs Only</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto text-xs py-1"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="achieved">Achieved</option>
              <option value="lagging">Lagging</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : activeTab === 'scorecard' ? (
        /* SCORECARD VIEW */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Staff Evaluation & Accountability Matrix</h3>
                <p className="text-xs text-gray-500">Directors overseeing groups of departments and unit HODs</p>
              </div>
              <span className="text-xs text-gray-400 font-medium">Ranked by weighted achievement</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3">Leader</th>
                    <th className="px-5 py-3">Jurisdiction / Departments</th>
                    <th className="px-5 py-3 text-center">OKRs</th>
                    <th className="px-5 py-3">Performance & Progress</th>
                    <th className="px-5 py-3 text-center">Score Grade</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scorecard.map((staff) => {
                    const supervised = Array.isArray(staff.supervised_departments) ? staff.supervised_departments : [];
                    return (
                      <tr key={staff.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                              {staff.first_name?.[0]}{staff.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{staff.first_name} {staff.last_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  staff.role === 'director' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {staff.role === 'director' ? 'Ministry Director' : 'Head of Department'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {staff.role === 'director' ? (
                            <div>
                              {supervised.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {supervised.map((d) => (
                                    <span key={d.id} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                                      {d.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No assigned departments yet</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                              <Building2 size={13} className="text-gray-400" />
                              {staff.hod_department_name || 'Assigned Unit'}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-gray-900">{staff.total_okrs}</span>
                            <span className="text-[10px] text-gray-400">
                              {staff.achieved_count} achieved
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="w-44">
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span className="text-gray-700">{staff.performance_pct}%</span>
                              <span className="text-gray-400 font-normal">Target: 100%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  staff.performance_pct >= 80 ? 'bg-emerald-500' :
                                  staff.performance_pct >= 50 ? 'bg-teal-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, staff.performance_pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            staff.gradeColor === 'emerald' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            staff.gradeColor === 'teal' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            staff.gradeColor === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            staff.gradeColor === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            staff.gradeColor === 'rose' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {staff.grade}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setActiveTab('okrs');
                              setTargetRole(staff.role);
                            }}
                            className="text-xs text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1"
                          >
                            View OKRs <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* OKRS LIST VIEW */
        <div className="space-y-4">
          {okrs.length === 0 ? (
            <div className="card text-center py-16">
              <Target size={44} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No OKRs found for the selected period</p>
              <p className="text-sm text-gray-400 mt-1">Set targets and key results to guide ministry excellence</p>
              {isSeniorLeader && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4 inline-flex items-center gap-1.5">
                  <Plus size={16} /> Establish New OKR
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {okrs.map((okr) => {
                const statusMeta = STATUS_CONFIG[okr.status] || STATUS_CONFIG.in_progress;
                const keyResults = Array.isArray(okr.key_results) ? okr.key_results : [];
                return (
                  <div key={okr.id} className="card p-5 flex flex-col justify-between hover:shadow-card-hover transition-all">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                            {okr.period_detail || okr.period_type}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>
                          {okr.department_name && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                              <Building2 size={12} /> {okr.department_name}
                            </span>
                          )}
                        </div>

                        {isSeniorLeader && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openReviewModal(okr)}
                              className="text-xs text-purple-700 hover:bg-purple-50 px-2 py-1 rounded font-medium transition-colors"
                              title="Senior Pastor Review & Grading"
                            >
                              Pastoral Review
                            </button>
                            <button
                              onClick={() => handleDeleteOkr(okr.id, okr.title)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Objective Title */}
                      <h3 className="font-bold text-gray-900 text-base mb-1">{okr.title}</h3>
                      {okr.description && <p className="text-xs text-gray-500 mb-3">{okr.description}</p>}

                      {/* Assignee */}
                      <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-7 h-7 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-xs">
                          {okr.assignee_name?.[0]}
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-gray-800">{okr.assignee_name}</p>
                          <p className="text-gray-400 capitalize">{okr.target_role === 'director' ? 'Ministry Director' : 'Unit HOD'}</p>
                        </div>
                      </div>

                      {/* Target Metric & Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">
                            {okr.target_metric || 'Achievement'}: <strong>{okr.current_value} / {okr.target_value}</strong>
                          </span>
                          <span className="font-bold text-gray-900">{okr.progress_pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              okr.progress_pct >= 100 ? 'bg-purple-600' :
                              okr.progress_pct >= 70 ? 'bg-emerald-500' :
                              okr.progress_pct >= 40 ? 'bg-teal-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, okr.progress_pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Key Results Milestones Checklist */}
                      {keyResults.length > 0 && (
                        <div className="space-y-1.5 mb-4 border-t border-gray-100 pt-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Key Results Milestones</p>
                          {keyResults.map((kr, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                              <CheckCircle2
                                size={14}
                                className={kr.completed || kr.current >= kr.target ? 'text-emerald-600' : 'text-gray-300'}
                              />
                              <span className={kr.completed ? 'line-through text-gray-400' : ''}>
                                {kr.title} {kr.target ? `(Target: ${kr.target})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Evaluator Notes */}
                      {okr.evaluator_notes && (
                        <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 mb-3">
                          <span className="font-bold">Senior Pastor Feedback:</span> {okr.evaluator_notes}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        Weight: {okr.weight}x
                      </span>
                      <button
                        onClick={() => openProgressModal(okr)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <Edit3 size={13} /> Update Progress & Notes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SET LEADERSHIP OKR */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Establish Leadership OKR / KPI"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary" disabled={creating}>
              Cancel
            </button>
            <button onClick={handleCreateOkr} className="btn-primary" disabled={creating}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Set Leadership OKR'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateOkr} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Leadership Role *</label>
              <select
                className="input"
                value={form.targetRole}
                onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              >
                <option value="director">Ministry Director</option>
                <option value="hod">Head of Department (HOD)</option>
              </select>
            </div>

            <div>
              <label className="label">Assign Leader *</label>
              <select
                className="input"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              >
                <option value="">Select leader</option>
                {staffUsers
                  .filter(u => form.targetRole === 'director' ? u.role === 'director' : true)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Department / Ministry Group (Optional)</label>
            <select
              className="input"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">Church-Wide / Multi-Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Objective Title *</label>
            <input
              className="input"
              placeholder="e.g. Increase Youth Church Attendance to 500+ and achieve 85% follow-up rate"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Objective Context & Expectations</label>
            <textarea
              className="input min-h-[60px]"
              placeholder="Provide strategic expectations from the Senior Pastor..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Period Type</label>
              <select
                className="input"
                value={form.periodType}
                onChange={(e) => setForm({ ...form, periodType: e.target.value })}
              >
                {PERIOD_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Period Detail</label>
              <input
                className="input"
                placeholder="e.g. Q1 2026"
                value={form.periodDetail}
                onChange={(e) => setForm({ ...form, periodDetail: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Metric Target (100)</label>
              <input
                type="number"
                className="input"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: parseFloat(e.target.value) || 100 })}
              />
            </div>
          </div>

          {/* Key Results Milestones Builder */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Key Results Milestones</label>
              <button
                type="button"
                onClick={addKeyResultRow}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                + Add Milestone
              </button>
            </div>

            {form.keyResults.map((kr, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="input flex-1 text-sm py-1.5"
                  placeholder={`Milestone #${idx + 1} (e.g. Host 4 volunteer training workshops)`}
                  value={kr.title}
                  onChange={(e) => handleKeyResultChange(idx, 'title', e.target.value)}
                />
                <input
                  type="number"
                  className="input w-24 text-sm py-1.5 text-center"
                  placeholder="Target"
                  value={kr.target}
                  onChange={(e) => handleKeyResultChange(idx, 'target', parseFloat(e.target.value) || 0)}
                />
                {form.keyResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeKeyResultRow(idx)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* MODAL 2: UPDATE PROGRESS (STAFF SELF-REPORT) */}
      <Modal
        open={Boolean(progressTarget)}
        onClose={() => setProgressTarget(null)}
        title={`Update Progress: ${progressTarget?.title}`}
        footer={
          <>
            <button onClick={() => setProgressTarget(null)} className="btn-secondary" disabled={updatingProgress}>
              Cancel
            </button>
            <button onClick={handleSaveProgress} className="btn-primary" disabled={updatingProgress}>
              {updatingProgress ? <Loader2 size={16} className="animate-spin" /> : 'Save Progress'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm font-semibold mb-1">
              <span>Overall Progress Completion</span>
              <span className="text-brand-600 font-bold">{progressForm.progressPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressForm.progressPct}
              onChange={(e) => setProgressForm({ ...progressForm, progressPct: parseInt(e.target.value, 10) })}
              className="w-full accent-brand-600"
            />
          </div>

          {Array.isArray(progressForm.keyResults) && progressForm.keyResults.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <label className="label">Milestone Achievements</label>
              {progressForm.keyResults.map((kr, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                  <span className={kr.completed ? 'line-through text-gray-400' : 'text-gray-800'}>{kr.title}</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(kr.completed)}
                      onChange={(e) => {
                        const list = [...progressForm.keyResults];
                        list[idx].completed = e.target.checked;
                        setProgressForm({ ...progressForm, keyResults: list });
                      }}
                      className="rounded text-brand-600"
                    />
                    <span className="text-gray-500">Achieved</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="label">Self-Assessment Notes & Execution Evidence</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Summarize key milestones achieved, challenges faced, or next quarter strategy..."
              value={progressForm.selfAssessmentNotes}
              onChange={(e) => setProgressForm({ ...progressForm, selfAssessmentNotes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: PASTORAL EVALUATION & GRADING */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Senior Pastor Review & Evaluation"
        footer={
          <>
            <button onClick={() => setReviewTarget(null)} className="btn-secondary" disabled={savingReview}>
              Cancel
            </button>
            <button onClick={handleSaveReview} className="btn-primary" disabled={savingReview}>
              {savingReview ? <Loader2 size={16} className="animate-spin" /> : 'Record Evaluation'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900">
            Evaluating leader: <strong>{reviewTarget?.assignee_name}</strong> for objective <strong>"{reviewTarget?.title}"</strong>
          </div>

          <div>
            <label className="label">Evaluation Status</label>
            <select
              className="input"
              value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
            >
              <option value="in_progress">In Progress</option>
              <option value="achieved">Achieved (Met Target)</option>
              <option value="exceeded">Exceeded Expectations</option>
              <option value="lagging">Lagging / Needs Intervention</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="label">Senior Pastor Rating / Score %</label>
            <input
              type="number"
              min="0"
              max="100"
              className="input"
              value={reviewForm.progressPct}
              onChange={(e) => setReviewForm({ ...reviewForm, progressPct: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          <div>
            <label className="label">Pastoral Evaluator Feedback & Guidance</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Provide strategic words of commendation, adjustment advice, or directives for next quarter..."
              value={reviewForm.evaluatorNotes}
              onChange={(e) => setReviewForm({ ...reviewForm, evaluatorNotes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
