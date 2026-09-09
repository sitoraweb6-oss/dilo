import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bell, Receipt, Vote, UserPlus, Megaphone, Image as ImageIcon, BookOpen, Settings, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FloatingAdminActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { id: 'notice', icon: Bell, label: 'New Notice', color: 'bg-indigo-500', onClick: () => { setIsOpen(false); navigate('/', { state: { tab: 'notices' } }); } },
    { id: 'investment', icon: TrendingUp, label: 'বিনিয়োগ ব্যবস্থাপনা', color: 'bg-emerald-600', onClick: () => { setIsOpen(false); navigate('/investments'); } },
    { id: 'expense', icon: Receipt, label: 'Add Expense', color: 'bg-rose-500', onClick: () => { setIsOpen(false); navigate('/expenses'); } },
    { id: 'poll', icon: Vote, label: 'Create Poll', color: 'bg-emerald-500', onClick: () => { setIsOpen(false); navigate('/polls'); } },
    { id: 'member', icon: UserPlus, label: 'Add Member', color: 'bg-blue-500', onClick: () => { setIsOpen(false); navigate('/manage-members'); } },
    { id: 'carousel', icon: ImageIcon, label: 'Manage Carousel', color: 'bg-amber-500', onClick: () => { setIsOpen(false); navigate('/manage-carousel'); } },
    { id: 'hadith', icon: BookOpen, label: 'Manage Hadith', color: 'bg-emerald-600', onClick: () => { setIsOpen(false); navigate('/manage-hadith'); } },
    { id: 'payment-settings', icon: Settings, label: 'Payment Settings', color: 'bg-slate-600', onClick: () => { setIsOpen(false); navigate('/payment-settings'); } },
    { id: 'account-recovery', icon: ShieldCheck, label: 'Account Recovery', color: 'bg-red-500', onClick: () => { setIsOpen(false); navigate('/account-recovery'); } }
  ];

  return (
    <div className="fixed bottom-24 right-6 z-[100] md:bottom-8 md:right-8">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="flex flex-col-reverse gap-3 mb-4 items-end"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                className="flex items-center gap-3 group"
              >
                <span className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.label}
                </span>
                <div className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white ${action.color} hover:scale-110 transition-transform`}>
                  <action.icon size={20} />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-colors duration-300 ${isOpen ? 'bg-slate-800' : 'bg-primary-600'}`}
      >
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Plus size={28} />
        </motion.div>
      </motion.button>
    </div>
  );
}
