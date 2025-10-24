import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;
// Ensure baseURL ends with /api
const apiBaseURL = baseURL && !baseURL.endsWith('/api') ? `${baseURL}/api` : baseURL;

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
});

export default api;