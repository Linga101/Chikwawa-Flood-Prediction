'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import RainfallChart from '@/components/charts/RainfallChart';
import { CloudRain, Waves, History as HistoryIcon, Plus, X, Edit2, Trash2 } from 'lucide-react';

interface RiverStatus {
  river_name: string;
  current_level_m: number;
  warning_threshold_m: number;
  danger_threshold_m: number;
  percent_of_danger: number;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  last_updated: string | null;
}

interface HistoricalEvent {
  id: number;
  year: string;
  event_name: string;
  impact_level: string;
  people_affected: number;
  economic_loss: string;
}

const statusColors: Record<string, string> = {
  SAFE:    'var(--risk-low)',
  WARNING: 'var(--risk-med)',
  DANGER:  'var(--risk-high)',
};

export default function HistoryPage() {
  const [tab, setTab]           = useState<'rainfall' | 'water' | 'events'>('rainfall');
  const [window, setWindow]     = useState<7 | 30>(7);
  const [river, setRiver]       = useState<RiverStatus | null>(null);
  
  const [events, setEvents]     = useState<HistoricalEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    year: '',
    event_name: '',
    impact_level: 'High',
    people_affected: '',
    economic_loss: ''
  });

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

  const fetchEvents = () => {
    fetch('http://localhost:8000/api/v1/charts/historical-events')
      .then(r => r.json())
      .then(data => setEvents(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        people_affected: parseInt(String(formData.people_affected).replace(/,/g, '')) || 0
      };
      
      const url = editingEventId 
        ? `http://localhost:8000/api/v1/charts/historical-events/${editingEventId}`
        : 'http://localhost:8000/api/v1/charts/historical-events';
      
      const method = editingEventId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingEventId(null);
        setFormData({ year: '', event_name: '', impact_level: 'High', people_affected: '', economic_loss: '' });
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (ev: HistoricalEvent) => {
    setFormData({
      year: ev.year,
      event_name: ev.event_name,
      impact_level: ev.impact_level,
      people_affected: String(ev.people_affected),
      economic_loss: ev.economic_loss
    });
    setEditingEventId(ev.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/charts/historical-events/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setFormData({ year: '', event_name: '', impact_level: 'High', people_affected: '', economic_loss: '' });
    setEditingEventId(null);
    setIsModalOpen(true);
  };

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
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {t === 'rainfall' ? <><CloudRain size={16} /> Rainfall Trends</> : t === 'water' ? <><Waves size={16} /> Water Levels</> : <><HistoryIcon size={16} /> Historical Events</>}
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
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Waves size={20} /> {river.river_name}
            </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HistoryIcon size={20} /> Past Flood Events — Chikwawa District
            </div>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} /> Add Event
            </button>
          </div>
          
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                  {['Year', 'Event', 'Impact', 'People Affected', 'Economic Loss', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No historical events recorded.
                    </td>
                  </tr>
                ) : events.map(ev => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ev.year}</td>
                    <td style={{ padding: '10px 12px' }}>{ev.event_name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge badge-${ev.impact_level === 'High' ? 'high' : ev.impact_level === 'Medium' ? 'medium' : 'low'}`}>
                        <span className="badge-dot" />{ev.impact_level}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{ev.people_affected.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>{ev.economic_loss}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--brand-blue)' }} onClick={() => handleEdit(ev)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--risk-high)' }} onClick={() => handleDelete(ev.id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: 20 }}>{editingEventId ? 'Edit Historical Event' : 'Add Historical Event'}</h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Year</label>
                <input 
                  type="text" required
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Event Name</label>
                <input 
                  type="text" required
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  value={formData.event_name} onChange={e => setFormData({...formData, event_name: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Impact Level</label>
                <select 
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  value={formData.impact_level} onChange={e => setFormData({...formData, impact_level: e.target.value})}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>People Affected</label>
                <input 
                  type="number" required
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  value={formData.people_affected} onChange={e => setFormData({...formData, people_affected: e.target.value})} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500 }}>Economic Loss (e.g., $2.4M)</label>
                <input 
                  type="text" required
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  value={formData.economic_loss} onChange={e => setFormData({...formData, economic_loss: e.target.value})} 
                />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
                Save Event
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
