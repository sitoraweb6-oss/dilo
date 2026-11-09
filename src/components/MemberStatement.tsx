import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, XCircle, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { db } from '../lib/firebase';
import { Payment, PaymentSettings, UserProfile } from '../types';
import {
  buildMemberLedger, getPaymentCoverage, describePaymentBn, monthLabelBn, toBnDigits, toMonthKey, paidDateOf, MonthLine, normalizeLegacyPayments,
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
  member, payments, settings, showExport = true, showSummary = true,
}: {
  member: UserProfile;
  payments: Payment[];
  settings: PaymentSettings;
  showExport?: boolean;
  /** hide the totals block where the page already shows them (personal tab) */
  showSummary?: boolean;
}) {
  const userNames = useUserNames();
  const [slotId, setSlotId] = useState<string>(member.names?.[0]?.nameId || '');
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [showTx, setShowTx] = useState(false);

  const memberPayments = useMemo(
    () => normalizeLegacyPayments(payments.filter(p => p.userId === member.id), [member], settings)
      .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0) || b.month.localeCompare(a.month)),
    [payments, member, settings]
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
        {p.autoAllocated && (
          <p className="text-teal-700">
            পুরোনো রেকর্ড: {monthLabelBn(p.month)}-এ দেওয়া {taka(p.amount || 0)} থেকে {p.coveredMonthsList?.length ? p.coveredMonthsList.map(m => monthLabelBn(m, false)).join(', ') : ''} মাসে সমন্বয় করা হয়েছে
          </p>
        )}
        {p.entryType === 'manual' && (
          <p className="text-indigo-600">ম্যানুয়াল এন্ট্রি দিয়েছেন: {nameOf(p.enteredBy, p.enteredByName)}{p.receivedDate ? ` • টাকা গ্রহণ: ${p.receivedDate.split('-').reverse().join('/')}` : ''}</p>
        )}
      </>
    );
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

  const slotLedger = ledger.slots.find(x => x.slot.nameId === slotId) || ledger.slots[0];
  const currentMonth = toMonthKey(new Date());
  const allLines: MonthLine[] = slotLedger
    ? [...slotLedger.months, ...slotLedger.upcoming.filter(l => l.status === 'paid' || l.status === 'pending')]
        .sort((a, b) => b.month.localeCompare(a.month))
    : [];
  const lines = showAllMonths ? allLines : allLines.slice(0, 6);

  const pill = (label: string, cls: string) => (
    <span className={`inline-block min-w-[64px] text-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${cls}`}>{label}</span>
  );
  const monthPill = (l: MonthLine) =>
    l.status === 'paid' ? pill(l.month > currentMonth ? 'অগ্রিম' : 'পরিশোধিত', 'bg-emerald-100 text-emerald-700')
    : l.status === 'pending' ? pill('অপেক্ষমাণ', 'bg-amber-100 text-amber-700')
    : l.status === 'overdue' ? pill('বকেয়া', 'bg-red-100 text-red-700')
    : l.status === 'current' ? pill('বাকি', 'bg-orange-100 text-orange-700')
    : pill('—', 'bg-slate-100 text-slate-400');

  const details = (p: Payment) => (
    <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-600 space-y-1">
      <p>
        জমা: <b className="text-slate-700">{paidDateOf(p) ? format(paidDateOf(p)!, 'dd/MM/yyyy') : monthLabelBn(p.month)}</b>
        {p.paymentMethod ? ` • ${p.paymentMethod}` : ''}{p.transactionId ? ` • ${p.transactionId}` : ''}
      </p>
      <p>এই পেমেন্টে: {describePaymentBn(p)} — মোট {taka(p.amount || 0)}</p>
      {approvalLine(p)}
      {p.message ? <p>নোট: {p.message}</p> : null}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 1. Totals */}
      {showSummary && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-[10px] font-bold text-emerald-700">মোট জমা</p>
              <p className="text-base font-black text-emerald-700 mt-0.5">{taka(totalApproved)}</p>
            </div>
            <div className={`rounded-2xl p-3 text-center border ${ledger.dueAmount > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] font-bold ${ledger.dueAmount > 0 ? 'text-red-600' : 'text-slate-500'}`}>বকেয়া</p>
              <p className={`text-base font-black mt-0.5 ${ledger.dueAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{ledger.dueAmount > 0 ? taka(ledger.dueAmount) : 'নেই'}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-[10px] font-bold text-amber-700">অপেক্ষমাণ</p>
              <p className="text-base font-black text-amber-700 mt-0.5">{taka(pendingAmt)}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            মোট জমা = মাসিক {taka(monthly)} + জরিমানা {taka(fines)} + বার্ষিক {taka(annual)}{unallocated !== 0 ? ` + অন্যান্য ${taka(unallocated)}` : ''}
          </p>
        </div>
      )}

      {/* 2. Month by month */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-800">মাসভিত্তিক হিসাব</p>
          {showExport && (
            <button onClick={exportExcel} className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
              <FileSpreadsheet size={12} /> Excel
            </button>
          )}
        </div>

        {ledger.slots.length > 1 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto">
            {ledger.slots.map(x => (
              <button key={x.slot.nameId} onClick={() => { setSlotId(x.slot.nameId); setOpenRow(null); }}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${x.slot.nameId === slotLedger?.slot.nameId ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {x.slot.label}{x.dueAmount > 0 ? ' •' : ''}
              </button>
            ))}
          </div>
        )}

        {!slotLedger ? (
          <p className="text-xs text-slate-400 text-center py-4">কোনো স্লট নেই</p>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-slate-50 text-[10px] font-bold text-slate-500">
              <span>মাস</span><span className="text-right">টাকা</span><span className="text-center min-w-[64px]">অবস্থা</span>
            </div>
            {slotLedger.annual.filter(a => a.status !== 'due' || a.year === String(new Date().getFullYear())).map(a => {
              const key = `y${a.year}`;
              const open = openRow === key;
              return (
                <div key={key} className="border-t border-slate-100">
                  <button onClick={() => a.payment && setOpenRow(open ? null : key)} className="w-full grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 text-left">
                    <span className="text-sm font-medium text-slate-800">বার্ষিক {toBnDigits(a.year)}</span>
                    <span className="text-sm text-slate-700 text-right">{taka(a.amount)}</span>
                    {a.status === 'paid' ? pill('পরিশোধিত', 'bg-emerald-100 text-emerald-700')
                      : a.status === 'pending' ? pill('অপেক্ষমাণ', 'bg-amber-100 text-amber-700')
                      : a.status === 'overdue' ? pill('বকেয়া', 'bg-red-100 text-red-700')
                      : pill('দিতে হবে', 'bg-slate-100 text-slate-500')}
                  </button>
                  {open && a.payment && <div className="px-3 pb-3">{details(a.payment)}</div>}
                </div>
              );
            })}
            {lines.map(l => {
              const part = l.payment ? getPaymentCoverage(l.payment).perMonth[l.month] : undefined;
              const amount = part ? part.base + part.fine : l.baseAmount + l.lateFine;
              const fine = part ? part.fine : l.lateFine;
              const pd = l.payment ? paidDateOf(l.payment) : null;
              const open = openRow === l.month;
              return (
                <div key={l.month} className="border-t border-slate-100">
                  <button onClick={() => l.payment && setOpenRow(open ? null : l.month)} className="w-full grid grid-cols-[1fr_auto_auto] gap-3 items-center px-3 py-2.5 text-left">
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{monthLabelBn(l.month)}</span>
                      <span className="block text-[10px] text-slate-400">
                        {pd ? `জমা ${format(pd, 'dd/MM/yyyy')}` : l.status === 'overdue' || l.status === 'current' ? 'এখনো দেওয়া হয়নি' : ''}
                        {l.payment?.entryType === 'manual' ? ' • ম্যানুয়াল' : ''}
                        {l.payment?.autoAllocated ? ' • সমন্বয়' : ''}
                        {l.payment ? ' • বিস্তারিত ›' : ''}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm text-slate-800">{taka(amount)}</span>
                      {fine > 0 && <span className="block text-[10px] text-red-500">জরিমানা {taka(fine)}</span>}
                    </span>
                    {monthPill(l)}
                  </button>
                  {open && l.payment && <div className="px-3 pb-3">{details(l.payment)}</div>}
                </div>
              );
            })}
            {allLines.length > 6 && (
              <button onClick={() => setShowAllMonths(v => !v)} className="w-full border-t border-slate-100 py-2 text-xs font-bold text-primary-700">
                {showAllMonths ? 'কম দেখান' : `আরো ${toBnDigits(allLines.length - 6)} মাস দেখান`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Every transaction (collapsed) */}
      <div>
        <button onClick={() => setShowTx(v => !v)} className="w-full flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5">
          <span className="text-sm font-bold text-slate-800">সব লেনদেন ({toBnDigits(memberPayments.length)}টি)</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${showTx ? 'rotate-180' : ''}`} />
        </button>
        {showTx && (
          <div className="mt-2 space-y-2">
            {memberPayments.length === 0 && <p className="text-center text-slate-500 text-sm py-4">কোনো পেমেন্ট নেই</p>}
            {memberPayments.map(p => {
              const key = `t${p.id}`;
              const open = openRow === key;
              const pd = paidDateOf(p);
              return (
                <div key={p.id} className={`rounded-xl border ${p.status === 'rejected' ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-100 bg-white'}`}>
                  <button onClick={() => setOpenRow(open ? null : key)} className="w-full flex items-center gap-3 p-3 text-left">
                    <span className="shrink-0">
                      {p.status === 'approved' ? <CheckCircle2 size={18} className="text-emerald-600" />
                        : p.status === 'rejected' ? <XCircle size={18} className="text-red-500" />
                        : p.status === 'level_1_approved' ? <AlertCircle size={18} className="text-blue-500" />
                        : <Clock size={18} className="text-amber-500" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{describePaymentBn(p)}</span>
                      <span className="block text-[10px] text-slate-400">
                        {pd ? format(pd, 'dd/MM/yyyy') : monthLabelBn(p.month)}
                        {ledger.slots.length > 1 ? ` • ${slotLabel(p.nameId)}` : ''}
                        {p.entryType === 'manual' ? ' • ম্যানুয়াল' : ''}
                        {p.status === 'rejected' ? ' • বাতিল' : p.status === 'approved' ? '' : ' • অপেক্ষমাণ'}
                      </span>
                    </span>
                    <span className={`text-sm font-bold shrink-0 ${p.status === 'rejected' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{taka(p.amount || 0)}</span>
                  </button>
                  {open && <div className="px-3 pb-3">{details(p)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
