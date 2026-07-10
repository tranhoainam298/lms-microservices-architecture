import React, { useState } from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ArchitectureFlow from '../components/ArchitectureFlow';
import ProgressBar from '../components/ProgressBar';

export default function AdminRevenueReport({ payments, courses }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const totalSalesCount = payments.length;
  const totalRevenue = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const revenueByCourse = courses
    .map(course => ({
      id: course.id,
      title: course.title,
      amount: payments
        .filter(payment => payment.course_id === course.id)
        .reduce((sum, payment) => sum + Number(payment.amount), 0)
    }))
    .filter(course => course.amount > 0);
  const highestRevenue = Math.max(...revenueByCourse.map(course => course.amount), 1);
  const successfulPayments = payments.filter(payment => (
    ['completed', 'success', 'paid'].includes(payment.payment_status)
  )).length;
  const successRate = totalSalesCount > 0 ? (successfulPayments / totalSalesCount) * 100 : 0;
  const rankedCourses = [...revenueByCourse].sort((a, b) => b.amount - a.amount);
  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    return matchesStatus && matchesMethod;
  });

  const formatTransactionDate = (timestamp) => {
    if (!timestamp) return 'Not recorded';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(timestamp));
  };

  return (
    <div className="revenue-page">
      <header className="page-intro revenue-intro">
        <div>
          <p className="page-kicker">Administration / Payment and course data</p>
          <h2 className="page-title">Revenue performance</h2>
          <p className="page-description">
            Review payment health, course contribution, and every transaction currently held in the demo state.
          </p>
        </div>
        <div className="revenue-intro__status">
          <StatusBadge status="ready" />
          <span>Local aggregate</span>
        </div>
      </header>

      <div className="architecture-alert">
        <span className="service-badge">Payment Service + Course Service</span>
        <span>Revenue data is aggregated through Payment Service and Course Service.</span>
        <span className="architecture-alert__detail">No Reporting Service or Reporting DB exists.</span>
      </div>

      <div className="revenue-flows">
        <ArchitectureFlow
          label="Payment data"
          steps={['Payment DB', 'Payment Service', 'API Gateway', 'Web Client']}
          compact
        />
        <ArchitectureFlow
          label="Course context"
          steps={['Course DB', 'Course Service', 'API Gateway', 'Web Client']}
          compact
        />
      </div>

      <div className="metrics-grid mb-6">
        <StatCard
          eyebrow="Gross volume"
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          description="Consolidated payment records"
          tone="primary"
        />
        <StatCard
          eyebrow="Payment records"
          title="Transaction Count"
          value={totalSalesCount}
          description="All transactions in local state"
        />
        <StatCard
          eyebrow="Order economics"
          title="Average Order Value"
          value={`$${averageTicket.toFixed(2)}`}
          description="Average paid amount per transaction"
        />
        <StatCard
          eyebrow="Payment health"
          title="Successful Payment Rate"
          value={`${successRate.toFixed(0)}%`}
          description={`${successfulPayments} of ${totalSalesCount} payments successful`}
          tone="success"
        />
      </div>

      <div className="revenue-analytics-grid">
        <section className="card revenue-chart-panel" aria-labelledby="revenue-summary-title">
          <div className="section-heading">
            <div>
              <p className="section-label">Course contribution</p>
              <h2 id="revenue-summary-title">Revenue distribution</h2>
            </div>
            <span className="service-badge">USD</span>
          </div>

          {rankedCourses.length === 0 ? (
            <div className="revenue-empty-state" role="status">
              <strong>No revenue to visualize</strong>
              <p>Completed payment records will populate this view.</p>
            </div>
          ) : (
            <div className="revenue-bars" role="img" aria-label="Bar chart showing revenue by course">
              {rankedCourses.map(course => {
                const height = Math.max((course.amount / highestRevenue) * 100, 10);
                return (
                  <div className="revenue-bars__item" key={course.id}>
                    <span className="revenue-bars__value">${course.amount.toFixed(2)}</span>
                    <div className="revenue-bars__track" aria-hidden="true">
                      <span className="revenue-bars__fill" style={{ '--bar-scale': height / 100 }} />
                    </div>
                    <span className="revenue-bars__label" title={course.title}>{course.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card course-ranking-panel" aria-labelledby="course-ranking-title">
          <div className="section-heading">
            <div>
              <p className="section-label">Catalog performance</p>
              <h2 id="course-ranking-title">Course revenue ranking</h2>
            </div>
            <span className="section-heading__meta">{rankedCourses.length} earning</span>
          </div>

          {rankedCourses.length === 0 ? (
            <div className="revenue-empty-state" role="status">No course revenue recorded.</div>
          ) : (
            <ol className="course-ranking">
              {rankedCourses.map((course, index) => {
                const contribution = (course.amount / highestRevenue) * 100;
                return (
                  <li className="course-ranking__item" key={course.id}>
                    <span className="course-ranking__index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="course-ranking__copy">
                      <div className="course-ranking__topline">
                        <strong>{course.title}</strong>
                        <span className="course-ranking__value">${course.amount.toFixed(2)}</span>
                      </div>
                      <ProgressBar
                        value={contribution}
                        label={`${course.title} revenue contribution`}
                        tone={index === 0 ? 'success' : 'primary'}
                        showValue={false}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <section className="card transaction-ledger" aria-labelledby="transaction-ledger-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Payment DB records</p>
            <h2 id="transaction-ledger-title">Transaction ledger</h2>
          </div>
          <span className="service-badge">{filteredPayments.length} shown</span>
        </div>

        <div className="revenue-toolbar" aria-label="Transaction filters">
          <div className="revenue-filter">
            <label htmlFor="revenue-status-filter">Payment status</label>
            <select
              id="revenue-status-filter"
              className="form-control"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="revenue-filter">
            <label htmlFor="revenue-method-filter">Payment method</label>
            <select
              id="revenue-method-filter"
              className="form-control"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
            >
              <option value="all">All methods</option>
              <option value="zalopay">ZaloPay</option>
              <option value="momo">Momo</option>
            </select>
          </div>
          <p className="revenue-toolbar__note">Filters apply to this local table only.</p>
        </div>

        <div className="table-container">
          <table className="table transaction-table">
            <caption className="sr-only">Payment transactions filtered by status and payment method</caption>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>User ID</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td className="transaction-table__empty" colSpan="7">No transactions match the selected filters.</td>
                </tr>
              ) : (
                filteredPayments.map(payment => {
                  const relatedCourse = courses.find(course => course.id === payment.course_id);
                  return (
                    <tr key={payment.id}>
                      <td><span className="transaction-id">#{payment.id}</span></td>
                      <td><time dateTime={payment.created_at}>{formatTransactionDate(payment.created_at)}</time></td>
                      <td>Student {payment.user_id}</td>
                      <td><strong className="transaction-course">{relatedCourse?.title || 'Unknown Course'}</strong></td>
                      <td><strong>${Number(payment.amount).toFixed(2)}</strong></td>
                      <td><span className="payment-method-label">{payment.payment_method.toUpperCase()}</span></td>
                      <td><StatusBadge status={payment.payment_status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
