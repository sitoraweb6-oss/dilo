import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadingScreenProps {
  isFirebaseLoaded: boolean;
  onAnimationComplete: () => void;
}

export function LoadingScreen({ isFirebaseLoaded, onAnimationComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState(0);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      if (isFirebaseLoaded) {
        onAnimationComplete();
      }
      return;
    }

    let isMounted = true;

    const runSequence = async () => {
      // Phase 0: Leaves entering
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      setPhase(1); // Glow & Names

      await new Promise(r => setTimeout(r, 800));
      if (!isMounted) return;
      setPhase(2); // Tag words & Loading bar
      
      const checkFirebase = () => {
         if (isFirebaseLoaded) {
            setTimeout(() => {
              if (isMounted) {
                 setPhase(3); // Exit
                 setTimeout(() => {
                    if (isMounted) onAnimationComplete();
                 }, 700);
              }
            }, 1000); // Show tags and loading for a bit
         } else {
            setTimeout(checkFirebase, 200);
         }
      };
      checkFirebase();
    };

    runSequence();

    return () => { isMounted = false; };
  }, [prefersReducedMotion, isFirebaseLoaded, onAnimationComplete]);

  if (prefersReducedMotion) {
     return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-[100]">
           <div className="text-white text-sm mb-3 font-medium">লোড হচ্ছে...</div>
           <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-emerald-500"
               initial={{ width: '0%' }}
               animate={{ width: '100%' }}
               transition={{ duration: 1, ease: 'easeInOut' }}
             />
           </div>
        </div>
     );
  }

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          initial={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#021f1d] to-[#011413] overflow-hidden"
        >
          {/* Subtle animated particles */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-emerald-400 rounded-full"
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: Math.random() * window.innerHeight,
                  opacity: Math.random() * 0.5 + 0.2,
                }}
                animate={{ 
                  y: [null, Math.random() * -100 - 50],
                  opacity: [null, 0]
                }}
                transition={{ 
                  duration: Math.random() * 3 + 2, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          <div className="relative w-full max-w-sm flex flex-col items-center z-10">
            {/* Center Logo Animation */}
            <div className="relative flex items-center justify-center mb-6 h-32 w-32">
              <AnimatePresence>
                {phase >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute w-28 h-28 bg-emerald-500/20 blur-2xl rounded-full"
                  />
                )}
              </AnimatePresence>

              <motion.div
                animate={phase >= 1 ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10"
              >
                <svg viewBox="0 0 100 100" className="w-32 h-32 drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="emeraldGradSplash" x1="15" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#059669" />
                      <stop offset="1" stopColor="#022C22" />
                    </linearGradient>
                    <linearGradient id="goldGradSplash" x1="85" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FCD34D" />
                      <stop offset="1" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                  
                  {/* Left Leaf - Emerald */}
                  <motion.path 
                    d="M 50 90 C 10 90 10 20 50 5 C 50 45 30 65 50 90 Z" 
                    fill="url(#emeraldGradSplash)"
                    initial={{ x: -25, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                  
                  {/* Right Leaf - Gold */}
                  <motion.path 
                    d="M 50 90 C 90 90 90 20 50 5 C 50 45 70 65 50 90 Z" 
                    fill="url(#goldGradSplash)" 
                    initial={{ x: 25, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                  
                  {/* Center Accent Line */}
                  <motion.path 
                    d="M 50 5 L 50 90" 
                    stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" 
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={phase >= 1 ? { opacity: 0.9, pathLength: 1 } : { opacity: 0, pathLength: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Names */}
            <AnimatePresence>
              {phase >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="flex flex-col items-center mb-6 mt-4"
                >
                  <h1 className="text-5xl font-bold tracking-tight text-white font-serif drop-shadow-md mb-2" style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}>
                    ميثاق
                  </h1>
                  <h2 className="text-3xl font-bold tracking-tight text-emerald-400 font-sans drop-shadow-md">
                    মিছাক
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag Words */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="flex gap-5 text-emerald-100/90 text-sm font-medium tracking-wide mb-12"
                >
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>🛡 বিশ্বাস</motion.span>
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>👥 ঐক্য</motion.span>
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>📈 উন্নতি</motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Bar */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="absolute bottom-[-80px] flex flex-col items-center w-full"
                >
                  <span className="text-emerald-300/80 text-xs mb-3 font-medium tracking-widest">লোড হচ্ছে...</span>
                  <div className="w-48 h-[3px] bg-emerald-900/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500/20 via-emerald-400 to-emerald-500/20"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
