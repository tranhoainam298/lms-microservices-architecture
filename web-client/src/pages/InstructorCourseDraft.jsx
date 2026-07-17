import React, { useState, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import { apiUrl } from '../config/api';

export default function InstructorCourseDraft({ onSaveDraft, initialDrafts = [], accessToken, userProfile, role }) {
  const [drafts, setDrafts] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('49.00');
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [initialLessons, setInitialLessons] = useState([]);
  const [tempLessonTitle, setTempLessonTitle] = useState('');
  const [tempLessonVideoUrl, setTempLessonVideoUrl] = useState('');
  const [tempLessonDocumentUrl, setTempLessonDocumentUrl] = useState('');
  const [tempLessonError, setTempLessonError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editingDraft, setEditingDraft] = useState(null);
  const [lessonDraft, setLessonDraft] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDocumentUrl, setLessonDocumentUrl] = useState('');
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [lessonSuccess, setLessonSuccess] = useState(null);
  const [lessonError, setLessonError] = useState('');
  const [lessons, setLessons] = useState([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [lessonLoadError, setLessonLoadError] = useState('');
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [publishingDraftId, setPublishingDraftId] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [publishError, setPublishError] = useState('');
  const [quizDraft, setQuizDraft] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizDuration, setQuizDuration] = useState(15);
  const [quizPassingScore, setQuizPassingScore] = useState(60);
  const [quizQuestions, setQuizQuestions] = useState([{ questionText: '', questionType: 'single_choice', options: ['', ''], correctOptionIndex: 0, points: 1 }]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [quizSuccess, setQuizSuccess] = useState('');

  const examRequest = async (path, options = {}) => {
    const response = await fetch(apiUrl(path), { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'The quiz request failed.');
    return body;
  };
  const loadQuizzes = async (draft) => {
    setQuizDraft(draft); setQuizBusy(true); setQuizError('');
    try { const body = await examRequest(`/exams/courses/${draft.id}/quizzes/mine`); setQuizzes(body.items || []); }
    catch (error) { setQuizError(error.message); }
    finally { setQuizBusy(false); }
  };
  const resetQuizForm = () => { setQuizFormOpen(false); setEditingQuiz(null); setQuizTitle(''); setQuizDescription(''); setQuizDuration(15); setQuizPassingScore(60); setQuizQuestions([{ questionText: '', questionType: 'single_choice', options: ['', ''], correctOptionIndex: 0, points: 1 }]); };
  const startQuiz = async (draft) => { await loadQuizzes(draft); resetQuizForm(); setQuizFormOpen(true); };
  const saveQuiz = async (event) => {
    event.preventDefault(); setQuizBusy(true); setQuizError(''); setQuizSuccess('');
    try {
      const path = editingQuiz ? `/exams/courses/${quizDraft.id}/quizzes/${editingQuiz.id}` : `/exams/courses/${quizDraft.id}/quizzes`;
      const body = await examRequest(path, { method: editingQuiz ? 'PATCH' : 'POST', body: JSON.stringify({ title: quizTitle, description: quizDescription, durationMinutes: Number(quizDuration), passingScore: Number(quizPassingScore), questions: quizQuestions.map(q => ({ ...q, points: Number(q.points), correctOptionIndex: Number(q.correctOptionIndex) })) }) });
      setQuizSuccess(`Quiz #${body.quiz.id} was ${editingQuiz ? 'updated' : 'created'}.`); resetQuizForm(); await loadQuizzes(quizDraft);
    } catch (error) { setQuizError(error.message); }
    finally { setQuizBusy(false); }
  };
  const editQuiz = async (quiz) => {
    setQuizBusy(true); setQuizError('');
    try { const body = await examRequest(`/exams/courses/${quizDraft.id}/quizzes/${quiz.id}/mine`); const detail = body.quiz; setEditingQuiz(quiz); setQuizFormOpen(true); setQuizTitle(detail.title); setQuizDescription(detail.description || ''); setQuizDuration(detail.durationMinutes); setQuizPassingScore(detail.passingScore); setQuizQuestions(detail.questions.map(q => ({ questionText: q.questionText, questionType: 'single_choice', options: q.options, correctOptionIndex: q.correctOptionIndex, points: q.points }))); }
    catch (error) { setQuizError(error.message); }
    finally { setQuizBusy(false); }
  };
  const deleteQuiz = async (quiz) => { if (!window.confirm(`Delete quiz “${quiz.title}”?`)) return; setQuizBusy(true); try { await examRequest(`/exams/courses/${quizDraft.id}/quizzes/${quiz.id}`, { method: 'DELETE' }); setQuizSuccess(`Quiz #${quiz.id} was deleted.`); await loadQuizzes(quizDraft); } catch (error) { setQuizError(error.message); } finally { setQuizBusy(false); } };
  const publishQuiz = async (quiz) => { if (!window.confirm(`Publish quiz “${quiz.title}”? Published quizzes cannot be edited or deleted.`)) return; setQuizBusy(true); try { await examRequest(`/exams/courses/${quizDraft.id}/quizzes/${quiz.id}/publish`, { method: 'PATCH' }); setQuizSuccess(`Quiz #${quiz.id} was published.`); await loadQuizzes(quizDraft); } catch (error) { setQuizError(error.message); } finally { setQuizBusy(false); } };

  const handleStartEdit = (draft) => {
    setEditingDraft(draft);
    setTitle(draft.title);
    setDescription(draft.description);
    setPrice(String(draft.price));
    setSaveError('');
    setSaveSuccess(false);
    setFieldErrors({});
    setInitialLessons([]);
    setTempLessonTitle('');
    setTempLessonVideoUrl('');
    setTempLessonDocumentUrl('');
    setTempLessonError('');
  };

  const handleCancelEdit = () => {
    setEditingDraft(null);
    setTitle('');
    setDescription('');
    setPrice('49.00');
    setSaveError('');
    setSaveSuccess(false);
    setFieldErrors({});
    setInitialLessons([]);
    setTempLessonTitle('');
    setTempLessonVideoUrl('');
    setTempLessonDocumentUrl('');
    setTempLessonError('');
  };

  const handleAddInitialLesson = (e) => {
    e.preventDefault();
    setTempLessonError('');
    if (!tempLessonTitle.trim()) {
      setTempLessonError('Lesson title is required.');
      return;
    }
    if (!tempLessonVideoUrl.trim() && !tempLessonDocumentUrl.trim()) {
      setTempLessonError('Provide a video URL or document URL.');
      return;
    }
    if (tempLessonVideoUrl.trim() && !tempLessonVideoUrl.trim().startsWith('http://') && !tempLessonVideoUrl.trim().startsWith('https://')) {
      setTempLessonError('Video URL must use http or https.');
      return;
    }
    if (tempLessonDocumentUrl.trim() && !tempLessonDocumentUrl.trim().startsWith('http://') && !tempLessonDocumentUrl.trim().startsWith('https://')) {
      setTempLessonError('Document URL must use http or https.');
      return;
    }

    const newLesson = {
      title: tempLessonTitle.trim(),
      videoUrl: tempLessonVideoUrl.trim() || null,
      documentUrl: tempLessonDocumentUrl.trim() || null,
      orderIndex: initialLessons.length + 1
    };

    setInitialLessons([...initialLessons, newLesson]);
    setTempLessonTitle('');
    setTempLessonVideoUrl('');
    setTempLessonDocumentUrl('');
  };

  const handleRemoveInitialLesson = (index) => {
    const updated = initialLessons.filter((_, i) => i !== index).map((lesson, i) => ({
      ...lesson,
      orderIndex: i + 1
    }));
    setInitialLessons(updated);
  };

  const clearLessonWorkspace = () => {
    setLessonDraft(null);
    setLessons([]);
    setIsLessonFormOpen(false);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonVideoUrl('');
    setLessonDocumentUrl('');
    setLessonError('');
    setLessonLoadError('');
  };

  const handleStartLesson = async (draft) => {
    setLessonDraft(draft);
    setIsLessonFormOpen(true);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonVideoUrl('');
    setLessonDocumentUrl('');
    setLessonError('');
    setLessonSuccess(null);
    await fetchLessons(draft.id);
  };

  const handleViewLessons = async (draft) => {
    setLessonDraft(draft);
    setIsLessonFormOpen(false);
    setEditingLesson(null);
    setLessonError('');
    await fetchLessons(draft.id);
  };

  const handleCancelLesson = () => {
    setIsLessonFormOpen(false);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonVideoUrl('');
    setLessonDocumentUrl('');
    setLessonError('');
  };

  const handlePublishDraft = async (draft) => {
    if (!window.confirm(`Publish “${draft.title}”? A draft needs at least one lesson before it can be published.`)) {
      return;
    }

    setPublishingDraftId(draft.id);
    setPublishError('');
    setPublishSuccess('');

    try {
      const response = await fetch(apiUrl(`/courses/drafts/${draft.id}/publish`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'The draft course could not be published.');
      }

      if (lessonDraft?.id === draft.id) {
        clearLessonWorkspace();
      }
      if (editingDraft?.id === draft.id) {
        handleCancelEdit();
      }
      await fetchDrafts();
      setPublishSuccess(`“${responseBody.course.title}” is now published.`);
    } catch (requestError) {
      setPublishError(requestError instanceof TypeError
        ? 'Publishing is temporarily unavailable. Please try again shortly.'
        : requestError.message);
    } finally {
      setPublishingDraftId(null);
    }
  };

  const handleSaveLesson = async (event) => {
    event.preventDefault();
    if (!lessonDraft || role !== 'instructor') {
      return;
    }

    setIsSavingLesson(true);
    setLessonError('');
    setLessonSuccess(null);

    try {
      const response = await fetch(apiUrl(editingLesson
        ? `/courses/drafts/${lessonDraft.id}/lessons/${editingLesson.id}`
        : `/courses/drafts/${lessonDraft.id}/lessons`), {
        method: editingLesson ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: lessonTitle,
          videoUrl: lessonVideoUrl,
          documentUrl: lessonDocumentUrl
        })
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message || `The lesson could not be ${editingLesson ? 'updated' : 'created'}.`);
      }

      const savedLesson = responseBody.lesson;
      await fetchLessons(lessonDraft.id);
      setLessonSuccess({
        id: savedLesson.id,
        title: savedLesson.title,
        action: editingLesson ? 'updated' : 'created'
      });
      setIsLessonFormOpen(false);
      setEditingLesson(null);
      setLessonTitle('');
      setLessonVideoUrl('');
      setLessonDocumentUrl('');
    } catch (requestError) {
      setLessonError(requestError instanceof TypeError
        ? 'Lessons are temporarily unavailable. Please try again shortly.'
        : requestError.message);
    } finally {
      setIsSavingLesson(false);
    }
  };

  const fetchLessons = async (courseId) => {
    setIsLoadingLessons(true);
    setLessonLoadError('');
    try {
      const response = await fetch(apiUrl(`/courses/drafts/${courseId}/lessons`), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'The lessons could not be loaded.');
      }
      setLessons(responseBody.items || []);
    } catch (requestError) {
      setLessonLoadError(requestError instanceof TypeError
        ? 'Lessons are temporarily unavailable. Please try again shortly.'
        : requestError.message);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleStartLessonEdit = (lesson) => {
    setEditingLesson(lesson);
    setIsLessonFormOpen(true);
    setLessonTitle(lesson.title || '');
    setLessonVideoUrl(lesson.videoUrl || '');
    setLessonDocumentUrl(lesson.documentUrl || '');
    setLessonError('');
    setLessonSuccess(null);
  };

  const handleDeleteLesson = async (lesson) => {
    if (!lessonDraft || !window.confirm(`Delete lesson “${lesson.title}”? This cannot be undone.`)) {
      return;
    }

    setDeletingLessonId(lesson.id);
    setLessonError('');
    setLessonSuccess(null);
    try {
      const response = await fetch(apiUrl(`/courses/drafts/${lessonDraft.id}/lessons/${lesson.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'The lesson could not be deleted.');
      }
      if (editingLesson?.id === lesson.id) {
        handleCancelLesson();
      }
      await fetchLessons(lessonDraft.id);
      setLessonSuccess({ id: lesson.id, title: lesson.title, action: 'deleted' });
    } catch (requestError) {
      setLessonError(requestError instanceof TypeError
        ? 'Lessons are temporarily unavailable. Please try again shortly.'
        : requestError.message);
    } finally {
      setDeletingLessonId(null);
    }
  };

  const fetchDrafts = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch(apiUrl('/courses/drafts/mine'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      const responseBody = await response.json();
      if (!response.ok) {
        throw new Error(responseBody.message || 'Course drafts could not be loaded.');
      }
      setDrafts(responseBody.items || []);
    } catch (err) {
      setLoadError(err.message || 'Course drafts could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'instructor' && accessToken) {
      fetchDrafts();
    }
  }, [role, accessToken]);

  const previewPrice = Number.isFinite(Number(price)) && price !== ''
    ? Number(price).toFixed(2)
    : '0.00';
  const instructorName = userProfile?.fullName || userProfile?.full_name || 'Authenticated instructor';

  const clearFieldState = (fieldName) => {
    setFieldErrors(currentErrors => ({ ...currentErrors, [fieldName]: '' }));
    setSaveError('');
    setSaveSuccess(false);
  };

  const validateDraft = () => {
    const nextErrors = {};

    if (!title.trim()) {
      nextErrors.title = 'Enter a course title.';
    }

    if (!description.trim()) {
      nextErrors.description = 'Add a short syllabus description.';
    }

    if (price === '') {
      nextErrors.price = 'Enter a course price.';
    } else if (!Number.isFinite(Number(price))) {
      nextErrors.price = 'Enter a valid numeric price.';
    } else if (Number(price) < 0) {
      nextErrors.price = 'Price cannot be negative.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (role !== 'instructor') {
      setSaveError('Only instructors can save draft courses.');
      return;
    }

    if (!validateDraft()) {
      setSaveSuccess(false);
      setSaveError('');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const url = apiUrl(editingDraft
        ? `/courses/drafts/${editingDraft.id}`
        : '/courses/draft');
      const method = editingDraft ? 'PATCH' : 'POST';

      const bodyData = {
        title,
        description,
        price: Number(price)
      };
      if (!editingDraft) {
        bodyData.lessons = initialLessons;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(bodyData)
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message || `The draft course could not be ${editingDraft ? 'updated' : 'saved'}.`);
      }

      const savedDraft = responseBody.course;
      await fetchDrafts();
      setSaveSuccess(true);
      setInitialLessons([]);
      onSaveDraft(savedDraft);
      setEditingDraft(null);
      setTitle('');
      setDescription('');
      setPrice('49.00');
      setStatus('draft');
      setFieldErrors({});
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? 'Course drafts are temporarily unavailable. Please try again shortly.'
        : requestError.message;
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="course-draft-page" aria-labelledby="draft-page-title">
      <header className="draft-page-header">
        <div>
          <p className="page-kicker">Instructor workspace</p>
          <h2 className="page-title" id="draft-page-title">Create a course draft</h2>
          <p className="page-description">
            Shape the course essentials, review the learner-facing preview, and save through the live service route.
          </p>
        </div>
        <div className="draft-page-header__status">
          <span className="service-badge">Instructor access</span>
          <span>Private workspace</span>
        </div>
      </header>

      {role !== 'instructor' ? (
        <section className="card draft-access-state" role="alert" aria-labelledby="draft-access-title">
          <span className="status-badge status-badge--warning">Restricted workspace</span>
          <h3 id="draft-access-title">Instructor access required</h3>
          <p>Only instructors can save draft courses.</p>
        </section>
      ) : (
        <div className="grid grid-cols-3 gap-6 draft-workspace">
          <section className="card draft-editor" aria-labelledby="draft-editor-title">
            <div className="draft-section-heading">
              <div>
                <p className="section-kicker">{editingDraft ? 'Editing draft' : 'Course essentials'}</p>
                <h3 id="draft-editor-title">{editingDraft ? `Edit: ${editingDraft.title}` : 'Draft details'}</h3>
                <p>{editingDraft ? 'Modify the course draft essentials below.' : 'Start with the information students need to understand the course.'}</p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="draft-feedback" aria-live="polite" aria-atomic="true">
              {quizSuccess && <div className="form-alert form-alert--success" role="status">{quizSuccess}</div>}
              {quizError && <div className="form-alert form-alert--error" role="alert">{quizError}</div>}
              {isSaving && (
                <div className="form-alert form-alert--loading" role="status">
                  Saving your draft...
                </div>
              )}
              {saveSuccess && (
                <div className="form-alert form-alert--success" role="status">
                  Draft saved successfully.
                </div>
              )}
              {saveError && (
                <div className="form-alert form-alert--error" role="alert">
                  {saveError}
                </div>
              )}
            </div>

            {quizDraft && quizFormOpen && <form className="draft-form" onSubmit={saveQuiz}>
              <fieldset className="draft-form-section" disabled={quizBusy}><legend>{editingQuiz ? 'Edit quiz' : 'Add quiz'}: {quizDraft.title}</legend>
                <div className="form-group"><label>Quiz title</label><input className="form-control" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} required /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={quizDescription} onChange={e => setQuizDescription(e.target.value)} /></div>
                <div className="draft-form-grid"><div className="form-group"><label>Duration (minutes)</label><input className="form-control" type="number" min="1" max="300" value={quizDuration} onChange={e => setQuizDuration(e.target.value)} /></div><div className="form-group"><label>Passing score (%)</label><input className="form-control" type="number" min="0" max="100" value={quizPassingScore} onChange={e => setQuizPassingScore(e.target.value)} /></div></div>
                {quizQuestions.map((question, questionIndex) => <section className="card" key={questionIndex}><div className="form-group"><label>Question {questionIndex + 1}</label><input className="form-control" value={question.questionText} onChange={e => setQuizQuestions(items => items.map((q, i) => i === questionIndex ? { ...q, questionText: e.target.value } : q))} required /></div>{question.options.map((option, optionIndex) => <div className="form-group" key={optionIndex}><label>Option {optionIndex + 1}</label><input className="form-control" value={option} onChange={e => setQuizQuestions(items => items.map((q, i) => i === questionIndex ? { ...q, options: q.options.map((o, oi) => oi === optionIndex ? e.target.value : o) } : q))} required /></div>)}<div className="draft-form-grid"><div className="form-group"><label>Correct option</label><select className="form-control" value={question.correctOptionIndex} onChange={e => setQuizQuestions(items => items.map((q, i) => i === questionIndex ? { ...q, correctOptionIndex: Number(e.target.value) } : q))}>{question.options.map((_, i) => <option key={i} value={i}>Option {i + 1}</option>)}</select></div><div className="form-group"><label>Points</label><input className="form-control" type="number" min="1" max="100" value={question.points} onChange={e => setQuizQuestions(items => items.map((q, i) => i === questionIndex ? { ...q, points: e.target.value } : q))} /></div></div><div className="draft-form-actions"><button type="button" className="btn btn-secondary btn-sm" disabled={question.options.length >= 6} onClick={() => setQuizQuestions(items => items.map((q, i) => i === questionIndex ? { ...q, options: [...q.options, ''] } : q))}>Add option</button>{quizQuestions.length > 1 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuizQuestions(items => items.filter((_, i) => i !== questionIndex))}>Remove question</button>}</div></section>)}
                <button type="button" className="btn btn-secondary" disabled={quizQuestions.length >= 100} onClick={() => setQuizQuestions(items => [...items, { questionText: '', questionType: 'single_choice', options: ['', ''], correctOptionIndex: 0, points: 1 }])}>Add Question</button>
              </fieldset><div className="draft-form-actions"><button className="btn btn-primary" disabled={quizBusy}>{quizBusy ? 'Saving...' : 'Save Quiz'}</button><button type="button" className="btn btn-secondary" onClick={resetQuizForm}>Cancel</button></div>
            </form>}

            {quizDraft && <section className="lesson-authoring-panel"><div className="draft-panel-heading"><div><p className="section-kicker">Quiz workspace</p><h3>Quizzes: {quizDraft.title}</h3></div><button className="btn btn-secondary btn-sm" type="button" onClick={() => startQuiz(quizDraft)}>Add Quiz</button></div>{quizBusy ? <p>Loading quizzes...</p> : quizzes.length === 0 ? <p>No quizzes in this draft.</p> : <ul className="lesson-authoring-list">{quizzes.map(quiz => <li className="lesson-authoring-item" key={quiz.id}><div><strong>{quiz.title}</strong><div>{quiz.status} · {quiz.questionCount} questions · {quiz.durationMinutes} minutes · Pass {quiz.passingScore}%</div></div><div className="lesson-authoring-actions">{quiz.status === 'draft' && <><button className="btn btn-secondary btn-sm" type="button" onClick={() => editQuiz(quiz)}>Edit</button><button className="btn btn-secondary btn-sm" type="button" onClick={() => deleteQuiz(quiz)}>Delete</button><button className="btn btn-primary btn-sm" type="button" onClick={() => publishQuiz(quiz)}>Publish</button></>}</div></li>)}</ul>}</section>}

            <form className="draft-form" onSubmit={handleSave} noValidate aria-busy={isSaving}>
              <fieldset className="draft-form-section" disabled={isSaving}>
                <legend>Course information</legend>

                <div className={`form-group${fieldErrors.title ? ' has-error' : ''}`}>
                  <label htmlFor="draft-title">Course title</label>
                  <input
                    id="draft-title"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Practical Data Analysis"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearFieldState('title');
                    }}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'draft-title-helper draft-title-error' : 'draft-title-helper'}
                    required
                  />
                  <p className="field-helper" id="draft-title-helper">Use a clear, specific title students can scan quickly.</p>
                  {fieldErrors.title && <p className="field-error" id="draft-title-error" role="alert">{fieldErrors.title}</p>}
                </div>

                <div className={`form-group${fieldErrors.description ? ' has-error' : ''}`}>
                  <div className="field-label-row">
                    <label htmlFor="draft-description">Syllabus description</label>
                    <span aria-hidden="true">{description.length} characters</span>
                  </div>
                  <textarea
                    id="draft-description"
                    className="form-control"
                    rows="6"
                    placeholder="Describe the outcomes, audience, and concepts students will learn."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      clearFieldState('description');
                    }}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={fieldErrors.description ? 'draft-description-helper draft-description-error' : 'draft-description-helper'}
                    required
                  />
                  <p className="field-helper" id="draft-description-helper">This summary appears in the course preview.</p>
                  {fieldErrors.description && <p className="field-error" id="draft-description-error" role="alert">{fieldErrors.description}</p>}
                </div>

                <div className="draft-form-grid">
                  <div className={`form-group${fieldErrors.price ? ' has-error' : ''}`}>
                    <label htmlFor="draft-price">Price (USD)</label>
                    <div className="price-field">
                      <span aria-hidden="true">$</span>
                      <input
                        id="draft-price"
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          clearFieldState('price');
                        }}
                        aria-invalid={Boolean(fieldErrors.price)}
                        aria-describedby={fieldErrors.price ? 'draft-price-helper draft-price-error' : 'draft-price-helper'}
                        required
                      />
                    </div>
                    <p className="field-helper" id="draft-price-helper">Displayed in the course catalog.</p>
                    {fieldErrors.price && <p className="field-error" id="draft-price-error" role="alert">{fieldErrors.price}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="draft-status">Publishing status</label>
                    <select
                      id="draft-status"
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled
                      aria-describedby="draft-status-helper"
                    >
                      <option value="draft">Draft</option>
                    </select>
                    <p className="field-helper" id="draft-status-helper">New courses remain private drafts.</p>
                  </div>
                </div>
              </fieldset>

              {!editingDraft && (
                <fieldset className="draft-form-section" disabled={isSaving} style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <legend>Initial Lessons (Optional)</legend>

                  {initialLessons.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '16px' }}>
                      {initialLessons.map((lesson, index) => (
                        <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '8px', background: '#f8fafc' }}>
                          <div>
                            <strong>{lesson.orderIndex}. {lesson.title}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {lesson.videoUrl && <span>Video: {lesson.videoUrl} </span>}
                              {lesson.documentUrl && <span>Document: {lesson.documentUrl}</span>}
                            </div>
                          </div>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleRemoveInitialLesson(index)}>
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {tempLessonError && <p className="field-error" style={{ color: '#ef4444', marginBottom: '8px' }}>{tempLessonError}</p>}

                  <div className="form-group">
                    <label htmlFor="temp-lesson-title">Lesson Title</label>
                    <input
                      id="temp-lesson-title"
                      type="text"
                      className="form-control"
                      placeholder="e.g., Course introduction"
                      value={tempLessonTitle}
                      onChange={(e) => setTempLessonTitle(e.target.value)}
                    />
                  </div>

                  <div className="draft-form-grid">
                    <div className="form-group">
                      <label htmlFor="temp-lesson-video">Video URL</label>
                      <input
                        id="temp-lesson-video"
                        type="text"
                        className="form-control"
                        placeholder="https://..."
                        value={tempLessonVideoUrl}
                        onChange={(e) => setTempLessonVideoUrl(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="temp-lesson-doc">Document URL</label>
                      <input
                        id="temp-lesson-doc"
                        type="text"
                        className="form-control"
                        placeholder="https://..."
                        value={tempLessonDocumentUrl}
                        onChange={(e) => setTempLessonDocumentUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="button" className="btn btn-secondary" onClick={handleAddInitialLesson} style={{ marginTop: '8px' }}>
                    Add Lesson to Draft
                  </button>
                </fieldset>
              )}

              <div className="draft-form-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving && <span className="button-spinner" aria-hidden="true" />}
                  {isSaving ? 'Saving draft...' : (editingDraft ? 'Update draft' : 'Save draft course')}
                </button>
                {editingDraft && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel Edit
                  </button>
                )}
                <p style={{ margin: 0 }}>Only authenticated instructors can save through this route.</p>
              </div>
            </form>

            <div className="draft-feedback" aria-live="polite" aria-atomic="true">
              {lessonSuccess && (
                <div className="form-alert form-alert--success" role="status">
                  Lesson #{lessonSuccess.id} “{lessonSuccess.title}” was {lessonSuccess.action} successfully.
                </div>
              )}
              {lessonError && (
                <div className="form-alert form-alert--error" role="alert">
                  {lessonError}
                </div>
              )}
              {publishSuccess && (
                <div className="form-alert form-alert--success" role="status">
                  {publishSuccess}
                </div>
              )}
              {publishError && (
                <div className="form-alert form-alert--error" role="alert">
                  {publishError}
                </div>
              )}
            </div>

            {lessonDraft && isLessonFormOpen && (
              <form className="draft-form" onSubmit={handleSaveLesson} noValidate aria-busy={isSavingLesson}>
                <fieldset className="draft-form-section" disabled={isSavingLesson}>
                  <legend>{editingLesson ? 'Edit lesson in' : 'Add lesson to'}: {lessonDraft.title}</legend>
                  <div className="form-group">
                    <label htmlFor="lesson-title">Lesson title</label>
                    <input
                      id="lesson-title"
                      type="text"
                      className="form-control"
                      maxLength="255"
                      value={lessonTitle}
                      onChange={(event) => setLessonTitle(event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lesson-video-url">Video URL</label>
                    <input
                      id="lesson-video-url"
                      type="url"
                      className="form-control"
                      maxLength="255"
                      placeholder="https://example.com/video"
                      value={lessonVideoUrl}
                      onChange={(event) => setLessonVideoUrl(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lesson-document-url">Document URL</label>
                    <input
                      id="lesson-document-url"
                      type="url"
                      className="form-control"
                      maxLength="255"
                      placeholder="https://example.com/document"
                      value={lessonDocumentUrl}
                      onChange={(event) => setLessonDocumentUrl(event.target.value)}
                    />
                    <p className="field-helper">Provide a video URL, document URL, or both.</p>
                  </div>
                </fieldset>
                <div className="draft-form-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary" disabled={isSavingLesson}>
                    {isSavingLesson && <span className="button-spinner" aria-hidden="true" />}
                    {isSavingLesson ? 'Saving lesson...' : (editingLesson ? 'Update Lesson' : 'Save Lesson')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelLesson} disabled={isSavingLesson}>
                    {editingLesson ? 'Cancel Edit' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            {lessonDraft && (
              <section className="lesson-authoring-panel" aria-labelledby="draft-lessons-title">
                <div className="draft-panel-heading">
                  <div>
                    <p className="section-kicker">Lesson workspace</p>
                    <h3 id="draft-lessons-title">Lessons: {lessonDraft.title}</h3>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleStartLesson(lessonDraft)}>
                    Add Lesson
                  </button>
                </div>

                {isLoadingLessons ? (
                  <p className="lesson-authoring-state" role="status">Loading lessons...</p>
                ) : lessonLoadError ? (
                  <p className="lesson-authoring-state form-alert form-alert--error" role="alert">{lessonLoadError}</p>
                ) : lessons.length === 0 ? (
                  <p className="lesson-authoring-state">No lessons have been added to this draft yet.</p>
                ) : (
                  <ol className="lesson-authoring-list">
                    {lessons.map(lesson => (
                      <li className="lesson-authoring-item" key={lesson.id}>
                        <div>
                          <strong>{lesson.sequenceOrder ? `${lesson.sequenceOrder}. ` : ''}{lesson.title}</strong>
                          <div className="lesson-authoring-links">
                            {lesson.videoUrl && <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">Video</a>}
                            {lesson.documentUrl && <a href={lesson.documentUrl} target="_blank" rel="noopener noreferrer">Document</a>}
                          </div>
                        </div>
                        <div className="lesson-authoring-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleStartLessonEdit(lesson)} disabled={deletingLessonId === lesson.id}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDeleteLesson(lesson)} disabled={deletingLessonId === lesson.id}>
                            {deletingLessonId === lesson.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </section>

          <aside className="draft-sidebar" aria-label="Draft preview and saved courses">
            <section className="card draft-preview-panel" aria-labelledby="draft-preview-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Live preview</p>
                  <h3 id="draft-preview-title">Course card</h3>
                </div>
                <span className="draft-panel-heading__status">Updates as you type</span>
              </div>

              <article className="draft-preview">
                <div className="draft-preview__visual" aria-hidden="true">
                  <span>Course</span>
                  <strong>{title.trim() ? title.trim().slice(0, 2).toUpperCase() : 'CD'}</strong>
                </div>
                <div className="draft-preview__body">
                  <div className="draft-preview__topline">
                    <span>Instructor-led course</span>
                    <StatusBadge status={status} />
                  </div>
                  <h4>{title || 'Untitled draft course'}</h4>
                  <p>{description || 'Your syllabus description will appear here as you shape the course.'}</p>
                  <div className="draft-preview__footer">
                    <span>By {instructorName}</span>
                    <strong>${previewPrice}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="card draft-metadata-card" aria-labelledby="draft-metadata-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Metadata</p>
                  <h3 id="draft-metadata-title">Draft summary</h3>
                </div>
              </div>
              <dl className="draft-metadata-list">
                <div>
                  <dt>Owner</dt>
                  <dd>{instructorName}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>Private draft</dd>
                </div>
                <div><dt>Course status</dt><dd>Saved draft</dd></div>
              </dl>
            </section>

            <section className="card draft-list-panel" aria-labelledby="saved-drafts-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Library</p>
                  <h3 id="saved-drafts-title">Saved drafts</h3>
                </div>
                <span className="draft-count" aria-label={`${drafts.length} saved drafts`}>{drafts.length}</span>
              </div>

              {isLoading ? (
                <div className="draft-empty-state" role="status">
                  <strong>Loading drafts...</strong>
                  <p>Fetching your saved course drafts from the database.</p>
                </div>
              ) : loadError ? (
                <div className="draft-empty-state" role="alert" style={{ color: '#ef4444' }}>
                  <strong>Failed to load drafts</strong>
                  <p>{loadError}</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="draft-empty-state" role="status">
                  <strong>No drafts saved yet</strong>
                  <p>Your first saved course will appear here.</p>
                </div>
              ) : (
                <ul className="draft-list">
                  {drafts.map(draft => (
                    <li className="draft-list__item" key={draft.id}>
                      <div className="draft-list__copy">
                        <strong>{draft.title}</strong>
                        <span>${Number(draft.price).toFixed(2)} / Draft</span>
                      </div>
                      <div className="draft-list__actions">
                        <StatusBadge status={draft.status} />
                        <button
                          type="button"
                          onClick={() => handleStartEdit(draft)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartLesson(draft)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          Add Lesson
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewLessons(draft)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          View Lessons
                        </button>
                        <button type="button" onClick={() => startQuiz(draft)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '12px' }}>Add Quiz</button>
                        <button type="button" onClick={() => loadQuizzes(draft)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '12px' }}>View Quizzes</button>
                        <button
                          type="button"
                          onClick={() => handlePublishDraft(draft)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                          disabled={publishingDraftId === draft.id}
                        >
                          {publishingDraftId === draft.id ? 'Publishing...' : 'Publish'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
