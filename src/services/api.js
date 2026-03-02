import axios from 'axios';
import cognitoAuth from '@/auth/cognito';
import router from '@/router';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL
});

api.interceptors.request.use(async config => {
  const token = await cognitoAuth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      cognitoAuth.signOut();
      router.push({ name: 'login' });
    }
    return Promise.reject(error);
  }
);

export default api;
