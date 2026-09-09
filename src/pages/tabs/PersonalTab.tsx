import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { useCurrentMonthPayments } from '../../lib/useCurrentMonthPayments';
import { getMemberSlotSummary, calculatePaymentDetails } from '../../lib/paymentUtils';
import { usePaymentSettings } from '../../lib/usePaymentSettings';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { Payment } from '../../types';
import { TotalSavingsModal } from '../../components/TotalSavingsModal';
import { ProfileChangeModal } from '../../components/ProfileChangeModal';
import { SlotRequestModal } from '../../components/SlotRequestModal';
import { Edit2, Copy, PlusCircle } from 'lucide-react';

export function PersonalTab() {
  const navigate = useNavigate();
  const { userProfile, firebaseUser } = useAuth();
  const { settings } = usePaymentSettings();
  
  const [submittedAmount, setSubmittedAmount] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [cashRecipientName, setCashRecipientName] = useState('');
  const [senderBankAccountNumber, setSenderBankAccountNumber] = useState('');
  const [senderBankAccountHolderName, setSenderBankAccountHolderName] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [paymentType, setPaymentType] = useState<'monthly' | 'annual' | 'advance'>('monthly');
  const [selectedAdvanceMonths, setSelectedAdvanceMonths] = useState<number[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string>('');
  const [showTotalSavings, setShowTotalSavings] = useState(false);
  const [showProfileChangeModal, setShowProfileChangeModal] = useState(false);
  const [showSlotRequestModal, setShowSlotRequestModal] = useState(false);
  const [hasPendingSlotReq, setHasPendingSlotReq] = useState(false);

  const { getSlotPaymentStatus } = useCurrentMonthPayments();

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

  useEffect(() => {
    if (!userProfile) return;
    let isMounted = true;
    const fetchData = async () => {
      try {
        const q = query(
          collection(db, 'payments'),
          where('userId', '==', userProfile.id),
          orderBy('month', 'desc')
        );
        const snap = await getDocs(q);
        if (isMounted) {
          setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [userProfile]);

  if (!userProfile) return null;

  const activeSlot = userProfile.names.find(n => n.nameId === activeSlotId);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthNumber = format(new Date(), 'MM');
  const isAnnualEligible = settings.isAnnualPaymentEnabled && (settings.annualEligibleMonths || []).includes(currentMonthNumber);
  
  const status = activeSlot ? getSlotPaymentStatus(userProfile.id, activeSlot.nameId) : 'not_submitted';
  const hasPending = status === 'pending';
  const hasApproved = status === 'approved';
  
  
  const monthsList = [
    { num: 1, name: 'জানুয়ারি' },
    { num: 2, name: 'ফেব্রুয়ারি' },
    { num: 3, name: 'মার্চ' },
    { num: 4, name: 'এপ্রিল' },
    { num: 5, name: 'মে' },
    { num: 6, name: 'জুন' },
    { num: 7, name: 'জুলাই' },
    { num: 8, name: 'আগস্ট' },
    { num: 9, name: 'সেপ্টেম্বর' },
    { num: 10, name: 'অক্টোবর' },
    { num: 11, name: 'নভেম্বর' },
    { num: 12, name: 'ডিসেম্বর' },
  ];

  const currentYear = format(new Date(), 'yyyy');
  const currentMonthNumStr = format(new Date(), 'MM');
  const currentMonthNum = parseInt(currentMonthNumStr, 10);

  const getMonthCoveredStatus = (monthNum: number) => {
    const monthStr = `${currentYear}-${monthNum.toString().padStart(2, '0')}`;
    const payment = payments.find(p => 
      p.nameId === activeSlot?.nameId &&
      p.status !== 'rejected' &&
      (
        (p.month === monthStr && p.paymentType !== 'annual') || 
        (p.coveredMonthsList && p.coveredMonthsList.includes(monthStr))
      )
    );
    if (!payment) return { isCovered: false, status: 'not_submitted' };
    return { 
      isCovered: true, 
      status: payment.status === 'approved' ? 'approved' : 'pending' 
    };
  };

  const toggleAdvanceMonth = (monthNum: number) => {
    setSelectedAdvanceMonths(prev => 
      prev.includes(monthNum) ? prev.filter(m => m !== monthNum) : [...prev, monthNum]
    );
  };

  // Calculate advance totals
  let advanceBaseTotal = 0;
  let advanceLateFineTotal = 0;
  if (activeSlot && paymentType === 'advance') {
    selectedAdvanceMonths.forEach(m => {
      advanceBaseTotal += activeSlot.monthlyDue;
      if (m === currentMonthNum) {
        advanceLateFineTotal += calculatePaymentDetails(activeSlot.monthlyDue, settings).lateFine;
      }
    });
  }
  const advanceRequiredTotal = advanceBaseTotal + advanceLateFineTotal;

  const annualPaymentsThisYear = payments.filter(p => p.paymentType === 'annual' && p.userId === userProfile.id && p.month.startsWith(currentYear));
  const hasAnnualApproved = annualPaymentsThisYear.some(p => p.status === 'approved');
  const hasAnnualPending = annualPaymentsThisYear.some(p => p.status === 'pending');

  const approvedPayments = payments.filter(p => p.status === 'approved');
  const totalSavedAll = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
  const lateFeeTotal = approvedPayments.reduce((sum, p) => sum + (p.lateFine || 0), 0);
  const annualTotal = approvedPayments.filter(p => p.paymentType === 'annual').reduce((sum, p) => sum + p.amount, 0);
  const monthlyTotal = approvedPayments.filter(p => p.paymentType !== 'annual').reduce((sum, p) => sum + (p.amount - (p.lateFine || 0)), 0);

  const currentMonthPayments = payments.filter(p => p.month === currentMonth);
  const slotSummary = getMemberSlotSummary(userProfile, currentMonthPayments, currentMonth);

  const handleSubmit = async () => {
    if (!activeSlot || !firebaseUser) return;

    let requiredAmount = 0;
    let baseAmount = 0;
    let lateFine = 0;
    let coveredMonthsList: string[] = [];

    if (paymentType === 'advance') {
      if (selectedAdvanceMonths.length === 0) {
        alert('অনুগ্রহ করে অন্তত একটি মাস নির্বাচন করুন।');
        return;
      }
      requiredAmount = advanceRequiredTotal;
      baseAmount = advanceBaseTotal;
      lateFine = advanceLateFineTotal;
      coveredMonthsList = selectedAdvanceMonths.map(m => `${currentYear}-${m.toString().padStart(2, '0')}`);
    } else {
      const calc = activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined) : { totalAmount: 0, lateFine: 0, baseAmount: 0 };
      requiredAmount = paymentType === 'annual' ? (settings.annualAmount || 3000) : calc.totalAmount;
      baseAmount = paymentType === 'annual' ? (settings.annualAmount || 3000) : calc.baseAmount;
      lateFine = paymentType === 'annual' ? 0 : calc.lateFine;
      if (paymentType === 'monthly') {
        coveredMonthsList = [selectedMonth];
      }
    }
    
    if (parseInt(submittedAmount) !== requiredAmount) {
      alert(paymentType === 'advance' ? `নির্বাচিত মাসগুলোর জন্য মোট ৳${requiredAmount} প্রদেয়। সঠিক পরিমাণ লিখুন।` : `আপনার প্রদেয় পরিমাণ ৳${requiredAmount}। সঠিক পরিমাণ দিন।`);
      return;
    }
    
    if (paymentType === 'monthly' && hasPending) {
      alert('আপনার এই মাসের পেমেন্ট ইতিমধ্যে পেন্ডিং অবস্থায় আছে।');
      return;
    }
    if (paymentType === 'annual' && hasAnnualPending) {
      alert('আপনার এই বছরের বার্ষিক পেমেন্ট ইতিমধ্যে পেন্ডিং অবস্থায় আছে।');
      return;
    }

    const isMobileWallet = ['bKash', 'Nagad', 'Rocket', 'Upay'].includes(paymentMethod);
    const isCash = paymentMethod === 'Cash';
    const isBank = paymentMethod === 'Bank';

    let isValid = true;
    let errorMessage = '';

    if (isMobileWallet && !transactionId) {
      isValid = false;
      errorMessage = 'ট্রানজেকশন আইডি প্রদান করুন।';
    } else if (isCash && !cashRecipientName) {
      isValid = false;
      errorMessage = 'যাঁর কাছে নগদ প্রদান করা হয়েছে তার নাম লিখুন।';
    } else if (isBank && (!senderBankAccountNumber || !senderBankAccountHolderName)) {
      isValid = false;
      errorMessage = 'ব্যাংক অ্যাকাউন্ট নম্বর এবং অ্যাকাউন্ট হোল্ডারের নাম প্রদান করুন।';
    }

    if (!isValid) {
      alert(errorMessage);
      return;
    }

    try {
      setUploading(true);
      
      const paymentData = {
        userId: userProfile.id,
        nameId: activeSlot.nameId,
        month: currentMonth,
        amount: requiredAmount,
        baseAmount: baseAmount,
        lateFine: lateFine,
        paymentMethod,
        transactionId: isMobileWallet ? transactionId : null,
        cashRecipientName: isCash ? cashRecipientName : null,
        senderBankAccountNumber: isBank ? senderBankAccountNumber : null,
        senderBankAccountHolderName: isBank ? senderBankAccountHolderName : null,
        message,
        status: 'pending',
        paymentType,
        coveredMonthsList,
        submittedAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'payments'), paymentData);
      
      const monthNamesBangla = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      let logDesc = `${userProfile.displayName} ${activeSlot.label} এর জন্য পেমেন্ট জমা দিয়েছেন`;
      if (paymentType === 'advance' && selectedAdvanceMonths.length > 0) {
        const monthNames = selectedAdvanceMonths.sort((a,b)=>a-b).map(m => monthNamesBangla[m-1]);
        const monthsStr = monthNames.length > 1 
          ? monthNames.slice(0, -1).join(', ') + ' ও ' + monthNames[monthNames.length - 1]
          : monthNames[0];
        logDesc = `${userProfile.displayName} ${monthsStr} মাসের জন্য ৳${advanceRequiredTotal} অগ্রিম প্রদেয় জমা দিয়েছেন।`;
      }
      
      await addDoc(collection(db, 'activityLog'), {
        description: logDesc,
        timestamp: serverTimestamp(),
      });
      
      setSubmittedAmount('');
      setTransactionId('');
      setSelectedAdvanceMonths([]);
      setCashRecipientName('');
      setSenderBankAccountNumber('');
      setSenderBankAccountHolderName('');
      setMessage('');
      
      // Optimistic UI Update
      const newPayment: Payment = {
        id: Math.random().toString(),
        ...paymentData,
        submittedAt: null as any
      } as unknown as Payment;
      
      const newPaymentsList = [newPayment, ...payments];
      newPaymentsList.sort((a, b) => b.month.localeCompare(a.month));
      setPayments(newPaymentsList);
      
      alert('পেমেন্ট সফলভাবে জমা দেওয়া হয়েছে!');
    } catch (error) {
      console.error('Upload failed', error);
      alert('পেমেন্ট জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
    }
  };

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

      
      {/* Status Card First as per requirements */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-heading font-bold text-slate-800 text-lg mb-4">চলতি মাসের স্ট্যাটাস</h2>
        
        {status === 'approved' ? (
          <div className="flex flex-col items-center text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6">
            <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
            <h3 className="text-emerald-700 font-medium mb-1">Payment Cleared</h3>
          </div>
        ) : status === 'pending' ? (
          <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-6">
            <Clock className="text-blue-500 mb-2" size={32} />
            <h3 className="text-blue-700 font-medium mb-1">Pending</h3>
            <p className="text-blue-600/80 text-sm">অ্যাডমিন চেক করার পর আপডেট হবে</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-4 bg-red-50 rounded-2xl border border-red-100 mb-6">
            <AlertCircle className="text-red-500 mb-2" size={32} />
            <h3 className="text-red-700 font-medium mb-1">Not Submitted</h3>
            <p className="text-red-600/80 text-sm">বাকি: ৳{activeSlot?.monthlyDue}</p>
          </div>
        )}

        
        {/* Payment Type Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setPaymentType('monthly')}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-colors ${paymentType === 'monthly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            মাসিক প্রদেয়
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('advance')}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-colors ${paymentType === 'advance' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            অগ্রিম প্রদেয়
          </button>
          {isAnnualEligible && (
            <button
              type="button"
              onClick={() => setPaymentType('annual')}
              className={`flex-1 py-2 text-[11px] sm:text-xs font-medium rounded-lg transition-colors ${paymentType === 'annual' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
            >
              বার্ষিক প্রদেয়
            </button>
          )}
        </div>
{/* Submit Form */}
        {paymentType === 'monthly' && (hasApproved || hasPending) ? (
          <div className="p-4 bg-slate-50 text-center rounded-2xl text-slate-500 text-sm">
            মাসিক পেমেন্ট সম্পন্ন বা পেন্ডিং আছে।
          </div>
        ) : paymentType === 'annual' && (hasAnnualApproved || hasAnnualPending) ? (
          <div className="p-4 bg-slate-50 text-center rounded-2xl text-slate-500 text-sm">
            বার্ষিক পেমেন্ট সম্পন্ন বা পেন্ডিং আছে।
          </div>
        ) : (
          <div className="space-y-4">
            <div>
            
            {paymentType === 'advance' && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-slate-800 mb-3">যে মাসগুলোর টাকা অগ্রিম দিতে চান, সেগুলো নির্বাচন করুন ({currentYear})</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {monthsList.map(m => {
                    const isPast = m.num < currentMonthNum;
                    const { isCovered, status: paymentStatus } = getMonthCoveredStatus(m.num);
                    const isSelected = selectedAdvanceMonths.includes(m.num);
                    
                    let btnClass = "py-2 px-1 text-[10px] sm:text-xs rounded-lg border transition-all flex flex-col justify-center items-center h-[52px] ";
                    if (isPast) {
                      btnClass += "bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed";
                    } else if (isCovered) {
                      btnClass += "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed";
                    } else if (isSelected) {
                      btnClass += "bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/20";
                    } else {
                      btnClass += "bg-white border-slate-200 text-slate-600 hover:border-primary-300";
                    }
                    
                    return (
                      <button
                        key={m.num}
                        onClick={() => { if (!isPast && !isCovered) toggleAdvanceMonth(m.num); }}
                        disabled={isPast || isCovered}
                        className={btnClass}
                      >
                        <div className="font-bold leading-none">{m.name}</div>
                        {isCovered && (
                          <div className={`text-[8px] mt-1 px-1 rounded-sm ${paymentStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {paymentStatus === 'approved' ? 'পরিশোধিত' : 'অপেক্ষমাণ'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {selectedAdvanceMonths.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">নির্বাচিত মাস</p>
                    <div className="space-y-1 mb-3">
                      {selectedAdvanceMonths.sort((a,b)=>a-b).map(m => (
                        <div key={m} className="flex justify-between text-xs text-slate-700">
                          <span>✓ {monthsList.find(x => x.num === m)?.name}</span>
                          <span className="font-medium">৳{activeSlot?.monthlyDue}</span>
                        </div>
                      ))}
                    </div>
                    {advanceLateFineTotal > 0 && (
                      <div className="flex justify-between text-xs text-red-500 mb-2">
                        <span>জরিমানা (চলতি মাস)</span>
                        <span className="font-medium">+ ৳{advanceLateFineTotal}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">মোট অগ্রিম প্রদেয়</span>
                      <span className="text-lg font-black text-primary-600">৳{advanceRequiredTotal}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(() => {
              if (paymentType === 'advance') return null;
              if (paymentType === 'annual') {
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-slate-800 mb-1">বার্ষিক পেমেন্ট (৳{settings.annualAmount || 3000})</p>
                    <p className="text-xs text-slate-500">একবারের পেমেন্ট দিয়ে পুরো বছরের জন্য নিশ্চিত করুন</p>
                  </div>
                );
              }
              return (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-slate-600">মূল পরিমাণ</p>
                    <p className="text-sm font-bold text-slate-800">৳{activeSlot?.monthlyDue || 1000}</p>
                  </div>
                  {(activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).lateFine : 0) > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-slate-600">জরিমানা (বিলম্বে পেমেন্ট)</p>
                      <p className="text-sm font-bold text-red-500">+ ৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).lateFine : 0}</p>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-2"></div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-800">সর্বমোট</p>
                    <p className="text-lg font-black text-primary-600">৳{activeSlot ? calculatePaymentDetails(activeSlot.monthlyDue, settings, paymentType === 'monthly' ? selectedMonth : undefined).totalAmount : 0}</p>
                  </div>
                </div>
              );
            })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">পরিমাণ (৳) *</label>
              <input type="number" value={submittedAmount} onChange={e => setSubmittedAmount(e.target.value)} placeholder="পরিমাণ লিখুন" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" required />
            </div>
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
                <span className="font-bold">লক্ষ্য করুন:</span> হোম পেইজে উল্লেখিত সমিতির ব্যাংক অ্যাকাউন্টে টাকা জমা দেওয়ার পর নিচের তথ্যগুলো পূরণ করুন।
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
                  <input type="text" value={senderBankAccountNumber} onChange={e => setSenderBankAccountNumber(e.target.value)} placeholder="যে অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" />
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
              disabled={uploading || !submittedAmount || !paymentMethod}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm shadow-primary-600/20 flex justify-center items-center gap-2 relative overflow-hidden"
            >
              {uploading ? (
                <span>আপলোড হচ্ছে...</span>
              ) : (
                <>
                  <Upload size={18} />
                  জমা দিন
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-5 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setShowTotalSavings(true)}>
        <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">মোট ব্যক্তিগত সঞ্চয় (Overall)</p>
        <p className="text-3xl font-black mb-4">৳{Math.round(totalSavedAll).toLocaleString('en-IN')}</p>
        
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm mb-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-indigo-200 mb-1">Monthly</p>
              <p className="font-bold">৳{Math.round(monthlyTotal).toLocaleString('en-IN')}</p>
            </div>
            <div className="border-x border-white/20">
              <p className="text-indigo-200 mb-1">Annual</p>
              <p className="font-bold">৳{Math.round(annualTotal).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-red-200 mb-1">Late Fees</p>
              <p className="font-bold">৳{Math.round(lateFeeTotal).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm relative">
          <div className="absolute top-4 right-4 z-10">
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
              <p className="font-bold text-lg">{slotSummary.totalSlots}টি</p>
            </div>
            <div>
              <p className="text-[10px] text-indigo-200 uppercase mb-0.5">সক্রিয় স্লট</p>
              <p className="font-bold text-lg">{slotSummary.totalSlots}টি</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 uppercase mb-0.5">এই মাসে পরিশোধিত</p>
              <p className="font-bold text-lg">{slotSummary.paidSlots}টি</p>
            </div>
            <div>
              <p className="text-[10px] text-red-200 uppercase mb-0.5">এই মাসে বকেয়া</p>
              <p className="font-bold text-lg">{slotSummary.dueSlots}টি</p>
            </div>
          </div>
        </div>
      </div>

      {/* Slot Selector */}
      {userProfile.names.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {userProfile.names.map(slot => (
            <button
              key={slot.nameId}
              onClick={() => setActiveSlotId(slot.nameId)}
              className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeSlotId === slot.nameId
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-heading font-bold text-slate-800 text-lg mb-4">পেমেন্ট হিস্ট্রি</h2>
        {payments.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি</p>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => (
              <div key={payment.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                     payment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                     payment.status === 'rejected' ? 'bg-red-100 text-red-600' :
                     'bg-blue-100 text-blue-600'
                   }`}>
                     {payment.status === 'approved' ? <CheckCircle2 size={20} /> : 
                      payment.status === 'rejected' ? <AlertCircle size={20} /> : 
                      <Clock size={20} />}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-800">
                       {format(new Date(payment.month + '-01'), 'MMMM yyyy')}
                     </p>
                     <p className="text-[10px] text-slate-500 mt-0.5">
                       {payment.status === 'approved' ? 'অনুমোদিত' : 
                        payment.status === 'rejected' ? 'বাতিল' : 
                        'পেন্ডিং'}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-slate-800">৳{payment.amount}</p>
                   {payment.lateFine && payment.lateFine > 0 && (
                     <p className="text-[10px] text-red-500">জরিমানা: ৳{payment.lateFine}</p>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
