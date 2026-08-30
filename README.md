# NOTIVA

NOTIVA is a full-stack, professional academic note-taking and study management application.

## Project Architecture

```
notiva/
├── notiva_backend/    # Django + Django REST Framework backend
└── notiva_frontend/   # React + Vite frontend
```

## Technologies Used
- **Backend:** Django, Django REST Framework, SimpleJWT, SQLite (Dev)
- **Frontend:** React, Vite, React Router, TanStack Query, Axios, Lucide React

## Local Development Setup

### 1. Backend Setup
```bash
cd notiva_backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

*(Create a `.env` file in `notiva_backend` based on `.env.example` if needed for CORS/ALLOWED_HOSTS customization)*

### 2. Frontend Setup
```bash
cd notiva_frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxy API requests to `http://localhost:8000` during development.

## Testing
Run backend regression tests:
```bash
cd notiva_backend
python manage.py test accounts academics notes.tests notes.tests_phase4 collaboration dashboard study
```

## Deployment

### Frontend (GitHub Pages)
The frontend is configured to be hosted statically on GitHub Pages.
A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included to automatically build and deploy the React app to GitHub Pages whenever changes are pushed to the `main` branch.

**Required GitHub Repository Settings for Frontend:**
1. Go to **Settings > Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Under **Settings > Secrets and variables > Actions**, create a Repository Secret named `VITE_API_URL` containing your production backend URL (e.g., `https://your-backend-app.onrender.com/api/v1`).

### Backend
The Django backend must be hosted on a platform capable of running Python applications (e.g., Render, Railway, Heroku). 
GitHub Pages **cannot** host the Django backend.

**Required Environment Variables for Backend:**
- `SECRET_KEY`: A strong secret key for Django.
- `DEBUG`: Set to `False` in production.
- `ALLOWED_HOSTS`: Your backend domain (e.g., `your-backend-app.onrender.com`).
- `CORS_ALLOWED_ORIGINS`: Your GitHub Pages URL (e.g., `https://<USERNAME>.github.io`).

Once the backend is deployed, update the `VITE_API_URL` secret in GitHub so the frontend knows where to send API requests.
