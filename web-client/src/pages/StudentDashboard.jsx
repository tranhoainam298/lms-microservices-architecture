import React from 'react';
import StatCard from '../components/StatCard';
import CourseCard from '../components/CourseCard';
import StatusBadge from '../components/StatusBadge';
import ArchitectureFlow from '../components/ArchitectureFlow';
import ProgressBar from '../components/ProgressBar';

export default function StudentDashboard({
  courses,
  courseAccess,
  payments,
  quizAttempts,
  quizzes,
  progress = [],
  user,
  onNavigate
}) {
  const enrolledCount = courseAccess.length;
  const totalCourses = courses.filter(c => c.status === 'published');
  const paymentTotal = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const nextQuiz = quizzes[0];
  const latestPayment = payments[payments.length - 1];

  const checkAccess = (courseId) => {
    return courseAccess.some(a => a.course_id === courseId && a.access_status === 'active');
  };

  const enrolledCourses = totalCourses.filter(course => checkAccess(course.id));
  const continueCourse = enrolledCourses.find(course => (course.progress_percent || 0) < 100)
    || enrolledCourses[0]
    || totalCourses[0];
  const continueIsEnrolled = continueCourse ? checkAccess(continueCourse.id) : false;
  const displayName = user?.full_name || user?.fullName || 'Student';
  const firstName = displayName.split(' ')[0];

  const recentActivity = [
    ...payments.map(payment => ({
      id: `payment-${payment.id}`,
      label: 'Payment completed',
      detail: `${payment.payment_method.toUpperCase()} / $${payment.amount.toFixed(2)}`,
      service: 'Payment Service',
      timestamp: payment.created_at
    })),
    ...quizAttempts.map(attempt => ({
      id: `quiz-${attempt.id}`,
      label: 'Quiz attempt graded',
      detail: `Attempt #${attempt.id}`,
      service: 'Exam & Quiz Service',
      timestamp: attempt.submitted_at || attempt.started_at
    })),
    ...progress
      .filter(item => item.progress_status === 'completed')
      .map(item => {
        const relatedCourse = courses.find(course => course.id === item.course_id);
        return {
          id: `progress-${item.id}`,
          label: 'Lesson completed',
          detail: relatedCourse?.title || 'Course lesson',
          service: 'Course Service',
          timestamp: item.completed_at
        };
      })
  ]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 4);

  const formatActivityDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="student-dashboard">
      <header className="dashboard-welcome">
        <div className="dashboard-welcome__copy">
          <p className="page-kicker">Your learning day</p>
          <h2>Welcome back, {firstName}.</h2>
          <p>Continue where you left off, then review the assessment and activity waiting for you.</p>
        </div>
        <div className="dashboard-welcome__status">
          <StatusBadge status="active" />
          <span>{enrolledCount} active course{enrolledCount === 1 ? '' : 's'}</span>
        </div>
      </header>

      <ArchitectureFlow
        label="Learning request"
        ariaLabel="Learning request flows from Web Client through API Gateway and Course Service to Course DB"
        steps={['Web Client', 'API Gateway', 'Course Service', 'Course DB']}
        compact
      />

      <div className="metrics-grid mb-6">
        <StatCard
          eyebrow="Course access"
          title="Enrolled Courses"
          value={enrolledCount}
          description="Active learning modules in Course DB"
          tone="primary"
        />
        <StatCard
          eyebrow="Assessment"
          title="Quiz Attempts"
          value={quizAttempts.length}
          description="Grading records in Exam DB"
        />
        <StatCard
          eyebrow="Payments"
          title="Payment Activity"
          value={`$${paymentTotal.toFixed(2)}`}
          description="Payments processed in Payment DB"
          tone="success"
        />
      </div>

      {continueCourse && (
        <section className="card continue-learning-card" aria-labelledby="continue-learning-title">
          <div className="continue-learning-card__content">
            <div className="continue-learning-card__topline">
              <span className="service-badge">Course Service</span>
              <span>{continueIsEnrolled ? 'Resume course' : 'Recommended course'}</span>
            </div>
            <p className="section-kicker">Continue learning</p>
            <h3 id="continue-learning-title">{continueCourse.title}</h3>
            <p>{continueCourse.description}</p>
            <ProgressBar
              value={continueIsEnrolled ? continueCourse.progress_percent || 0 : 0}
              label={continueIsEnrolled ? 'Course progress' : 'Enrollment progress'}
              tone={continueCourse.progress_percent === 100 ? 'success' : 'primary'}
            />
            <div className="continue-learning-card__actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => onNavigate(
                  continueIsEnrolled ? 'lesson' : 'payment',
                  { courseId: continueCourse.id }
                )}
              >
                {continueIsEnrolled ? 'Continue course' : 'Enroll and checkout'}
              </button>
              <span>{continueIsEnrolled ? `${continueCourse.progress_percent || 0}% complete` : `$${continueCourse.price.toFixed(2)}`}</span>
            </div>
          </div>
          <div className="continue-learning-card__visual" aria-hidden="true">
            <span>Current course</span>
            <strong>{continueCourse.id}</strong>
            <i />
          </div>
        </section>
      )}

      <div className="dashboard-layout student-workspace">
        <div className="dashboard-main-column">
          <section className="dashboard-section" aria-labelledby="enrolled-courses-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Learning library</p>
                <h2 id="enrolled-courses-title">Your courses</h2>
              </div>
              <span className="section-heading__meta">{totalCourses.length} available</span>
            </div>

            <div className="course-grid">
              {totalCourses.map(course => {
                const isEnrolled = checkAccess(course.id);
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={isEnrolled}
                    actionLabel={isEnrolled ? 'Study syllabus' : 'Enroll and checkout'}
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
          </section>

          <section className="card dashboard-panel activity-panel" aria-labelledby="recent-activity-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Across your workspace</p>
                <h2 id="recent-activity-title">Recent activity</h2>
              </div>
              <span className="service-badge">Live local state</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="dashboard-empty-state" role="status">
                <strong>No recent activity</strong>
                <p>Course, quiz, and payment activity will appear here.</p>
              </div>
            ) : (
              <ol className="activity-timeline">
                {recentActivity.map(activity => (
                  <li className="activity-timeline__item" key={activity.id}>
                    <span className="activity-timeline__marker" aria-hidden="true" />
                    <div className="activity-timeline__content">
                      <strong>{activity.label}</strong>
                      <span>{activity.detail}</span>
                    </div>
                    <div className="activity-timeline__meta">
                      <span>{activity.service}</span>
                      <time dateTime={activity.timestamp}>{formatActivityDate(activity.timestamp)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="dashboard-sidebar" aria-label="Upcoming learning and account status">
          <section className="card dashboard-highlight" aria-labelledby="upcoming-quiz-title">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Exam & Quiz Service</span>
              <StatusBadge status={nextQuiz?.status || 'pending'} />
            </div>
            <p className="section-kicker">Next assessment</p>
            <h3 id="upcoming-quiz-title">Upcoming quiz</h3>
            <p>{nextQuiz?.title}</p>
            <div className="dashboard-highlight__meta">{nextQuiz?.question_count} questions / {nextQuiz?.due_label}</div>
            <button className="btn btn-primary w-full" type="button" onClick={() => onNavigate('quiz', { quizId: nextQuiz?.id })}>
              Start quiz
            </button>
          </section>

          <section className="card dashboard-highlight" aria-labelledby="payment-status-title">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Payment Service</span>
              <StatusBadge status={latestPayment?.payment_status || 'pending'} />
            </div>
            <p className="section-kicker">Account activity</p>
            <h3 id="payment-status-title">Payment status</h3>
            <p>
              {latestPayment
                ? `Latest course payment through ${latestPayment.payment_method.toUpperCase()}.`
                : 'No course payments have been recorded yet.'}
            </p>
            <div className="dashboard-highlight__amount">{latestPayment ? `$${latestPayment.amount.toFixed(2)}` : '$0.00'}</div>
          </section>

          <section className="card dashboard-panel recommended-action" aria-labelledby="recommended-action-title">
            <span className="service-badge">Recommended next action</span>
            <h3 id="recommended-action-title">Strengthen the architecture concepts</h3>
            <p>Ask the study assistant about the current API Gateway lesson before your next quiz.</p>
            <div className="recommended-action__buttons">
              <button className="btn btn-secondary w-full" type="button" onClick={() => onNavigate('ai-support')}>
                Ask the study assistant
              </button>
              <button className="btn btn-ghost w-full" type="button" onClick={() => onNavigate('quiz', { quizId: 801 })}>
                Open quiz module
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
