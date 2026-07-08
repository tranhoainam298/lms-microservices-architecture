import React, { useState } from 'react';
import { mockQuestionBank } from '../data/mockData';

export default function QuizPage({ quizId, onSubmitQuiz, onBack }) {
  const quizQuestions = mockQuestionBank.filter(q => q.course_id === 201); // Mock course quiz questions
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [scoreResult, setScoreResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleOptionSelect = (questionId, option) => {
    if (submitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: option
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitted) return;

    let correctCount = 0;
    quizQuestions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const finalScore = {
      score: correctCount,
      max_score: quizQuestions.length,
      passed: correctCount >= 2, // Passing threshold: 2/3
      attempt_id: Date.now()
    };

    setScoreResult(finalScore);
    setSubmitted(true);
    onSubmitQuiz(finalScore);
  };

  const optionListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.75rem',
    listStyle: 'none'
  };

  const getOptionStyle = (questionId, option) => {
    const isSelected = selectedAnswers[questionId] === option;
    const isCorrectOption = option === quizQuestions.find(q => q.id === questionId).correct_answer;
    
    let base = {
      padding: '0.75rem 1rem',
      borderRadius: 'var(--border-radius-sm)',
      border: '1px solid var(--border-color)',
      cursor: submitted ? 'default' : 'pointer',
      fontSize: '0.875rem',
      transition: 'all var(--transition-fast)'
    };

    if (submitted) {
      if (isCorrectOption) {
        return { ...base, backgroundColor: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success)' };
      }
      if (isSelected && !isCorrectOption) {
        return { ...base, backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--danger)' };
      }
    } else if (isSelected) {
      return { ...base, backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary-hover)' };
    }

    return base;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Quiz Assessment</h1>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          DB Scope: **Exam DB**
        </div>
      </div>

      <div className="architecture-alert">
        <span>✍️</span>
        <span>Flow: **Exam Management: Take Quiz** (Exam & Quiz Service / Exam DB)</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Questions Panel */}
        <div style={{ gridColumn: 'span 2' }}>
          <form onSubmit={handleSubmit}>
            {quizQuestions.map((q, idx) => (
              <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  Question {idx + 1}: {q.question_text}
                </div>
                <ul style={optionListStyle}>
                  {q.options.map(opt => (
                    <li 
                      key={opt} 
                      style={getOptionStyle(q.id, opt)}
                      onClick={() => handleOptionSelect(q.id, opt)}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {!submitted && (
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
              >
                Submit Answers
              </button>
            )}
          </form>
        </div>

        {/* Results Panel */}
        <div>
          {scoreResult ? (
            <div className="card text-center" style={{ border: '2px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Attempt Results</h3>
              <div style={{ fontSize: '3rem', margin: '1rem 0' }}>
                {scoreResult.passed ? '🎉' : '❌'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>
                Score: {scoreResult.score} / {scoreResult.max_score}
              </div>
              <p className="text-sm text-secondary-color" style={{ marginTop: '0.5rem' }}>
                {scoreResult.passed ? 'You passed this quiz!' : 'You did not meet the passing score.'}
              </p>
              <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Result saved in **Exam DB** (grading_results)
              </div>
            </div>
          ) : (
            <div className="card text-center" style={{ color: 'var(--text-tertiary)', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p className="text-sm">Submit your quiz to see results and grading logs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
