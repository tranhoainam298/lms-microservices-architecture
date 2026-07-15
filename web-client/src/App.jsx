import React, { useState } from 'react';
import AppShell from './components/AppShell';

// Pages
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import InstructorCourseDraft from './pages/InstructorCourseDraft';
import LessonPage from './pages/LessonPage';
import QuizPage from './pages/QuizPage';
import PaymentPage from './pages/PaymentPage';
import AdminRevenueReport from './pages/AdminRevenueReport';
import ProfilePage from './pages/ProfilePage';
import AdminUserManagement from './pages/AdminUserManagement';
import InstructorMonitoring from './pages/InstructorMonitoring';
import AdminCourseOperations from './pages/AdminCourseOperations';
import InstructorDashboard from './pages/InstructorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CourseDetailPage from './pages/CourseDetailPage';
import StudentCatalogPage from './pages/StudentCatalogPage';
import StudentLearningPage from './pages/StudentLearningPage';
import StudentResultsPage from './pages/StudentResultsPage';
import InstructorCoursesPage from './pages/InstructorCoursesPage';
import { studentApi } from './features/student/api/studentApi';

// Application page metadata
const pageMeta = {
  home: {
    title: 'Welcome to Meridian',
    subtitle: 'Choose where you want to continue today.',
    context: 'Home'
  },
  dashboard: {
    title: 'Student dashboard',
    subtitle: 'Continue coursework, review progress, and plan the next activity.',
    context: 'Learning workspace'
  },
  catalog: { title: 'Course catalog', subtitle: 'Search and compare published learning options.', context: 'Student workspace' },
  'my-learning': { title: 'My learning', subtitle: 'Continue enrolled courses and review saved progress.', context: 'Student workspace' },
  'quiz-results': { title: 'Quiz results', subtitle: 'Review your saved assessment history.', context: 'Student workspace' },
  'course-detail': {
    title: 'Course details',
    subtitle: 'Review the course outline and choose how to begin.',
    context: 'Course catalog'
  },
  lesson: {
    title: 'Lesson viewer',
    subtitle: 'Study course material and keep module progress up to date.',
    context: 'Course delivery'
  },
  quiz: {
    title: 'Quiz module',
    subtitle: 'Complete the assessment with a focused, question-by-question flow.',
    context: 'Assessment'
  },
  payment: {
    title: 'Checkout',
    subtitle: 'Complete your payment and unlock the course.',
    context: 'Enrollment checkout'
  },
  'course-draft': {
    title: 'Course drafts',
    subtitle: 'Create, organize, and publish engaging course content.',
    context: 'Instructor workspace'
  },
  'instructor-dashboard': {
    title: 'Teaching dashboard',
    subtitle: 'Track your courses, learners, progress, and assessment activity.',
    context: 'Instructor workspace'
  },
  'instructor-courses': { title: 'My courses', subtitle: 'Review owned courses and open the course studio.', context: 'Instructor workspace' },
  'instructor-results': { title: 'Quiz results', subtitle: 'Review assessment performance for your courses.', context: 'Instructor workspace' },
  'instructor-monitoring': {
    title: 'Student progress',
    subtitle: 'Review course enrollment and saved learning progress.',
    context: 'Instructor workspace'
  },
  'revenue-report': {
    title: 'Revenue and sales',
    subtitle: 'Review payment activity and course performance.',
    context: 'Administration'
  },
  'admin-dashboard': {
    title: 'Platform dashboard',
    subtitle: 'Review users, courses, activity, payments, and revenue.',
    context: 'Administration'
  },
  'activity-report': { title: 'Activity report', subtitle: 'Review account sign-ins and access outcomes.', context: 'Administration' },
  profile: { title: 'Your profile', subtitle: 'Manage your account details and password.', context: 'User account' },
  'user-management': { title: 'User management', subtitle: 'Review roles and account availability.', context: 'Administration' },
  'course-operations': { title: 'Course operations', subtitle: 'Moderate courses and maintain category assignments.', context: 'Administration' }
};

