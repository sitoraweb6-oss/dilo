import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Poll, PollOption } from '../types';
import { ArrowLeft, CheckCircle2, Plus, PieChart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { sendPushNotificationToAll } from '../lib/pushNotifications';

export function Polls() {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    getDocs(q).then((snap) => {
      if (isMounted) {
        setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)));
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, []);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim() !== '');
    if (!question.trim() || validOptions.length < 2 || !userProfile) return;

    try {
      setLoading(true);
      const pollOptions: PollOption[] = validOptions.map(opt => ({
        optionId: crypto.randomUUID(),
        text: opt,
        votes: 0
      }));

      await addDoc(collection(db, 'polls'), {
        question,
        options: pollOptions,
        votedUserIds: [],
        createdBy: userProfile.displayName,
        createdAt: serverTimestamp(),
        isActive: true
      });

      await addDoc(collection(db, 'activityLog'), {
        description: `${userProfile.displayName} একটি নতুন পোল তৈরি করেছেন: "${question}"`,
        timestamp: serverTimestamp(),
      });

      // Send Push Notification
      await sendPushNotificationToAll('🗳️ নতুন ভোট চালু হয়েছে', question);

      setIsAdding(false);
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      console.error(error);
      alert('পোল তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (poll: Poll, optionId: string) => {
    if (!userProfile || poll.votedUserIds.includes(userProfile.id)) return;
    
    const originalPolls = [...polls];
    const updatedOptions = poll.options.map(opt => 
      opt.optionId === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );
    const updatedVotedUserIds = [...poll.votedUserIds, userProfile.id];
    
    setPolls(polls.map(p => 
      p.id === poll.id ? { ...p, options: updatedOptions, votedUserIds: updatedVotedUserIds } : p
    ));

    try {
      await updateDoc(doc(db, 'polls', poll.id), {
        options: updatedOptions,
        votedUserIds: updatedVotedUserIds
      });
    } catch (error) {
      console.error(error);
      setPolls(originalPolls);
    }
  };

  const handleToggleStatus = async (poll: Poll) => {
    // Optimistic UI Update
    setPolls(polls.map(p => 
      p.id === poll.id ? { ...p, isActive: !p.isActive } : p
    ));

    try {
      await updateDoc(doc(db, 'polls', poll.id), {
        isActive: !poll.isActive
      });
    } catch (error) {
      console.error(error);
    }
  };

  const activePolls = polls.filter(p => p.isActive);
  const previousPolls = polls.filter(p => !p.isActive);

  const renderPoll = (poll: Poll) => {
    const hasVoted = userProfile ? poll.votedUserIds.includes(userProfile.id) : false;
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

    return (
      <div key={poll.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${poll.isActive ? 'border-primary-200' : 'border-slate-200 opacity-80'}`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-slate-800 text-lg leading-snug">{poll.question}</h3>
          {isAdmin && (
            <button 
              onClick={() => handleToggleStatus(poll)}
              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium hover:bg-slate-200 shrink-0 ml-2"
            >
              {poll.isActive ? 'বন্ধ করুন' : 'চালু করুন'}
            </button>
          )}
        </div>
        
        <div className="space-y-2 mt-4">
          {poll.options.map(opt => {
            const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.optionId}
                disabled={hasVoted || !poll.isActive}
                onClick={() => handleVote(poll, opt.optionId)}
                className={`w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                  hasVoted ? 'border-slate-200' : (poll.isActive ? 'border-primary-100 hover:border-primary-300 bg-white hover:bg-primary-50 cursor-pointer' : 'border-slate-200 bg-slate-50 cursor-not-allowed')
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
        
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>মোট ভোট: <strong className="text-slate-700">{totalVotes}</strong></span>
          <span>{poll.createdAt ? format(poll.createdAt.toDate(), 'dd MMM yyyy') : ''}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={20} className="text-primary-500" />
            পোল এবং ভোটিং
          </h1>
        </div>
        {isAdmin && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-primary-200 transition-colors"
          >
            <Plus size={16} />
            নতুন পোল
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <AnimatePresence>
          {isAdding && isAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700">নতুন পোল তৈরি করুন</h3>
                  <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                
                <input 
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="প্রশ্নটি লিখুন..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm mb-4 outline-none focus:border-primary-500"
                  required
                />
                
                <div className="space-y-2 mb-4">
                  <label className="block text-xs font-medium text-slate-600">অপশন সমূহ</label>
                  {options.map((opt, index) => (
                    <div key={index} className="flex gap-2">
                      <input 
                        type="text"
                        value={opt}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        placeholder={`অপশন ${index + 1}`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500"
                        required={index < 2}
                      />
                      {options.length > 2 && (
                        <button type="button" onClick={() => handleRemoveOption(index)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={handleAddOption}
                    className="text-xs text-primary-600 font-medium p-2 hover:bg-primary-50 rounded-lg"
                  >
                    + আরও অপশন যোগ করুন
                  </button>
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || !question.trim() || options.filter(o => o.trim() !== '').length < 2}
                  className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'তৈরি হচ্ছে...' : 'পোল পাবলিশ করুন'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          {activePolls.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                চলমান পোল
              </h2>
              <div className="space-y-4">
                {activePolls.map(renderPoll)}
              </div>
            </div>
          )}

          {previousPolls.length > 0 && (
            <div>
              <h2 className="font-bold text-slate-500 text-sm mb-3 mt-8 border-t border-slate-200 pt-6">পূর্ববর্তী পোল</h2>
              <div className="space-y-4">
                {previousPolls.map(renderPoll)}
              </div>
            </div>
          )}

          {polls.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              <PieChart className="mx-auto mb-2 opacity-50" size={32} />
              <p>কোনো পোল নেই</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
