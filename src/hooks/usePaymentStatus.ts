import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Payment, UserProfile } from '../types';
import { getMemberSlotSummary, SlotSummary } from '../lib/paymentUtils';

export function usePaymentStatus(userId: string | undefined, month: string, userProfile?: UserProfile) {
  const [status, setStatus] = useState<'approved' | 'partial' | 'pending' | 'not_submitted'>('not_submitted');
  const [slotSummary, setSlotSummary] = useState<SlotSummary | null>(null);
  const [amount, setAmount] = useState(0);
  const [approvedAt, setApprovedAt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !month) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const q1 = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('month', '==', month)
    );
    const q2 = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('coveredMonthsList', 'array-contains', month)
    );

    Promise.all([getDocs(q1), getDocs(q2)]).then(([snap1, snap2]) => {
      if (!isMounted) return;
      const paymentsMap = new Map();
      snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
      snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
      const payments = Array.from(paymentsMap.values());
      
      if (userProfile) {
        const summary = getMemberSlotSummary(userProfile, payments, month);
        setSlotSummary(summary);
        setStatus(summary.status);
        setAmount(payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0));
      } else {
        if (payments.length === 0) {
          setStatus('not_submitted');
          setAmount(0);
        } else {
          const approved = payments.filter(p => p.status === 'approved');
          const pending = payments.filter(p => p.status === 'pending');
          
          if (approved.length > 0) {
            setStatus('approved');
            setAmount(approved.reduce((sum, p) => sum + p.amount, 0));
            setApprovedAt(approved[0].approvedAt);
          } else if (pending.length > 0) {
            setStatus('pending');
            setAmount(pending.reduce((sum, p) => sum + p.amount, 0));
          } else {
            setStatus('not_submitted');
            setAmount(0);
          }
        }
      }
      setLoading(false);
    }).catch(e => {
      console.error(e);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [userId, month, userProfile]);

  return { status, slotSummary, amount, approvedAt, loading };
}
