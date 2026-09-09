import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// Core Attribution Component
export function CoreAttribution({ children }: { children: React.ReactNode }) {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 600);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen to window resize in case they are scrolling a sub-container? 
    // Usually the window scroll works, but if there's a specific scrollable container...
    // The main container in this app usually scrolls on window.

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50">
      <div className="flex-1 w-full flex flex-col">
        {children}
      </div>

      {/* Footer Version (Static at the bottom of the app shell) */}
      <footer className="w-full py-6 pb-24 md:pb-6 bg-slate-50 flex items-center justify-center border-t border-slate-200/50 mt-auto shrink-0 z-0">
        <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
          Developed by
          <a 
            href="https://sitora.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold text-slate-500 hover:text-emerald-600 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] pointer-events-auto"
          >
            Sitora Web
          </a>
        </p>
      </footer>

      {/* Floating Version (Desktop & Mobile) */}
      <AnimatePresence>
        {!isScrolling && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-[9999] pointer-events-auto"
          >
            <a 
              href="https://sitora.org"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)] transition-all duration-300 hover:border-emerald-300"
            >
              <span className="text-[9px] md:text-[10px] font-medium text-slate-500 group-hover:text-slate-600 transition-colors">Developed by</span>
              <span className="text-[10px] md:text-[11px] font-bold text-slate-700 bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent group-hover:from-emerald-600 group-hover:to-teal-600 transition-all duration-300">Sitora Web</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
