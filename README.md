# JeevanRakshak (Life Saver) 🧘‍♂️💙

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Production--Ready-success)
![Build Status](https://github.com/Divyansh8843/JeevanRakshak/actions/workflows/global-launch-ci.yml/badge.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

> **A Comprehensive Mental Health & Wellness Platform for Students**  
> *Connecting hearts, healing minds, and saving lives through AI-driven insights and professional counseling.*

---

## 🌟 Overview

**JeevanRakshak** is a state-of-the-art mental health platform designed to bridge the gap between students seeking help and professional counselors. Built with a "Privacy First" approach, it leverages **Artificial Intelligence** to detect risk levels based on daily routines and journal entries, offering immediate support and seamless connection to unparalleled professional care.

Whether you're a student feeling overwhelmed or a counselor looking to reach more people, JeevanRakshak provides the tools, security, and community you need.

---

## 🚀 Key Features

### 🤖 AI-Powered Risk Detection
- **Real-time Analysis**: Our ML engine (FastAPI + Scikit-Learn) analyzes daily check-ins and notes to detect early signs of distress.
- **Risk Scoring**: Automatically categorizes wellness into `Low`, `Medium`, or `High` risk zones to prioritize urgent cases.
- **Smart Recommendations**: Personalized tips and resources based on your current emotional state.

### 📹 Seamless Teletherapy
- **Video Calls**: Integrated, high-quality video sessions between students and counselors.
- **Real-time Chat**: Secure, instant messaging for continuous support.
- **Socket.io Integration**: Live updates for appointments, messages, and notifications.

### 📅 Smart Scheduling & Payments
- **Easy Booking**: Filter counselors by specialization, language, and availability.
- **Stripe Integration**: Secure, hassle-free payments for sessions.
- **Dynamic Dashboard**: Manage appointments, earnings, and client history in one place.

### 🛡️ Privacy & Security
- **Data Encryption**: All personal data and chat history are securely stored.
- **Anonymous Options**: Features designed to encourage openness without fear of stigma.
- **Emergency Protocols**: Automatic alerts and hotline resources for high-risk situations.

---

## 🛠️ Tech Stack

### Frontend 🎨
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

### Backend ⚙️
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

### Machine Learning 🧠
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)

### Deployment ☁️
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

---

## 📦 Installation

Clone the repository and set up the environment.

### 1. Clone Repo
```bash
git clone https://github.com/Divyansh8843/JeevanRakshak.git
cd JeevanRakshak
```

### 2. Backend Setup
```bash
cd server
npm install
# Create .env file with your credentials (see .env.example)
npm start
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

### 4. ML Service Setup
```bash
cd ml
pip install -r requirements.txt
uvicorn service.app:app --reload
```

---

## 🌍 Deployment

### Deploy to Render (Backend & ML)
We use a **Blueprints** approach to deploy both the Node.js backend and Python ML service seamlessly.
1. Connect your repo to Render.
2. It will auto-detect `render.yaml`.
3. Fill in the environment variables.
4. Launch!

### Deploy to Vercel (Frontend)
1. Import the `client` folder into Vercel.
2. Set build command: `vite build`.
3. add `VITE_SERVER_URL` env variable.
4. Deploy!

*Check `DEPLOYMENT_GUIDE.md` for detailed instructions.*

---

## 🤝 Contribution

We welcome contributions to make mental health support more accessible!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Contact

**Project Team** - [Contact Info / Website]
**Project Link**: [https://github.com/Divyansh8843/JeevanRakshak](https://github.com/Divyansh8843/JeevanRakshak)

---

<p align="center">
  Generated with ❤️ for a better tomorrow.
</p>
