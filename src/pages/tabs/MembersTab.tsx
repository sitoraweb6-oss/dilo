import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { UserProfile, Payment } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ShieldCheck, ChevronRight } from 'lucide-react';
import { MemberProfileModal } from '../../components/MemberProfileModal';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMemberStatus, getMemberTotalSavings } from '../../lib/paymentUtils';
import { useAuth } from '../../lib/AuthContext';

export function MembersTab() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'due'>((location.state?.filter as any) || 'all');

  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
    }
  }, [location.state]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const q1 = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const q2 = query(collection(db, 'payments'), where('coveredMonthsList', 'array-contains', currentMonth));
        const [membersSnap, snap1, snap2] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(q1),
          getDocs(q2)
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        const paymentsMap = new Map();
        snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        setPayments(Array.from(paymentsMap.values()));
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentMonth]);



  const filteredMembers = members.filter(m => {
    const matchesSearch = m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.personalMobile && m.personalMobile.includes(searchTerm));
    if (!matchesSearch) return false;
    const status = getMemberStatus(m, payments, currentMonth);
    if (filter === 'paid' && status !== 'approved') return false;
    if (filter === 'pending' && status !== 'pending') return false;
    if (filter === 'due' && status !== 'not_submitted') return false;
    return true;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.id === userProfile?.id) return -1;
    if (b.id === userProfile?.id) return 1;
    const aIsAdmin = String(a.role).toLowerCase() === 'admin' || String(a.role).toLowerCase() === 'super_admin';
    const bIsAdmin = String(b.role).toLowerCase() === 'admin' || String(b.role).toLowerCase() === 'super_admin';
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    const statusOrder = { not_submitted: 0, pending: 1, partial: 2, approved: 3 };
    const statusA = getMemberStatus(a, payments, currentMonth);
    const statusB = getMemberStatus(b, payments, currentMonth);
    return statusOrder[statusA] - statusOrder[statusB];
  });

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">সম্পূর্ণ পরিশোধিত</span>;
    if (status === 'partial') return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">আংশিক পরিশোধিত</span>;
    if (status === 'pending') return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">অপেক্ষমাণ</span>;
    return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">বকেয়া</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col mb-2">
        <h2 className="text-xl font-bold font-heading text-slate-800 mb-4">সকল সদস্য</h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="নাম, আইডি বা মোবাইল দিয়ে খুঁজুন..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            সব সদস্য
          </button>
          <button 
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-200 text-emerald-700'}`}
          >
            পরিশোধিত
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700'}`}
          >
            অপেক্ষমাণ
          </button>
          <button 
            onClick={() => setFilter('due')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'due' ? 'bg-red-500 text-white' : 'bg-white border border-red-200 text-red-700'}`}
          >
            বকেয়া
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {sortedMembers.map((member) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={member.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => setSelectedMember(member)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="relative">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-700 font-bold shrink-0 overflow-hidden">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                      member.displayName.charAt(0)
                    )}
                  </div>
                  {(String(member.role).toLowerCase() === 'admin' || String(member.role).toLowerCase() === 'super_admin') && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-500 text-white rounded-full p-0.5 border-2 border-white">
                      <ShieldCheck size={10} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5 flex-wrap">
                    {member.displayName}
                    {(String(member.role).toLowerCase() === 'admin' || String(member.role).toLowerCase() === 'super_admin') && (
                      <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] flex items-center gap-0.5 whitespace-nowrap">
                        👑 এডমিন
                      </span>
                    )}
                    {userProfile?.id === member.id && (
                      <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">• আপনি</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: #{member.id.substring(0, 8)}</p>
                </div>

                <div className="text-right">
                  {getStatusBadge(getMemberStatus(member, payments, currentMonth))}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {member.createdAt ? format(member.createdAt.toDate(), 'MMM yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">মোট সঞ্চয়</p>
                  <p className="text-sm font-bold text-slate-800">৳ {getMemberTotalSavings(member.id, payments).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {member.names.length} স্লট
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </div>
            </motion.div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <Search className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">কোনো সদস্য পাওয়া যায়নি</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      {selectedMember && (
        <MemberProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
