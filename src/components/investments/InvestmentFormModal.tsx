import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';

interface Props {
  onClose: () => void;
  availableFund: number;
}

export function InvestmentFormModal({ onClose, availableFund }: Props) {
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'ব্যবসা',
    amount: '',
    purpose: '',
    description: '',
    expectedReturn: '',
    expectedRisk: 'নিম্ন',
    duration: '',
    startDate: '',
    votingRequired: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const amount = Number(formData.amount);
  const isOverFund = amount > availableFund;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (isOverFund) {
      alert('আপনার প্রস্তাবিত পরিমাণ উপলব্ধ তহবিলের চেয়ে বেশি।');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'investments'), {
        ...formData,
        amount: Number(formData.amount),
        status: 'PROPOSED',
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
        fundDeducted: false,
        totalVotes: 0,
        approveVotes: 0,
        rejectVotes: 0,
        votedUserIds: [],
        opinions: []
      });
      
      await addDoc(collection(db, 'activityLog'), {
        actorId: userProfile.id,
        action: 'INVESTMENT_PROPOSED',
        targetId: 'new',
        description: `${userProfile.displayName} একটি নতুন বিনিয়োগ প্রস্তাব দিয়েছেন: ${formData.name}`,
        timestamp: serverTimestamp()
      });
      
      alert('বিনিয়োগ প্রস্তাব সফলভাবে জমা হয়েছে।');
      onClose();
    } catch (error) {
      console.error(error);
      alert('প্রস্তাব জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['ব্যবসা', 'শেয়ার বাজার', 'রিয়েল এস্টেট', 'সঞ্চয়পত্র', 'অন্যান্য'];
  const risks = ['খুব নিম্ন', 'নিম্ন', 'মাঝারি', 'উচ্চ', 'খুব উচ্চ'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-safe pb-safe">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="sticky top-0 bg-white z-20 flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-black font-heading text-slate-800">নতুন বিনিয়োগ প্রস্তাব</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5 pb-32">
          
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
            <Info size={20} className="text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-indigo-900 leading-relaxed">
              আপনার প্রস্তাবটি প্রথমে সকল সদস্যের মতামতের জন্য উন্মুক্ত করা হবে। এরপর এডমিন প্যানেল চূড়ান্ত সিদ্ধান্ত গ্রহণ করবে।
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">বিনিয়োগের নাম / প্রজেক্ট</label>
              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" placeholder="যেমন: আইটি ব্যবসা" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ধরণ</label>
                <select required name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">তারিখ</label>
                <input required type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">পরিমাণ (৳)</label>
              <input required type="number" min="1" name="amount" value={formData.amount} onChange={handleChange} className={`w-full bg-slate-50 border rounded-xl p-3 text-lg font-black font-heading focus:ring-2 outline-none transition-all ${isOverFund ? 'border-rose-300 focus:ring-rose-500/20 text-rose-700' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'}`} placeholder="10000" />
              {isOverFund && (
                <p className="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={14} /> পরিমাণ উপলব্ধ তহবিল (৳{availableFund.toLocaleString('en-IN')}) থেকে বেশি।
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">উদ্দেশ্য</label>
              <input required type="text" name="purpose" value={formData.purpose} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" placeholder="সংক্ষিপ্ত উদ্দেশ্য" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">বিস্তারিত বিবরণ</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none" placeholder="বিনিয়োগের বিস্তারিত বিবরণ লিখুন..."></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">সম্ভাব্য লাভ</label>
                <input required type="text" name="expectedReturn" value={formData.expectedReturn} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" placeholder="যেমন: ১৫%" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">ঝুঁকির মাত্রা</label>
                <select required name="expectedRisk" value={formData.expectedRisk} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                  {risks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">মেয়াদ</label>
              <input required type="text" name="duration" value={formData.duration} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" placeholder="যেমন: ৬ মাস বা ১ বছর" />
            </div>

            <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl cursor-pointer">
              <input type="checkbox" name="votingRequired" checked={formData.votingRequired} onChange={handleChange} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">সদস্যদের মতামত প্রয়োজন</p>
                <p className="text-xs text-slate-500">অনুমোদনের আগে সদস্যদের মতামত নেওয়া হবে</p>
              </div>
            </label>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-b-3xl sm:static sm:p-0 sm:border-0 sm:shadow-none sm:mt-6">
            <button 
              type="submit" 
              disabled={isSubmitting || isOverFund} 
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'প্রস্তাব জমা দিন'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
