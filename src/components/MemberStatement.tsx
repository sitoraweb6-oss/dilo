import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, XCircle, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import { Payment, PaymentSettings, UserProfile } from '../types';
import {
  buildMemberLedger, getPaymentCoverage, describePaymentBn, monthLabelBn, toBnDigits, toMonthKey, paidDateOf, MonthLine,
} from '../lib/ledger';

const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;
const fmtTs = (ts: any) => (ts?.toDate ? format(ts.toDate(), 'dd/MM/yyyy, hh:mm a') : '');
const fmtDay = (ts: any) => (ts?.toDate ? format(ts.toDate(), 'dd/MM/yyyy') : '');

let usersCache: Record<string, string> | null = null;
function useUserNames() {
  const [names, setNames] = useState<Record<string, string>>(usersCache || {});
  useEffect(() => {
    if (usersCache) return;
    getDocs(collection(db, 'users'))
      .then(snap => {
        const map: Record<string, string> = {};
        snap.docs.forEach(d => { map[d.id] = (d.data() as any).displayName || d.id; });
        usersCache = map;
        setNames(map);
      })
      .catch(console.error);
  }, []);
  return names;
}

/**
 * Full, transparent statement for one member:
 * - totals that visibly add up (মাসিক + জরিমানা + বার্ষিক = মোট সঞ্চয়)
 * - month-by-month status per slot, with who approved and when
 * - every transaction (including rejected) with its approval trail
 */
