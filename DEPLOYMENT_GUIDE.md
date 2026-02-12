# JeevanRakshak Global Deployment & CI/CD Guide 🚀

This comprehensive guide covers the **Deployment** of all components and the automated **CI/CD Pipeline** established for the global launch.

---

## 🔄 CI/CD Pipeline (GitHub Actions)

We have implemented a robust **Continuous Integration/Continuous Deployment** pipeline using GitHub Actions to ensure 100% stability.

### Workflow: `Global Launch CI`
file: `.github/workflows/global-launch-ci.yml`

**What it does:**
Every time you push code to `main` or open a Pull Request, the following checks run in parallel:
1.  **🏗️ Frontend Build**: Installs dependencies and runs `vite build` to ensure the React app compiles without errors.
2.  **🛡️ Backend Integrity**: Installs Node.js dependencies and runs smoke tests to ensure the server starts.
3.  **🧠 ML Service Check**: Sets up Python 3.12, installs requirements, and verifies syntax integrity.

**Auto-Deployment Hooks:**
- **Render (Backend & ML)**: Automatically deploys the new version ONLY if you push to the linked branch (e.g., `main`).
- **Vercel (Frontend)**: Automatically triggers a new deployment preview or production build upon push.

---

## 🛠️ Manual Deployment Setup

If you haven't connected the services yet, follow these steps:

### 1. Render (Backend + ML)
1.  **Dashboard**: Go to [dashboard.render.com](https://dashboard.render.com/).
2.  **Blueprints**: Click **New +** -> **Blueprint**.
3.  **Repository**: Connect `Divyansh8843/JeevanRakshak`.
4.  **Configuration**: It will read `render.yaml` from the root.
    - **Service 1**: `jeevan-rakshak-backend` (Node.js)
    - **Service 2**: `jeevan-rakshak-ml` (Python)
5.  **Environment Variables**:
    - Add real secrets (MONGO_URI, GOOGLE_CLIENT_ID, etc.) in the Render Dashboard for the backend service.
    - **CRITICAL**: Ensure `CLIENT_ORIGIN` matches your final Vercel URL (e.g., `https://jeevan-rakshak.vercel.app`).
    - **CRITICAL**: Ensure `RISK_SERVICE_URL` is set to `http://jeevan-rakshak-ml:10000` in the *Backend* service environment.

### 2. Vercel (Frontend)
1.  **Dashboard**: Go to [vercel.com](https://vercel.com/new).
2.  **Import**: Select `JeevanRakshak`.
3.  **Root Directory**: Edit and select `client`.
4.  **Environment Variables**:
    - `VITE_SERVER_URL`: Your Render Backend URL (e.g., `https://jeevan-rakshak-backend.onrender.com`).
5.  **Deploy**: Click **Deploy**.

---

## ✅ Global Launch Checklist

- [ ] **CI Pipeline Passing**: Check the "Actions" tab in GitHub.
- [ ] **Database Connected**: MongoDB Atlas is accessible from Render (Allow access from anywhere or whitelist Render IPs).
- [ ] **Environment Secrets**: All `.env` variables transferred to Render/Vercel.
- [ ] **CORS Configured**: `CLIENT_ORIGIN` in Render matches Vercel URL.
- [ ] **ML Connection**: Backend can talk to ML service (via `RISK_SERVICE_URL`).
- [ ] **Payment Mode**: Stripe keys set to Live/Test as needed.

**Status**: 🟢 **READY FOR LIFTOFF**
