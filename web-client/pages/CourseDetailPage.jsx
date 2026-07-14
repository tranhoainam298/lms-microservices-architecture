import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('zalopay');

  useEffect(() => {
    loadCourse();
    if (user) checkEnrollment();
  }, [id, user]);

  const loadCourse = async () => {
    try {
      const response = await api.get(`/courses/${id}`);
      setCourse(response.data.data);
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await api.get('/courses/enrolled/my-courses');
      const enrolledCourses = response.data.data || [];
      setEnrolled(enrolledCourses.some(c => c.id === parseInt(id)));
    } catch (error) {
      console.error('Failed to check enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (course.price > 0) {
      setShowPayment(true);
      return;
    }

    setEnrolling(true);
    try {
      await api.post(`/courses/${id}/enroll`);
      setEnrolled(true);
      setMessage('Đăng ký khóa học thành công!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePayment = async () => {
    setEnrolling(true);
    try {
      const paymentResponse = await api.post('/payments/create', {
        courseId: parseInt(id),
        amount: course.price,
        method: paymentMethod
      });

      // Simulate successful payment for development
      // In production, redirect to payment gateway
      const paymentData = paymentResponse.data.data;
      
      // Auto-enroll after payment creation (simulated)
      await api.post(`/courses/${id}/enroll`);
      setEnrolled(true);
      setShowPayment(false);
      setMessage('Thanh toán và đăng ký thành công!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (lessonId) => {
    try {
      const totalLessons = course.lessons?.length || 1;
      const completedCount = 1; // Simplified
      const progress = Math.round((completedCount / totalLessons) * 100);
      
      await api.put(`/courses/${id}/progress`, { progress, lessonId });
      setMessage('Đã cập nhật tiến độ!');
      loadCourse();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (!course) return <div className="loading">Không tìm thấy khóa học</div>;

  return (
    <div className="course-detail-container">
      {message && <div className="success-message">{message}</div>}
      
      <div className="course-detail-header">
        <div className="course-detail-info">
          <h1>{course.title}</h1>
          <p className="course-description">{course.description}</p>
          <div className="course-detail-meta">
            <span className="meta-item">📊 Cấp độ: {course.level}</span>
            <span className="meta-item">📁 Danh mục: {course.category}</span>
            <span className="meta-item">📚 {course.lessons?.length || 0} bài học</span>
            <span className="meta-item price">
              {course.price > 0 ? `💰 ${course.price.toLocaleString()}đ` : '🆓 Miễn phí'}
            </span>
          </div>
          
          {!enrolled ? (
            <button onClick={handleEnroll} disabled={enrolling} className="btn-primary enroll-btn">
              {enrolling ? 'Đang xử lý...' : (course.price > 0 ? `Mua khóa học - ${course.price.toLocaleString()}đ` : 'Đăng ký miễn phí')}
            </button>
          ) : (
            <div className="enrolled-badge">✅ Đã đăng ký</div>
          )}
        </div>
        <div className="course-detail-thumbnail">
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} />
          ) : (
            <div className="placeholder-thumbnail-lg">📚</div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Thanh toán khóa học</h2>
            <p className="payment-course-name">{course.title}</p>
            <p className="payment-amount">{course.price.toLocaleString()}đ</p>
            
            <div className="payment-methods">
              <label className={`payment-method ${paymentMethod === 'zalopay' ? 'active' : ''}`}>
                <input type="radio" name="method" value="zalopay" checked={paymentMethod === 'zalopay'} onChange={e => setPaymentMethod(e.target.value)} />
                <span>💙 ZaloPay</span>
              </label>
              <label className={`payment-method ${paymentMethod === 'momo' ? 'active' : ''}`}>
                <input type="radio" name="method" value="momo" checked={paymentMethod === 'momo'} onChange={e => setPaymentMethod(e.target.value)} />
                <span>💜 Momo</span>
              </label>
            </div>
            
            <div className="modal-actions">
              <button onClick={handlePayment} disabled={enrolling} className="btn-primary">
                {enrolling ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
              </button>
              <button onClick={() => setShowPayment(false)} className="btn-secondary">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Lessons List */}
      <div className="lessons-section">
        <h2>Nội dung khóa học</h2>
        {course.lessons && course.lessons.length > 0 ? (
          <div className="lessons-list">
            {course.lessons.map((lesson, index) => (
              <div key={lesson.id} className={`lesson-item ${enrolled ? 'accessible' : 'locked'}`}>
                <div className="lesson-number">{index + 1}</div>
                <div className="lesson-info">
                  <h4>{lesson.title}</h4>
                  {enrolled && lesson.content && (
                    <div className="lesson-content">
                      <p>{lesson.content}</p>
                      {lesson.video_url && (
                        <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="video-link">
                          🎬 Xem video
                        </a>
                      )}
                    </div>
                  )}
                  <span className="lesson-duration">{lesson.duration || 0} phút</span>
                </div>
                {enrolled && (
                  <button onClick={() => handleLessonComplete(lesson.id)} className="btn-complete">
                    ✓ Hoàn thành
                  </button>
                )}
                {!enrolled && <span className="lock-icon">🔒</span>}
              </div>
            ))}
          </div>
        ) : (
          <p>Chưa có bài học nào.</p>
        )}
      </div>
    </div>
  );
}

export default CourseDetailPage;