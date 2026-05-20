'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import RiskZonesPanel from '@/components/dashboard/RiskZonesPanel';
import AlertFeed from '@/components/dashboard/AlertFeed';
import RainfallChart from '@/components/charts/RainfallChart';

// --- Types ---
interface StatCard { label: string; value: string; icon: string; meta: string; }

const TA_ZONES = [
  { name: 'TA Ngabu', prob: 0 },
  { name: 'TA Makhwira', prob: 0 },
  { name: 'TA Lundu', prob: 0 },
  { name: 'TA Kasisi', prob: 0 },
  { name: 'TA Chapananga', prob: 0 },
];

function classifyRisk(prob: number): string {
  if (prob < 0.3) return 'LOW';
  if (prob < 0.6) return 'MEDIUM';
  return 'HIGH';
}

function riskColor(level: string): string {
  if (level === 'HIGH') return 'var(--risk-high)';
  if (level === 'MEDIUM') return 'var(--risk-med)';
  return 'var(--risk-low)';
}

export default function DashboardPage() {
  const [riskData, setRiskData] = useState(TA_ZONES);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState('Connecting...');

  // --- WebSocket connection to backend ---
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/v1/live-feed');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'RISK_UPDATE') {
          setLastSync(new Date().toLocaleTimeString());
          setAlerts(prev => [{
            id: Date.now(),
            level: data.risk_level,
            location: data.location,
            message: data.message,
            time: new Date().toLocaleTimeString(),
          }, ...prev].slice(0, 20)); // keep last 20 alerts

          // Update the TA zone probability
          setRiskData(prev => prev.map(zone =>
            zone.name === data.location
              ? { ...zone, prob: data.probability }
              : zone
          ));
        }
      } catch (_) { }
    };

    ws.onerror = () => setLastSync('Connection error');
    return () => ws.close();
  }, []);

  // --- Summary stats ---
  const maxProb = Math.max(...riskData.map(z => z.prob));
  const highestZone = riskData.find(z => z.prob === maxProb)?.name ?? 'N/A';
  const overallRisk = classifyRisk(maxProb);

  const statCards: StatCard[] = [
    { label: 'System Status', value: 'LIVE', icon: '🟢', meta: `Last sync: ${lastSync}` },
    { label: 'Active Alerts', value: String(alerts.filter(a => a.level === 'HIGH').length), icon: '🔔', meta: 'HIGH risk events' },
    { label: 'Max Flood Prob.', value: `${Math.round(maxProb * 100)}%`, icon: '📊', meta: `Highest: ${highestZone}` },
    { label: 'Overall Risk Level', value: overallRisk, icon: overallRisk === 'HIGH' ? '🚨' : overallRisk === 'MEDIUM' ? '⚠️' : '✅', meta: 'Current district status' },
  ];

  return (
    <AppShell>
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <div className="topbar-title">Chikwawa Flood Dashboard</div>
          <div className="topbar-subtitle">Real-time monitoring — Chikwawa District, Malawi</div>
        </div>
        <div className="topbar-actions">
          <span className="live-dot">LIVE</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((card, i) => (
          <div key={i} className="card">
            <div className="card-title">{card.icon} {card.label}</div>
            <div className="card-value" style={{ fontSize: 22 }}>{card.value}</div>
            <div className="card-meta">{card.meta}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-left">
          {/* 7-Day Rainfall Chart */}
          <div className="card">
            <div className="card-title">📉 7-Day Precipitation Trend</div>
            <RainfallChart window={7} />
          </div>

          {/* Risk Zones progress bars */}
          <div className="card">
            <div className="card-title">🗺️ Risk Zones Overview — Traditional Authorities</div>
            <div style={{ marginTop: 12 }}>
              {riskData.map(zone => {
                const level = classifyRisk(zone.prob);
                const pct = Math.round(zone.prob * 100);
                return (
                  <div key={zone.name} className="progress-bar-wrap">
                    <div className="progress-bar-header">
                      <span className="progress-bar-label">{zone.name}</span>
                      <span className="progress-bar-pct" style={{ color: riskColor(level) }}>
                        {pct}% — <span className={`badge badge-${level.toLowerCase()}`}>
                          <span className="badge-dot" />
                          {level}
                        </span>
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${pct}%`, background: riskColor(level) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dashboard-right">
          {/* Live Alert Feed */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>🔔 Live Activity Feed</div>
            <AlertFeed alerts={alerts} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
