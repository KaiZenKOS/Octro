import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../src/screens';

export function generateStaticParams() {
    return ['home', 'calendar', 'sources', 'proposal', 'tracking', 'options', 'add', 'import'].map(screen => ({ screen }));
}

export default function Page() {
    const { screen } = useLocalSearchParams<{ screen?: string }>();

    useEffect(() => {
        if (!screen || screen === 'undefined' || screen === 'home' || screen === 'index') {
            router.replace('/');
        }
    }, [screen]);

    if (!screen || screen === 'undefined' || screen === 'home' || screen === 'index') {
        return <Screen screen="home" />;
    }

    return <Screen screen={screen} />;
}
