/**
 * Mithaq ledger — the single source of truth for "who owes what".
 *
 * Every screen (home, members, profile, personal tab, reports) must use these
 * helpers instead of filtering payments by `p.month` on its own.
 *
 * Key ideas
 * - `payment.month` is only the month the payment was SUBMITTED.
 * - Which months a payment PAYS FOR comes from `getPaymentCoverage()`.
 * - Dues are counted per slot, month by month, from the later of
 *   `settings.ledgerStartMonth` and `slot.activeFromMonth` up to the current month.
 * - Annual contribution is separate from monthly dues, mandatory per slot
 *   per year (when enabled in settings).
 * - Partial payments are not supported: a month is either fully paid or not.
 */
import { Payment, PaymentSettings, UserProfile, NameSlot } from '../types';

export type MonthKey = string; // 'YYYY-MM'

export type MonthStatus =
  | 'paid'      // approved payment covers this month
  | 'pending'   // a pending / level-1 payment covers this month
  | 'overdue'   // past month, nothing paid
  | 'current'   // current month, nothing paid yet
  | 'upcoming'; // future month, nothing paid (advance possible)

export interface MonthLine {
  month: MonthKey;
  status: MonthStatus;
  baseAmount: number;
  lateFine: number; // fine that would be charged if paid today (0 for paid/pending/upcoming)
  payment?: Payment;
}

export type AnnualStatus = 'paid' | 'pending' | 'overdue' | 'due';

export interface AnnualLine {
  year: string;
  status: AnnualStatus; // 'due' = current year, not yet paid; 'overdue' = past year
  amount: number;
  payment?: Payment;
}

export interface SlotLedger {
  slot: NameSlot;
  startMonth: MonthKey;
  months: MonthLine[];          // from startMonth to current month (inclusive)
  upcoming: MonthLine[];        // next 12 months for advance payment
  annual: AnnualLine[];
  overdueMonths: number;
  dueAmount: number;            // overdue + current months (base + fine) + overdue annuals
  pendingCount: number;
}

export interface MemberLedger {
  member: UserProfile;
  slots: SlotLedger[];
  overdueMonths: number;        // across all slots
  dueAmount: number;            // across all slots
  currentAnnualDue: number;     // current year's annual still to pay (not yet overdue)
  pendingCount: number;
  hasDues: boolean;
}

// ---------------------------------------------------------------------------
// Month helpers
// ---------------------------------------------------------------------------

export function toMonthKey(d: Date): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  if (from > to) return out;
  let m = from;
  while (m <= to && out.length < 1200) {
    out.push(m);
    m = addMonths(m, 1);
  }
  return out;
}

const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBnDigits(v: string | number): string {
  return String(v).replace(/[0-9]/g, d => BN_DIGITS[Number(d)]);
}

export function monthLabelBn(month: MonthKey, withYear = true): string {
  const [y, m] = month.split('-');
  const name = BN_MONTHS[Number(m) - 1] || month;
  return withYear ? `${name} ${toBnDigits(y)}` : name;
}

/** Joins month labels: "আগস্ট, সেপ্টেম্বর ও অক্টোবর ২০২৬" style (year on each for clarity). */
export function monthListLabelBn(months: MonthKey[]): string {
  const labels = [...months].sort().map(m => monthLabelBn(m));
  if (labels.length <= 1) return labels[0] || '';
  return labels.slice(0, -1).join(', ') + ' ও ' + labels[labels.length - 1];
}

// ---------------------------------------------------------------------------
// Payment coverage (works for both new and legacy payment documents)
// ---------------------------------------------------------------------------

export interface PaymentCoverage {
  months: MonthKey[];
  annualYears: string[];
  /** money allocated to each covered month (base + fine), for month-wise reports */
  perMonth: Record<MonthKey, { base: number; fine: number }>;
  /** money allocated to each annual year */
  perAnnual: Record<string, number>;
}

