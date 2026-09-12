import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFixtureSource } from './data';
import type { ClientDataSource } from './data';
import type { EconomicEventPayload } from './api';

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

export function SessionProvider({ children, source: provided }: {
    children: React.ReactNode;
    source?: ClientDataSource;
}) {
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
    const [source] = useState(() => provided ?? createFixtureSource());
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

export function useClientData() {
    const { source } = useSession();
    return useQuery({
        queryKey: ['workspace', 'lina-fixture-v1'],
        queryFn: ({ signal }) => source.read(signal)
    });
}

export function useAcknowledge() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (plan: Parameters<ClientDataSource['acknowledge']>[0]) => source.acknowledge(plan),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useCreateEvent() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (event: EconomicEventPayload) => source.addEvent?.(event) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useRemoveEvent() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (eventId: string) => source.removeEvent?.(eventId) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useResetEvents() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: () => source.resetEvents?.() ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useUpdateBalances() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (params: { current: string; savings: string; reserve?: string; protectedSavings?: string }) =>
            source.updateBalances?.(params.current, params.savings, params.reserve, params.protectedSavings) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useSetHorizon() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (days: number) => source.setHorizon?.(days) ?? Promise.resolve(),
        onMutate: () => markProjectionStale(cache),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

function markProjectionStale(cache: ReturnType<typeof useQueryClient>) {
    cache.setQueryData<import('./data').ClientSnapshot>(['workspace', 'lina-fixture-v1'], old => old ? {
        ...old,
        result: null,
        plan: null,
        sourceState: 'stale',
        sourceMessage: 'Les données ont changé. La projection attend un nouveau calcul serveur.',
    } : old);
}
