import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { SlotSummary } from '../../lib/paymentUtils';
import { format } from 'date-fns';
import { CheckCircle2, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function IslamicGreeting({ slotSummary }: { slotSummary: SlotSummary | null }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  if (!slotSummary) {
    return <div className="h-40 bg-slate-100 animate-pulse rounded-3xl mb-4"></div>;
  }

  const status = slotSummary.status;

  if (status === 'approved') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-6 mb-4 shadow-xl text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-tr-full -ml-4 -mb-4" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-emerald-200 text-xs font-bold tracking-widest uppercase mb-1">{format(new Date(), 'EEEE, dd MMMM')}</p>
              <h1 className="text-2xl font-bold font-heading">আসসালামু আলাইকুম,</h1>
              <p className="text-lg opacity-90">{userProfile?.displayName}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md p-2 rounded-2xl border border-emerald-500/30">
              <CheckCircle2 size={24} className="text-emerald-300" />
            </div>
          </div>
          
          <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <p className="text-sm text-emerald-100 font-bold">Payment Cleared</p>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              আলহামদুলিল্লাহ! আপনার সকল সঞ্চয় স্লট ({slotSummary.totalSlots}টি) এই মাসে সফলভাবে জমা হয়েছে।
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 mb-4 shadow-xl text-white relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-4 -mt-4" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full -ml-4 -mb-4" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">{format(new Date(), 'EEEE, dd MMMM')}</p>
          <h1 className="text-2xl font-bold font-heading">আসসালামু আলাইকুম,</h1>
          <p className="text-lg opacity-90">{userProfile?.displayName}</p>
        </div>
        
        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 mt-auto">
          {status === 'partial' && (
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-amber-400" />
              <p className="text-sm text-amber-300 font-bold">⚠️ আংশিক পরিশোধ</p>
            </div>
          )}

          <div className="flex justify-between items-center mb-4 bg-black/20 rounded-xl p-3">
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-0.5">পরিশোধিত</p>
              <p className="text-sm font-bold text-emerald-400">{slotSummary.paidSlots}</p>
            </div>
            <div className="text-center border-l border-white/10 pl-3">
              <p className="text-xs text-slate-400 mb-0.5">বকেয়া</p>
              <p className="text-sm font-bold text-red-400">{slotSummary.dueSlots}</p>
            </div>
            {slotSummary.pendingSlots > 0 && (
              <div className="text-center border-l border-white/10 pl-3">
                <p className="text-xs text-slate-400 mb-0.5">অপেক্ষমাণ</p>
                <p className="text-sm font-bold text-amber-400">{slotSummary.pendingSlots}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs text-slate-300 mb-1">অবশিষ্ট পরিমাণ</p>
              <p className="text-2xl font-bold font-heading">৳ {slotSummary.totalDueAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>
          
          {slotSummary.dueSlots > 0 && (
            <button 
              onClick={() => navigate('/', { state: { tab: 'personal' } })}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              এখনই সঞ্চয় জমা দিন <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
