import React, { useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { X, PenLine } from 'lucide-react';
import { db } from '../lib/firebase';
import { Payment, PaymentSettings, UserProfile } from '../types';
import {
  buildMemberLedger, getPaymentCoverage, isActivePaymentStatus, monthLabelBn, monthListLabelBn,
  toBnDigits, toMonthKey, lateFineFor, MonthLine, normalizeLegacyPayments,
} from '../lib/ledger';

const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Admin enters a payment on a member's behalf (cash, or money received outside the app).
 * The entering admin counts as the 1st approval; a DIFFERENT admin must give the 2nd
 * approval before it counts. History shows it as "ম্যানুয়াল এন্ট্রি".
 */
export function ManualEntryModal({
  member, payments, settings, admin, onClose, onSaved,
}: {
  member: UserProfile;
  payments: Payment[];
  settings: PaymentSettings;
  admin: UserProfile;
  onClose: () => void;
  onSaved: (p: Payment) => void;
}) {
  const ledger = useMemo(() => buildMemberLedger(member, payments, settings), [member, payments, settings]);
  const [slotId, setSlotId] = useState(member.names?.[0]?.nameId || '');
  const [months, setMonths] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [chargeFine, setChargeFine] = useState(true);
  const [method, setMethod] = useState('Cash');
  const [trx, setTrx] = useState('');
  const [receivedDate, setReceivedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const slotLedger = ledger.slots.find(s => s.slot.nameId === slotId);
  const lines: MonthLine[] = slotLedger
    ? [...slotLedger.months, ...slotLedger.upcoming].filter(l => l.status === 'overdue' || l.status === 'current' || l.status === 'upcoming')
    : [];
  const annualLines = slotLedger ? slotLedger.annual.filter(a => a.status === 'overdue' || a.status === 'due') : [];

  // Fine is judged by the day the money was RECEIVED, not the day it is entered
  const recvDate = receivedDate ? new Date(receivedDate + 'T12:00:00') : new Date();
  const fineOf = (l: MonthLine) => (chargeFine && l.status !== 'upcoming' ? lateFineFor(l.month, settings, recvDate) : 0);
  const picked = lines.filter(l => months.includes(l.month));
  const base = picked.reduce((s, l) => s + l.baseAmount, 0);
  const fine = picked.reduce((s, l) => s + fineOf(l), 0);
  const annualAmount = years.length * (settings.annualAmount || 0);
  const total = base + fine + annualAmount;

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort());

  const save = async () => {
    if (!slotLedger || saving) return;
    if (months.length === 0 && years.length === 0) { alert('অন্তত একটি মাস বা বার্ষিক নির্বাচন করুন।'); return; }
    if (!receivedDate) { alert('টাকা গ্রহণের তারিখ দিন।'); return; }
    if (!window.confirm(`${member.displayName} (${slotLedger.slot.label}) — ${taka(total)}\nঅন্য একজন অ্যাডমিন অনুমোদন দিলে হিসাবে যোগ হবে। নিশ্চিত?`)) return;

    try {
      setSaving(true);
      // duplicate guard: re-read this member's payments from the server
      const snap = await getDocs(query(collection(db, 'payments'), where('userId', '==', member.id)));
      const taken = new Set<string>();
      normalizeLegacyPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)), [member], settings)
        .filter(p => p.nameId === slotId && isActivePaymentStatus(p.status))
        .forEach(p => {
          const cov = getPaymentCoverage(p);
          cov.months.forEach(m => taken.add(m));
          cov.annualYears.forEach(y => taken.add(`annual-${y}`));
        });
      if (months.some(m => taken.has(m)) || years.some(y => taken.has(`annual-${y}`))) {
        alert('নির্বাচিত কিছু মাসের পেমেন্ট ইতিমধ্যে জমা আছে। আবার খুলে চেষ্টা করুন।');
        return;
      }

      const now = toMonthKey(new Date());
      const hasFuture = months.some(m => m > now);
      const data = {
        userId: member.id,
        nameId: slotId,
        month: now,
        coveredMonthsList: [...months].sort(),
        monthBreakdown: picked.map(l => ({ month: l.month, baseAmount: l.baseAmount, lateFine: fineOf(l) })),
        annualYears: [...years].sort(),
        annualAmount,
        amount: total,
        baseAmount: base + annualAmount,
        lateFine: fine,
        paymentMethod: method,
        transactionId: trx.trim() || null,
        message: note.trim(),
        paymentType: (years.length && months.length ? 'combined' : years.length ? 'annual' : hasFuture ? 'advance' : 'monthly') as Payment['paymentType'],
        entryType: 'manual' as const,
        enteredBy: admin.id,
        enteredByName: admin.displayName || '',
        receivedDate,
        // the entering admin is the 1st approval; another admin must give the 2nd
        status: 'level_1_approved' as const,
        firstApprovedBy: admin.id,
        firstApprovedByName: admin.displayName || '',
        firstApprovedAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'payments'), data);
      await addDoc(collection(db, 'activityLog'), {
        actorId: admin.id,
        actorName: admin.displayName,
        action: 'PAYMENT_MANUAL_ENTRY',
        paymentId: ref.id,
        amount: total,
        description: `${admin.displayName} ${member.displayName}-এর ${[months.length ? monthListLabelBn(months) : '', years.length ? `বার্ষিক ${years.join(', ')}` : ''].filter(Boolean).join(' ও ')} বাবদ ${taka(total)} ম্যানুয়াল এন্ট্রি দিয়েছেন (দ্বিতীয় অনুমোদনের অপেক্ষায়)।`,
        timestamp: serverTimestamp(),
      });
      onSaved({ id: ref.id, ...data, firstApprovedAt: null, submittedAt: null } as unknown as Payment);
      alert('এন্ট্রি জমা হয়েছে। অন্য একজন অ্যাডমিন অনুমোদন দিলে হিসাবে যোগ হবে।');
      onClose();
    } catch (e: any) {
      console.error(e);
      alert('এন্ট্রি জমা দিতে সমস্যা হয়েছে। ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const chip = (sel: boolean) =>
    `flex items-center justify-between p-2.5 rounded-xl border text-left text-sm transition-all ${sel ? 'bg-primary-50 border-primary-400 ring-1 ring-primary-400' : 'bg-white border-slate-200'}`;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><PenLine size={18} /> ম্যানুয়াল এন্ট্রি</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{member.displayName} — নগদ বা অ্যাপের বাইরে নেওয়া টাকা। অন্য একজন অ্যাডমিন অনুমোদন দিলে যোগ হবে।</p>

        {member.names.length > 1 && (
          <div className="flex gap-2 overflow-x-auto mb-4">
            {member.names.map(n => (
              <button key={n.nameId} onClick={() => { setSlotId(n.nameId); setMonths([]); setYears([]); }}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${slotId === n.nameId ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {n.label}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm font-bold text-slate-700 mb-2">মাস নির্বাচন</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {lines.map(l => {
            const sel = months.includes(l.month);
            return (
              <button key={l.month} onClick={() => toggle(months, l.month, setMonths)} className={chip(sel)}>
                <span>
                  <span className="block font-medium text-slate-800">{monthLabelBn(l.month)}</span>
                  <span className={`text-[10px] ${l.status === 'overdue' ? 'text-red-600' : l.status === 'current' ? 'text-orange-600' : 'text-slate-400'}`}>
                    {l.status === 'overdue' ? 'বকেয়া' : l.status === 'current' ? 'চলতি' : 'অগ্রিম'}
                  </span>
                </span>
                <input type="checkbox" readOnly checked={sel} className="accent-primary-600" />
              </button>
            );
          })}
          {lines.length === 0 && <p className="col-span-2 text-xs text-slate-400">এই স্লটে দেওয়ার মতো কোনো মাস নেই।</p>}
        </div>

        {annualLines.length > 0 && (
          <>
            <p className="text-sm font-bold text-slate-700 mb-2">বার্ষিক চাঁদা</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {annualLines.map(a => {
                const sel = years.includes(a.year);
                return (
                  <button key={a.year} onClick={() => toggle(years, a.year, setYears)} className={chip(sel)}>
                    <span className="font-medium text-slate-800">{toBnDigits(a.year)} • {taka(a.amount)}</span>
                    <input type="checkbox" readOnly checked={sel} className="accent-primary-600" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
          <input type="checkbox" checked={chargeFine} onChange={e => setChargeFine(e.target.checked)} className="accent-primary-600" />
          নিয়ম অনুযায়ী জরিমানা ধরা হবে
        </label>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">টাকা গ্রহণের তারিখ</label>
            <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">মাধ্যম</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm">
              {['Cash', 'bKash', 'Nagad', 'Rocket', 'Upay', 'Bank'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {method !== 'Cash' && (
          <input value={trx} onChange={e => setTrx(e.target.value)} placeholder="ট্রানজেকশন আইডি (যদি থাকে)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm mb-3" />
        )}
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="নোট (যেমন: কার হাতে নগদ দিয়েছে)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm mb-4 h-16 resize-none" />

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-sm mb-4">
          <div className="flex justify-between"><span>মাসিক ({toBnDigits(months.length)} মাস)</span><span>{taka(base)}</span></div>
          {fine > 0 && <div className="flex justify-between text-red-500"><span>জরিমানা</span><span>+ {taka(fine)}</span></div>}
          {annualAmount > 0 && <div className="flex justify-between"><span>বার্ষিক</span><span>{taka(annualAmount)}</span></div>}
          <div className="flex justify-between font-bold text-primary-700 border-t border-slate-200 mt-2 pt-2"><span>মোট</span><span>{taka(total)}</span></div>
        </div>

        <button onClick={save} disabled={saving || total <= 0} className="w-full bg-primary-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl">
          {saving ? 'জমা হচ্ছে...' : `${taka(total)} এন্ট্রি দিন`}
        </button>
      </div>
    </div>
  );
}
