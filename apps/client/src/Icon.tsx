import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { tokens } from '@octro/ui';
// Lucide-style 24 px outlined primitives, rendered as vectors on every platform.
export function Icon({ name, color = tokens.color.muted, size = 24 }: {
    name: string;
    color?: string;
    size?: number;
}) {
    const shapes: Record<string, React.ReactNode> = {
        home: <><Path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><Path d="M9 21v-8h6v8"/></>,
        calendar: <><Rect x="3" y="5" width="18" height="16" rx="2"/><Path d="M16 3v4M8 3v4M3 11h18"/></>,
        sources: <><Rect x="3" y="5" width="18" height="15" rx="2"/><Path d="M3 10h18M7 15h3"/></>,
        tracking: <><Circle cx="12" cy="12" r="9"/><Path d="M12 7v5l3 2"/></>,
        shield: <><Path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><Path d="m8 12 3 3 5-5"/></>,
        arrow: <><Path d="M5 12h14m-5-5 5 5-5 5"/></>,
        down: <Polyline points="6,9 12,15 18,9"/>,
        rent: <><Path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/></>,
        groceries: <><Path d="M3 3h2l3 12h11l2-8H6"/><Circle cx="9" cy="20" r="1"/><Circle cx="18" cy="20" r="1"/></>,
        transport: <><Rect x="5" y="3" width="14" height="16" rx="3"/><Path d="M5 11h14M8 19l-2 3m10-3 2 3M8 15h1m6 0h1"/></>,
        salary: <><Rect x="3" y="7" width="18" height="14" rx="2"/><Path d="M8 7V4h8v3M3 12h18M10 12v3h4v-3"/></>,
        check: <Path d="m5 12 4 4L19 6"/>,
        circle: <Circle cx="12" cy="12" r="8"/>,
        file: <><Path d="M14 2H5v20h14V7Zm0 0v5h5M8 12h8M8 16h8"/></>,
        plus: <><Line x1="12" y1="5" x2="12" y2="19"/><Line x1="5" y1="12" x2="19" y2="12"/></>,
        warning: <><Path d="m12 3 10 18H2Z"/><Path d="M12 9v5m0 3v1"/></>,
        logout: <><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><Path d="m16 17 5-5-5-5"/><Path d="M21 12H9"/></>,
        wallet: <><Path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><Path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4a2 2 0 1 0 0 4h5"/></>,
        coins: <><Circle cx="8" cy="8" r="6"/><Path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><Path d="M7 6h1v4"/></>,
    };
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" accessible={false}>{shapes[name] ?? shapes.circle}</Svg>;
}
