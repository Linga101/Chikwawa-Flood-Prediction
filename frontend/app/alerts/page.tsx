'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { 
  AlertOctagon, AlertTriangle, CheckCircle2, 
  Search, Send, Clock, Radio, MessageSquare, MapPin, Activity
} from 'lucide-react';

interface Alert {
  id: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  message: string;
  time: string;
  read: boolean;
}

const TA_ZONES = ['TA Ngabu', 'TA Makhwira', 'TA Lundu', 'TA Kasisi', 'TA Chapananga'];

function classifyRisk(prob: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (prob >= 0.6) return 'HIGH';
  if (prob >= 0.3) return 'MEDIUM';
  return 'LOW';
}

export default function AlertsPage() {
  const { authFetch } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [search, setSearch] = useState('');

  // Live risk lookup (keyed by TA name → probability 0–1)
  const [zoneProbMap, setZoneProbMap] = useState<Record<string, number>>({});

  // Broadcast state
  const [targetTA, setTargetTA] = useState(TA_ZONES[0]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{success: boolean, msg: string} | null>(null);

  // Derived: actual risk for currently selected TA
  const currentProb  = zoneProbMap[targetTA] ?? 0;
  const currentLevel = classifyRisk(currentProb);
  const riskColor    = currentLevel === 'HIGH' ? 'var(--risk-high)' : currentLevel === 'MEDIUM' ? 'var(--risk-med)' : 'var(--risk-low)';

  const fetchAlerts = () => {
    authFetch('http://localhost:8000/api/v1/alerts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data.map((d: any) => ({
            id:       d.id,
            level:    d.risk_level,
            location: d.ta_area || (d.recipient === 'broadcast' ? 'All Areas' : d.recipient || 'Unknown'),
            message:  d.message || (d.channel === 'SMS' ? 'SMS Alert Dispatched' : 'System Alert'),
            time:     new Date(d.fired_at).toLocaleString(),
            read:     true,
          })));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchAlerts();

    // Fetch live risk probabilities for all TA zones
    fetch('http://localhost:8000/api/v1/risk/latest-risk')
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const map: Record<string, number> = {};
          data.forEach(z => { map[z.grid_id] = z.probability ?? 0; });
          setZoneProbMap(map);
        }
      })
      .catch(() => {});

    const ws = new WebSocket('ws://localhost:8000/api/v1/live-feed');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'RISK_UPDATE') {
          // Update probability map in real-time too
          if (data.location && data.probability !== undefined) {
            setZoneProbMap(prev => ({ ...prev, [data.location]: data.probability }));
          }
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

  const dismissAlert = async (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this alert? This action cannot be undone.")) {
      try {
        const res = await authFetch(`http://localhost:8000/api/v1/alerts/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchAlerts();
        } else {
          alert('Failed to delete alert');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred while deleting the alert.');
      }
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      // Use the real ML-derived risk level for this TA zone
      const prob  = zoneProbMap[targetTA] ?? 0;
      const level = classifyRisk(prob);

      const res = await authFetch('http://localhost:8000/api/v1/alerts/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ta_area: targetTA, message: broadcastMsg, risk_level: level }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Broadcast failed');

      setBroadcastResult({
        success: true,
        msg: `Sent successfully to ${data.successful_sends} out of ${data.total_subscribers} subscribers in ${targetTA}.`
      });
      setBroadcastMsg('');
      // Refresh the alerts feed to show the newly dispatched messages
      fetchAlerts();

    } catch (err: any) {
      setBroadcastResult({ success: false, msg: err.message });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const visible = alerts;
  const filtered  = visible.filter(a => {
    const matchFilter = filter === 'ALL' || a.level === filter;
    const matchSearch = !search.trim() ||
      a.location.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      a.time.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const unreadCount = visible.filter(a => !a.read).length;

  const getIconForLevel = (level: string) => {
    switch (level) {
      case 'HIGH': return <AlertOctagon size={20} color="var(--risk-high)" />;
      case 'MEDIUM': return <AlertTriangle size={20} color="var(--risk-med)" />;
      case 'LOW': return <CheckCircle2 size={20} color="var(--risk-low)" />;
      default: return <Activity size={20} />;
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Real-time Alerts</div>
          <div className="topbar-subtitle">Monitor live warnings and trigger manual SMS broadcasts</div>
        </div>
      </div>

      <div className="two-col-responsive">
        
        {/* LEFT COL: Live Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="alerts-filter-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('ALL')}>
              All <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{visible.length}</span>
            </button>
            <button className={`btn ${filter === 'HIGH' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('HIGH')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertOctagon size={16} /> High
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                {visible.filter(a => a.level === 'HIGH').length}
              </span>
            </button>
            <button className={`btn ${filter === 'MEDIUM' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('MEDIUM')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> Medium
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                {visible.filter(a => a.level === 'MEDIUM').length}
              </span>
            </button>
            <button className={`btn ${filter === 'LOW' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('LOW')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Low
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '1px 6px', fontSize: 11 }}>
                {visible.filter(a => a.level === 'LOW').length}
              </span>
            </button>
            
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              <input
                placeholder="Search by zone, message..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="alerts-search-input"
                style={{
                  padding: '8px 14px 8px 32px', borderRadius: 8,
                  border: `1px solid ${search ? 'var(--brand-blue)' : 'var(--border)'}`,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none', minWidth: 200
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
            <button
              className="btn btn-ghost"
              onClick={markAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: unreadCount === 0 ? 0.4 : 1 }}
              disabled={unreadCount === 0}
              title={unreadCount === 0 ? 'All alerts are already read' : `Mark ${unreadCount} unread alert(s) as read`}
            >
              <CheckCircle2 size={16} /> Mark all read {unreadCount > 0 && <span style={{ background: 'var(--brand-blue)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 10 }}>{unreadCount}</span>}
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, minHeight: 400 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Activity size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No alerts yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>System telemetry will stream in live.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((alert, i) => (
                  <div key={alert.id} className="alert-row" style={{
                    display: 'flex', gap: 14, padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    background: alert.read ? 'transparent' : 'rgba(37,99,235,0.04)',
                    alignItems: 'flex-start', transition: 'background 0.15s'
                  }}>
                    {getIconForLevel(alert.level)}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{alert.location}</span>
                        <span className={`badge badge-${alert.level.toLowerCase()}`}>
                          <span className={`badge-dot ${alert.level === 'HIGH' ? 'pulse' : ''}`} />
                          {alert.level}
                        </span>
                        {!alert.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-blue)', display: 'inline-block' }} />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {alert.time}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '4px 10px', color: 'var(--risk-high)', flexShrink: 0 }}
                      onClick={() => dismissAlert(alert.id)}
                      title="Remove from list"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL: Manual Broadcast UI */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={18} /> Manual SMS Broadcast
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 20 }}>
            Instantly dispatch an emergency SMS text to all registered DCCM officials and village headmen in a specific region.
          </p>

          {broadcastResult && (
            <div style={{ 
              background: broadcastResult.success ? 'var(--risk-low-bg)' : 'var(--risk-high-bg)',
              color: broadcastResult.success ? 'var(--risk-low)' : 'var(--risk-high)',
              padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 16,
              border: `1px solid ${broadcastResult.success ? 'var(--risk-low)' : 'var(--risk-high)'}`
            }}>
              {broadcastResult.msg}
            </div>
          )}

          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Target Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <select
                  value={targetTA}
                  onChange={(e) => setTargetTA(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--bg-main)',
                    color: 'var(--text-primary)', outline: 'none', fontSize: 13, appearance: 'none'
                  }}
                >
                  {TA_ZONES.map(ta => <option key={ta} value={ta}>{ta}</option>)}
                </select>
              </div>
              {/* Live risk indicator for selected zone */}
              <div style={{
                marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 6,
                background: 'var(--bg-main)', border: `1px solid ${riskColor}33`,
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Current ML risk for {targetTA}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>
                    {Math.round(currentProb * 100)}%
                  </span>
                  <span className={`badge badge-${currentLevel.toLowerCase()}`} style={{ fontSize: 10 }}>
                    <span className={`badge-dot${currentLevel === 'HIGH' ? ' pulse' : ''}`} />
                    {currentLevel}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                Alert will be logged as <strong style={{ color: riskColor }}>{currentLevel}</strong> based on the latest ML prediction.
              </p>
            </div>


            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Alert Message</label>
              <div style={{ position: 'relative' }}>
                <MessageSquare size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <textarea
                  placeholder="E.g., WARNING: Immediate evacuation required due to rising river levels..."
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--bg-main)',
                    color: 'var(--text-primary)', outline: 'none', fontSize: 13, minHeight: 90, resize: 'vertical'
                  }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isBroadcasting} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              {isBroadcasting ? 'Broadcasting...' : <>Send Alert <Send size={16} /></>}
            </button>
          </form>
        </div>

      </div>
    </AppShell>
  );
}
