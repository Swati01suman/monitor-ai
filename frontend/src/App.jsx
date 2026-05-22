import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#0a0c10",
  surface: "#0f1318",
  border:  "#1c2230",
  accent:  "#00d4ff",
  warn:    "#ff6b35",
  ok:      "#00e5a0",
  cpu:     "#00d4ff",
  ram:     "#a78bfa",
  disk:    "#34d399",
  net:     "#fbbf24",
  text:    "#e2e8f0",
  muted:   "#4a5568",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toFixed(1);
const pct = (n) => `${fmt(n)}%`;

function GaugeBar({ value, color, anomaly }) {
  return (
    <div style={{ position: "relative", height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${value}%`,
        background: anomaly ? C.warn : color,
        borderRadius: 3,
        transition: "width 0.4s ease, background 0.3s",
        boxShadow: anomaly ? `0 0 8px ${C.warn}` : `0 0 6px ${color}55`,
      }} />
    </div>
  );
}

function MetricCard({ title, value, unit, color, anomaly, children }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${anomaly ? C.warn : C.border}`,
      borderRadius: 12,
      padding: "18px 20px",
      boxShadow: anomaly ? `0 0 20px ${C.warn}22` : "none",
      transition: "border 0.3s, box-shadow 0.3s",
      position: "relative",
      overflow: "hidden",
    }}>
      {anomaly && (
        <div style={{
          position: "absolute", top: 10, right: 12,
          background: C.warn, color: "#fff",
          fontSize: 10, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          letterSpacing: 1,
        }}>⚠ ANOMALY</div>
      )}
      <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
          {fmt(value)}
        </span>
        <span style={{ color: C.muted, fontSize: 14 }}>{unit}</span>
      </div>
      {children}
    </div>
  );
}

function SparkLine({ data, color, dataKey }) {
  return (
    <ResponsiveContainer width="100%" height={50}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#g-${dataKey})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ForecastChart({ history, forecast, color, dataKey, label }) {
  const histSlice = (history || []).slice(-30).map((h, i) => ({
    t: i, v: h[dataKey], type: "history"
  }));
  const fcast = (forecast || []).map((v, i) => ({
    t: histSlice.length + i, v, type: "forecast"
  }));
  const combined = [...histSlice, ...fcast];
  const splitIdx = histSlice.length;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
        {label} — History + AI Forecast
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={combined} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12 }}
            formatter={(v, n) => [`${fmt(v)}%`, n === "v" ? "value" : n]}
          />
          <ReferenceLine x={splitIdx - 1} stroke={C.muted} strokeDasharray="4 4" label={{ value: "now", fill: C.muted, fontSize: 10 }} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const alertsRef = useRef([]);

  const addAlert = useCallback((msg) => {
    const alert = { id: Date.now(), msg, time: new Date().toLocaleTimeString() };
    const next = [alert, ...alertsRef.current].slice(0, 5);
    alertsRef.current = next;
    setAlerts(next);
  }, []);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket("ws://localhost:8000/ws");
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2000);
      };
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        setData(d);
        if (d.anomalies?.cpu)  addAlert("⚠ CPU anomaly detected");
        if (d.anomalies?.ram)  addAlert("⚠ RAM anomaly detected");
        if (d.anomalies?.disk) addAlert("⚠ Disk anomaly detected");
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, [addAlert]);

  const history = data?.history || [];
  const anom    = data?.anomalies || {};
  const fc      = data?.forecasts || {};

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "24px 28px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: C.text }}>
            <span style={{ color: C.accent }}> System</span> Monitor
          </h1>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>Real-time metrics + Isolation Forest anomaly detection</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? C.ok : C.warn,
            boxShadow: `0 0 6px ${connected ? C.ok : C.warn}`,
          }} />
          <span style={{ fontSize: 12, color: connected ? C.ok : C.warn }}>
            {connected ? "LIVE" : "RECONNECTING…"}
          </span>
          {data?.model_trained && (
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 12, background: C.surface, border: `1px solid ${C.border}`, padding: "2px 10px", borderRadius: 20 }}>
              🤖 AI Model Active
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <MetricCard title="CPU Usage" value={data?.cpu_percent} unit="%" color={C.cpu} anomaly={anom.cpu}>
          <GaugeBar value={data?.cpu_percent || 0} color={C.cpu} anomaly={anom.cpu} />
          <SparkLine data={history} color={C.cpu} dataKey="cpu_percent" />
        </MetricCard>

        <MetricCard title="RAM Usage" value={data?.ram_percent} unit="%" color={C.ram} anomaly={anom.ram}>
          <GaugeBar value={data?.ram_percent || 0} color={C.ram} anomaly={anom.ram} />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {fmt(data?.ram_used_gb)} / {fmt(data?.ram_total_gb)} GB
          </div>
          <SparkLine data={history} color={C.ram} dataKey="ram_percent" />
        </MetricCard>

        <MetricCard title="Disk Usage" value={data?.disk_percent} unit="%" color={C.disk} anomaly={anom.disk}>
          <GaugeBar value={data?.disk_percent || 0} color={C.disk} anomaly={anom.disk} />
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
            {fmt(data?.disk_used_gb)} GB used
          </div>
          <SparkLine data={history} color={C.disk} dataKey="disk_percent" />
        </MetricCard>

        <MetricCard title="Network Sent" value={data?.net_sent_mb} unit="MB" color={C.net} anomaly={false}>
          <SparkLine data={history} color={C.net} dataKey="net_sent_mb" />
        </MetricCard>
      </div>

      {/* Forecast Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <ForecastChart history={history} forecast={fc.cpu} color={C.cpu} dataKey="cpu_percent" label="CPU" />
        <ForecastChart history={history} forecast={fc.ram} color={C.ram} dataKey="ram_percent" label="RAM" />
      </div>

      {/* Alert Log */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Alert Log</div>
        {alerts.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>✅ No anomalies detected yet</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.border}`,
              color: C.warn,
            }}>
              <span>{a.msg}</span>
              <span style={{ color: C.muted }}>{a.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
