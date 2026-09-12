import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PressableProps, StyleProp, TextInputProps, TextProps, ViewStyle } from 'react-native';
import { tokens } from './tokens';
import { LinearGradient } from 'expo-linear-gradient';
type TypographyVariant = 'title' | 'body' | 'muted' | 'label' | 'amount';
export function Typography({ variant = 'body', style, ...props }: TextProps & {
    variant?: TypographyVariant;
}) {
    return <Text {...props} style={[styles.text, typography[variant], style]}/>;
}
export function Card({ children, warm = false, style }: {
    children: React.ReactNode;
    warm?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    return warm
        ? <LinearGradient colors={['#1C2334', '#141C2E', '#0F1624']} locations={[0, 0.45, 1]} start={{ x: 0.05, y: 0 }} end={{ x: 0.82, y: 1 }} style={[styles.card, styles.warmCard, style]}>{children}</LinearGradient>
        : <View style={[styles.card, style]}>{children}</View>;
}

/** A restrained, interruptible entrance for route content. */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const offset = useRef(new Animated.Value(16)).current;
    const scale = useRef(new Animated.Value(0.985)).current;
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        let active = true;
        void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
            if (!active) return;
            if (reduceMotion) {
                opacity.setValue(1);
                offset.setValue(0);
                scale.setValue(1);
                return;
            }
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver }),
                Animated.timing(offset, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver }),
                Animated.timing(scale, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver }),
            ]).start();
        }).catch(() => {
            opacity.setValue(1);
            offset.setValue(0);
            scale.setValue(1);
        });
        return () => {
            active = false;
            opacity.stopAnimation();
            offset.stopAnimation();
            scale.stopAnimation();
        };
    }, [opacity, offset, scale]);

    return <Animated.View style={{ opacity, transform: [{ translateY: offset }, { scale }] }}>{children}</Animated.View>;
}
export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    busy?: boolean;
    style?: StyleProp<ViewStyle>;
};
/** Pressable provides native activation and web Enter/Space activation. */
export function Button({ children, variant = 'primary', busy = false, disabled, style, onFocus, onBlur, accessibilityState, ...props }: ButtonProps) {
    const [focused, setFocused] = useState(false);
    const unavailable = Boolean(disabled || busy);
    const foreground = variant === 'primary' ? tokens.color.buttonText : tokens.color.text;
    return <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...accessibilityState, disabled: unavailable, busy }} disabled={unavailable} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={({ pressed }) => [styles.button, buttonVariants[variant], style, focused && styles.focused, unavailable && styles.dimmed, pressed && styles.pressed]}>
    {busy && <ActivityIndicator color={foreground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />}
    {typeof children === 'string' || typeof children === 'number'
        ? <Typography variant="label" style={{ color: foreground, textAlign: 'center', flexShrink: 1, fontSize: 15, fontWeight: '500' }}>{children}</Typography>
        : children}
  </Pressable>;
}
type Tone = 'neutral' | 'success' | 'warning' | 'error';
export function Badge({ children, tone = 'neutral' }: {
    children: React.ReactNode;
    tone?: Tone;
}) {
    return <View style={[styles.badge, badgeTones[tone]]}><Typography variant="label" style={{ color: badgeTextTones[tone] }}>{children}</Typography></View>;
}
export type FieldProps = TextInputProps & {
    label: string;
    error?: string;
};
export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, style, onFocus, onBlur, accessibilityLabel, ...props }, ref) {
    const id = useId();
    const [focused, setFocused] = useState(false);
    return <View style={styles.fieldGroup}>
    <Typography nativeID={`${id}-label`} variant="label">{label}</Typography>
    <TextInput {...props} ref={ref} accessibilityLabel={accessibilityLabel ?? (error ? `${label}. ${error}` : label)} placeholderTextColor={tokens.color.muted} selectionColor={tokens.color.accent} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={[styles.input, style, error ? styles.invalid : undefined, focused && styles.focused]}/>
    {error && <Typography accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: tokens.color.error }}>{error}</Typography>}
  </View>;
});
const styles = StyleSheet.create({
    text: { fontFamily: tokens.font.regular, fontSize: 16, lineHeight: 24, color: tokens.color.text, flexShrink: 1 },
    card: {
        backgroundColor: 'rgba(17, 23, 34, 0.82)',
        borderWidth: 1,
        borderColor: 'rgba(84, 99, 126, 0.44)',
        borderRadius: 22,
        padding: 24,
        gap: 16,
        minWidth: 0,
        overflow: 'hidden',
        shadowColor: '#04070D',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.34,
        shadowRadius: 20,
        elevation: 9,
    },
    warmCard: { borderColor: '#33415D', backgroundColor: '#161F2E' },
    button: {
        minHeight: 52,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    focused: { borderColor: tokens.color.focus },
    dimmed: { opacity: 0.52 },
    pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
    badge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: tokens.radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
    fieldGroup: { gap: 8, minWidth: 0 },
    input: { minHeight: 56, padding: 16, borderRadius: tokens.radius.control, borderWidth: 1.5, borderColor: '#303F5A', backgroundColor: '#111826', color: tokens.color.text, fontFamily: tokens.font.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
    invalid: { borderColor: tokens.color.error },
});
const typography = StyleSheet.create({
    title: { fontFamily: tokens.font.display, fontSize: 36, lineHeight: 44, letterSpacing: -0.9, color: tokens.color.text },
    body: {},
    muted: { color: tokens.color.muted, lineHeight: 22 },
    label: { fontFamily: tokens.font.medium },
    amount: { fontSize: 52, lineHeight: 62, letterSpacing: -2, fontVariant: ['tabular-nums'], fontFamily: tokens.font.semibold },
});
const buttonVariants = StyleSheet.create({
    primary: { backgroundColor: '#252D3E', borderColor: '#4C5E7D', shadowColor: '#F6D6A4', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    secondary: { backgroundColor: '#141B2A', borderColor: '#2A364D' },
    ghost: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.12)' },
});

const badgeTones = StyleSheet.create({
    neutral: { backgroundColor: '#1C2433' },
    success: { backgroundColor: '#36442B' },
    warning: { backgroundColor: '#443426' },
    error: { backgroundColor: '#4A2E34' },
});
const badgeTextTones = {
    neutral: tokens.color.text,
    success: tokens.color.success,
    warning: tokens.color.warning,
    error: tokens.color.error,
} as const;

