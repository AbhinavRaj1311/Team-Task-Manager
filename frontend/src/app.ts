import type { DashboardResponse, Project, Task, User } from './types';
import { AuthApi, DashboardApi, ProjectsApi, TasksApi, UsersApi, setAuthToken } from './api';
import { clearSession, loadSession, saveSession, type Session } from './session';
import { escapeHtml, formatDate, toDateInputValue } from './utils';

type Route =
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'dashboard' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'users' };

type AppState = {
  session: Session | null;
  route: Route;
  notice: { kind: 'info' | 'error'; message: string } | null;

  dashboard: DashboardResponse | null;
  projects: Project[] | null;
  projectDetail: { project: Project; tasks: Task[] } | null;
  users: User[] | null;

  loading: boolean;
};

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard' };

  if (parts[0] === 'login') return { name: 'login' };
  if (parts[0] === 'signup') return { name: 'signup' };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'projects' && parts.length === 1) return { name: 'projects' };
  if (parts[0] === 'project' && parts[1]) return { name: 'project', id: parts[1] };
  if (parts[0] === 'users') return { name: 'users' };

  return { name: 'dashboard' };
}

function go(path: string): void {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

function isAdmin(state: AppState): boolean {
  return state.session?.user.role === 'admin';
}

function requireAuthOrRedirect(state: AppState): void {
  if (!state.session) {
    go('/login');
  }
}

function requireAdminOrRedirect(state: AppState): void {
  if (!state.session) return;
  if (state.session.user.role !== 'admin') {
    go('/dashboard');
  }
}

function setNotice(state: AppState, kind: 'info' | 'error', message: string): void {
  state.notice = { kind, message };
}

function clearNotice(state: AppState): void {
  state.notice = null;
}

function renderNav(state: AppState): string {
  if (!state.session) {
    return `
      <header class="topbar">
        <div class="brand">Team Task Manager</div>
        <nav class="nav">
          <a href="#/login">Login</a>
          <a href="#/signup">Signup</a>
        </nav>
      </header>
    `;
  }

  const role = state.session.user.role;
  return `
    <header class="topbar">
      <div class="brand">Team Task Manager</div>
      <nav class="nav">
        <a href="#/dashboard">Dashboard</a>
        <a href="#/projects">Projects</a>
        ${role === 'admin' ? '<a href="#/users">Users</a>' : ''}
      </nav>
      <div class="nav-right">
        <span class="chip">${escapeHtml(state.session.user.name)} (${role})</span>
        <button class="btn" data-action="logout">Logout</button>
      </div>
    </header>
  `;
}

function renderNotice(state: AppState): string {
  if (!state.notice) return '';
  const klass = state.notice.kind === 'error' ? 'notice error' : 'notice info';
  return `<div class="${klass}"><span>${escapeHtml(state.notice.message)}</span><button class="btn btn-link" data-action="dismiss-notice">Dismiss</button></div>`;
}

function renderLogin(): string {
  return `
    <section class="page">
      <h1>Login</h1>
      <div class="card">
        <form data-form="login">
          <div class="form-grid">
            <label>
              <span>Email</span>
              <input name="email" type="email" required autocomplete="email" />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" required autocomplete="current-password" minlength="6" />
            </label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Login</button>
            <a class="btn btn-link" href="#/signup">Create an account</a>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderSignup(): string {
  return `
    <section class="page">
      <h1>Signup</h1>
      <div class="card">
        <form data-form="signup">
          <div class="form-grid">
            <label>
              <span>Name</span>
              <input name="name" type="text" required minlength="2" maxlength="50" />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" required autocomplete="email" />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" required minlength="6" autocomplete="new-password" />
            </label>
          </div>
          <p class="hint">The first account created becomes <b>admin</b> automatically.</p>
          <div class="actions">
            <button class="btn btn-primary" type="submit">Create account</button>
            <a class="btn btn-link" href="#/login">Back to login</a>
          </div>
        </form>
      </div>
    </section>
  `;
}

function statCard(label: string, value: number): string {
  return `<div class="card stat"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${value}</div></div>`;
}

function renderDashboard(state: AppState): string {
  const d = state.dashboard;
  if (!d) {
    return `
      <section class="page">
        <h1>Dashboard</h1>
        <div class="card">Loading…</div>
      </section>
    `;
  }

  const stats = d.stats;
  const recent = d.recentTasks;
  const recentRows = recent
    .map((t) => {
      const projectTitle = typeof t.project === 'string' ? '—' : t.project.title;
      const assigned = t.assignedTo ? `${t.assignedTo.name}` : 'Unassigned';
      const overdue = t.isOverdue ? 'overdue' : '';
      return `
        <tr class="${overdue}">
          <td>${escapeHtml(t.title)}</td>
          <td>${escapeHtml(projectTitle)}</td>
          <td>${escapeHtml(t.status)}</td>
          <td>${escapeHtml(assigned)}</td>
          <td>${escapeHtml(formatDate(t.dueDate))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="page">
      <div class="page-head">
        <h1>Dashboard</h1>
        <button class="btn" data-action="refresh-dashboard">Refresh</button>
      </div>

      <div class="grid stats">
        ${statCard('Total Tasks', stats.totalTasks)}
        ${statCard('Completed', stats.completedTasks)}
        ${statCard('Pending', stats.pendingTasks)}
        ${statCard('Overdue', stats.overdueTasks)}
        ${statCard('Projects', stats.totalProjects)}
        ${isAdmin(state) ? statCard('Users', stats.totalUsers || 0) : ''}
      </div>

      <div class="card">
        <h2>Recent Tasks</h2>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Title</th><th>Project</th><th>Status</th><th>Assigned</th><th>Due</th></tr>
            </thead>
            <tbody>
              ${recentRows || '<tr><td colspan="5">No tasks yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderProjects(state: AppState): string {
  const projects = state.projects;
  const canCreate = isAdmin(state);

  const list = (projects || [])
    .map((p) => {
      const members = p.members?.length ?? 0;
      return `
        <div class="card project">
          <div class="project-title">${escapeHtml(p.title)}</div>
          <div class="muted">${escapeHtml(p.status)} • ${members} member(s)</div>
          <div class="actions">
            <a class="btn" href="#/project/${p._id}">Open</a>
          </div>
        </div>
      `;
    })
    .join('');

  const userOptions = (state.users || [])
    .map((u) => `<option value="${u._id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`)
    .join('');

  return `
    <section class="page">
      <div class="page-head">
        <h1>Projects</h1>
        <button class="btn" data-action="refresh-projects">Refresh</button>
      </div>

      ${
        canCreate
          ? `
          <div class="card">
            <h2>Create Project</h2>
            <form data-form="create-project">
              <div class="form-grid">
                <label>
                  <span>Title</span>
                  <input name="title" required minlength="2" maxlength="100" />
                </label>
                <label>
                  <span>Description</span>
                  <textarea name="description" rows="3" maxlength="500"></textarea>
                </label>
                <label>
                  <span>Color</span>
                  <input name="color" placeholder="#7c3aed" />
                </label>
                <label>
                  <span>Add members (optional)</span>
                  <select name="memberIds" multiple size="5">${userOptions}</select>
                </label>
              </div>
              <div class="actions">
                <button class="btn btn-primary" type="submit">Create</button>
              </div>
            </form>
          </div>
        `
          : ''
      }

      <div class="grid projects">
        ${projects ? list || '<div class="card">No projects yet</div>' : '<div class="card">Loading…</div>'}
      </div>
    </section>
  `;
}

function renderProjectDetail(state: AppState): string {
  const detail = state.projectDetail;
  if (!detail) {
    return `
      <section class="page">
        <div class="page-head">
          <h1>Project</h1>
          <a class="btn" href="#/projects">Back</a>
        </div>
        <div class="card">Loading…</div>
      </section>
    `;
  }

  const p = detail.project;
  const tasks = detail.tasks;
  const admin = isAdmin(state);

  const members = (p.members || [])
    .map((m) => {
      const isOwner = p.owner?._id === m._id;
      return `
        <li class="member">
          <span>${escapeHtml(m.name)} <span class="muted">(${escapeHtml(m.email)})</span></span>
          <span class="muted">${escapeHtml(m.role)}</span>
          ${
            admin && !isOwner
              ? `<button class="btn" data-action="remove-member" data-user-id="${m._id}">Remove</button>`
              : isOwner
                ? '<span class="chip">Owner</span>'
                : ''
          }
        </li>
      `;
    })
    .join('');

  const memberIds = new Set((p.members || []).map((m) => m._id));
  const availableUserOptions = (state.users || [])
    .filter((u) => !memberIds.has(u._id))
    .map((u) => `<option value="${u._id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`)
    .join('');

  const buildAssigneeOptions = (selectedUserId: string | null | undefined) =>
    (p.members || [])
      .map(
        (u) =>
          `<option value="${u._id}" ${selectedUserId === u._id ? 'selected' : ''}>${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`
      )
      .join('');

  const taskRows = tasks
    .map((t) => {
      const assignedToId = t.assignedTo?._id || '';
      const assignedToLabel = t.assignedTo ? `${t.assignedTo.name}` : 'Unassigned';
      const canMemberEdit = !admin && t.assignedTo?._id === state.session?.user._id;

      return `
        <tr class="${t.isOverdue ? 'overdue' : ''}">
          <td>${escapeHtml(t.title)}</td>
          <td>${escapeHtml(t.status)}</td>
          <td>${escapeHtml(t.priority)}</td>
          <td>${escapeHtml(assignedToLabel)}</td>
          <td>${escapeHtml(formatDate(t.dueDate))}</td>
          <td class="actions-cell">
            ${
              admin
                ? `
                  <button class="btn" data-action="edit-task" data-task-id="${t._id}">Edit</button>
                  <button class="btn" data-action="delete-task" data-task-id="${t._id}">Delete</button>
                `
                : canMemberEdit
                  ? `<button class="btn" data-action="edit-task" data-task-id="${t._id}">Update status</button>`
                  : ''
            }
          </td>
        </tr>
        <tr class="task-editor" data-editor-for="${t._id}" hidden>
          <td colspan="6">
            <form data-form="update-task" data-task-id="${t._id}">
              <div class="form-grid">
                ${
                  admin
                    ? `
                      <label><span>Title</span><input name="title" value="${escapeHtml(t.title)}" /></label>
                      <label><span>Description</span><textarea name="description" rows="2">${escapeHtml(t.description || '')}</textarea></label>
                      <label>
                        <span>Status</span>
                        <select name="status">
                          <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
                          <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                          <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                      </label>
                      <label>
                        <span>Priority</span>
                        <select name="priority">
                          <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Low</option>
                          <option value="medium" ${t.priority === 'medium' ? 'selected' : ''}>Medium</option>
                          <option value="high" ${t.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                      </label>
                      <label><span>Due date</span><input name="dueDate" type="date" value="${escapeHtml(toDateInputValue(t.dueDate))}" /></label>
                      <label>
                        <span>Assigned to</span>
                        <select name="assignedTo">
                          <option value="">Unassigned</option>
                          ${buildAssigneeOptions(assignedToId || null)}
                        </select>
                      </label>
                    `
                    : `
                      <label>
                        <span>Status</span>
                        <select name="status">
                          <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
                          <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                          <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                      </label>
                    `
                }
              </div>
              <div class="actions">
                <button class="btn btn-primary" type="submit">Save</button>
                <button class="btn" type="button" data-action="cancel-edit-task" data-task-id="${t._id}">Cancel</button>
              </div>
            </form>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="page" data-project-id="${p._id}">
      <div class="page-head">
        <div>
          <h1>${escapeHtml(p.title)}</h1>
          <div class="muted">${escapeHtml(p.status)} • Owner: ${escapeHtml(p.owner?.name || '—')}</div>
        </div>
        <div class="actions">
          <a class="btn" href="#/projects">Back</a>
          <button class="btn" data-action="refresh-project" data-project-id="${p._id}">Refresh</button>
          ${admin ? `<button class="btn" data-action="delete-project" data-project-id="${p._id}">Delete</button>` : ''}
        </div>
      </div>

      <div class="grid two">
        <div class="card">
          <h2>Details</h2>
          ${
            admin
              ? `
              <form data-form="update-project" data-project-id="${p._id}">
                <div class="form-grid">
                  <label><span>Title</span><input name="title" value="${escapeHtml(p.title)}" /></label>
                  <label><span>Description</span><textarea name="description" rows="3">${escapeHtml(p.description || '')}</textarea></label>
                  <label><span>Color</span><input name="color" value="${escapeHtml(p.color || '')}" /></label>
                  <label>
                    <span>Status</span>
                    <select name="status">
                      <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                      <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Completed</option>
                      <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
                    </select>
                  </label>
                </div>
                <div class="actions"><button class="btn btn-primary" type="submit">Save</button></div>
              </form>
            `
              : `
              <p class="muted">${escapeHtml(p.description || 'No description')}</p>
            `
          }
        </div>

        <div class="card">
          <h2>Members</h2>
          <ul class="members">${members || '<li class="muted">No members</li>'}</ul>
          ${
            admin
              ? `
              <form data-form="add-member" data-project-id="${p._id}">
                <div class="actions">
                  <select name="userId" required>
                    <option value="">Select a user…</option>
                    ${availableUserOptions}
                  </select>
                  <button class="btn btn-primary" type="submit">Add</button>
                </div>
              </form>
            `
              : ''
          }
        </div>
      </div>

      <div class="card">
        <div class="page-head">
          <h2>Tasks</h2>
          ${admin ? '<span class="muted">Admin can create/edit/delete tasks</span>' : '<span class="muted">Members can update assigned tasks</span>'}
        </div>

        ${
          admin
            ? `
            <form data-form="create-task" data-project-id="${p._id}">
              <div class="form-grid">
                <label><span>Title</span><input name="title" required minlength="2" maxlength="150" /></label>
                <label><span>Description</span><textarea name="description" rows="2" maxlength="1000"></textarea></label>
                <label>
                  <span>Status</span>
                  <select name="status">
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label>
                  <span>Priority</span>
                  <select name="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label><span>Due date</span><input name="dueDate" type="date" /></label>
                <label>
                  <span>Assign to</span>
                  <select name="assignedTo">
                    <option value="">Unassigned</option>
                    ${buildAssigneeOptions(null)}
                  </select>
                </label>
              </div>
              <div class="actions"><button class="btn btn-primary" type="submit">Create Task</button></div>
            </form>
          `
            : ''
        }

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Due</th><th></th></tr>
            </thead>
            <tbody>
              ${taskRows || '<tr><td colspan="6">No tasks yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderUsers(state: AppState): string {
  const users = state.users;
  return `
    <section class="page">
      <div class="page-head">
        <h1>Users</h1>
        <button class="btn" data-action="refresh-users">Refresh</button>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              ${
                users
                  ? users
                      .map((u) => {
                        const isSelf = u._id === state.session?.user._id;
                        return `
                          <tr>
                            <td>${escapeHtml(u.name)}</td>
                            <td>${escapeHtml(u.email)}</td>
                            <td>
                              <select data-action="set-role" data-user-id="${u._id}" ${isSelf ? 'disabled' : ''}>
                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                                <option value="member" ${u.role === 'member' ? 'selected' : ''}>member</option>
                              </select>
                            </td>
                            <td>
                              ${isSelf ? '<span class="muted">(you)</span>' : `<button class="btn" data-action="delete-user" data-user-id="${u._id}">Delete</button>`}
                            </td>
                          </tr>
                        `;
                      })
                      .join('')
                  : '<tr><td colspan="4">Loading…</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function render(state: AppState, root: HTMLElement): void {
  let view = '';
  switch (state.route.name) {
    case 'login':
      view = renderLogin();
      break;
    case 'signup':
      view = renderSignup();
      break;
    case 'dashboard':
      view = renderDashboard(state);
      break;
    case 'projects':
      view = renderProjects(state);
      break;
    case 'project':
      view = renderProjectDetail(state);
      break;
    case 'users':
      view = renderUsers(state);
      break;
  }

  root.innerHTML = `
    ${renderNav(state)}
    ${renderNotice(state)}
    <main class="content">
      ${state.loading ? '<div class="loading">Loading…</div>' : ''}
      ${view}
    </main>
  `;
}

async function syncForRoute(state: AppState): Promise<void> {
  clearNotice(state);

  if (!state.session) {
    if (state.route.name !== 'login' && state.route.name !== 'signup') {
      go('/login');
    }
    return;
  }

  // Ensure token header is set
  setAuthToken(state.session.token);

  if (state.route.name === 'users') {
    requireAdminOrRedirect(state);
    if (!isAdmin(state)) return;
  }

  try {
    state.loading = true;

    if (state.route.name === 'dashboard') {
      state.dashboard = await DashboardApi.get();
    }

    if (state.route.name === 'projects') {
      // Admin needs users list for create-project member selection
      if (isAdmin(state) && !state.users) {
        state.users = (await UsersApi.list()).users;
      }
      state.projects = (await ProjectsApi.list()).projects;
    }

    if (state.route.name === 'project') {
      if (isAdmin(state) && !state.users) {
        state.users = (await UsersApi.list()).users;
      }
      state.projectDetail = await ProjectsApi.get(state.route.id);
    }

    if (state.route.name === 'users') {
      state.users = (await UsersApi.list()).users;
    }
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Request failed';
    setNotice(state, 'error', message);
  } finally {
    state.loading = false;
  }
}

function toggleTaskEditor(taskId: string, show: boolean): void {
  const row = document.querySelector<HTMLTableRowElement>(`tr[data-editor-for="${CSS.escape(taskId)}"]`);
  if (!row) return;
  row.hidden = !show;
}

export function startApp(root: HTMLElement): void {
  const state: AppState = {
    session: loadSession(),
    route: parseRoute(),
    notice: null,

    dashboard: null,
    projects: null,
    projectDetail: null,
    users: null,

    loading: false,
  };

  if (state.session) {
    setAuthToken(state.session.token);
  }

  const rerender = () => render(state, root);

  window.addEventListener('hashchange', async () => {
    state.route = parseRoute();
    if (state.session) requireAuthOrRedirect(state);
    await syncForRoute(state);
    rerender();
  });

  root.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const actionEl = target.closest<HTMLElement>('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    try {
      if (action === 'logout') {
        clearSession();
        state.session = null;
        setAuthToken(null);
        state.dashboard = null;
        state.projects = null;
        state.projectDetail = null;
        state.users = null;
        go('/login');
        return;
      }

      if (action === 'dismiss-notice') {
        clearNotice(state);
        rerender();
        return;
      }

      if (action === 'refresh-dashboard') {
        requireAuthOrRedirect(state);
        state.dashboard = await DashboardApi.get();
        rerender();
        return;
      }

      if (action === 'refresh-projects') {
        requireAuthOrRedirect(state);
        state.projects = (await ProjectsApi.list()).projects;
        rerender();
        return;
      }

      if (action === 'refresh-project') {
        requireAuthOrRedirect(state);
        const projectId = actionEl.dataset.projectId;
        if (!projectId) return;
        state.projectDetail = await ProjectsApi.get(projectId);
        rerender();
        return;
      }

      if (action === 'delete-project') {
        requireAuthOrRedirect(state);
        const projectId = actionEl.dataset.projectId;
        if (!projectId) return;
        if (!confirm('Delete this project and all tasks?')) return;
        await ProjectsApi.remove(projectId);
        state.projectDetail = null;
        go('/projects');
        return;
      }

      if (action === 'remove-member') {
        requireAuthOrRedirect(state);
        const projectId = document.querySelector<HTMLElement>('[data-project-id]')?.dataset.projectId;
        const userId = actionEl.dataset.userId;
        if (!projectId || !userId) return;
        await ProjectsApi.removeMember(projectId, userId);
        state.projectDetail = await ProjectsApi.get(projectId);
        rerender();
        return;
      }

      if (action === 'edit-task') {
        const taskId = actionEl.dataset.taskId;
        if (!taskId) return;
        toggleTaskEditor(taskId, true);
        return;
      }

      if (action === 'cancel-edit-task') {
        const taskId = actionEl.dataset.taskId;
        if (!taskId) return;
        toggleTaskEditor(taskId, false);
        return;
      }

      if (action === 'delete-task') {
        requireAuthOrRedirect(state);
        const taskId = actionEl.dataset.taskId;
        const projectId = document.querySelector<HTMLElement>('[data-project-id]')?.dataset.projectId;
        if (!taskId || !projectId) return;
        if (!confirm('Delete this task?')) return;
        await TasksApi.remove(taskId);
        state.projectDetail = await ProjectsApi.get(projectId);
        rerender();
        return;
      }

      if (action === 'refresh-users') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        state.users = (await UsersApi.list()).users;
        rerender();
        return;
      }

      if (action === 'delete-user') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        const userId = actionEl.dataset.userId;
        if (!userId) return;
        if (!confirm('Delete this user?')) return;
        await UsersApi.remove(userId);
        state.users = (await UsersApi.list()).users;
        rerender();
        return;
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Request failed';
      setNotice(state, 'error', message);
      rerender();
    }
  });

  root.addEventListener('change', async (e) => {
    const target = e.target as HTMLElement;
    const actionEl = target.closest<HTMLElement>('[data-action="set-role"]');
    if (!actionEl) return;

    try {
      requireAuthOrRedirect(state);
      requireAdminOrRedirect(state);
      const userId = actionEl.dataset.userId;
      const value = (target as HTMLSelectElement).value as User['role'];
      if (!userId) return;
      await UsersApi.update(userId, { role: value });
      state.users = (await UsersApi.list()).users;
      rerender();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Request failed';
      setNotice(state, 'error', message);
      rerender();
    }
  });

  root.addEventListener('submit', async (e) => {
    const form = e.target as HTMLFormElement;
    const formName = form.dataset.form;
    if (!formName) return;

    e.preventDefault();

    try {
      if (formName === 'login') {
        const fd = new FormData(form);
        const email = String(fd.get('email') || '');
        const password = String(fd.get('password') || '');
        const { token, user } = await AuthApi.login({ email, password });
        state.session = { token, user };
        saveSession(state.session);
        setAuthToken(token);
        go('/dashboard');
        return;
      }

      if (formName === 'signup') {
        const fd = new FormData(form);
        const name = String(fd.get('name') || '');
        const email = String(fd.get('email') || '');
        const password = String(fd.get('password') || '');
        const { token, user } = await AuthApi.signup({ name, email, password });
        state.session = { token, user };
        saveSession(state.session);
        setAuthToken(token);
        go('/dashboard');
        return;
      }

      if (formName === 'create-project') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        const fd = new FormData(form);
        const title = String(fd.get('title') || '');
        const description = String(fd.get('description') || '');
        const color = String(fd.get('color') || '');
        const memberIds = fd.getAll('memberIds').map((v) => String(v));
        await ProjectsApi.create({
          title,
          description: description || undefined,
          color: color || undefined,
          memberIds: memberIds.length ? memberIds : undefined,
        });
        state.projects = (await ProjectsApi.list()).projects;
        setNotice(state, 'info', 'Project created');
        rerender();
        form.reset();
        return;
      }

      if (formName === 'update-project') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        const projectId = form.dataset.projectId;
        if (!projectId) return;
        const fd = new FormData(form);
        const payload = {
          title: String(fd.get('title') || ''),
          description: String(fd.get('description') || ''),
          color: String(fd.get('color') || ''),
          status: String(fd.get('status') || ''),
        } as any;
        await ProjectsApi.update(projectId, payload);
        state.projectDetail = await ProjectsApi.get(projectId);
        setNotice(state, 'info', 'Project updated');
        rerender();
        return;
      }

      if (formName === 'add-member') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        const projectId = form.dataset.projectId;
        if (!projectId) return;
        const fd = new FormData(form);
        const userId = String(fd.get('userId') || '');
        await ProjectsApi.addMember(projectId, userId);
        state.projectDetail = await ProjectsApi.get(projectId);
        rerender();
        return;
      }

      if (formName === 'create-task') {
        requireAuthOrRedirect(state);
        requireAdminOrRedirect(state);
        const projectId = form.dataset.projectId;
        if (!projectId) return;
        const fd = new FormData(form);
        const title = String(fd.get('title') || '');
        const description = String(fd.get('description') || '');
        const status = String(fd.get('status') || 'pending') as Task['status'];
        const priority = String(fd.get('priority') || 'medium') as Task['priority'];
        const dueDate = String(fd.get('dueDate') || '');
        const assignedTo = String(fd.get('assignedTo') || '');

        await TasksApi.create({
          title,
          description: description || undefined,
          projectId,
          status,
          priority,
          dueDate: dueDate ? dueDate : null,
          assignedTo: assignedTo ? assignedTo : null,
        });

        state.projectDetail = await ProjectsApi.get(projectId);
        setNotice(state, 'info', 'Task created');
        rerender();
        form.reset();
        return;
      }

      if (formName === 'update-task') {
        requireAuthOrRedirect(state);
        const taskId = form.dataset.taskId;
        const projectId = document.querySelector<HTMLElement>('[data-project-id]')?.dataset.projectId;
        if (!taskId || !projectId) return;

        const fd = new FormData(form);
        const payload: any = {
          status: String(fd.get('status') || ''),
        };

        if (isAdmin(state)) {
          payload.title = String(fd.get('title') || '');
          payload.description = String(fd.get('description') || '');
          payload.priority = String(fd.get('priority') || 'medium');
          const dueDate = String(fd.get('dueDate') || '');
          payload.dueDate = dueDate ? dueDate : null;
          const assignedTo = String(fd.get('assignedTo') || '');
          payload.assignedTo = assignedTo ? assignedTo : null;
        }

        await TasksApi.update(taskId, payload);
        state.projectDetail = await ProjectsApi.get(projectId);
        toggleTaskEditor(taskId, false);
        setNotice(state, 'info', 'Task updated');
        rerender();
        return;
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Request failed';
      setNotice(state, 'error', message);
      rerender();
    }
  });

  // Initial route normalization
  state.route = parseRoute();
  if (!state.session && (state.route.name === 'dashboard' || state.route.name === 'projects' || state.route.name === 'project' || state.route.name === 'users')) {
    go('/login');
  }

  (async () => {
    await syncForRoute(state);
    rerender();
  })();
}
