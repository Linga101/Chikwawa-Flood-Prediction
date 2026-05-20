'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';

interface Factor {
  weight: number;
  score:  number;
  current_m?: number;
  danger_threshold_m?: number;
}

interface Assessment {
  grid_id:         string;
  composite_score: number;
  factors: {
    rainfall_intensity:  Factor;
    soil_saturation:     Factor;
    river_level:         Factor;
    infrastructure_risk: Factor;
    elevation_slope:     Factor;
  };
}

const FACTOR_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  rainfall_intensity:  { label: 'Rainfall Intensity',  icon: '🌧️', desc: 'GPM satellite-derived precipitation accumulation (7-day)' },
  soil_saturation:     { label: 'Soil Saturation',     icon: '🌱', desc: 'SMAP volumetric water content — indicates how much rain the soil can absorb' },
  river_level:         { label: 'Shire River Level',   icon: '🌊', desc: 'Current Shire River height at Chiromo gauge vs danger threshold (6.0m)' },
  infrastructure_risk: { label: 'Infrastructure Risk', icon: '🏘️', desc: 'Land cover and settlement density in the grid cell' },
  elevation_slope:     { label: 'Elevation / Slope',   icon: '⛰️', desc: 'Terrain elevation and slope — lower areas are higher risk' },
};

function scoreColor(score: number) {
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 30) return 'var(--risk-med)';
  return 'var(--risk-low)';
}

const TA_ZONES = ['grid_ta_ngabu', 'grid_ta_makhwira', 'grid_ta_lundu', 'grid_ta_kasisi', 'grid_ta_chapananga'];
const TA_LABELS: Record<string, string> = {
  grid_ta_ngabu:      'TA Ngabu',
  grid_ta_makhwira:   'TA Makhwira',
  grid_ta_lundu:      'TA Lundu',
  grid_ta_kasisi:     'TA Kasisi',
  grid_ta_chapananga: 'TA Chapananga',
};

export default function RiskPage() {
  const [selectedGrid, setSelectedGrid] = useState(TA_ZONES[0]);
  const [assessment,   setAssessment]   = useState<Assessment | null>(null);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/v1/risk/${selectedGrid}/assessment`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setAssessment)
      .catch(() => {
        // Fallback demo data
        setAssessment({
          grid_id: selectedGrid,
          composite_score: 42,
          factors: {
            rainfall_intensity:  { weight: 30, score: 58 },
            soil_saturation:     { weight: 25, score: 44 },
            river_level:         { weight: 20, score: 68, current_m: 4.1, danger_threshold_m: 6.0 },
            infrastructure_risk: { weight: 15, score: 32 },
            elevation_slope:     { weight: 10, score: 68 },
          },
        });
      })
      .finally(() => setLoading(false));
  }, [selectedGrid]);

  const composite = assessment?.composite_score ?? 0;

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Risk Assessment</div>
          <div className="topbar-subtitle">5-Factor weighted flood risk breakdown by Traditional Authority</div>
        </div>
      </div>

      {/* TA Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TA_ZONES.map(g => (
          <button
            key={g}
            className={`btn ${selectedGrid === g ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedGrid(g)}
          >
            {TA_LABELS[g]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading assessment...</div>
      ) : assessment && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

          {/* Composite Score Gauge */}
          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="card-title">Composite Risk Score</div>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              background: `conic-gradient(${scoreColor(composite)} ${composite * 3.6}deg, var(--border) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 8px var(--bg-card)`,
              position: 'relative',
            }}>
              <div style={{
                width: 108, height: 108, borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: scoreColor(composite) }}>{composite}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{TA_LABELS[selectedGrid]}</div>
              <span className={`badge badge-${composite >= 60 ? 'high' : composite >= 30 ? 'medium' : 'low'}`} style={{ marginTop: 6 }}>
                <span className={`badge-dot ${composite >= 60 ? 'pulse' : ''}`} />
                {composite >= 60 ? 'HIGH' : composite >= 30 ? 'MEDIUM' : 'LOW'} RISK
              </span>
            </div>
          </div>

          {/* 5-Factor Breakdown */}
          <div className="card">
            <div className="card-title">Factor Breakdown</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(assessment.factors).map(([key, factor]) => {
                const meta = FACTOR_LABELS[key];
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.icon} {meta.label}</span>
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 7px', borderRadius: 999 }}>
                          Weight: {factor.weight}%
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: scoreColor(factor.score) }}>
                        {factor.score}/100
                      </span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${factor.score}%`, background: scoreColor(factor.score) }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{meta.desc}</div>
                    {key === 'river_level' && factor.current_m != null && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Current: {factor.current_m}m / Danger: {factor.danger_threshold_m}m
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
