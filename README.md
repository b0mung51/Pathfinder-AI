# Pathfinder AI – Supabase + Django + React

Full-stack starter that pairs a Django REST API with a Vite/React frontend. Auth and primary data storage are handled by Supabase (Google OAuth enabled), while Django is ready for additional APIs or privileged workflows.

---

## Stack Overview
- **Frontend:** Vite + React 18 + Tailwind (Lovable template)  
- **State/Data:** TanStack Query, Supabase JS client  
- **Auth:** Supabase (email/password + Google OAuth)  
- **Backend:** Django 5 + Django REST Framework + CORS headers  
- **Tooling:** TypeScript, ESLint, ShadCN UI components

---

## 1. Supabase Setup
1. Create a Supabase project (already done) and enable the **Google** OAuth provider (Auth → Providers → Google).  
2. Run the SQL in [`supabase/initial-setup.sql`](supabase/initial-setup.sql) from the Supabase SQL editor to create the `profiles` table, enable row-level security, and auto-seed profiles when new users sign up.  
3. Grab your project URL and anon key (you already shared them) – these power the frontend.

---

## 2. Frontend (React)
```powershell
cd frontend
copy .env.example .env   # already filled with Supabase URL + anon key
npm install --no-audit --no-fund --loglevel=info
npm run dev
```
The SPA now uses Supabase for:
- Email/password sign up & sign in
- Google OAuth sign-in (redirect handled by Supabase)
- Persisted profiles (`profiles` table) keyed to the authenticated user

Key files:
- `src/lib/supabaseClient.ts` – shared Supabase client
- `src/context/AuthContext.tsx` – wraps the app with session state + auth helpers
- `src/pages/Auth.tsx` – auth UI wired to Supabase (email/password + Google)
- `src/components/Navbar.tsx` – reflects auth state (sign in/out buttons)

Environment variables (already present in `.env.example`):
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

---

## 3. Backend (Django API)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # tweak values as needed
python manage.py migrate
python manage.py runserver
```
Default settings give you:
- `/api/health/` – simple JSON healthcheck
- `/api/placeholders/` – example DRF ViewSet
- `/` – friendly landing page letting you know the API is running

_Supabase service-role integration is optional and not yet configured. If you later want Django to call Supabase with elevated privileges (e.g., scheduled jobs), add the service key to `backend/.env` and use the Supabase REST API or a Python client._

Environment variables (`backend/.env.example`):
```
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DJANGO_CORS_ALLOW_ALL=1
```

---

## 4. Extending Auth & Data
- **Profiles:** After sign-up, the frontend upserts into `profiles` so you can store user metadata (`full_name`, avatar, etc.). Expand this table or add more tables (e.g., `questionnaires`, `college_lists`) and create RLS policies following the pattern in `initial-setup.sql`.
- **Protected routes:** Use the `useAuth` hook anywhere to read `user`, `session`, and helper functions. Gate pages or fetch user-specific data via Supabase queries or your Django API.
- **Google OAuth:** Supabase handles redirect-based OAuth. After signing in with Google, the frontend session updates automatically via the auth listener in `AuthContext`.

---

## 5. Useful Scripts & Commands
| Purpose | Command |
| --- | --- |
| Install frontend deps | `npm install --no-audit --no-fund --loglevel=info` |
| Run frontend dev server | `npm run dev` |
| Build production bundle | `npm run build` |
| Create backend venv | `python -m venv .venv` |
| Install backend deps | `pip install -r requirements.txt` |
| Apply migrations | `python manage.py migrate` |
| Start Django dev server | `python manage.py runserver` |
| Seed Supabase tables | Execute [`supabase/initial-setup.sql`](supabase/initial-setup.sql) in Supabase |

---

## 6. Next Steps / Suggestions
1. **Hook up questionnaire & dashboard pages** – fetch Supabase data or call Django endpoints protected by Supabase auth (e.g., pass the access token to Django for verification if you later wire the backend to Supabase).  
2. **Add Supabase storage or edge functions** for file uploads or serverless AI workflows.  
3. **Introduce backend Supabase access** only if you need privileged tasks (cron jobs, admin panels).  
4. **Tighten policies and email templates** in Supabase as you move toward production.

Enjoy building with the new Supabase stack! If you need Docker, CI, or backend Supabase helpers later, just shout.  
