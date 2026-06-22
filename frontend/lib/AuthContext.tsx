'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  /**
   * A fetch wrapper that automatically attaches the Bearer token.
   * If the server returns 401/403 it clears the stored token and
   * redirects the user to the landing/login page.
   */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  authFetch: (input, init) => fetch(input, init),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken]   = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  // Hydrate token from localStorage on first render
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) setToken(storedToken);
    setMounted(true);
  }, []);

  const PUBLIC_ROUTES = ['/', '/login'];

  // Route guard
  useEffect(() => {
    if (!mounted) return;
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!token && !isPublic) router.push('/');
    else if (token && isPublic) router.push('/dashboard');
  }, [token, pathname, router, mounted]);

  const login = (newToken: string) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    router.push('/dashboard');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    router.push('/');
  }, [router]);

  /**
   * Wraps fetch() with:
   *  - Automatic Authorization header injection
   *  - Auto-logout + redirect on 401/403 (stale / invalid token)
   */
  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers ?? {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — force re-login
        logout();
      }
      return res;
    },
    [token, logout]
  );

  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
        {children}
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
