import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { Hadith } from '../../types';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

export function HadithCarousel() {
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const q = query(
      collection(db, 'hadiths'),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );
    getDocs(q).then((snap) => {
      if (isMounted) {
        setHadiths(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hadith)));
        setLoading(false);
      }
    }).catch((e) => {
      console.error(e);
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || hadiths.length <= 1) return;
    const autoplay = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000); // 5 seconds per hadith
    return () => clearInterval(autoplay);
  }, [emblaApi, hadiths.length]);

  if (loading || hadiths.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden text-center text-white border border-white/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-8 -mt-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full -ml-8 -mb-8" />
      
      <div className="relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <BookOpen size={18} className="text-emerald-300" />
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {hadiths.map((hadith, index) => (
              <div key={hadith.id} className="relative flex-[0_0_100%] min-w-0 px-2 flex flex-col items-center justify-center">
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: selectedIndex === index ? 1 : 0, y: selectedIndex === index ? 0 : 5 }}
                  transition={{ duration: 0.5 }}
                  className="font-arabic text-2xl md:text-3xl leading-relaxed mb-4 text-emerald-50 drop-shadow-sm"
                  dir="rtl"
                >
                  {hadith.arabic}
                </motion.p>
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: selectedIndex === index ? 1 : 0, y: selectedIndex === index ? 0 : 5 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-sm md:text-base text-white/90 leading-relaxed mb-4 max-w-lg"
                >
                  "{hadith.bangla}"
                </motion.p>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: selectedIndex === index ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-500/20"
                >
                  {hadith.reference}
                </motion.p>
              </div>
            ))}
          </div>
        </div>

        {hadiths.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-5">
            {hadiths.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === selectedIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
