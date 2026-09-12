import React, { createContext, useCallback, useContext, useState } from 'react';
import { API_BASE_URL } from './api';

export { API_BASE_URL } from './api';

export interface AuthUser {
  id: string;
  email: string;
  email_verified_at: string | null;
}

interface AuthValue {
  user: AuthUser | null;
  token: string | null;
  signUp: (email: string, password: string) => Promise<AuthUser>;
  verifyEmail: (userId: string, code: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const Context = createContext<AuthValue | null>(null);

async function parseJsonOrThrow(response: Response): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : `HTTP ${response.status}`);
  }
  return body;
}

// Compose a cote de SessionProvider (fixture Lina), pas a sa place : ce
// contexte ne porte que le compte reel (auth/KYC/credit/lending), jamais le
// commutateur d'etats de demo existant.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const created: AuthUser = await parseJsonOrThrow(response);
    setToken(null);
    setUser(created);
    return created;
  }, []);

  const verifyEmail = useCallback(async (userId: string, code: string) => {
    const response = await fetch(`${API_BASE_URL}/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    });
    const verified: AuthUser = await parseJsonOrThrow(response);
    setToken(null);
    setUser(verified);
    return verified;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const session = await parseJsonOrThrow(response);
    const meResponse = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const me: AuthUser = await parseJsonOrThrow(meResponse);
    setToken(session.token);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <Context.Provider value={{ user, token, signUp, verifyEmail, login, logout }}>{children}</Context.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
