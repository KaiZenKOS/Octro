import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// URL de l'API reelle (Phases A-F). Variable Expo publique (inlinee au
// build) — jamais un secret, juste l'adresse du serveur.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'octro_token';

export interface AuthUser {
  id: string;
  email: string;
  email_verified_at: string | null;
}

interface AuthValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
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

// Stockage best-effort (web uniquement) : une session perdue au refresh
// n'est qu'un desagrement, jamais une donnee qui doit persister a coup sur.
function readStoredToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}
function writeStoredToken(token: string | null) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function fetchMe(token: string): Promise<AuthUser> {
  return parseJsonOrThrow(await fetch(`${API_BASE_URL}/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } }));
}

// Compose a cote de SessionProvider (fixture Lina), pas a sa place : ce
// contexte ne porte que le compte reel (auth/KYC/credit/lending), jamais le
// commutateur d'etats de demo existant.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Mot de passe garde en memoire (jamais persiste) entre l'inscription et
  // la verification, pour connecter automatiquement une fois le code valide
  // — evite de redemander une connexion juste apres l'inscription.
  const pendingLogin = useRef<{ email: string; password: string } | null>(null);

  // Rehydrate la session au chargement (refresh de page) : un jeton stocke
  // ne doit pas obliger a se reconnecter tant qu'il reste valide.
  useEffect(() => {
    const stored = readStoredToken();
    if (!stored) {
      setReady(true);
      return;
    }
    fetchMe(stored)
      .then((me) => {
        setToken(stored);
        setUser(me);
      })
      .catch(() => writeStoredToken(null))
      .finally(() => setReady(true));
  }, []);

  const applySession = useCallback((sessionToken: string, me: AuthUser) => {
    writeStoredToken(sessionToken);
    setToken(sessionToken);
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await parseJsonOrThrow(
        await fetch(`${API_BASE_URL}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );
      const me = await fetchMe(session.token);
      applySession(session.token, me);
      return me;
    },
    [applySession],
  );

  const signUp = useCallback(async (email: string, password: string) => {
    const created: AuthUser = await parseJsonOrThrow(
      await fetch(`${API_BASE_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    );
    pendingLogin.current = { email, password };
    setUser(created);
    return created;
  }, []);

  const verifyEmail = useCallback(
    async (userId: string, code: string) => {
      const verified: AuthUser = await parseJsonOrThrow(
        await fetch(`${API_BASE_URL}/v1/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, code }),
        }),
      );
      // Connecte directement plutot que de redemander un mot de passe deja
      // saisi a l'inscription.
      if (pendingLogin.current && pendingLogin.current.email === verified.email) {
        const { password } = pendingLogin.current;
        pendingLogin.current = null;
        return login(verified.email, password);
      }
      setUser(verified);
      return verified;
    },
    [login],
  );

  const logout = useCallback(() => {
    writeStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return <Context.Provider value={{ user, token, ready, signUp, verifyEmail, login, logout }}>{children}</Context.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
