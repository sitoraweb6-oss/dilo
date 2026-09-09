import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Users, Search, X } from 'lucide-react';
import { UserProfile, Payment } from '../../types';
import { useAuth } from '../../lib/AuthContext';

export function UnityProgressRing({ 
  paidCount, 
  totalCount, 
  paidMembers,
  currentMonthPayments
}: { 
  paidCount: number, 
  totalCount: number, 
  paidMembers: UserProfile[],
  currentMonthPayments: Payment[]
}) {
  const prefersReducedMotion = useReducedMotion();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { userProfile } = useAuth();
  
  const percentage = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const filteredMembers = paidMembers.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (a.id === userProfile?.id) return -1;
    if (b.id === userProfile?.id) return 1;
    const aIsAdmin = String(a.role).toLowerCase() === 'admin' || String(a.role).toLowerCase() === 'super_admin';
    const bIsAdmin = String(b.role).toLowerCase() === 'admin' || String(b.role).toLowerCase() === 'super_admin';
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return 0;
  });

  return (
    <>
      <motion.button 
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
        whileHover={prefersReducedMotion ? {} : { 
          y: -2, 
          boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)",
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98, transition: { duration: 0.1 } }}
        onClick={() => setShowModal(true)}
        className="w-full bg-white border border-slate-200 rounded-3xl p-5 mb-4 shadow-sm flex items-center justify-between group transition-colors duration-200"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users size={12} />
            </div>
            <h3 className="font-bold text-sm text-slate-800">মাসিক একতা প্রগতি</h3>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            {paidCount} / {totalCount} স্লট পরিশোধিত হয়েছে
          </p>
          <div className="w-11/12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-emerald-500 h-full rounded-full"
            />
          </div>
        </div>
        
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r={radius} className="stroke-slate-100" strokeWidth="8" fill="none" />
            <motion.circle 
              cx="40" cy="40" r={radius}
              className="stroke-emerald-500"
              strokeWidth="8" fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ strokeDasharray: circumference }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-sm font-bold text-slate-800 font-heading">{Math.round(percentage)}%</span>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-slate-50 w-full max-w-md h-[85vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
            >
              <div className="flex flex-col p-4 border-b border-slate-200 bg-white shrink-0 sm:rounded-t-3xl rounded-t-3xl">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="font-bold text-slate-800 font-heading">পরিশোধিত সদস্য</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{paidMembers.length} জন সদস্য অন্তত একটি স্লটের পেমেন্ট সম্পন্ন করেছেন</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="নাম বা আইডি দিয়ে খুঁজুন..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {filteredMembers.map(member => (
                  <div key={member.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.displayName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5 flex-wrap">
                        {member.displayName}
                        {userProfile?.id === member.id && <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">• আপনি</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">#{member.id.substring(0, 8)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end mb-0.5">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">পরিশোধিত</span>
                      </div>
                      {(() => {
                        const approvedAmount = currentMonthPayments
                          .filter(p => p.userId === member.id && p.status === 'approved')
                          .reduce((sum, p) => sum + p.amount, 0);
                        return <p className="text-xs font-bold text-slate-700">৳ {approvedAmount.toLocaleString('en-IN')}</p>;
                      })()}
                    </div>
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">কোনো সদস্য পাওয়া যায়নি</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
