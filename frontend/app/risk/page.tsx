'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  Leaf, Mountain, Waves, FlaskConical, Trees,
  Navigation, ArrowDownToLine, CloudRain, Droplets,
  Satellite, Database, Zap
} from 'lucide-react';

interface Factor {
  label:               string;
  weight:              number;
  score:               number;
  note?:               string;
  source?:             string;
  is_live?:            boolean;
  current_m?:          number;
  danger_threshold_m?: number;
}

interface Assessment {
  grid_id:         string;
  composite_score: number;
  ml_probability:  number;
  factors:         Record<string, Factor>;
}

// Icon map keyed on the factor key returned by the backend
const FACTOR_ICONS: Record<string, React.ReactNode> = {
  ndvi:                   <Leaf size={15} />,
  slope:                  <Mountain size={15} />,
  elevation_to_river:     <Waves size={15} />,
  soil_type:              <FlaskConical size={15} />,
  land_cover:             <Trees size={15} />,
  dist_river:             <Navigation size={15} />,
  elevation:              <ArrowDownToLine size={15} />,
  rainfall:               <CloudRain size={15} />,
  topographic_wet_index:  <Droplets size={15} />,
};

function scoreColor(score: number) {
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 30) return 'var(--risk-med)';
  return 'var(--risk-low)';
}

const TA_ZONES = ['TA Ngabu', 'TA Makhwira', 'TA Lundu', 'TA Kasisi', 'TA Chapananga'];

export default function RiskPage() {
  const [selectedGrid, setSelectedGrid] = useState(TA_ZONES[0]);
  const [assessment,   setAssessment]   = useState<Assessment | null>(null);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/v1/risk/${encodeURIComponent(selectedGrid)}/assessment`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setAssessment)
      .catch(() => setAssessment(null))
      .finally(() => setLoading(false));
  }, [selectedGrid]);

  const composite = assessment?.composite_score ?? 0;
  const factors   = assessment ? Object.entries(assessment.factors) : [];

  // Sort: live factors first, then by weight descending
  const sorted = [...factors].sort(([, a], [, b]) => {
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    return b.weight - a.weight;
  });

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Risk Assessment</div>
          <div className="topbar-subtitle">
            9-Factor LightGBM feature breakdown by Traditional Authority — weights derived from model gain scores
          </div>
        </div>
      </div>

      {/* TA Selector */}
      <div className="risk-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TA_ZONES.map(g => (
          <button
            key={g}
            className={`btn ${selectedGrid === g ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedGrid(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading assessment…
        </div>
      ) : !assessment ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          Could not load assessment data. Make sure the backend is running.
        </div>
      ) : (
        <div className="two-col-responsive risk-grid">

          {/* ── Composite Score Gauge ─────────────────────────────────────── */}
          <div className="card risk-gauge-card" style={{
            textAlign: 'center', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div className="card-title">Composite Risk Score</div>

            {/* Conic-gradient dial */}
            <div style={{
              width: 148, height: 148, borderRadius: '50%',
              background: `conic-gradient(${scoreColor(composite)} ${composite * 3.6}deg, var(--border) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 8px var(--bg-card), 0 0 24px ${scoreColor(composite)}44`,
            }}>
              <div style={{
                width: 112, height: 112, borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(composite) }}>
                  {composite}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedGrid}</div>
              <span
                className={`badge badge-${composite >= 60 ? 'high' : composite >= 30 ? 'medium' : 'low'}`}
                style={{ marginTop: 6 }}
              >
                <span className={`badge-dot ${composite >= 60 ? 'pulse' : ''}`} />
                {composite >= 60 ? 'HIGH' : composite >= 30 ? 'MEDIUM' : 'LOW'} RISK
              </span>
            </div>

            {/* ML probability */}
            <div style={{
              width: '100%', background: 'var(--bg-secondary)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 12, color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} /> LightGBM Prob.
                </span>
                <span style={{ fontWeight: 700, color: scoreColor(composite) }}>
                  {((assessment.ml_probability ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                ML model is authoritative source
              </div>
            </div>

            {/* Legend */}
            <div style={{ width: '100%', fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                Live sensor data
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                Static terrain data
              </div>
            </div>
          </div>

          {/* ── 9-Factor Breakdown ────────────────────────────────────────── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="card-title" style={{ margin: 0 }}>Factor Breakdown</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Satellite size={12} /> 9 features · sorted by live → weight
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {sorted.map(([key, factor]) => (
                <div key={key}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 13 }}>
                        {FACTOR_ICONS[key]}
                        {factor.label}
                      </span>

                      {/* Weight badge */}
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        background: 'var(--bg-secondary)',
                        padding: '2px 7px', borderRadius: 999,
                      }}>
                        Weight: {factor.weight}%
                      </span>

                      {/* Live / Static badge */}
                      {factor.is_live ? (
                        <span style={{
                          fontSize: 10, color: '#16a34a',
                          background: 'rgba(22,163,74,0.12)',
                          padding: '2px 7px', borderRadius: 999,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#16a34a', display: 'inline-block',
                            animation: 'pulse 1.5s infinite',
                          }} />
                          LIVE
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 10, color: 'var(--text-muted)',
                          background: 'var(--bg-secondary)',
                          padding: '2px 7px', borderRadius: 999,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Database size={9} /> STATIC
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <span style={{ fontWeight: 700, fontSize: 14, color: scoreColor(factor.score), whiteSpace: 'nowrap' }}>
                      {factor.score}/100
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar-track" style={{ height: 7, borderRadius: 999, marginBottom: 5 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${factor.score}%`,
                        background: scoreColor(factor.score),
                        borderRadius: 999,
                        transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    />
                  </div>

                  {/* Note */}
                  {factor.note && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {factor.note}
                    </div>
                  )}

                  {/* River level extra detail */}
                  {key === 'elevation_to_river' && factor.current_m != null && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12 }}>
                      <span>Current river: <strong>{factor.current_m}m</strong></span>
                      <span>Danger: <strong style={{ color: 'var(--risk-high)' }}>{factor.danger_threshold_m}m</strong></span>
                    </div>
                  )}

                  {/* Source tag */}
                  {factor.source && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, opacity: 0.75 }}>
                      Source: {factor.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
