'use client';

import dynamic from 'next/dynamic';
import AppShell from '@/components/layout/AppShell';
import { useState, useEffect } from 'react';
import { Map as MapIcon, ShieldAlert, Waves } from 'lucide-react';
import { API_URL } from '@/lib/config';

// Leaflet must be dynamically imported (no SSR) as it uses browser APIs
const FloodMap = dynamic(() => import('@/components/map/FloodMap'), { ssr: false, loading: () => (
  <div style={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 12 }}>
    <MapIcon size={24} style={{ marginRight: 8, opacity: 0.5 }} /> Loading map...
  </div>
)});

const LAYERS = [
  { id: 'rainfall',   label: 'Risk Level',    icon: <ShieldAlert size={16} /> },
  { id: 'rivers',     label: 'River Network', icon: <Waves size={16} /> },
];

function classifyRisk(prob: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (prob >= 0.6) return 'HIGH';
  if (prob >= 0.3) return 'MEDIUM';
  return 'LOW';
}

export default function MapPage() {
  const [activeLayers, setActiveLayers] = useState<string[]>(['rainfall', 'rivers']);
  const [zoneCounts, setZoneCounts] = useState({ high: 0, moderate: 0, low: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  const toggleLayer = (id: string) =>
    setActiveLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);

  // Fetch live risk data and compute zone counts
  useEffect(() => {
    fetch(`${API_URL}/api/v1/risk/latest-risk`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          let high = 0, moderate = 0, low = 0;
          data.forEach(z => {
            const level = classifyRisk(z.probability ?? 0);
            if (level === 'HIGH') high++;
            else if (level === 'MEDIUM') moderate++;
            else low++;
          });
          setZoneCounts({ high, moderate, low });
        }
      })
      .catch(() => {})
      .finally(() => setCountsLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Interactive Hazard Map</div>
          <div className="topbar-subtitle">Chikwawa District — flood risk zone visualization</div>
        </div>
        <div className="topbar-actions">
          <span className="live-dot">LIVE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}
           className="map-page-grid">
        {/* Map */}
        <div>
          <div className="map-container map-responsive-height">
            <FloodMap activeLayers={activeLayers} />
          </div>
        </div>

        {/* Sidebar Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Layer Selector */}
          <div className="card">
            <div className="card-title">Map Layers</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LAYERS.map(layer => (
                <label key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => toggleLayer(layer.id)}
                    style={{
                      width: 36, height: 20, borderRadius: 999,
                      background: activeLayers.includes(layer.id) ? 'var(--brand-blue)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: activeLayers.includes(layer.id) ? 19 : 3,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {layer.icon} {layer.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone Summary — live from ML predictions */}
          <div className="card">
            <div className="card-title">Zone Summary</div>
            <div style={{ marginTop: 4, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              Based on latest ML predictions across 5 TA zones
            </div>
            {countsLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'High Risk',     count: zoneCounts.high,     color: 'var(--risk-high)' },
                  { label: 'Moderate Risk', count: zoneCounts.moderate,  color: 'var(--risk-med)'  },
                  { label: 'Low Risk',      count: zoneCounts.low,       color: 'var(--risk-low)'  },
                ].map(zone => (
                  <div key={zone.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: zone.color }} />
                      <span style={{ fontSize: 13 }}>{zone.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: zone.color, fontSize: 16 }}>{zone.count}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  Total monitored zones: {zoneCounts.high + zoneCounts.moderate + zoneCounts.low}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card">
            <div className="card-title">Risk Legend</div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {[
                { color: 'var(--risk-high)', label: 'HIGH (≥60%)',    range: 'Flood probability ≥ 60%' },
                { color: 'var(--risk-med)',  label: 'MEDIUM (30-60%)', range: 'Flood probability 30–60%' },
                { color: 'var(--risk-low)',  label: 'LOW (<30%)',      range: 'Flood probability < 30%' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: item.color, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{item.range}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
