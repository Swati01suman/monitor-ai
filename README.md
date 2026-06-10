# 🖥️ Real-Time System Monitor

A full-stack AI-powered real-time system monitoring dashboard that tracks CPU, RAM, Disk, and Network metrics with live updates and anomaly detection.

![Python](https://img.shields.io/badge/Python-3.11-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green) ![React](https://img.shields.io/badge/React-18-cyan) ![Docker](https://img.shields.io/badge/Docker-ready-blue) ![AWS](https://img.shields.io/badge/AWS-EC2-orange)

## 🚀 Features

- **Live Metrics** — CPU, RAM, Disk & Network updated every second via WebSockets
- **AI Anomaly Detection** — Isolation Forest model detects unusual spikes automatically
- **AI Forecasting** — Linear trend forecasting predicts future CPU & RAM usage
- **Alert Log** — Real-time alerts with timestamps when anomalies are detected
- **Auto-reconnect** — WebSocket reconnects automatically if backend restarts
- **Dark Dashboard** — Clean dark-themed UI with live sparkline charts

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, WebSockets |
| AI/ML | scikit-learn (Isolation Forest), NumPy |
| Metrics | psutil |
| Frontend | React 18, Vite, Recharts |
| Deployment | AWS EC2, Docker |

## 📁 Project Structure

```
monitor-ai/
├── backend/
│   ├── main.py            ← FastAPI + psutil + Isolation Forest
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx        ← React dashboard
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open 👉 **http://localhost:3000**

## 🤖 How the AI Works

### Anomaly Detection (Isolation Forest)
- Collects 30 samples to learn normal system behavior
- Flags metrics that deviate significantly from baseline
- Retrains every 20 samples to adapt over time
- Anomalous metrics highlighted with orange warning badge

### Forecasting (Linear Trend)
- Fits linear regression on last 60 data points
- Projects next 10 seconds for CPU and RAM
- Displayed as dashed extension on forecast charts

## 🌐 Deployment

Deployed on **AWS EC2** (Ubuntu) with:
- Backend running on port 8000
- Frontend served via Vite
- WebSocket connection for real-time updates

## 📊 Dashboard Features

- Live metric cards with gauge bars and sparklines
- CPU & RAM forecast charts
- Alert log with timestamps
- AI Model Active badge once trained
- Auto-reconnect on connection loss

## 👩‍💻 Author

**Swati Suman** — [GitHub](https://github.com/Swati01suman) | [LinkedIn](https://www.linkedin.com/in/swati-suman777/)
