'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { Users, UserPlus, Phone, MapPin, Trash2, ShieldCheck } from 'lucide-react';

interface Subscriber {
  id: number;
  phone_number: string;
  ta_area: string;
  is_active: boolean;
}

const TA_ZONES = ['TA Ngabu', 'TA Makhwira', 'TA Lundu', 'TA Kasisi', 'TA Chapananga'];

export default function ContactsPage() {
  const { token } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [phone, setPhone] = useState('');
  const [taArea, setTaArea] = useState(TA_ZONES[0]);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/subscribers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchSubscribers();
  }, [token]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/subscribers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone_number: phone, ta_area: taArea }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to add subscriber');
      }

      setSubmitSuccess(true);
      setPhone('');
      fetchSubscribers();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1/subscribers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setSubscribers(prev => prev.filter(sub => sub.id !== id));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Resident Contacts Directory</div>
          <div className="topbar-subtitle">Manage emergency broadcast recipients ({subscribers.length} total)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* ADD CONTACT FORM */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} /> Add New Contact
          </div>
          
          <form onSubmit={handleAddSubscriber} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            {submitError && <div style={{ color: 'var(--risk-high)', fontSize: 13 }}>{submitError}</div>}
            {submitSuccess && <div style={{ color: 'var(--risk-low)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} /> Contact registered</div>}
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  placeholder="+265..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-main)', color: 'var(--text-primary)',
                    outline: 'none', fontSize: 13
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Traditional Authority (TA)</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <select
                  value={taArea}
                  onChange={(e) => setTaArea(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-main)', color: 'var(--text-primary)',
                    outline: 'none', fontSize: 13, appearance: 'none'
                  }}
                >
                  {TA_ZONES.map(ta => (
                    <option key={ta} value={ta}>{ta}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 8 }}>
              {isSubmitting ? 'Registering...' : 'Register Contact'}
            </button>
          </form>
        </div>

        {/* CONTACTS LIST */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={18} /> Registered Residents
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading contacts...</div>
          ) : subscribers.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 8 }}>
              <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>No contacts found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add residents to enable targeted SMS alerts.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Phone Number</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>TA Area</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{sub.phone_number}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} color="var(--brand-cyan)" /> {sub.ta_area}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {sub.is_active ? 
                          <span className="badge badge-low"><span className="badge-dot" /> ACTIVE</span> : 
                          <span className="badge badge-medium"><span className="badge-dot" /> INACTIVE</span>
                        }
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ padding: '6px 10px', color: 'var(--risk-high)' }}
                          onClick={() => handleDelete(sub.id)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
