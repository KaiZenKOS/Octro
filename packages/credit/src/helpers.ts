import type { CreditGrade } from "./types.js";

export function round2(x: number | null): number | null {
  return x === null ? null : Math.round(x * 100) / 100;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function safeDiv(numerator: number, denominator: number | null | undefined): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

// Population standard deviation (Python's statistics.pstdev).
export function pstdev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export function agingBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return "not_yet_due";
  if (daysOverdue <= 30) return "overdue_1_30";
  if (daysOverdue <= 60) return "overdue_31_60";
  if (daysOverdue <= 90) return "overdue_61_90";
  return "overdue_90_plus";
}

// Table de grade (score min, grade, libelle, multiplicateur cash-flow,
// plafond % du revenu annualise, duree en mois, taux annuel indicatif %) —
// reprend exactement les seuils du script Python de reference.
export const GRADE_TABLE: ReadonlyArray<
  readonly [number, CreditGrade, string, number, number, number, number]
> = [
  [80, "A", "Low risk", 6.0, 0.25, 24, 8.0],
  [65, "B", "Moderate risk", 4.0, 0.18, 18, 11.0],
  [50, "C", "Elevated risk", 2.5, 0.12, 12, 15.0],
  [35, "D", "High risk", 1.0, 0.06, 6, 20.0],
  [0, "E", "Very high risk", 0.0, 0.0, 0, 0.0],
];

export function gradeForScore(
  score: number,
): { grade: CreditGrade; label: string; cfMultiplier: number; revCapPct: number; termMonths: number; annualRatePct: number } {
  for (const [minScore, grade, label, cfMultiplier, revCapPct, termMonths, annualRatePct] of GRADE_TABLE) {
    if (score >= minScore) {
      return { grade, label, cfMultiplier, revCapPct, termMonths, annualRatePct };
    }
  }
  const [, grade, label, cfMultiplier, revCapPct, termMonths, annualRatePct] = GRADE_TABLE[GRADE_TABLE.length - 1]!;
  return { grade, label, cfMultiplier, revCapPct, termMonths, annualRatePct };
}

// Pret amortissable standard. Renvoie 0 si principal/duree est nul.
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * (1 + r) ** termMonths) / ((1 + r) ** termMonths - 1);
}

// Inverse de monthlyPayment : le plus grand principal dont la mensualite ne
// depasse pas targetPayment.
export function maxPrincipalForPayment(targetPayment: number, annualRatePct: number, termMonths: number): number {
  if (targetPayment <= 0 || termMonths <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return targetPayment * termMonths;
  return (targetPayment * ((1 + r) ** termMonths - 1)) / (r * (1 + r) ** termMonths);
}
