import React from 'react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function StudentResultsPage({ results, quizzes, loading, errors, onNavigate }) {
  const passed = results.filter(result => result.passed).length;
  const average = results.length === 0 ? 0 : Math.round(results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / results.length);
  const latest = results[0];
  const quizById = new Map(quizzes.map(quiz => [Number(quiz.id), quiz]));

  return <section className="page-stack" aria-labelledby="student-results-title">
    <header className="page-intro"><p className="page-kicker">Assessments</p><h2 className="page-title" id="student-results-title">Quiz results</h2><p className="page-description">Review saved scores from quizzes completed in your enrolled courses.</p></header>
    {errors.length > 0 && <div className="form-alert form-alert--warning" role="alert">{errors.join(' ')}</div>}
    {loading ? <div className="card" role="status">Loading quiz history...</div> : <>
      <div className="metrics-grid"><StatCard eyebrow="Attempts" title="Completed quizzes" value={results.length} description={`${passed} passing results`} tone="primary" /><StatCard eyebrow="Performance" title="Average score" value={`${average}%`} description="Across saved attempts" tone="success" /><StatCard eyebrow="Latest result" title="Latest score" value={`${Number(latest?.percentage || 0).toFixed(0)}%`} description={latest ? formatDate(latest.submittedAt) : 'No result recorded'} /></div>
      <section className="card" aria-labelledby="quiz-history-table-title"><div className="section-heading"><div><p className="section-label">Saved results</p><h3 id="quiz-history-table-title">Assessment history</h3></div><button className="btn btn-secondary" type="button" onClick={() => onNavigate('dashboard')}>Open available quizzes</button></div>{results.length === 0 ? <div className="empty-state" role="status">No quiz attempts have been submitted.</div> : <div className="table-container"><table className="table"><thead><tr><th>Quiz</th><th>Score</th><th>Percentage</th><th>Result</th><th>Submitted</th></tr></thead><tbody>{results.map(result => <tr key={result.id}><td>{quizById.get(Number(result.quizId))?.title || `Quiz ${result.quizId}`}</td><td>{result.score} / {result.maximumScore}</td><td>{Number(result.percentage || 0).toFixed(0)}%</td><td><StatusBadge status={result.passed ? 'completed' : 'failed'} /></td><td>{formatDate(result.submittedAt)}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </section>;
}
