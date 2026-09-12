import React, { forwardRef, useId, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PressableProps, StyleProp, TextInputProps, TextProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    return warm
        ? <LinearGradient colors={['#51352D', '#30252B', '#17141B']} locations={[0, 0.42, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.42, y: 1 }} style={[styles.card, styles.warmCard, style]}>{children}</LinearGradient>
        : <View style={[styles.card, style]}>{children}</View>;
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
    return <Pressable {...props} accessibilityRole="button" accessibilityState={{ ...accessibilityState, disabled: unavailable, busy }} disabled={unavailable} onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={({ pressed }) => [styles.button, buttonVariants[variant], style, focused && styles.focused, (unavailable || pressed) && styles.dimmed]}>
    {busy && <ActivityIndicator color={foreground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>}
    <Typography variant="label" style={{ color: foreground, textAlign: 'center', flexShrink: 1, fontSize: 15, fontWeight: '500' }}>{children}</Typography>
  </Pressable>;
}
type Tone = 'neutral' | 'success' | 'warning' | 'error';
export function Badge({ children, tone = 'neutral' }: {
    children: React.ReactNode;
    tone?: Tone;
}) {
    return <View style={styles.badge}><Typography variant="label" style={{ color: tone === 'neutral' ? tokens.color.accent : tokens.color[tone] }}>{children}</Typography></View>;
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
    warmCard: { borderColor: '#5B454C', borderWidth: 1 },
    button: { minHeight: 56, borderRadius: tokens.radius.control, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1.5, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    focused: { borderColor: tokens.color.success },
    dimmed: { opacity: 0.6 },
    badge: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: tokens.radius.pill, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: tokens.color.raised },
    fieldGroup: { gap: 8, minWidth: 0 },
    input: { minHeight: 56, padding: 16, borderRadius: tokens.radius.control, borderWidth: 1.5, borderColor: tokens.color.border, backgroundColor: tokens.color.surface, color: tokens.color.text, fontFamily: tokens.font.regular, fontSize: 16, lineHeight: 24 },
    invalid: { borderColor: tokens.color.error },
});
const typography = StyleSheet.create({
    title: { fontSize: 32, lineHeight: 40, letterSpacing: -1 },
    body: {},
    muted: { color: tokens.color.muted },
    label: { fontFamily: tokens.font.medium },
    amount: { fontSize: 48, lineHeight: 58, letterSpacing: -2 },
});
const buttonVariants = StyleSheet.create({
    primary: { backgroundColor: tokens.color.button, borderColor: 'transparent', shadowColor: '#EDBA79', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
    secondary: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
});

