import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFixtureSource } from './data';
import type { ClientDataSource, EventImportRow } from './data';
import { OctroApiClient, type EconomicEventPayload } from './api';
import { useAuth } from './auth';

export type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'stale' | 'unavailable' | 'no-solution';

type Session = {
    language: 'fr' | 'en';
    setLanguage: (v: 'fr' | 'en') => void;
    state: DemoState;
    setState: (v: DemoState) => void;
    persona: 'personal' | 'independent' | 'organization';
    setPersona: (v: 'personal' | 'independent' | 'organization') => void;
    source: ClientDataSource;
    isOnline: boolean;
    t: (fr: string, en: string) => string;
};

const Context = createContext<Session | null>(null);

export function workspaceQueryKey(userId: string | null, authenticated: boolean) {
    return ['workspace', userId ?? 'anonymous', authenticated ? 'authenticated' : 'discovery', 'personal-forecast-v1'] as const;
}

export function SessionProvider({ children, source: provided }: {
    children: React.ReactNode;
    source?: ClientDataSource;
}) {
    const auth = useAuth();
    const identityKey = `${auth.user?.id ?? 'anonymous'}:${auth.token ? 'authenticated' : 'discovery'}`;
    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                retry: 1,
                staleTime: 1000 * 60 * 5,
                gcTime: 1000 * 60 * 60 * 24,
                networkMode: 'offlineFirst',
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 0,
                networkMode: 'offlineFirst',
            },
        },
    }));
    const source = useMemo(() => {
        if (provided) return provided;
        if (!auth.token) return createFixtureSource();
        const token = auth.token;
        return createFixtureSource(new OctroApiClient(fetch, () => token));
    }, [provided, auth.token]);
    useEffect(() => {
        // Never retain cached workspace data across login/logout or account switches.
        void client.removeQueries({ queryKey: ['workspace'] });
    }, [client, identityKey]);
    const [language, setLanguage] = useState<'fr' | 'en'>('fr');
    const [state, setState] = useState<DemoState>('ready');
    const [persona, setPersona] = useState<Session['persona']>('personal');
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <QueryClientProvider client={client}>
            <Context.Provider value={{ language, setLanguage, state, setState, persona, setPersona, source, isOnline, t: (fr, en) => language === 'fr' ? fr : en }}>
                {children}
            </Context.Provider>
        </QueryClientProvider>
    );
}

export function useSession() {
    const value = useContext(Context);
    if (!value) throw new Error('SessionProvider missing');
    return value;
}

function useWorkspaceQueryKey() {
    const { user, token } = useAuth();
    return workspaceQueryKey(user?.id ?? null, token !== null);
}

export function useClientData() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    return useQuery({
        queryKey,
        queryFn: ({ signal }) => source.read(signal)
    });
}

export function useAcknowledge() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (plan: Parameters<ClientDataSource['acknowledge']>[0]) => source.acknowledge(plan),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useCreateEvent() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (event: EconomicEventPayload) => source.addEvent?.(event) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useImportEvents() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (events: readonly EventImportRow[]) => source.addEvents?.(events) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useRemoveEvent() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (eventId: string) => source.removeEvent?.(eventId) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useResetEvents() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: () => source.resetEvents?.() ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useUpdateBalances() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (params: { current: string; savings: string; reserve?: string; protectedSavings?: string }) =>
            source.updateBalances?.(params.current, params.savings, params.reserve, params.protectedSavings) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

export function useSetHorizon() {
    const { source } = useSession();
    const queryKey = useWorkspaceQueryKey();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (days: number) => source.setHorizon?.(days) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache, queryKey),
        onSuccess: () => cache.invalidateQueries({ queryKey }),
    });
}

function markProjectionStale(cache: ReturnType<typeof useQueryClient>, queryKey: ReturnType<typeof workspaceQueryKey>) {
    cache.setQueryData<import('./data').ClientSnapshot>(queryKey, old => old ? {
        ...old,
        result: null,
        plan: null,
        sourceState: 'stale',
        sourceMessage: 'Les données ont changé. La projection attend un nouveau calcul serveur.',
    } : old);
}
