import { Payment, UserProfile } from '../types';
import { getPaymentCoverage } from './ledger';

export interface SlotSummary {
  totalSlots: number;
  paidSlots: number;
  dueSlots: number;
  pendingSlots: number;
  status: 'approved' | 'partial' | 'pending' | 'not_submitted';
  totalDueAmount: number;
}

export function getMemberSlotSummary(member: UserProfile, currentMonthPayments: Payment[], targetMonth: string): SlotSummary {
  if (!member.names || member.names.length === 0) {
    return {
      totalSlots: 0,
      paidSlots: 0,
      dueSlots: 0,
      pendingSlots: 0,
      status: 'approved',
      totalDueAmount: 0
    };
  }

  let paidSlots = 0;
  let dueSlots = 0;
  let pendingSlots = 0;
  let totalDueAmount = 0;

  member.names.forEach(slot => {
    // If a payment exists and is not rejected
    // Skip slots that had not started yet in the target month
    if (slot.activeFromMonth && slot.activeFromMonth > targetMonth) return;
    // A payment counts for the month it PAYS FOR (coverage), not the month it was submitted
    const slotPayments = currentMonthPayments.filter(p =>
      p.userId === member.id && p.nameId === slot.nameId &&
      getPaymentCoverage(p).months.includes(targetMonth)
    );
    
    // Pick the most relevant payment (approved > pending > rejected)
    let slotPayment = slotPayments.find(p => p.status === 'approved');
    if (!slotPayment) slotPayment = slotPayments.find(p => p.status === 'level_1_approved');
    if (!slotPayment) slotPayment = slotPayments.find(p => p.status === 'pending');

    if (!slotPayment) {
      dueSlots++;
      totalDueAmount += (slot.monthlyDue || 0);
    } else if (slotPayment.status === 'pending' || slotPayment.status === 'level_1_approved') {
      pendingSlots++;
      totalDueAmount += (slot.monthlyDue || 0);
    } else if (slotPayment.status === 'approved') {
      paidSlots++;
    }
  });

  let status: 'approved' | 'partial' | 'pending' | 'not_submitted' = 'not_submitted';
  
  if (paidSlots === paidSlots + dueSlots + pendingSlots) {
    status = 'approved';
  } else if (paidSlots > 0) {
    status = 'partial';
  } else if (pendingSlots > 0) {
    status = 'pending';
  } else {
    status = 'not_submitted';
  }

  return {
    totalSlots: paidSlots + dueSlots + pendingSlots,
    paidSlots,
    dueSlots,
    pendingSlots,
    status,
    totalDueAmount
  };
}

export function getMemberStatus(member: UserProfile, currentMonthPayments: Payment[], targetMonth: string): 'approved' | 'partial' | 'pending' | 'not_submitted' {
  return getMemberSlotSummary(member, currentMonthPayments, targetMonth).status;
}

export function getMemberTotalSavings(memberId: string, allPayments: Payment[]): number {
  return allPayments
    .filter(p => p.userId === memberId && p.status === 'approved')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function getTotalSystemSavings(allPayments: Payment[]): number {
  return allPayments
    .filter(p => p.status === 'approved' && !(p as any).isCopiedRecord)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function getSystemSlotSummary(members: UserProfile[], currentMonthPayments: Payment[], targetMonth: string) {
  let totalSlots = 0;
  let paidSlots = 0;
  let dueSlots = 0;
  let pendingSlots = 0;

  members.forEach(member => {
    if (member.status === 'active') {
      const summary = getMemberSlotSummary(member, currentMonthPayments, targetMonth);
      totalSlots += summary.totalSlots;
      paidSlots += summary.paidSlots;
      dueSlots += summary.dueSlots;
      pendingSlots += summary.pendingSlots;
    }
  });

  return { totalSlots, paidSlots, dueSlots, pendingSlots };
}
