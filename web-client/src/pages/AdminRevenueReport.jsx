import React from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export default function AdminRevenueReport({ payments, courses }) {
  // Aggregate stats
  const totalSalesCount = payments.length;
  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)' }}>System Financial Dashboard</h1>
        <p className="text-secondary-color">View invoices, sales transactions, and course revenues.</p>
      </div>

      <div className="architecture-alert">
        <span>📊</span>
        <span>Flow: **Reporting Management: View Revenue Report** (Query from: Payment Service [revenue_records] + Course Service [courses]. No Reporting DB exists)</span>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="Total Gross Revenue" 
          value={`$${totalRevenue.toFixed(2)}`} 
          icon="💰" 
          description="Consolidated sales ledger" 
        />
        <StatCard 
          title="Completed Transactions" 
          value={totalSalesCount} 
          icon="🧾" 
          description="Invoices processed successfully" 
        />
        <StatCard 
          title="Average Order Value" 
          value={`$${averageTicket.toFixed(2)}`} 
          icon="📈" 
          description="Average ticket price per course" 
        />
      </div>

      <div className="card mb-6">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Transaction Ledger (Payment DB)</h2>
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
                    <td>student_#{p.user_id}</td>
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
