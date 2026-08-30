import axiosInstance from './axiosInstance';

export const studyService = {
  getSessions: (params) => axiosInstance.get('/study/sessions/', { params }),
  getSession: (id) => axiosInstance.get(`/study/sessions/${id}/`),
  createSession: (data) => axiosInstance.post('/study/sessions/', data),
  completeSession: (id) => axiosInstance.post(`/study/sessions/${id}/complete/`),
  cancelSession: (id) => axiosInstance.post(`/study/sessions/${id}/cancel/`),
};

export const goalsService = {
  getGoals: (params) => axiosInstance.get('/study/goals/', { params }),
  getGoal: (id) => axiosInstance.get(`/study/goals/${id}/`),
  createGoal: (data) => axiosInstance.post('/study/goals/', data),
  updateGoal: (id, data) => axiosInstance.patch(`/study/goals/${id}/`, data),
  cancelGoal: (id) => axiosInstance.post(`/study/goals/${id}/cancel/`),
};

export const remindersService = {
  getReminders: (params) => axiosInstance.get('/study/reminders/', { params }),
  getReminder: (id) => axiosInstance.get(`/study/reminders/${id}/`),
  createReminder: (data) => axiosInstance.post('/study/reminders/', data),
  updateReminder: (id, data) => axiosInstance.patch(`/study/reminders/${id}/`, data),
  completeReminder: (id) => axiosInstance.post(`/study/reminders/${id}/complete/`),
  dismissReminder: (id) => axiosInstance.post(`/study/reminders/${id}/dismiss/`),
};