export function MemberStatement({
  member, payments, settings, showExport = true,
}: {
  member: UserProfile;
  payments: Payment[];
  settings: PaymentSettings;
  showExport?: boolean;
}) {
  const userNames = useUserNames();
  const [openSlot, setOpenSlot] = useState<string | null>(member.names?.[0]?.nameId || null);
  const [showAllTx, setShowAllTx] = useState(false);

  const memberPayments = useMemo(
    () => payments
      .filter(p => p.userId === member.id)
      .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0) || b.month.localeCompare(a.month)),
    [payments, member.id]
  );
  const ledger = useMemo(() => buildMemberLedger(member, memberPayments, settings), [member, memberPayments, settings]);

  const nameOf = (id?: string, stored?: string) => stored || (id ? userNames[id] : '') || (id ? 'অ্যাডমিন' : '');
  const slotLabel = (nameId: string) => member.names?.find(n => n.nameId === nameId)?.label || 'পুরোনো স্লট';

  // ---- totals that add up ----
  let monthly = 0, fines = 0, annual = 0, pendingAmt = 0;
  memberPayments.forEach(p => {
    if (p.status === 'approved') {
      const cov = getPaymentCoverage(p);
      Object.values(cov.perMonth).forEach(v => { monthly += v.base; fines += v.fine; });
      Object.values(cov.perAnnual).forEach(v => { annual += v; });
    } else if (p.status === 'pending' || p.status === 'level_1_approved') {
      pendingAmt += p.amount || 0;
    }
  });
  const totalApproved = memberPayments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0);
  // payments whose coverage can't be split (very old data) — shown so the sum still matches
  const unallocated = Math.round(totalApproved - (monthly + fines + annual));

  const approvalLine = (p: Payment) => {
    if (p.status === 'rejected') {
      return (
        <p className="text-red-600">
          বাতিল করেছেন: {nameOf(p.rejectedBy, p.rejectedByName)} {fmtTs(p.rejectedAt) && `• ${fmtTs(p.rejectedAt)}`}
          {p.rejectReason && <span className="block">কারণ: {p.rejectReason}</span>}
        </p>
      );
    }
    return (
      <>
        {p.firstApprovedBy && (
          <p>১ম অনুমোদন: <span className="font-medium text-slate-700">{nameOf(p.firstApprovedBy, p.firstApprovedByName)}</span> {fmtTs(p.firstApprovedAt) && `• ${fmtTs(p.firstApprovedAt)}`}</p>
        )}
        {(p.secondApprovedBy || p.approvedBy) && p.status === 'approved' && (
          <p>২য় অনুমোদন: <span className="font-medium text-slate-700">{nameOf(p.secondApprovedBy || p.approvedBy, p.secondApprovedByName)}</span> {fmtTs(p.secondApprovedAt || p.approvedAt) && `• ${fmtTs(p.secondApprovedAt || p.approvedAt)}`}</p>
        )}
        {p.status === 'approved' && !p.firstApprovedBy && !p.secondApprovedBy && !p.approvedBy && (
          <p>অনুমোদিত {fmtDay(p.approvedAt) && `• ${fmtDay(p.approvedAt)}`} (অনুমোদনকারীর তথ্য নেই)</p>
        )}
        {p.isCopiedRecord && <p className="text-indigo-600">মাইগ্রেশন থেকে কপি করা রেকর্ড</p>}
        {p.entryType === 'manual' && (
          <p className="text-indigo-600">ম্যানুয়াল এন্ট্রি দিয়েছেন: {nameOf(p.enteredBy, p.enteredByName)}{p.receivedDate ? ` • টাকা গ্রহণ: ${p.receivedDate.split('-').reverse().join('/')}` : ''}</p>
        )}
      </>
    );
  };

  const statusBadge = (s: MonthLine['status'], future: boolean) => {
    const map: Record<string, [string, string]> = {
      paid: [future ? 'অগ্রিম পরিশোধিত' : 'পরিশোধিত', 'bg-emerald-100 text-emerald-700'],
      pending: ['অপেক্ষমাণ', 'bg-amber-100 text-amber-700'],
      overdue: ['বকেয়া', 'bg-red-100 text-red-700'],
      current: ['বাকি (চলতি)', 'bg-orange-100 text-orange-700'],
      upcoming: ['—', 'bg-slate-100 text-slate-400'],
    };
    const [label, cls] = map[s];
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${cls}`}>{label}</span>;
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const monthRows = ledger.slots.flatMap(s =>
      [...s.months, ...s.upcoming.filter(l => l.status === 'paid' || l.status === 'pending')].map(l => ({
        'Slot': s.slot.label,
        'Month': l.month,
        'Status': l.status,
        'Base': l.payment ? Math.round(getPaymentCoverage(l.payment).perMonth[l.month]?.base || 0) : l.baseAmount,
        'Fine': l.payment ? Math.round(getPaymentCoverage(l.payment).perMonth[l.month]?.fine || 0) : l.lateFine,
        'Paid on': l.payment ? fmtDay(l.payment.submittedAt) : '',
        '1st approver': l.payment ? nameOf(l.payment.firstApprovedBy, l.payment.firstApprovedByName) : '',
        '2nd approver': l.payment && l.payment.status === 'approved' ? nameOf(l.payment.secondApprovedBy || l.payment.approvedBy, l.payment.secondApprovedByName) : '',
        'Approved on': l.payment ? fmtDay(l.payment.approvedAt) : '',
      }))
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), 'Months');
    const txRows = memberPayments.map(p => {
      const cov = getPaymentCoverage(p);
      return {
        'Submitted': fmtTs(p.submittedAt) || p.month,
        'Slot': slotLabel(p.nameId),
        'Months': cov.months.join(', '),
        'Annual': cov.annualYears.join(', '),
        'Amount': p.amount,
        'Fine': p.lateFine || 0,
        'Method': p.paymentMethod || '',
        'Transaction ID': p.transactionId || '',
        'Status': p.status,
        'Entry': p.entryType === 'manual' ? `Manual by ${nameOf(p.enteredBy, p.enteredByName)}` : 'Member',
        'Received on': p.receivedDate || '',
        '1st approver': nameOf(p.firstApprovedBy, p.firstApprovedByName),
        '1st approved at': fmtTs(p.firstApprovedAt),
        '2nd approver': p.status === 'approved' ? nameOf(p.secondApprovedBy || p.approvedBy, p.secondApprovedByName) : '',
        '2nd approved at': fmtTs(p.secondApprovedAt || p.approvedAt),
        'Rejected by': p.status === 'rejected' ? nameOf(p.rejectedBy, p.rejectedByName) : '',
        'Reject reason': p.rejectReason || '',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows.length ? txRows : [{ Submitted: 'No payments' }]), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Item: 'Monthly contribution', BDT: Math.round(monthly) },
      { Item: 'Late fines', BDT: Math.round(fines) },
      { Item: 'Annual contribution', BDT: Math.round(annual) },
      ...(unallocated ? [{ Item: 'Other (old records)', BDT: unallocated }] : []),
      { Item: 'TOTAL SAVINGS (approved)', BDT: Math.round(totalApproved) },
      { Item: 'Pending approval', BDT: Math.round(pendingAmt) },
      { Item: 'Outstanding dues', BDT: Math.round(ledger.dueAmount) },
    ]), 'Summary');
    XLSX.writeFile(wb, `statement_${member.displayName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const txList = showAllTx ? memberPayments : memberPayments.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Totals that add up */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-800">হিসাবের সারাংশ</p>
          {showExport && (
            <button onClick={exportExcel} className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
              <FileSpreadsheet size={13} /> Excel
            </button>
          )}
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-slate-600"><span>মাসিক চাঁদা</span><span>{taka(monthly)}</span></div>
          <div className="flex justify-between text-slate-600"><span>জরিমানা</span><span>{taka(fines)}</span></div>
          <div className="flex justify-between text-slate-600"><span>বার্ষিক চাঁদা</span><span>{taka(annual)}</span></div>
          {unallocated !== 0 && (
            <div className="flex justify-between text-slate-600"><span>অন্যান্য (পুরোনো রেকর্ড)</span><span>{taka(unallocated)}</span></div>
          )}
          <div className="h-px bg-slate-200 my-1" />
          <div className="flex justify-between font-bold text-emerald-700"><span>মোট সঞ্চয় (অনুমোদিত)</span><span>{taka(totalApproved)}</span></div>
          {pendingAmt > 0 && <div className="flex justify-between text-amber-700"><span>অনুমোদনের অপেক্ষায়</span><span>{taka(pendingAmt)}</span></div>}
          <div className={`flex justify-between font-bold ${ledger.dueAmount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
            <span>বকেয়া</span><span>{ledger.dueAmount > 0 ? taka(ledger.dueAmount) : 'নেই'}</span>
          </div>
        </div>
      </div>

      {/* Month by month per slot */}
      <div>
        <p className="text-sm font-bold text-slate-800 mb-2">মাসভিত্তিক হিসাব</p>
        <div className="space-y-2">
          {ledger.slots.map(s => {
            const lines = [
              ...s.months,
              ...s.upcoming.filter(l => l.status === 'paid' || l.status === 'pending'),
            ].sort((a, b) => b.month.localeCompare(a.month));
            const open = openSlot === s.slot.nameId;
            return (
              <div key={s.slot.nameId} className="border border-slate-200 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenSlot(open ? null : s.slot.nameId)} className="w-full flex items-center justify-between p-3 bg-white">
                  <span className="text-sm font-bold text-slate-700">{s.slot.label} <span className="font-normal text-slate-400 text-xs">• {taka(s.slot.monthlyDue)}/মাস • শুরু {monthLabelBn(s.startMonth)}</span></span>
                  <span className="flex items-center gap-2">
                    {s.dueAmount > 0 && <span className="text-[11px] font-bold text-red-600">বকেয়া {taka(s.dueAmount)}</span>}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {open && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {s.annual.map(a => (
                      <div key={`a${a.year}`} className="p-3 text-xs bg-indigo-50/40">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-700">বার্ষিক {toBnDigits(a.year)}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-700">{taka(a.amount)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : a.status === 'pending' ? 'bg-amber-100 text-amber-700' : a.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                              {a.status === 'paid' ? 'পরিশোধিত' : a.status === 'pending' ? 'অপেক্ষমাণ' : a.status === 'overdue' ? 'বকেয়া' : 'এ বছরে দিতে হবে'}
                            </span>
                          </span>
                        </div>
                        {a.payment && <div className="text-[10px] text-slate-500 mt-1">জমা: {fmtDay(a.payment.submittedAt)} {approvalLine(a.payment)}</div>}
                      </div>
                    ))}
                    {lines.map(l => {
                      const part = l.payment ? getPaymentCoverage(l.payment).perMonth[l.month] : undefined;
                      const amount = part ? part.base + part.fine : l.baseAmount + l.lateFine;
                      const fine = part ? part.fine : l.lateFine;
                      return (
                        <div key={l.month} className="p-3 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-700">{monthLabelBn(l.month)}</span>
                            <span className="flex items-center gap-2">
                              <span className="text-slate-700">{taka(amount)}{fine > 0 && <span className="text-red-500"> (জরিমানা {taka(fine)})</span>}</span>
                              {statusBadge(l.status, l.month > toMonthKey(new Date()))}
                            </span>
                          </div>
                          {l.payment && (
                            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                              <p>জমা: {l.payment.receivedDate ? fmtDay({ toDate: () => paidDateOf(l.payment!)! }) : (fmtTs(l.payment.submittedAt) || monthLabelBn(l.payment.month))}{l.payment.paymentMethod ? ` • ${l.payment.paymentMethod}` : ''}{l.payment.transactionId ? ` • ${l.payment.transactionId}` : ''}</p>
                              {approvalLine(l.payment)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {lines.length === 0 && <p className="p-3 text-xs text-slate-400">কোনো মাস নেই</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Every transaction with approval trail */}
      <div>
        <p className="text-sm font-bold text-slate-800 mb-2">সব লেনদেন ({toBnDigits(memberPayments.length)}টি)</p>
        {memberPayments.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4 bg-slate-50 rounded-xl">কোনো পেমেন্ট রেকর্ড নেই</p>
        ) : (
          <div className="space-y-2">
            {txList.map(p => (
              <div key={p.id} className={`p-3 border rounded-xl ${p.status === 'rejected' ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between gap-3">
                  <div className="flex gap-2 min-w-0">
                    <span className="mt-0.5 shrink-0">
                      {p.status === 'approved' ? <CheckCircle2 size={16} className="text-emerald-600" />
                        : p.status === 'rejected' ? <XCircle size={16} className="text-red-500" />
                        : p.status === 'level_1_approved' ? <AlertCircle size={16} className="text-blue-500" />
                        : <Clock size={16} className="text-amber-500" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-snug">
                        {describePaymentBn(p)}
                        {p.entryType === 'manual' && <span className="ml-1.5 align-middle text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">ম্যানুয়াল</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {slotLabel(p.nameId)} • জমা: {fmtTs(p.submittedAt) || monthLabelBn(p.month)}
                        {p.paymentMethod ? ` • ${p.paymentMethod}` : ''}{p.transactionId ? ` • ${p.transactionId}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${p.status === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{taka(p.amount || 0)}</p>
                    {(p.lateFine || 0) > 0 && <p className="text-[10px] text-red-500">জরিমানা {taka(p.lateFine || 0)}</p>}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 pl-6 space-y-0.5">{approvalLine(p)}
                  {(p.status === 'pending') && <p className="text-amber-600">অনুমোদনের অপেক্ষায়</p>}
                </div>
              </div>
            ))}
            {memberPayments.length > 5 && (
              <button onClick={() => setShowAllTx(v => !v)} className="w-full text-xs font-bold text-primary-700 py-2">
                {showAllTx ? 'কম দেখান' : `সব ${toBnDigits(memberPayments.length)}টি দেখান`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
