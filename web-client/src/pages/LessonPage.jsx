import React, { useState } from 'react';

export default function LessonPage({ courseId, lessons, courseAccess, progress, onUpdateProgress, onBack }) {
  const activeCourseLessons = lessons.filter(l => l.course_id === courseId);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);

  const currentLesson = activeCourseLessons[currentLessonIndex];
  
  if (!currentLesson) {
    return (
      <div className="card text-center" style={{ padding: '3rem' }}>
        <h2>No lessons found in this course.</h2>
        <button className="btn btn-secondary mt-6" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  // Get progress status for current lesson
  const currentProgress = progress.find(p => p.lesson_id === currentLesson.id);
  const isCompleted = currentProgress?.progress_status === 'completed';

  const handleMarkComplete = () => {
    setSavingProgress(true);
    // Simulate updating progress in Course DB
    setTimeout(() => {
      onUpdateProgress(currentLesson.id, 'completed');
      setSavingProgress(false);
    }, 600);
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  };

  const videoMockStyle = {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#0f172a',
    borderRadius: 'var(--border-radius)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden'
  };

  const sidebarListStyle = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  const getLessonLinkStyle = (index) => {
    const isCurrent = index === currentLessonIndex;
    const lesson = activeCourseLessons[index];
    const lessonProgress = progress.find(p => p.lesson_id === lesson.id);
    const completed = lessonProgress?.progress_status === 'completed';

    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--border-radius-sm)',
      backgroundColor: isCurrent ? 'var(--primary-light)' : 'transparent',
      color: isCurrent ? 'var(--primary-hover)' : 'var(--text-secondary)',
      border: isCurrent ? '1px solid var(--primary)' : '1px solid transparent',
      textDecoration: 'none',
      fontWeight: isCurrent ? '600' : '400',
      cursor: 'pointer'
    };
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Course Classroom</h1>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Access: **AUTHORIZED** (course_access check passed)
        </div>
      </div>

      <div className="architecture-alert">
        <span>📖</span>
        <span>Flow: **Learning Management: View Lesson / Update Progress** (Course Service / Course DB)</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lesson Player Area */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={videoMockStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
            <h3 style={{ color: '#ffffff', fontFamily: 'var(--font-sans)', fontWeight: '500' }}>
              {currentLesson.title}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Simulated Video Player ({currentLesson.content_url})
            </p>
            <div style={{ position: 'absolute', bottom: '1.5rem', width: '90%', height: '6px', backgroundColor: '#334155', borderRadius: '3px' }}>
              <div style={{ width: isCompleted ? '100%' : '35%', height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Mark Progress</h3>
              <p className="text-sm text-secondary-color">Track your learning goals in the Course DB.</p>
            </div>
            <div>
              {isCompleted ? (
                <div style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✓ Completed
                </div>
              ) : (
                <button className="btn btn-primary" onClick={handleMarkComplete} disabled={savingProgress}>
                  {savingProgress ? 'Saving...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lessons List Sidebar */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Syllabus Lessons
          </h3>
          <ul style={sidebarListStyle}>
            {activeCourseLessons.map((lesson, idx) => {
              const lessonProgress = progress.find(p => p.lesson_id === lesson.id);
              const completed = lessonProgress?.progress_status === 'completed';
              return (
                <li key={lesson.id}>
                  <div 
                    style={getLessonLinkStyle(idx)} 
                    onClick={() => setCurrentLessonIndex(idx)}
                  >
                    <span>{lesson.title}</span>
                    <span>{completed ? '✅' : '⏳'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
