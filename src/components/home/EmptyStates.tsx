import React from 'react';
import { motion } from 'motion/react';
import { CalendarX, MegaphoneOff, Receipt, Vote } from 'lucide-react';

export function EmptyState({ icon: Icon, title, message }: { icon: any, title: string, message: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm"
    >
      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
        <Icon size={24} className="text-slate-300" />
      </div>
      <h4 className="text-sm font-bold text-slate-700 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-[200px]">{message}</p>
    </motion.div>
  );
}

export function NoUpcomingEvents() {
  return <EmptyState icon={CalendarX} title="No Upcoming Events" message="There are no scheduled meetings or events at the moment." />;
}

export function NoBroadcast() {
  return <EmptyState icon={MegaphoneOff} title="No Announcements" message="Admins haven't published any broadcasts recently." />;
}

export function NoActivePoll() {
  return <EmptyState icon={Vote} title="No Active Polls" message="There are no active polls right now." />;
}
