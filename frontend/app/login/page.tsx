'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Lock, User, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      login(data.access_token);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: 20
    }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 40, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ 
            width: 56, height: 56, borderRadius: 16, 
            background: 'var(--brand-blue)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white'
          }}>
            <ShieldAlert size={32} />
          </div>
        </div>
        
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Chikwawa FRS</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
          Disaster Management Portal
        </p>

        {error && (
          <div style={{ 
            background: 'var(--risk-high-bg)', 
            color: 'var(--risk-high)', 
            padding: '10px 14px', 
            borderRadius: 8, 
            fontSize: 13, 
            marginBottom: 20,
            border: '1px solid var(--risk-high)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none'
              }}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontSize: 14, outline: 'none'
              }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: '12px', fontSize: 14, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
