import React, { useState, useEffect, useMemo } from 'react';
import { Upload, CheckCircle2, Clock, AlertCircle, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { usePaymentSettings } from '../../lib/usePaymentSettings';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { Payment } from '../../types';
import { TotalSavingsModal } from '../../components/TotalSavingsModal';
import { ProfileChangeModal } from '../../components/ProfileChangeModal';
import { SlotRequestModal } from '../../components/SlotRequestModal';
import { MemberStatement } from '../../components/MemberStatement';
import { Copy, PlusCircle, Edit2 } from 'lucide-react';
import {
  buildMemberLedger, getPaymentCoverage, isActivePaymentStatus, monthLabelBn, monthListLabelBn,
  toBnDigits, toMonthKey, describePaymentBn, MonthLine,
} from '../../lib/ledger';

const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;

export function PersonalTab() {
  const { userProfile, firebaseUser } = useAuth();
  const { settings } = usePaymentSettings();

  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashRecipientName, setCashRecipientName] = useState('');
  const [senderBankAccountNumber, setSenderBankAccountNumber] = useState('');
  const [senderBankAccountHolderName, setSenderBankAccountHolderName] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [showAdvance, setShowAdvance] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string>('');
  const [showTotalSavings, setShowTotalSavings] = useState(false);
  const [showProfileChangeModal, setShowProfileChangeModal] = useState(false);
  const [showSlotRequestModal, setShowSlotRequestModal] = useState(false);
  const [hasPendingSlotReq, setHasPendingSlotReq] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      const unsub = onSnapshot(query(
        collection(db, 'adminRequests'),
        where('targetUserId', '==', userProfile.id),
        where('requestType', '==', 'SLOT_INCREASE'),
        where('status', 'in', ['PENDING', 'LEVEL_1_APPROVED'])
      ), (snap) => {
        setHasPendingSlotReq(!snap.empty);
      });
      return () => unsub();
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (userProfile && userProfile.names.length > 0 && !activeSlotId) {
      setActiveSlotId(userProfile.names[0].nameId);
    }
  }, [userProfile, activeSlotId]);

  // Clear selection when switching slot
  useEffect(() => {
    setSelectedMonths([]);
    setSelectedYears([]);
    setShowAdvance(false);
  }, [activeSlotId]);

  const fetchMyPayments = async (uid: string) => {
    const snap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid)));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    list.sort((a, b) => {
      const ta = a.submittedAt?.toMillis?.() ?? 0;
      const tb = b.submittedAt?.toMillis?.() ?? 0;
      return tb - ta || b.month.localeCompare(a.month);
    });
    return list;
  };

  useEffect(() => {
    if (!userProfile) return;
    let isMounted = true;
    fetchMyPayments(userProfile.id)
      .then(list => { if (isMounted) setPayments(list); })
      .catch(console.error);
    return () => { isMounted = false; };
  }, [userProfile]);

  const ledger = useMemo(
    () => (userProfile ? buildMemberLedger(userProfile, payments, settings) : null),
    [userProfile, payments, settings]
  );

  if (!userProfile || !ledger) return null;

  const today = new Date();
  const currentMonth = toMonthKey(today);
  const currentMonthNumber = format(today, 'MM');
  const slotLedger = ledger.slots.find(s => s.slot.nameId === activeSlotId) || ledger.slots[0];
  const activeSlot = slotLedger?.slot;

  // ---- what can be paid now ----
  const dueLines: MonthLine[] = slotLedger ? slotLedger.months.filter(l => l.status === 'overdue' || l.status === 'current') : [];
  const advanceLines: MonthLine[] = slotLedger ? slotLedger.upcoming.filter(l => l.status === 'upcoming') : [];
  const eligibleMonths = settings.annualEligibleMonths || [];
  const canPayCurrentAnnual = eligibleMonths.length === 0 || eligibleMonths.includes(currentMonthNumber);
  const annualLines = slotLedger
    ? slotLedger.annual.filter(a => a.status === 'overdue' || (a.status === 'due' && canPayCurrentAnnual))
    : [];
  const allDuesSelected = dueLines.every(l => selectedMonths.includes(l.month));

  const lineByMonth = new Map<string, MonthLine>([...dueLines, ...advanceLines].map(l => [l.month, l]));
  const pickedLines = selectedMonths.map(m => lineByMonth.get(m)).filter(Boolean) as MonthLine[];
  const monthsBase = pickedLines.reduce((s, l) => s + l.baseAmount, 0);
  const monthsFine = pickedLines.reduce((s, l) => s + l.lateFine, 0);
  const annualUnit = settings.annualAmount || 0;
  const annualTotalSelected = selectedYears.length * annualUnit;
  const grandTotal = monthsBase + monthsFine + annualTotalSelected;

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(m)) {
        // unselecting a due month also drops any advance months (advance needs all dues first)
        const isDue = dueLines.some(l => l.month === m);
        return prev.filter(x => x !== m && !(isDue && advanceLines.some(a => a.month === x)));
      }
      return [...prev, m].sort();
    });
  };
  const toggleYear = (y: string) => {
    setSelectedYears(prev => (prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y].sort()));
  };
  const selectAllDues = () => {
    setSelectedMonths(prev => Array.from(new Set([...prev, ...dueLines.map(l => l.month)])).sort());
    setSelectedYears(prev => Array.from(new Set([...prev, ...annualLines.filter(a => a.status === 'overdue').map(a => a.year)])).sort());
  };

  // ---- savings summary (own records, fines included) ----
  const approvedPayments = payments.filter(p => p.status === 'approved');
  let monthlyTotal = 0, lateFeeTotal = 0, annualTotal = 0;
  approvedPayments.forEach(p => {
    const cov = getPaymentCoverage(p);
    Object.values(cov.perMonth).forEach(v => { monthlyTotal += v.base; lateFeeTotal += v.fine; });
    Object.values(cov.perAnnual).forEach(v => { annualTotal += v; });
  });
  const totalSavedAll = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const slotsPaidThisMonth = ledger.slots.filter(s => s.months.find(l => l.month === currentMonth)?.status === 'paid').length;
  const slotsDueThisMonth = ledger.slots.filter(s => {
    const st = s.months.find(l => l.month === currentMonth)?.status;
    return st === 'current' || st === 'overdue';
  }).length;

  const resetForm = () => {
    setTransactionId('');
    setSelectedMonths([]);
    setSelectedYears([]);
    setShowAdvance(false);
    setCashRecipientName('');
    setSenderBankAccountNumber('');
    setSenderBankAccountHolderName('');
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!activeSlot || !firebaseUser || uploading) return;

    if (selectedMonths.length === 0 && selectedYears.length === 0) {
      alert('অন্তত একটি মাস বা বার্ষিক চাঁদা নির্বাচন করুন।');
      return;
    }

    const isMobileWallet = ['bKash', 'Nagad', 'Rocket', 'Upay'].includes(paymentMethod);
    const isCash = paymentMethod === 'Cash';
    const isBank = paymentMethod === 'Bank';
    if (!paymentMethod) { alert('পেমেন্ট মেথড নির্বাচন করুন।'); return; }
    if (isMobileWallet && !transactionId.trim()) { alert('ট্রানজেকশন আইডি প্রদান করুন।'); return; }
    if (isCash && !cashRecipientName.trim()) { alert('যাঁর কাছে নগদ প্রদান করা হয়েছে তার নাম লিখুন।'); return; }
    if (isBank && (!senderBankAccountNumber.trim() || !senderBankAccountHolderName.trim())) {
      alert('ব্যাংক অ্যাকাউন্ট নম্বর এবং অ্যাকাউন্ট হোল্ডারের নাম প্রদান করুন।');
      return;
    }

    const confirmText =
      `${activeSlot.label} — মোট ${taka(grandTotal)}\n` +
      (selectedMonths.length ? `মাস: ${monthListLabelBn(selectedMonths)}\n` : '') +
      (selectedYears.length ? `বার্ষিক: ${selectedYears.map(toBnDigits).join(', ')}\n` : '') +
      `\nআপনি কি ঠিক এই পরিমাণ টাকা পাঠিয়েছেন?`;
    if (!window.confirm(confirmText)) return;

    try {
      setUploading(true);

      // Re-check from the server so the same month can't be submitted twice (double tap / two devices)
      const fresh = await fetchMyPayments(userProfile.id);
      const taken = new Set<string>();
      fresh.filter(p => p.nameId === activeSlot.nameId && isActivePaymentStatus(p.status)).forEach(p => {
        const cov = getPaymentCoverage(p);
        cov.months.forEach(m => taken.add(m));
        cov.annualYears.forEach(y => taken.add(`annual-${y}`));
      });
      const clash = [...selectedMonths.filter(m => taken.has(m)), ...selectedYears.filter(y => taken.has(`annual-${y}`))];
      if (clash.length > 0) {
        setPayments(fresh);
        setSelectedMonths([]);
        setSelectedYears([]);
        alert('নির্বাচিত কিছু মাসের পেমেন্ট আগেই জমা হয়ে গেছে। তালিকা আপডেট করা হলো, আবার নির্বাচন করুন।');
        return;
      }

      const hasFuture = selectedMonths.some(m => m > currentMonth);
      const paymentType: Payment['paymentType'] =
        selectedYears.length && selectedMonths.length ? 'combined'
        : selectedYears.length ? 'annual'
        : hasFuture ? 'advance' : 'monthly';

      const paymentData = {
        userId: userProfile.id,
        nameId: activeSlot.nameId,
        month: currentMonth, // submission month only
        coveredMonthsList: [...selectedMonths].sort(),
        monthBreakdown: pickedLines
          .sort((a, b) => a.month.localeCompare(b.month))
          .map(l => ({ month: l.month, baseAmount: l.baseAmount, lateFine: l.lateFine })),
        annualYears: [...selectedYears].sort(),
        annualAmount: annualTotalSelected,
        amount: grandTotal,
        baseAmount: monthsBase + annualTotalSelected,
        lateFine: monthsFine,
        paymentMethod,
        transactionId: isMobileWallet ? transactionId.trim() : null,
        cashRecipientName: isCash ? cashRecipientName.trim() : null,
        senderBankAccountNumber: isBank ? senderBankAccountNumber.trim() : null,
        senderBankAccountHolderName: isBank ? senderBankAccountHolderName.trim() : null,
        message,
        status: 'pending',
        paymentType,
        submittedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, 'payments'), paymentData);

      const what = [
        selectedMonths.length ? `${monthListLabelBn(selectedMonths)} মাসের` : '',
        selectedYears.length ? `${selectedYears.map(toBnDigits).join(', ')} সালের বার্ষিক` : '',
      ].filter(Boolean).join(' এবং ');
      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile.displayName} (${activeSlot.label}) ${what} চাঁদা বাবদ ${taka(grandTotal)} জমা দিয়েছেন।`,
        timestamp: serverTimestamp(),
      });

      setPayments([{ id: ref.id, ...paymentData, submittedAt: null } as unknown as Payment, ...fresh]);
      resetForm();
      alert('পেমেন্ট সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন অনুমোদনের পর হিসাবে যোগ হবে।');
    } catch (error) {
      console.error('Upload failed', error);
      alert('পেমেন্ট জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
    }
  };

  const chip = (selected: boolean) =>
    `w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
      selected ? 'bg-primary-50 border-primary-400 ring-1 ring-primary-400' : 'bg-white border-slate-200 hover:border-primary-300'
    }`;

  return (
    <div className="space-y-6 pb-6">
      {showTotalSavings && <TotalSavingsModal onClose={() => setShowTotalSavings(false)} />}

      {showProfileChangeModal && <ProfileChangeModal onClose={() => setShowProfileChangeModal(false)} />}
      {showSlotRequestModal && <SlotRequestModal userProfile={userProfile} settings={settings} onClose={() => setShowSlotRequestModal(false)} />}
      
      {/* My Profile Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-bold text-slate-800 text-lg">আমার প্রোফাইল</h2>
          <button 
            onClick={() => setShowProfileChangeModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors"
          >
            <Edit2 size={14} /> পরিবর্তন
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">নাম</p>
              <p className="text-sm font-bold text-slate-800">{userProfile.displayName}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">ব্যক্তিগত মোবাইল</p>
              <p className="text-sm font-bold text-slate-800">{userProfile.personalMobile}</p>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(userProfile.personalMobile || '')}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              title="Copy"
            >
              <Copy size={16} />
            </button>
          </div>

          {(userProfile.emergencyContactMobile || userProfile.emergencyContactName) && (
            <div className="flex justify-between items-center p-3 bg-orange-50/50 rounded-xl border border-orange-100">
              <div>
                <p className="text-[10px] font-bold text-orange-600 uppercase mb-0.5">জরুরি যোগাযোগ {userProfile.emergencyContactName ? `(${userProfile.emergencyContactName})` : ''}</p>
                <p className="text-sm font-bold text-slate-800">{userProfile.emergencyContactMobile || 'N/A'}</p>
              </div>
              {userProfile.emergencyContactMobile && (
                <button 
                  onClick={() => navigator.clipboard.writeText(userProfile.emergencyContactMobile || '')}
                  className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                  title="Copy"
                >
                  <Copy size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Slot Selector */}
      {userProfile.names.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {ledger.slots.map(s => (
            <button
              key={s.slot.nameId}
              onClick={() => setActiveSlotId(s.slot.nameId)}
              className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeSlotId === s.slot.nameId
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {s.slot.label}
              {s.dueAmount > 0 && <span className="ml-1.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">বকেয়া</span>}
            </button>
          ))}
        </div>
      )}

      {/* My account / dues */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-heading font-bold text-slate-800 text-lg mb-4">
          আমার হিসাব {userProfile.names.length > 1 && activeSlot ? <span className="text-slate-400 font-medium text-sm">({activeSlot.label})</span> : null}
        </h2>

        {!slotLedger ? (
          <p className="text-slate-500 text-sm text-center py-4">আপনার কোনো স্লট নেই।</p>
        ) : (
          <>
            {slotLedger.dueAmount > 0 ? (
              <div className="flex flex-col items-center text-center p-4 bg-red-50 rounded-2xl border border-red-100 mb-4">
                <AlertCircle className="text-red-500 mb-2" size={32} />
                <h3 className="text-red-700 font-bold mb-1">মোট বকেয়া {taka(slotLedger.dueAmount)}</h3>
                <p className="text-red-600/80 text-sm">
                  {slotLedger.overdueMonths > 0 ? `${toBnDigits(slotLedger.overdueMonths)} মাস বাকি পড়েছে` : 'চলতি মাসের চাঁদা বাকি'}
                  {slotLedger.annual.some(a => a.status === 'overdue') ? ' • আগের বছরের বার্ষিক বাকি' : ''}
                </p>
              </div>
            ) : slotLedger.pendingCount > 0 ? (
              <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                <Clock className="text-blue-500 mb-2" size={32} />
                <h3 className="text-blue-700 font-medium mb-1">অনুমোদনের অপেক্ষায়</h3>
                <p className="text-blue-600/80 text-sm">অ্যাডমিন চেক করার পর আপডেট হবে</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4">
                <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                <h3 className="text-emerald-700 font-medium mb-1">কোনো বকেয়া নেই</h3>
              </div>
            )}

            {/* Month-by-month status, current year */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><CalendarCheck size={14} /> মাসভিত্তিক হিসাব ({toBnDigits(today.getFullYear())})</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[...slotLedger.months, ...slotLedger.upcoming]
                  .filter(l => l.month.startsWith(String(today.getFullYear())))
                  .map(l => {
                    const cls =
                      l.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : l.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : l.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200'
                      : l.status === 'current' ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-slate-50 text-slate-400 border-slate-100';
                    const label =
                      l.status === 'paid' ? 'পরিশোধিত' : l.status === 'pending' ? 'অপেক্ষমাণ'
                      : l.status === 'overdue' ? 'বকেয়া' : l.status === 'current' ? 'চলতি' : '—';
                    return (
                      <div key={l.month} className={`border rounded-lg py-1.5 text-center ${cls}`}>
                        <p className="text-[11px] font-bold leading-tight">{monthLabelBn(l.month, false)}</p>
                        <p className="text-[9px] mt-0.5">{label}</p>
                      </div>
                    );
                  })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">হিসাব শুরু: {monthLabelBn(slotLedger.startMonth)}</p>
            </div>

            {/* ---- Payment form ---- */}
            {dueLines.length === 0 && annualLines.length === 0 && advanceLines.length === 0 ? null : (
              <div className="space-y-4">
                {dueLines.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-slate-800">বকেয়া ও চলতি মাস</p>
                      {dueLines.length > 1 && (
                        <button type="button" onClick={selectAllDues} className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                          সব বকেয়া নির্বাচন
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {dueLines.map(l => {
                        const sel = selectedMonths.includes(l.month);
                        return (
                          <button type="button" key={l.month} onClick={() => toggleMonth(l.month)} className={chip(sel)}>
                            <span className="flex items-center gap-2">
                              <input type="checkbox" readOnly checked={sel} className="accent-primary-600 w-4 h-4" />
                              <span className="text-sm font-medium text-slate-800">{monthLabelBn(l.month)}</span>
                              {l.status === 'overdue' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">বকেয়া</span>}
                            </span>
                            <span className="text-right">
                              <span className="block text-sm font-bold text-slate-800">{taka(l.baseAmount + l.lateFine)}</span>
                              {l.lateFine > 0 && <span className="block text-[10px] text-red-500">জরিমানা {taka(l.lateFine)} সহ</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {annualLines.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-2">বার্ষিক চাঁদা</p>
                    <div className="space-y-2">
                      {annualLines.map(a => {
                        const sel = selectedYears.includes(a.year);
                        return (
                          <button type="button" key={a.year} onClick={() => toggleYear(a.year)} className={chip(sel)}>
                            <span className="flex items-center gap-2">
                              <input type="checkbox" readOnly checked={sel} className="accent-primary-600 w-4 h-4" />
                              <span className="text-sm font-medium text-slate-800">{toBnDigits(a.year)} সালের বার্ষিক</span>
                              {a.status === 'overdue' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">বকেয়া</span>}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{taka(a.amount)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {advanceLines.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvance(v => !v)}
                      className="text-sm font-bold text-primary-700 underline underline-offset-4"
                    >
                      {showAdvance ? 'অগ্রিম মাস লুকান' : 'সামনের মাসের অগ্রিম দিতে চান?'}
                    </button>
                    {showAdvance && (
                      !allDuesSelected ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2">
                          অগ্রিম দেওয়ার আগে উপরের সব বকেয়া ও চলতি মাস নির্বাচন করুন।
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          {advanceLines.map(l => {
                            const sel = selectedMonths.includes(l.month);
                            return (
                              <button
                                type="button"
                                key={l.month}
                                onClick={() => toggleMonth(l.month)}
                                className={`py-2 px-1 rounded-lg border text-center transition-all ${sel ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                              >
                                <p className="text-xs font-bold leading-tight">{monthLabelBn(l.month, false)}</p>
                                <p className={`text-[9px] ${sel ? 'text-primary-100' : 'text-slate-400'}`}>{toBnDigits(l.month.slice(0, 4))} • {taka(l.baseAmount)}</p>
                              </button>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                )}

                {grandTotal > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {selectedMonths.length > 0 && (
                      <div className="flex justify-between text-sm text-slate-700 mb-1">
                        <span>মাসিক চাঁদা ({toBnDigits(selectedMonths.length)} মাস)</span>
                        <span className="font-medium">{taka(monthsBase)}</span>
                      </div>
                    )}
                    {monthsFine > 0 && (
                      <div className="flex justify-between text-sm text-red-500 mb-1">
                        <span>জরিমানা</span>
                        <span className="font-medium">+ {taka(monthsFine)}</span>
                      </div>
                    )}
                    {selectedYears.length > 0 && (
                      <div className="flex justify-between text-sm text-slate-700 mb-1">
                        <span>বার্ষিক চাঁদা ({toBnDigits(selectedYears.length)} বছর)</span>
                        <span className="font-medium">{taka(annualTotalSelected)}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">সর্বমোট পাঠাতে হবে</span>
                      <span className="text-xl font-black text-primary-600">{taka(grandTotal)}</span>
                    </div>
                  </div>
                )}

                {grandTotal > 0 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">পেমেন্ট মেথড *</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all">
                        <option value="">নির্বাচন করুন</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Rocket">Rocket</option>
                        <option value="Upay">Upay</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    {paymentMethod === 'Bank' && (
                      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm text-blue-800">
                        <span className="font-bold">লক্ষ্য করুন:</span> হোম পেইজে উল্লেখিত সমিতির ব্যাংক অ্যাকাউন্টে টাকা জমা দেওয়ার পর নিচের তথ্যগুলো পূরণ করুন।
                      </div>
                    )}

                    {['bKash', 'Nagad', 'Rocket', 'Upay'].includes(paymentMethod) && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ট্রানজেকশন আইডি *</label>
                        <input type="text" value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
                      </div>
                    )}

                    {paymentMethod === 'Cash' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">যাঁর কাছে নগদ প্রদান করা হয়েছে *</label>
                        <input type="text" value={cashRecipientName} onChange={e => setCashRecipientName(e.target.value)} placeholder="নাম লিখুন" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
                      </div>
                    )}

                    {paymentMethod === 'Bank' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">আপনার ব্যাংক অ্যাকাউন্ট নম্বর *</label>
                          <input type="text" value={senderBankAccountNumber} onChange={e => setSenderBankAccountNumber(e.target.value)} placeholder="যে অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">আপনার অ্যাকাউন্ট হোল্ডারের নাম *</label>
                          <input type="text" value={senderBankAccountHolderName} onChange={e => setSenderBankAccountHolderName(e.target.value)} placeholder="অ্যাকাউন্টের নাম" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">মেসেজ (অপশনাল)</label>
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="কোনো বার্তা থাকলে লিখুন..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all resize-none h-20"
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={uploading || !paymentMethod}
                      className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm shadow-primary-600/20 flex justify-center items-center gap-2"
                    >
                      {uploading ? <span>জমা হচ্ছে...</span> : (<><Upload size={18} /> {taka(grandTotal)} জমা দিন</>)}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-5 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setShowTotalSavings(true)}>
        <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">মোট ব্যক্তিগত সঞ্চয় (Overall)</p>
        <p className="text-3xl font-black mb-4">{taka(totalSavedAll)}</p>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm mb-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-indigo-200 mb-1">মাসিক</p>
              <p className="font-bold">{taka(monthlyTotal)}</p>
            </div>
            <div className="border-x border-white/20">
              <p className="text-indigo-200 mb-1">বার্ষিক</p>
              <p className="font-bold">{taka(annualTotal)}</p>
            </div>
            <div>
              <p className="text-red-200 mb-1">জরিমানা</p>
              <p className="font-bold">{taka(lateFeeTotal)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex justify-end mb-3" onClick={e => e.stopPropagation()}>
            {hasPendingSlotReq ? (
              <div className="bg-amber-100/90 text-amber-800 p-2 rounded-lg backdrop-blur-md border border-amber-200 text-xs shadow-sm max-w-[200px] text-right ml-auto">
                <div className="flex items-center justify-end gap-1.5 font-bold mb-1">
                  <Clock size={12} />
                  <span>আবেদন অপেক্ষমাণ</span>
                </div>
                <p className="text-[10px] leading-tight">আপনার নতুন স্লটের আবেদনটি এডমিনের অনুমোদনের অপেক্ষায় আছে।</p>
              </div>
            ) : (
              <button
                onClick={() => setShowSlotRequestModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold backdrop-blur-md border border-white/20 shadow-sm"
              >
                <PlusCircle size={16} />
                <span>নতুন স্লট যোগ করুন</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-[10px] text-indigo-200 uppercase mb-0.5">মোট স্লট</p>
              <p className="font-bold text-lg">{toBnDigits(ledger.slots.length)}টি</p>
            </div>
            <div>
              <p className="text-[10px] text-red-200 uppercase mb-0.5">মোট বকেয়া</p>
              <p className="font-bold text-lg">{taka(ledger.dueAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase mb-0.5">এই মাসে পরিশোধিত</p>
              <p className="font-bold text-lg">{toBnDigits(slotsPaidThisMonth)}টি স্লট</p>
            </div>
            <div>
              <p className="text-[10px] text-red-200 uppercase mb-0.5">এই মাসে বাকি</p>
              <p className="font-bold text-lg">{toBnDigits(slotsDueThisMonth)}টি স্লট</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full statement: totals, month-by-month, every transaction with approvals */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-heading font-bold text-slate-800 text-lg mb-4">আমার হিসাব বিবরণী</h2>
        <MemberStatement member={userProfile} payments={payments} settings={settings} />
      </div>

    </div>
  );
}
