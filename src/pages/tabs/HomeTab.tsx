import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { UserProfile, Payment, ActivityLog } from '../../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { IslamicGreeting } from '../../components/home/IslamicGreeting';
import { TotalSavingsCard } from '../../components/home/TotalSavingsCard';
import { HomeInvestmentSection } from '../../components/home/HomeInvestmentSection';
import { PaymentDeadlineCountdown } from '../../components/home/PaymentDeadlineCountdown';
import { UnityProgressRing } from '../../components/home/UnityProgressRing';
import { SmartStatistics } from '../../components/home/SmartStatistics';
import { HomeCarousel } from '../../components/home/HomeCarousel';
import { FloatingAdminActions } from '../../components/home/FloatingAdminActions';
import { HadithCarousel } from '../../components/home/HadithCarousel';
import { ActivePollCard } from '../../components/home/ActivePollCard';
import { useNavigate } from 'react-router-dom';
import { MemberProfileModal } from '../../components/MemberProfileModal';
import { Bell, ArrowRight, UserPlus, Receipt, Vote, Megaphone, TrendingUp } from 'lucide-react';

import { getMemberStatus, getSystemSlotSummary, getMemberSlotSummary } from '../../lib/paymentUtils';

import { PendingApprovalsSection } from '../../components/home/PendingApprovalsSection';
import { UpcomingEventSection } from '../../components/home/UpcomingEventSection';
import { BankDetailsCard } from '../../components/home/BankDetailsCard';

