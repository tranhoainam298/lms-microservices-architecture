import React from 'react';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { instructorApi } from '../features/instructor/api/instructorApi';

export default function InstructorCoursesPage({ accessToken, onNavigate }) {
  const [data, setData] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      setLoading(true);
      setError('');
      try {
        const response = await instructorApi.getOwnedCourses(accessToken);
        if (!cancelled) setData(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (accessToken) loadCourses();
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  const summary = data?.summary || {};
  const courses = (data?.items || []).filter(course => !statusFilter || course.status === statusFilter);

  return <section className="page-stack" aria-labelledby="instructor-courses-title">
    <header className="page-intro"><p className="page-kicker">Instructor workspace</p><h2 className="page-title" id="instructor-courses-title">My courses</h2><p className="page-description">Review every owned course and open the course studio to create or update draft content.</p></header>
    {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}
    {loading ? <div className="card" role="status">Loading your course portfolio...</div> : <>
      <div className="metrics-grid"><StatCard eyebrow="Portfolio" title="Owned courses" value={summary.totalCourses || 0} description={`${summary.publishedCourses || 0} published`} tone="primary" /><StatCard eyebrow="Authoring" title="Draft courses" value={summary.draftCourses || 0} description="Eligible for editing" /><StatCard eyebrow="Learners" title="Active enrollments" value={summary.activeEnrollments || 0} description={`${summary.uniqueStudents || 0} unique students`} tone="success" /></div>
      <section className="card"><div className="revenue-toolbar"><div className="revenue-filter"><label htmlFor="instructor-course-status">Course status</label><select id="instructor-course-status" className="form-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="pending_review">Pending review</option><option value="rejected">Rejected</option></select></div><button className="btn btn-primary" type="button" onClick={() => onNavigate('course-draft')}>Create Course</button></div></section>
      <section className="card" aria-labelledby="owned-course-table-title"><div className="section-heading"><div><p className="section-label">Course portfolio</p><h3 id="owned-course-table-title">Owned courses</h3></div><span className="section-heading__meta">{courses.length} shown</span></div>{courses.length === 0 ? <div className="empty-state" role="status">No courses match the selected status.</div> : <div className="table-container"><table className="table"><thead><tr><th>Course</th><th>Status</th><th>Lessons</th><th>Enrollments</th><th>Progress</th><th>Action</th></tr></thead><tbody>{courses.map(course => <tr key={course.id}><td><strong>{course.title}</strong><br /><small>{course.category || 'Uncategorized'}</small></td><td><StatusBadge status={course.status} /></td><td>{course.lessonCount || 0}</td><td>{course.activeEnrollmentCount || 0} active</td><td><ProgressBar value={course.averageProgress || 0} label="Average progress" /></td><td>{course.status === 'draft' ? <button className="btn btn-secondary btn-sm" type="button" onClick={() => onNavigate('course-draft')}>Open Course Studio</button> : <button className="btn btn-secondary btn-sm" type="button" onClick={() => onNavigate('instructor-monitoring')}>View students</button>}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </section>;
}
