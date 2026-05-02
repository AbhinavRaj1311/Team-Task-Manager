# Team Task Manager

Full-stack Team Task Manager (client–server) with JWT auth + RBAC (Admin/Member).

## Local development

### 1) Backend

```bash
cd backend
npm install
# create backend/.env from backend/.env.example
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
npm install
# create frontend/.env from frontend/.env.example
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Roles

- The **first** user to sign up becomes **admin** automatically.
- All later signups become **member**.

### Default admin (optional seed)

If you want a ready-made admin account without signing up first, enable seeding in `backend/.env`:

- `SEED_DEFAULT_ADMIN=true`
- `DEFAULT_ADMIN_EMAIL=admin@local.test`
- `DEFAULT_ADMIN_PASSWORD=Admin@12345`

If `admin@local.test` already exists, enabling the seed can also reset the password:

- In development: password reset happens automatically when seeding is enabled.
- In production: set `DEFAULT_ADMIN_RESET_PASSWORD=true` to allow password reset.

On server start (after MongoDB connects), the backend will create (or ensure) this admin.

## API (base: /api)

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/projects`
- `POST /api/projects` (admin)
- `POST /api/tasks` (admin)
- `PUT /api/tasks/:id` (admin or assigned member)
- `DELETE /api/tasks/:id` (admin)

For spec compatibility, the server also exposes the same routes **without** the `/api` prefix.

## Railway deployment (mandatory)

Railway works best with **two services** (one for backend, one for frontend) and one MongoDB database.

### Backend service

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm run start`
- Variables:
  - `MONGODB_URI` = your Railway Mongo connection string
  - `JWT_SECRET` = a long random string
  - `CLIENT_URL` = your deployed frontend URL (e.g. `https://<frontend>.up.railway.app`)

### Frontend service

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Variables:
  - `VITE_API_URL` = your deployed backend URL (e.g. `https://<backend>.up.railway.app`)

After deploy:
- Visit the frontend URL and sign up (first signup becomes admin).
- Use Dashboard → Projects to create projects and tasks.
