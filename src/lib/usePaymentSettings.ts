import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PaymentSettings } from '../types';

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  monthlyFee: 1000,
  dueDate: 25,
  firstLateFeeStartDay: 26,
  lateFee: 100,
  secondPenaltyDate: 31,
  secondPenaltyAmount: 200,
  isAnnualPaymentEnabled: false,
  annualAmount: 3000,
  annualEligibleMonths: ['10', '11', '12'],
};

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDoc(doc(db, 'settings', 'payment')).then((docSnap) => {
      if (!isMounted) return;
      setExists(docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({ ...DEFAULT_PAYMENT_SETTINGS, ...data } as PaymentSettings);
      } else {
        setSettings(DEFAULT_PAYMENT_SETTINGS);
      }
      setLoading(false);
    }).catch(error => {
      console.error("Failed to load settings", error);
      if (isMounted) {
        setSettings(DEFAULT_PAYMENT_SETTINGS);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, []);

  return { settings, loading, exists };
}
