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
import AiSupportPage from './pages/AiSupportPage';
import OverviewPage from './pages/OverviewPage';
import { apiUrl } from './config/api';

// Mock Databases
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
  'revenue-report': {
    title: 'Revenue and sales',
    subtitle: 'Review payment activity and course performance.',
    context: 'Administration'
  },
  profile: { title: 'Your profile', subtitle: 'Manage your account details and password.', context: 'User account' },
  'user-management': { title: 'User management', subtitle: 'Review and activate platform accounts.', context: 'Administration' },
  'ai-support': { title: 'AI Learning Assistant', subtitle: 'Ask questions about your course content.', context: 'AI Support' },
  'overview': { title: 'System Overview', subtitle: 'Architecture and service status.', context: 'Platform' }
};

const tabPages = new Set(['home', 'dashboard', 'course-draft', 'revenue-report', 'profile', 'user-management', 'ai-support', 'overview']);
const studentOnlyPages = new Set(['dashboard', 'lesson', 'quiz', 'payment']);

export default function App() {
  const [authSession, setAuthSession] = useState(null);
  const user = authSession
    ? { ...authSession.userProfile, role: authSession.role, full_name: authSession.userProfile.fullName }
    : null;
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePage, setActivePage] = useState(null); // 'lesson', 'quiz', 'payment'
  const [pageParams, setPageParams] = useState(null);

  // Real Database states
  const [courses, setCourses] = useState([]);
  const [courseAccess, setCourseAccess] = useState([]);
  const [payments, setPayments] = useState([]);

  const refreshEnrolledCourses = async () => {
    if (authSession?.role !== 'student') return;
    const accessRes = await fetch(apiUrl('/courses/enrolled'), {
      headers: { 'Authorization': `Bearer ${authSession.accessToken}` }
    });
    if (!accessRes.ok) throw new Error('Enrolled courses could not be refreshed.');
    const enrolled = await accessRes.json();
    setCourses(current => current.map(course => {
      const enrolledCourse = enrolled.find(item => item.id === course.id);
      return enrolledCourse ? { ...course, progress_percent: Number(enrolledCourse.progress_percent || 0) } : course;
    }));
    setCourseAccess(enrolled.map(course => ({
      id: course.id,
      user_id: authSession.userProfile.id,
      course_id: course.id,
      access_status: 'active'
    })));
  };

  React.useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(apiUrl('/courses'), {
          headers: authSession ? { 'Authorization': `Bearer ${authSession.accessToken}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
        
        if (authSession?.role === 'student') {
          await refreshEnrolledCourses();
        }
      } catch (err) {
        console.error('Failed to load courses', err);
        setCourses([]);
      }
    }
    loadData();
  }, [authSession]);

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
    setAuthSession(null);
    setCurrentTab('dashboard');
    setActivePage(null);
    setPageParams(null);
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
    setCourses(prev => [{ ...newDraft, instructor_id: newDraft.instructorId }, ...prev]);
  };

  const handlePaymentSuccess = async (payment) => {
    setPayments(prev => [payment, ...prev.filter(item => item.id !== payment.id)]);
    await refreshEnrolledCourses();
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
    if (requestedPage === 'course-draft' && authSession.role !== 'instructor') {
      return <div className="access-denied" role="alert"><strong>Instructor access required</strong><span>Only instructors can create and save course drafts.</span></div>;
    }
    if (requestedPage === 'revenue-report' && authSession.role !== 'admin') {
      return <div className="access-denied" role="alert"><strong>Administrator access required</strong><span>Revenue data is restricted to administrator accounts.</span></div>;
    }
    if (requestedPage === 'user-management' && authSession.role !== 'admin') {
      return <div className="access-denied" role="alert"><strong>Administrator access required</strong><span>Only administrators can manage user accounts.</span></div>;
    }

    if (activePage === 'lesson') {
      return (
        <LessonPage 
          courseId={pageParams?.courseId} 
          course={courses.find(course => course.id === pageParams?.courseId)}
          accessToken={authSession.accessToken}
          isEnrolled={courseAccess.some(access => access.course_id === pageParams?.courseId && access.access_status === 'active')}
          onBuyCourse={(courseId) => handleNavigate('payment', { courseId })}
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
      const selectedCourse = courses.find(c => c.id === pageParams?.courseId);
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
            quizAttempts={[]}
            progress={[]}
            quizzes={[]}
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'lesson':
        return (
          <LessonPage
            courseId={courseAccess[0]?.course_id || courses[0]?.id}
            course={courses.find(course => course.id === (courseAccess[0]?.course_id || courses[0]?.id))}
            accessToken={authSession.accessToken}
            isEnrolled={Boolean(courseAccess[0])}
            onBuyCourse={(courseId) => handleNavigate('payment', { courseId })}
            onOpenQuiz={(courseId) => handleNavigate('quiz', { courseId })}
            onBack={handleBackToDashboard}
          />
        );
      case 'quiz':
        return <QuizPage courseId={pageParams?.courseId} accessToken={authSession.accessToken} onBack={handleBackToDashboard} />;
      case 'payment':
        return (
          <PaymentPage
            course={courses.find(course => course.id === 201)}
            accessToken={authSession.accessToken}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={handleBackToDashboard}
          />
        );
      case 'course-draft':
        return (
          <InstructorCourseDraft 
            onSaveDraft={handleSaveDraft}
            initialDrafts={courses.filter(c => c.instructor_id === user.id && c.status === 'draft')}
            accessToken={authSession.accessToken}
            userProfile={authSession.userProfile}
            role={authSession.role}
          />
        );
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
      case 'ai-support':
        return <AiSupportPage />;
      case 'overview':
        return <OverviewPage />;
      default:
        return <div>Tab not found</div>;
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
