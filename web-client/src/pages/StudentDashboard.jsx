import React from 'react';
import StatCard from '../components/StatCard';
import CourseCard from '../components/CourseCard';
import StatusBadge from '../components/StatusBadge';

export default function StudentDashboard({ 
  courses, 
  courseAccess, 
  payments, 
  quizAttempts, 
  onNavigate 
}) {
  
  // Calculate stats
  const enrolledCount = courseAccess.length;
  const totalCourses = courses.filter(c => c.status === 'published');
  const paymentTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);

  // Check if student has access to course
  const checkAccess = (courseId) => {
    return courseAccess.some(a => a.course_id === courseId && a.access_status === 'active');
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)' }}>Welcome Back, Student!</h1>
        <p className="text-secondary-color">Access courses, manage progress, and attempt quizzes.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="Enrolled Courses" 
          value={enrolledCount} 
          icon="📚" 
          description="Active learning enrollments" 
        />
        <StatCard 
          title="Quiz Attempts" 
          value={quizAttempts.length} 
          icon="✍️" 
          description="Quizzes completed and graded" 
        />
        <StatCard 
          title="Total Paid Amount" 
          value={`$${paymentTotal.toFixed(2)}`} 
          icon="💳" 
          description="Invoices processed by Payment Service" 
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Main Content Area: Enrolled Courses */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Course Catalog</h2>
            <div className="grid grid-cols-2 gap-6">
              {totalCourses.map(course => {
                const isEnrolled = checkAccess(course.id);
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={isEnrolled}
                    actionLabel={isEnrolled ? "Study Lessons" : "Enroll & Pay"}
                    onAction={() => {
                      if (isEnrolled) {
                        onNavigate('lesson', { courseId: course.id });
                      } else {
                        onNavigate('payment', { courseId: course.id });
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Status Area: Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary w-full" onClick={() => onNavigate('ai-support')}>
                🤖 Ask Chatbot
              </button>
              <button className="btn btn-secondary w-full" onClick={() => onNavigate('quiz', { quizId: 801 })}>
                📝 Attempt Quiz
              </button>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Recent Invoices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {payments.map(p => {
                const relatedCourse = courses.find(c => c.id === p.course_id);
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{relatedCourse?.title || 'Course'}</div>
                      <div className="text-tertiary-color" style={{ fontSize: '0.75rem' }}>{p.payment_method.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600' }}>${p.amount.toFixed(2)}</div>
                      <StatusBadge status={p.payment_status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
