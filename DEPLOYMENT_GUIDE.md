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

## 🛠️ Step-by-Step Deployment Guide

We recommend using **Render Blueprints** for the easiest setup (Backend + ML). However, we also provide **Manual** instructions below.

### 🔌 Connectivity Architecture
- **Frontend (Vercel)** sends requests to -> **Backend (Render)**
- **Backend (Render)** sends requests to -> **ML Service (Render)** (Internal Network)
- **ML Service** responds to -> **Backend**
- **Backend** responds to -> **Frontend**

---

### Phase 1: Deploy Backend & ML (Render)

**Option A: The "One-Click" Blueprint Method (Recommended)** 🏆
This automatically sets up both Backend and ML services and connects them.

1.  **Dashboard**: Go to [dashboard.render.com](https://dashboard.render.com/).
2.  **Blueprints**: Click **New +** -> **Blueprint**.
3.  **Repository**: Connect your repo `Divyansh8843/JeevanRakshak`.
4.  **Apply**: Render will detect `render.yaml`. Click **Apply**.
5.  **Environment Variables (Crucial)**:
    - Go to **Dashboard** -> **jeevan-rakshak-backend** -> **Environment**.
    - Add these secrets (Render does not sync them from local `.env`):
        - `MONGO_URI`: `mongodb+srv://...` (Your Atlas URL)
        - `JWT_SECRET`: `some-super-secret-key`
        - `GOOGLE_CLIENT_ID`: `...`
        - `GOOGLE_CLIENT_SECRET`: `...`
        - `GEMINI_API_KEY`: `...`
        - `STRIPE_SECRET_KEY`: `...`
        - `EMAIL_USER`: `...`
        - `EMAIL_PASS`: `...`
        - `CLIENT_ORIGIN`: `https://jeevan-rakshak.vercel.app` (You will update this after Phase 2).
        - `RISK_SERVICE_URL`: `http://jeevan-rakshak-ml:10000` (Pre-filled by Blueprint).

**Option B: Manual Separation (If you prefer)** ✋
1.  **ML Service**:
    - New -> **Web Service**.
    - Root Directory: `ml`.
    - Runtime: `Python 3`.
    - Build Command: `pip install -r requirements.txt`.
    - Start Command: `uvicorn service.app:app --host 0.0.0.0 --port 10000`.
    - Env Vars: `PYTHON_VERSION` = `3.12.3`, `MODEL_PATH` = `model/model.joblib`.
2.  **Backend Service**:
    - New -> **Web Service**.
    - Root Directory: `server`.
    - Runtime: `Node`.
    - Build Command: `npm install`.
    - Start Command: `npm start`.
    - Env Vars: Add all secrets (Mongo, Google, etc.).
    - `RISK_SERVICE_URL`: Use the **Internal Service URL** of the ML Service (e.g., `http://jeevan-rakshak-ml:10000`).

---

### Phase 2: Deploy Frontend (Vercel)

1.  **Dashboard**: Go to [vercel.com/new](https://vercel.com/new).
2.  **Import**: Select `JeevanRakshak`.
3.  **Root Directory**: Click "Edit" and select `client`. **(Important!)**
4.  **Framework**: check it is detected as **Vite**.
5.  **Environment Variables**:
    - `VITE_SERVER_URL`: The URL of your **Backend** from Phase 1 (e.g., `https://jeevan-rakshak-backend.onrender.com`).
6.  **Deploy**: Click **Deploy**.

---

### Phase 3: Final Link-Up 🔗

1.  **Get Vercel URL**: Copy your new domain (e.g., `https://jeevan-rakshak.vercel.app`).
2.  **Update Backend**:
    - Go to Render -> **jeevan-rakshak-backend** -> **Environment**.
    - Update `CLIENT_ORIGIN` to your Vercel URL.
    - Save Changes. The backend will redeploy.
3.  **Google OAuth**:
    - Go to Google Cloud Console.
    - Update **Authorized Origins** to your Vercel URL.
    - Update **Authorized Redirect URIs** if necessary (though this app uses frontend flow).

---

## ✅ Global Launch Checklist

- [ ] **CI Pipeline Passing**: Check the "Actions" tab in GitHub.
- [ ] **Database Connected**: MongoDB Atlas whitelist includes `0.0.0.0/0` (or Render IPs).
- [ ] **Environment Secrets**: All `.env` variables transferred to Render Backend.
- [ ] **CORS Configured**: `CLIENT_ORIGIN` in Render matches Vercel URL.
- [ ] **ML Connection**: Backend can talk to ML service (via `RISK_SERVICE_URL`).

**Status**: 🟢 **READY FOR LIFTOFF**
