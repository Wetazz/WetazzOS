import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wz_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  login: (email, password) => api.post("/auth/login", { email, password }).then(r => r.data),
  signup: (data) => api.post("/auth/signup", data).then(r => r.data),
  me: () => api.get("/auth/me").then(r => r.data),
};

export function saveSession({ token, user }) {
  localStorage.setItem("wz_token", token);
  localStorage.setItem("wz_user", JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem("wz_user");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem("wz_token");
  localStorage.removeItem("wz_user");
}

export const STAFF_ROLES = ["OWNER", "ADMIN", "SERVICE_ADVISOR", "TECHNICIAN", "STAFF"];
