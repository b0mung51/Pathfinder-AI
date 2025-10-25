
=======
# Project skeleton: React frontend + Django backend + Firebase Auth

This repository contains a skeleton to get a React (Vite) frontend and a Django REST backend running with Firebase Authentication integration. It is intentionally minimal so you can complete credentials and environment-specific items locally.

Overview
- frontend/: Vite + React app with Firebase client auth example (Google sign-in popup) and placeholder for config.
- backend/: Django + Django REST Framework API that verifies Firebase ID tokens using firebase-admin.

Quick steps (Windows PowerShell)

1) Frontend
- cd frontend
- npm install
- create a `.env` file by copying `.env.example` and filling VITE_FIREBASE_* values
- npm run dev

2) Backend
- cd backend
- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- pip install -r requirements.txt
- create a Firebase service account JSON and set environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` to its path (or set `FIREBASE_PROJECT_ID` + other vars as needed)
- python manage.py migrate
- python manage.py runserver 8000

Firebase notes
- The frontend uses Firebase Web SDK (v9 modular) to sign-in and receives an ID token.
- The backend uses `firebase-admin` to verify ID tokens. Provide a service account JSON and set `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable to the JSON file path.

Files added
- frontend/: Vite + React starter files
- backend/: Django project with an `api` app and a protected example endpoint
- .env.example files for frontend and backend

If you want, I can now:
- Run quick verification steps (install packages) locally if you want me to try to run the servers here.
- Add Dockerfiles / docker-compose for easier local orchestration.
"# Pathfinder-AI" 
>>>>>>> e87d14b (first commit)
