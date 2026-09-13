import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../src/screens';
export function generateStaticParams() { return ['calendar', 'sources', 'proposal', 'tracking', 'options', 'add', 'import'].map(screen => ({ screen })); }
export default function Page() { const { screen } = useLocalSearchParams<{
    screen: string;
}>(); return <Screen screen={screen}/>; }
