import React from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { adminApi } from '../features/admin/api/adminApi';

function formatVnd(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminDashboard({ accessToken, onNavigate }) {
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [users, courses, revenue, activity] = await Promise.all([
          adminApi.getUsers(accessToken, { page: 1, pageSize: 5 }),
          adminApi.getCourseReport(accessToken),
          adminApi.getRevenueReport(accessToken),
          adminApi.getActivityReport(accessToken, { page: 1, pageSize: 8 })
        ]);
        if (!cancelled) setDashboard({ users, courses, revenue, activity });
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (accessToken) loadDashboard();
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  const userSummary = dashboard?.users?.summary || {};
  const courseSummary = dashboard?.courses?.summary || {};
  const revenueSummary = dashboard?.revenue?.summary || {};
  const activitySummary = dashboard?.activity?.summary || {};
  const recentActivity = dashboard?.activity?.items || [];
  const topCourses = [...(dashboard?.revenue?.courseBreakdown || [])]
    .sort((left, right) => Number(right.totalRevenue || 0) - Number(left.totalRevenue || 0))
    .slice(0, 5);

  return (
    <section className="page-stack" aria-labelledby="admin-dashboard-title">
      <header className="page-intro">
        <p className="page-kicker">Administration</p>
        <h2 className="page-title" id="admin-dashboard-title">Platform dashboard</h2>
        <p className="page-description">Review account availability, course activity, sign-ins, and successful course sales.</p>
      </header>

      {error && <div className="form-alert form-alert--error" role="alert"><span>{error}</span><button className="btn btn-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div>}
      {loading ? <div className="card" role="status">Loading platform totals...</div> : <>
        <div className="metrics-grid">
          <StatCard eyebrow="Accounts" title="Total users" value={userSummary.totalUsers || 0} description={`${userSummary.activeUsers || 0} active`} tone="primary" />
          <StatCard eyebrow="Learners" title="Students" value={userSummary.students || 0} description={`${userSummary.instructors || 0} instructors`} />
          <StatCard eyebrow="Account access" title="Inactive users" value={userSummary.inactiveUsers || 0} description={`${userSummary.admins || 0} administrators`} />
          <StatCard eyebrow="Course catalog" title="Total courses" value={courseSummary.totalCourses || 0} description={`${courseSummary.publishedCourses || 0} published / ${courseSummary.draftCourses || 0} draft`} />
          <StatCard eyebrow="Payments" title="Successful sales" value={revenueSummary.successfulTransactions || 0} description={`${revenueSummary.totalTransactions || 0} total transactions`} tone="success" />
          <StatCard eyebrow="Revenue" title="Total revenue" value={formatVnd(revenueSummary.totalRevenue)} description={`${Number(revenueSummary.successRate || 0).toFixed(1)}% payment success`} tone="primary" />
          <StatCard eyebrow="Sign-ins" title="Successful sign-ins" value={activitySummary.successfulLogins || 0} description={`${activitySummary.failedLogins || 0} failed attempts`} />
        </div>

        <div className="dashboard-layout">
          <section className="card" aria-labelledby="admin-recent-activity-title">
            <div className="section-heading"><div><p className="section-label">Account activity</p><h2 id="admin-recent-activity-title">Recent sign-ins</h2></div><button className="btn btn-secondary" type="button" onClick={() => onNavigate('activity-report')}>View activity report</button></div>
            {recentActivity.length === 0 ? <div className="empty-state" role="status">No sign-in activity has been recorded.</div> : <div className="table-container"><table className="table"><thead><tr><th>Account</th><th>Role</th><th>Result</th><th>Time</th></tr></thead><tbody>{recentActivity.map(item => <tr key={item.id}><td>{item.email || 'Unknown account'}{item.fullName && <><br /><small>{item.fullName}</small></>}</td><td>{item.role || 'Not recorded'}</td><td><StatusBadge status={item.status} /></td><td>{formatDate(item.occurredAt)}</td></tr>)}</tbody></table></div>}
          </section>

          <aside className="card" aria-labelledby="admin-top-courses-title">
            <div className="section-heading"><div><p className="section-label">Course sales</p><h2 id="admin-top-courses-title">Top earning courses</h2></div></div>
            {topCourses.length === 0 ? <div className="empty-state" role="status">No successful course payments are available.</div> : <ol className="course-ranking">{topCourses.map((course, index) => <li className="course-ranking__item" key={course.courseId}><span className="course-ranking__index">{String(index + 1).padStart(2, '0')}</span><div className="course-ranking__copy"><strong>{course.title}</strong><span>{course.transactionCount} successful payment{course.transactionCount === 1 ? '' : 's'}</span></div><span className="course-ranking__value">{formatVnd(course.totalRevenue)}</span></li>)}</ol>}
            <button className="btn btn-primary w-full" type="button" onClick={() => onNavigate('revenue-report')}>Open revenue report</button>
          </aside>
        </div>
      </>}
    </section>
  );
}
