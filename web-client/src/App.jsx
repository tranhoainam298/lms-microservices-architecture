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
import AiSupportPage from './pages/AiSupportPage';
import OverviewPage from './pages/OverviewPage';

// Mock Databases
import { 
  mockCourses, 
  mockCourseAccess, 
  mockPayments, 
  mockLearningProgress,
  mockQuizAttempts,
  mockLessons,
  mockQuizzes
} from './data/mockData';

const pageMeta = {
  overview: {
    title: 'System overview',
    subtitle: 'Trace learning journeys across every service boundary.',
    context: 'Platform architecture'
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
    title: 'Payment simulator',
    subtitle: 'Review a mock checkout and trace course access activation.',
    context: 'Enrollment checkout'
  },
  'ai-support': {
    title: 'AI study support',
    subtitle: 'Ask an external assistant using the current lesson context.',
    context: 'Learning assistance'
  },
  'course-draft': {
    title: 'Course drafts',
    subtitle: 'Structure and save course metadata through the Course Service.',
    context: 'Instructor workspace'
  },
  'revenue-report': {
    title: 'Revenue and sales',
    subtitle: 'Review payment activity and course contribution without a reporting service.',
    context: 'Administration'
  }
};

const tabPages = new Set(['overview', 'dashboard', 'ai-support', 'course-draft', 'revenue-report']);
const studentOnlyPages = new Set(['dashboard', 'lesson', 'quiz', 'payment', 'ai-support']);

export default function App() {
  const [authSession, setAuthSession] = useState(null);
  const user = authSession
    ? { ...authSession.userProfile, role: authSession.role, full_name: authSession.userProfile.fullName }
    : null;
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activePage, setActivePage] = useState(null); // 'lesson', 'quiz', 'payment'
  const [pageParams, setPageParams] = useState(null);

  // Simulated Database states
  const [courses, setCourses] = useState(mockCourses);
  const [courseAccess, setCourseAccess] = useState(mockCourseAccess);
  const [payments, setPayments] = useState(mockPayments);
  const [progress, setProgress] = useState(mockLearningProgress);
  const [quizAttempts, setQuizAttempts] = useState(mockQuizAttempts);

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

  const handlePaymentSuccess = (newPayment) => {
    setPayments(prev => [newPayment, ...prev]);
    
    // Simulate RabbitMQ Event-Driven Access Activation:
    // Course Service receives PaymentSucceededEvent and updates Course DB (course_access).
    const newAccess = {
      id: Date.now(),
      user_id: user.id,
      course_id: newPayment.course_id,
      access_status: 'active',
      activated_at: new Date().toISOString()
    };
    setCourseAccess(prev => [...prev, newAccess]);
  };

  const handleUpdateProgress = (lessonId, status) => {
    const existing = progress.find(p => p.lesson_id === lessonId && p.user_id === user.id);
    if (existing) {
      setProgress(prev => prev.map(p => 
        (p.lesson_id === lessonId && p.user_id === user.id) 
          ? { ...p, progress_status: status, completed_at: new Date().toISOString() } 
          : p
      ));
    } else {
      const newProgress = {
        id: Date.now(),
        user_id: user.id,
        course_id: pageParams?.courseId,
        lesson_id: lessonId,
        progress_status: status,
        completed_at: new Date().toISOString()
      };
      setProgress(prev => [...prev, newProgress]);
    }
  };

  const handleSubmitQuiz = (result) => {
    const newAttempt = {
      id: result.attempt_id,
      quiz_id: 801,
      user_id: user.id,
      started_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      status: 'graded'
    };
    setQuizAttempts(prev => [...prev, newAttempt]);
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

    if (activePage === 'lesson') {
      return (
        <LessonPage 
          courseId={pageParams?.courseId} 
          lessons={mockLessons} 
          courseAccess={courseAccess}
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onBack={handleBackToDashboard}
        />
      );
    }
    if (activePage === 'quiz') {
      return (
        <QuizPage 
          quizId={pageParams?.quizId} 
          onSubmitQuiz={handleSubmitQuiz}
          onBack={handleBackToDashboard}
        />
      );
    }
    if (activePage === 'payment') {
      const selectedCourse = courses.find(c => c.id === pageParams?.courseId);
      return (
        <PaymentPage 
          course={selectedCourse} 
          onPaymentSuccess={handlePaymentSuccess}
          onBack={handleBackToDashboard}
        />
      );
    }

    // Render Tabbed Pages
    switch (currentTab) {
      case 'overview':
        return <OverviewPage onNavigate={handleNavigate} role={authSession.role} />;
      case 'dashboard':
        return (
          <StudentDashboard 
            courses={courses}
            courseAccess={courseAccess}
            payments={payments}
            quizAttempts={quizAttempts}
            progress={progress}
            quizzes={mockQuizzes}
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'lesson':
        return (
          <LessonPage
            courseId={201}
            lessons={mockLessons}
            courseAccess={courseAccess}
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
            onBack={handleBackToDashboard}
          />
        );
      case 'quiz':
        return <QuizPage quizId={801} onSubmitQuiz={handleSubmitQuiz} onBack={handleBackToDashboard} />;
      case 'payment':
        return (
          <PaymentPage
            course={courses.find(course => course.id === 201)}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={handleBackToDashboard}
          />
        );
      case 'ai-support':
        return <AiSupportPage />;
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
            payments={payments} 
            courses={courses} 
          />
        );
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
