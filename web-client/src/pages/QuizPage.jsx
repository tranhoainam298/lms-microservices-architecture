import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';
import ProgressBar from '../components/ProgressBar';

export default function QuizPage({ quizId, courseId, accessToken, onBack }) {
  const [summaries, setSummaries] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const request = async (url, options = {}) => {
    const response = await fetch(apiUrl(url), {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'The quiz request failed.');
    return body;
  };

  const openQuiz = async (id) => {
    setLoading(true); setError(''); setResult(null); setAnswers({});
    try { setQuiz((await request(`/exams/quizzes/${id}`)).quiz); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (quizId) { const body = await request(`/exams/quizzes/${quizId}`); if (active) setQuiz(body.quiz); }
        else if (courseId) { const body = await request(`/exams/courses/${courseId}/quizzes`); if (active) setSummaries(body.items || []); }
        else if (active) setError('Choose a course or quiz to begin.');
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [quizId, courseId, accessToken]);

  const submit = async (event) => {
    event.preventDefault();
    if (!allQuestionsAnswered) {
      setError(`Answer all ${quiz.questions.length} questions before submitting.`);
      return;
    }
    setSubmitting(true); setError('');
    try {
      const body = await request(`/exams/quizzes/${quiz.id}/submit`, { method: 'POST', body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId: Number(questionId), selectedOptionIndex })) }) });
      setResult(body.result);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const answeredCount = quiz ? quiz.questions.filter(question => answers[question.id] !== undefined).length : 0;
  const answerProgress = quiz?.questions.length ? Math.round((answeredCount / quiz.questions.length) * 100) : 0;
  const unansweredCount = quiz ? quiz.questions.length - answeredCount : 0;
  const allQuestionsAnswered = Boolean(quiz?.questions.length) && unansweredCount === 0;

  return (
    <section className="quiz-page page-stack" aria-labelledby="quiz-page-title">
      <header className="quiz-page__header"><div><button className="btn btn-ghost" type="button" onClick={onBack}>← Back</button><span className="page-kicker">Assessment</span><h2 id="quiz-page-title">{quiz?.title || 'Published quizzes'}</h2><p>Answer each question, then submit when you are ready.</p></div><span className="status-badge status-badge--active">Ready</span></header>
      {loading && <div className="card" role="status">Loading quizzes...</div>}
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      {!loading && !quiz && summaries.length === 0 && !error && <div className="card empty-state">No published quizzes are available.</div>}
      {!quiz && summaries.length > 0 && <div className="grid gap-4">{summaries.map(item => <article className="card" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><p>{item.questionCount} questions · {item.durationMinutes} minutes · Pass {item.passingScore}%</p><button className="btn btn-primary" type="button" onClick={() => openQuiz(item.id)}>Open quiz</button></article>)}</div>}
      {quiz && !result && <section className="card quiz-progress" aria-label="Quiz progress"><ProgressBar value={answerProgress} label="Answered questions" /><p>{answeredCount} of {quiz.questions.length} questions answered</p>{!allQuestionsAnswered && <p role="status">Answer {unansweredCount} more question{unansweredCount === 1 ? '' : 's'} to submit.</p>}</section>}
      {quiz && <form className="page-stack" onSubmit={submit}>{quiz.questions.map((question, index) => <fieldset className="card quiz-question-card" key={question.id} disabled={Boolean(result)}><legend><strong>{index + 1}. {question.questionText}</strong></legend><p>{question.points} point(s)</p>{question.options.map((option, optionIndex) => <label className="quiz-option" key={`${question.id}-${optionIndex}`}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === optionIndex} onChange={() => { setAnswers(current => ({ ...current, [question.id]: optionIndex })); setError(''); }} /> <span>{option}</span></label>)}</fieldset>)}{!result && <button className="btn btn-primary" type="submit" disabled={submitting || !allQuestionsAnswered}>{submitting ? 'Submitting...' : allQuestionsAnswered ? 'Submit answers' : `Answer ${unansweredCount} remaining`}</button>}</form>}
      {result && <section className={`card quiz-result ${result.passed ? 'is-passed' : 'is-failed'}`}><span className="page-kicker">Your score</span><h3>{result.passed ? 'Passed' : 'Not passed'}</h3><p>{result.score} / {result.maximumScore} points · {result.percentage}%</p><p>Your result has been saved.</p></section>}
    </section>
  );
}
