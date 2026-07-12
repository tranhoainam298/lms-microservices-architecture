import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProgressBar from '../components/ProgressBar';
import { apiUrl } from '../config/api';

const playableVideoPattern = /\.(mp4|webm|ogg)(?:[?#].*)?$/i;
const aiQuickPrompts = ['Summarize this lesson', 'Explain the key idea', 'Give me an example', 'What should I remember?'];

function lessonType(lesson) {
  if (lesson?.videoUrl) return 'Video';
  if (lesson?.documentUrl) return 'Document';
  return 'Text';
}

export default function LessonPage({ courseId, course: catalogCourse, accessToken, isEnrolled, onBuyCourse, onOpenQuiz, onBack }) {
  const [learning, setLearning] = useState(null);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const loadLearning = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      setError('Choose a course from your dashboard to start learning.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/courses/${courseId}/learning`), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 403 && body.code === 'COURSE_ACCESS_REQUIRED') {
        setLocked(true);
        setLearning(null);
        return;
      }
      if (!response.ok) throw new Error(body.message || 'Course content could not be loaded.');
      setLocked(false);
      setLearning(body);
      setCurrentLessonId(previous => previous && body.items.some(item => item.id === previous) ? previous : body.items[0]?.id || null);
    } catch (requestError) {
      setError(requestError.message || 'Course content could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseId]);

  useEffect(() => {
    loadLearning();
  }, [loadLearning, isEnrolled]);

  const lessons = learning?.items || [];
  const currentIndex = Math.max(0, lessons.findIndex(item => item.id === currentLessonId));
  const selectedSummary = lessons[currentIndex] || null;
  const completedIds = useMemo(() => new Set(learning?.completedLessonIds || []), [learning]);
  const isCompleted = selectedSummary ? completedIds.has(selectedSummary.id) : false;

  const selectLesson = useCallback(async (lesson, index) => {
    if (!lesson || locked) return;
    setCurrentLessonId(lesson.id);
    setLessonLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/courses/lessons/${lesson.id}`), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'This lesson could not be loaded.');
      setCurrentLesson(body.lesson);
      if (index !== undefined) setCurrentLessonId(lessons[index]?.id || lesson.id);
    } catch (requestError) {
      setError(requestError.message || 'This lesson could not be loaded.');
    } finally {
      setLessonLoading(false);
    }
  }, [accessToken, lessons, locked]);

  useEffect(() => {
    if (selectedSummary) selectLesson(selectedSummary);
  }, [selectedSummary?.id]);

  useEffect(() => {
    setAiQuestion('');
    setAiAnswer('');
    setAiError('');
  }, [currentLessonId]);

  const handleMarkComplete = async () => {
    if (!selectedSummary || savingProgress || isCompleted) return;
    setSavingProgress(true);
    setError('');
    try {
      const response = await fetch(apiUrl(`/courses/lessons/${selectedSummary.id}/complete`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Learning progress could not be saved.');
      await loadLearning();
    } catch (requestError) {
      setError(requestError.message || 'Learning progress could not be saved.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handleEnrollment = () => {
    if (Number(catalogCourse?.price) > 0) {
      onBuyCourse(courseId);
      return;
    }
    setError('Free-course enrollment is not available yet. Please return to the course catalog and try again later.');
  };

  const handleAskAi = async (event) => {
    event.preventDefault();
    const question = aiQuestion.trim();
    if (!selectedSummary || !question || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiAnswer('');
    try {
      const response = await fetch(apiUrl(`/courses/lessons/${selectedSummary.id}/ai/ask`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.answer !== 'string' || !body.answer.trim()) {
        throw new Error('AI support is unavailable right now. Please try again later.');
      }
      setAiAnswer(body.answer.trim());
    } catch (requestError) {
      setAiError('AI support is unavailable right now. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <section className="card lesson-loading" role="status"><span className="loading-spinner" aria-hidden="true" /><h2>Preparing your lesson</h2><p>Loading your course outline and saved progress...</p></section>;
  }

  if (locked) {
    return (
      <section className="lesson-locked card" role="alert">
        <span className="lesson-locked__icon" aria-hidden="true">🔒</span>
        <span className="page-kicker">Locked lesson</span>
        <h2>Enroll to unlock this lesson</h2>
        <p>Get full access to every lesson and keep your learning progress synced across sessions.</p>
        {catalogCourse && <strong className="lesson-locked__price">Course price: {Number(catalogCourse.price) === 0 ? 'Free' : `$${Number(catalogCourse.price).toFixed(2)}`}</strong>}
        {error && <div className="form-alert form-alert--warning" role="status">{error}</div>}
        <div className="lesson-locked__actions">
          <button className="btn btn-primary" type="button" onClick={handleEnrollment}>{Number(catalogCourse?.price) > 0 ? 'Buy Course' : 'Enroll to continue'}</button>
          <button className="btn btn-secondary" type="button" onClick={onBack}>Back to dashboard</button>
        </div>
      </section>
    );
  }

  if (error && !learning) {
    return <section className="card empty-state" role="alert"><span className="page-kicker">Unable to load</span><h2>We could not open this course</h2><p>{error}</p><button className="btn btn-primary" type="button" onClick={loadLearning}>Try again</button></section>;
  }

  if (!lessons.length) {
    return <section className="card empty-state" role="status"><span className="page-kicker">Course outline</span><h2>No lessons are available yet</h2><p>Your instructor has not added learning content to this course.</p><button className="btn btn-secondary" type="button" onClick={onBack}>Back to dashboard</button></section>;
  }

  const lesson = currentLesson || selectedSummary;
  const progress = learning.progress || { completedLessons: 0, totalLessons: lessons.length, percent: 0 };
  const isLastLesson = currentIndex === lessons.length - 1;

  return (
    <section className="lesson-page page-stack" aria-labelledby="lesson-page-title">
      <header className="lesson-page__header lesson-page__header--premium">
        <div className="lesson-page__intro">
          <button className="btn btn-ghost lesson-page__back" type="button" onClick={onBack}><span aria-hidden="true">&larr;</span> Back to dashboard</button>
          <span className="page-kicker">{learning.course.title}</span>
          <h2 id="lesson-page-title">{lesson?.title || 'Continue learning'}</h2>
          <p>Lesson {currentIndex + 1} of {lessons.length} · {lessonType(lesson)} lesson</p>
        </div>
        <div className="lesson-page__status">
          <span className={`status-badge ${isCompleted ? 'status-badge--success' : 'status-badge--warning'}`}>{isCompleted ? 'Completed' : 'In progress'}</span>
          <strong>{progress.percent}% complete</strong>
        </div>
      </header>

      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="lesson-workspace lesson-workspace--premium">
        <aside className="card lesson-outline" aria-labelledby="lesson-outline-title">
          <div className="lesson-outline__header"><div><span className="section-label">Your course</span><h3 id="lesson-outline-title">Course outline</h3></div><span className="lesson-outline__count">{progress.completedLessons}/{progress.totalLessons}</span></div>
          <ProgressBar value={progress.percent} label="Learning progress" />
          <nav className="lesson-nav" aria-label="Lesson navigation"><ol className="lesson-nav__list">
            {lessons.map((item, index) => {
              const completed = completedIds.has(item.id);
              const active = item.id === selectedSummary?.id;
              return <li key={item.id}><button type="button" className={`lesson-nav__item${active ? ' is-active' : ''}${completed ? ' is-complete' : ''}`} onClick={() => selectLesson(item, index)} aria-current={active ? 'step' : undefined}><span className="lesson-nav__index" aria-hidden="true">{completed ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="lesson-nav__copy"><strong>{item.title}</strong><small>{lessonType(item)} · {completed ? 'Completed' : active ? 'In progress' : 'Not started'}</small></span></button></li>;
            })}
          </ol></nav>
        </aside>

        <div className="lesson-content lesson-content--premium">
          <article className="lesson-player" aria-labelledby="current-lesson-title">
            <div className="lesson-player__stage lesson-player__stage--content">
              {lessonLoading ? <div className="lesson-player__empty" role="status">Loading lesson content...</div> : lesson?.videoUrl && playableVideoPattern.test(lesson.videoUrl) ? (
                <video className="lesson-video" controls preload="metadata" key={lesson.videoUrl}><source src={lesson.videoUrl} />Your browser cannot play this video.</video>
              ) : lesson?.videoUrl ? (
                <div className="lesson-player__empty"><span className="lesson-player__icon" aria-hidden="true">▶</span><h3>{lesson.title}</h3><p>This video opens in a secure external player.</p><a className="btn btn-primary" href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">Open video</a></div>
              ) : lesson?.documentUrl ? (
                <div className="lesson-player__empty"><span className="lesson-player__icon" aria-hidden="true">▤</span><h3>{lesson.title}</h3><p>Use the lesson document below to continue studying.</p></div>
              ) : (
                <div className="lesson-player__empty"><h3>This lesson content is not available yet.</h3><p>Check back after your instructor publishes the learning material.</p></div>
              )}
              <div className="lesson-player__caption"><div><span className="lesson-player__position">Lesson {currentIndex + 1} of {lessons.length}</span><h3 id="current-lesson-title">{lesson?.title}</h3></div><span>{lessonType(lesson)}</span></div>
            </div>
            <footer className="lesson-player__actions">
              <button className="btn btn-secondary" type="button" onClick={() => selectLesson(lessons[currentIndex - 1], currentIndex - 1)} disabled={currentIndex === 0}>← Previous lesson</button>
              <div className="lesson-completion" aria-live="polite">{isCompleted ? <span className="status-badge status-badge--success">Lesson completed</span> : <button className="btn btn-primary" type="button" onClick={handleMarkComplete} disabled={savingProgress}>{savingProgress ? 'Saving progress...' : 'Mark as completed'}</button>}</div>
              {isLastLesson ? <button className="btn btn-secondary" type="button" onClick={() => onOpenQuiz?.(courseId)}>Go to quiz →</button> : <button className="btn btn-secondary" type="button" onClick={() => selectLesson(lessons[currentIndex + 1], currentIndex + 1)}>Next lesson →</button>}
            </footer>
          </article>

          <div className="lesson-tools-grid">
            <section className="card lesson-resources" aria-labelledby="lesson-resources-title"><div className="section-heading"><div><span className="section-label">Study materials</span><h3 id="lesson-resources-title">Lesson resources</h3></div></div>{lesson?.documentUrl ? <a className="resource-card" href={lesson.documentUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">▤</span><span><strong>Open lesson document</strong><small>View or download in a new tab</small></span></a> : <p className="muted-copy">No additional resources are attached to this lesson.</p>}</section>
            <section className="card lesson-notes" aria-labelledby="lesson-notes-title"><div className="section-heading"><div><span className="section-label">Private workspace</span><h3 id="lesson-notes-title">Learning notes</h3></div></div><label className="sr-only" htmlFor="lesson-notes">Notes for this lesson</label><textarea id="lesson-notes" className="form-control lesson-notes__input" value={lessonNotes} onChange={event => setLessonNotes(event.target.value)} placeholder="Capture a key concept or question from this lesson." rows="5" /></section>
          </div>

          <section className="card lesson-ai" aria-labelledby="lesson-ai-title">
            <div className="section-heading">
              <div><span className="section-label">Lesson context</span><h3 id="lesson-ai-title">Ask AI about this lesson</h3></div>
              <span className="status-badge status-badge--active">Available</span>
            </div>
            <div className="lesson-ai__prompts" aria-label="Suggested questions">
              {aiQuickPrompts.map(prompt => <button className="suggestion-chip" type="button" key={prompt} onClick={() => setAiQuestion(prompt)} disabled={aiLoading}>{prompt}</button>)}
            </div>
            <form className="lesson-ai__form" onSubmit={handleAskAi}>
              <label htmlFor="lesson-ai-question">Ask a question</label>
              <textarea id="lesson-ai-question" className="form-control" rows="4" maxLength="1000" placeholder="Ask a question about this lesson..." value={aiQuestion} onChange={event => setAiQuestion(event.target.value)} disabled={aiLoading} required />
              <div className="lesson-ai__actions"><span>{aiQuestion.length}/1000</span><button className="btn btn-primary" type="submit" disabled={aiLoading || !aiQuestion.trim()}>{aiLoading ? 'Generating answer...' : 'Ask AI'}</button></div>
            </form>
            {aiError && <div className="form-alert form-alert--error" role="alert">{aiError}</div>}
            {aiAnswer && <article className="lesson-ai__answer" aria-live="polite"><span className="page-kicker">AI answer</span><p>{aiAnswer}</p></article>}
          </section>
        </div>
      </div>
    </section>
  );
}
