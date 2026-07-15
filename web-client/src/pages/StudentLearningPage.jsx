import React from 'react';
import CourseCard from '../components/CourseCard';
import StatCard from '../components/StatCard';

export default function StudentLearningPage({ courses, loading, errors, onNavigate }) {
  const completedLessons = courses.reduce((sum, course) => sum + Number(course.completed_lessons || 0), 0);
  const totalLessons = courses.reduce((sum, course) => sum + Number(course.total_lessons || 0), 0);
  const averageProgress = courses.length === 0 ? 0 : Math.round(courses.reduce((sum, course) => sum + Number(course.progress_percent || 0), 0) / courses.length);
  const completedCourses = courses.filter(course => Number(course.progress_percent || 0) >= 100).length;

  return <section className="page-stack" aria-labelledby="my-learning-title">
    <header className="page-intro"><p className="page-kicker">Student workspace</p><h2 className="page-title" id="my-learning-title">My learning</h2><p className="page-description">Continue enrolled courses and review progress saved from completed lessons.</p></header>
    {errors.length > 0 && <div className="form-alert form-alert--warning" role="alert">{errors.join(' ')}</div>}
    {loading ? <div className="card" role="status">Loading your courses...</div> : <>
      <div className="metrics-grid"><StatCard eyebrow="Course access" title="Enrolled courses" value={courses.length} description={`${completedCourses} completed`} tone="primary" /><StatCard eyebrow="Learning progress" title="Average progress" value={`${averageProgress}%`} description="Across active courses" tone="success" /><StatCard eyebrow="Completed work" title="Completed lessons" value={completedLessons} description={`${Math.max(totalLessons - completedLessons, 0)} lessons remaining`} /></div>
      {courses.length === 0 ? <div className="card empty-state" role="status"><strong>No enrolled courses yet</strong><p>Open the course catalog to choose your first course.</p><button className="btn btn-primary" type="button" onClick={() => onNavigate('catalog')}>Browse courses</button></div> : <div className="course-grid">{courses.map(course => <CourseCard key={course.id} course={course} isEnrolled actionLabel="Continue Learning" onAction={() => onNavigate('lesson', { courseId: course.id, course })} />)}</div>}
    </>}
  </section>;
}