export function getPaymentCoverage(p: Payment): PaymentCoverage {
  const perMonth: PaymentCoverage['perMonth'] = {};
  const perAnnual: PaymentCoverage['perAnnual'] = {};

  // New format: explicit breakdown
  if ((p.monthBreakdown && p.monthBreakdown.length > 0) || (p.annualYears && p.annualYears.length > 0)) {
    (p.monthBreakdown || []).forEach(b => {
      perMonth[b.month] = { base: b.baseAmount || 0, fine: b.lateFine || 0 };
    });
    const years = p.annualYears || [];
    const annualTotal = p.annualAmount || 0;
    years.forEach(y => { perAnnual[y] = years.length ? annualTotal / years.length : 0; });
    return { months: Object.keys(perMonth).sort(), annualYears: years, perMonth, perAnnual };
  }

  // Legacy annual: no months covered; the year is the submission year
  if (p.paymentType === 'annual') {
    const year = (p.month || '').slice(0, 4);
    perAnnual[year] = p.amount || 0;
    return { months: [], annualYears: [year], perMonth, perAnnual };
  }

  // Legacy monthly / advance
  const months = (p.coveredMonthsList && p.coveredMonthsList.length > 0)
    ? [...p.coveredMonthsList]
    : (p.month ? [p.month] : []);
  const totalFine = p.lateFine || 0;
  const totalBase = p.baseAmount ?? ((p.amount || 0) - totalFine);
  const n = months.length || 1;
  months.forEach(m => {
    perMonth[m] = { base: totalBase / n, fine: totalFine / n };
  });
  return { months: months.sort(), annualYears: [], perMonth, perAnnual };
}

export function isActivePaymentStatus(s: Payment['status']) {
  return s === 'approved' || s === 'pending' || s === 'level_1_approved';
}

/** Short Bangla description of what a payment covers, for lists and approval cards. */
export function describePaymentBn(p: Payment): string {
  const cov = getPaymentCoverage(p);
  const parts: string[] = [];
  if (cov.months.length) parts.push(`মাসিক: ${monthListLabelBn(cov.months)}`);
  if (cov.annualYears.length) parts.push(`বার্ষিক: ${cov.annualYears.map(toBnDigits).join(', ')}`);
  return parts.join(' • ') || monthLabelBn(p.month);
}

// ---------------------------------------------------------------------------
// Fines
// ---------------------------------------------------------------------------

