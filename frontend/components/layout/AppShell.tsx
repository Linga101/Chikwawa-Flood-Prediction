'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Menu, Droplets } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`sidebar-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
        <Sidebar />
      </div>

      <main className="main-content">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-menu-btn">
            <Menu size={24} />
          </button>
          <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Droplets size={20} color="var(--brand-cyan)" /> Chikwawa FRS
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
