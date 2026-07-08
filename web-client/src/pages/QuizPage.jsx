import React, { useState } from 'react';
import { mockQuestionBank } from '../data/mockData';

export default function QuizPage({ onSubmitQuiz, onBack }) {
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
      passed: correctCount >= 2,
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
      fontSize: '0.8125rem',
      fontWeight: '500',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            ← Return
          </button>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
          DB Schema Scope: Exam DB Table Attempts
        </div>
      </div>

      <div className="architecture-alert">
        <span>Boundaries: **Exam & Quiz Service / Exam DB**</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Questions Panel */}
        <div style={{ gridColumn: 'span 2' }}>
          <form onSubmit={handleSubmit}>
            {quizQuestions.map((q, idx) => (
              <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
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
                style={{ fontWeight: '600' }}
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
            <div className="card text-center" style={{ border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '2rem 1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Assessment Result
              </h3>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', fontFamily: 'var(--font-title)', color: scoreResult.passed ? 'var(--success)' : 'var(--danger)' }}>
                {scoreResult.passed ? 'PASSED' : 'FAILED'}
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>
                {scoreResult.score} / {scoreResult.max_score}
              </div>
              <p className="text-xs text-secondary-color">
                {scoreResult.passed 
                  ? 'Congratulations! You passed the passing score criteria.' 
                  : 'You did not pass the scoring limit. Review course contents and try again.'}
              </p>
              <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.675rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                INSERT INTO ExamDB.grading_results VALUES (attempt_id: {scoreResult.attempt_id})
              </div>
            </div>
          ) : (
            <div className="card text-center" style={{ color: 'var(--text-tertiary)', padding: '2rem' }}>
              <p className="text-xs">Complete and submit the quiz form above to generate grading logs inside Exam DB.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
