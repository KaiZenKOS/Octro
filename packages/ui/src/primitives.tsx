import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PressableProps, StyleProp, TextInputProps, TextProps, ViewStyle } from 'react-native';
import { tokens } from './tokens';
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
    return <View style={[styles.card, warm && styles.warmCard, style]}>{children}</View>;
}

/** A restrained, interruptible entrance for route content. */
export function PageTransition({ children }: { children: React.ReactNode }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const offset = useRef(new Animated.Value(7)).current;

    useEffect(() => {
        let active = true;
        void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
            if (!active) return;
            if (reduceMotion) {
                opacity.setValue(1);
                offset.setValue(0);
                return;
            }
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: tokens.motion.standard, useNativeDriver: true }),
                Animated.timing(offset, { toValue: 0, duration: tokens.motion.standard, useNativeDriver: true }),
            ]).start();
        }).catch(() => {
            opacity.setValue(1);
            offset.setValue(0);
        });
        return () => {
            active = false;
            opacity.stopAnimation();
            offset.stopAnimation();
        };
    }, [opacity, offset]);

    return <Animated.View style={{ opacity, transform: [{ translateY: offset }] }}>{children}</Animated.View>;
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
    {busy && <ActivityIndicator color={foreground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>}
    <Typography variant="label" style={{ color: foreground, textAlign: 'center', flexShrink: 1, fontSize: 15, fontWeight: '500' }}>{children}</Typography>
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
    card: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.card, padding: 24, gap: 16, minWidth: 0, overflow: 'hidden' },
    warmCard: { backgroundColor: '#EDF0E5', borderColor: '#CDD4C2' },
    button: { minHeight: 48, borderRadius: tokens.radius.control, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    focused: { borderColor: tokens.color.focus },
    dimmed: { opacity: 0.52 },
    pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
    badge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: tokens.radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
    fieldGroup: { gap: 8, minWidth: 0 },
    input: { minHeight: 56, padding: 16, borderRadius: tokens.radius.control, borderWidth: 1.5, borderColor: tokens.color.border, backgroundColor: tokens.color.surface, color: tokens.color.text, fontFamily: tokens.font.regular, fontSize: 16, lineHeight: 24 },
    invalid: { borderColor: tokens.color.error },
});
const typography = StyleSheet.create({
    title: { fontFamily: tokens.font.display, fontSize: 32, lineHeight: 40, letterSpacing: -0.5, color: tokens.color.text },
    body: {},
    muted: { color: tokens.color.muted },
    label: { fontFamily: tokens.font.medium },
    amount: { fontSize: 48, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
});
const buttonVariants = StyleSheet.create({
    primary: { backgroundColor: tokens.color.button, borderColor: 'transparent' },
    secondary: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
});

const badgeTones = StyleSheet.create({
    neutral: { backgroundColor: tokens.color.raised },
    success: { backgroundColor: tokens.color.accentSoft },
    warning: { backgroundColor: '#F4EBDD' },
    error: { backgroundColor: '#F7E8E3' },
});
const badgeTextTones = {
    neutral: tokens.color.text,
    success: tokens.color.success,
    warning: tokens.color.warning,
    error: tokens.color.error,
} as const;

