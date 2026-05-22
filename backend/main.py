import asyncio
import json
import time
from collections import deque
from datetime import datetime

import numpy as np
import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import IsolationForest

app = FastAPI(title="AI System Monitor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rolling history (last 200 samples) ──────────────────────────────────────
HISTORY_SIZE = 200
history: deque = deque(maxlen=HISTORY_SIZE)

# ── Isolation Forest models (one per metric) ────────────────────────────────
models: dict = {}
TRAIN_AFTER = 30          # train after N samples
retrain_counter = 0


def collect_metrics() -> dict:
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "cpu_percent": cpu,
        "ram_percent": ram.percent,
        "ram_used_gb": round(ram.used / 1e9, 2),
        "ram_total_gb": round(ram.total / 1e9, 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / 1e9, 2),
        "net_sent_mb": round(net.bytes_sent / 1e6, 2),
        "net_recv_mb": round(net.bytes_recv / 1e6, 2),
    }


def get_anomalies(metrics: dict) -> dict:
    """Return per-metric anomaly flags using Isolation Forest."""
    global retrain_counter, models

    retrain_counter += 1

    # Build feature matrix from history
    if len(history) < TRAIN_AFTER:
        return {"cpu": False, "ram": False, "disk": False}

    cpu_vals    = np.array([h["cpu_percent"] for h in history]).reshape(-1, 1)
    ram_vals    = np.array([h["ram_percent"] for h in history]).reshape(-1, 1)
    disk_vals   = np.array([h["disk_percent"] for h in history]).reshape(-1, 1)

    results = {}
    for name, vals, current in [
        ("cpu",  cpu_vals,  metrics["cpu_percent"]),
        ("ram",  ram_vals,  metrics["ram_percent"]),
        ("disk", disk_vals, metrics["disk_percent"]),
    ]:
        # Retrain every 20 samples
        if name not in models or retrain_counter % 20 == 0:
            models[name] = IsolationForest(contamination=0.05, random_state=42)
            models[name].fit(vals)

        pred = models[name].predict([[current]])
        results[name] = bool(pred[0] == -1)   # -1 → anomaly

    return results


def get_forecast(metric_key: str, steps: int = 10) -> list[float]:
    """Simple linear-trend forecast for the next N steps."""
    if len(history) < 10:
        return []

    vals = np.array([h[metric_key] for h in history])
    x = np.arange(len(vals))
    coeffs = np.polyfit(x, vals, 1)          # linear fit
    future_x = np.arange(len(vals), len(vals) + steps)
    forecast = np.polyval(coeffs, future_x)
    return [round(float(v), 2) for v in np.clip(forecast, 0, 100)]


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            metrics = collect_metrics()
            history.append(metrics)

            anomalies = get_anomalies(metrics)
            cpu_forecast  = get_forecast("cpu_percent")
            ram_forecast  = get_forecast("ram_percent")

            payload = {
                **metrics,
                "anomalies": anomalies,
                "forecasts": {
                    "cpu": cpu_forecast,
                    "ram": ram_forecast,
                },
                "history": list(history)[-60:],   # last 60 points for chart
                "model_trained": len(history) >= TRAIN_AFTER,
            }

            await ws.send_text(json.dumps(payload))
            await asyncio.sleep(1)          # 1-second updates

    except WebSocketDisconnect:
        pass


# ── REST fallback ─────────────────────────────────────────────────────────────
@app.get("/metrics")
def get_current_metrics():
    m = collect_metrics()
    history.append(m)
    return {**m, "anomalies": get_anomalies(m)}


@app.get("/health")
def health():
    return {"status": "ok"}
