import React, { useEffect, useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { apiUrl } from '../config/api';

async function fetchProtected(path, accessToken) {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The requested information could not be loaded.');
  return body;
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function InstructorMonitoring({ accessToken }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [progressReport, setProgressReport] = useState(null);
  const [resultReport, setResultReport] = useState(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      setCoursesLoading(true);
      setError('');
      try {
        const body = await fetchProtected('/courses/instructor/mine', accessToken);
        if (cancelled) return;
        const items = Array.isArray(body.items) ? body.items : [];
        setCourses(items);
        setSelectedCourseId(current => {
          if (items.some(course => String(course.id) === String(current))) return current;
          return items[0] ? String(items[0].id) : '';
        });
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }
    if (accessToken) loadCourses();
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadReports() {
      if (!selectedCourseId) {
        setProgressReport(null);
        setResultReport(null);
        return;
      }
      setReportLoading(true);
      setError('');
      try {
        const [progress, results] = await Promise.all([
          fetchProtected(`/courses/instructor/${selectedCourseId}/progress`, accessToken),
          fetchProtected(`/exams/courses/${selectedCourseId}/results/summary`, accessToken)
        ]);
        if (cancelled) return;
        setProgressReport(progress);
        setResultReport(results);
      } catch (requestError) {
        if (!cancelled) {
          setProgressReport(null);
          setResultReport(null);
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }
    if (accessToken) loadReports();
    return () => { cancelled = true; };
  }, [accessToken, selectedCourseId, refreshKey]);

  const selectedCourse = courses.find(course => String(course.id) === selectedCourseId);
  const progressSummary = progressReport?.summary || {};
  const resultSummary = resultReport?.summary || {};
  const enrollmentItems = progressReport?.items || [];
  const quizItems = resultReport?.quizzes || [];
  const resultItems = resultReport?.results || [];

  if (coursesLoading) {
    return <section className="page-stack"><div className="card" role="status">Loading your courses...</div></section>;
  }

  return <section className="page-stack">
    <header className="page-intro">
      <p className="page-kicker">Instructor workspace</p>
      <h2 className="page-title">Student learning overview</h2>
      <p className="page-description">Follow enrollment, course completion, and quiz outcomes for courses you own.</p>
    </header>

    {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}

    {courses.length === 0 ? <div className="card" role="status"><strong>No courses available</strong><p>Create a course before reviewing student activity.</p></div> : <>
      <div className="card revenue-toolbar">
        <div className="revenue-filter">
          <label htmlFor="monitoring-course">Course</label>
          <select id="monitoring-course" className="form-control" value={selectedCourseId} onChange={event => setSelectedCourseId(event.target.value)}>
            {courses.map(course => <option key={course.id} value={course.id}>{course.title} ({course.status})</option>)}
          </select>
        </div>
        <div>
          <strong>{selectedCourse?.title}</strong>
          <p className="text-sm text-secondary-color">{selectedCourse?.lessonCount || 0} lessons / {selectedCourse?.enrollmentCount || 0} enrollments</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={reportLoading}>Refresh</button>
      </div>

      {reportLoading ? <div className="card" role="status">Loading student progress and quiz results...</div> : progressReport && resultReport && <>
        <div className="metrics-grid">
          <StatCard eyebrow="Enrollment" title="Active students" value={progressSummary.activeEnrollments || 0} description={`${progressSummary.totalEnrollments || 0} total enrollments`} tone="primary" />
          <StatCard eyebrow="Course progress" title="Average progress" value={`${progressSummary.averageProgress || 0}%`} description={`${progressSummary.completedEnrollments || 0} students completed`} tone="success" />
          <StatCard eyebrow="Assessments" title="Quiz attempts" value={resultSummary.attemptCount || 0} description={`${resultSummary.quizCount || 0} quizzes tracked`} />
          <StatCard eyebrow="Quiz performance" title="Average score" value={`${resultSummary.averagePercentage || 0}%`} description={`${resultSummary.passedCount || 0} passing attempts`} />
        </div>

        <section className="card" aria-labelledby="student-progress-title">
          <div className="section-heading"><div><p className="section-label">Learning progress</p><h2 id="student-progress-title">Enrolled students</h2></div><span className="section-heading__meta">{enrollmentItems.length} records</span></div>
          {enrollmentItems.length === 0 ? <div role="status">No students are enrolled in this course yet.</div> : <div className="table-container"><table className="table"><thead><tr><th>Student</th><th>Status</th><th>Progress</th><th>Enrolled</th></tr></thead><tbody>{enrollmentItems.map(item => <tr key={item.enrollmentId}><td>Student {item.studentId}</td><td><StatusBadge status={item.status} /></td><td><ProgressBar value={item.progressPercent} label="Course progress" /></td><td>{formatDate(item.enrolledAt)}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="card" aria-labelledby="quiz-summary-title">
          <div className="section-heading"><div><p className="section-label">Assessment results</p><h2 id="quiz-summary-title">Quiz summary</h2></div><span className="section-heading__meta">{quizItems.length} quizzes</span></div>
          {quizItems.length === 0 ? <div role="status">No quizzes are available for this course.</div> : <div className="table-container"><table className="table"><thead><tr><th>Quiz</th><th>Status</th><th>Attempts</th><th>Average score</th></tr></thead><tbody>{quizItems.map(quiz => <tr key={quiz.id}><td>{quiz.title}</td><td><StatusBadge status={quiz.status} /></td><td>{quiz.attemptCount}</td><td>{quiz.averagePercentage}%</td></tr>)}</tbody></table></div>}
        </section>

        <section className="card" aria-labelledby="quiz-attempts-title">
          <div className="section-heading"><div><p className="section-label">Recent activity</p><h2 id="quiz-attempts-title">Student quiz attempts</h2></div><span className="section-heading__meta">{resultItems.length} attempts</span></div>
          {resultItems.length === 0 ? <div role="status">No quiz attempts have been submitted.</div> : <div className="table-container"><table className="table"><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Result</th><th>Submitted</th></tr></thead><tbody>{resultItems.map(result => <tr key={result.id}><td>Student {result.studentId}</td><td>{result.quizTitle}</td><td>{result.score} / {result.maximumScore} ({result.percentage}%)</td><td><StatusBadge status={result.passed ? 'completed' : 'failed'} /></td><td>{formatDate(result.submittedAt)}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
    </>}
  </section>;
}
