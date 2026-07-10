import React, { useState } from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';
import ProgressBar from '../components/ProgressBar';
import { mockQuestionBank, mockQuizzes } from '../data/mockData';

export default function QuizPage({ quizId, onSubmitQuiz, onBack }) {
  const quizQuestions = mockQuestionBank.filter(question => question.course_id === 201); // Mock course quiz questions
  const quiz = mockQuizzes.find(item => item.id === (quizId || 801)) || mockQuizzes[0];
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [scoreResult, setScoreResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const remainingCount = quizQuestions.length - answeredCount;
  const questionProgress = quizQuestions.length
    ? Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100)
    : 0;

  const handleOptionSelect = (questionId, option) => {
    if (submitted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: option
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitted) return;

    let correctCount = 0;
    quizQuestions.forEach(question => {
      if (selectedAnswers[question.id] === question.correct_answer) {
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

  const getOptionClassName = (question, option) => {
    const isSelected = selectedAnswers[question.id] === option;
    const isCorrectOption = option === question.correct_answer;
    const classes = ['quiz-option'];

    if (isSelected) classes.push('is-selected');
    if (submitted && isCorrectOption) classes.push('is-correct');
    if (submitted && isSelected && !isCorrectOption) classes.push('is-incorrect');

    return classes.join(' ');
  };

  const getQuestionNavClassName = (question, index) => {
    const classes = ['quiz-navigator__button'];
    const answer = selectedAnswers[question.id];

    if (index === currentQuestionIndex) classes.push('is-active');
    if (answer) classes.push('is-answered');
    if (submitted && answer === question.correct_answer) classes.push('is-correct');
    if (submitted && answer !== question.correct_answer) classes.push('is-incorrect');

    return classes.join(' ');
  };

  if (!currentQuestion) {
    return (
      <section className="card empty-state" role="status" aria-labelledby="quiz-empty-title">
        <span className="page-kicker">Assessment</span>
        <h2 id="quiz-empty-title">No quiz questions are available</h2>
        <p>Return to your dashboard and choose another assessment.</p>
        <button className="btn btn-secondary" type="button" onClick={onBack}>
          Back to dashboard
        </button>
      </section>
    );
  }

  return (
    <section className="quiz-page page-stack" aria-labelledby="quiz-page-title">
      <header className="quiz-page__header">
        <div>
          <button className="btn btn-ghost quiz-page__back" type="button" onClick={onBack}>
            <span aria-hidden="true">&larr;</span>
            Back to dashboard
          </button>
          <span className="page-kicker">Focused assessment</span>
          <h2 id="quiz-page-title">{quiz?.title || 'Microservices Architecture Basics'}</h2>
          <p>{quiz?.due_label || 'Complete every question before submitting your attempt.'}</p>
        </div>

        <div className="quiz-page__badges" aria-label="Assessment ownership">
          <span className="service-badge">Exam &amp; Quiz Service</span>
          <span className="database-badge">Exam DB</span>
        </div>
      </header>

      <section className="architecture-context architecture-card" aria-labelledby="quiz-flow-title">
        <div className="section-heading architecture-context__heading">
          <div>
            <span className="section-label">Grading boundary</span>
            <h3 id="quiz-flow-title">Attempt submission flow</h3>
          </div>
          <span className="status-badge status-badge--active">Mock assessment</span>
        </div>
        <ArchitectureFlow
          steps={['Web Client', 'API Gateway', 'Exam & Quiz Service', 'Exam DB']}
          ariaLabel="Quiz attempt flows from Web Client through API Gateway and Exam and Quiz Service to Exam DB"
        />
      </section>

      <div className="quiz-workspace">
        <aside className="card quiz-navigator" aria-labelledby="question-navigation-title">
          <div className="quiz-navigator__header">
            <div>
              <span className="section-label">Question map</span>
              <h3 id="question-navigation-title">Your progress</h3>
            </div>
            <span>{answeredCount}/{quizQuestions.length}</span>
          </div>

          <ProgressBar
            value={Math.round((answeredCount / quizQuestions.length) * 100)}
            label="Questions answered"
          />

          <nav aria-label="Quiz question navigation">
            <ol className="quiz-navigator__list">
              {quizQuestions.map((question, index) => (
                <li key={question.id}>
                  <button
                    type="button"
                    className={getQuestionNavClassName(question, index)}
                    onClick={() => setCurrentQuestionIndex(index)}
                    aria-current={index === currentQuestionIndex ? 'step' : undefined}
                    aria-label={`Question ${index + 1}${selectedAnswers[question.id] ? ', answered' : ', unanswered'}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <small>
                      {submitted
                        ? selectedAnswers[question.id] === question.correct_answer ? 'Correct' : 'Incorrect'
                        : selectedAnswers[question.id] ? 'Answered' : 'Not answered'}
                    </small>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="quiz-navigator__legend" aria-label="Question status legend">
            <span><i className="quiz-legend-dot is-current" aria-hidden="true" />Current</span>
            <span><i className="quiz-legend-dot is-answered" aria-hidden="true" />Answered</span>
          </div>
        </aside>

        <div className="quiz-main">
          <form className="quiz-form" onSubmit={handleSubmit}>
            <article className="card quiz-question-card" aria-labelledby={`question-${currentQuestion.id}`}>
              <header className="quiz-question-card__header">
                <div>
                  <span className="section-label">
                    Question {currentQuestionIndex + 1} of {quizQuestions.length}
                  </span>
                  <h3 id={`question-${currentQuestion.id}`}>{currentQuestion.question_text}</h3>
                </div>
                <span className="quiz-question-card__type">Single choice</span>
              </header>

              <ProgressBar value={questionProgress} label="Quiz position" />

              <fieldset className="quiz-options">
                <legend className="sr-only">Choose one answer</legend>
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === option;
                  const isCorrectOption = option === currentQuestion.correct_answer;
                  const showFeedback = submitted && (isCorrectOption || isSelected);

                  return (
                    <button
                      key={option}
                      type="button"
                      className={getOptionClassName(currentQuestion, option)}
                      onClick={() => handleOptionSelect(currentQuestion.id, option)}
                      aria-pressed={isSelected}
                      disabled={submitted}
                    >
                      <span className="quiz-option__index" aria-hidden="true">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="quiz-option__label">{option}</span>
                      {showFeedback && (
                        <span className="quiz-option__feedback">
                          {isCorrectOption ? 'Correct answer' : 'Your answer'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </fieldset>

              {submitted && (
                <div className="quiz-question-feedback" role="status">
                  {selectedAnswers[currentQuestion.id] === currentQuestion.correct_answer
                    ? 'Correct. This answer matches the grading record.'
                    : `Incorrect. The correct answer is ${currentQuestion.correct_answer}.`}
                </div>
              )}

              <footer className="quiz-question-card__actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index => Math.max(0, index - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <span aria-hidden="true">&larr;</span>
                  Previous
                </button>

                <span className="quiz-question-card__position">
                  {currentQuestionIndex + 1} / {quizQuestions.length}
                </span>

                {currentQuestionIndex < quizQuestions.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => setCurrentQuestionIndex(index => Math.min(quizQuestions.length - 1, index + 1))}
                  >
                    Next question
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                ) : !submitted ? (
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={answeredCount < quizQuestions.length}
                  >
                    Submit answers
                  </button>
                ) : (
                  <span className="status-badge status-badge--success">Attempt submitted</span>
                )}
              </footer>
            </article>
          </form>
        </div>

        <aside className="quiz-summary" aria-live="polite">
          {scoreResult ? (
            <section
              className={`card quiz-result ${scoreResult.passed ? 'is-passed' : 'is-failed'}`}
              aria-labelledby="quiz-result-title"
            >
              <span className="section-label">Assessment result</span>
              <span className="quiz-result__status">
                {scoreResult.passed ? 'Passed' : 'Not passed'}
              </span>
              <h3 id="quiz-result-title">
                {scoreResult.score}<small> / {scoreResult.max_score}</small>
              </h3>
              <p>
                {scoreResult.passed
                  ? 'You met the passing score. Review any missed answer before continuing.'
                  : 'Review the lesson material and try the assessment again when ready.'}
              </p>
              <dl className="quiz-result__meta">
                <div>
                  <dt>Passing score</dt>
                  <dd>2 of {scoreResult.max_score}</dd>
                </div>
                <div>
                  <dt>Attempt ID</dt>
                  <dd>{scoreResult.attempt_id}</dd>
                </div>
                <div>
                  <dt>Record</dt>
                  <dd>Mock grading result</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="card quiz-readiness" aria-labelledby="quiz-readiness-title">
              <span className="section-label">Submission status</span>
              <h3 id="quiz-readiness-title">
                {remainingCount === 0 ? 'Ready to submit' : `${remainingCount} answer${remainingCount === 1 ? '' : 's'} remaining`}
              </h3>
              <p>Every question must have one selected answer before grading can begin.</p>
              <dl>
                <div>
                  <dt>Questions</dt>
                  <dd>{quizQuestions.length}</dd>
                </div>
                <div>
                  <dt>Passing score</dt>
                  <dd>2 correct</dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>Exam DB mock</dd>
                </div>
              </dl>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
