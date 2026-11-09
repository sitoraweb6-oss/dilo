import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import { Payment, UserProfile } from '../types';
import { getMemberSlotSummary } from './paymentUtils';
import { getPaymentCoverage } from './ledger';

export function useCurrentMonthPayments() {
  const [currentMonthPayments, setCurrentMonthPayments] = useState<Payment[]>([]);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    let isMounted = true;
    
    const fetchPayments = async () => {
      try {
        const q1 = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const q2 = query(collection(db, 'payments'), where('coveredMonthsList', 'array-contains', currentMonth));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        if (isMounted) {
          const paymentsMap = new Map();
          snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
          snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
          setCurrentMonthPayments(Array.from(paymentsMap.values()));
        }
      } catch (error) {
        console.error(error);
      }
    };
    
    fetchPayments();

    return () => { isMounted = false; };
  }, [currentMonth]);

  const getSlotPaymentStatus = (userId: string, nameId: string): 'approved' | 'pending' | 'not_submitted' => {
    const slotPayments = currentMonthPayments.filter(p =>
      p.userId === userId && p.nameId === nameId && getPaymentCoverage(p).months.includes(currentMonth)
    );
    if (slotPayments.some(p => p.status === 'approved')) return 'approved';
    if (slotPayments.some(p => p.status === 'pending' || p.status === 'level_1_approved')) return 'pending';
    return 'not_submitted';
  };

  const getMemberPaymentStatus = (member: UserProfile): 'approved' | 'partial' | 'pending' | 'not_submitted' => {
    return getMemberSlotSummary(member, currentMonthPayments, currentMonth).status;
  };

  return { currentMonthPayments, getSlotPaymentStatus, getMemberPaymentStatus, currentMonth };
}
