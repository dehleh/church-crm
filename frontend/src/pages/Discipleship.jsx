import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Plus, Search, BookOpen, Users, Clock, Video,
  CheckCircle2, Award, ChevronRight, Edit2, Trash2, Loader2, Sparkles,
  ExternalLink, FileText, ArrowLeft, PlayCircle
} from 'lucide-react';
import { discipleshipAPI, membersAPI } from '../api/services';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  foundation: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  discipleship: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  leadership: 'bg-purple-100 text-purple-800 border-purple-200',
  workers: 'bg-amber-100 text-amber-800 border-amber-200',
  bible_study: 'bg-sky-100 text-sky-800 border-sky-200',
};

export default function Discipleship() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Selected course for view / manage lessons & enrollments
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  // Modals
  const [courseModal, setCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '', category: 'foundation', level: 'beginner', description: '',
    instructorName: '', durationWeeks: 4, isPublished: true
  });
  const [savingCourse, setSavingCourse] = useState(false);

  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', content: '', scriptureReferences: '',
    videoUrl: '', audioUrl: '', durationMinutes: 20
  });
  const [savingLesson, setSavingLesson] = useState(false);

  const [enrollModal, setEnrollModal] = useState(false);
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [membersList, setMembersList] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  const [activeTab, setActiveTab] = useState('lessons'); // 'lessons' | 'students'

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discipleshipAPI.listCourses({
        search: search || undefined,
        category: categoryFilter || undefined,
      });
      setCourses(res.data.data || []);
    } catch {
      toast.error('Failed to load discipleship courses');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const loadCourseDetails = async (id) => {
    setLoadingCourse(true);
    try {
      const res = await discipleshipAPI.getCourse(id);
      setSelectedCourse(res.data.data);
    } catch {
      toast.error('Failed to load course details');
    } finally {
      setLoadingCourse(false);
    }
  };

  const openNewCourse = () => {
    setCourseForm({
      title: '', category: 'foundation', level: 'beginner', description: '',
      instructorName: '', durationWeeks: 4, isPublished: true
    });
    setCourseModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title.trim()) return toast.error('Course title is required');
    setSavingCourse(true);
    try {
      if (courseForm.id) {
        await discipleshipAPI.updateCourse(courseForm.id, courseForm);
        toast.success('Course updated successfully!');
      } else {
        await discipleshipAPI.createCourse(courseForm);
        toast.success('Course created successfully!');
      }
      setCourseModal(false);
      fetchCourses();
      if (selectedCourse?.id) loadCourseDetails(selectedCourse.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save course');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course and all its lessons?')) return;
    try {
      await discipleshipAPI.deleteCourse(id);
      toast.success('Course deleted');
      if (selectedCourse?.id === id) setSelectedCourse(null);
      fetchCourses();
    } catch {
      toast.error('Failed to delete course');
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await discipleshipAPI.seedDefaults();
      toast.success(res.data.message || 'Standard Believer Foundation School created!');
      fetchCourses();
    } catch {
      toast.error('Failed to seed curriculum');
    } finally {
      setSeeding(false);
    }
  };

  const openNewLesson = () => {
    setLessonForm({
      title: '', description: '', content: '', scriptureReferences: '',
      videoUrl: '', audioUrl: '', durationMinutes: 20
    });
    setLessonModal(true);
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim() || !lessonForm.content.trim()) {
      return toast.error('Please enter lesson title and content notes');
    }
    setSavingLesson(true);
    try {
      if (lessonForm.id) {
        await discipleshipAPI.updateLesson(lessonForm.id, lessonForm);
        toast.success('Lesson updated!');
      } else {
        await discipleshipAPI.createLesson(selectedCourse.id, lessonForm);
        toast.success('Lesson added to syllabus!');
      }
      setLessonModal(false);
      loadCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save lesson');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await discipleshipAPI.deleteLesson(lessonId);
      toast.success('Lesson removed');
      loadCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch {
      toast.error('Failed to remove lesson');
    }
  };

  const openEnrollModal = async () => {
    try {
      const res = await membersAPI.list({ limit: 100, status: 'active' });
      setMembersList(res.data.data || []);
      setEnrollMemberId('');
      setEnrollModal(true);
    } catch {
      toast.error('Failed to load church members');
    }
  };

  const handleEnrollMember = async (e) => {
    e.preventDefault();
    if (!enrollMemberId) return toast.error('Select a member');
    setEnrolling(true);
    try {
      await discipleshipAPI.enrollMember(selectedCourse.id, { memberId: enrollMemberId });
      toast.success('Member enrolled in discipleship course!');
      setEnrollModal(false);
      loadCourseDetails(selectedCourse.id);
      fetchCourses();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to enroll member');
    } finally {
      setEnrolling(false);
    }
  };

  // Aggregated metrics
  const totalEnrolled = courses.reduce((acc, c) => acc + (c.enrolled_count || 0), 0);
  const totalCompleted = courses.reduce((acc, c) => acc + (c.completed_count || 0), 0);
  const totalLessons = courses.reduce((acc, c) => acc + (c.lesson_count || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Course Detail View */}
      {selectedCourse ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors font-semibold"
          >
            <ArrowLeft size={16} /> Back to All Courses
          </button>

          <div className="card p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {selectedCourse.category}
                  </span>
                  <span className="text-xs text-indigo-300 font-medium capitalize">
                    Level: {selectedCourse.level}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">{selectedCourse.title}</h1>
                <p className="text-indigo-200 text-sm mt-1 max-w-2xl">{selectedCourse.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-300 mt-4">
                  {selectedCourse.instructor_name && <span>👤 Instructor: <strong>{selectedCourse.instructor_name}</strong></span>}
                  <span>⏱️ Duration: <strong>{selectedCourse.duration_weeks} Weeks</strong></span>
                  <span>📚 <strong>{selectedCourse.lessons?.length || 0} Lessons</strong></span>
                  <span>👥 <strong>{selectedCourse.enrollments?.length || 0} Students</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCourseForm(selectedCourse);
                    setCourseModal(true);
                  }}
                  className="btn-secondary text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Edit2 size={14} /> Edit Course
                </button>
                <button
                  onClick={openNewLesson}
                  className="btn-primary text-xs bg-indigo-500 hover:bg-indigo-400 text-white"
                >
                  <Plus size={14} /> Add Lesson
                </button>
                <button
                  onClick={openEnrollModal}
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Users size={14} /> Enroll Member
                </button>
              </div>
            </div>
          </div>

          {/* Course View Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === 'lessons' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Curriculum & Lessons ({selectedCourse.lessons?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === 'students' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Enrolled Students ({selectedCourse.enrollments?.length || 0})
            </button>
          </div>

          {activeTab === 'lessons' && (
            <div className="space-y-3">
              {(!selectedCourse.lessons || selectedCourse.lessons.length === 0) ? (
                <div className="card p-12 text-center">
                  <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-700 font-semibold">No lessons added to this course yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start building your discipleship curriculum with lessons, scripture, and study notes.</p>
                  <button onClick={openNewLesson} className="btn-primary mt-4 inline-flex items-center gap-1.5">
                    <Plus size={15} /> Add First Lesson
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {selectedCourse.lessons.map((lesson, idx) => (
                    <div key={lesson.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-gray-300 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {lesson.order_num || idx + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{lesson.title}</h3>
                          {lesson.scripture_references && (
                            <p className="text-xs text-indigo-600 font-medium mt-0.5">
                              📖 {lesson.scripture_references}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {lesson.duration_minutes || 20} mins</span>
                            {lesson.video_url && <span className="flex items-center gap-1 text-sky-600"><Video size={12} /> Video Attached</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setLessonForm(lesson);
                            setLessonModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600"
                          title="Edit Lesson"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                          title="Delete Lesson"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="card overflow-hidden">
              {(!selectedCourse.enrollments || selectedCourse.enrollments.length === 0) ? (
                <div className="p-12 text-center text-gray-500">
                  <Users size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-medium">No students enrolled yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Members can self-enroll from their Member Portal or you can enroll them directly.</p>
                  <button onClick={openEnrollModal} className="btn-primary btn-sm mt-3 inline-flex items-center gap-1">
                    <Plus size={14} /> Enroll Member
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-3">Student</th>
                        <th className="text-left px-4 py-3">Contact</th>
                        <th className="text-left px-4 py-3">Progress</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Enrolled</th>
                        <th className="text-left px-4 py-3">Certificate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedCourse.enrollments.map(en => (
                        <tr key={en.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{en.first_name} {en.last_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{en.member_number}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <div>{en.email}</div>
                            <div>{en.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-32">
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span>{en.progress_percent || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    en.progress_percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${en.progress_percent || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {en.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 size={12} /> Graduated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {en.enrolled_at ? format(new Date(en.enrolled_at), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono font-medium text-emerald-700">
                            {en.certificate_code || 'Pending Completion'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Courses Overview */
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="page-title flex items-center gap-2.5">
                Discipleship & Training School
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {courses.length} Courses
                </span>
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Equip your church members with structured discipleship classes, foundational training, and leadership programs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {courses.length === 0 && (
                <button
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="btn-secondary flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                >
                  {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-indigo-600" />}
                  <span>Seed Believer&apos;s Foundation School</span>
                </button>
              )}
              <button onClick={openNewCourse} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={15} /> Create Course / Class
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Courses', value: courses.length, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Total Enrolled', value: totalEnrolled, icon: Users, color: 'text-brand-600 bg-brand-50' },
              { label: 'Graduates / Certified', value: totalCompleted, icon: Award, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Curriculum Lessons', value: totalLessons, icon: BookOpen, color: 'text-sky-600 bg-sky-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
                  <Icon size={16} className={color.split(' ')[0]} />
                </div>
                <p className="text-2xl font-bold font-display text-gray-900">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="card p-3 flex flex-wrap gap-2.5 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 text-xs py-1.5 h-9"
                placeholder="Search courses, curriculum, instructor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input text-xs h-9 w-auto pr-8 py-1.5"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="foundation">Foundation Class</option>
              <option value="discipleship">Discipleship</option>
              <option value="leadership">Leadership Academy</option>
              <option value="workers">Workers Training</option>
              <option value="bible_study">Bible Study</option>
            </select>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-brand-600" />
            </div>
          ) : courses.length === 0 ? (
            <div className="card p-12 text-center">
              <GraduationCap size={44} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No discipleship courses found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Create your church foundation school, workers training, or leadership classes so your members can take them online.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={handleSeedDefaults} disabled={seeding} className="btn-secondary text-xs">
                  <Sparkles size={14} /> Seed Standard Foundation Class
                </button>
                <button onClick={openNewCourse} className="btn-primary text-xs">
                  <Plus size={14} /> Create Custom Course
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <div key={course.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-700'}`}>
                        {course.category}
                      </span>
                      <span className="text-[11px] text-gray-400 capitalize">{course.level}</span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-gray-900 leading-snug">{course.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description || 'No description provided.'}</p>

                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Lessons</span>
                        <span className="font-semibold text-gray-800">{course.lesson_count || 0} Modules</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Duration</span>
                        <span className="font-semibold text-gray-800">{course.duration_weeks || 4} Weeks</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Enrolled Students</span>
                        <span className="font-semibold text-indigo-700">{course.enrolled_count || 0} Students</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => loadCourseDetails(course.id)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <span>Manage Syllabus & Students</span>
                      <ChevronRight size={13} />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCourseForm(course);
                          setCourseModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-brand-600 rounded"
                        title="Edit Course"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                        title="Delete Course"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Course Modal */}
      <Modal
        open={courseModal}
        onClose={() => setCourseModal(false)}
        title={courseForm.id ? 'Edit Discipleship Course' : 'Create New Discipleship Program'}
        size="md"
        footer={<>
          <button onClick={() => setCourseModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveCourse} disabled={savingCourse} className="btn-primary">
            {savingCourse ? <Loader2 size={14} className="animate-spin" /> : 'Save Course'}
          </button>
        </>}
      >
        <form onSubmit={handleSaveCourse} className="space-y-3.5">
          <div>
            <label className="label">Course Title *</label>
            <input
              className="input"
              placeholder="e.g. Believer's Foundation School"
              value={courseForm.title}
              onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={courseForm.category}
                onChange={e => setCourseForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="foundation">Foundation Class</option>
                <option value="discipleship">Discipleship</option>
                <option value="leadership">Leadership Academy</option>
                <option value="workers">Workers Training</option>
                <option value="bible_study">Bible Study</option>
              </select>
            </div>
            <div>
              <label className="label">Level</label>
              <select
                className="input"
                value={courseForm.level}
                onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))}
              >
                <option value="beginner">Beginner / New Convert</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced / Leadership</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Instructor / Teacher Name</label>
              <input
                className="input"
                placeholder="e.g. Pastor David"
                value={courseForm.instructorName || ''}
                onChange={e => setCourseForm(f => ({ ...f, instructorName: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Duration (Weeks)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={courseForm.durationWeeks || 4}
                onChange={e => setCourseForm(f => ({ ...f, durationWeeks: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Course Description</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="What spiritual truths or skills will the student gain?"
              value={courseForm.description || ''}
              onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Create / Edit Lesson Modal */}
      <Modal
        open={lessonModal}
        onClose={() => setLessonModal(false)}
        title={lessonForm.id ? 'Edit Lesson' : 'Add Lesson to Course Syllabus'}
        size="lg"
        footer={<>
          <button onClick={() => setLessonModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSaveLesson} disabled={savingLesson} className="btn-primary">
            {savingLesson ? <Loader2 size={14} className="animate-spin" /> : 'Save Lesson'}
          </button>
        </>}
      >
        <form onSubmit={handleSaveLesson} className="space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Lesson Title *</label>
            <input
              className="input"
              placeholder="e.g. Lesson 1: The New Birth & Assurance of Salvation"
              value={lessonForm.title}
              onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Key Scripture Passages</label>
              <input
                className="input"
                placeholder="e.g. John 3:1-8, 2 Cor 5:17"
                value={lessonForm.scriptureReferences || ''}
                onChange={e => setLessonForm(f => ({ ...f, scriptureReferences: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Estimated Reading / Study Time (Minutes)</label>
              <input
                type="number"
                min="5"
                className="input"
                value={lessonForm.durationMinutes || 20}
                onChange={e => setLessonForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 20 }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Video URL (YouTube or Vimeo Embed - Optional)</label>
            <input
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={lessonForm.videoUrl || ''}
              onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Lesson Teaching Notes & Content *</label>
            <textarea
              className="input min-h-[160px] font-mono text-xs"
              placeholder="Enter markdown or lesson notes for students to read..."
              value={lessonForm.content}
              onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Enroll Member Modal */}
      <Modal
        open={enrollModal}
        onClose={() => setEnrollModal(false)}
        title="Enroll Church Member into Course"
        size="md"
        footer={<>
          <button onClick={() => setEnrollModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEnrollMember} disabled={enrolling} className="btn-primary">
            {enrolling ? <Loader2 size={14} className="animate-spin" /> : 'Enroll Member'}
          </button>
        </>}
      >
        <form onSubmit={handleEnrollMember} className="space-y-4">
          <div>
            <label className="label">Select Member</label>
            <select
              className="input"
              value={enrollMemberId}
              onChange={e => setEnrollMemberId(e.target.value)}
              required
            >
              <option value="">Choose a member from church directory...</option>
              {membersList.map(m => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name} ({m.email || m.phone || m.member_number})
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Once enrolled, this course will immediately appear on the member&apos;s personal portal under &quot;Discipleship &amp; Training&quot;.
          </p>
        </form>
      </Modal>
    </div>
  );
}
