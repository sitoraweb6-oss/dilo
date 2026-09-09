import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Clock, MapPin, Calendar, Edit2, X, Video, User } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';
import { sendPushNotificationToUsers } from '../../lib/pushNotifications';

interface UpcomingEvent {
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  organizer?: string;
  bannerUrl?: string;
  meetingLink?: string;
  isImportant?: boolean;
  status: 'upcoming' | 'ongoing' | 'completed';
  updatedAt?: any;
}

const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const convertToBanglaNumber = (number: string | number) => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return number.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d)]);
};

const formatBanglaTime = (timeString: string, includeEmoji = false) => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  let period = '';
  let emoji = '';
  
  if (hour >= 5 && hour < 12) {
    period = 'সকাল';
    emoji = '🌞';
  } else if (hour >= 12 && hour < 15) {
    period = 'দুপুর';
    emoji = '🌤';
  } else if (hour >= 15 && hour < 18) {
    period = 'বিকাল';
    emoji = '🌤';
  } else if (hour >= 18 && hour < 20) {
    period = 'সন্ধ্যা';
    emoji = '🌇';
  } else {
    period = 'রাত';
    emoji = '🕘';
  }
  
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  
  const minStr = minute.toString().padStart(2, '0');
  
  if (includeEmoji) {
    return `${emoji} ${period} ${convertToBanglaNumber(displayHour)}:${convertToBanglaNumber(minStr)}`;
  }
  return `${period} ${convertToBanglaNumber(displayHour)}:${convertToBanglaNumber(minStr)}`;
};

export function UpcomingEventSection() {
  const { isAdmin, userProfile } = useAuth();
  const [event, setEvent] = useState<UpcomingEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'upcomingEvent'), (docSnap) => {
      if (docSnap.exists()) {
        const eventData = docSnap.data() as UpcomingEvent;
        setEvent(eventData);
      } else {
        setEvent(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to upcoming event:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return null;

  const eventDate = event ? new Date(`${event.date}T${event.time}`) : null;
  // Determine if it is completed or if it is in the past globally
  const isPastGlobal = eventDate ? new Date() > eventDate : false;

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-heading font-bold text-slate-800 flex items-center gap-2">
          {event?.status === 'completed' || isPastGlobal ? "সর্বশেষ ইভেন্ট" : "আসন্ন ইভেন্ট"}
        </h2>
        {isAdmin && !event && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors"
          >
            + ইভেন্ট যোগ করুন
          </button>
        )}
      </div>

      {!event ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 font-medium text-sm">এই মুহূর্তে কোনো আসন্ন ইভেন্ট নেই</p>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-primary-600 font-bold text-xs rounded-xl hover:bg-primary-100 transition-colors"
            >
              + নতুন ইভেন্ট যোগ করুন
            </button>
          )}
        </div>
      ) : event && eventDate ? (
        <EventCard 
          event={event} 
          eventDate={eventDate} 
          isAdmin={isAdmin} 
          onEdit={() => setIsEditing(true)}
          onClick={() => setShowDetails(true)}
        />
      ) : null}

      {isEditing && isAdmin && (
        <EventEditModal 
          event={event} 
          onClose={() => setIsEditing(false)} 
          currentUser={userProfile!} 
          onSaved={() => {}}
        />
      )}

      {showDetails && event && eventDate && (
        <EventDetailsModal
          event={event}
          eventDate={eventDate}
          onClose={() => setShowDetails(false)}
        />
      )}
    </section>
  );
}

