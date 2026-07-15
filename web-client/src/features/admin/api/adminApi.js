import { apiRequest, buildQuery } from '../../../services/apiClient';

export const adminApi = {
  getUsers(accessToken, filters = {}) {
    return apiRequest(`/users/admin/users${buildQuery(filters)}`, { accessToken });
  },

  updateUserStatus(userId, status, accessToken) {
    return apiRequest(`/users/admin/users/${userId}/status`, {
      method: 'PATCH', accessToken, body: { status }
    });
  },

  updateUserRole(userId, role, accessToken) {
    return apiRequest(`/users/admin/users/${userId}/role`, {
      method: 'PATCH', accessToken, body: { role }
    });
  },

  getCourseReport(accessToken, filters = {}) {
    return apiRequest(`/courses/admin/reports/courses${buildQuery(filters)}`, { accessToken });
  },

  getRevenueReport(accessToken, filters = {}) {
    return apiRequest(`/payments/reports/revenue${buildQuery(filters)}`, { accessToken });
  },

  getActivityReport(accessToken, filters = {}) {
    return apiRequest(`/users/admin/reports/activity${buildQuery(filters)}`, { accessToken });
  }
};
