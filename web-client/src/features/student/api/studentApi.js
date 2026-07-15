import { apiRequest, buildQuery } from '../../../services/apiClient';

export const studentApi = {
  getCatalog(filters = {}) {
    return apiRequest(`/courses${buildQuery(filters)}`);
  },

  getCourseDetail(courseId) {
    return apiRequest(`/courses/${courseId}`);
  },

  getEnrolledCourses(accessToken) {
    return apiRequest('/courses/enrolled', { accessToken });
  },

  enrollFreeCourse(courseId, accessToken) {
    return apiRequest(`/courses/${courseId}/enroll`, { method: 'POST', accessToken });
  },

  getPaymentHistory(accessToken) {
    return apiRequest('/payments/mine', { accessToken });
  },

  getQuizResults(accessToken) {
    return apiRequest('/exams/results/mine', { accessToken });
  },

  getCourseQuizzes(courseId, accessToken) {
    return apiRequest(`/exams/courses/${courseId}/quizzes`, { accessToken });
  }
};
