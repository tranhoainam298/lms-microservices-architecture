import React from 'react';
import StatCard from '../components/StatCard';
import CourseCard from '../components/CourseCard';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

const emptyFilters = { search: '', category: '', priceType: '', minPrice: '', maxPrice: '' };

export default function StudentDashboard({
  courses,
  courseAccess,
  payments,
  quizAttempts,
  quizzes,
  user,
  loading = false,
  dataErrors = [],
  catalogLoading = false,
  catalogError = '',
  onCatalogFiltersChange,
  onNavigate
}) {
  const [filters, setFilters] = React.useState(emptyFilters);

  const hasAccess = React.useCallback((courseId) => courseAccess.some(access => (
    Number(access.course_id) === Number(courseId) && access.access_status === 'active'
  )), [courseAccess]);

  const publishedCourses = courses.filter(course => course.status === 'published');
  const enrolledCourses = publishedCourses.filter(course => hasAccess(course.id));
  const availableCourses = publishedCourses.filter(course => !hasAccess(course.id));
  const enrolledCount = enrolledCourses.length;
  const completedLessonCount = enrolledCourses.reduce((total, course) => total + Number(course.completed_lessons || 0), 0);
  const totalLessonCount = enrolledCourses.reduce((total, course) => total + Number(course.total_lessons || 0), 0);
  const averageProgress = enrolledCount === 0
    ? 0
    : Math.round(enrolledCourses.reduce((total, course) => total + Number(course.progress_percent || 0), 0) / enrolledCount);
  const attemptedQuizIds = new Set(quizAttempts.map(attempt => Number(attempt.quizId)));
  const nextQuiz = quizzes.find(quiz => !attemptedQuizIds.has(Number(quiz.id))) || null;
  const sortedPayments = [...payments].sort((left, right) => (
    new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
  ));
  const latestPayment = sortedPayments[0] || null;
  const continueCourse = enrolledCourses.find(course => Number(course.progress_percent || 0) < 100)
    || enrolledCourses[0]
    || null;
  const categories = [...new Set(publishedCourses.map(course => course.category).filter(Boolean))].sort();

  const formatPaymentAmount = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0
  }).format(Number(amount || 0));

  const openCourse = (course) => {
    if (hasAccess(course.id)) {
      onNavigate('lesson', { courseId: course.id, course });
      return;
    }
    onNavigate('course-detail', { courseId: course.id, course });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(current => ({ ...current, [name]: value }));
  };

  const submitFilters = (event) => {
    event.preventDefault();
    onCatalogFiltersChange(filters);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    onCatalogFiltersChange(emptyFilters);
  };

  const displayName = user?.full_name || user?.fullName || 'Student';
  const firstName = displayName.split(' ')[0];

  const recentActivity = [
    ...payments.map(payment => ({
      id: `payment-${payment.id}`,
      label: payment.status === 'success' ? 'Payment confirmed' : payment.status === 'failed' ? 'Payment failed' : 'Payment pending',
      detail: `${String(payment.provider || 'ZaloPay').toUpperCase()} / ${formatPaymentAmount(payment.amount)}`,
      area: 'Payment history',
      timestamp: payment.createdAt
    })),
    ...quizAttempts.map(attempt => ({
      id: `quiz-${attempt.id}`,
      label: 'Quiz result available',
      detail: `${Number(attempt.percentage || 0).toFixed(0)}% / ${attempt.passed ? 'Passed' : 'Not passed'}`,
      area: 'Quiz results',
      timestamp: attempt.submittedAt
    }))
  ]
    .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
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
          <p>Continue where you left off, explore a new course, or review your latest results.</p>
        </div>
        <div className="dashboard-welcome__status">
          <StatusBadge status="active" />
          <span>{enrolledCount} active course{enrolledCount === 1 ? '' : 's'}</span>
        </div>
      </header>

      {loading && <div className="form-alert" role="status">Refreshing your learning workspace...</div>}
      {dataErrors.length > 0 && (
        <div className="form-alert form-alert--warning" role="alert">
          <strong>Some account information could not be refreshed.</strong>
          <ul>{dataErrors.map(message => <li key={message}>{message}</li>)}</ul>
        </div>
      )}
      <div className="metrics-grid mb-6">
        <StatCard
          eyebrow="Course access"
          title="Enrolled Courses"
          value={enrolledCount}
          description="Courses ready to continue"
          tone="primary"
        />
        <StatCard
          eyebrow="Assessment"
          title="Quiz Results"
          value={quizAttempts.length}
          description="Completed assessments"
        />
        <StatCard
          eyebrow="Learning progress"
          title="Average progress"
          value={`${averageProgress}%`}
          description={`${completedLessonCount} of ${totalLessonCount} lessons completed`}
          tone="success"
        />
        <StatCard eyebrow="Completed work" title="Completed lessons" value={completedLessonCount} description={`${Math.max(totalLessonCount - completedLessonCount, 0)} lessons remaining`} />
      </div>

      {continueCourse && (
        <section className="card continue-learning-card" aria-labelledby="continue-learning-title">
          <div className="continue-learning-card__content">
            <div className="continue-learning-card__topline">
              <span className="service-badge">My learning</span>
              <span>Resume course</span>
            </div>
            <p className="section-kicker">Continue learning</p>
            <h3 id="continue-learning-title">{continueCourse.title}</h3>
            <p>{continueCourse.description}</p>
            <ProgressBar
              value={Number(continueCourse.progress_percent || 0)}
              label="Course progress"
              tone={Number(continueCourse.progress_percent) === 100 ? 'success' : 'primary'}
            />
            <div className="continue-learning-card__actions">
              <button className="btn btn-primary" type="button" onClick={() => openCourse(continueCourse)}>
                Continue Learning
              </button>
              <span>{Number(continueCourse.progress_percent || 0)}% complete</span>
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
                <p className="section-label">My learning</p>
                <h2 id="enrolled-courses-title">My courses</h2>
              </div>
              <span className="section-heading__meta">{enrolledCourses.length} enrolled</span>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="card dashboard-empty-state" role="status">
                <strong>No enrolled courses yet</strong>
                <p>Choose an available course below to begin learning.</p>
              </div>
            ) : (
              <div className="course-grid">
                {enrolledCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled
                    actionLabel="Continue Learning"
                    onAction={() => openCourse(course)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-section" aria-labelledby="available-courses-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Course catalog</p>
                <h2 id="available-courses-title">Available courses</h2>
              </div>
              <span className="section-heading__meta">{availableCourses.length} found</span>
            </div>

            <form className="card" onSubmit={submitFilters} aria-label="Course search and filters">
              <div className="form-grid">
                <label className="form-field">
                  <span>Search</span>
                  <input name="search" value={filters.search} onChange={handleFilterChange} placeholder="Course title or topic" />
                </label>
                <label className="form-field">
                  <span>Category</span>
                  <input name="category" value={filters.category} onChange={handleFilterChange} list="course-category-options" placeholder="All categories" />
                  <datalist id="course-category-options">
                    {categories.map(category => <option key={category} value={category} />)}
                  </datalist>
                </label>
                <label className="form-field">
                  <span>Course type</span>
                  <select name="priceType" value={filters.priceType} onChange={handleFilterChange}>
                    <option value="">Free and paid</option>
                    <option value="free">Free courses</option>
                    <option value="paid">Paid courses</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Minimum price</span>
                  <input name="minPrice" type="number" min="0" step="0.01" value={filters.minPrice} onChange={handleFilterChange} placeholder="0" />
                </label>
                <label className="form-field">
                  <span>Maximum price</span>
                  <input name="maxPrice" type="number" min="0" step="0.01" value={filters.maxPrice} onChange={handleFilterChange} placeholder="Any" />
                </label>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={catalogLoading}>{catalogLoading ? 'Searching...' : 'Search courses'}</button>
                <button className="btn btn-ghost" type="button" onClick={clearFilters} disabled={catalogLoading}>Clear filters</button>
              </div>
              {catalogError && <p className="form-alert form-alert--error" role="alert">{catalogError}</p>}
            </form>

            {catalogLoading && availableCourses.length === 0 ? (
              <div className="card dashboard-empty-state" role="status">Loading available courses...</div>
            ) : availableCourses.length === 0 ? (
              <div className="card dashboard-empty-state" role="status">
                <strong>No matching courses</strong>
                <p>Adjust the filters to explore more published courses.</p>
              </div>
            ) : (
              <div className="course-grid">
                {availableCourses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isEnrolled={false}
                    actionLabel="View Course"
                    onAction={() => openCourse(course)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card dashboard-panel activity-panel" aria-labelledby="recent-activity-title">
            <div className="section-heading">
              <div>
                <p className="section-label">Learning history</p>
                <h2 id="recent-activity-title">Recent activity</h2>
              </div>
              <span className="service-badge">Latest updates</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="dashboard-empty-state" role="status">
                <strong>No recent activity</strong>
                <p>Quiz results and payment updates will appear here.</p>
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
                      <span>{activity.area}</span>
                      <time dateTime={activity.timestamp}>{formatActivityDate(activity.timestamp)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card dashboard-panel" aria-labelledby="recent-quiz-results-title">
            <div className="section-heading">
              <div><p className="section-label">Assessment history</p><h2 id="recent-quiz-results-title">Recent quiz results</h2></div>
              <span className="section-heading__meta">{quizAttempts.length} attempts</span>
            </div>
            {quizAttempts.length === 0 ? <div className="dashboard-empty-state" role="status"><strong>No quiz results yet</strong><p>Your saved scores will appear after you submit a quiz.</p></div> : <div className="table-container"><table className="table"><thead><tr><th>Quiz</th><th>Score</th><th>Result</th><th>Submitted</th></tr></thead><tbody>{quizAttempts.slice(0, 5).map(attempt => {
              const quiz = quizzes.find(item => Number(item.id) === Number(attempt.quizId));
              return <tr key={attempt.id}><td>{quiz?.title || `Quiz ${attempt.quizId}`}</td><td>{attempt.score} / {attempt.maximumScore} ({Number(attempt.percentage || 0).toFixed(0)}%)</td><td><StatusBadge status={attempt.passed ? 'completed' : 'failed'} /></td><td>{formatActivityDate(attempt.submittedAt)}</td></tr>;
            })}</tbody></table></div>}
          </section>
        </div>

        <aside className="dashboard-sidebar" aria-label="Upcoming learning and account status">
          <section className="card dashboard-highlight" aria-labelledby="upcoming-quiz-title">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Assessment</span>
              <StatusBadge status={nextQuiz ? 'active' : 'pending'} />
            </div>
            <p className="section-kicker">Next assessment</p>
            <h3 id="upcoming-quiz-title">{nextQuiz?.title || 'No quiz scheduled'}</h3>
            <p>{nextQuiz?.description || 'Published quizzes for your enrolled courses will appear here.'}</p>
            {nextQuiz && (
              <>
                <div className="dashboard-highlight__meta">{nextQuiz.questionCount} questions / {nextQuiz.durationMinutes} minutes</div>
                <button className="btn btn-primary w-full" type="button" onClick={() => onNavigate('quiz', { quizId: nextQuiz.id, courseId: nextQuiz.courseId })}>
                  Start quiz
                </button>
              </>
            )}
          </section>

          <section className="card dashboard-highlight" aria-labelledby="payment-status-title">
            <div className="dashboard-highlight__topline">
              <span className="service-badge">Payment history</span>
              <StatusBadge status={latestPayment?.status || 'pending'} />
            </div>
            <p className="section-kicker">Account activity</p>
            <h3 id="payment-status-title">Payment status</h3>
            <p>
              {latestPayment
                ? `Latest course payment through ${String(latestPayment.provider || 'ZaloPay').toUpperCase()}.`
                : 'No course payments have been recorded yet.'}
            </p>
            <div className="dashboard-highlight__amount">{formatPaymentAmount(latestPayment?.amount || 0)}</div>
          </section>

          <section className="card dashboard-panel recommended-action" aria-labelledby="recommended-action-title">
            <span className="service-badge">Recommended next action</span>
            <h3 id="recommended-action-title">{continueCourse ? 'Review today\u2019s lesson' : 'Choose your first course'}</h3>
            <p>{continueCourse ? 'Review the lesson material before your next quiz.' : 'Browse the catalog and choose a course that matches your goals.'}</p>
            <div className="recommended-action__buttons">
              {continueCourse && (
                <button className="btn btn-secondary w-full" type="button" onClick={() => openCourse(continueCourse)}>
                  Review current lesson
                </button>
              )}
              {nextQuiz && (
                <button className="btn btn-ghost w-full" type="button" onClick={() => onNavigate('quiz', { quizId: nextQuiz.id, courseId: nextQuiz.courseId })}>
                  Open quiz
                </button>
              )}
              {!continueCourse && availableCourses[0] && (
                <button className="btn btn-primary w-full" type="button" onClick={() => openCourse(availableCourses[0])}>
                  View course
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
