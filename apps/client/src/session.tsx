import React, { createContext, useContext, useState } from 'react';
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
    t: (fr: string, en: string) => string;
};

const Context = createContext<Session | null>(null);

export function SessionProvider({ children, source: provided }: {
    children: React.ReactNode;
    source?: ClientDataSource;
}) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
    const [source] = useState(() => provided ?? createFixtureSource());
    const [language, setLanguage] = useState<'fr' | 'en'>('fr');
    const [state, setState] = useState<DemoState>('ready');
    const [persona, setPersona] = useState<Session['persona']>('personal');

    return (
        <QueryClientProvider client={client}>
            <Context.Provider value={{ language, setLanguage, state, setState, persona, setPersona, source, t: (fr, en) => language === 'fr' ? fr : en }}>
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
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useRemoveEvent() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: (eventId: string) => source.removeEvent?.(eventId) ?? Promise.resolve(),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}

export function useResetEvents() {
    const { source } = useSession();
    const cache = useQueryClient();
    return useMutation({
        mutationFn: () => source.resetEvents?.() ?? Promise.resolve(),
        onSuccess: () => cache.invalidateQueries({ queryKey: ['workspace', 'lina-fixture-v1'] }),
    });
}