export function HomeTab() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSystemSavings, setTotalSystemSavings] = useState(0);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const mySlotSummary = userProfile ? getMemberSlotSummary(userProfile, payments, currentMonth) : null;
  const myPaymentStatus = mySlotSummary?.status || 'approved';

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const q1 = query(collection(db, 'payments'), where('month', '==', currentMonth));
        const q2 = query(collection(db, 'payments'), where('coveredMonthsList', 'array-contains', currentMonth));
        const [membersSnap, snap1, snap2, totalSnap, noticesSnap, activitiesSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
          getDocs(q1),
          getDocs(q2),
          getDocs(query(collection(db, 'payments'), where('status', '==', 'approved'))),
          getDocs(query(collection(db, 'notices'), orderBy('postedAt', 'desc'), limit(1))),
          getDocs(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(5)))
        ]);
        
        if (!isMounted) return;
        
        setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
        const paymentsMap = new Map();
        snap1.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        snap2.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        totalSnap.docs.forEach(doc => paymentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Payment));
        setPayments(Array.from(paymentsMap.values()));
        
        let total = 0;
        totalSnap.docs.forEach(doc => { total += doc.data().amount || 0; });
        setTotalSystemSavings(total);
        
        setNotices(noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setActivities(activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
        
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentMonth]);



  const getDueAmount = () => {
    if (!userProfile) return 0;
    const memberSummary = getMemberSlotSummary(userProfile, payments.filter(p => p.userId === userProfile.id), currentMonth);
    return memberSummary.totalDueAmount;
  };

  const slotSummary = getSystemSlotSummary(members, payments, currentMonth);
  
  const monthlyCollection = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  const paidMembersList = members.filter(m => getMemberSlotSummary(m, payments, currentMonth).paidSlots > 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navigateToPersonal = () => {
    navigate('/', { state: { tab: 'personal' } });
  };

  return (
    <div className="space-y-4">
      {/* 1. Islamic Greeting Card */}
      <IslamicGreeting slotSummary={mySlotSummary} />

      {/* 2. Total Savings Card */}
      <TotalSavingsCard totalSystemSavings={totalSystemSavings} onClick={() => navigate('/', { state: { tab: 'reports' } })} />
        <HomeInvestmentSection />

      {/* 3. Payment Deadline Card */}
      <PaymentDeadlineCountdown 
        paymentStatus={myPaymentStatus} 
        dueAmount={getDueAmount()} 
        onPayClick={navigateToPersonal}
      />

      {/* 4. Monthly Unity Progress */}
      <UnityProgressRing 
        paidCount={slotSummary.paidSlots} 
        totalCount={slotSummary.totalSlots} 
        paidMembers={paidMembersList}
        currentMonthPayments={payments.filter(p => p.month === currentMonth)}
      />

      {/* 5. Statistics Cards */}
      <SmartStatistics 
        totalMembers={slotSummary.totalSlots}
        paidMembers={slotSummary.paidSlots}
        pendingMembers={slotSummary.pendingSlots}
        dueMembers={slotSummary.dueSlots}
        monthlyCollection={monthlyCollection}
        totalSavings={totalSystemSavings}
      />
      
      {/* 5.5 Upcoming Event */}
      <UpcomingEventSection />

      {/* 6. Photo Carousel */}
      <HomeCarousel />

      {/* 6.5 Bank Details */}
      <BankDetailsCard />

      {/* 7. Quick Actions */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6">
        <button onClick={() => navigate('/support')} className="bg-sky-50 p-3 rounded-2xl border border-sky-100 flex flex-col items-center text-center hover:bg-sky-100 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <p className="text-[10px] font-bold text-sky-800">সাপোর্ট</p>
        </button>
        <button onClick={() => navigate('/chat')} className="bg-teal-50 p-3 rounded-2xl border border-teal-100 flex flex-col items-center text-center hover:bg-teal-100 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <p className="text-[10px] font-bold text-teal-800">চ্যাট</p>
        </button>
        <button onClick={() => navigate('/expenses')} className="bg-red-50 p-3 rounded-2xl border border-red-100 flex flex-col items-center text-center hover:bg-red-100 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
          </div>
          <p className="text-[10px] font-bold text-red-800">খরচ</p>
        </button>
        <button onClick={() => navigate('/polls')} className="bg-purple-50 p-3 rounded-2xl border border-purple-100 flex flex-col items-center text-center hover:bg-purple-100 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
            <Vote className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-[10px] font-bold text-purple-800">পোল</p>
        </button>
      </div>

      <PendingApprovalsSection />

      {/* 8. Member Preview */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-heading font-bold text-slate-800 text-sm">সদস্যগণ</h3>
          <button 
            onClick={() => navigate('/', { state: { tab: 'members' } })} 
            className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline"
          >
            সব দেখুন <ArrowRight size={12} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
          {(() => {
            const sortedMembers = [...members].sort((a, b) => {
              if (a.id === userProfile?.id) return -1;
              if (b.id === userProfile?.id) return 1;
              const aIsAdmin = String(a.role).toLowerCase() === 'admin' || String(a.role).toLowerCase() === 'super_admin';
              const bIsAdmin = String(b.role).toLowerCase() === 'admin' || String(b.role).toLowerCase() === 'super_admin';
              if (aIsAdmin && !bIsAdmin) return -1;
              if (!aIsAdmin && bIsAdmin) return 1;
              return 0; // Simple sort for home tab
            });
            return sortedMembers.slice(0, 5).map(member => (

            <div key={member.id} className="snap-start shrink-0 w-20 flex flex-col items-center text-center group cursor-pointer" onClick={() => setSelectedMember(member)}>
              <div className={`w-14 h-14 rounded-full border-2 mb-2 p-0.5 transition-transform group-hover:scale-105 ${
                getMemberStatus(member, payments, currentMonth) === 'approved' ? 'border-emerald-500' : 
                getMemberStatus(member, payments, currentMonth) === 'pending' ? 'border-amber-500' : 'border-slate-200'
              }`}>
                <div className="w-full h-full bg-slate-100 rounded-full overflow-hidden flex items-center justify-center text-slate-500 font-bold">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                  ) : (
                    member.displayName.charAt(0)
                  )}
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-700 truncate w-full flex items-center justify-center gap-0.5">
                {member.displayName}
                {userProfile?.id === member.id && <span className="text-[8px] text-slate-400 font-normal">(আপনি)</span>}
              </p>
            </div>
          ))})()}
          {members.length > 5 && (
            <div className="snap-start shrink-0 w-20 flex flex-col items-center justify-center cursor-pointer" onClick={() => navigate('/', { state: { tab: 'members' } })}>
              <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-2 hover:bg-slate-100 transition-colors">
                <ArrowRight size={20} className="text-slate-400" />
              </div>
              <p className="text-[10px] font-bold text-slate-500">আরো {members.length - 5}</p>
            </div>
          )}
        </div>
      </section>

      {/* 9. Hadith Carousel */}
      <HadithCarousel />

      {/* 10. Latest Notice */}
      {notices.length > 0 && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="font-heading font-bold text-slate-800 text-sm">সর্বশেষ নোটিশ</h3>
            <button 
              onClick={() => navigate('/', { state: { tab: 'notices' } })} 
              className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline"
            >
              সব দেখুন <ArrowRight size={12} />
            </button>
          </div>
          <div 
            className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-indigo-50 transition-colors"
            onClick={() => navigate('/', { state: { tab: 'notices' } })}
          >
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{notices[0].title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{notices[0].content}</p>
                <p className="text-[10px] text-slate-400 mt-2">
                  {notices[0].postedAt ? format(notices[0].postedAt.toDate(), 'dd MMM, hh:mm a') : ''}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 10.5 Latest Active Poll */}
      <ActivePollCard />

      {/* 11. Recent Activities */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-heading font-bold text-slate-800 text-sm">সাম্প্রতিক অ্যাক্টিভিটি</h3>
          <button 
            onClick={() => navigate('/activities')} 
            className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline"
          >
            সবগুলো দেখুন <ArrowRight size={12} />
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">কোনো অ্যাক্টিভিটি নেই</p>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act.id} className="flex space-x-3 relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0 border-2 border-white shadow-sm ring-2 ring-emerald-50" />
                  <div>
                    <p className="text-xs font-semibold leading-tight text-slate-700">{act.description}</p>
                    {act.timestamp && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {format(act.timestamp.toDate(), 'dd MMM, hh:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Minimal Footer */}
      <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center opacity-60">
        <h4 className="font-arabic font-black text-slate-800 text-3xl mb-1 mt-2">ميثاق</h4>
        <p className="text-xs font-bold text-slate-600 mb-4 tracking-wide">বিশ্বাস • অঙ্গীকার • ঐক্য</p>
        <div className="flex flex-col gap-1 text-[9px] text-slate-400 font-medium">
          <p>App Version: RC-1 (Production)</p>
          <p>Last Sync: Just now</p>
          <p className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Firebase Connection: Secure
          </p>
        </div>
      </div>
      {selectedMember && (
        <MemberProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}
