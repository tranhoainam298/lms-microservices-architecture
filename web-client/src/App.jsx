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
import { apiUrl } from './config/api';

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
  'instructor-monitoring': {
    title: 'Student progress',
    subtitle: 'Review course enrollment, learning progress, and quiz performance.',
    context: 'Instructor workspace'
  },
  'revenue-report': {
    title: 'Revenue and sales',
    subtitle: 'Review payment activity and course performance.',
    context: 'Administration'
  },
  profile: { title: 'Your profile', subtitle: 'Manage your account details and password.', context: 'User account' },
  'user-management': { title: 'User management', subtitle: 'Review roles and account availability.', context: 'Administration' },
  'course-operations': { title: 'Course operations', subtitle: 'Moderate courses and review account activity.', context: 'Administration' }
};

const tabPages = new Set(['home', 'dashboard', 'course-draft', 'instructor-monitoring', 'revenue-report', 'profile', 'user-management', 'course-operations']);
const studentOnlyPages = new Set(['dashboard', 'lesson', 'quiz', 'payment']);
const instructorOnlyPages = new Set(['course-draft', 'instructor-monitoring']);
const adminOnlyPages = new Set(['revenue-report', 'user-management', 'course-operations']);

async function requestJson(path, accessToken) {
  const response = await fetch(apiUrl(path), {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || 'The requested information could not be loaded.');
  }
  return body;
}

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
    for (const field of ['search', 'category', 'minPrice', 'maxPrice']) {
      const value = filters[field];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        query.set(field, String(value).trim());
      }
    }

    setCatalogLoading(true);
    setCatalogError('');
    try {
      const queryString = query.toString();
      const path = `/courses${queryString ? `?${queryString}` : ''}`;
      const body = await requestJson(path);
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
      requestJson('/courses/enrolled', token),
      requestJson('/payments/mine', token),
      requestJson('/exams/results/mine', token)
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
        const body = await requestJson(`/exams/courses/${course.id}/quizzes`, token);
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
    setActivePage(null);
    setPageParams(null);
    if (authenticatedRole === 'student') {
      setCurrentTab('dashboard');
    } else if (authenticatedRole === 'instructor') {
      setCurrentTab('course-draft');
    } else if (authenticatedRole === 'admin') {
      setCurrentTab('revenue-report');
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
    const response = await fetch(apiUrl(`/courses/${courseId}/enroll`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${authSession.accessToken}` }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || 'The course could not be enrolled.');
    }
    await loadStudentWorkspace();
    return body;
  };

  // Render Login if no authenticated session
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
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
            <button className="btn btn-primary" type="button" onClick={() => setCurrentTab(authSession.role === 'student' ? 'dashboard' : authSession.role === 'instructor' ? 'course-draft' : 'user-management')}>
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
            onEnrollFreeCourse={handleEnrollFreeCourse}
            onNavigate={handleNavigate}
          />
        );
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
        return <InstructorMonitoring accessToken={authSession.accessToken} />;
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
        return <AdminCourseOperations accessToken={authSession.accessToken} />;
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
