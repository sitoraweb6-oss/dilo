import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Plus, Clock, Activity, CheckCircle2, FileText, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useAvailableFund } from '../lib/useAvailableFund';
import { Investment } from '../types';
import { InvestmentFormModal } from '../components/investments/InvestmentFormModal';
import { InvestmentDetailsModal } from '../components/investments/InvestmentDetailsModal';
import { format } from 'date-fns';

export function Investments() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { availableFund, loading: fundLoading } = useAvailableFund();
  
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'active' | 'completed'>('active');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'investments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Investment)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalInvested = investments
    .filter(i => ['INVESTED', 'COMPLETED', 'CLOSED'].includes(i.status))
    .reduce((sum, i) => sum + (i.amountDeducted || i.amount || 0), 0);
    
  const totalProfit = investments
    .filter(i => i.profit && i.profit > 0)
    .reduce((sum, i) => sum + (i.profit || 0), 0);
    
  const proposals = investments.filter(i => !['INVESTED', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED'].includes(i.status));
  const activeInvestments = investments.filter(i => i.status === 'INVESTED');
  const completedInvestments = investments.filter(i => ['COMPLETED', 'CLOSED'].includes(i.status));

  const renderList = (list: Investment[], emptyMessage: string, showEmptyCreateBtn = false) => {
    if (loading) return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-500 font-medium">লোড হচ্ছে...</p></div>;
    
    if (list.length === 0) return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-100 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300 mb-4">
          <FileText size={24} />
        </div>
        <p className="text-slate-500 font-medium mb-4">{emptyMessage}</p>
        {showEmptyCreateBtn && isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm text-sm mx-auto"
          >
            <Plus size={16} /> নতুন বিনিয়োগ প্রস্তাব
          </button>
        )}
      </motion.div>
    );

    return (
      <div className="space-y-4 pb-32">
        <AnimatePresence>
          {list.map(inv => {
            const approvePercent = inv.totalVotes ? Math.round(((inv.approveVotes || 0) / inv.totalVotes) * 100) : 0;
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={inv.id} 
                onClick={() => setSelectedInvestment(inv)}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1 group-hover:text-emerald-700 transition-colors">{inv.name}</h3>
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">{inv.status}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 tracking-wider border border-emerald-100">{inv.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">পরিমাণ</p>
                    <p className="font-black text-slate-800 text-lg font-heading">৳ {inv.amount.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 flex gap-4 mt-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide flex items-center gap-1"><BarChart2 size={10}/> সম্ভাব্য লাভ</p>
                    <p className="text-xs font-bold text-emerald-700 line-clamp-1">{inv.expectedReturn}</p>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">তারিখ</p>
                    <p className="text-xs font-bold text-slate-700">{format(inv.createdAt.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                
                {inv.votingRequired && inv.status !== 'INVESTED' && inv.status !== 'COMPLETED' && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-600">{inv.totalVotes || 0}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">মোট ভোট</p>
                    </div>
                    {inv.totalVotes && inv.totalVotes > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-rose-100 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${approvePercent}%` }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600">{approvePercent}% সমর্থন</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black font-heading text-slate-800">বিনিয়োগ ব্যবস্থাপনা</h1>
      </div>

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Core Stats Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">উপলব্ধ তহবিল</p>
              <p className="text-3xl font-black font-heading tracking-tight">৳ {fundLoading ? '...' : availableFund.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">মোট বিনিয়োগ</p>
              <p className="text-base font-black">৳ {totalInvested.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">মোট লাভ</p>
              <p className="text-base font-black text-emerald-400">+ ৳ {totalProfit.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Create Proposal Button (Admin Only) */}
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus size={18} /> নতুন বিনিয়োগ প্রস্তাব
          </button>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-2xl gap-1">
          <button 
            onClick={() => setActiveTab('active')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity size={14} /> চলমান ({activeInvestments.length})
          </button>
          <button 
            onClick={() => setActiveTab('proposals')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'proposals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Clock size={14} /> প্রস্তাবনা ({proposals.length})
          </button>
          <button 
            onClick={() => setActiveTab('completed')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <CheckCircle2 size={14} /> সম্পন্ন ({completedInvestments.length})
          </button>
        </div>

        {/* Lists */}
        {activeTab === 'active' && renderList(activeInvestments, 'এখনও কোনো চলমান বিনিয়োগ নেই।')}
        {activeTab === 'proposals' && renderList(proposals, 'এখনও কোনো বিনিয়োগ প্রস্তাব তৈরি হয়নি।', true)}
        {activeTab === 'completed' && renderList(completedInvestments, 'এখনও কোনো সম্পন্ন বিনিয়োগ নেই।')}
      </div>



      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <InvestmentFormModal onClose={() => setShowForm(false)} availableFund={availableFund} />
        )}
        {selectedInvestment && (
          <InvestmentDetailsModal 
            investment={selectedInvestment} 
            availableFund={availableFund} 
            onClose={() => setSelectedInvestment(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
