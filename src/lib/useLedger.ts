import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Payment, UserProfile } from '../types';
import { usePaymentSettings } from './usePaymentSettings';
import { buildMemberLedger, MemberLedger } from './ledger';

/** Ledger for a single member (own dues, profile modal, dashboard banner). */
export function useMemberLedger(member: UserProfile | null | undefined) {
  const { settings, loading: settingsLoading } = usePaymentSettings();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const memberId = member?.id;

  useEffect(() => {
    if (!memberId) { setPayments([]); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    getDocs(query(collection(db, 'payments'), where('userId', '==', memberId)))
      .then(snap => { if (alive) setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))); })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [memberId]);

  const ledger = useMemo(
    () => (member ? buildMemberLedger(member, payments, settings) : null),
    [member, payments, settings]
  );

  return { ledger, payments, settings, loading: loading || settingsLoading };
}

/** Ledgers for all active members (members tab, reports). */
export function useAllLedgers() {
  const { settings, loading: settingsLoading } = usePaymentSettings();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
      getDocs(collection(db, 'payments')),
    ])
      .then(([u, p]) => {
        if (!alive) return;
        setMembers(u.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        setPayments(p.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      })
      .catch(console.error)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const ledgers: MemberLedger[] = useMemo(
    () => members.map(m => buildMemberLedger(m, payments, settings)),
    [members, payments, settings]
  );

  return { members, payments, ledgers, settings, loading: loading || settingsLoading };
}
