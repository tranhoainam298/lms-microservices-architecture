import React from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export default function AdminRevenueReport({ payments, courses }) {
  // Aggregate stats
  const totalSalesCount = payments.length;
  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const revenueByCourse = courses
    .map(course => ({
      id: course.id,
      title: course.title,
      amount: payments
        .filter(payment => payment.course_id === course.id)
        .reduce((sum, payment) => sum + payment.amount, 0)
    }))
    .filter(course => course.amount > 0);
  const highestRevenue = Math.max(...revenueByCourse.map(course => course.amount), 1);

  return (
    <div className="revenue-page">
      <div className="page-intro">
        <p className="page-kicker">Payment and course data</p>
        <h2 className="page-title">Revenue performance at a glance</h2>
        <p className="page-description">Review completed payments, course sales contribution, and the current transaction ledger.</p>
      </div>

      <div className="architecture-alert">
        <span>Revenue report flow</span>
        <span className="service-badge">Payment Service + Course Service</span>
        <span className="architecture-alert__detail">Data is combined in the UI without a dedicated reporting data store.</span>
      </div>

      <div className="metrics-grid mb-6">
        <StatCard 
          title="Total Gross Revenue" 
          value={`$${totalRevenue.toFixed(2)}`} 
          description="Consolidated sales ledger" 
        />
        <StatCard 
          title="Completed Transactions" 
          value={totalSalesCount} 
          description="Invoices processed successfully" 
        />
        <StatCard 
          title="Average Order Value" 
          value={`$${averageTicket.toFixed(2)}`} 
          description="Average ticket price per course" 
        />
      </div>

      <section className="card mb-6">
        <div className="section-heading">
          <div>
            <p className="section-label">Course contribution</p>
            <h2>Revenue summary</h2>
          </div>
          <span className="service-badge">USD</span>
        </div>
        <div className="chart-container" role="img" aria-label="Bar chart showing revenue by course">
          {revenueByCourse.map(course => (
            <div className="chart-bar-wrapper" key={course.id}>
              <span className="chart-value">${course.amount.toFixed(2)}</span>
              <div className="chart-bar" style={{ height: `${Math.max((course.amount / highestRevenue) * 140, 16)}px` }} />
              <span className="chart-label" title={course.title}>{course.title}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="card mb-6">
        <div className="section-heading">
          <div>
            <p className="section-label">Payment DB records</p>
            <h2>Transaction ledger</h2>
          </div>
          <span className="service-badge">{totalSalesCount} completed</span>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>User ID</th>
                <th>Course Name</th>
                <th>Paid Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => {
                const relatedCourse = courses.find(c => c.id === p.course_id);
                return (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>Student {p.user_id}</td>
                    <td style={{ fontWeight: '500' }}>{relatedCourse?.title || 'Unknown Course'}</td>
                    <td>${p.amount.toFixed(2)}</td>
                    <td>{p.payment_method.toUpperCase()}</td>
                    <td><StatusBadge status={p.payment_status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
