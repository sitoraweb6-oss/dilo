import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Payment } from '../types';
import { X, ShieldCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { getMemberSlotSummary } from '../lib/paymentUtils';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';

interface MemberProfileModalProps {
  member: UserProfile | null;
  onClose: () => void;
}

export function MemberProfileModal({ member, onClose }: MemberProfileModalProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!member) {
      setPayments([]);
      return;
    }

    let isMounted = true;
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', member.id)
    );

    getDocs(q).then((snap) => {
      if (isMounted) {
        const p = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
        // Sort in memory to avoid needing a composite index initially
        p.sort((a, b) => b.month.localeCompare(a.month));
        setPayments(p);
        setLoading(false);
      }
    }).catch(e => {
      console.error(e);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [member]);

  if (!member) return null;

  const currentMonth = format(new Date(), 'yyyy-MM');
  const totalSavings = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  
  const currentMonthPayments = payments.filter(p => p.month === currentMonth);
  const slotSummary = getMemberSlotSummary(member, currentMonthPayments, currentMonth);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-10 pb-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border border-slate-100"
        >
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-lg">মেম্বার প্রোফাইল</h2>
            <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 pb-36 md:pb-8">
          <div className="p-5">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-3">
                <div className="w-24 h-24 bg-emerald-100 rounded-full border-4 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold overflow-hidden shadow-md">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{member.displayName.charAt(0)}</span>
                  )}
                </div>
                {(String(member.role).toLowerCase() === 'admin' || String(member.role).toLowerCase() === 'super_admin') && (
                  <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white rounded-full p-1.5 border-2 border-white shadow-sm" title="Admin">
                    <ShieldCheck size={16} />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-800 text-center">{member.displayName}</h3>
              <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-100 px-2 py-1 rounded mb-3">ID: #{member.id.substring(0, 8)}</p>

              {member.personalMobile && (
                <div className="w-full flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-2">
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">ব্যক্তিগত মোবাইল</p>
                    <p className="text-sm font-bold text-slate-800">{member.personalMobile}</p>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(member.personalMobile!)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              )}

              {(member.emergencyContactMobile || member.emergencyContactName) && (
                <div className="w-full flex items-center justify-between bg-orange-50/50 border border-orange-100 rounded-xl p-3">
                  <div>
                    <p className="text-[10px] font-bold text-orange-600 uppercase mb-0.5">জরুরি যোগাযোগ {member.emergencyContactName ? `(${member.emergencyContactName})` : ''}</p>
                    <p className="text-sm font-bold text-slate-800">{member.emergencyContactMobile || 'N/A'}</p>
                  </div>
                  {member.emergencyContactMobile && (
                    <button 
                      onClick={() => navigator.clipboard.writeText(member.emergencyContactMobile!)}
                      className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex gap-4 mt-4 w-full">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">যোগদান</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">
                    {member.createdAt ? format(member.createdAt.toDate(), 'MMM yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">মোট সঞ্চয়</p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">৳ {totalSavings.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">বর্তমান মাস ({format(new Date(), 'MMMM')})</h4>
              
              <div className={`p-4 rounded-2xl border mb-3 ${
                slotSummary.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                slotSummary.status === 'partial' ? 'bg-amber-50 border-amber-200' :
                slotSummary.status === 'pending' ? 'bg-amber-50 border-amber-100' :
                'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {slotSummary.status === 'approved' ? <CheckCircle2 size={18} className="text-emerald-600" /> : 
                   slotSummary.status === 'partial' ? <AlertCircle size={18} className="text-amber-600" /> :
                   slotSummary.status === 'pending' ? <Clock size={18} className="text-amber-500" /> : 
                   <AlertCircle size={18} className="text-red-500" />}
                  <p className={`font-bold ${
                    slotSummary.status === 'approved' ? 'text-emerald-700' :
                    slotSummary.status === 'partial' ? 'text-amber-700' :
                    slotSummary.status === 'pending' ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {slotSummary.status === 'approved' ? '✅ সম্পূর্ণ পরিশোধিত' : 
                     slotSummary.status === 'partial' ? '🟡 আংশিক পরিশোধিত' :
                     slotSummary.status === 'pending' ? 'অপেক্ষমাণ' : '🔴 বকেয়া'}
                  </p>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="bg-white/60 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-500 mb-0.5">মোট স্লট</p>
                    <p className="font-bold text-slate-700">{slotSummary.totalSlots}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl">
                    <p className="text-[10px] text-emerald-600 mb-0.5">পরিশোধিত</p>
                    <p className="font-bold text-emerald-700">{slotSummary.paidSlots}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl">
                    <p className="text-[10px] text-red-500 mb-0.5">বকেয়া</p>
                    <p className="font-bold text-red-700">{slotSummary.dueSlots}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded-xl">
                    <p className="text-[10px] text-amber-500 mb-0.5">অপেক্ষমাণ</p>
                    <p className="font-bold text-amber-700">{slotSummary.pendingSlots}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-3 text-sm border-b border-slate-100 pb-2">পেমেন্ট হিস্ট্রি</h4>
              {loading ? (
                <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : payments.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4 bg-slate-50 rounded-xl">কোনো পেমেন্ট রেকর্ড নেই</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {payments.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 shadow-sm rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          payment.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                          payment.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {payment.status === 'approved' ? <CheckCircle2 size={16} /> :
                           payment.status === 'rejected' ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{format(new Date(payment.month + '-01'), 'MMMM yyyy')}</p>
                          <p className="text-[10px] text-slate-500">
                            {payment.status === 'approved' ? 'অনুমোদিত' :
                             payment.status === 'rejected' ? 'বাতিল' : 'পেন্ডিং'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">৳ {payment.amount}</p>
                        <p className="text-[10px] text-slate-500">স্লট: {member.names.findIndex(n => n.nameId === payment.nameId) + 1}</p>
                        {payment.status === 'approved' && payment.approvedAt && (
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {format(payment.approvedAt.toDate(), 'dd MMM yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        
        {/* Super Admin Actions */}
        {isAdmin && userProfile?.role === 'super_admin' && (
          <div className="p-6 border-t border-slate-100 bg-red-50/50">
            <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertCircle size={16} /> সুপার অ্যাডমিন অ্যাকশন
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => {
                  onClose();
                  navigate('/account-migration');
                }}
                className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200"
              >
                মাইগ্রেশন
              </button>
              <button 
                onClick={async () => {
                  const reason = prompt('নিষ্ক্রিয় করার কারণ লিখুন:');
                  if (!reason) return;
                  if (confirm('নিষ্ক্রিয় করার আবেদন জমা দিতে চান?')) {
                    setIsSubmitting(true);
                    try {
                      const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
                      await addDoc(collection(db, 'adminRequests'), {
                        requestType: 'MEMBER_DEACTIVATION',
                        status: 'PENDING',
                        requestedBy: userProfile.id,
                        requestedByName: userProfile.displayName,
                        targetUserId: member.id,
                        targetUserName: member.displayName,
                        createdAt: serverTimestamp(),
                        metadata: { reason }
                      });
                      alert('আবেদন জমা হয়েছে');
                      onClose();
                    } catch(e) { alert('Error: ' + e.message); }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 disabled:opacity-50"
              >
                নিষ্ক্রিয়করণ
              </button>
              <button 
                onClick={async () => {
                  const reason = prompt('মুছে ফেলার কারণ লিখুন:');
                  if (!reason) return;
                  if (confirm('মুছে ফেলার আবেদন জমা দিতে চান?')) {
                    setIsSubmitting(true);
                    try {
                      const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
                      await addDoc(collection(db, 'adminRequests'), {
                        requestType: 'MEMBER_DELETION',
                        status: 'PENDING',
                        requestedBy: userProfile.id,
                        requestedByName: userProfile.displayName,
                        targetUserId: member.id,
                        targetUserName: member.displayName,
                        createdAt: serverTimestamp(),
                        metadata: { reason }
                      });
                      alert('আবেদন জমা হয়েছে');
                      onClose();
                    } catch(e) { alert('Error: ' + e.message); }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 disabled:opacity-50"
              >
                ডিলিট
              </button>
            </div>
          </div>
        )}
          </div>
  </motion.div>
      </div>
    </AnimatePresence>
  );
}
