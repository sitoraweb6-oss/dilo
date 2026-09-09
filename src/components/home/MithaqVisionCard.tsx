import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, HeartHandshake, Users } from 'lucide-react';

export function MithaqVisionCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-6 text-white shadow-lg relative overflow-hidden"
    >
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      <h3 className="font-heading font-black text-xl mb-4 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
        ميثاق
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center text-center">
          <ShieldCheck size={20} className="text-emerald-400 mb-2 opacity-80" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">Trust</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <HeartHandshake size={20} className="text-emerald-400 mb-2 opacity-80" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">Commitment</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <Users size={20} className="text-emerald-400 mb-2 opacity-80" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300">Unity</span>
        </div>
      </div>
    </motion.div>
  );
}
