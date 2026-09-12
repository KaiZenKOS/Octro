import React from 'react';
import { Slot } from 'expo-router';
import { useFonts, Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth';
import { SessionProvider } from '../src/session';
import { Shell } from '../src/Shell';
import '../src/web.css';
export default function Layout() {
    const [fontsLoaded, error] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
    if (!fontsLoaded && !error)
        return <View style={{ flex: 1, backgroundColor: '#0D0C12', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Chargement des polices / Loading fonts" color="#E7DEDA"/></View>;
    // The session context owns the API-backed data source, so it must read the
    // actual account token from the outer AuthProvider.
    return <SafeAreaProvider><AuthProvider><SessionProvider><Shell><Slot /></Shell></SessionProvider></AuthProvider></SafeAreaProvider>;
}
