'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import RainfallChart from '@/components/charts/RainfallChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface RiverStatus {
  river_name: string;
  current_level_m: number;
  warning_threshold_m: number;
  danger_threshold_m: number;
  percent_of_danger: number;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  last_updated: string | null;
}

const statusColors: Record<string, string> = {
  SAFE:    'var(--risk-low)',
  WARNING: 'var(--risk-med)',
  DANGER:  'var(--risk-high)',
};

// Demo historical events from Chikwawa
const historicalEvents = [
  { year: '2019', event: 'Cyclone Idai',         impact: 'High',   affected: 84_000, economic: '$2.4M' },
  { year: '2015', event: 'Malawi Floods',         impact: 'High',   affected: 230_000,economic: '$7.1M' },
  { year: '2022', event: 'Cyclone Ana',           impact: 'Medium', affected: 46_000, economic: '$1.2M' },
  { year: '2023', event: 'Cyclone Freddy',        impact: 'High',   affected: 102_000,economic: '$4.8M' },
  { year: '2024', event: 'January Flooding',      impact: 'Medium', affected: 12_000, economic: '$0.5M' },
];

export default function HistoryPage() {
  const [tab, setTab]           = useState<'rainfall' | 'water' | 'events'>('rainfall');
  const [window, setWindow]     = useState<7 | 30>(7);
  const [river, setRiver]       = useState<RiverStatus | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/charts/river-levels')
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setRiver)
      .catch(() => setRiver({
        river_name: 'Shire River (Chiromo Gauge)',
        current_level_m: 4.1,
        warning_threshold_m: 4.5,
        danger_threshold_m: 6.0,
        percent_of_danger: 68,
        status: 'SAFE',
        last_updated: new Date().toISOString(),
      }));
  }, []);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Historical Data</div>
          <div className="topbar-subtitle">Chikwawa District — precipitation, river levels & past events</div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['rainfall', 'water', 'events'] as const).map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t)}
          >
            {t === 'rainfall' ? '🌧️ Rainfall Trends' : t === 'water' ? '🌊 Water Levels' : '📚 Historical Events'}
          </button>
        ))}
      </div>

      {/* RAINFALL TAB */}
      {tab === 'rainfall' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="card-title">Daily Precipitation — Chikwawa MET Station</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${window === 7  ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setWindow(7)}>7 Days</button>
              <button className={`btn ${window === 30 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setWindow(30)}>30 Days</button>
            </div>
          </div>
          <RainfallChart window={window} />
        </div>
      )}

      {/* WATER LEVELS TAB */}
      {tab === 'water' && river && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title">🌊 {river.river_name}</div>
            <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current Level</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: statusColors[river.status] }}>
                  {river.current_level_m}m
                </div>
                <span className={`badge badge-${river.status === 'SAFE' ? 'low' : river.status === 'WARNING' ? 'medium' : 'high'}`}>
                  <span className="badge-dot" /> {river.status}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                    <span>0m</span><span>Warning: {river.warning_threshold_m}m</span><span>Danger: {river.danger_threshold_m}m</span>
                  </div>
                  <div className="progress-bar-track" style={{ height: 12 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${river.percent_of_danger}%`, background: statusColors[river.status] }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {river.percent_of_danger}% of danger threshold
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORICAL EVENTS TAB */}
      {tab === 'events' && (
        <div className="card">
          <div className="card-title">📚 Past Flood Events — Chikwawa District</div>
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                  {['Year', 'Event', 'Impact', 'People Affected', 'Economic Loss'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historicalEvents.map(ev => (
                  <tr key={ev.year + ev.event} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ev.year}</td>
                    <td style={{ padding: '10px 12px' }}>{ev.event}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge badge-${ev.impact === 'High' ? 'high' : 'medium'}`}>
                        <span className="badge-dot" />{ev.impact}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{ev.affected.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>{ev.economic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