const tabPages = new Set(['home', 'dashboard', 'catalog', 'my-learning', 'quiz-results', 'instructor-dashboard', 'instructor-courses', 'course-draft', 'instructor-monitoring', 'instructor-results', 'admin-dashboard', 'revenue-report', 'profile', 'user-management', 'course-operations', 'activity-report']);
const studentOnlyPages = new Set(['dashboard', 'catalog', 'my-learning', 'quiz-results', 'course-detail', 'lesson', 'quiz', 'payment']);
const instructorOnlyPages = new Set(['instructor-dashboard', 'instructor-courses', 'course-draft', 'instructor-monitoring', 'instructor-results']);
const adminOnlyPages = new Set(['admin-dashboard', 'revenue-report', 'user-management', 'course-operations', 'activity-report']);

function normalizePayment(payment) {
  return {
    id: payment.id,
    courseId: payment.courseId ?? payment.course_id,
    amount: Number(payment.amount || 0),
    currency: payment.currency || 'VND',
    status: payment.status || payment.payment_status,
    provider: payment.provider || payment.payment_method,
    appTransId: payment.appTransId || payment.gateway_transaction_id,
    createdAt: payment.createdAt || payment.created_at
  };
}

export default function App() {
  const [authSession, setAuthSession] = useState(null);
  const [publicPage, setPublicPage] = useState('login');
  const [publicCourseId, setPublicCourseId] = useState(null);
  const user = authSession
    ? { ...authSession.userProfile, role: authSession.role, full_name: authSession.userProfile.fullName }
    : null;
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePage, setActivePage] = useState(null); // 'lesson', 'quiz', 'payment'
  const [pageParams, setPageParams] = useState(null);

  const [catalogCourses, setCatalogCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [instructorDrafts, setInstructorDrafts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [studentDataErrors, setStudentDataErrors] = useState([]);
  const studentRequestId = React.useRef(0);

  const courses = React.useMemo(() => {
    const byId = new Map(catalogCourses.map(course => [Number(course.id), course]));
    for (const enrolled of enrolledCourses) {
      const id = Number(enrolled.id);
      byId.set(id, {
        ...(byId.get(id) || {}),
        ...enrolled,
        price: Number(enrolled.price || 0),
        progress_percent: Number(enrolled.progress_percent || 0)
      });
    }
    return [...byId.values()];
  }, [catalogCourses, enrolledCourses]);

  const courseAccess = React.useMemo(() => enrolledCourses.map(course => ({
    id: course.id,
    course_id: course.id,
    access_status: 'active'
  })), [enrolledCourses]);

  const loadCatalog = React.useCallback(async (filters = {}) => {
    const query = new URLSearchParams();
    for (const field of ['search', 'category', 'priceType', 'minPrice', 'maxPrice']) {
      const value = filters[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        query.set(field, String(value).trim());
      }
    }

    setCatalogLoading(true);
    setCatalogError('');
    try {
      const body = await studentApi.getCatalog(Object.fromEntries(query));
      setCatalogCourses(Array.isArray(body) ? body : []);
    } catch (error) {
      setCatalogError(error.message || 'The course catalog could not be loaded.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadStudentWorkspace = React.useCallback(async () => {
    if (authSession?.role !== 'student' || !authSession.accessToken) return;
    const requestId = ++studentRequestId.current;
    setStudentDataLoading(true);
    setStudentDataErrors([]);

    const token = authSession.accessToken;
    const [enrollmentResult, paymentResult, resultResult] = await Promise.allSettled([
      studentApi.getEnrolledCourses(token),
      studentApi.getPaymentHistory(token),
      studentApi.getQuizResults(token)
    ]);
    if (requestId !== studentRequestId.current) return;

    const errors = [];
    let currentEnrollments = [];
    if (enrollmentResult.status === 'fulfilled') {
      currentEnrollments = Array.isArray(enrollmentResult.value) ? enrollmentResult.value : [];
      setEnrolledCourses(currentEnrollments);
    } else {
      errors.push(`Enrolled courses: ${enrollmentResult.reason.message}`);
    }

    if (paymentResult.status === 'fulfilled') {
      setPayments((paymentResult.value.items || []).map(normalizePayment));
    } else {
      errors.push(`Payment history: ${paymentResult.reason.message}`);
    }

    if (resultResult.status === 'fulfilled') {
      setQuizAttempts(resultResult.value.items || []);
    } else {
      errors.push(`Quiz results: ${resultResult.reason.message}`);
    }

    if (enrollmentResult.status === 'fulfilled') {
      const quizResults = await Promise.allSettled(currentEnrollments.map(async (course) => {
        const body = await studentApi.getCourseQuizzes(course.id, token);
        return (body.items || []).map(quiz => ({ ...quiz, courseId: quiz.courseId || course.id }));
      }));
      if (requestId !== studentRequestId.current) return;
      setQuizzes(quizResults.flatMap(result => result.status === 'fulfilled' ? result.value : []));
      const quizFailureCount = quizResults.filter(result => result.status === 'rejected').length;
      if (quizFailureCount > 0) {
        errors.push(`Assessments: ${quizFailureCount} enrolled course${quizFailureCount === 1 ? '' : 's'} could not be checked.`);
      }
    }

    setStudentDataErrors(errors);
    setStudentDataLoading(false);
  }, [authSession?.accessToken, authSession?.role]);

  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  React.useEffect(() => {
    studentRequestId.current += 1;
    setEnrolledCourses([]);
    setPayments([]);
    setQuizAttempts([]);
    setQuizzes([]);
    setStudentDataErrors([]);
    setStudentDataLoading(false);
    if (authSession?.role === 'student') loadStudentWorkspace();
  }, [authSession?.accessToken, authSession?.role, loadStudentWorkspace]);

  const handleLogin = (session) => {
    const authenticatedRole = session.role;
    setAuthSession(session);
    setPublicPage('login');
    setPublicCourseId(null);
    setActivePage(null);
    setPageParams(null);
    if (authenticatedRole === 'student') {
      setCurrentTab('dashboard');
    } else if (authenticatedRole === 'instructor') {
      setCurrentTab('instructor-dashboard');
    } else if (authenticatedRole === 'admin') {
      setCurrentTab('admin-dashboard');
    }
  };

  const handleLogout = () => {
    studentRequestId.current += 1;
    setAuthSession(null);
    setCurrentTab('dashboard');
    setActivePage(null);
    setPageParams(null);
    setEnrolledCourses([]);
    setPayments([]);
    setQuizAttempts([]);
    setQuizzes([]);
    setStudentDataErrors([]);
  };

  const handleProfileUpdated = (profile) => {
    setAuthSession(session => ({
      ...session,
      role: profile.role,
      userProfile: { ...session.userProfile, ...profile }
    }));
  };

  const handleNavigate = (page, params = null) => {
    if (tabPages.has(page)) {
      setCurrentTab(page);
      setActivePage(null);
      setPageParams(null);
      return;
    }
    setActivePage(page);
    setPageParams(params);
  };

  const handleBackToDashboard = () => {
    setActivePage(null);
    setPageParams(null);
    setCurrentTab('dashboard');
  };

  const handleSaveDraft = (newDraft) => {
    setInstructorDrafts(previous => [newDraft, ...previous.filter(draft => draft.id !== newDraft.id)]);
  };

  const handlePaymentSuccess = async (payment) => {
    const normalized = normalizePayment(payment);
    setPayments(previous => [normalized, ...previous.filter(item => item.id !== normalized.id)]);
    await loadStudentWorkspace();
  };

  const handleEnrollFreeCourse = async (courseId) => {
    const body = await studentApi.enrollFreeCourse(courseId, authSession.accessToken);
    await loadStudentWorkspace();
    return body;
  };

  // Render public catalog or login before an authenticated workspace exists.
  if (!user) {
    if (publicPage === 'catalog' || publicPage === 'course-detail') {
      return (
        <div className="public-catalog-shell">
          <header className="public-catalog-header">
            <button className="sidebar__brand" type="button" onClick={() => { setPublicPage('catalog'); setPublicCourseId(null); }}>
              <span className="sidebar__mark" aria-hidden="true">M</span>
              <span className="sidebar__brand-copy"><strong>Meridian LMS</strong><small>Course catalog</small></span>
            </button>
            <button className="btn btn-primary" type="button" onClick={() => { setPublicPage('login'); setPublicCourseId(null); }}>Sign in</button>
          </header>
          <main className="public-catalog-content">
            {publicPage === 'catalog' ? (
              <StudentCatalogPage
                courses={catalogCourses}
                enrolledCourseIds={new Set()}
                loading={catalogLoading}
                error={catalogError}
                onFiltersChange={loadCatalog}
                onNavigate={(_, params) => { setPublicCourseId(params?.courseId); setPublicPage('course-detail'); }}
              />
            ) : (
              <CourseDetailPage
                courseId={publicCourseId}
                isEnrolled={false}
                onBack={() => setPublicPage('catalog')}
                requiresSignIn
                onRequireSignIn={() => { setPublicPage('login'); setPublicCourseId(null); }}
              />
            )}
          </main>
        </div>
      );
    }
    return <LoginPage onLogin={handleLogin} onBrowseCourses={() => setPublicPage('catalog')} />;
  }

  // Render Sub-pages (within Student shell)
  const renderPage = () => {
    const requestedPage = activePage || currentTab;
    if (studentOnlyPages.has(requestedPage) && authSession.role !== 'student') {
      return <div className="access-denied" role="alert"><strong>Student access required</strong><span>This workspace is available to authenticated student accounts only.</span></div>;
    }
    if (instructorOnlyPages.has(requestedPage) && authSession.role !== 'instructor') {
      return <div className="access-denied" role="alert"><strong>Instructor access required</strong><span>This workspace is available to authenticated instructor accounts only.</span></div>;
    }
    if (adminOnlyPages.has(requestedPage) && authSession.role !== 'admin') {
      return <div className="access-denied" role="alert"><strong>Administrator access required</strong><span>This workspace is restricted to administrator accounts.</span></div>;
    }

    if (activePage === 'lesson') {
      const selectedCourse = pageParams?.course || courses.find(course => course.id === pageParams?.courseId);
      return (
        <LessonPage
          courseId={selectedCourse?.id}
          course={selectedCourse}
          accessToken={authSession.accessToken}
          isEnrolled={courseAccess.some(access => access.course_id === selectedCourse?.id && access.access_status === 'active')}
          onBuyCourse={(courseId) => handleNavigate('payment', { courseId, course: courses.find(item => item.id === courseId) })}
          onOpenQuiz={(courseId) => handleNavigate('quiz', { courseId })}
          onBack={handleBackToDashboard}
        />
      );
    }
    if (activePage === 'course-detail') {
      const selectedCourseId = pageParams?.courseId || pageParams?.course?.id;
      const enrollment = enrolledCourses.find(course => Number(course.id) === Number(selectedCourseId));
      return (
        <CourseDetailPage
          courseId={selectedCourseId}
          isEnrolled={Boolean(enrollment)}
          enrollment={enrollment}
          onBack={handleBackToDashboard}
          onContinue={(course) => handleNavigate('lesson', { courseId: course.id, course })}
          onBuy={(course) => handleNavigate('payment', { courseId: course.id, course })}
          onEnrollFree={handleEnrollFreeCourse}
        />
      );
    }
    if (activePage === 'quiz') {
      return (
        <QuizPage
          quizId={pageParams?.quizId}
          courseId={pageParams?.courseId}
          accessToken={authSession.accessToken}
          onBack={handleBackToDashboard}
        />
      );
    }
    if (activePage === 'payment') {
      const selectedCourse = pageParams?.course || courses.find(course => course.id === pageParams?.courseId);
      return (
        <PaymentPage
          course={selectedCourse}
          accessToken={authSession.accessToken}
          onPaymentSuccess={handlePaymentSuccess}
          onBack={handleBackToDashboard}
        />
      );
    }

    // Render Tabbed Pages
    switch (currentTab) {
      case 'home':
        return (
          <section className="card overview-action" aria-labelledby="home-title">
            <div>
              <span className="page-kicker">Meridian LMS</span>
              <h2 id="home-title">Ready to keep moving forward?</h2>
              <p>Open your workspace to continue courses, manage content, or review account activity.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setCurrentTab(authSession.role === 'student' ? 'dashboard' : authSession.role === 'instructor' ? 'instructor-dashboard' : 'admin-dashboard')}>
              Open my workspace
            </button>
          </section>
        );
      case 'dashboard':
        return (
          <StudentDashboard
            courses={courses}
            courseAccess={courseAccess}
            payments={payments}
            quizAttempts={quizAttempts}
            quizzes={quizzes}
            user={user}
            loading={studentDataLoading}
            dataErrors={studentDataErrors}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            onCatalogFiltersChange={loadCatalog}
            onNavigate={handleNavigate}
          />
        );
      case 'catalog':
        return <StudentCatalogPage courses={catalogCourses.map(course => ({ ...course, ...(enrolledCourses.find(item => Number(item.id) === Number(course.id)) || {}) }))} enrolledCourseIds={new Set(enrolledCourses.map(course => Number(course.id)))} loading={catalogLoading} error={catalogError} onFiltersChange={loadCatalog} onNavigate={handleNavigate} />;
      case 'my-learning':
        return <StudentLearningPage courses={enrolledCourses} loading={studentDataLoading} errors={studentDataErrors} onNavigate={handleNavigate} />;
      case 'quiz-results':
        return <StudentResultsPage results={quizAttempts} quizzes={quizzes} loading={studentDataLoading} errors={studentDataErrors} onNavigate={handleNavigate} />;
      case 'instructor-dashboard':
        return <InstructorDashboard accessToken={authSession.accessToken} onNavigate={handleNavigate} />;
      case 'instructor-courses':
        return <InstructorCoursesPage accessToken={authSession.accessToken} onNavigate={handleNavigate} />;
      case 'lesson': {
        const selectedCourse = enrolledCourses[0] || courses[0];
        return (
          <LessonPage
            courseId={selectedCourse?.id}
            course={selectedCourse}
            accessToken={authSession.accessToken}
            isEnrolled={enrolledCourses.some(course => course.id === selectedCourse?.id)}
            onBuyCourse={(courseId) => handleNavigate('payment', { courseId, course: courses.find(item => item.id === courseId) })}
            onOpenQuiz={(courseId) => handleNavigate('quiz', { courseId })}
            onBack={handleBackToDashboard}
          />
        );
      }
      case 'quiz': {
        const selectedQuiz = quizzes[0];
        return <QuizPage quizId={selectedQuiz?.id} courseId={selectedQuiz?.courseId || enrolledCourses[0]?.id} accessToken={authSession.accessToken} onBack={handleBackToDashboard} />;
      }
      case 'payment': {
        const selectedCourse = courses.find(course => !courseAccess.some(access => access.course_id === course.id) && Number(course.price) > 0);
        return (
          <PaymentPage
            course={selectedCourse}
            accessToken={authSession.accessToken}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={handleBackToDashboard}
          />
        );
      }
      case 'course-draft':
        return (
          <InstructorCourseDraft
            onSaveDraft={handleSaveDraft}
            initialDrafts={instructorDrafts}
            accessToken={authSession.accessToken}
            userProfile={authSession.userProfile}
            role={authSession.role}
          />
        );
      case 'instructor-monitoring':
        return <InstructorMonitoring accessToken={authSession.accessToken} mode="progress" />;
      case 'instructor-results':
        return <InstructorMonitoring accessToken={authSession.accessToken} mode="results" />;
      case 'admin-dashboard':
        return <AdminDashboard accessToken={authSession.accessToken} onNavigate={handleNavigate} />;
      case 'revenue-report':
        return (
          <AdminRevenueReport
            accessToken={authSession.accessToken}
          />
        );
      case 'profile':
        return <ProfilePage accessToken={authSession.accessToken} onProfileUpdated={handleProfileUpdated} />;
      case 'user-management':
        return <AdminUserManagement accessToken={authSession.accessToken} currentUserId={user.id} />;
      case 'course-operations':
        return <AdminCourseOperations accessToken={authSession.accessToken} mode="courses" />;
      case 'activity-report':
        return <AdminCourseOperations accessToken={authSession.accessToken} mode="activity" />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <AppShell
      currentTab={activePage || currentTab}
      onTabChange={(tab) => { setActivePage(null); setCurrentTab(tab); }}
      user={user}
      onLogout={handleLogout}
      pageMeta={pageMeta[activePage || currentTab]}
    >
      {renderPage()}
    </AppShell>
  );
}
