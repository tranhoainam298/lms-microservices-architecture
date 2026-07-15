import React, { useEffect, useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { apiUrl } from '../config/api';

const emptyFilters = { dateFrom: '', dateTo: '', category: '', courseStatus: '', loginStatus: '' };

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

export default function AdminCourseOperations({ accessToken }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [courseReport, setCourseReport] = useState(null);
  const [activityReport, setActivityReport] = useState(null);
  const [activityPage, setActivityPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingCourseId, setChangingCourseId] = useState(null);
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadReports() {
      setLoading(true);
      setError('');
      const courseParams = new URLSearchParams();
      const activityParams = new URLSearchParams({ page: String(activityPage), pageSize: '20' });
      if (appliedFilters.dateFrom) {
        courseParams.set('dateFrom', appliedFilters.dateFrom);
        activityParams.set('dateFrom', appliedFilters.dateFrom);
      }
      if (appliedFilters.dateTo) {
        courseParams.set('dateTo', appliedFilters.dateTo);
        activityParams.set('dateTo', appliedFilters.dateTo);
      }
      if (appliedFilters.category) courseParams.set('category', appliedFilters.category);
      if (appliedFilters.courseStatus) courseParams.set('status', appliedFilters.courseStatus);
      if (appliedFilters.loginStatus) activityParams.set('status', appliedFilters.loginStatus);
      try {
        const [courses, activity] = await Promise.all([
          fetchProtected(`/courses/admin/reports/courses?${courseParams}`, accessToken),
          fetchProtected(`/users/admin/reports/activity?${activityParams}`, accessToken)
        ]);
        if (cancelled) return;
        setCourseReport(courses);
        setActivityReport(activity);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (accessToken) loadReports();
    return () => { cancelled = true; };
  }, [accessToken, appliedFilters, activityPage, refreshKey]);

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

  return <section className="page-stack">
    <header className="page-intro">
      <p className="page-kicker">Administration</p>
      <h2 className="page-title">Course and account activity</h2>
      <p className="page-description">Review course availability, enrollment totals, and recent sign-in activity.</p>
    </header>

    <form className="card revenue-toolbar" onSubmit={applyFilters}>
      <div className="revenue-filter"><label htmlFor="operations-date-from">From date</label><input id="operations-date-from" className="form-control" type="date" value={filters.dateFrom} onChange={event => setFilters(value => ({ ...value, dateFrom: event.target.value }))} /></div>
      <div className="revenue-filter"><label htmlFor="operations-date-to">To date</label><input id="operations-date-to" className="form-control" type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={event => setFilters(value => ({ ...value, dateTo: event.target.value }))} /></div>
      <div className="revenue-filter"><label htmlFor="operations-category">Category</label><input id="operations-category" className="form-control" maxLength="255" placeholder="All categories" value={filters.category} onChange={event => setFilters(value => ({ ...value, category: event.target.value }))} /></div>
      <div className="revenue-filter"><label htmlFor="operations-course-status">Course status</label><select id="operations-course-status" className="form-control" value={filters.courseStatus} onChange={event => setFilters(value => ({ ...value, courseStatus: event.target.value }))}><option value="">All statuses</option><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="rejected">Rejected</option></select></div>
      <div className="revenue-filter"><label htmlFor="operations-login-status">Sign-in result</label><select id="operations-login-status" className="form-control" value={filters.loginStatus} onChange={event => setFilters(value => ({ ...value, loginStatus: event.target.value }))}><option value="">All results</option><option value="success">Successful</option><option value="failed">Failed</option></select></div>
      <button className="btn btn-primary" type="submit">Apply filters</button>
      <button className="btn btn-secondary" type="button" onClick={resetFilters}>Reset</button>
    </form>

    {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}
    {loading ? <div className="card" role="status">Loading course and account activity...</div> : courseReport && activityReport && <>
      <div className="metrics-grid">
        <StatCard eyebrow="Course catalog" title="Courses" value={courseSummary.totalCourses || 0} description={`${courseSummary.publishedCourses || 0} published`} tone="primary" />
        <StatCard eyebrow="Course review" title="Awaiting review" value={courseSummary.pendingReviewCourses || 0} description={`${courseSummary.rejectedCourses || 0} rejected`} />
        <StatCard eyebrow="Enrollment" title="Active enrollments" value={courseSummary.activeEnrollments || 0} description={`${courseSummary.totalEnrollments || 0} total`} tone="success" />
        <StatCard eyebrow="Account access" title="Successful sign-ins" value={activitySummary.successfulLogins || 0} description={`${activitySummary.failedLogins || 0} failed attempts`} />
      </div>

      <section className="card" aria-labelledby="course-operations-title">
        <div className="section-heading"><div><p className="section-label">Course catalog</p><h2 id="course-operations-title">Course review and status</h2></div><span className="section-heading__meta">{courses.length} courses</span></div>
        {courses.length === 0 ? <div role="status">No courses match the selected filters.</div> : <div className="table-container"><table className="table"><thead><tr><th>Course</th><th>Category</th><th>Price</th><th>Enrollment</th><th>Progress</th><th>Status</th><th>Created</th></tr></thead><tbody>{courses.map(course => <tr key={course.id}><td><strong>{course.title}</strong><br /><small>Course {course.id}</small></td><td><div className="inline-field"><input className="form-control" aria-label={`Category for ${course.title}`} maxLength="255" value={categoryDrafts[course.id] ?? course.category ?? ''} onChange={event => setCategoryDrafts(value => ({ ...value, [course.id]: event.target.value }))} disabled={changingCourseId !== null} /><button className="btn btn-secondary btn-sm" type="button" onClick={() => saveCourseCategory(course)} disabled={changingCourseId !== null || !String(categoryDrafts[course.id] ?? '').trim() || String(categoryDrafts[course.id]).trim() === (course.category || '')}>Save</button></div></td><td>{Number(course.price || 0).toLocaleString()}</td><td>{course.activeEnrollmentCount} active / {course.enrollmentCount} total</td><td><ProgressBar value={course.averageProgress} label="Average progress" /></td><td><select className="form-control" aria-label={`Status for ${course.title}`} value={course.status} onChange={event => changeCourseStatus(course, event.target.value)} disabled={changingCourseId !== null}><option value="draft">Draft</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="rejected">Rejected</option></select>{changingCourseId === course.id && <small>Saving...</small>}</td><td>{formatDate(course.createdAt)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="card" aria-labelledby="account-activity-title">
        <div className="section-heading"><div><p className="section-label">Account activity</p><h2 id="account-activity-title">Recent sign-in attempts</h2></div><span className="section-heading__meta">{activityReport?.total || 0} attempts</span></div>
        {activities.length === 0 ? <div role="status">No sign-in activity matches the selected filters.</div> : <div className="table-container"><table className="table"><thead><tr><th>Account</th><th>Role</th><th>Result</th><th>Details</th><th>Time</th></tr></thead><tbody>{activities.map(activity => <tr key={activity.id}><td>{activity.email || 'Unknown account'}{activity.fullName && <><br /><small>{activity.fullName}</small></>}</td><td>{activity.role || 'Not recorded'}</td><td><StatusBadge status={activity.status} /></td><td>{activity.failureReason || 'Signed in'}</td><td>{formatDate(activity.occurredAt)}</td></tr>)}</tbody></table></div>}
        <div className="pagination-controls"><button className="btn btn-secondary" type="button" disabled={activityPage <= 1 || loading} onClick={() => setActivityPage(page => page - 1)}>Previous</button><span>Page {activityReport?.page || activityPage}</span><button className="btn btn-secondary" type="button" disabled={activityPage * (activityReport?.pageSize || 20) >= (activityReport?.total || 0) || loading} onClick={() => setActivityPage(page => page + 1)}>Next</button></div>
      </section>
    </>}
  </section>;
}
