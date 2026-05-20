'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';

interface Alert {
  id: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  message: string;
  time: string;
  read: boolean;
}

const ICONS: Record<string, string> = { HIGH: '🚨', MEDIUM: '⚠️', LOW: '✅' };

export default function AlertsPage() {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [filter, setFilter]   = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/v1/live-feed');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'RISK_UPDATE') {
          setAlerts(prev => [{
            id:       Date.now(),
            level:    data.risk_level,
            location: data.location,
            message:  data.message,
            time:     new Date().toLocaleString(),
            read:     false,
          }, ...prev].slice(0, 50));
        }
      } catch (_) {}
    };
    return () => ws.close();
  }, []);

  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));

  const filtered = alerts.filter(a => {
    const matchFilter = filter === 'ALL' || a.level === filter;
    const matchSearch = a.location.toLowerCase().includes(search.toLowerCase()) ||
                        a.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Real-time Alerts</div>
          <div className="topbar-subtitle">Live WebSocket feed — {alerts.length} total alerts received</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={markAllRead}>✓ Mark all read</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : `${ICONS[f]} ${f}`}
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: '1px 7px',
              fontSize: 11,
              marginLeft: 4,
            }}>
              {f === 'ALL' ? alerts.length : alerts.filter(a => a.level === f).length}
            </span>
          </button>
        ))}
        <input
          placeholder="🔍 Search alerts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            minWidth: 220,
          }}
        />
      </div>

      {/* Alert List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No alerts yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Alerts will stream in live from the backend.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((alert, i) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: alert.read ? 'transparent' : 'rgba(37,99,235,0.04)',
                  alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 20, marginTop: 1 }}>{ICONS[alert.level]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{alert.location}</span>
                    <span className={`badge badge-${alert.level.toLowerCase()}`}>
                      <span className={`badge-dot ${alert.level === 'HIGH' ? 'pulse' : ''}`} />
                      {alert.level}
                    </span>
                    {!alert.read && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-blue)', display: 'inline-block' }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>🕐 {alert.time}</div>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a))}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
