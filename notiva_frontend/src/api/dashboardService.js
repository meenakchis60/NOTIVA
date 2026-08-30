import axiosInstance from './axiosInstance';

export const dashboardService = {
  getStats: () => axiosInstance.get('/dashboard/stats/'),
  
  getNotifications: () => axiosInstance.get('/dashboard/notifications/'),
  readAllNotifications: () => axiosInstance.post('/dashboard/notifications/read-all/'),
  markNotificationRead: (id) => axiosInstance.patch(`/dashboard/notifications/${id}/`, { is_read: true }),
  
  getActivity: () => axiosInstance.get('/dashboard/activity/'),
};

export default dashboardService;
