import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Poll } from '../../types';
import { Vote, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ActivePollCard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    let isMounted = true;
    const q = query(
      collection(db, 'polls'), 
      where('isActive', '==', true)
    );
    getDocs(q).then((snap) => {
      if (isMounted) {
        if (snap.empty) {
          setPoll(null);
        } else {
          const polls = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
          polls.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setPoll(polls[0]);
        }
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const hasVoted = Boolean(userProfile && poll.votedUserIds?.includes(userProfile.id));

  const handleVote = async (optionId: string) => {
    if (!userProfile || hasVoted) return;
    
    const originalPoll = { ...poll };
    const updatedOptions = poll.options.map(opt => 
      opt.optionId === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );
    const updatedVotedUserIds = [...(poll.votedUserIds || []), userProfile.id];
    
    setPoll({ ...poll, options: updatedOptions, votedUserIds: updatedVotedUserIds });

    try {
      await updateDoc(doc(db, 'polls', poll.id), {
        options: updatedOptions,
        votedUserIds: updatedVotedUserIds
      });
    } catch (error) {
      console.error(error);
      setPoll(originalPoll);
    }
  };

  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-3 px-1">
        <h3 className="font-heading font-bold text-slate-800 text-sm">সক্রিয় পোল</h3>
        <button 
          onClick={() => navigate('/polls')} 
          className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline"
        >
          সব দেখুন <ArrowRight size={12} />
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-600 shrink-0">
            <Vote size={18} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm leading-tight">{poll.question}</h4>
            <p className="text-[10px] text-slate-500 mt-1">{totalVotes} টি ভোট • {hasVoted ? 'আপনি ভোট দিয়েছেন' : 'আপনার মতামত দিন'}</p>
          </div>
        </div>
        <div className="space-y-2">
          {poll.options.map((opt) => {
            const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.optionId}
                onClick={() => handleVote(opt.optionId)}
                disabled={hasVoted}
                className={`w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                  hasVoted 
                    ? 'border-slate-200 cursor-default' 
                    : 'border-primary-100 hover:border-primary-300 bg-white hover:bg-primary-50 cursor-pointer'
                }`}
              >
                {hasVoted && (
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary-50 z-0 transition-all duration-500 ease-out" 
                    style={{ width: `${percentage}%` }} 
                  />
                )}
                <div className="relative z-10 flex justify-between items-center">
                  <span className={`text-sm font-medium ${hasVoted ? 'text-slate-800' : 'text-slate-700'}`}>{opt.text}</span>
                  {hasVoted && <span className="text-xs font-bold text-primary-700">{percentage}%</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