function EventCard({ event, eventDate, isAdmin, onEdit, onClick }: { event: UpcomingEvent, eventDate: Date, isAdmin: boolean, onEdit: () => void, onClick: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, diff: 0 });

  const calculateTimeLeft = useCallback(() => {
    const diff = differenceInSeconds(eventDate, new Date());
    
    if (diff <= 0) {
      setTimeLeft({ d: 0, h: 0, m: 0, s: 0, diff });
      return;
    }
    
    const d = Math.floor(diff / (3600 * 24));
    const h = Math.floor((diff % (3600 * 24)) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    
    setTimeLeft({ d, h, m, s, diff });
  }, [eventDate]);

  useEffect(() => {
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const { diff } = timeLeft;
  const isCompleted = event.status === 'completed';
  const isStarted = !isCompleted && (event.status === 'ongoing' || diff <= 0);
  const isUrgent = diff > 0 && diff <= 86400; // <= 24h
  const isVeryUrgent = diff > 0 && diff <= 3600; // <= 1h

  return (
    <div className="relative group">
      <div 
        onClick={onClick}
        className={`bg-white border ${isUrgent && !isCompleted ? 'border-red-200 shadow-[0_4px_20px_rgba(239,68,68,0.1)]' : 'border-slate-200 shadow-sm'} rounded-3xl overflow-hidden cursor-pointer transition-all hover:shadow-md relative`}
      >
        {isAdmin && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur text-slate-400 hover:text-primary-600 rounded-full transition-colors z-20 shadow-sm border border-slate-100"
          >
            <Edit2 size={16} />
          </button>
        )}
        
        {isCompleted ? (
          <div className="absolute top-4 right-16 z-10">
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 shadow-sm">
              সম্পন্ন
            </span>
          </div>
        ) : isStarted ? (
          <div className="absolute top-4 right-16 z-10">
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-200 shadow-sm">
              চলছে
            </span>
          </div>
        ) : null}

        <div className="p-5 pb-4">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center justify-center bg-red-50 rounded-2xl p-3 border border-red-100 min-w-[75px] shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-red-600 uppercase mb-0.5 tracking-wider">
                {banglaMonths[eventDate.getMonth()]}
              </span>
              <span className="text-4xl font-black text-red-700 leading-none mb-1">
                {convertToBanglaNumber(eventDate.getDate())}
              </span>
              <span className="text-[9px] font-bold text-red-500/80 uppercase">
                {banglaDays[eventDate.getDay()]}
              </span>
            </div>
            
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {event.isImportant && !isCompleted && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-xs font-bold shadow-sm">
                    <span>⭐</span>
                    <span>গুরুত্বপূর্ণ</span>
                  </div>
                )}
                
                {isVeryUrgent && !isStarted && !isCompleted ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200/60 rounded-lg text-xs font-bold shadow-sm">
                    <span>🚨</span>
                    <span>আর ১ ঘণ্টারও কম সময় বাকি</span>
                  </div>
                ) : isUrgent && !isStarted && !isCompleted ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200/60 rounded-lg text-xs font-bold shadow-sm">
                    <span>🔴</span>
                    <span>আজ {formatBanglaTime(event.time, false)}</span>
                  </div>
                ) : null}
              </div>

              <h3 className="font-bold text-slate-800 text-lg leading-tight pr-6 mb-3 line-clamp-2">{event.title}</h3>

              <div className="flex flex-wrap gap-2.5 mt-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-primary-600">
                    <Clock size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{formatBanglaTime(event.time, true)}</span>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex-1 min-w-[120px]">
                    <div className="text-slate-500">
                      <MapPin size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Countdown Area */}
        <div className="bg-slate-50 p-4 border-t border-slate-100">
          {isCompleted ? (
            <div className="flex items-center justify-center py-2 mb-3">
              <span className="text-emerald-600 font-bold text-sm flex items-center gap-2">
                ✅ অনুষ্ঠান সম্পন্ন হয়েছে
              </span>
            </div>
          ) : isStarted ? (
            <div className="flex items-center justify-center py-2 mb-3">
              <span className="text-emerald-600 font-bold text-sm flex items-center gap-2">
                🟢 অনুষ্ঠান শুরু হয়েছে
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-3">
                <span className="text-red-600 text-[11px] font-bold tracking-wider">
                  সভা শুরু হতে আর বাকি
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-4 px-1 sm:px-4 mb-4">
                {[
                  { label: 'দিন', value: timeLeft.d },
                  { label: 'ঘণ্টা', value: timeLeft.h },
                  { label: 'মিনিট', value: timeLeft.m },
                  { label: 'সেকেন্ড', value: timeLeft.s }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono mb-0.5 leading-none tracking-tight">
                      {convertToBanglaNumber(item.value.toString().padStart(2, '0'))}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          <div className="flex justify-center">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm w-full">
              <span>📖</span> বিস্তারিত দেখুন
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function EventDetailsModal({ event, eventDate, onClose }: { event: UpcomingEvent, eventDate: Date, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="font-bold text-slate-800 text-base">ইভেন্টের বিস্তারিত</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-500 hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-5 space-y-6">
          {event.bannerUrl && (
            <div className="w-full h-48 sm:h-64 rounded-2xl overflow-hidden -mt-1 shadow-sm border border-slate-100">
              <img src={event.bannerUrl} alt="Event Banner" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {event.isImportant && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-lg text-xs font-bold shadow-sm">
                  <span>⭐</span>
                  <span>গুরুত্বপূর্ণ</span>
                </div>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight mb-3">{event.title}</h1>
            {event.description && (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
            )}
          </div>

          <div className="grid gap-3">
            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="p-2.5 bg-white text-primary-600 rounded-xl shadow-sm shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">তারিখ</span>
                <span className="block text-sm font-bold text-slate-800">
                  {convertToBanglaNumber(eventDate.getDate())} {banglaMonths[eventDate.getMonth()]} {convertToBanglaNumber(eventDate.getFullYear())}, {banglaDays[eventDate.getDay()]}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="p-2.5 bg-white text-primary-600 rounded-xl shadow-sm shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">সময়</span>
                <span className="block text-sm font-bold text-slate-800">{formatBanglaTime(event.time, true)}</span>
              </div>
            </div>
            
            {event.location && (
              <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-slate-500 rounded-xl shadow-sm shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">স্থান</span>
                  <span className="block text-sm font-bold text-slate-800 whitespace-pre-line">{event.location}</span>
                </div>
              </div>
            )}

            {event.organizer && (
              <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="p-2.5 bg-white text-slate-500 rounded-xl shadow-sm shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">আয়োজক</span>
                  <span className="block text-sm font-bold text-slate-800">{event.organizer}</span>
                </div>
              </div>
            )}

            {event.meetingLink && (
              <div className="flex items-start gap-4 p-4 bg-primary-50 border border-primary-100 rounded-2xl">
                <div className="p-2.5 bg-white text-primary-600 rounded-xl shadow-sm shrink-0">
                  <Video size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold text-primary-500 uppercase tracking-wider mb-0.5">মিটিং লিঙ্ক</span>
                  <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="block text-sm font-bold text-primary-700 hover:text-primary-800 hover:underline truncate">
                    {event.meetingLink}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventEditModal({ event, onClose, currentUser, onSaved }: { event: UpcomingEvent | null, onClose: () => void, currentUser: any, onSaved: () => void }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || '');
  const [time, setTime] = useState(event?.time || '');
  const [location, setLocation] = useState(event?.location || '');
  const [organizer, setOrganizer] = useState(event?.organizer || '');
  const [bannerUrl, setBannerUrl] = useState(event?.bannerUrl || '');
  const [meetingLink, setMeetingLink] = useState(event?.meetingLink || '');
  const [isImportant, setIsImportant] = useState(event?.isImportant || false);
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>(event?.status || 'upcoming');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isNew = !event;
      await setDoc(doc(db, 'settings', 'upcomingEvent'), {
        title,
        description,
        date,
        time,
        location,
        organizer,
        bannerUrl,
        meetingLink,
        isImportant,
        status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.id
      });

      const isMeaningfulUpdate = isNew || 
        event?.title !== title || 
        event?.date !== date || 
        event?.time !== time || 
        event?.location !== location ||
        event?.meetingLink !== meetingLink;

      if (isMeaningfulUpdate) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const allUserIds = usersSnap.docs.map(d => d.id);
        
        const notifTitle = isNew ? '🔔 নতুন ইভেন্ট' : '🔔 ইভেন্ট আপডেট';
        const notifBody = isNew 
          ? `নতুন ইভেন্ট "${title}" নির্ধারণ করা হয়েছে।`
          : `"${title}" ইভেন্টের সময় বা স্থান পরিবর্তন করা হয়েছে।`;
          
        await sendPushNotificationToUsers(allUserIds, notifTitle, notifBody);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('আপনি কি ইভেন্টটি মুছে ফেলতে চান?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'settings', 'upcomingEvent'));
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error deleting event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-bold text-slate-800">ইভেন্ট আপডেট</h2>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-500 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ইভেন্টের নাম</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 font-medium"
              placeholder="উদা: বার্ষিক সাধারণ সভা"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">বিস্তারিত (ঐচ্ছিক)</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 resize-none"
              placeholder="ইভেন্টের বিস্তারিত তথ্য..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ব্যানার ইমেজ URL (ঐচ্ছিক)</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">সময়</label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">স্থান (ঐচ্ছিক)</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
              placeholder="উদা: কেন্দ্রীয় জামে মসজিদ"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">আয়োজক (ঐচ্ছিক)</label>
              <input
                type="text"
                value={organizer}
                onChange={e => setOrganizer(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
                placeholder="উদা: পরিচালনা পর্ষদ"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">মিটিং লিঙ্ক (ঐচ্ছিক)</label>
              <input
                type="url"
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500"
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isImportant"
              checked={isImportant}
              onChange={e => setIsImportant(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="isImportant" className="text-sm font-bold text-slate-700">
              এটি একটি গুরুত্বপূর্ণ ইভেন্ট (⭐ ব্যাজ দেখাবে)
            </label>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">স্ট্যাটাস</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 font-medium text-slate-700"
            >
              <option value="upcoming">আসন্ন (Upcoming)</option>
              <option value="ongoing">চলছে (Ongoing)</option>
              <option value="completed">সম্পন্ন (Completed)</option>
            </select>
          </div>
        </form>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between shrink-0 gap-2">
          {event ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-bold text-red-500 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              মুছে ফেলুন
            </button>
          ) : <div></div>}
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              onClick={handleSave}
              disabled={saving || !title || !date || !time}
              className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
