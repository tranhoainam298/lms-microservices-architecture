import React, { useEffect, useState } from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';

export default function QuizPage({ quizId, courseId, accessToken, onBack }) {
  const [summaries, setSummaries] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const request = async (url, options = {}) => {
    const response = await fetch(`http://localhost:3000${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'The Exam Service request failed.');
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
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const body = await request(`/exams/quizzes/${quiz.id}/submit`, { method: 'POST', body: JSON.stringify({ answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId: Number(questionId), selectedOptionIndex })) }) });
      setResult(body.result);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <section className="quiz-page page-stack" aria-labelledby="quiz-page-title">
      <header className="quiz-page__header"><div><button className="btn btn-ghost" type="button" onClick={onBack}>← Back</button><span className="page-kicker">Secure assessment</span><h2 id="quiz-page-title">{quiz?.title || 'Published quizzes'}</h2><p>Answers are graded only by Exam Service.</p></div><span className="service-badge">Exam Service / MySQL</span></header>
      <ArchitectureFlow steps={['Web Client', 'API Gateway', 'Exam Service', 'Exam DB']} compact />
      {loading && <div className="card" role="status">Loading quizzes...</div>}
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      {!loading && !quiz && summaries.length === 0 && !error && <div className="card empty-state">No published quizzes are available.</div>}
      {!quiz && summaries.length > 0 && <div className="grid gap-4">{summaries.map(item => <article className="card" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><p>{item.questionCount} questions · {item.durationMinutes} minutes · Pass {item.passingScore}%</p><button className="btn btn-primary" type="button" onClick={() => openQuiz(item.id)}>Open quiz</button></article>)}</div>}
      {quiz && <form className="page-stack" onSubmit={submit}>{quiz.questions.map((question, index) => <fieldset className="card quiz-question-card" key={question.id} disabled={Boolean(result)}><legend><strong>{index + 1}. {question.questionText}</strong></legend><p>{question.points} point(s)</p>{question.options.map((option, optionIndex) => <label className="quiz-option" key={`${question.id}-${optionIndex}`}><input type="radio" name={`question-${question.id}`} checked={answers[question.id] === optionIndex} onChange={() => setAnswers(current => ({ ...current, [question.id]: optionIndex }))} /> <span>{option}</span></label>)}</fieldset>)}{!result && <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit answers'}</button>}</form>}
      {result && <section className={`card quiz-result ${result.passed ? 'is-passed' : 'is-failed'}`}><h3>{result.passed ? 'Passed' : 'Not passed'}</h3><p>{result.score} / {result.maximumScore} points · {result.percentage}%</p><p>Result #{result.id} was stored in Exam DB.</p></section>}
    </section>
  );
}
