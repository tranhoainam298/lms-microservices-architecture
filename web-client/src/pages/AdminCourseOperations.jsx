import React, { useEffect, useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { apiUrl } from '../config/api';
import { adminApi } from '../features/admin/api/adminApi';

const emptyFilters = { dateFrom: '', dateTo: '', category: '', instructorId: '', courseStatus: '', loginStatus: '' };

async function fetchProtected(path, accessToken, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The requested information could not be loaded.');
  return body;
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminCourseOperations({ accessToken, mode = 'courses' }) {
  const showActivity = mode === 'activity';
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [courseReport, setCourseReport] = useState(null);
  const [activityReport, setActivityReport] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingCourseId, setChangingCourseId] = useState(null);
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      setLoading(true);
      setError('');
      try {
        if (showActivity) {
          const activity = await adminApi.getActivityReport(accessToken, {
            page: activityPage,
            pageSize: 20,
            dateFrom: appliedFilters.dateFrom,
            dateTo: appliedFilters.dateTo,
            status: appliedFilters.loginStatus
          });
          if (!cancelled) {
            setActivityReport(activity);
            setCourseReport(null);
            setInstructors([]);
          }
          return;
        }

        const [courses, instructorAccounts] = await Promise.all([
          adminApi.getCourseReport(accessToken, {
            dateFrom: appliedFilters.dateFrom,
            dateTo: appliedFilters.dateTo,
            category: appliedFilters.category,
            instructorId: appliedFilters.instructorId,
            status: appliedFilters.courseStatus
          }),
          adminApi.getUsers(accessToken, { role: 'instructor', page: 1, pageSize: 100 })
        ]);
        if (!cancelled) {
          setCourseReport(courses);
          setActivityReport(null);
          setInstructors(instructorAccounts.items || []);
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (accessToken) loadWorkspace();
    return () => { cancelled = true; };
  }, [accessToken, activityPage, appliedFilters, refreshKey, showActivity]);

  const applyFilters = event => {
    event.preventDefault();
    setActivityPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setActivityPage(1);
  };

  const changeCourseStatus = async (course, nextStatus) => {
    if (!nextStatus || nextStatus === course.status) return;
    if (!window.confirm(`Change ${course.title} from ${course.status} to ${nextStatus}?`)) return;
    setChangingCourseId(course.id);
    setError('');
    try {
      await fetchProtected(`/courses/admin/${course.id}/status`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingCourseId(null);
    }
  };

  const saveCourseCategory = async course => {
    const category = String(categoryDrafts[course.id] ?? course.category ?? '').trim();
    if (!category || category === (course.category || '')) return;
    setChangingCourseId(course.id);
    setError('');
    try {
      await fetchProtected(`/courses/admin/${course.id}/category`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ category })
      });
      setCategoryDrafts(value => {
        const next = { ...value };
        delete next[course.id];
        return next;
      });
      setRefreshKey(value => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setChangingCourseId(null);
    }
  };

  const courseSummary = courseReport?.summary || {};
  const courses = courseReport?.items || [];
  const activitySummary = activityReport?.summary || {};
  const activities = activityReport?.items || [];
  const instructorById = new Map(instructors.map(instructor => [Number(instructor.id), instructor]));
  const title = showActivity ? 'Activity report' : 'Courses and categories';
  const description = showActivity
    ? 'Review sign-in outcomes and investigate recent account access activity.'
    : 'Review course availability, category assignments, enrollment totals, and moderation status.';

  return <section className="page-stack" data-admin-view={mode}>
    <header className="page-intro">
      <p className="page-kicker">Administration</p>
      <h2 className="page-title">{title}</h2>
      <p className="page-description">{description}</p>
    </header>

    <form className="card revenue-toolbar" onSubmit={applyFilters}>
      <div className="revenue-filter"><label htmlFor={`${mode}-date-from`}>From date</label><input id={`${mode}-date-from`} className="form-control" type="date" value={filters.dateFrom} onChange={event => setFilters(value => ({ ...value, dateFrom: event.target.value }))} /></div>
      <div className="revenue-filter"><label htmlFor={`${mode}-date-to`}>To date</label><input id={`${mode}-date-to`} className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={event => setFilters(value => ({ ...value, dateTo: event.target.value }))} /></div>
      {showActivity ? <div className="revenue-filter"><label htmlFor="activity-login-status">Sign-in result</label><select id="activity-login-status" className="form-control" value={filters.loginStatus} onChange={event => setFilters(value => ({ ...value, loginStatus: event.target.value }))}><option value="">All results</option><option value="success">Successful</option><option value="failed">Failed</option></select></div> : <>
        <div className="revenue-filter"><label htmlFor="operations-category">Category</label><input id="operations-category" className="form-control" maxLength="255" placeholder="All categories" value={filters.category} onChange={event => setFilters(value => ({ ...value, category: event.target.value }))} /></div>
        <div className="revenue-filter"><label htmlFor="operations-instructor">Instructor</label><select id="operations-instructor" className="form-control" value={filters.instructorId} onChange={event => setFilters(value => ({ ...value, instructorId: event.target.value }))}><option value="">All instructors</option>{instructors.map(instructor => <option key={instructor.id} value={instructor.id}>{instructor.fullName || instructor.email}</option>)}</select></div>
        <div className="revenue-filter"><label htmlFor="operations-course-status">Course status</label><select id="operations-course-status" className="form-control" value={filters.courseStatus} onChange={event => setFilters(value => ({ ...value, courseStatus: event.target.value }))}><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="rejected">Rejected</option></select></div>
      </>}
      <button className="btn btn-primary" type="submit">Apply filters</button>
      <button className="btn btn-secondary" type="button" onClick={resetFilters}>Reset</button>
    </form>

    {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}
    {loading ? <div className="card" role="status">Loading {showActivity ? 'account activity' : 'course operations'}...</div> : showActivity ? activityReport && <>
      <div className="metrics-grid">
        <StatCard eyebrow="Account access" title="Sign-in attempts" value={activitySummary.totalAttempts || 0} description={`${activitySummary.activeUsers || 0} active accounts`} tone="primary" />
        <StatCard eyebrow="Successful access" title="Successful sign-ins" value={activitySummary.successfulLogins || 0} description="Authenticated sessions" tone="success" />
        <StatCard eyebrow="Access review" title="Failed sign-ins" value={activitySummary.failedLogins || 0} description="Attempts requiring review" />
      </div>

      <section className="card" aria-labelledby="account-activity-title">
        <div className="section-heading"><div><p className="section-label">Account activity</p><h2 id="account-activity-title">Recent sign-in attempts</h2></div><span className="section-heading__meta">{activityReport.total || 0} attempts</span></div>
        {activities.length === 0 ? <div role="status">No sign-in activity matches the selected filters.</div> : <div className="table-container"><table className="table"><thead><tr><th>Account</th><th>Role</th><th>Result</th><th>Details</th><th>Time</th></tr></thead><tbody>{activities.map(activity => <tr key={activity.id}><td>{activity.email || 'Unknown account'}{activity.fullName && <><br /><small>{activity.fullName}</small></>}</td><td>{activity.role || 'Not recorded'}</td><td><StatusBadge status={activity.status} /></td><td>{activity.failureReason || 'Signed in'}</td><td>{formatDate(activity.occurredAt)}</td></tr>)}</tbody></table></div>}
        <div className="pagination-controls"><button className="btn btn-secondary" type="button" disabled={activityPage <= 1 || loading} onClick={() => setActivityPage(page => page - 1)}>Previous</button><span>Page {activityReport.page || activityPage}</span><button className="btn btn-secondary" type="button" disabled={activityPage * (activityReport.pageSize || 20) >= (activityReport.total || 0) || loading} onClick={() => setActivityPage(page => page + 1)}>Next</button></div>
      </section>
    </> : courseReport && <>
      <div className="metrics-grid">
        <StatCard eyebrow="Course catalog" title="Courses" value={courseSummary.totalCourses || 0} description={`${courseSummary.publishedCourses || 0} published`} tone="primary" />
        <StatCard eyebrow="Course authoring" title="Draft courses" value={courseSummary.draftCourses || 0} description="Not visible in the public catalog" />
        <StatCard eyebrow="Course review" title="Awaiting review" value={courseSummary.pendingReviewCourses || 0} description={`${courseSummary.rejectedCourses || 0} rejected`} />
        <StatCard eyebrow="Enrollment" title="Active enrollments" value={courseSummary.activeEnrollments || 0} description={`${courseSummary.totalEnrollments || 0} total`} tone="success" />
      </div>

      <section className="card" aria-labelledby="course-operations-title">
        <div className="section-heading"><div><p className="section-label">Course catalog</p><h2 id="course-operations-title">Course review, categories, and status</h2></div><span className="section-heading__meta">{courses.length} courses</span></div>
        {courses.length === 0 ? <div role="status">No courses match the selected filters.</div> : <div className="table-container"><table className="table"><thead><tr><th>Course</th><th>Instructor</th><th>Category</th><th>Price</th><th>Enrollment</th><th>Progress</th><th>Status</th><th>Created</th></tr></thead><tbody>{courses.map(course => {
          const instructor = instructorById.get(Number(course.instructorId));
          return <tr key={course.id}><td><strong>{course.title}</strong><br /><small>Course {course.id}</small></td><td>{instructor?.fullName || instructor?.email || `Instructor ${course.instructorId}`}</td><td><div className="inline-field"><input className="form-control" aria-label={`Category for ${course.title}`} maxLength="255" value={categoryDrafts[course.id] ?? course.category ?? ''} onChange={event => setCategoryDrafts(value => ({ ...value, [course.id]: event.target.value }))} disabled={changingCourseId !== null} /><button className="btn btn-secondary btn-sm" type="button" onClick={() => saveCourseCategory(course)} disabled={changingCourseId !== null || !String(categoryDrafts[course.id] ?? '').trim() || String(categoryDrafts[course.id]).trim() === (course.category || '')}>Save</button></div></td><td>{Number(course.price || 0).toLocaleString()}</td><td>{course.activeEnrollmentCount} active / {course.enrollmentCount} total</td><td><ProgressBar value={course.averageProgress} label="Average progress" /></td><td><select className="form-control" aria-label={`Status for ${course.title}`} value={course.status} onChange={event => changeCourseStatus(course, event.target.value)} disabled={changingCourseId !== null}><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="rejected">Rejected</option></select>{changingCourseId === course.id && <small>Saving...</small>}</td><td>{formatDate(course.createdAt)}</td></tr>;
        })}</tbody></table></div>}
      </section>
    </>}
  </section>;
}