/** Late fine for paying `month` on `today`. Super admin controls amounts in settings. */
export function lateFineFor(month: MonthKey, settings: PaymentSettings, today: Date = new Date()): number {
  const current = toMonthKey(today);
  if (month > current) return 0;
  if (month < current) return (settings.lateFee || 0) + (settings.secondPenaltyAmount || 0);
  const day = today.getDate();
  let fine = 0;
  if (day >= (settings.firstLateFeeStartDay || 99)) fine += settings.lateFee || 0;
  if (day >= (settings.secondPenaltyDate || 99)) fine += settings.secondPenaltyAmount || 0;
  return fine;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

function slotStartMonth(slot: NameSlot, settings: PaymentSettings, fallback: MonthKey): MonthKey {
  const candidates = [settings.ledgerStartMonth, slot.activeFromMonth].filter(Boolean) as MonthKey[];
  if (candidates.length === 0) return fallback;
  return candidates.sort()[candidates.length - 1]; // the later one wins
}

function pickBest(payments: Payment[]): Payment | undefined {
  return payments.find(p => p.status === 'approved')
    || payments.find(p => p.status === 'level_1_approved')
    || payments.find(p => p.status === 'pending');
}

export function buildSlotLedger(
  member: UserProfile,
  slot: NameSlot,
  memberPayments: Payment[],
  settings: PaymentSettings,
  today: Date = new Date()
): SlotLedger {
  const current = toMonthKey(today);
  const startMonth = slotStartMonth(slot, settings, current);
  const base = slot.monthlyDue || settings.monthlyFee || 0;

  const slotPayments = memberPayments.filter(p =>
    p.userId === member.id && p.nameId === slot.nameId && isActivePaymentStatus(p.status)
  );

  // index payments by month and by annual year
  const byMonth = new Map<MonthKey, Payment[]>();
  const byYear = new Map<string, Payment[]>();
  slotPayments.forEach(p => {
    const cov = getPaymentCoverage(p);
    cov.months.forEach(m => byMonth.set(m, [...(byMonth.get(m) || []), p]));
    cov.annualYears.forEach(y => byYear.set(y, [...(byYear.get(y) || []), p]));
  });

  const lineFor = (m: MonthKey): MonthLine => {
    const p = pickBest(byMonth.get(m) || []);
    if (p) return { month: m, status: p.status === 'approved' ? 'paid' : 'pending', baseAmount: base, lateFine: 0, payment: p };
    const status: MonthStatus = m < current ? 'overdue' : m === current ? 'current' : 'upcoming';
    return { month: m, status, baseAmount: base, lateFine: status === 'upcoming' ? 0 : lateFineFor(m, settings, today) };
  };

  const months = monthRange(startMonth, current).map(lineFor);
  const upcomingStart = startMonth > current ? startMonth : addMonths(current, 1);
  const upcoming = monthRange(upcomingStart, addMonths(current, 12)).map(lineFor);

  // Annual (separate, mandatory per slot per year when enabled)
  const annual: AnnualLine[] = [];
  if (settings.isAnnualPaymentEnabled) {
    const amount = settings.annualAmount || 0;
    const firstYear = Number(startMonth.slice(0, 4));
    const thisYear = today.getFullYear();
    for (let y = firstYear; y <= thisYear; y++) {
      const year = String(y);
      const p = pickBest(byYear.get(year) || []);
      if (p) annual.push({ year, status: p.status === 'approved' ? 'paid' : 'pending', amount, payment: p });
      else annual.push({ year, status: y < thisYear ? 'overdue' : 'due', amount });
    }
  }

  const overdueMonths = months.filter(l => l.status === 'overdue').length;
  const dueAmount =
    months.filter(l => l.status === 'overdue' || l.status === 'current').reduce((s, l) => s + l.baseAmount + l.lateFine, 0) +
    annual.filter(a => a.status === 'overdue').reduce((s, a) => s + a.amount, 0);
  const pendingCount =
    months.filter(l => l.status === 'pending').length + upcoming.filter(l => l.status === 'pending').length +
    annual.filter(a => a.status === 'pending').length;

  return { slot, startMonth, months, upcoming, annual, overdueMonths, dueAmount, pendingCount };
}

export function buildMemberLedger(
  member: UserProfile,
  allPayments: Payment[],
  settings: PaymentSettings,
  today: Date = new Date()
): MemberLedger {
  const memberPayments = allPayments.filter(p => p.userId === member.id);
  const slots = (member.names || []).map(s => buildSlotLedger(member, s, memberPayments, settings, today));
  const overdueMonths = slots.reduce((s, l) => s + l.overdueMonths, 0);
  const dueAmount = slots.reduce((s, l) => s + l.dueAmount, 0);
  const currentAnnualDue = slots.reduce((s, l) => s + l.annual.filter(a => a.status === 'due').reduce((x, a) => x + a.amount, 0), 0);
  const pendingCount = slots.reduce((s, l) => s + l.pendingCount, 0);
  return { member, slots, overdueMonths, dueAmount, currentAnnualDue, pendingCount, hasDues: dueAmount > 0 };
}

// ---------------------------------------------------------------------------
// Money totals
// ---------------------------------------------------------------------------

/** Approved money for system-wide totals. Copied (migrated) records are excluded to avoid double counting. */
export function systemApproved(payments: Payment[]): Payment[] {
  return payments.filter(p => p.status === 'approved' && !p.isCopiedRecord);
}

/** A member's savings = all their approved payments (fines included, per somiti rule). */
export function memberSavings(memberId: string, payments: Payment[]): number {
  return payments
    .filter(p => p.userId === memberId && p.status === 'approved')
    .reduce((s, p) => s + (p.amount || 0), 0);
}

/** Money RECEIVED in a given month (by submission month), system-wide. */
export function receivedInMonth(month: MonthKey, payments: Payment[]): number {
  return systemApproved(payments).filter(p => p.month === month).reduce((s, p) => s + (p.amount || 0), 0);
}

/** Money allocated to the month it PAYS FOR (for month-wise reports). */
export function collectionByCoveredMonth(payments: Payment[]): Map<MonthKey, { base: number; fine: number }> {
  const out = new Map<MonthKey, { base: number; fine: number }>();
  systemApproved(payments).forEach(p => {
    const cov = getPaymentCoverage(p);
    Object.entries(cov.perMonth).forEach(([m, v]) => {
      const cur = out.get(m) || { base: 0, fine: 0 };
      out.set(m, { base: cur.base + v.base, fine: cur.fine + v.fine });
    });
  });
  return out;
}

export function annualCollectionByYear(payments: Payment[]): Map<string, number> {
  const out = new Map<string, number>();
  systemApproved(payments).forEach(p => {
    Object.entries(getPaymentCoverage(p).perAnnual).forEach(([y, v]) => out.set(y, (out.get(y) || 0) + v));
  });
  return out;
}
