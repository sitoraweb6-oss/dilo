import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Wallet } from 'lucide-react';

export function TotalSavingsCard({ totalSystemSavings, onClick }: { totalSystemSavings: number, onClick: () => void }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button 
      onClick={onClick}
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
      whileHover={prefersReducedMotion ? {} : { 
        y: -2, 
        boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)",
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98, transition: { duration: 0.1 } }}
      className="w-full bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 flex items-center justify-between group text-left transition-colors duration-200"
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:bg-primary-100 group-hover:scale-110 transition-all">
          <Wallet size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">মোট ফান্ড সঞ্চয়</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold font-heading text-slate-800">৳ {totalSystemSavings.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </motion.button>
  );
}
