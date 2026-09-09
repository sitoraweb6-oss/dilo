import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Users, CheckCircle2, Clock, AlertCircle, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SmartStatistics({ 
  totalMembers, 
  paidMembers, 
  pendingMembers, 
  dueMembers, 
  monthlyCollection, 
  totalSavings 
}: {
  totalMembers: number;
  paidMembers: number;
  pendingMembers: number;
  dueMembers: number;
  monthlyCollection: number;
  totalSavings: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const stats = [
    {
      id: 'total',
      label: 'মোট স্লট',
      value: totalMembers,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600',
      action: () => navigate('/', { state: { tab: 'members', filter: 'all' } })
    },
    {
      id: 'paid',
      label: 'পরিশোধিত স্লট',
      value: paidMembers,
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => navigate('/', { state: { tab: 'members', filter: 'paid' } })
    },
    {
      id: 'pending',
      label: 'অপেক্ষমাণ স্লট',
      value: pendingMembers,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
      action: () => navigate('/', { state: { tab: 'members', filter: 'pending' } })
    },
    {
      id: 'due',
      label: 'বকেয়া স্লট',
      value: dueMembers,
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
      action: () => navigate('/', { state: { tab: 'members', filter: 'due' } })
    },
    {
      id: 'collection',
      label: 'এই মাসের সংগ্রহ',
      value: `৳ ${monthlyCollection.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600',
      action: () => navigate('/', { state: { tab: 'reports' } })
    },
    {
      id: 'savings',
      label: 'মোট সঞ্চয়',
      value: `৳ ${totalSavings.toLocaleString('en-IN')}`,
      icon: Wallet,
      color: 'bg-purple-50 text-purple-600',
      action: () => navigate('/', { state: { tab: 'reports' } })
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {stats.map((stat, i) => (
        <motion.button
          key={stat.id}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.20 + (i * 0.05), ease: "easeOut" }}
          onClick={stat.action}
          whileHover={prefersReducedMotion ? {} : { 
            y: -2, 
            boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05)",
            transition: { duration: 0.2, ease: "easeOut" }
          }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.98, transition: { duration: 0.1 } }}
          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col text-left group"
        >
          <div className={`w-8 h-8 rounded-xl ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
            <stat.icon size={16} />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
          <p className="text-lg font-bold font-heading text-slate-800">{stat.value}</p>
        </motion.button>
      ))}
    </div>
  );
}
