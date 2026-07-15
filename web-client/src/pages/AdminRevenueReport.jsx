import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { apiUrl } from '../config/api';

export default function AdminRevenueReport({ accessToken }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportFilters, setReportFilters] = useState({ dateFrom: '', dateTo: '', courseId: '' });
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: '', dateTo: '', courseId: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');

  useEffect(() => {
    async function fetchRevenueReport() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (appliedFilters.dateFrom) params.set('dateFrom', appliedFilters.dateFrom);
        if (appliedFilters.dateTo) params.set('dateTo', appliedFilters.dateTo);
        if (appliedFilters.courseId) params.set('courseId', appliedFilters.courseId);
        const query = params.toString();
        const response = await fetch(apiUrl(`/payments/reports/revenue${query ? `?${query}` : ''}`), {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || `Revenue report unavailable (${response.status})`);
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (accessToken) {
      fetchRevenueReport();
    }
  }, [accessToken, appliedFilters]);

  const applyReportFilters = event => {
    event.preventDefault();
    setAppliedFilters(reportFilters);
  };

  const resetReportFilters = () => {
    const emptyFilters = { dateFrom: '', dateTo: '', courseId: '' };
    setReportFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatTransactionDate = (timestamp) => {
    if (!timestamp) return 'Not recorded';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  if (loading) {
    return (
      <div className="revenue-page">
        <header className="page-intro revenue-intro">
          <div>
            <p className="page-kicker">Administration</p>
            <h2 className="page-title">Revenue performance</h2>
            <p className="page-description">Loading the latest revenue data...</p>
          </div>
        </header>
        <div className="revenue-loading" role="status" aria-label="Loading revenue data">
          <div className="revenue-loading__spinner" />
          <p>Preparing payment and course totals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-page">
        <header className="page-intro revenue-intro">
          <div>
            <p className="page-kicker">Administration</p>
            <h2 className="page-title">Revenue performance</h2>
            <p className="page-description">Could not load revenue data.</p>
          </div>
        </header>
        <div className="revenue-error" role="alert">
          <strong>Report unavailable</strong>
          <p>{error}</p>
          <button className="btn btn-secondary" type="button" onClick={resetReportFilters}>Clear filters and retry</button>
        </div>
      </div>
    );
  }

  const { summary, courseBreakdown, transactions } = reportData || { summary: {}, courseBreakdown: [], transactions: [] };

  const filteredTransactions = transactions.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || t.provider === providerFilter;
    return matchesStatus && matchesProvider;
  });

  const exportCsv = () => {
    const protectCell = value => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      ['Invoice ID', 'Date', 'Student ID', 'Course ID', 'Course', 'Amount', 'Currency', 'Provider', 'Status'],
      ...filteredTransactions.map(transaction => [
        transaction.id,
        transaction.createdAt,
        transaction.studentId,
        transaction.courseId,
        transaction.courseTitle,
        transaction.amount,
        transaction.currency || summary.currency || 'VND',
        transaction.provider,
        transaction.status
      ])
    ];
    const csv = rows.map(row => row.map(protectCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const highestCourseRevenue = Math.max(...courseBreakdown.map(c => c.totalRevenue), 1);

  return (
    <div className="revenue-page">
      <header className="page-intro revenue-intro">
        <div>
          <p className="page-kicker">Administration</p>
          <h2 className="page-title">Revenue performance</h2>
          <p className="page-description">
            Review successful sales, course contribution, and recent payment activity.
          </p>
        </div>
        <div className="revenue-intro__status">
          <StatusBadge status="ready" />
          <span>Live data</span>
        </div>
      </header>

      <form className="card revenue-toolbar" onSubmit={applyReportFilters}>
        <div className="revenue-filter">
          <label htmlFor="revenue-date-from">From date</label>
          <input id="revenue-date-from" className="form-control" type="date" value={reportFilters.dateFrom} onChange={event => setReportFilters(value => ({ ...value, dateFrom: event.target.value }))} />
        </div>
        <div className="revenue-filter">
          <label htmlFor="revenue-date-to">To date</label>
          <input id="revenue-date-to" className="form-control" type="date" min={reportFilters.dateFrom || undefined} value={reportFilters.dateTo} onChange={event => setReportFilters(value => ({ ...value, dateTo: event.target.value }))} />
        </div>
        <div className="revenue-filter">
          <label htmlFor="revenue-course-id">Course ID</label>
          <input id="revenue-course-id" className="form-control" type="number" min="1" step="1" placeholder="All courses" value={reportFilters.courseId} onChange={event => setReportFilters(value => ({ ...value, courseId: event.target.value }))} />
        </div>
        <button className="btn btn-primary" type="submit">Apply report filters</button>
        <button className="btn btn-secondary" type="button" onClick={resetReportFilters}>Reset</button>
        <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={filteredTransactions.length === 0}>Export CSV</button>
      </form>

      <div className="metrics-grid mb-6">
        <StatCard
          eyebrow="Gross volume"
          title="Total Revenue"
          value={formatVnd(summary.totalRevenue || 0)}
          description="Revenue from successful payments"
          tone="primary"
        />
        <StatCard
          eyebrow="Payment records"
          title="Transaction Count"
          value={summary.totalTransactions || 0}
          description="All recorded payment attempts"
        />
        <StatCard
          eyebrow="Order economics"
          title="Average Order Value"
          value={formatVnd(summary.averageOrderValue || 0)}
          description="Average across successful payments"
        />
        <StatCard
          eyebrow="Payment health"
          title="Successful Payment Rate"
          value={`${(summary.successRate || 0).toFixed(0)}%`}
          description={`${summary.successfulTransactions || 0} of ${summary.totalTransactions || 0} payments successful`}
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
            <span className="service-badge">VND</span>
          </div>

          {courseBreakdown.length === 0 ? (
            <div className="revenue-empty-state" role="status">
              <strong>No revenue to visualize</strong>
              <p>Successful payment records will populate this view.</p>
            </div>
          ) : (
            <div className="revenue-bars" role="img" aria-label="Bar chart showing revenue by course">
              {courseBreakdown.map(course => {
                const height = Math.max((course.totalRevenue / highestCourseRevenue) * 100, 10);
                return (
                  <div className="revenue-bars__item" key={course.courseId}>
                    <span className="revenue-bars__value">{formatVnd(course.totalRevenue)}</span>
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
            <span className="section-heading__meta">{courseBreakdown.length} earning</span>
          </div>

          {courseBreakdown.length === 0 ? (
            <div className="revenue-empty-state" role="status">No course revenue recorded.</div>
          ) : (
            <ol className="course-ranking">
              {courseBreakdown.map((course, index) => {
                const contribution = (course.totalRevenue / highestCourseRevenue) * 100;
                return (
                  <li className="course-ranking__item" key={course.courseId}>
                    <span className="course-ranking__index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="course-ranking__copy">
                      <div className="course-ranking__topline">
                        <strong>{course.title}</strong>
                        <span className="course-ranking__value">{formatVnd(course.totalRevenue)}</span>
                      </div>
                      <ProgressBar
                        value={contribution}
                        label={`${course.title} revenue contribution`}
                        tone={index === 0 ? 'success' : 'primary'}
                        showValue={false}
                      />
                      <small className="course-ranking__meta">{course.transactionCount} transaction{course.transactionCount !== 1 ? 's' : ''}</small>
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
            <p className="section-label">Payment history</p>
            <h2 id="transaction-ledger-title">Transaction ledger</h2>
          </div>
          <span className="service-badge">{filteredTransactions.length} shown</span>
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
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="revenue-filter">
            <label htmlFor="revenue-provider-filter">Payment provider</label>
            <select
              id="revenue-provider-filter"
              className="form-control"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
            >
              <option value="all">All providers</option>
              <option value="zalopay">ZaloPay</option>
              <option value="momo">Momo</option>
            </select>
          </div>
          <p className="revenue-toolbar__note">Use the filters to review recent payment activity.</p>
        </div>

        <div className="table-container">
          <table className="table transaction-table">
            <caption className="sr-only">Payment transactions filtered by status and payment provider</caption>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Student ID</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td className="transaction-table__empty" colSpan="7">No transactions match the selected filters.</td>
                </tr>
              ) : (
                filteredTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td><span className="transaction-id">#{transaction.id}</span></td>
                    <td><time dateTime={transaction.createdAt}>{formatTransactionDate(transaction.createdAt)}</time></td>
                    <td>Student {transaction.studentId}</td>
                    <td><strong className="transaction-course">{transaction.courseTitle}</strong></td>
                    <td><strong>{formatVnd(transaction.amount)}</strong></td>
                    <td><span className="payment-method-label">{(transaction.provider || 'N/A').toUpperCase()}</span></td>
                    <td><StatusBadge status={transaction.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
