'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import RainfallChart from '@/components/charts/RainfallChart';
import { useAuth } from '@/lib/AuthContext';
import { 
  Activity, BellRing, BarChart2, AlertOctagon, 
  AlertTriangle, CheckCircle2, TrendingDown, Map as MapIcon,
  ShieldAlert, Send, X
} from 'lucide-react';

// --- Types ---
interface StatCard { label: string; value: string; icon: React.ReactNode; meta: string; }
interface ZoneData { name: string; prob: number; }

const TA_ZONES: ZoneData[] = [
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
  const { authFetch } = useAuth();
  const [riskData, setRiskData] = useState(TA_ZONES);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState('Connecting...');

  // --- Dispatch modal state ---
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchZone, setDispatchZone] = useState('');
  const [dispatchMsg, setDispatchMsg] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ok: boolean; msg: string} | null>(null);

  const API = 'http://localhost:8000/api/v1';

  // --- Load risk + activity data ---
  const loadRiskData = () => {
    fetch(`${API}/risk/latest-risk`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: any[]) => {
        if (data && data.length > 0) {
          setRiskData(prev => prev.map(zone => {
            const match = data.find((d: any) => d.grid_id === zone.name);
            return match ? { ...zone, prob: match.probability } : zone;
          }));
        }
      })
      .catch(() => {}); // silently retry on next poll
  };

  const loadActivityFeed = () => {
    fetch(`${API}/risk/activity-feed?limit=8`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: any[]) => {
        if (data && data.length > 0) {
          setAlerts(data.map((d: any) => ({
            id: d.id,
            level: d.risk_level,
            location: d.ta_area || d.recipient || 'Unknown',
            message: d.message || `Alert dispatched via ${d.channel}`,
            time: d.fired_at ? new Date(d.fired_at).toLocaleTimeString() : '--',
          })));
        }
      })
      .catch(() => {});
  };

  // --- WebSocket connection to backend ---
  useEffect(() => {
    // Initial data load
    loadRiskData();
    loadActivityFeed();

    // Periodic refresh every 60s (catches updates even without WS push)
    const pollInterval = setInterval(() => {
      loadRiskData();
      loadActivityFeed();
    }, 60_000);

    // WebSocket for real-time push updates
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    let isCleanedUp = false;

    const connectWs = () => {
      if (isCleanedUp) return;
      ws = new WebSocket(`ws://localhost:8000/api/v1/live-feed`);

      ws.onopen = () => {
        setLastSync(new Date().toLocaleTimeString());
      };

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
            }, ...prev].slice(0, 20));
            setRiskData(prev => prev.map(zone =>
              zone.name === data.location
                ? { ...zone, prob: data.probability }
                : zone
            ));
          }
        } catch (_) { }
      };

      ws.onclose = () => {
        if (!isCleanedUp) {
          setLastSync('Synced via polling');
          reconnectTimeout = setTimeout(connectWs, 8000);
        }
      };

      ws.onerror = () => { ws.close(); };
    };

    connectWs();

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, []);


  // --- Summary stats ---
  const maxProb = Math.max(...riskData.map(z => z.prob));
  const highestZone = riskData.find(z => z.prob === maxProb)?.name ?? 'N/A';
  const overallRisk = classifyRisk(maxProb);
  const highRiskZones = riskData.filter(z => classifyRisk(z.prob) === 'HIGH');

  const getRiskIcon = (level: string) => {
    if (level === 'HIGH') return <AlertOctagon size={24} color="var(--risk-high)" />;
    if (level === 'MEDIUM') return <AlertTriangle size={24} color="var(--risk-med)" />;
    return <CheckCircle2 size={24} color="var(--risk-low)" />;
  };

  const statCards: StatCard[] = [
    { label: 'System Status', value: 'LIVE', icon: <Activity size={24} color="var(--risk-low)" />, meta: `Last sync: ${lastSync}` },
    { label: 'Active Alerts', value: String(alerts.length), icon: <BellRing size={24} color="var(--brand-blue)" />, meta: 'Recent dispatches' },
    { label: 'Max Flood Prob.', value: `${Math.round(maxProb * 100)}%`, icon: <BarChart2 size={24} color="var(--brand-purple)" />, meta: `Highest: ${highestZone}` },
    { label: 'Overall Risk Level', value: overallRisk, icon: getRiskIcon(overallRisk), meta: 'Current district status' },
  ];

  // --- Dispatch handler ---
  const openDispatchModal = (zoneName: string) => {
    const zone = riskData.find(z => z.name === zoneName);
    const pct = zone ? Math.round(zone.prob * 100) : 0;
    const level = zone ? classifyRisk(zone.prob) : 'HIGH';
    setDispatchZone(zoneName);
    setDispatchMsg(
      `CHIKWAWA FLOOD ALERT: ${zoneName} is at ${level} flood risk (${pct}%). ` +
      `Please follow official evacuation instructions from DCCM authorities.`
    );
    setDispatchResult(null);
    setShowDispatch(true);
  };

  const handleDispatch = async () => {
    if (!dispatchMsg.trim()) return;
    setDispatching(true);
    setDispatchResult(null);

    const zone = riskData.find(z => z.name === dispatchZone);
    const level = zone ? classifyRisk(zone.prob) : 'HIGH';

    try {
      const res = await authFetch(`${API}/alerts/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid_id: dispatchZone,
          risk_level: level,
          message: dispatchMsg,
          ta_area: dispatchZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Dispatch failed');
      setDispatchResult({
        ok: true,
        msg: `✓ SMS dispatched to ${data.successful_sends}/${data.total_subscribers} subscribers in ${dispatchZone}.`,
      });
    } catch (err: any) {
      setDispatchResult({ ok: false, msg: err.message });
    } finally {
      setDispatching(false);
    }
  };

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
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {card.icon} {card.label}
            </div>
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
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={18} /> 7-Day Precipitation Trend
            </div>
            <RainfallChart window={7} />
          </div>

          {/* Risk Zones progress bars */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapIcon size={18} /> Risk Zones Overview — Traditional Authorities
            </div>
            <div style={{ marginTop: 12 }}>
              {riskData.map(zone => {
                const level = classifyRisk(zone.prob);
                const pct = Math.round(zone.prob * 100);
                return (
                  <div key={zone.name} className="progress-bar-wrap">
                    <div className="progress-bar-header">
                      <span className="progress-bar-label">{zone.name}</span>
                      <span className="progress-bar-pct" style={{ color: riskColor(level), display: 'flex', alignItems: 'center', gap: 8 }}>
                        {pct}% — <span className={`badge badge-${level.toLowerCase()}`}>
                          <span className="badge-dot" />
                          {level}
                        </span>
                        {(level === 'HIGH' || level === 'MEDIUM') && (
                          <button
                            className="btn btn-ghost"
                            style={{
                              fontSize: 11,
                              padding: '3px 10px',
                              border: `1px solid ${level === 'HIGH' ? 'var(--risk-high)' : 'var(--risk-med)'}`,
                              color: level === 'HIGH' ? 'var(--risk-high)' : 'var(--risk-med)',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={() => openDispatchModal(zone.name)}
                          >
                            <ShieldAlert size={12} /> Dispatch Alert
                          </button>
                        )}
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
          {/* Recent Dispatch Log */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BellRing size={18} /> Recent Dispatches
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              Latest alerts sent to field coordinators
            </div>
            
            {alerts.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <BellRing size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                <div style={{ fontSize: 13 }}>No recent dispatches</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, paddingRight: 4 }}>
                  {alerts.slice(0, 4).map(alert => (
                    <div key={alert.id} style={{
                      padding: '12px', borderRadius: 8,
                      background: 'var(--bg-main)', border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          {alert.location}
                        </div>
                        <span className={`badge badge-${alert.level.toLowerCase()}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                          {alert.level}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 6 }}>
                        {alert.message}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {alert.time}
                      </div>
                    </div>
                  ))}
                </div>

                {/* See More link — only shown when there are more than 4 alerts */}
                {alerts.length > 4 && (
                  <a
                    href="/alerts"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 14,
                      padding: '9px 0',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--brand-blue)',
                      textDecoration: 'none',
                      background: 'var(--bg-primary)',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,99,235,0.06)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--brand-blue)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-primary)';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                    }}
                  >
                    <BellRing size={13} />
                    See all {alerts.length} dispatches — Real-time Alerts →
                  </a>
                )}
              </>
            )}
          </div>

        </div>
      </div>


      {/* ──── Dispatch Alert Modal ──── */}
      {showDispatch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16,
            padding: 32, width: '100%', maxWidth: 520,
            border: '1px solid var(--border)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={24} color="var(--risk-high)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    Approve & Dispatch Alert
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Human-verified SMS alert for {dispatchZone}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setShowDispatch(false)}
                style={{ padding: 6, borderRadius: 8 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Banner */}
            <div style={{
              background: 'rgba(192,57,43,0.1)',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertOctagon size={18} color="var(--risk-high)" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--risk-high)' }}>Review carefully.</strong> This will send an SMS
                to <strong>all registered subscribers</strong> in {dispatchZone}. This action cannot be undone.
              </div>
            </div>

            {/* Message Editor */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Alert Message (editable)
              </label>
              <textarea
                value={dispatchMsg}
                onChange={(e) => setDispatchMsg(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-main)',
                  color: 'var(--text-primary)', fontSize: 13, minHeight: 100,
                  resize: 'vertical', outline: 'none', lineHeight: 1.6,
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                {dispatchMsg.length} characters
              </div>
            </div>

            {/* Result Banner */}
            {dispatchResult && (
              <div style={{
                background: dispatchResult.ok ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
                color: dispatchResult.ok ? 'var(--risk-low)' : 'var(--risk-high)',
                padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
                border: `1px solid ${dispatchResult.ok ? 'var(--risk-low)' : 'var(--risk-high)'}`,
              }}>
                {dispatchResult.msg}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowDispatch(false)}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDispatch}
                disabled={dispatching || !dispatchMsg.trim()}
                style={{
                  padding: '10px 24px',
                  background: 'var(--risk-high)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {dispatching ? 'Dispatching...' : (
                  <>
                    <Send size={16} /> Approve & Send SMS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
