# Pathfinder AI – Supabase + Django + React

This repository provides an integrated full-stack implementation combining a Django REST API with a React frontend. Authentication and data management are handled via Supabase.

## System Architecture Overview
- Frontend: React 18 (Vite build system, styled with Tailwind CSS) 
- State/Data: TanStack Query, Supabase JS client  
- Auth: Supabase (email/password + Google OAuth)  
- Backend: Django 5 + Django REST Framework + CORS headers  
- Tooling: TypeScript, ESLint, ShadCN UI components


## Development Environment
- Python 3.11+
- Node.js 20+
- PostgreSQL (managed via Supabase)
Ensure both frontend and backend `.env` files are configured before running the application.
---

## 1. Supabase Setup
1. Create a Supabase project and enable the **Google** OAuth provider (Auth ->      Providers -> Google).  
2. Run the SQL in [`supabase/initial-setup.sql`](supabase/initial-setup.sql) from the Supabase SQL editor to create the `profiles` table, enable row-level security, and auto-seed profiles when new users sign up.  
3. Record the project URL and anonymous API key for use in frontend and backend environment variables.
4. Do not commit keys or credentials to source control. Store them in your environment manager

---

## 2. Frontend (React)
```powershell
cd frontend
npm install
npm run dev
```
The frontend relies on Supabase for user authentication and profile persistence:
- Email/password sign up & sign in
- Google OAuth sign-in (redirect handled by Supabase)
- Persisted profiles (`profiles` table) keyed to the authenticated user

Key Modules:
- `src/lib/supabaseClient.ts` – shared Supabase client
- `src/context/AuthContext.tsx` – wraps the app with session state + auth helpers
- `src/pages/Auth.tsx` – auth UI wired to Supabase (email/password + Google)
- `src/components/Navbar.tsx` – reflects auth state (sign in/out buttons)

Environment variables:
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

---

## 3. Backend
```powershell
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Default settings give:
- `/api/health/` – simple JSON healthcheck
- `/api/placeholders/` – example DRF ViewSet
- `/` – landing page to show the API is running

Environment variables (`backend/.env.example`):
```
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DJANGO_CORS_ALLOW_ALL=1
```

---

## 4. Authentication and Data Model Extensions
- **Profiles:** During user registration, the frontend automatically synchronizes user metadata to the `profiles` table via Supabase
- **Protected routes:** Use the `useAuth` hook anywhere to read `user`, `session`, and helper functions. Gate pages or fetch user-specific data via Supabase queries or Django.
- **Google OAuth:** Google OAuth is managed through Supabase’s redirect-based authentication flow, with session updates propagated through the frontend’s auth listener.

---

## 5. Command Reference
| Command | Example |
| --- | --- |
| Install frontend deps | `npm install` |
| Run frontend dev server | `npm run dev` |
| Build production bundle | `npm run build` |
| Create backend venv | `python -m venv .venv` |
| Install backend deps | `pip install -r requirements.txt` |
| Apply migrations | `python manage.py migrate` |
| Start Django dev server | `python manage.py runserver` |
| Seed Supabase tables | Execute [`supabase/initial-setup.sql`](supabase/initial-setup.sql) in Supabase |

---
