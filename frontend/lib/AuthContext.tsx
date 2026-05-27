'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Read from localStorage on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Protect routes
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else if (token && pathname === '/login') {
      router.push('/dashboard');
    }
  }, [token, pathname, router, mounted]);

  const login = (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    router.push('/login');
  };

  // Prevent hydration mismatch by not rendering protected content until mounted
  if (!mounted) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
