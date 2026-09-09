import React from 'react';
import { hasPermission } from '../../lib/AuthContext';
import { useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { Payment, UserProfile } from '../../types';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sendPushNotificationToUsers } from '../../lib/pushNotifications';

export const PendingMemberItem: React.FC<{ member: UserProfile, currentUser: UserProfile, onComplete?: () => void }> = ({ member, currentUser, onComplete }) => {
  const isAdmin = currentUser && (String(currentUser.role).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'super_admin');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const handleApprove = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', member.id), { status: 'active', role: isAdmin ? role : 'member' });
      await addDoc(collection(db, 'activityLog'), {
        description: `${currentUser.displayName} নতুন সদস্য ${member.displayName}-কে অনুমোদন দিয়েছেন`,
        timestamp: serverTimestamp(),
      });
      onComplete?.();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'users', member.id), { status: 'rejected' });
      await addDoc(collection(db, 'activityLog'), {
        description: `${currentUser.displayName} নতুন সদস্য ${member.displayName}-এর অনুরোধ বাতিল করেছেন`,
        timestamp: serverTimestamp(),
      });
    onComplete?.();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 border border-amber-100 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 shrink-0 bg-amber-100 rounded-full border-2 border-amber-300 flex items-center justify-center text-amber-700 font-bold text-sm">
            {member.photoURL ? (
              <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              member.displayName.charAt(0)
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{member.displayName}</p>
            <p className="text-[10px] text-slate-500">
              স্লট: {member.names.map(n => n.label).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleReject} disabled={loading}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
          >
            <XCircle size={20} />
          </button>
          <button 
            onClick={handleApprove} disabled={loading}
            className="p-2 text-primary-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={20} />
          </button>
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-600">রোল:</span>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
          >
            <option value="member">মেম্বার</option>
            <option value="admin">এডমিন</option>
          </select>
        </div>
      )}
    </div>
  );
}

