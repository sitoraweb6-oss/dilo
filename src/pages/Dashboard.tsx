import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Users, Wallet, Bell, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCurrentMonthPayments } from '../lib/useCurrentMonthPayments';
import { getMemberSlotSummary } from '../lib/paymentUtils';
import { AlertCircle } from 'lucide-react';
// Placeholders for sub-pages
import { HomeTab } from './tabs/HomeTab';
import { PersonalTab } from './tabs/PersonalTab';
import { NoticesTab } from './tabs/NoticesTab';
import { MembersTab } from './tabs/MembersTab';
import { ReportsTab } from './tabs/ReportsTab';
import { FloatingAdminActions } from '../components/home/FloatingAdminActions';
import { CalendarDays, BarChart3, Clock } from 'lucide-react';
import { MithaqLogo } from '../components/MithaqLogo';

export function Dashboard() {
  const { userProfile, logout, isAdmin } = useAuth();
   

  const { currentMonthPayments, currentMonth } = useCurrentMonthPayments();
  const slotSummary = userProfile ? getMemberSlotSummary(userProfile, currentMonthPayments, currentMonth) : null;
  const paymentStatus = slotSummary ? slotSummary.status : 'approved';
  const totalDue = slotSummary ? slotSummary.totalDueAmount : 0;
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'home' | 'personal' | 'notices' | 'members' | 'reports'>((location.state?.tab as any) || 'home');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const tabs = [
    { id: 'home', icon: Users, label: 'হোম' },
    { id: 'personal', icon: Wallet, label: 'আমার হিসাব' },
    { id: 'notices', icon: Bell, label: 'নোটিশ' },
    { id: 'members', icon: Users, label: 'সদস্য' }, // Added for bottom navigation upgrade
    { id: 'reports', icon: BarChart3, label: 'রিপোর্ট' }, // Added for bottom navigation upgrade
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-primary-500/85 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-50 px-4 py-2 flex items-center justify-between text-white transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 bg-white/10 rounded-xl flex items-center justify-center shadow-lg border border-white/20 p-1 backdrop-blur-md">
            <MithaqLogo className="w-full h-full drop-shadow-md" />
          </div>
          <div className="leading-tight flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h1 className="font-bold text-lg leading-none font-serif text-white tracking-wide" style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}>ميثاق</h1>
              <span className="text-white/40 text-xs font-light">|</span>
              <h2 className="font-bold text-base leading-none font-sans text-accent-400 tracking-wide">মিছাক</h2>
            </div>
            <p className="text-[10px] text-primary-50 font-medium truncate max-w-[180px]">{userProfile?.displayName} • {!isAdmin ? 'সদস্য' : 'অ্যাডমিন'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-primary-100 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 pb-28 max-w-2xl mx-auto w-full">
        
        {(paymentStatus === 'not_submitted' || paymentStatus === 'partial') && activeTab === 'home' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-[24px] p-5 mb-4 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-100 rounded-full blur-2xl -z-10 opacity-60 translate-x-10 -translate-y-10" />
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
              <AlertCircle size={28} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">চলতি মাসের বকেয়া সঞ্চয়</p>
            <h3 className="text-red-900 font-black text-2xl mb-1">৳{totalDue}</h3>
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium mb-4 bg-red-100/50 px-3 py-1 rounded-full">
              <Clock size={12} /> জমার শেষ সময়: প্রতি মাসের ২৫ তারিখ
            </div>
            <button
              onClick={() => setActiveTab('personal')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg w-full max-w-[200px]"
            >
              এখনই সঞ্চয় জমা দিন
            </button>
          </motion.div>
        )}

        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'personal' && <PersonalTab />}
        {activeTab === 'notices' && <NoticesTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
      {isAdmin && <FloatingAdminActions />}

      {/* Bottom Navigation */}
      <nav className="bg-white/70 backdrop-blur-2xl border-t border-white/80 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="max-w-md mx-auto flex justify-between px-6 pt-2 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="flex flex-col items-center p-2 relative"
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors relative z-10",
                  isActive ? "text-primary-600" : "text-slate-400"
                )}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary-50 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-medium mt-1 transition-colors",
                  isActive ? "text-primary-700" : "text-slate-400"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
