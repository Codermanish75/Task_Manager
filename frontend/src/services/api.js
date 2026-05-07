import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
            { refresh }
          );
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return API(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register/', data),
  login: (data) => API.post('/auth/login/', data),
  logout: (refresh) => API.post('/auth/logout/', { refresh }),
  me: () => API.get('/auth/me/'),
};

export const projectsAPI = {
  list: () => API.get('/projects/'),
  get: (id) => API.get(`/projects/${id}/`),
  create: (data) => API.post('/projects/', data),
  update: (id, data) => API.put(`/projects/${id}/`, data),
  delete: (id) => API.delete(`/projects/${id}/`),
  stats: (id) => API.get(`/projects/${id}/stats/`),
  addMember: (id, user_id, role = 'member') =>
    API.post(`/projects/${id}/add_member/`, { user_id, role }),
  removeMember: (id, user_id) =>
    API.post(`/projects/${id}/remove_member/`, { user_id }),
  changeMemberRole: (id, user_id, role) =>
    API.post(`/projects/${id}/change_member_role/`, { user_id, role }),
};

export const tasksAPI = {
  list: (params) => API.get('/tasks/', { params }),
  get: (id) => API.get(`/tasks/${id}/`),
  create: (data) => API.post('/tasks/', data),
  update: (id, data) => API.put(`/tasks/${id}/`, data),
  delete: (id) => API.delete(`/tasks/${id}/`),
};

export const commentsAPI = {
  create: (data) => API.post('/comments/', data),
};

export const usersAPI = {
  list: () => API.get('/users/'),
  setSystemRole: (id, system_role) => API.patch(`/users/${id}/system_role/`, { system_role }),
};

export const dashboardAPI = {
  stats: () => API.get('/dashboard/stats/'),
};

export const notificationsAPI = {
  list: () => API.get('/notifications/'),
  markRead: () => API.post('/notifications/read/'),
};

export default API;
