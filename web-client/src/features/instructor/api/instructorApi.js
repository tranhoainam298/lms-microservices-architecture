import { apiRequest } from '../../../services/apiClient';

export const instructorApi = {
  getOwnedCourses(accessToken) {
    return apiRequest('/courses/instructor/mine', { accessToken });
  },

  getWorkspaceResults(accessToken) {
    return apiRequest('/exams/instructor/results/summary', { accessToken });
  },

  getCourseProgress(courseId, accessToken) {
    return apiRequest(`/courses/instructor/${courseId}/progress`, { accessToken });
  },

  getCourseResultSummary(courseId, accessToken) {
    return apiRequest(`/exams/courses/${courseId}/results/summary`, { accessToken });
  }
};
