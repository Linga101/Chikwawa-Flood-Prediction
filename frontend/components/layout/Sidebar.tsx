'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { LayoutDashboard, Map, LineChart, BellRing, ShieldAlert, Sun, Moon, LogOut, Users } from 'lucide-react';

const navItems = [
  { href: '/dashboard',  icon: <LayoutDashboard size={18} />, label: 'Dashboard'       },
  { href: '/map',        icon: <Map size={18} />,             label: 'Interactive Map' },
  { href: '/history',    icon: <LineChart size={18} />,       label: 'Historical Data'  },
  { href: '/alerts',     icon: <BellRing size={18} />,        label: 'Real-time Alerts' },
  { href: '/risk',       icon: <ShieldAlert size={18} />,     label: 'Risk Assessment' },
];

const adminItems = [
  { href: '/contacts',   icon: <Users size={18} />,           label: 'Contacts Database' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { logout, isAuthenticated } = useAuth();

  // Don't render the sidebar on the login page
  if (pathname === '/login') return null;

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
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 24 }}>Administration</div>
        {adminItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer — Theme Toggle */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="theme-toggle" onClick={toggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {theme === 'dark' ? <><Sun size={16}/> Light Mode</> : <><Moon size={16}/> Dark Mode</>}
        </button>
        
        {isAuthenticated && (
          <button 
            className="btn btn-ghost" 
            onClick={logout} 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--risk-high)' }}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
        
        <p style={{ fontSize: 11, color: '#475569', marginTop: 10, textAlign: 'center' }}>
          © 2026 Chikwawa FRS v1.0
        </p>
      </div>
    </aside>
  );
}
