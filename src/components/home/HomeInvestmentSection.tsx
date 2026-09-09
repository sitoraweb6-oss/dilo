import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowRight, Activity, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAvailableFund } from '../../lib/useAvailableFund';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { Investment } from '../../types';

export function HomeInvestmentSection() {
  const navigate = useNavigate();
  const { availableFund, loading: fundLoading } = useAvailableFund();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch investments that are active or pending
    const unsub = onSnapshot(collection(db, 'investments'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Investment));
      setInvestments(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const activeInvestments = investments.filter(i => i.status === 'INVESTED');
  const pendingProposals = investments.filter(i => !['INVESTED', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(i.status));

  return (
    <div className="mb-6 space-y-3">
      {/* Main Investment Banner */}
      <motion.div 
        onClick={() => navigate('/investments')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-4 text-white relative overflow-hidden shadow-sm flex items-center justify-between cursor-pointer group transition-all"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -ml-10 -mb-10"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-emerald-700/50 flex items-center justify-center backdrop-blur-sm border border-emerald-600/50 shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp size={20} className="text-emerald-300" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-emerald-50 mb-0.5">আমাদের বিনিয়োগ</h2>
            <p className="text-[11px] font-bold text-emerald-300">তহবিল: ৳ {fundLoading ? '...' : availableFund.toLocaleString('en-IN')}</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex gap-2 text-right">
             <div className="bg-emerald-900/50 px-2.5 py-1.5 rounded-xl border border-emerald-700/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block leading-none mb-1">চলমান</span>
                <span className="text-xs font-black leading-none">{activeInvestments.length}</span>
             </div>
             <div className="bg-emerald-900/50 px-2.5 py-1.5 rounded-xl border border-emerald-700/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block leading-none mb-1">প্রস্তাব</span>
                <span className="text-xs font-black leading-none">{pendingProposals.length}</span>
             </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-emerald-700/50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
            <ChevronRight size={14} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </motion.div>

      {/* Active Investment Preview */}
      {!loading && activeInvestments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
            <Activity size={16} className="text-emerald-600" /> চলমান বিনিয়োগ
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeInvestments.slice(0, 2).map((inv) => (
              <motion.div 
                key={inv.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate('/investments')}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{inv.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-1 inline-block">
                      {inv.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">পরিমাণ</p>
                    <p className="font-black text-slate-800 text-sm">৳ {inv.amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> চলমান
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 group-hover:underline">বিস্তারিত</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }} // Generic progress animation for active preview
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
