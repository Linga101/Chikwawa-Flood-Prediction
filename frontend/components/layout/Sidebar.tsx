'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';

const navItems = [
  { href: '/dashboard',  icon: '📊', label: 'Dashboard'       },
  { href: '/map',        icon: '🗺️',  label: 'Interactive Map' },
  { href: '/history',    icon: '📈', label: 'Historical Data'  },
  { href: '/alerts',     icon: '🔔', label: 'Real-time Alerts' },
  { href: '/risk',       icon: '⚠️',  label: 'Risk Assessment' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img 
          src="/logo.svg" 
          alt="Chikwawa FRS Logo" 
          width={32} 
          height={32} 
          style={{ display: 'block', flexShrink: 0 }}
        />
        <div>
          <div className="logo-text">Chikwawa FRS</div>
          <div className="logo-sub">Flood Risk System</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Monitoring</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer — Theme Toggle */}
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggle} style={{ width: '100%' }}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <p style={{ fontSize: 11, color: '#475569', marginTop: 10, textAlign: 'center' }}>
          © 2025 Chikwawa FRS v1.0
        </p>
      </div>
    </aside>
  );
}
