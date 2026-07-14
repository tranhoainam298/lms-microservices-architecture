import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

function ExamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [myResults, setMyResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');

  useEffect(() => {
    loadExams();
    if (user) loadMyResults();
  }, [user]);

  const loadExams = async () => {
    try {
      const response = await api.get('/exams');
      setExams(response.data.data || []);
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyResults = async () => {
    try {
      const response = await api.get(`/exams/my-results?userId=${user.id}`);
      setMyResults(response.data.data || []);
    } catch (error) {
      console.error('Failed to load results:', error);
    }
  };

  const handleStartExam = (examId) => {
    navigate(`/exams/${examId}/take`);
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="exams-container">
      <h1>Bài thi & Quiz</h1>
      
      <div className="tabs">
        <button className={`tab ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>
          📝 Danh sách bài thi
        </button>
        <button className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>
          📊 Kết quả của tôi
        </button>
      </div>

      {activeTab === 'exams' && (
        <div className="exams-grid">
          {exams.length === 0 ? (
            <p>Chưa có bài thi nào.</p>
          ) : (
            exams.map(exam => (
              <div key={exam.id} className="exam-card">
                <div className="exam-card-header">
                  <h3>{exam.title}</h3>
                  {exam.isPublished && <span className="badge-published">Đang mở</span>}
                </div>
                <p className="exam-description">{exam.description || 'Không có mô tả'}</p>
                <div className="exam-meta">
                  <span>⏱️ {exam.duration} phút</span>
                  <span>📋 {exam.questionCount} câu hỏi</span>
                  <span>🎯 Đạt: {exam.passScore}%</span>
                </div>
                <button onClick={() => handleStartExam(exam.id)} className="btn-primary">
                  Bắt đầu làm bài
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="results-list">
          {myResults.length === 0 ? (
            <p>Chưa có kết quả nào.</p>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>Bài thi</th>
                  <th>Điểm</th>
                  <th>Kết quả</th>
                  <th>Trạng thái</th>
                  <th>Ngày thi</th>
                </tr>
              </thead>
              <tbody>
                {myResults.map(result => (
                  <tr key={result.id}>
                    <td>{result.examTitle}</td>
                    <td className="score">{Math.round(result.score)}%</td>
                    <td>
                      <span className={`badge ${result.passed ? 'badge-pass' : 'badge-fail'}`}>
                        {result.passed ? '✅ Đạt' : '❌ Không đạt'}
                      </span>
                    </td>
                    <td>{result.status}</td>
                    <td>{result.submittedAt ? new Date(result.submittedAt).toLocaleDateString('vi-VN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default ExamsPage;