import React from "react";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { CommunityMessage, UserProfile } from '../types';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function CommunityChat() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<(CommunityMessage & { user?: UserProfile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Fetch users once
    getDocs(collection(db, 'users')).then((snap) => {
      if (!isMounted) return;
      const usersMap: Record<string, UserProfile> = {};
      snap.forEach(doc => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() } as UserProfile;
      });
      setUsers(usersMap);
    }).catch(console.error);

    // Only get last 50 messages to save reads
    const q = query(collection(db, 'communityMessages'), orderBy('timestamp', 'desc'), limit(50));
    const unsubMessages = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityMessage));
      // Reverse since we queried desc
      setMessages(msgs.reverse());
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      isMounted = false;
      unsubMessages();
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile) return;
    const text = newMessage;
    setNewMessage('');
    await addDoc(collection(db, 'communityMessages'), {
      userId: userProfile.id,
      message: text,
      timestamp: serverTimestamp()
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="h-16 bg-white shadow-sm flex items-center px-4 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-slate-800">কমিউনিটি চ্যাট</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMe = msg.userId === userProfile?.id;
          const sender = users[msg.userId];
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-500">
                {sender?.photoURL ? <img src={sender.photoURL} alt="avatar" /> : sender?.displayName?.charAt(0) || '?'}
              </div>
              <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-[10px] text-slate-500 mb-1 ml-1">{sender?.displayName}</span>}
                <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 rounded-tl-sm'}`}>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1">
                  {msg.timestamp ? format(msg.timestamp.toDate(), 'hh:mm a') : '...'}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </main>

      <footer className="bg-white p-3 border-t border-slate-200 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto w-full">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="মেসেজ লিখুন..."
            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-primary-500 rounded-full px-4 py-2 text-sm outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
