import React from 'react';
import StatCard from '../components/StatCard';
import CourseCard from '../components/CourseCard';
import StatusBadge from '../components/StatusBadge';

export default function StudentDashboard({ 
  courses, 
  courseAccess, 
  payments, 
  quizAttempts, 
  quizzes,
  onNavigate 
}) {
  
  const enrolledCount = courseAccess.length;
  const totalCourses = courses.filter(c => c.status === 'published');
  const paymentTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const nextQuiz = quizzes[0];
  const latestPayment = payments[payments.length - 1];

  // Check if student has access to course
  const checkAccess = (courseId) => {
    return courseAccess.some(a => a.course_id === courseId && a.access_status === 'active');
  };

  return (
    <div className="student-dashboard">
      <div className="architecture-alert">
        <span>Course Catalog & Enrollment Status</span>
        <span className="architecture-alert__detail">Course Service reads Course DB</span>
      </div>

      {/* Architecture flow mini strip */}
      <div className="flow-strip" aria-label="Architecture flow from Web Client to Course DB">
        <strong>Web Client</strong><span>→</span><span>API Gateway</span><span>→</span><span>Course Service</span><span>→</span><span>Course DB</span>
      </div>

      <div className="metrics-grid mb-6">
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
          title="Payment Activity"
          value={`$${paymentTotal.toFixed(2)}`} 
          description="Payments processed in Payment DB" 
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6 student-workspace">
        {/* Main Content Area */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="content-heading">
              Continue learning
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
          <div className="card dashboard-highlight">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Exam & Quiz Service</span>
              <StatusBadge status={nextQuiz?.status || 'pending'} />
            </div>
            <h3>Upcoming quiz</h3>
            <p>{nextQuiz?.title}</p>
            <div className="dashboard-highlight__meta">{nextQuiz?.question_count} questions · {nextQuiz?.due_label}</div>
            <button className="btn btn-primary w-full" onClick={() => onNavigate('quiz', { quizId: nextQuiz?.id })}>Start quiz</button>
          </div>

          <div className="card dashboard-highlight">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Payment Service</span>
              <StatusBadge status={latestPayment?.payment_status || 'pending'} />
            </div>
            <h3>Payment status</h3>
            <p>Latest course payment through {latestPayment?.payment_method.toUpperCase()}.</p>
            <div className="dashboard-highlight__amount">${latestPayment?.amount.toFixed(2)}</div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Quick actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="btn btn-secondary w-full text-sm" onClick={() => onNavigate('ai-support')}>
                Ask the study assistant
              </button>
              <button className="btn btn-secondary w-full text-sm" onClick={() => onNavigate('quiz', { quizId: 801 })}>
                Open quiz module
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
