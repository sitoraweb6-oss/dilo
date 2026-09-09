import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';

export function useAvailableFund() {
  const [availableFund, setAvailableFund] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to listen to Payments, Expenses, and InvestmentTransactions
    const fetchFund = async () => {
      try {
        // Payments
        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('status', '==', 'approved')));
        const yearlySnap = await getDocs(query(collection(db, 'yearlyPayments'), where('status', '==', 'approved')));
        
        let totalCollection = 0;
        paymentsSnap.forEach(d => totalCollection += d.data().amount || 0);
        yearlySnap.forEach(d => totalCollection += d.data().amount || 0);

        // Expenses
        const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('status', '==', 'approved')));
        let totalExpense = 0;
        expensesSnap.forEach(d => totalExpense += d.data().amount || 0);

        // Investment Transactions (outflows and returns)
        const invTxnSnap = await getDocs(collection(db, 'investmentTransactions'));
        let invOutflow = 0;
        let invReturn = 0;
        invTxnSnap.forEach(d => {
          const data = d.data();
          if (data.type === 'outflow') invOutflow += data.amount || 0;
          if (data.type === 'return') invReturn += data.amount || 0;
        });

        setAvailableFund(totalCollection - totalExpense - invOutflow + invReturn);
      } catch (error) {
        console.error("Error calculating fund:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFund();
    // Setting up snapshots for real-time updates might be heavy for all payments, but we can do it if needed.
    // For now, doing it via onSnapshot for all might be okay since the app is small, or we can just fetch once.
    // Let's use onSnapshot for accuracy.
    const unsubPayments = onSnapshot(query(collection(db, 'payments'), where('status', '==', 'approved')), () => fetchFund());
    const unsubYearly = onSnapshot(query(collection(db, 'yearlyPayments'), where('status', '==', 'approved')), () => fetchFund());
    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('status', '==', 'approved')), () => fetchFund());
    const unsubInvTxn = onSnapshot(collection(db, 'investmentTransactions'), () => fetchFund());

    return () => {
      unsubPayments();
      unsubYearly();
      unsubExpenses();
      unsubInvTxn();
    };
  }, []);

  return { availableFund, loading };
}
