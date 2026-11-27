import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Award, TrendingUp, AlertCircle, Plus, CheckCircle2, Clock,
  User, Building2, ChevronRight, Edit3, Trash2, ShieldCheck, Filter,
  BarChart3, CheckSquare, Sparkles, AlertTriangle, Loader2, BookOpen,
  GraduationCap, PlayCircle, Video, Briefcase, ExternalLink, MessageSquare,
  Check, X, RefreshCw, Send, Eye, FileText
} from 'lucide-react';
import { okrsAPI, usersAPI, departmentsAPI, discipleshipAPI } from '../api/services';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const PERIOD_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_year', label: 'Half-Year' },
  { value: 'annual', label: 'Annual / Full Year' },
  { value: 'monthly', label: 'Monthly' },
];

const KPI_CATEGORIES = [
  { value: 'all', label: 'All Metric Categories', icon: Target },
  { value: 'leadership_training', label: '🎓 Leadership Trainings & Retreats', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { value: 'discipleship_course', label: '📖 Discipleship School Courses', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'video_study', label: '🎬 Video & Sermon Studies', icon: Video, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { value: 'departmental_duty', label: '⚙️ Core Departmental Duties', icon: Briefcase, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'core_leadership', label: '🎯 Strategic Leadership OKRs', icon: Target, color: 'text-purple-600 bg-purple-50 border-purple-200' },
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

  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'scorecard' | 'courses'
  const [loading, setLoading] = useState(true);
  const [scorecard, setScorecard] = useState([]);
  const [scorecardSummary, setScorecardSummary] = useState(null);
  const [granularSummary, setGranularSummary] = useState(null);
  const [okrs, setOkrs] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [discipleshipCourses, setDiscipleshipCourses] = useState([]);

  // Filters
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [targetRole, setTargetRole] = useState('all');
  const [periodType, setPeriodType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kpiCategoryFilter, setKpiCategoryFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

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
    periodDetail: `Q1 ${new Date().getFullYear()}`,
    fiscalYear: new Date().getFullYear(),
    kpiCategory: 'core_leadership',
    courseId: '',
    videoUrl: '',
    trainingDate: '',
    trainingVenue: '',
    targetMetric: 'Department Engagement',
    targetValue: 100,
    weight: 1.0,
    keyResults: [
      { id: 'kr-1', type: 'metric', title: '', target: 100, current: 0, completed: false, unit: '%' }
    ]
  });

  // Progress Update & Reflection Modal (Leader Reporting)
  const [progressTarget, setProgressTarget] = useState(null);
  const [progressForm, setProgressForm] = useState({
    currentValue: 0,
    progressPct: 0,
    selfAssessmentNotes: '',
    reflectionNotes: '',
    keyResults: []
  });
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Review & Verification Modal (Senior Pastor Sign-off)
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    verified: true,
    pastoralFeedback: '',
    status: 'achieved',
    progressPct: 100,
  });
  const [savingVerification, setSavingVerification] = useState(false);

  const fetchScorecard = useCallback(async () => {
    try {
      const res = await okrsAPI.scorecard({ fiscalYear });
      setScorecard(res.data?.data || []);
      setScorecardSummary(res.data?.summary || null);
    } catch {
      toast.error('Failed to load leadership performance scorecard');
    }
  }, [fiscalYear]);

  const fetchGranularSummary = useCallback(async () => {
    try {
      const res = await okrsAPI.granularSummary({ fiscalYear });
      setGranularSummary(res.data?.data || null);
    } catch {
      // Non-critical background aggregation
    }
  }, [fiscalYear]);

  const fetchOkrs = useCallback(async () => {
    try {
      const params = { fiscalYear };
      if (targetRole !== 'all') params.targetRole = targetRole;
      if (periodType !== 'all') params.periodType = periodType;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (kpiCategoryFilter !== 'all') params.kpiCategory = kpiCategoryFilter;
      if (verificationFilter !== 'all') params.verificationStatus = verificationFilter;

      const res = await okrsAPI.list(params);
      setOkrs(res.data?.data || []);
    } catch {
      toast.error('Failed to load OKRs list');
    }
  }, [fiscalYear, targetRole, periodType, statusFilter, kpiCategoryFilter, verificationFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchScorecard(), fetchOkrs(), fetchGranularSummary()]);
    setLoading(false);
  }, [fetchScorecard, fetchOkrs, fetchGranularSummary]);

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

    discipleshipAPI.listCourses({ limit: 100 }).then(res => {
      setDiscipleshipCourses(res.data?.data || []);
    }).catch(() => {});
  }, []);

  const handleKeyResultChange = (index, field, val) => {
    const list = [...form.keyResults];
    list[index][field] = val;
    setForm({ ...form, keyResults: list });
  };

  const addKeyResultRow = (type = 'metric') => {
    setForm(prev => ({
      ...prev,
      keyResults: [
        ...prev.keyResults,
        {
          id: `kr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          title: '',
          target: type === 'video_study' || type === 'training' ? 1 : 100,
          current: 0,
          unit: type === 'video_study' ? 'video' : type === 'training' ? 'session' : '%',
          completed: false
        }
      ]
    }));
  };

  const removeKeyResultRow = (index) => {
    const list = form.keyResults.filter((_, i) => i !== index);
    setForm({ ...form, keyResults: list });
  };

  const handleCategorySelect = (category) => {
    let presetMetric = form.targetMetric;
    let presetTitle = form.title;

    if (category === 'leadership_training') {
      presetMetric = 'Training Attendance & Summary';
      if (!presetTitle) presetTitle = 'Complete Ministers & Leaders Training Seminar';
    } else if (category === 'discipleship_course') {
      presetMetric = 'Course Completion %';
      if (!presetTitle) presetTitle = 'Discipleship School Leadership Track';
    } else if (category === 'video_study') {
      presetMetric = 'Video Watch & Reflection Report';
      if (!presetTitle) presetTitle = 'Leadership Sermon / Teaching Study';
    } else if (category === 'departmental_duty') {
      presetMetric = 'Department Operational Benchmark %';
      if (!presetTitle) presetTitle = 'Core Unit Performance Benchmark';
    }

    setForm(prev => ({
      ...prev,
      kpiCategory: category,
      targetMetric: presetMetric,
      title: presetTitle
    }));
  };

  const handleCreateOkr = async (e) => {
    e.preventDefault();
    if (!form.userId) return toast.error('Please assign to a Ministry Director or HOD');
    if (!form.title.trim()) return toast.error('Please enter an OKR / KPI objective title');

    setCreating(true);
    try {
      await okrsAPI.create(form);
      toast.success('Leadership KPI set successfully! 🎯');
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
        kpiCategory: 'core_leadership',
        courseId: '',
        videoUrl: '',
        trainingDate: '',
        trainingVenue: '',
        targetMetric: 'Department Engagement',
        targetValue: 100,
        weight: 1.0,
        keyResults: [{ id: 'kr-1', type: 'metric', title: '', target: 100, current: 0, completed: false, unit: '%' }]
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create KPI');
    } finally {
      setCreating(false);
    }
  };

  const openProgressModal = (okr) => {
    setProgressTarget(okr);
    const keyResults = Array.isArray(okr.key_results) && okr.key_results.length > 0
      ? okr.key_results
      : [{ id: 'kr-1', title: okr.target_metric || 'Primary Goal', target: okr.target_value, current: okr.current_value, completed: okr.progress_pct >= 100 }];

    setProgressForm({
      currentValue: okr.current_value || 0,
      progressPct: okr.progress_pct || 0,
      selfAssessmentNotes: okr.self_assessment_notes || '',
      reflectionNotes: okr.reflection_notes || '',
      keyResults
    });
  };

  const handleSaveProgress = async () => {
    if (!progressTarget) return;
    setUpdatingProgress(true);
    try {
      await okrsAPI.updateProgress(progressTarget.id, progressForm);
      toast.success('Progress and study reflection submitted for pastoral review! 🚀');
      setProgressTarget(null);
      loadData();
    } catch {
      toast.error('Failed to submit progress');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const openVerifyModal = (okr) => {
    setVerifyTarget(okr);
    setVerifyForm({
      verified: true,
      pastoralFeedback: okr.pastoral_feedback || okr.evaluator_notes || '',
      status: okr.status === 'in_progress' && okr.progress_pct >= 80 ? 'achieved' : okr.status,
      progressPct: okr.progress_pct || 100,
    });
  };

  const handleSaveVerification = async () => {
    if (!verifyTarget) return;
    setSavingVerification(true);
    try {
      await okrsAPI.verify(verifyTarget.id, verifyForm);
      toast.success(verifyForm.verified ? 'KPI endorsed & verified by Senior Pastor! ✅' : 'Feedback sent to leader');
      setVerifyTarget(null);
      loadData();
    } catch {
      toast.error('Failed to save verification');
    } finally {
      setSavingVerification(false);
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

  const filteredOkrs = useMemo(() => {
    return okrs;
  }, [okrs]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-gray-900">
              Leadership OKRs & Granular KPIs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Senior Pastor Console
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Assign and follow up on leadership trainings, discipleship courses, video studies, and core departmental duties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSeniorLeader && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> Set Leadership KPI
            </button>
          )}

          <Link
            to="/discipleship"
            className="btn-secondary inline-flex items-center gap-2 text-xs"
            title="Upload and manage courses on the Discipleship Platform"
          >
            <BookOpen size={14} className="text-emerald-600" /> Discipleship Platform
          </Link>
        </div>
      </div>

      {/* 4 GRANULAR FOLLOW-UP METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Trainings */}
        <div className="card p-4 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Leadership Trainings</span>
            <div className="text-2xl font-display font-extrabold text-gray-900 mt-1">
              {granularSummary?.trainings_attended || 0}
              <span className="text-xs text-gray-400 font-normal"> / {granularSummary?.trainings_count || 0}</span>
            </div>
            <p className="text-[11px] text-indigo-600 mt-0.5 font-medium flex items-center gap-1">
              <ShieldCheck size={12} /> {granularSummary?.trainings_verified || 0} Pastoral Verified
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
        </div>

        {/* Card 2: Discipleship Courses */}
        <div className="card p-4 bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Discipleship Courses</span>
            <div className="text-2xl font-display font-extrabold text-gray-900 mt-1">
              {granularSummary?.courses_completed || 0}
              <span className="text-xs text-gray-400 font-normal"> / {granularSummary?.courses_count || 0}</span>
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              School platform completions
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
        </div>

        {/* Card 3: Video Studies & Reports */}
        <div className="card p-4 bg-gradient-to-br from-rose-50/50 to-white border border-rose-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Video Studies</span>
            <div className="text-2xl font-display font-extrabold text-gray-900 mt-1">
              {granularSummary?.videos_reported || 0}
              <span className="text-xs text-gray-400 font-normal"> / {granularSummary?.videos_count || 0}</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-0.5 font-medium flex items-center gap-1">
              <FileText size={12} /> Reflection notes filed
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <PlayCircle size={22} />
          </div>
        </div>

        {/* Card 4: Department Core Duties */}
        <div className="card p-4 bg-gradient-to-br from-amber-50/50 to-white border border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Department Duties</span>
            <div className="text-2xl font-display font-extrabold text-gray-900 mt-1">
              {granularSummary?.dept_duties_on_track || 0}
              <span className="text-xs text-gray-400 font-normal"> / {granularSummary?.dept_duties_count || 0}</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
              Operational KPIs on track (≥70%)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Briefcase size={22} />
          </div>
        </div>
      </div>

      {/* PENDING PASTORAL REVIEW ALERT (If any items need Senior Pastor follow-up) */}
      {(granularSummary?.pending_review_count > 0 || okrs.some(o => o.verification_status === 'submitted_for_review')) && isSeniorLeader && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-amber-50 to-white border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Action Required: Leaders have submitted study reflections & progress reports
              </h3>
              <p className="text-xs text-gray-600">
                Review submissions, verify attendance, and provide pastoral feedback & commendation.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('board');
              setVerificationFilter('submitted_for_review');
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Eye size={14} /> Review Pending Submissions
          </button>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="border-b border-gray-200 flex items-center gap-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('board')}
          className={`pb-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'board'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target size={16} /> Granular KPI Board ({filteredOkrs.length})
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`pb-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'scorecard'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 size={16} /> Leadership Scorecard & Grades
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 px-1 border-b-2 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'courses'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={16} /> Discipleship School Courses ({discipleshipCourses.length})
        </button>
      </div>

      {/* TAB 1: GRANULAR KPI BOARD */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {/* CATEGORY QUICK FILTER CHIPS */}
          <div className="flex flex-wrap items-center gap-2">
            {KPI_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = kpiCategoryFilter === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setKpiCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* SECONDARY FILTERS BAR */}
          <div className="card p-3 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 font-semibold flex items-center gap-1">
                <Filter size={13} /> Filters:
              </span>

              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                className="input py-1 px-2.5 text-xs bg-white w-auto"
              >
                {[new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y} Fiscal Year</option>
                ))}
              </select>

              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="input py-1 px-2.5 text-xs bg-white w-auto"
              >
                <option value="all">All Roles</option>
                <option value="director">Ministry Directors</option>
                <option value="hod">Unit HODs</option>
              </select>

              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="input py-1 px-2.5 text-xs bg-white w-auto"
              >
                <option value="all">All Periods</option>
                {PERIOD_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input py-1 px-2.5 text-xs bg-white w-auto"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="achieved">Achieved</option>
                <option value="exceeded">Exceeded</option>
                <option value="lagging">Lagging</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="input py-1 px-2.5 text-xs bg-white w-auto"
              >
                <option value="all">All Verifications</option>
                <option value="submitted_for_review">Needs Pastoral Review</option>
                <option value="verified">Verified by Senior Pastor</option>
                <option value="pending">Pending Submission</option>
              </select>
            </div>

            <button
              onClick={() => {
                setTargetRole('all');
                setPeriodType('all');
                setStatusFilter('all');
                setKpiCategoryFilter('all');
                setVerificationFilter('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Reset Filters
            </button>
          </div>

          {/* OKRS CARDS GRID */}
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
              <p className="text-sm text-gray-500 font-medium">Loading leadership OKRs & KPIs…</p>
            </div>
          ) : filteredOkrs.length === 0 ? (
            <div className="card p-12 text-center space-y-3">
              <Target size={44} className="mx-auto text-gray-300" />
              <h3 className="font-bold text-gray-800 text-base">No KPIs Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No leadership metrics match the selected filter criteria. Create a KPI or select another category.
              </p>
              {isSeniorLeader && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary text-xs mx-auto inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Set KPI for a Leader
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOkrs.map((okr) => {
                const statusMeta = STATUS_CONFIG[okr.status] || STATUS_CONFIG.in_progress;
                const keyResults = Array.isArray(okr.key_results) ? okr.key_results : [];
                const catMeta = KPI_CATEGORIES.find(c => c.value === okr.kpi_category) || KPI_CATEGORIES[5];
                const CatIcon = catMeta.icon;

                return (
                  <div key={okr.id} className="card p-5 flex flex-col justify-between hover:shadow-card-hover transition-all border border-gray-200/90">
                    <div>
                      {/* Top Badges & Category */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Category Badge */}
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${catMeta.color || 'bg-gray-100 text-gray-700'}`}>
                            <CatIcon size={12} />
                            <span>{catMeta.label.split(' ')[1] || catMeta.label}</span>
                          </span>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                            {okr.period_detail || okr.period_type}
                          </span>

                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </span>

                          {okr.verification_status === 'verified' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <ShieldCheck size={12} className="text-emerald-600" /> Verified
                            </span>
                          )}

                          {okr.verification_status === 'submitted_for_review' && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                              <Sparkles size={12} className="text-amber-600" /> Submitted for Review
                            </span>
                          )}
                        </div>

                        {isSeniorLeader && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openVerifyModal(okr)}
                              className="text-xs text-purple-700 hover:bg-purple-50 px-2.5 py-1 rounded-lg font-semibold transition-colors border border-purple-200"
                              title="Senior Pastor Follow-up & Verification"
                            >
                              Pastoral Review
                            </button>
                            <button
                              onClick={() => handleDeleteOkr(okr.id, okr.title)}
                              className="text-gray-400 hover:text-red-600 p-1 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Objective Title */}
                      <h3 className="font-bold text-gray-900 text-base mb-1">{okr.title}</h3>
                      {okr.description && <p className="text-xs text-gray-500 mb-3">{okr.description}</p>}

                      {/* Granular Context Badges: Course, Video, or Training */}
                      {okr.kpi_category === 'discipleship_course' && okr.course_title && (
                        <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-emerald-950 font-medium">
                            <BookOpen size={15} className="text-emerald-700 shrink-0" />
                            <span>Course: <strong>{okr.course_title}</strong> ({okr.course_duration_weeks || 4} wks)</span>
                          </div>
                          <Link to="/discipleship" className="text-emerald-700 hover:underline font-semibold text-[11px] flex items-center gap-0.5">
                            Open <ExternalLink size={11} />
                          </Link>
                        </div>
                      )}

                      {okr.kpi_category === 'video_study' && okr.video_url && (
                        <div className="mb-3 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-rose-950 font-medium truncate">
                            <Video size={15} className="text-rose-700 shrink-0" />
                            <span className="truncate">Assigned Video: {okr.video_url}</span>
                          </div>
                          <a
                            href={okr.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-700 hover:underline font-semibold text-[11px] shrink-0 ml-2 flex items-center gap-0.5"
                          >
                            Watch <ExternalLink size={11} />
                          </a>
                        </div>
                      )}

                      {okr.kpi_category === 'leadership_training' && (okr.training_date || okr.training_venue) && (
                        <div className="mb-3 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium">
                            <GraduationCap size={15} className="text-indigo-700 shrink-0" />
                            <span>Session Date: <strong>{okr.training_date ? new Date(okr.training_date).toLocaleDateString() : 'Scheduled Session'}</strong></span>
                          </div>
                          {okr.training_venue && (
                            <p className="text-[11px] text-indigo-700 pl-5">Venue/Platform: {okr.training_venue}</p>
                          )}
                        </div>
                      )}

                      {/* Assignee Details */}
                      <div className="flex items-center gap-2.5 mb-4 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {okr.assignee_name?.[0] || 'L'}
                        </div>
                        <div className="text-xs flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{okr.assignee_name}</p>
                          <p className="text-gray-400 capitalize truncate">
                            {okr.target_role === 'director' ? 'Ministry Director' : 'Unit HOD'}
                            {okr.department_name ? ` · ${okr.department_name}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Target */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">
                            {okr.target_metric || 'Completion'}: <strong>{okr.current_value} / {okr.target_value}</strong>
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

                      {/* Granular Sub-Key Results Checklist */}
                      {keyResults.length > 0 && (
                        <div className="space-y-1.5 mb-4 border-t border-gray-100 pt-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            Granular Milestones & Core Duties ({keyResults.filter(k => k.completed).length}/{keyResults.length})
                          </p>
                          {keyResults.map((kr, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle2
                                size={14}
                                className={`shrink-0 mt-0.5 ${kr.completed || kr.current >= kr.target ? 'text-emerald-600' : 'text-gray-300'}`}
                              />
                              <div className="min-w-0 flex-1">
                                <span className={kr.completed ? 'line-through text-gray-400' : 'text-gray-800'}>
                                  {kr.title}
                                </span>
                                {kr.target ? (
                                  <span className="text-[10px] text-gray-400 ml-1">
                                    ({kr.current || 0}/{kr.target} {kr.unit || ''})
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Submitted Reflection Notes (If Available) */}
                      {okr.reflection_notes && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 mb-3 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <FileText size={13} /> Leader Study Reflection & Report:
                          </div>
                          <p className="italic leading-relaxed whitespace-pre-wrap">{okr.reflection_notes}</p>
                          {okr.last_reported_at && (
                            <p className="text-[10px] text-amber-700 pt-1">
                              Reported on {new Date(okr.last_reported_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pastoral Feedback / Endorsement Notes */}
                      {(okr.pastoral_feedback || okr.evaluator_notes) && (
                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 mb-3 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-purple-900">
                            <ShieldCheck size={14} className="text-purple-700" /> Senior Pastor Feedback & Directive:
                          </div>
                          <p className="leading-relaxed">{okr.pastoral_feedback || okr.evaluator_notes}</p>
                          {okr.verified_at && (
                            <p className="text-[10px] text-purple-700 pt-0.5">
                              Officially verified on {new Date(okr.verified_at).toLocaleDateString()} {okr.verified_by_name ? `by ${okr.verified_by_name}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">
                        Weight: {okr.weight}x
                      </span>
                      <button
                        onClick={() => openProgressModal(okr)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:bg-gray-100"
                      >
                        <Edit3 size={13} /> Update Progress & Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCORECARD & 360° LEADERSHIP GRADES */}
      {activeTab === 'scorecard' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="font-display font-bold text-gray-900 text-base">Ministry Directors & HODs Performance Table</h2>
              <p className="text-xs text-gray-500">Evaluates composite KPI progress, core departmental duties, and leadership training attendance.</p>
            </div>
            {scorecardSummary && (
              <div className="text-right">
                <span className="text-xs text-gray-400 font-medium">Overall Ministry Achievement:</span>
                <span className="text-lg font-display font-extrabold text-brand-600 ml-2">
                  {scorecardSummary.overallLeadershipAchievementPct}%
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Leader / Staff</th>
                  <th className="py-3 px-4">Role & Departments</th>
                  <th className="py-3 px-4">Total KPIs</th>
                  <th className="py-3 px-4">Achieved</th>
                  <th className="py-3 px-4">On Track</th>
                  <th className="py-3 px-4">Lagging</th>
                  <th className="py-3 px-4">Score %</th>
                  <th className="py-3 px-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scorecard.map((staff) => {
                  const supervised = Array.isArray(staff.supervised_departments) ? staff.supervised_departments : [];
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-[11px]">
                            {staff.first_name?.[0]}
                          </div>
                          <div>
                            <div>{staff.first_name} {staff.last_name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 capitalize mb-1">
                          {staff.role === 'director' ? 'Ministry Director' : 'Unit HOD'}
                        </span>
                        {supervised.length > 0 && (
                          <div className="text-[10px] text-gray-500 flex flex-wrap gap-1">
                            {supervised.map(d => (
                              <span key={d.id} className="bg-brand-50 text-brand-700 px-1.5 py-0.2 rounded">{d.name}</span>
                            ))}
                          </div>
                        )}
                        {staff.hod_department_name && (
                          <div className="text-[10px] text-gray-500">{staff.hod_department_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">{staff.total_okrs}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{staff.achieved_count}</td>
                      <td className="py-3 px-4 text-blue-600 font-semibold">{staff.on_track_count}</td>
                      <td className="py-3 px-4 text-rose-500 font-semibold">{staff.lagging_count}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{staff.performance_pct}%</span>
                          <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, staff.performance_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full font-bold text-[10px] ${
                          staff.gradeColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          staff.gradeColor === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                          staff.gradeColor === 'blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          staff.gradeColor === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          staff.gradeColor === 'rose' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {staff.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISCIPLESHIP PLATFORM DIRECTORY */}
      {activeTab === 'courses' && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h2 className="font-display font-bold text-gray-900 text-base">
                Discipleship & Leadership School Curriculum
              </h2>
              <p className="text-xs text-gray-500">
                Courses uploaded on the Discipleship platform can be assigned as mandatory KPIs to Directors, HODs, and Ministers.
              </p>
            </div>
            <Link
              to="/discipleship"
              className="btn-primary text-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus size={14} /> Upload / Manage Courses
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {discipleshipCourses.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="capitalize px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                      {c.category || 'leadership'}
                    </span>
                    <span>{c.duration_weeks || 4} Weeks</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{c.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{c.description || 'Comprehensive leadership training module for church leaders.'}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 capitalize">{c.level} level</span>
                  {isSeniorLeader && (
                    <button
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          kpiCategory: 'discipleship_course',
                          courseId: c.id,
                          title: `Complete Course: ${c.title}`,
                          targetMetric: 'Discipleship School Completion %'
                        }));
                        setShowCreateModal(true);
                      }}
                      className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      Assign as KPI <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / SET LEADERSHIP KPI (SENIOR PASTOR) */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Set Granular Leadership KPI"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary" disabled={creating}>
              Cancel
            </button>
            <button onClick={handleCreateOkr} className="btn-primary" disabled={creating}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Set Leadership KPI'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateOkr} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* STEP 1: SELECT KPI CATEGORY */}
          <div>
            <label className="label">KPI Metric Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KPI_CATEGORIES.filter(c => c.value !== 'all').map((cat) => {
                const Icon = cat.icon;
                const isSelected = form.kpiCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/80 ring-2 ring-brand-600/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
                    <div className="font-bold text-xs text-gray-900 mt-1">{cat.label.split(' ')[1] || cat.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{cat.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ASSIGNEE & ROLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Assigned Leader (Director / HOD / Pastor) *</label>
              <select
                className="input"
                value={form.userId}
                onChange={(e) => {
                  const uid = e.target.value;
                  const found = staffUsers.find(u => u.id === uid);
                  setForm({
                    ...form,
                    userId: uid,
                    targetRole: found?.role === 'director' ? 'director' : 'hod',
                    departmentId: found?.department_id || form.departmentId
                  });
                }}
                required
              >
                <option value="">Select Leader...</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Associated Department (Optional)</label>
              <select
                className="input"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">None / General Ministry</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC CATEGORY-SPECIFIC FIELDS */}
          {form.kpiCategory === 'discipleship_course' && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <label className="label text-emerald-950 font-bold flex items-center gap-1.5">
                <BookOpen size={16} className="text-emerald-700" /> Discipleship School Platform Course
              </label>
              <select
                className="input bg-white"
                value={form.courseId}
                onChange={(e) => {
                  const cid = e.target.value;
                  const c = discipleshipCourses.find(item => item.id === cid);
                  setForm(prev => ({
                    ...prev,
                    courseId: cid,
                    title: c ? `Complete Course: ${c.title}` : prev.title
                  }));
                }}
              >
                <option value="">Select Course from Discipleship School...</option>
                {discipleshipCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.duration_weeks || 4} weeks · {c.category || 'foundation'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-700">
                The leader will be required to study and complete all lessons in this curriculum on their member portal.
              </p>
            </div>
          )}

          {form.kpiCategory === 'video_study' && (
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3">
              <label className="label text-rose-950 font-bold flex items-center gap-1.5">
                <Video size={16} className="text-rose-700" /> Video Study / Sermon Teaching URL
              </label>
              <input
                type="url"
                className="input bg-white"
                placeholder="https://youtube.com/watch?v=... or Vimeo link"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              />
              <p className="text-[11px] text-rose-700">
                The leader must watch this video and submit a written reflection report on what was learned.
              </p>
            </div>
          )}

          {form.kpiCategory === 'leadership_training' && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-indigo-950 font-bold">Training Session Date</label>
                  <input
                    type="date"
                    className="input bg-white"
                    value={form.trainingDate}
                    onChange={(e) => setForm({ ...form, trainingDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-indigo-950 font-bold">Venue / Virtual Platform</label>
                  <input
                    type="text"
                    className="input bg-white"
                    placeholder="e.g. Main Auditorium / Zoom Link"
                    value={form.trainingVenue}
                    onChange={(e) => setForm({ ...form, trainingVenue: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TITLE & DESCRIPTION */}
          <div>
            <label className="label">KPI Title / Directive *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Complete Q1 Leadership Summit & Submit Strategy Report"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Pastoral Instructions / Context</label>
            <textarea
              className="input min-h-[70px]"
              placeholder="Specify requirements, what excellence looks like, or specific deliverables expected from the leader..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* TIME PERIOD & METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Evaluation Period</label>
              <select
                className="input"
                value={form.periodType}
                onChange={(e) => setForm({ ...form, periodType: e.target.value })}
              >
                {PERIOD_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
              <label className="label">Evaluation Weight</label>
              <select
                className="input"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 1.0 })}
              >
                <option value="1.0">Standard Weight (1.0x)</option>
                <option value="1.5">High Impact (1.5x)</option>
                <option value="2.0">Critical Leadership (2.0x)</option>
              </select>
            </div>
          </div>

          {/* GRANULAR SUB-MILESTONES / KEY RESULTS CHECKLIST */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="label mb-0 font-bold text-gray-900">Granular Milestones & Core Duties</label>
                <p className="text-[11px] text-gray-500">Break this directive down into specific measurable deliverables or tasks.</p>
              </div>
              <button
                type="button"
                onClick={() => addKeyResultRow('metric')}
                className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1"
              >
                <Plus size={13} /> Add Task
              </button>
            </div>

            {form.keyResults.map((kr, idx) => (
              <div key={kr.id || idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 uppercase">Item #{idx + 1}</span>
                  {form.keyResults.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKeyResultRow(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <input
                      type="text"
                      className="input text-xs bg-white"
                      placeholder="e.g. Watch video and write reflection, or Maintain rehearsal attendance >= 90%"
                      value={kr.title}
                      onChange={(e) => handleKeyResultChange(idx, 'title', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      className="input text-xs bg-white"
                      placeholder="Target"
                      value={kr.target}
                      onChange={(e) => handleKeyResultChange(idx, 'target', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      className="input text-xs bg-white"
                      placeholder="Unit (%)"
                      value={kr.unit || ''}
                      onChange={(e) => handleKeyResultChange(idx, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* MODAL 2: LEADER REPORTING & PROGRESS SUBMISSION */}
      <Modal
        open={Boolean(progressTarget)}
        onClose={() => setProgressTarget(null)}
        title={`Report Progress: ${progressTarget?.title}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setProgressTarget(null)} className="btn-secondary" disabled={updatingProgress}>
              Cancel
            </button>
            <button onClick={handleSaveProgress} className="btn-primary" disabled={updatingProgress}>
              {updatingProgress ? <Loader2 size={16} className="animate-spin" /> : 'Submit Report to Senior Pastor'}
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Objective Banner */}
          <div className="p-3.5 bg-brand-50/70 rounded-xl border border-brand-100 text-xs text-brand-950 space-y-1">
            <div className="font-bold text-sm text-brand-900">{progressTarget?.title}</div>
            <p className="text-gray-600">{progressTarget?.description || 'Follow up on the directive set by church leadership.'}</p>
          </div>

          {/* Quick Access if Course or Video */}
          {progressTarget?.kpi_category === 'video_study' && progressTarget?.video_url && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Video size={16} className="text-rose-700" /> Watch Assigned Video</span>
                <a
                  href={progressTarget.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1 text-[11px]"
                >
                  Open Video <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-[11px] text-rose-700 truncate">{progressTarget.video_url}</p>
            </div>
          )}

          {progressTarget?.kpi_category === 'discipleship_course' && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-bold flex items-center gap-1.5"><BookOpen size={16} className="text-emerald-700" /> Discipleship School Course</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">{progressTarget.course_title || 'Access modules in your Member Portal'}</p>
              </div>
              <Link
                to="/discipleship"
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 text-[11px]"
              >
                Launch Course <ExternalLink size={12} />
              </Link>
            </div>
          )}

          {/* Overall Progress Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span>Overall Completion Status</span>
              <span className="text-brand-600 font-bold text-sm">{progressForm.progressPct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={progressForm.progressPct}
              onChange={(e) => setProgressForm({ ...progressForm, progressPct: parseInt(e.target.value, 10) || 0 })}
              className="w-full accent-brand-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Granular Milestones Checklist */}
          {Array.isArray(progressForm.keyResults) && progressForm.keyResults.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <label className="label">Checklist of Completed Tasks</label>
              {progressForm.keyResults.map((kr, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className={kr.completed ? 'line-through text-gray-400 font-medium' : 'text-gray-800 font-medium'}>
                      {kr.title}
                    </span>
                    {kr.target ? (
                      <span className="text-[10px] text-gray-400 ml-1">({kr.target} {kr.unit || ''})</span>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(kr.completed)}
                      onChange={(e) => {
                        const list = [...progressForm.keyResults];
                        list[idx].completed = e.target.checked;
                        if (e.target.checked) list[idx].current = list[idx].target || 1;
                        setProgressForm({ ...progressForm, keyResults: list });
                      }}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-gray-600 text-xs font-semibold">Done</span>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Study Reflection / Execution Report */}
          <div>
            <label className="label">
              Study Reflection & Implementation Report *
            </label>
            <textarea
              className="input min-h-[110px]"
              placeholder="Detail what you learned from the video/training, how you are applying it in your department, and measurable outcomes..."
              value={progressForm.reflectionNotes}
              onChange={(e) => setProgressForm({ ...progressForm, reflectionNotes: e.target.value })}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Your reflection report will be submitted directly to the Senior Pastor for review and endorsement.
            </p>
          </div>

          <div>
            <label className="label">Additional Notes or Challenges (Optional)</label>
            <textarea
              className="input min-h-[60px]"
              placeholder="Any operational challenges, prayer support needed, or resources required..."
              value={progressForm.selfAssessmentNotes}
              onChange={(e) => setProgressForm({ ...progressForm, selfAssessmentNotes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 3: SENIOR PASTOR REVIEW & VERIFICATION */}
      <Modal
        open={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        title="Senior Pastor Review & KPI Endorsement"
        footer={
          <>
            <button onClick={() => setVerifyTarget(null)} className="btn-secondary" disabled={savingVerification}>
              Cancel
            </button>
            <button onClick={handleSaveVerification} className="btn-primary bg-purple-600 hover:bg-purple-700" disabled={savingVerification}>
              {savingVerification ? <Loader2 size={16} className="animate-spin" /> : 'Record Endorsement & Feedback'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-950 space-y-1">
            <div className="font-bold text-sm text-purple-900">
              Evaluating: {verifyTarget?.assignee_name}
            </div>
            <p className="text-purple-800">
              KPI: <strong>{verifyTarget?.title}</strong> ({verifyTarget?.period_detail || verifyTarget?.period_type})
            </p>
          </div>

          {/* Leader's Submitted Reflection */}
          {verifyTarget?.reflection_notes ? (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-900">
                <FileText size={13} /> Leader's Submitted Study Reflection:
              </span>
              <p className="italic leading-relaxed whitespace-pre-wrap">{verifyTarget.reflection_notes}</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 italic">
              No written reflection report submitted yet by this leader.
            </div>
          )}

          <div>
            <label className="label">Verification Endorsement</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerifyForm({ ...verifyForm, verified: true, status: 'achieved' })}
                className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                  verifyForm.verified
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <CheckCircle2 size={16} className="mx-auto mb-1 text-emerald-600" />
                Verified & Endorsed
              </button>

              <button
                type="button"
                onClick={() => setVerifyForm({ ...verifyForm, verified: false, status: 'in_progress' })}
                className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                  !verifyForm.verified
                    ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-500/20'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <RefreshCw size={16} className="mx-auto mb-1 text-amber-600" />
                Request Revision
              </button>
            </div>
          </div>

          <div>
            <label className="label">Final Evaluation Status</label>
            <select
              className="input"
              value={verifyForm.status}
              onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
            >
              <option value="achieved">Achieved (Target Met)</option>
              <option value="exceeded">Exceeded Expectations</option>
              <option value="in_progress">In Progress</option>
              <option value="lagging">Lagging / Intervention Required</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="label">Pastoral Feedback & Directives to Leader</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Enter words of commendation, guidance on next steps, or specific corrections for this leader..."
              value={verifyForm.pastoralFeedback}
              onChange={(e) => setVerifyForm({ ...verifyForm, pastoralFeedback: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
