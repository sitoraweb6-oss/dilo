import React, { useMemo } from 'react';
import { motion } from 'motion/react';

const quotes = [
  "The best among you are those who have the best manners and character. - Sahih al-Bukhari",
  "Allah does not look at your forms and possessions but he looks at your hearts and your deeds. - Sahih Muslim",
  "Richness is not having many belongings, but richness is contentment of the soul. - Sahih al-Bukhari",
  "A good word is a charity. - Sahih al-Bukhari",
  "He who does not show mercy to others, will not be shown mercy. - Sahih Muslim"
];

export function IslamicQuote() {
  const quote = useMemo(() => {
    const today = new Date().getDate();
    return quotes[today % quotes.length];
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-100 text-center"
    >
      <p className="text-xs text-slate-600 font-medium italic mb-2">"{quote.split(' - ')[0]}"</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{quote.split(' - ')[1]}</p>
    </motion.div>
  );
}
