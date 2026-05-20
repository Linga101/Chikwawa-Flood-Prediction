'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface DayData {
  date: string;
  rainfall_mm: number;
  peak_mm: number;
}

interface RainfallChartProps {
  window?: 7 | 30;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ color: 'var(--brand-cyan)' }}>Avg: {payload[0]?.value} mm</div>
        <div style={{ color: 'var(--risk-high)' }}>Peak: {payload[1]?.value} mm</div>
      </div>
    );
  }
  return null;
};

export default function RainfallChart({ window = 7 }: RainfallChartProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/charts/rainfall-trends?window=${window}`)
      .then(r => r.json())
      .then((d: DayData[]) => {
        // Format dates for display
        const formatted = d.map(row => ({
          ...row,
          date: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        }));
        setData(formatted);
      })
      .catch(() => {
        // Fallback demo data when backend is unavailable
        setData(Array.from({ length: window }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (window - 1 - i));
          return {
            date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            rainfall_mm: Math.round(10 + Math.random() * 60),
            peak_mm:     Math.round(30 + Math.random() * 91),
          };
        }));
      })
      .finally(() => setLoading(false));
  }, [window]);

  if (loading) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading chart data...
      </div>
    );
  }

  const avgRainfall = data.length
    ? Math.round(data.reduce((s, d) => s + d.rainfall_mm, 0) / data.length)
    : 0;

  const peakRainfall = data.length
    ? Math.max(...data.map(d => d.peak_mm))
    : 0;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Average</span>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-cyan)' }}>{avgRainfall} mm</div>
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Peak</span>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--risk-high)' }}>{peakRainfall} mm</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit=" mm" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avgRainfall} stroke="var(--brand-cyan)" strokeDasharray="4 4" />
          <Bar dataKey="rainfall_mm" name="Avg Rainfall" fill="var(--brand-cyan)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
          <Bar dataKey="peak_mm"     name="Peak"         fill="var(--risk-high)"  radius={[4, 4, 0, 0]} fillOpacity={0.4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
