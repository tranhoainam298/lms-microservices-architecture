import React, { useState } from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';
import ProgressBar from '../components/ProgressBar';
import { mockCourses } from '../data/mockData';

export default function LessonPage({ courseId, lessons, courseAccess, progress, onUpdateProgress, onBack }) {
  const activeCourseId = courseId || 201;
  const activeCourseLessons = lessons.filter(lesson => lesson.course_id === activeCourseId);
  const activeCourse = mockCourses.find(course => course.id === activeCourseId);
  const activeAccess = courseAccess?.find(access => (
    access.course_id === activeCourseId && access.access_status === 'active'
  ));
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [lessonNotes, setLessonNotes] = useState({});

  const currentLesson = activeCourseLessons[currentLessonIndex];

  if (!currentLesson) {
    return (
      <section className="card empty-state" role="status" aria-labelledby="lesson-empty-title">
        <span className="page-kicker">Course content</span>
        <h2 id="lesson-empty-title">No lessons found in this course</h2>
        <p>Return to your dashboard and choose another available course.</p>
        <button className="btn btn-secondary" type="button" onClick={onBack}>
          Back to dashboard
        </button>
      </section>
    );
  }

  // Get progress status for current lesson
  const currentProgress = progress.find(item => item.lesson_id === currentLesson.id);
  const isCompleted = currentProgress?.progress_status === 'completed';
  const completedLessonCount = activeCourseLessons.filter(lesson => (
    progress.find(item => item.lesson_id === lesson.id)?.progress_status === 'completed'
  )).length;
  const moduleProgress = Math.round((completedLessonCount / activeCourseLessons.length) * 100);

  const handleMarkComplete = () => {
    setSavingProgress(true);
    // Simulate updating progress in Course DB
    setTimeout(() => {
      onUpdateProgress(currentLesson.id, 'completed');
      setSavingProgress(false);
    }, 600);
  };

  const handleNotesChange = (event) => {
    setLessonNotes(previousNotes => ({
      ...previousNotes,
      [currentLesson.id]: event.target.value
    }));
  };

  const handlePreviousLesson = () => {
    setCurrentLessonIndex(index => Math.max(0, index - 1));
  };

  const handleNextLesson = () => {
    setCurrentLessonIndex(index => Math.min(activeCourseLessons.length - 1, index + 1));
  };

  return (
    <section className="lesson-page page-stack" aria-labelledby="lesson-page-title">
      <header className="lesson-page__header">
        <div className="lesson-page__intro">
          <button className="btn btn-ghost lesson-page__back" type="button" onClick={onBack}>
            <span aria-hidden="true">&larr;</span>
            Back to dashboard
          </button>
          <span className="page-kicker">{activeCourse?.title || `Course ${activeCourseId}`}</span>
          <h2 id="lesson-page-title">Continue your lesson</h2>
          <p>
            Lesson {currentLessonIndex + 1} of {activeCourseLessons.length}: {currentLesson.title}
          </p>
        </div>

        <div className="lesson-page__ownership" aria-label="Course access and service ownership">
          <span className={`status-badge ${activeAccess ? 'status-badge--success' : 'status-badge--warning'}`}>
            {activeAccess ? 'Course access active' : 'Course access unavailable'}
          </span>
          <span className="service-badge">Course Service</span>
        </div>
      </header>

      <section className="architecture-context architecture-card" aria-labelledby="lesson-flow-title">
        <div className="section-heading architecture-context__heading">
          <div>
            <span className="section-label">Request ownership</span>
            <h3 id="lesson-flow-title">Lesson delivery and progress</h3>
          </div>
          <span className="database-badge">Course DB</span>
        </div>
        <ArchitectureFlow
          steps={['Web Client', 'API Gateway', 'Course Service', 'Course DB']}
          ariaLabel="Lesson request flows from Web Client through API Gateway and Course Service to Course DB"
        />
      </section>

      <div className="lesson-workspace">
        <aside className="card lesson-outline" aria-labelledby="lesson-outline-title">
          <div className="lesson-outline__header">
            <div>
              <span className="section-label">Module 1</span>
              <h3 id="lesson-outline-title">Course outline</h3>
            </div>
            <span className="lesson-outline__count">{completedLessonCount}/{activeCourseLessons.length}</span>
          </div>

          <ProgressBar value={moduleProgress} label="Module progress" />

          <nav className="lesson-nav" aria-label="Lesson navigation">
            <ol className="lesson-nav__list">
              {activeCourseLessons.map((lesson, index) => {
                const lessonProgress = progress.find(item => item.lesson_id === lesson.id);
                const completed = lessonProgress?.progress_status === 'completed';
                const isCurrent = index === currentLessonIndex;

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className={`lesson-nav__item${isCurrent ? ' is-active' : ''}${completed ? ' is-complete' : ''}`}
                      onClick={() => setCurrentLessonIndex(index)}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <span className="lesson-nav__index" aria-hidden="true">
                        {completed ? 'OK' : String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="lesson-nav__copy">
                        <strong>{lesson.title}</strong>
                        <small>{completed ? 'Completed' : isCurrent ? 'In progress' : 'Not started'}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <div className="lesson-content">
          <article className="lesson-player" aria-labelledby="current-lesson-title">
            <div className="lesson-player__stage">
              <div className="lesson-player__center">
                <span className="lesson-player__icon" aria-hidden="true">&#9654;</span>
                <span>Video lesson</span>
              </div>

              <div className="lesson-player__caption">
                <div>
                  <span className="lesson-player__position">
                    Lesson {currentLessonIndex + 1} of {activeCourseLessons.length}
                  </span>
                  <h3 id="current-lesson-title">{currentLesson.title}</h3>
                </div>
                <code>{currentLesson.content_url}</code>
              </div>

              <ProgressBar
                value={isCompleted ? 100 : 35}
                label={isCompleted ? 'Lesson completed' : 'Lesson playback progress'}
              />
            </div>

            <footer className="lesson-player__actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handlePreviousLesson}
                disabled={currentLessonIndex === 0}
              >
                <span aria-hidden="true">&larr;</span>
                Previous lesson
              </button>

              <div className="lesson-completion" aria-live="polite">
                {isCompleted ? (
                  <span className="status-badge status-badge--success">Lesson completed</span>
                ) : (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleMarkComplete}
                    disabled={savingProgress}
                    aria-busy={savingProgress}
                  >
                    {savingProgress ? 'Saving progress...' : 'Mark as complete'}
                  </button>
                )}
              </div>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleNextLesson}
                disabled={currentLessonIndex === activeCourseLessons.length - 1}
              >
                Next lesson
                <span aria-hidden="true">&rarr;</span>
              </button>
            </footer>
          </article>

          <section className="card lesson-notes" aria-labelledby="lesson-notes-title">
            <div className="section-heading">
              <div>
                <span className="section-label">Private workspace</span>
                <h3 id="lesson-notes-title">Learning notes</h3>
              </div>
              <span className="lesson-notes__status">Saved in this session</span>
            </div>
            <label className="sr-only" htmlFor={`lesson-notes-${currentLesson.id}`}>
              Notes for {currentLesson.title}
            </label>
            <textarea
              id={`lesson-notes-${currentLesson.id}`}
              className="form-control lesson-notes__input"
              value={lessonNotes[currentLesson.id] || ''}
              onChange={handleNotesChange}
              placeholder="Capture a key concept, question, or example from this lesson."
              rows="6"
            />
          </section>
        </div>
      </div>
    </section>
  );
}
