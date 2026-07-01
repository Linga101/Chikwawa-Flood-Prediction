'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { API_URL } from '@/lib/config';
import {
  ShieldAlert, Activity, Map, Bell, BarChart2,
  Lock, User, ArrowRight, Droplets, Satellite,
  AlertTriangle, ChevronDown, Zap, Globe, Users
} from 'lucide-react';
import styles from './landing.module.css';

// ── Animated flood-level bar ──────────────────────────────────────────────
function FloodBar({ label, pct, color, delay }: { label: string; pct: number; color: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 400 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className={styles.floodBarWrap}>
      <div className={styles.floodBarHeader}>
        <span>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className={styles.floodBarTrack}>
        <div
          className={styles.floodBarFill}
          style={{ width: `${width}%`, background: color, transition: `width 1.2s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }}
        />
      </div>
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Main Landing Page ─────────────────────────────────────────────────────
export default function LandingPage() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Navbar shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Rotate feature highlight every 3s
  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 4), 3000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      if (!res.ok) throw new Error('Invalid credentials. Please try again.');
      const data = await res.json();
      login(data.access_token);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Satellite size={22} />, title: 'Satellite Intelligence', desc: 'Live GPM rainfall, SMAP soil moisture, and Sentinel-2 NDVI pulled directly from NASA and ESA satellite archives via Google Earth Engine.' },
    { icon: <Zap size={22} />, title: 'LightGBM Predictions', desc: 'A retrained gradient-boosted ML model runs every 6 hours, scoring all 5 Traditional Authority zones with probabilistic flood risk (0–100%).' },
    { icon: <Bell size={22} />, title: 'Human-Gated Alerts', desc: 'The system surfaces risk to a human operator first. SMS alerts to village headmen and DCCM officials are only dispatched after manual approval.' },
    { icon: <Map size={22} />, title: 'Geo-Restricted Mapping', desc: 'An interactive Leaflet map locked to Chikwawa District shows risk circles aligned with the real GPS centroids of each TA zone.' },
  ];

  const stats = [
    { value: 5, suffix: '', label: 'TA Zones Monitored', icon: <Globe size={20} /> },
    { value: 3, suffix: '', label: 'Risk Tier System', icon: <AlertTriangle size={20} /> },
    { value: 6, suffix: 'hr', label: 'Prediction Cycle', icon: <Activity size={20} /> },
    { value: 11, suffix: 'k+', label: 'People Protected', icon: <Users size={20} /> },
  ];

  // Live zone risk data fetched from backend
  const [zones, setZones] = useState<{ name: string; pct: number; color: string }[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/risk/latest-risk`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        // data is array of { grid_id, probability, risk_level, ... }
        const mapped = data
          .map((p: any) => ({
            name: p.grid_id,
            pct: Math.round(p.probability * 100),
            color: p.risk_level === 'HIGH' ? '#ef4444'
              : p.risk_level === 'MEDIUM' ? '#d97706'
                : '#16a34a',
          }))
          .sort((a: any, b: any) => b.pct - a.pct); // highest risk first
        setZones(mapped);
      } catch {
        // fallback: show nothing rather than stale hardcoded data
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchPredictions();
    // Refresh every 5 minutes to stay in sync with Celery
    const interval = setInterval(fetchPredictions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.page}>

      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <div className={styles.navLogo}>
              <img src="/icon.png" alt="Chikwawa FRS" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
            </div>
            <span>Chikwawa <strong>FRS</strong></span>
          </div>
          <div className={styles.navLinks}>

            <a href="#stats">Impact</a>
            <a href="#login" className={styles.navCta}>Access System →</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        {/* Animated background grid */}
        <div className={styles.heroGrid} aria-hidden />
        {/* Glowing orbs */}
        <div className={styles.orb1} aria-hidden />
        <div className={styles.orb2} aria-hidden />
        <div className={styles.orb3} aria-hidden />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.liveDot} />
            System Live — Chikwawa District, Malawi
          </div>

          <h1 className={styles.heroTitle}>
            Flood Risk Intelligence<br />
            <span className={styles.heroGradient}>Saving Lives in Real Time</span>
          </h1>

          <p className={styles.heroSub}>
            An AI-powered early warning system
            aimed at protecting communities across Chikwawa District from devastating floods.
          </p>

          <div className={styles.heroCtas}>
            <a href="#login" className={styles.ctaPrimary}>
              Access Dashboard <ArrowRight size={18} />
            </a>
          </div>

          {/* Live mini-dashboard preview */}
          <div className={styles.heroPreview}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <span className={styles.previewTitle}>Live Risk Overview</span>
              <span className={styles.previewLive}><Activity size={12} /> LIVE</span>
            </div>
            <div className={styles.previewBody}>
              {zonesLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem', fontSize: '0.85rem' }}>
                  Loading live predictions…
                </div>
              ) : zones.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem', fontSize: '0.85rem' }}>
                  No predictions available
                </div>
              ) : (
                zones.map((z, i) => (
                  <FloodBar key={z.name} label={z.name} pct={z.pct} color={z.color} delay={i * 150} />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────── */}
      <section id="stats" className={styles.statsStrip}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statItem}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>
              <Counter target={s.value} suffix={s.suffix} />
            </div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}


      {/* ── LOGIN ───────────────────────────────────────────────── */}
      <section id="login" className={styles.loginSection}>
        <div className={styles.loginGlow} aria-hidden />

        <div className={styles.loginLeft}>
          <div className={styles.sectionLabel}><Lock size={14} /> Secure Access</div>
          <h2 className={styles.loginTitle}>
            Ready to Monitor<br />Chikwawa?
          </h2>
          <p className={styles.loginDesc}>
            Access is restricted to authorised Chikwawa District Council for Disaster Management (DCCM)
            officials and approved field coordinators.
          </p>
          <ul className={styles.loginFeatures}>
            {[
              'Real-time ML flood predictions',
              'Interactive district hazard map',
              'Human-approved SMS alert dispatch',
              'Full historical event audit trail',
            ].map((f, i) => (
              <li key={i}>
                <span className={styles.loginCheck}>✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.loginCard}>
          <div className={styles.loginCardHeader}>
            <div className={styles.loginCardLogo}>
              <img src="/icon.png" alt="Chikwawa FRS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h3>Chikwawa FRS</h3>
            <p>Flood Risk Surveillance System</p>
          </div>

          {error && (
            <div className={styles.loginError}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.inputIcon} />
              <input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={styles.input}
                required
                autoComplete="username"
              />
            </div>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className={styles.loginBtn}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <><Lock size={16} /> Access System</>
              )}
            </button>
          </form>

          <p className={styles.loginHint}>
            Authorised DCCM personnel only. All access is logged.
          </p>
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            Default credentials — username: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>admin</strong>
            &nbsp;/ password: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>dccm2026</strong>
          </div>

        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src="/icon.png" alt="Chikwawa FRS" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span>Chikwawa Flood Risk Surveillance System</span>
          </div>
          <p className={styles.footerSub}>
            Developed by Mzuni Data Science students · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
