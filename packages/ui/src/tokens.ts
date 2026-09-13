/** Pencil theme; keeps the v2.2 minimum body size and 8 px spacing grid. */
export const tokens = {
    color: {
        bg: '#0D0C12', surface: '#211D22', raised: '#30282E', border: '#4D434B',
        text: '#FBFAFC', muted: '#BEB4BC', accent: '#E7DEDA', success: '#D8E78C',
        warning: '#EDB18D', error: '#F39A98', button: '#FAF9FB', buttonText: '#141118',
    },
    font: { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold' },
    space: { xs: 8, sm: 16, md: 24, lg: 32, xl: 48 },
    radius: { control: 18, card: 24, pill: 999 },
} as const;
