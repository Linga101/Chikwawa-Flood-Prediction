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

export default function AlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [search, setSearch] = useState('');

  // Broadcast state
  const [targetTA, setTargetTA] = useState(TA_ZONES[0]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{success: boolean, msg: string} | null>(null);

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

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/v1/alerts/broadcast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ ta_area: targetTA, message: broadcastMsg }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Broadcast failed');

      setBroadcastResult({ 
        success: true, 
        msg: `Sent successfully to ${data.successful_sends} out of ${data.total_subscribers} subscribers in ${targetTA}.` 
      });
      setBroadcastMsg('');
    } catch (err: any) {
      setBroadcastResult({ success: false, msg: err.message });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filtered = alerts.filter(a => {
    const matchFilter = filter === 'ALL' || a.level === filter;
    const matchSearch = a.location.toLowerCase().includes(search.toLowerCase()) ||
                        a.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* LEFT COL: Live Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('ALL')}>
              All <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{alerts.length}</span>
            </button>
            <button className={`btn ${filter === 'HIGH' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('HIGH')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertOctagon size={16} /> High
            </button>
            <button className={`btn ${filter === 'MEDIUM' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('MEDIUM')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> Medium
            </button>
            <button className={`btn ${filter === 'LOW' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('LOW')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Low
            </button>
            
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
              <input
                placeholder="Search alerts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px 8px 32px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none', minWidth: 200
                }}
              />
            </div>
            <button className="btn btn-ghost" onClick={markAllRead}>
               <CheckCircle2 size={16} style={{ marginRight: 6 }} /> Mark all read
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
                  <div key={alert.id} style={{
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
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a))}>
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
