import { Payment, UserProfile } from '../types';

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
    const slotPayments = currentMonthPayments.filter(p => {
      if (p.userId !== member.id || p.nameId !== slot.nameId || p.paymentType === 'annual') return false;
      if (p.paymentType === 'advance') {
        return p.coveredMonthsList && p.coveredMonthsList.includes(targetMonth);
      }
      return true;
    });
    
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
  
  if (paidSlots === member.names.length) {
    status = 'approved';
  } else if (paidSlots > 0) {
    status = 'partial';
  } else if (pendingSlots > 0) {
    status = 'pending';
  } else {
    status = 'not_submitted';
  }

  return {
    totalSlots: member.names.length,
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

import { PaymentSettings } from '../types';
export function calculatePaymentDetails(baseAmount: number, settings: PaymentSettings, targetMonthStr?: string) {
  const d = new Date();
  
  if (targetMonthStr) {
    const currentYear = d.getFullYear();
    const currentMonthNum = d.getMonth() + 1; // 1-based
    
    const [targetYearStr, targetMonthNumStr] = targetMonthStr.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthNumStr, 10);
    
    // Future month -> No fine
    if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonthNum)) {
      return { baseAmount, lateFine: 0, totalAmount: baseAmount };
    }
    
    // Past month -> Max fine
    if (targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonthNum)) {
      const maxFine = (settings.lateFee || 0) + (settings.secondPenaltyAmount || 0);
      return { baseAmount, lateFine: maxFine, totalAmount: baseAmount + maxFine };
    }
  }

  // Current month -> Day based calculation
  const currentDay = d.getDate();
  let lateFine = 0;
  if (currentDay >= settings.firstLateFeeStartDay) {
    lateFine += settings.lateFee;
  }
  if (currentDay >= settings.secondPenaltyDate) {
    lateFine += settings.secondPenaltyAmount;
  }

  return {
    baseAmount,
    lateFine,
    totalAmount: baseAmount + lateFine
  };
}
