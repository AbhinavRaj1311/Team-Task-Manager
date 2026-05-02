import axios from 'axios';
import type { DashboardResponse, Project, Task, User } from './types';

function computeApiBaseUrl(): string {
  const raw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
  const base = String(raw).replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
}

export const api = axios.create({
  baseURL: computeApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export function setAuthToken(token: string | null): void {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export const AuthApi = {
  async signup(payload: { name: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    const { data } = await api.post('/auth/signup', payload);
    return data;
  },
  async login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
  async me(): Promise<{ user: User }> {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export const DashboardApi = {
  async get(): Promise<DashboardResponse> {
    const { data } = await api.get('/dashboard');
    return data;
  },
};

export const ProjectsApi = {
  async list(): Promise<{ projects: Project[] }> {
    const { data } = await api.get('/projects');
    return data;
  },
  async create(payload: { title: string; description?: string; color?: string; memberIds?: string[] }): Promise<{ project: Project }> {
    const { data } = await api.post('/projects', payload);
    return data;
  },
  async get(projectId: string): Promise<{ project: Project; tasks: Task[] }> {
    const { data } = await api.get(`/projects/${projectId}`);
    return data;
  },
  async update(projectId: string, payload: Partial<Pick<Project, 'title' | 'description' | 'status' | 'color'>>): Promise<{ project: Project }> {
    const { data } = await api.put(`/projects/${projectId}`, payload);
    return data;
  },
  async remove(projectId: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/projects/${projectId}`);
    return data;
  },
  async addMember(projectId: string, userId: string): Promise<{ project: Project }> {
    const { data } = await api.post(`/projects/${projectId}/members`, { userId });
    return data;
  },
  async removeMember(projectId: string, userId: string): Promise<{ project: Project }> {
    const { data } = await api.delete(`/projects/${projectId}/members/${userId}`);
    return data;
  },
};

export const TasksApi = {
  async create(payload: {
    title: string;
    description?: string;
    projectId: string;
    assignedTo?: string | null;
    status?: Task['status'];
    priority?: Task['priority'];
    dueDate?: string | null;
  }): Promise<{ task: Task }> {
    const { data } = await api.post('/tasks', payload);
    return data;
  },
  async update(taskId: string, payload: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate'>> & { assignedTo?: string | null }):
    Promise<{ task: Task }> {
    const { data } = await api.put(`/tasks/${taskId}`, payload);
    return data;
  },
  async remove(taskId: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/tasks/${taskId}`);
    return data;
  },
};

export const UsersApi = {
  async list(): Promise<{ users: User[] }> {
    const { data } = await api.get('/users');
    return data;
  },
  async update(userId: string, payload: Partial<Pick<User, 'name' | 'role'>>): Promise<{ user: User }> {
    const { data } = await api.put(`/users/${userId}`, payload);
    return data;
  },
  async remove(userId: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/users/${userId}`);
    return data;
  },
};
