export type Role = 'admin' | 'member';

export type User = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
};

export type Project = {
  _id: string;
  title: string;
  description?: string;
  owner: User;
  members: User[];
  status: 'active' | 'completed' | 'archived';
  color?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskStatus = 'pending' | 'in-progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export type Task = {
  _id: string;
  title: string;
  description?: string;
  project: { _id: string; title: string; color?: string } | string;
  assignedTo: User | null;
  createdBy: User;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isOverdue?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardResponse = {
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    totalProjects: number;
    totalUsers?: number;
  };
  recentTasks: Task[];
  projects: Project[];
};