export const PendingPaymentItem: React.FC<{ payment: Payment, user?: UserProfile, currentUser: UserProfile, usersMap?: Record<string, UserProfile>, onComplete?: () => void }> = ({ payment, user, currentUser, usersMap, onComplete }) => {
  const isAdmin = hasPermission(currentUser, 'admin');
  
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const isMine = payment.userId === currentUser.id;
  const canApprove = isAdmin && !isMine;
  const hasApprovedLevel1 = payment.status === 'level_1_approved' && payment.firstApprovedBy === currentUser.id;

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return format(d, 'dd MMM yyyy, hh:mm a');
    } catch {
      return '';
    }
  };

  const handleApprove = async () => {
    if (!canApprove || hasApprovedLevel1) return;
    try {
      setLoading(true);
      
      const paymentRef = doc(db, 'payments', payment.id);
      
      await runTransaction(db, async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists()) throw new Error("Payment does not exist.");
        
        const currentData = paymentDoc.data();
        
        if (payment.status === 'pending') {
          if (currentData.status !== 'pending') throw new Error("Status already changed.");
          
          transaction.update(paymentRef, { 
            status: 'level_1_approved', 
            firstApprovedBy: currentUser.id,
            firstApprovedByName: currentUser.displayName || '',
            firstApprovedAt: serverTimestamp() 
          });
          
          const logRef = doc(collection(db, 'activityLog'));
          transaction.set(logRef, {
            description: `${currentUser.displayName} একটি ${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। প্রথম অনুমোদন সম্পন্ন হয়েছে।`,
            action: 'PAYMENT_FIRST_APPROVED',
            paymentId: payment.id,
            actorId: currentUser.id,
            actorName: currentUser.displayName,
            amount: payment.amount,
            timestamp: serverTimestamp(),
          });
        } else if (payment.status === 'level_1_approved') {
          if (currentData.status !== 'level_1_approved') throw new Error("Status already changed.");
          if (currentData.firstApprovedBy === currentUser.id) {
            throw new Error("আপনি ইতোমধ্যেই প্রথম অনুমোদন করেছেন। অন্য একজন অ্যাডমিনকে দ্বিতীয় অনুমোদন করতে হবে।");
          }
          
          transaction.update(paymentRef, { 
            status: 'approved', 
            secondApprovedBy: currentUser.id,
            secondApprovedByName: currentUser.displayName || '',
            secondApprovedAt: serverTimestamp(),
            approvedBy: currentUser.id,
            approvedAt: serverTimestamp()
          });
          
          const logRef = doc(collection(db, 'activityLog'));
          transaction.set(logRef, {
            description: `${currentUser.displayName} একটি ${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় অনুমোদন করেছেন। দ্বিতীয় অনুমোদন সম্পন্ন হয়েছে।`,
            action: 'PAYMENT_FULLY_APPROVED',
            paymentId: payment.id,
            actorId: currentUser.id,
            actorName: currentUser.displayName,
            amount: payment.amount,
            timestamp: serverTimestamp(),
          });
        }
      });
      
      if (payment.status === 'pending') {
        await sendPushNotificationToUsers([payment.userId], '💰 প্রথম ধাপের অনুমোদন', 'আপনার জমা প্রথম ধাপে অনুমোদিত হয়েছে।');
      } else {
        await sendPushNotificationToUsers([payment.userId], '💰 জমা অনুমোদিত', 'আপনার জমা সফলভাবে অনুমোদিত হয়েছে।');
      }
      
      onComplete?.();
    } catch (error) {
      console.error(error);
      alert("ত্রুটি: পেমেন্ট অনুমোদন করা যায়নি। " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!canApprove || !rejectReason.trim()) return;
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const paymentRef = doc(db, 'payments', payment.id);
      batch.update(paymentRef, {
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedBy: currentUser.id,
        rejectedAt: serverTimestamp()
      });
      const logRef = doc(collection(db, 'activityLog'));
      batch.set(logRef, {
        description: `${currentUser.displayName} ${user?.displayName || 'সদস্য'}-এর ${payment.paymentType === 'advance' ? 'অগ্রিম' : 'মাসিক'} প্রদেয় বাতিল করেছেন। কারণ: ${rejectReason}`,
        action: 'PAYMENT_REJECTED',
        paymentId: payment.id,
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        amount: payment.amount,
        reason: rejectReason,
        timestamp: serverTimestamp(),
      });
      await batch.commit();
      await sendPushNotificationToUsers([payment.userId], '❌ জমা বাতিল', 'আপনার জমা বাতিল করা হয়েছে।');
      onComplete?.();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 border border-amber-100 flex flex-col gap-2 shadow-sm">
      <div className="flex flex-col">
        <div className="flex justify-between items-start">
          <p className="text-xs font-bold text-slate-800">{user?.displayName || 'অজানা সদস্য'}</p>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              payment.status === 'level_1_approved' ? 'bg-blue-100 text-blue-700' :
              payment.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''
            }`}>
              {payment.status === 'level_1_approved' ? 'প্রথম অনুমোদন (50%)' : 'অপেক্ষমাণ (0%)'}
            </span>
            {hasApprovedLevel1 && (
              <span className="text-[10px] text-emerald-600 mt-1">আপনি অনুমোদন করেছেন</span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          {format(new Date(payment.month + '-01'), 'MMM yyyy')} • ৳{payment.amount}
        </p>
        <div className="mt-1 text-[10px] text-slate-600 space-y-0.5">
          <p><strong>Payment Type:</strong> <span className={payment.paymentType === 'annual' ? 'text-primary-600 font-bold' : payment.paymentType === 'advance' ? 'text-emerald-600 font-bold' : ''}>{payment.paymentType === 'annual' ? 'Annual (বার্ষিক)' : payment.paymentType === 'advance' ? 'Advance (অগ্রিম)' : 'Monthly (মাসিক)'}</span></p>
          {payment.paymentType === 'advance' && payment.coveredMonthsList && (
            <p><strong>Covered Months:</strong> {payment.coveredMonthsList.map(m => format(new Date(m + '-01'), 'MMM yyyy')).join(', ')}</p>
          )}
          <p><strong>Member ID:</strong> {user?.id}</p>
          {payment.paymentType !== 'annual' && <p><strong>Base Monthly Fee:</strong> ৳{payment.baseAmount || 0}</p>}
          {payment.paymentType !== 'annual' && <p><strong>Late Fee:</strong> ৳{payment.lateFine || 0}</p>}
          <p><strong>Total Amount:</strong> ৳{payment.amount}</p>
          <p><strong>Submission Date:</strong> {payment.submittedAt ? format(payment.submittedAt.toDate(), 'dd MMM yyyy, hh:mm a') : 'N/A'}</p>
          {payment.firstApprovedBy && (
            <div className="bg-blue-50 p-2 rounded-lg mt-2 border border-blue-100">
              <p className="font-bold text-blue-700">✓ প্রথম অনুমোদন সম্পন্ন</p>
              <p className="text-blue-800 font-medium text-[11px]">
                প্রথম অনুমোদন করেছেন: {payment.firstApprovedByName || (usersMap && usersMap[payment.firstApprovedBy]?.displayName) || `Admin (${payment.firstApprovedBy})`}
              </p>
              {payment.firstApprovedAt && <p className="text-blue-500 text-[10px] mt-0.5">{formatTimestamp(payment.firstApprovedAt)}</p>}
            </div>
          )}
          {payment.secondApprovedBy && (
            <div className="bg-emerald-50 p-2 rounded-lg mt-2 border border-emerald-100">
              <p className="font-bold text-emerald-700">✓ দ্বিতীয় অনুমোদন সম্পন্ন</p>
              <p className="text-emerald-800 font-medium text-[11px]">
                দ্বিতীয় অনুমোদন করেছেন: {payment.secondApprovedByName || (usersMap && usersMap[payment.secondApprovedBy]?.displayName) || `Admin (${payment.secondApprovedBy})`}
              </p>
              {payment.secondApprovedAt && <p className="text-emerald-500 text-[10px] mt-0.5">{formatTimestamp(payment.secondApprovedAt)}</p>}
            </div>
          )}
          <p><strong>Payment Method:</strong> {payment.paymentMethod || 'N/A'}</p>
          {payment.transactionId && <p><strong>Transaction ID:</strong> {payment.transactionId}</p>}
          {payment.cashRecipientName && <p><strong>Cash Recipient:</strong> {payment.cashRecipientName}</p>}
          {payment.senderBankAccountNumber && <p><strong>Sender Bank Account:</strong> {payment.senderBankAccountNumber}</p>}
          {payment.senderBankAccountHolderName && <p><strong>Sender Account Holder:</strong> {payment.senderBankAccountHolderName}</p>}
        </div>
      </div>

      {payment.proofImageURL ? (
        <div className="mt-2">
          <p className="text-[10px] text-slate-500 mb-1">রসিদ:</p>
          <img 
            src={payment.proofImageURL} 
            alt="Payment Proof" 
            className="h-20 w-auto max-w-full object-cover rounded-lg cursor-pointer border border-slate-200 hover:opacity-80 transition-opacity"
            onClick={() => setPreviewOpen(true)}
          />
          {previewOpen && (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewOpen(false)}>
              <div className="relative max-w-full max-h-full flex flex-col items-center">
                <button className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white" onClick={() => setPreviewOpen(false)}>
                  <XCircle size={28} />
                </button>
                <img src={payment.proofImageURL} className="max-w-full max-h-[85vh] object-contain rounded-lg" alt="Full Proof" onClick={(e) => e.stopPropagation()} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-1.5 rounded-lg text-center border border-slate-100">কোন রসিদ আপলোড করা হয়নি</p>
      )}

      {payment.message && (
        <p className="text-[10px] text-slate-600 italic bg-slate-50 p-1 rounded">"{payment.message}"</p>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
        {isMine ? (
          <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-lg">নিজস্ব পেমেন্ট</span>
        ) : !canApprove ? (
          <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg">অনুমোদনের অনুমতি নেই</span>
        ) : hasApprovedLevel1 ? (
          <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">অন্য একজন Admin-এর অনুমোদন প্রয়োজন</span>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {!rejectMode ? (
              <div className="flex justify-end gap-2 w-full">
                <button 
                  onClick={() => setRejectMode(true)} disabled={loading}
                  className="px-3 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={handleApprove} disabled={loading}
                  className="px-3 py-1.5 text-xs bg-primary-500 text-white hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {payment.status === 'pending' ? 'প্রথম অনুমোদন করুন' : 'দ্বিতীয় অনুমোদন করুন'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <input
                  type="text"
                  placeholder="বাতিল করার কারণ লিখুন (বাধ্যতামূলক)..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-red-500"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setRejectMode(false)}
                    className="px-3 py-1.5 text-[10px] text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    ফিরে যান
                  </button>
                  <button 
                    onClick={handleReject}
                    disabled={loading || !rejectReason.trim()}
                    className="px-3 py-1.5 text-[10px] bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    নিশ্চিত করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

