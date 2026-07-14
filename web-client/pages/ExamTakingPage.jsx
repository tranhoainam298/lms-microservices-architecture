import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

function ExamTakingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    startExam();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || result) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const startExam = async () => {
    try {
      const response = await api.post(`/exams/${id}/start`, { userId: user.id });
      const data = response.data.data;
      setExam(data.exam);
      setQuestions(data.questions || []);
      setAttemptId(data.attemptId);
      setTimeLeft(data.exam.duration * 60); // Convert minutes to seconds
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('Không thể bắt đầu bài thi: ' + (error.response?.data?.message || error.message));
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || result) return;
    setSubmitting(true);
    
    try {
      const answersList = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer
      }));

      const response = await api.post(`/exams/${id}/submit`, {
        attemptId,
        answers: answersList
      });

      setResult(response.data.data);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      alert('Nộp bài thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, result, answers, attemptId, id]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseOptions = (optionsStr) => {
    try {
      return JSON.parse(optionsStr);
    } catch {
      return [];
    }
  };

  if (loading) return <div className="loading">Đang tải bài thi...</div>;

  // Show result
  if (result) {
    return (
      <div className="exam-result-container">
        <div className="exam-result-card">
          <h1>{result.passed ? '🎉 Chúc mừng!' : '😔 Chưa đạt'}</h1>
          <h2>{exam?.title}</h2>
          <div className="result-score">
            <div className={`score-circle ${result.passed ? 'pass' : 'fail'}`}>
              <span className="score-number">{Math.round(result.score)}%</span>
            </div>
          </div>
          <div className="result-details">
            <p>Điểm đạt: {result.earnedPoints}/{result.totalPoints}</p>
            <p>Kết quả: <strong>{result.passed ? 'Đạt ✅' : 'Không đạt ❌'}</strong></p>
            <p>Thời gian nộp: {new Date(result.submittedAt).toLocaleString('vi-VN')}</p>
          </div>
          <button onClick={() => navigate('/exams')} className="btn-primary">
            Quay lại danh sách bài thi
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="exam-taking-container">
      <div className="exam-header-bar">
        <h2>{exam?.title}</h2>
        <div className={`timer ${timeLeft < 60 ? 'timer-warning' : ''}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      <div className="exam-body">
        <div className="question-nav">
          {questions.map((q, index) => (
            <button
              key={q.id}
              className={`q-nav-btn ${index === currentQuestion ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
              onClick={() => setCurrentQuestion(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div className="question-panel">
          {question && (
            <>
              <div className="question-header">
                <span className="question-number">Câu {currentQuestion + 1}/{questions.length}</span>
                <span className="question-points">{question.points} điểm</span>
              </div>
              <div className="question-content">
                <p>{question.content}</p>
              </div>

              {question.questionType === 'multiple_choice' && (
                <div className="options-list">
                  {parseOptions(question.options).map((option, idx) => (
                    <label key={idx} className={`option-item ${answers[question.id] === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleAnswer(question.id, option)}
                      />
                      <span className="option-label">{String.fromCharCode(65 + idx)}</span>
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.questionType === 'fill_blank' && (
                <div className="fill-blank">
                  <input
                    type="text"
                    placeholder="Nhập câu trả lời..."
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    className="fill-blank-input"
                  />
                </div>
              )}

              {question.questionType === 'essay' && (
                <div className="essay-answer">
                  <textarea
                    placeholder="Viết câu trả lời..."
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    rows={6}
                    className="essay-textarea"
                  />
                </div>
              )}

              <div className="question-actions">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="btn-secondary"
                >
                  ← Câu trước
                </button>
                {currentQuestion < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    className="btn-primary"
                  >
                    Câu tiếp →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting} className="btn-submit">
                    {submitting ? 'Đang nộp...' : '📤 Nộp bài'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="exam-footer">
        <p>Đã trả lời: {Object.keys(answers).length}/{questions.length} câu</p>
        <button onClick={handleSubmit} disabled={submitting} className="btn-submit">
          {submitting ? 'Đang nộp...' : 'Nộp bài thi'}
        </button>
      </div>
    </div>
  );
}

export default ExamTakingPage;