import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle, AlertTriangle, MessageCircle, Info, ShieldCheck, Download, Plus, Circle, Check } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp, runTransaction, addDoc, collection, getDocs, query, where, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Investment, InvestmentOpinion } from '../../types';
import { format } from 'date-fns';

interface Props {
  investment: Investment;
  onClose: () => void;
  availableFund: number;
}

export function InvestmentDetailsModal({ investment, onClose, availableFund }: Props) {
  const { userProfile, isAdmin } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [returnAmount, setReturnAmount] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);

  const [voteOpinion, setVoteOpinion] = useState('');

  const isCompletedOrActive = ['INVESTED', 'COMPLETED', 'CLOSED'].includes(investment.status);
  const canApprove = isAdmin && !isCompletedOrActive && investment.status !== 'REJECTED' && investment.status !== 'CANCELLED';
  const hasVoted = investment.votedUserIds?.includes(userProfile?.id || '');

  const totalVotes = investment.totalVotes || 0;
  const approveVotes = investment.approveVotes || 0;
  const rejectVotes = investment.rejectVotes || 0;
  
  const approvePercent = totalVotes > 0 ? Math.round((approveVotes / totalVotes) * 100) : 0;
  const rejectPercent = totalVotes > 0 ? Math.round((rejectVotes / totalVotes) * 100) : 0;

  const getTimelineSteps = () => {
    return [
      { id: 'PROPOSED', label: 'প্রস্তাব তৈরি', date: investment.createdAt, done: true },
      { id: 'VOTING', label: 'সদস্য মতামত', date: null, done: totalVotes > 0 || !investment.votingRequired },
      { id: 'FIRST_APPROVAL', label: 'প্রথম অনুমোদন', date: investment.firstApprovedAt, done: !!investment.firstApproverId },
      { id: 'SECOND_APPROVAL', label: 'দ্বিতীয় অনুমোদন ও তহবিল কর্তন', date: investment.secondApprovedAt, done: !!investment.secondApproverId },
      { id: 'INVESTED', label: 'বিনিয়োগ চলমান', date: investment.fundDeductedAt, done: investment.status === 'INVESTED' || investment.status === 'COMPLETED' },
      { id: 'COMPLETED', label: 'সম্পন্ন', date: investment.closedAt, done: investment.status === 'COMPLETED' || investment.status === 'CLOSED' },
    ];
  };

  const handleVote = async (vote: 'approve' | 'reject') => {
    if (!userProfile || hasVoted) return;
    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'investments', investment.id);
        const invDoc = await transaction.get(invRef);
        if (!invDoc.exists()) throw new Error("Investment not found");
        
        const data = invDoc.data() as Investment;
        const votedUsers = data.votedUserIds || [];
        if (votedUsers.includes(userProfile.id)) throw new Error("Already voted");

        const newOpinion: InvestmentOpinion = {
          userId: userProfile.id,
          userName: userProfile.displayName,
          vote,
          text: voteOpinion,
          timestamp: new Date().toISOString()
        };

        transaction.update(invRef, {
          votedUserIds: [...votedUsers, userProfile.id],
          totalVotes: (data.totalVotes || 0) + 1,
          approveVotes: (data.approveVotes || 0) + (vote === 'approve' ? 1 : 0),
          rejectVotes: (data.rejectVotes || 0) + (vote === 'reject' ? 1 : 0),
          opinions: arrayUnion(newOpinion)
        });
      });
      alert('আপনার ভোট সফলভাবে জমা হয়েছে');
    } catch (error) {
      console.error(error);
      alert('ভোট জমা দিতে সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFirstApproval = async () => {
    if (!isAdmin || !userProfile) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'investments', investment.id), {
        status: 'FIRST_APPROVAL_50',
        firstApproverId: userProfile.id,
        firstApproverName: userProfile.displayName,
        firstApprovedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, 'activityLog'), {
        actorId: userProfile.id,
        action: 'INVESTMENT_APPROVED_1',
        targetId: investment.id,
        description: `${userProfile.displayName} বিনিয়োগে প্রথম অনুমোদন দিয়েছেন: ${investment.name}`,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      alert('অনুমোদন ব্যর্থ হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalApproval = async () => {
    if (!isAdmin || !userProfile) return;
    setIsProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'investments', investment.id);
        const invDoc = await transaction.get(invRef);
        if (!invDoc.exists()) throw new Error("Investment not found");
        
        const data = invDoc.data() as Investment;
        
        if (data.status === 'INVESTED' || data.fundDeducted) {
          throw new Error("This investment has already been finalized.");
        }
        
        if (data.firstApproverId === userProfile.id) {
          throw new Error("You cannot provide both first and final approvals.");
        }

        const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('status', '==', 'approved')));
        const yearlySnap = await getDocs(query(collection(db, 'yearlyPayments'), where('status', '==', 'approved')));
        let totalCollection = 0;
        paymentsSnap.forEach(d => totalCollection += d.data().amount || 0);
        yearlySnap.forEach(d => totalCollection += d.data().amount || 0);

        const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('status', '==', 'approved')));
        let totalExpense = 0;
        expensesSnap.forEach(d => totalExpense += d.data().amount || 0);

        const invTxnSnap = await getDocs(collection(db, 'investmentTransactions'));
        let invOutflow = 0;
        let invReturn = 0;
        invTxnSnap.forEach(d => {
          const t = d.data();
          if (t.type === 'outflow') invOutflow += t.amount || 0;
          if (t.type === 'return') invReturn += t.amount || 0;
        });

        const currentAvailableFund = totalCollection - totalExpense - invOutflow + invReturn;

        if (data.amount > currentAvailableFund) {
          throw new Error("Insufficient funds.");
        }

        const txnRef = doc(collection(db, 'investmentTransactions'));
        
        transaction.set(txnRef, {
          investmentId: data.id,
          type: 'outflow',
          amount: data.amount,
          description: `Investment: ${data.name}`,
          createdAt: serverTimestamp(),
          approvedBy: userProfile.id
        });

        transaction.update(invRef, {
          status: 'INVESTED',
          secondApproverId: userProfile.id,
          secondApproverName: userProfile.displayName,
          secondApprovedAt: serverTimestamp(),
          fundDeducted: true,
          fundDeductedAt: serverTimestamp(),
          financialTransactionId: txnRef.id,
          amountDeducted: data.amount
        });
      });
      
      await addDoc(collection(db, 'activityLog'), {
        actorId: userProfile.id,
        action: 'INVESTMENT_FINALIZED',
        targetId: investment.id,
        description: `${userProfile.displayName} বিনিয়োগ চূড়ান্ত অনুমোদন করেছেন এবং ৳${investment.amount} কর্তন হয়েছে।`,
        timestamp: serverTimestamp()
      });
      
      setShowConfirm(false);
      alert('বিনিয়োগ চূড়ান্ত অনুমোদিত এবং তহবিল কর্তন সম্পন্ন হয়েছে।');
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`ব্যর্থ হয়েছে: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !userProfile) return;
    setIsProcessing(true);
    try {
      const amt = Number(returnAmount);
      const isComplete = window.confirm("Is this the final return (closing the investment)?");
      
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'investments', investment.id);
        const invDoc = await transaction.get(invRef);
        const data = invDoc.data() as Investment;
        
        const txnRef = doc(collection(db, 'investmentTransactions'));
        transaction.set(txnRef, {
          investmentId: data.id,
          type: 'return',
          amount: amt,
          description: `Return for: ${data.name} - ${returnNote}`,
          createdAt: serverTimestamp(),
          approvedBy: userProfile.id
        });

        const newReturnedAmount = (data.returnedAmount || 0) + amt;
        const profit = newReturnedAmount > (data.amountDeducted || data.amount) ? newReturnedAmount - (data.amountDeducted || data.amount) : 0;
        const loss = isComplete && newReturnedAmount < (data.amountDeducted || data.amount) ? (data.amountDeducted || data.amount) - newReturnedAmount : 0;

        transaction.update(invRef, {
          returnedAmount: newReturnedAmount,
          profit,
          loss,
          status: isComplete ? 'COMPLETED' : data.status,
          ...(isComplete ? { closedAt: serverTimestamp() } : {})
        });
      });
      
      setShowReturnForm(false);
      alert('ফেরত সফলভাবে যুক্ত করা হয়েছে।');
    } catch (error) {
      console.error(error);
      alert('ব্যর্থ হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const steps = getTimelineSteps();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-safe pb-safe">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl my-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="sticky top-0 bg-white z-20 flex justify-between items-center p-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black font-heading text-slate-800 leading-tight">{investment.name}</h2>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">{investment.status}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 tracking-wider">{investment.category}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-8 pb-32">
          
          {/* Main Financials */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-slate-200/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
              <p className="text-xs font-bold text-slate-500 mb-1 relative z-10">প্রস্তাবিত বিনিয়োগ</p>
              <p className="text-xl font-black text-slate-800 relative z-10 font-heading tracking-tight">৳ {investment.amount.toLocaleString('en-IN')}</p>
            </div>
            {investment.amountDeducted ? (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                <p className="text-xs font-bold text-emerald-700 mb-1 relative z-10">তহবিল থেকে কর্তন হয়েছে</p>
                <p className="text-xl font-black text-emerald-700 relative z-10 font-heading tracking-tight">৳ {investment.amountDeducted.toLocaleString('en-IN')}</p>
              </div>
            ) : (
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                <p className="text-xs font-bold text-indigo-700 mb-1 relative z-10">উপলব্ধ তহবিল</p>
                <p className="text-xl font-black text-indigo-700 relative z-10 font-heading tracking-tight">৳ {availableFund.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Info size={14}/> উদ্দেশ্য</p>
              <p className="text-sm font-bold text-slate-800 leading-relaxed">{investment.purpose}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Info size={14}/> বিস্তারিত বিবরণ</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">{investment.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 border border-emerald-100/50 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase mb-1">সম্ভাব্য লাভ</p>
                <p className="text-sm font-bold text-emerald-900">{investment.expectedReturn}</p>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/50 p-3.5 rounded-xl">
                <p className="text-[10px] font-bold text-rose-600/70 uppercase mb-1">সম্ভাব্য ঝুঁকি</p>
                <p className="text-sm font-bold text-rose-900">{investment.expectedRisk}</p>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-5">বিনিয়োগ অগ্রগতি</h3>
            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex gap-4 relative">
                  {idx !== steps.length - 1 && (
                    <div className={`absolute left-[11px] top-6 bottom-[-16px] w-[2px] rounded-full ${step.done ? 'bg-emerald-200' : 'bg-slate-200'}`}></div>
                  )}
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white ${step.done ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 text-slate-300'}`}>
                    {step.done ? <Check size={12} strokeWidth={3} /> : <Circle size={8} fill="currentColor" />}
                  </div>
                  <div className="pb-2">
                    <p className={`text-sm font-bold ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                    {step.date && <p className="text-[10px] text-slate-500 font-medium">{format(step.date.toDate ? step.date.toDate() : new Date(step.date), 'dd MMM yyyy, hh:mm a')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Voting Section */}
          {investment.votingRequired && (
            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2"><MessageCircle size={16}/> সদস্য মতামত</h3>
              
              <div className="bg-white rounded-xl p-4 border border-indigo-50 mb-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-500">মোট ভোট: {totalVotes}</span>
                  <span className="text-xs font-bold text-slate-500">সমর্থন: {approvePercent}%</span>
                </div>
                <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${approvePercent}%` }} className="bg-emerald-500 h-full" />
                  <motion.div initial={{ width: 0 }} animate={{ width: `${rejectPercent}%` }} className="bg-rose-500 h-full" />
                </div>
                <div className="flex justify-between mt-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">সমর্থন করি</p>
                      <p className="text-sm font-black text-slate-800">{approveVotes}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">সমর্থন করি না</p>
                      <p className="text-sm font-black text-slate-800">{rejectVotes}</p>
                    </div>
                  </div>
                </div>
              </div>

              {!hasVoted && !isCompletedOrActive && investment.status !== 'REJECTED' && investment.status !== 'CANCELLED' && (
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-700 mb-3">আপনার মতামত দিন</p>
                  <input 
                    type="text" 
                    placeholder="মতামত / মন্তব্য (ঐচ্ছিক)" 
                    value={voteOpinion}
                    onChange={(e) => setVoteOpinion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none mb-3" 
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleVote('approve')} disabled={isProcessing} className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-sm">সমর্থন করি</button>
                    <button onClick={() => handleVote('reject')} disabled={isProcessing} className="flex-1 bg-rose-500 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-rose-600 transition-colors shadow-sm">সমর্থন করি না</button>
                  </div>
                </div>
              )}

              {/* Display Opinions */}
              {investment.opinions && investment.opinions.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">সাম্প্রতিক মতামত</p>
                  {investment.opinions.slice(-5).map((opinion, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-800">{opinion.userName}</span>
                        {opinion.vote === 'approve' && <span className="text-[9px] px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100 font-bold">সমর্থন</span>}
                        {opinion.vote === 'reject' && <span className="text-[9px] px-1.5 py-0.5 rounded text-rose-700 bg-rose-100 font-bold">অসমর্থন</span>}
                      </div>
                      {opinion.text && <p className="text-xs text-slate-600 leading-relaxed">{opinion.text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Approval Section - Visual Box */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck size={16}/> এডমিন অনুমোদন</h3>
            
            <div className="space-y-3">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${investment.firstApproverId ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${investment.firstApproverId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {investment.firstApproverId ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">1</span>}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${investment.firstApproverId ? 'text-emerald-900' : 'text-slate-700'}`}>প্রথম অনুমোদন (50%)</p>
                    <p className={`text-[10px] ${investment.firstApproverId ? 'text-emerald-700' : 'text-slate-400'}`}>{investment.firstApproverName || 'অপেক্ষমাণ'}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${investment.secondApproverId ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${investment.secondApproverId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {investment.secondApproverId ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">2</span>}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${investment.secondApproverId ? 'text-emerald-900' : 'text-slate-700'}`}>চূড়ান্ত অনুমোদন (100%)</p>
                    <p className={`text-[10px] ${investment.secondApproverId ? 'text-emerald-700' : 'text-slate-400'}`}>{investment.secondApproverName || 'অপেক্ষমাণ'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Block */}
          {(investment.status === 'INVESTED' || investment.status === 'COMPLETED') && (
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="text-sm font-bold text-amber-900 mb-4 relative z-10">বিনিয়োগ ফলাফল</h3>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-wide">ফেরত প্রাপ্ত অর্থ</p>
                  <p className="text-lg font-black text-amber-900 font-heading">৳ {(investment.returnedAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-wide">বাস্তব লাভ / ক্ষতি</p>
                  {investment.profit && investment.profit > 0 ? (
                    <p className="text-lg font-black text-emerald-600 font-heading">+ ৳ {investment.profit.toLocaleString('en-IN')}</p>
                  ) : investment.loss && investment.loss > 0 ? (
                    <p className="text-lg font-black text-rose-600 font-heading">- ৳ {investment.loss.toLocaleString('en-IN')}</p>
                  ) : (
                    <p className="text-lg font-black text-slate-400 font-heading">৳ 0</p>
                  )}
                </div>
              </div>

              {isAdmin && investment.status === 'INVESTED' && (
                <div className="mt-4 relative z-10">
                  <button onClick={() => setShowReturnForm(!showReturnForm)} className="w-full bg-white border border-amber-300 text-amber-700 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors shadow-sm">
                    {showReturnForm ? 'ফর্ম আড়াল করুন' : 'ফলাফল / অর্থ ফেরত যোগ করুন'}
                  </button>
                  <AnimatePresence>
                    {showReturnForm && (
                      <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleReturn} 
                        className="bg-white p-4 rounded-xl border border-amber-200 mt-3 space-y-3 overflow-hidden shadow-inner"
                      >
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">ফেরত প্রাপ্ত অর্থ (৳)</label>
                          <input type="number" required min="0" value={returnAmount} onChange={(e) => setReturnAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">নোট / বিবরণ</label>
                          <input type="text" required value={returnNote} onChange={(e) => setReturnNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                        </div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-2.5 rounded-lg text-sm shadow-md shadow-amber-600/20 flex justify-center items-center gap-2">
                          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'জমা দিন'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Bar (Sticky Bottom) */}
        {canApprove && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {!investment.firstApproverId ? (
              <button onClick={handleFirstApproval} disabled={isProcessing} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 text-sm">
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : 'প্রথম অনুমোদন করুন (50%)'}
              </button>
            ) : investment.firstApproverId !== userProfile?.id ? (
              showConfirm ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0" size={20} />
                    <p className="text-sm font-bold text-rose-900 leading-relaxed">
                      চূড়ান্ত অনুমোদনের মাধ্যমে <span className="font-black text-rose-700">৳ {investment.amount.toLocaleString('en-IN')}</span> সমিতির তহবিল থেকে কর্তন হবে। <br/><br/>
                      অনুমোদনের পর সম্ভাব্য অবশিষ্ট: <span className="font-black text-rose-700">৳ {(availableFund - investment.amount).toLocaleString('en-IN')}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm shadow-sm">বাতিল</button>
                    <button onClick={handleFinalApproval} disabled={isProcessing} className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-rose-700 shadow-md shadow-rose-600/20 flex justify-center items-center gap-2">
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'চূড়ান্ত অনুমোদন'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button onClick={() => {
                  if (investment.amount > availableFund) {
                    alert('এই বিনিয়োগের জন্য পর্যাপ্ত তহবিল নেই।');
                  } else {
                    setShowConfirm(true);
                  }
                }} disabled={isProcessing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex justify-center items-center gap-2 text-sm">
                  চূড়ান্ত অনুমোদন করুন (100%)
                </button>
              )
            ) : (
              <p className="text-center text-xs font-bold text-slate-500 py-2 bg-slate-50 rounded-lg">আপনি প্রথম অনুমোদন করেছেন। অন্য একজন এডমিনকে চূড়ান্ত অনুমোদন করতে হবে।</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
