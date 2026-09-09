import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Payment, UserProfile } from '../../types';
import { useCurrentMonthPayments } from '../../lib/useCurrentMonthPayments';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

interface MemberModalProps {
  member: UserProfile | null;
  onClose: () => void;
}

export function MemberModal({ member, onClose }: MemberModalProps) {
  const { getSlotPaymentStatus,  } = useCurrentMonthPayments();
  const [history, setHistory] = useState<Payment[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    if (!member) return;
    const fetchHistory = async () => {
      const q = query(
        collection(db, 'payments'),
        where('userId', '==', member.id),
        where('status', '==', 'approved'),
        orderBy('month', 'desc')
      );
      const snap = await getDocs(q);
      const payments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      setHistory(payments);
      setTotalSaved(payments.reduce((sum, p) => sum + p.amount, 0));
    };
    fetchHistory();
  }, [member]);

  if (!member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-0 sm:pb-4">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-heading font-bold text-slate-800">সদস্য প্রোফাইল</h3>
            <button 
              onClick={onClose}
              className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {/* Profile Info */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 font-bold font-heading flex items-center justify-center text-2xl mb-3 shadow-inner">
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  member.displayName.charAt(0)
                )}
              </div>
              <h2 className="text-xl font-bold font-heading text-slate-800">{member.displayName}</h2>
              <p className="text-sm text-slate-500 mt-1">{String(member.role).toLowerCase() !== 'admin' && String(member.role).toLowerCase() !== 'super_admin' ? 'সাধারণ সদস্য' : 'অ্যাডমিন'}</p>
              
              <div className="flex flex-col gap-2 mt-4 w-full">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">যোগদান:</span>
                  <span className="font-medium text-slate-700">{member.createdAt ? format(member.createdAt.toDate(), 'dd MMM yyyy') : 'অজানা'}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">সর্বশেষ জমা:</span>
                  <span className="font-medium text-slate-700">
                    {history.length > 0 ? (history[0].submittedAt ? format(history[0].submittedAt.toDate(), 'dd MMM yyyy') : format(new Date(history[0].month + '-01'), 'MMMM yyyy')) : 'এখনো জমা দেননি'}
                  </span>
                </div>
              </div>

              <div className="mt-4 px-4 py-2 bg-primary-50 rounded-2xl border border-primary-100 w-full text-center">
                <p className="text-xs text-primary-600 font-medium mb-1">এই সদস্যের মোট জমা</p>
                <p className="text-2xl font-bold font-heading text-primary-700">৳{totalSaved}</p>
              </div>
            </div>

            {/* Slots and Status */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-700 mb-2">নামের স্লটসমূহ</h4>
              {member.names.map(slot => {
                const status = getSlotPaymentStatus(member.id, slot.nameId);
                const paid = status === 'approved';
                const slotSaved = history.filter(p => p.nameId === slot.nameId).reduce((sum, p) => sum + p.amount, 0);
                return (
                  <div key={slot.nameId} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                         <span className="font-bold text-slate-800 text-sm">{slot.label}</span>
                         <p className="text-[10px] text-slate-500 mt-0.5">মোট জমা: <strong className="text-slate-700">৳{slotSaved}</strong></p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">৳{slot.monthlyDue}/মাস</span>
                    </div>
                    
                    {status === 'approved' ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <CheckCircle2 size={18} />
                        <span className="font-medium">পেমেন্ট ক্লিয়ার (Payment Cleared)</span>
                      </div>
                    ) : status === 'pending' ? (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-xl border border-blue-100">
                        <Clock size={18} />
                        <span className="font-medium">পেন্ডিং (Pending)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-xl border border-red-100">
                        <AlertCircle size={18} />
                        <span className="font-medium">জমা দেওয়া হয়নি (Not Submitted)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* History */}
            <div className="mt-8">
              <h4 className="font-medium text-slate-700 mb-3">পেমেন্ট হিস্ট্রি</h4>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">কোনো পেমেন্ট হিস্ট্রি নেই</p>
                ) : (
                  history.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {format(new Date(payment.month + '-01'), 'MMMM yyyy')}
                          </p>
                          <p className="text-xs text-slate-400">অনুমোদিত</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-800">৳{payment.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
