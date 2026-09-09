import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Clock, AlertCircle } from 'lucide-react';
import { format, differenceInMilliseconds } from 'date-fns';

export function PaymentDeadlineCountdown({ 
  paymentStatus, 
  dueAmount,
  onPayClick
}: { 
  paymentStatus: 'approved' | 'partial' | 'pending' | 'not_submitted',
  dueAmount: number,
  onPayClick: () => void
}) {
  const prefersReducedMotion = useReducedMotion();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [isPastDue, setIsPastDue] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Deadline is 25th of the CURRENT month
      let deadline = new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59, 999);
      
      const diff = deadline.getTime() - now.getTime();
      
      if (diff < 0) {
        setIsPastDue(true);
        // After 25th, maybe show past due state
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      } else {
        setIsPastDue(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft({ days, hours, minutes });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  if (paymentStatus === 'approved') return null;

  if (isPastDue) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-4 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <h3 className="font-bold text-sm">পেমেন্টের সময়সীমা পেরিয়ে গেছে</h3>
          </div>
          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            বকেয়া
          </span>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-red-500 mb-0.5">চলতি মাসের বকেয়া</p>
            <p className="text-xl font-bold font-heading text-red-700">৳ {dueAmount.toLocaleString('en-IN')}</p>
          </div>
          <button 
            onClick={onPayClick}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            পরিশোধ করুন
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        className="bg-white border border-slate-200 rounded-3xl p-5 mb-4 shadow-sm"
      >
      <div className="flex items-center gap-2 text-slate-700 mb-4">
        <Clock size={18} className="text-amber-500" />
        <h3 className="font-bold text-sm">পেমেন্ট ডেডলাইন</h3>
        <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">২৫ তারিখ</span>
      </div>

      <div className="flex gap-3 mb-1">
        <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
          <p className="text-2xl font-bold font-heading text-slate-800">{timeLeft.days}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">দিন</p>
        </div>
        <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
          <p className="text-2xl font-bold font-heading text-slate-800">{timeLeft.hours}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">ঘন্টা</p>
        </div>
        <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
          <p className="text-2xl font-bold font-heading text-slate-800">{timeLeft.minutes}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase">মিনিট</p>
        </div>
      </div>
    </motion.div>
  );
}
