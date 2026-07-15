import React from 'react';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { studentApi } from '../features/student/api/studentApi';

export default function CourseDetailPage({ courseId, isEnrolled, enrollment, onBack, onContinue, onBuy, onEnrollFree, requiresSignIn = false, onRequireSignIn }) {
  const [course, setCourse] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [enrolling, setEnrolling] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    async function loadCourse() {
      if (!courseId) {
        setError('Choose a course from the catalog.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const body = await studentApi.getCourseDetail(courseId);
        if (!cancelled) setCourse(body.course);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCourse();
    return () => { cancelled = true; };
  }, [courseId]);

  const handlePrimaryAction = async () => {
    if (!course || enrolling) return;
    if (requiresSignIn) {
      onRequireSignIn?.();
      return;
    }
    if (isEnrolled) {
      onContinue(course);
      return;
    }
    if (Number(course.price || 0) > 0) {
      onBuy(course);
      return;
    }
    setEnrolling(true);
    setError('');
    try {
      await onEnrollFree(course.id);
      onContinue(course);
    } catch (requestError) {
      setError(requestError.message || 'The course could not be enrolled.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <section className="card" role="status">Loading course information...</section>;
  if (error && !course) return <section className="card empty-state" role="alert"><strong>Course unavailable</strong><p>{error}</p><button className="btn btn-secondary" type="button" onClick={onBack}>Back to catalog</button></section>;

  const lessons = course?.lessons || [];
  const progress = Number(enrollment?.progress_percent || 0);
  const instructorName = course?.instructor?.fullName || 'Instructor profile unavailable';

  return (
    <section className="page-stack" aria-labelledby="course-detail-title">
      <header className="page-intro">
        <button className="btn btn-ghost" type="button" onClick={onBack}>&larr; Back to courses</button>
        <p className="page-kicker">{course.category || 'Course catalog'}</p>
        <h2 className="page-title" id="course-detail-title">{course.title}</h2>
        <p className="page-description">{course.description}</p>
      </header>

      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}

      <div className="checkout-layout">
        <div className="page-stack">
          <section className="card" aria-labelledby="course-overview-title">
            <div className="section-heading"><div><p className="section-label">Course information</p><h3 id="course-overview-title">What you will learn</h3></div><StatusBadge status={isEnrolled ? 'active' : course.status} /></div>
            <dl className="draft-metadata-list">
              <div><dt>Instructor</dt><dd>{instructorName}</dd></div>
              <div><dt>Category</dt><dd>{course.category || 'Uncategorized'}</dd></div>
              <div><dt>Lessons</dt><dd>{course.lessonCount || lessons.length}</dd></div>
              <div><dt>Access</dt><dd>{isEnrolled ? 'Enrolled' : Number(course.price || 0) === 0 ? 'Free enrollment' : 'Available after payment'}</dd></div>
            </dl>
            {isEnrolled && <ProgressBar value={progress} label="Your course progress" tone={progress === 100 ? 'success' : 'primary'} />}
          </section>

          <section className="card" aria-labelledby="course-outline-preview-title">
            <div className="section-heading"><div><p className="section-label">Preview</p><h3 id="course-outline-preview-title">Course outline</h3></div><span className="section-heading__meta">{lessons.length} lessons</span></div>
            {lessons.length === 0 ? <div className="empty-state" role="status">The instructor has not published a lesson outline yet.</div> : <ol className="lesson-authoring-list">{lessons.map((lesson, index) => <li className="lesson-authoring-item" key={lesson.id}><div><strong>{index + 1}. {lesson.title}</strong><div>{lesson.type || 'Text'} lesson</div></div><StatusBadge status={isEnrolled ? 'ready' : 'pending'} /></li>)}</ol>}
          </section>
        </div>

        <aside className="card checkout-panel" aria-labelledby="course-enrollment-title">
          <p className="section-kicker">Course access</p>
          <h3 id="course-enrollment-title">{isEnrolled ? 'Continue your learning' : 'Start this course'}</h3>
          <div className="checkout-total"><span>Course price</span><strong>{Number(course.price || 0) === 0 ? 'Free' : `$${Number(course.price).toFixed(2)}`}</strong></div>
          <p>{isEnrolled ? 'Your access is active and saved progress is ready.' : requiresSignIn ? 'Sign in with a student account to enroll or complete checkout.' : Number(course.price || 0) === 0 ? 'Enroll now and begin learning immediately.' : 'Complete secure checkout to unlock every lesson.'}</p>
          <button className="btn btn-primary w-full" type="button" onClick={handlePrimaryAction} disabled={enrolling}>{requiresSignIn ? 'Sign in to enroll' : enrolling ? 'Enrolling...' : isEnrolled ? 'Continue Learning' : Number(course.price || 0) === 0 ? 'Enroll for free' : 'Buy Course'}</button>
        </aside>
      </div>
    </section>
  );
}
