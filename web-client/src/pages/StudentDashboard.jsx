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
  
  const enrolledCount = courseAccess.length;
  const totalCourses = courses.filter(c => c.status === 'published');
  const paymentTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);

  // Check if student has access to course
  const checkAccess = (courseId) => {
    return courseAccess.some(a => a.course_id === courseId && a.access_status === 'active');
  };

  return (
    <div>
      <div className="architecture-alert">
        <span>Flow: **Course Catalog & Enrollment Status** (Course Service queries Course DB)</span>
      </div>

      {/* Architecture flow mini strip */}
      <div style={{ padding: '0.625rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
        <span>Topology:</span>
        <span style={{ color: 'var(--primary)', fontWeight: '700' }}>Web Client</span>
        <span>→</span>
        <span>API Gateway</span>
        <span>→</span>
        <span style={{ fontWeight: '600' }}>Course Service</span>
        <span>→</span>
        <span>Course DB</span>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <StatCard 
          title="Enrolled Courses" 
          value={enrolledCount} 
          description="Active learning modules in Course DB" 
        />
        <StatCard 
          title="Quiz Attempts" 
          value={quizAttempts.length} 
          description="Grading records in Exam DB" 
        />
        <StatCard 
          title="Financial Ledger" 
          value={`$${paymentTotal.toFixed(2)}`} 
          description="Payments processed in Payment DB" 
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Main Content Area */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Course Syllabus
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {totalCourses.map(course => {
                const isEnrolled = checkAccess(course.id);
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={isEnrolled}
                    actionLabel={isEnrolled ? "Study Syllabus" : "Enroll & Checkout"}
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

        {/* Sidebar Status Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Action Center
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary w-full text-sm" onClick={() => onNavigate('ai-support')}>
                Consult AI Assistant
              </button>
              <button className="btn btn-secondary w-full text-sm" onClick={() => onNavigate('quiz', { quizId: 801 })}>
                Take Graded Exam
              </button>
            </div>
          </div>

          {/* Course Progress Section */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Learning Progress
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                  <span>Microservices Architecture</span>
                  <span>33%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '33%' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '600' }}>
                  <span>React & Bento layouts</span>
                  <span>100%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '100%', backgroundColor: 'var(--success)' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Gateway Transactions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {payments.map(p => {
                const relatedCourse = courses.find(c => c.id === p.course_id);
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: '600', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {relatedCourse?.title || 'Course'}
                      </div>
                      <div className="text-tertiary-color" style={{ fontSize: '0.7rem' }}>
                        {p.payment_method.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        ${p.amount.toFixed(2)}
                      </div>
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
