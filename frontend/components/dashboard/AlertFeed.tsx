'use client';

interface Alert {
  id: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  message: string;
  time: string;
}

interface AlertFeedProps {
  alerts: Alert[];
}

const ICONS: Record<string, string> = {
  HIGH:   '🚨',
  MEDIUM: '⚠️',
  LOW:    '✅',
};

export default function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
        <div style={{ fontSize: 13 }}>Waiting for live data...</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Alerts will appear here when the system detects a risk change.</div>
      </div>
    );
  }

  return (
    <div className="alert-feed" style={{ maxHeight: 480, overflowY: 'auto' }}>
      {alerts.map(alert => (
        <div key={alert.id} className="alert-item">
          <div className="alert-icon">{ICONS[alert.level] ?? '📍'}</div>
          <div className="alert-body">
            <div className="alert-title">
              {alert.location}
              <span
                className={`badge badge-${alert.level.toLowerCase()}`}
                style={{ marginLeft: 8 }}
              >
                <span className={`badge-dot ${alert.level === 'HIGH' ? 'pulse' : ''}`} />
                {alert.level}
              </span>
            </div>
            <div className="alert-desc">{alert.message}</div>
            <div className="alert-time">{alert.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
