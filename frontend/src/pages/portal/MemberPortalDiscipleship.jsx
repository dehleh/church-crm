import { useState, useEffect } from 'react';
import {
  GraduationCap, BookOpen, CheckCircle2, PlayCircle, Clock,
  ArrowRight, Award, ChevronLeft, ChevronRight, Video, FileText,
  Loader2, Sparkles, Send, Check
} from 'lucide-react';
import { memberPortalAPI } from '../../api/memberClient';
import toast from 'react-hot-toast';

export default function MemberPortalDiscipleship() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active classroom state
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [completing, setCompleting] = useState(false);
  const [enrollingId, setEnrollingId] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await memberPortalAPI.listDiscipleshipCourses();
      setCourses(res.data.data || []);
    } catch {
      toast.error('Failed to load discipleship courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openClassroom = async (courseId) => {
    setActiveCourseId(courseId);
    setLoadingDetails(true);
    try {
      const res = await memberPortalAPI.getDiscipleshipCourse(courseId);
      setCourseDetails(res.data.data);
      // Default to first incomplete lesson, or first lesson
      const lessons = res.data.data.lessons || [];
      const firstIncomplete = lessons.findIndex(l => !l.is_completed);
      const startIdx = firstIncomplete >= 0 ? firstIncomplete : 0;
      setActiveLessonIdx(startIdx);
      setReflectionText(lessons[startIdx]?.reflection_notes || '');
    } catch {
      toast.error('Failed to load course classroom');
      setActiveCourseId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEnroll = async (courseId) => {
    setEnrollingId(courseId);
    try {
      await memberPortalAPI.enrollDiscipleshipCourse(courseId);
      toast.success('Successfully enrolled! Opening classroom...');
      await fetchCourses();
      openClassroom(courseId);
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleCompleteLesson = async () => {
    const lessons = courseDetails?.lessons || [];
    const currentLesson = lessons[activeLessonIdx];
    if (!currentLesson) return;

    setCompleting(true);
    try {
      const res = await memberPortalAPI.completeLesson(currentLesson.id, {
        reflectionNotes: reflectionText,
      });

      toast.success(res.data.message || 'Lesson completed!');

      // Reload course details to reflect updated progress
      const updated = await memberPortalAPI.getDiscipleshipCourse(activeCourseId);
      setCourseDetails(updated.data.data);
      fetchCourses();

      // Advance to next lesson if available
      if (activeLessonIdx < lessons.length - 1) {
        const nextIdx = activeLessonIdx + 1;
        setActiveLessonIdx(nextIdx);
        setReflectionText(updated.data.data.lessons[nextIdx]?.reflection_notes || '');
      }
    } catch {
      toast.error('Failed to complete lesson');
    } finally {
      setCompleting(false);
    }
  };

  const selectLesson = (idx) => {
    setActiveLessonIdx(idx);
    const lesson = courseDetails?.lessons?.[idx];
    setReflectionText(lesson?.reflection_notes || '');
  };

  const enrolledCourses = courses.filter(c => c.enrollment_id);
  const availableCourses = courses.filter(c => !c.enrollment_id);

  if (activeCourseId) {
    if (loadingDetails || !courseDetails) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      );
    }

    const lessons = courseDetails.lessons || [];
    const currentLesson = lessons[activeLessonIdx];
    const isFinished = courseDetails.progress_percent === 100;

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Back header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveCourseId(null)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 font-semibold transition-colors"
          >
            <ChevronLeft size={16} /> Back to Courses
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Course Progress:</span>
            <div className="w-28 sm:w-36 bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${courseDetails.progress_percent || 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-800">{courseDetails.progress_percent || 0}%</span>
          </div>
        </div>

        {/* Graduation celebration banner if finished */}
        {isFinished && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl flex-shrink-0">
                🎓
              </div>
              <div>
                <h3 className="text-lg font-bold">Course Completed & Certified!</h3>
                <p className="text-xs text-emerald-100">
                  Congratulations! You have completed all lessons in {courseDetails.title}.
                </p>
                {courseDetails.certificate_code && (
                  <p className="text-xs font-mono font-bold text-white mt-1 bg-white/20 px-2 py-0.5 rounded inline-block">
                    Certificate Code: {courseDetails.certificate_code}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-xs">
              ✓ Verified Graduate
            </span>
          </div>
        )}

        {/* Classroom 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lessons Syllabus Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {courseDetails.category}
              </span>
              <h2 className="font-bold font-display text-gray-900 text-base mt-1">{courseDetails.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{lessons.length} Modules &amp; Lessons</p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100 max-h-[60vh] overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const isSelected = activeLessonIdx === idx;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold shadow-xs'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {lesson.is_completed ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-gray-300 text-gray-400'
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate leading-snug">{lesson.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>{lesson.duration_minutes || 20}m</span>
                        {lesson.video_url && <span>• Video</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lesson Study Desk & Content */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
            {currentLesson ? (
              <>
                <div className="space-y-2 border-b border-gray-100 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600">
                      Lesson {activeLessonIdx + 1} of {lessons.length}
                    </span>
                    {currentLesson.is_completed && (
                      <span className="badge badge-green text-[10px] font-bold">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold font-display text-gray-900">{currentLesson.title}</h1>

                  {currentLesson.scripture_references && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-600 flex-shrink-0" />
                      <span>
                        <strong>Key Scriptures for Study:</strong> {currentLesson.scripture_references}
                      </span>
                    </div>
                  )}
                </div>

                {/* Video Lesson (if present) */}
                {currentLesson.video_url && (
                  <div className="rounded-xl overflow-hidden aspect-video bg-black/90">
                    <iframe
                      src={currentLesson.video_url.replace('watch?v=', 'embed/')}
                      title={currentLesson.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Lesson Notes & Teaching Text */}
                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-line bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                  {currentLesson.content}
                </div>

                {/* Personal Reflection & Study Notes */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="label flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Your Study Reflection &amp; Key Takeaways</span>
                    <span className="text-[11px] text-gray-400 font-normal">Saved to your profile</span>
                  </label>
                  <textarea
                    className="input min-h-[90px] text-xs"
                    placeholder="Write what the Holy Spirit taught you through this lesson, personal prayer, or questions..."
                    value={reflectionText}
                    onChange={e => setReflectionText(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <button
                    disabled={activeLessonIdx <= 0}
                    onClick={() => selectLesson(activeLessonIdx - 1)}
                    className="btn-secondary text-xs disabled:opacity-40 w-full sm:w-auto"
                  >
                    ← Previous Lesson
                  </button>

                  <button
                    onClick={handleCompleteLesson}
                    disabled={completing}
                    className="btn-primary text-xs w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {completing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>
                      {currentLesson.is_completed ? 'Update Notes & Save' : 'Mark as Complete & Next →'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BookOpen size={36} className="mx-auto text-gray-300 mb-2" />
                <p>No lesson selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative overflow-hidden shadow-lg border border-indigo-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-1">
              Spiritual Growth &amp; Development
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
              Discipleship &amp; Training Classes
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
              Take your faith deeper through structured Bible courses, foundation classes, leadership modules, and spiritual mentorship.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-indigo-300">
            <GraduationCap size={30} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Enrolled Courses */}
          {enrolledCourses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold font-display text-gray-900 flex items-center gap-2">
                <span>My Enrolled Courses</span>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                  {enrolledCourses.length}
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledCourses.map(course => {
                  const isGraduated = course.enrollment_status === 'completed' || course.progress_percent === 100;
                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            {course.category}
                          </span>
                          {isGraduated ? (
                            <span className="badge badge-green text-[10px] font-bold">
                              ✓ Completed
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-indigo-600">
                              {course.progress_percent || 0}% Completed
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-gray-900 text-base">{course.title}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>

                        <div className="pt-2">
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all"
                              style={{ width: `${course.progress_percent || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => openClassroom(course.id)}
                        className="btn-primary text-xs py-2 w-full justify-center flex items-center gap-1.5"
                      >
                        <PlayCircle size={14} />
                        <span>{isGraduated ? 'Review Course Material' : 'Continue Learning'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Courses Catalog */}
          <div className="space-y-3">
            <h2 className="text-base font-bold font-display text-gray-900">
              Available Church Courses &amp; Programs ({availableCourses.length})
            </h2>

            {availableCourses.length === 0 && enrolledCourses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
                <BookOpen size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-gray-800">No discipleship courses published yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Please check back soon or consult church leadership.</p>
              </div>
            ) : availableCourses.length === 0 ? (
              <p className="text-xs text-gray-400 italic">You are enrolled in all available courses!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCourses.map(course => (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {course.category}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">{course.level}</span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base">{course.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>

                      <div className="flex items-center gap-3 text-xs text-gray-400 pt-2">
                        <span>📚 {course.lesson_count || 0} Lessons</span>
                        <span>⏱️ {course.duration_weeks || 4} Weeks</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                      className="mt-4 btn-primary text-xs py-2 w-full justify-center flex items-center gap-1.5"
                    >
                      {enrollingId === course.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <GraduationCap size={14} />
                      )}
                      <span>Enroll in Course</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
