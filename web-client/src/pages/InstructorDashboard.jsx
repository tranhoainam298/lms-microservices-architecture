import React from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { instructorApi } from '../features/instructor/api/instructorApi';

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

export default function InstructorDashboard({ accessToken, onNavigate }) {
  const [workspace, setWorkspace] = React.useState(null);
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [courseData, resultData] = await Promise.all([
          instructorApi.getOwnedCourses(accessToken),
          instructorApi.getWorkspaceResults(accessToken)
        ]);
        if (!cancelled) {
          setWorkspace(courseData);
          setResults(resultData);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (accessToken) loadDashboard();
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  const courseSummary = workspace?.summary || {};
  const resultSummary = results?.summary || {};
  const courses = workspace?.items || [];
  const recentResults = results?.recentResults || [];
  const courseTitleById = new Map(courses.map(course => [Number(course.id), course.title]));

  return (
    <section className="page-stack" aria-labelledby="instructor-dashboard-title">
      <header className="page-intro">
        <p className="page-kicker">Instructor workspace</p>
        <h2 className="page-title" id="instructor-dashboard-title">Teaching dashboard</h2>
        <p className="page-description">Track your course portfolio, learners, progress, and recent assessment outcomes.</p>
      </header>

      {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}
      {loading ? <div className="card" role="status">Loading your teaching workspace...</div> : <>
        <div className="metrics-grid">
          <StatCard eyebrow="Course portfolio" title="My courses" value={courseSummary.totalCourses || 0} description={`${courseSummary.publishedCourses || 0} published`} tone="primary" />
          <StatCard eyebrow="Course authoring" title="Draft courses" value={courseSummary.draftCourses || 0} description="Private courses in progress" />
          <StatCard eyebrow="Learners" title="Enrolled students" value={courseSummary.uniqueStudents || 0} description={`${courseSummary.activeEnrollments || 0} active enrollments`} tone="success" />
          <StatCard eyebrow="Learning progress" title="Average progress" value={`${courseSummary.averageProgress || 0}%`} description={`${courseSummary.totalEnrollments || 0} enrollment records`} />
          <StatCard eyebrow="Assessments" title="Quiz attempts" value={resultSummary.attemptCount || 0} description={`${resultSummary.publishedQuizCount || 0} published quizzes`} />
          <StatCard eyebrow="Quiz performance" title="Average score" value={`${resultSummary.averagePercentage || 0}%`} description={`${resultSummary.passedCount || 0} passing attempts`} tone="success" />
        </div>

        <section className="card" aria-labelledby="instructor-courses-title">
          <div className="section-heading">
            <div><p className="section-label">Course portfolio</p><h2 id="instructor-courses-title">My courses</h2></div>
            <button className="btn btn-primary" type="button" onClick={() => onNavigate('course-draft')}>Create or manage courses</button>
          </div>
          {courses.length === 0 ? <div className="empty-state" role="status"><strong>No courses yet</strong><p>Create your first draft to begin adding lessons and quizzes.</p></div> : <div className="table-container"><table className="table"><thead><tr><th>Course</th><th>Status</th><th>Lessons</th><th>Students</th><th>Average progress</th><th>Updated</th></tr></thead><tbody>{courses.slice(0, 8).map(course => <tr key={course.id}><td><strong>{course.title}</strong><br /><small>{course.category || 'Uncategorized'}</small></td><td><StatusBadge status={course.status} /></td><td>{course.lessonCount || 0}</td><td>{course.activeEnrollmentCount || 0}</td><td><ProgressBar value={course.averageProgress || 0} label="Average progress" /></td><td>{formatDate(course.updatedAt || course.updated_at)}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="card" aria-labelledby="instructor-recent-results-title">
          <div className="section-heading">
            <div><p className="section-label">Assessment activity</p><h2 id="instructor-recent-results-title">Recent quiz results</h2></div>
            <button className="btn btn-secondary" type="button" onClick={() => onNavigate('instructor-results')}>Review all quiz results</button>
          </div>
          {recentResults.length === 0 ? <div className="empty-state" role="status">No student quiz attempts have been submitted yet.</div> : <div className="table-container"><table className="table"><thead><tr><th>Quiz</th><th>Course</th><th>Student</th><th>Score</th><th>Result</th><th>Submitted</th></tr></thead><tbody>{recentResults.map(result => <tr key={result.id}><td>{result.quizTitle}</td><td>{courseTitleById.get(Number(result.courseId)) || `Course ${result.courseId}`}</td><td>Student {result.studentId}</td><td>{Number(result.percentage || 0).toFixed(0)}%</td><td><StatusBadge status={result.passed ? 'completed' : 'failed'} /></td><td>{formatDate(result.submittedAt)}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
    </section>
  );
}
