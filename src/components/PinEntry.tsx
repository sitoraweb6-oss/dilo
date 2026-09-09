import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Delete } from 'lucide-react';

interface PinEntryProps {
  onSuccess: (pin: string) => void;
  onError?: () => void;
  expectedPinHash?: string;
  isSetup?: boolean;
  title?: string;
  subtitle?: string;
}

export function PinEntry({ onSuccess, onError, expectedPinHash, isSetup, title: initialTitle, subtitle: initialSubtitle }: PinEntryProps) {
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [keypadKey, setKeypadKey] = useState(0);
  
  const title = isSetup 
    ? (setupStep === 1 ? (initialTitle || 'নতুন পিন সেট করুন') : 'পিন আবার লিখে কনফার্ম করুন')
    : (initialTitle || 'পিন দিন');
    
  const subtitle = isSetup
    ? (setupStep === 1 ? (initialSubtitle || 'অ্যাপে প্রবেশের জন্য ৪-ডিজিটের পিন দিন') : 'আগের দেওয়া পিনটি পুনরায় লিখুন')
    : (initialSubtitle || 'এগিয়ে যেতে আপনার ৪-ডিজিটের পিন দিন');

  // Randomize keypad
  const keypad = useMemo(() => {
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    // Add empty slot and delete button for a 4x3 grid
    const grid = [...digits.slice(0, 9), 'delete', digits[9], 'empty'];
    return grid;
  }, [keypadKey]);

  const handlePress = async (key: string) => {
    if (status !== 'idle' || key === 'empty') return;
    if (errorMsg) setErrorMsg(''); // Clear error if typing again
    
    if (key === 'delete') {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (isSetup) {
          if (setupStep === 1) {
            setTimeout(() => {
              setFirstPin(newPin);
              setPin('');
              setSetupStep(2);
              setKeypadKey(k => k + 1);
            }, 300);
          } else {
            if (newPin === firstPin) {
              setStatus('success');
              setTimeout(() => onSuccess(newPin), 800);
            } else {
              setStatus('error');
              setErrorMsg('পিন দুইটি মিলেনি, আবার চেষ্টা করুন');
              setTimeout(() => {
                setPin('');
                setFirstPin('');
                setSetupStep(1);
                setStatus('idle');
                setKeypadKey(k => k + 1);
              }, 1000);
            }
          }
        } else {
          // If verifying, we should check against hash
          // We don't have the hash check here directly since that needs async, 
          // but we can pass it up or do it here if expectedPinHash is provided.
          // Wait, crypto.subtle is async, so we'll do it here.
          const encoder = new TextEncoder();
          const data = encoder.encode(newPin);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          if (hashHex === expectedPinHash) {
            setStatus('success');
            setTimeout(() => onSuccess(newPin), 800);
          } else {
            setStatus('error');
            if (onError) onError();
            setTimeout(() => {
              setPin('');
              setStatus('idle');
            }, 600);
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto">
      <div className="text-center mb-8 h-20">
        <h2 className="text-2xl font-bold text-primary-700 mb-2 font-heading">{title}</h2>
        {errorMsg ? (
          <p className="text-red-500 text-sm font-medium animate-pulse">{errorMsg}</p>
        ) : (
          <p className="text-slate-500 text-sm">{subtitle}</p>
        )}
      </div>

      {/* PIN Slots */}
      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < pin.length;
          return (
            <motion.div
              key={index}
              animate={
                status === 'error' ? { x: [-10, 10, -10, 10, 0] } :
                status === 'success' ? { scale: [1, 1.15, 1], backgroundColor: '#10B981', borderColor: '#10B981' } :
                isFilled ? { scale: [1, 1.15, 1], y: [0, -4, 0] } : {}
              }
              transition={{ duration: status === 'error' ? 0.4 : 0.2 }}
              className={cn(
                "w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold shadow-sm transition-colors",
                isFilled ? "border-primary-500 bg-primary-50 text-primary-700 shadow-md" : "border-slate-200 bg-white"
              )}
            >
              {isFilled && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-4 h-4 rounded-full bg-primary-600"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full">
        <AnimatePresence>
          {keypad.map((key, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 25 }}
            >
              {key === 'empty' ? (
                <div className="h-16" />
              ) : key === 'delete' ? (
                <motion.button
                  onClick={() => handlePress(key)}
                  whileTap={{ scale: 0.9 }}
                  className="w-full h-16 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Delete size={28} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => handlePress(key)}
                  whileTap={{ scale: 0.9, backgroundColor: '#f0f7f9' }}
                  className="w-full h-16 rounded-full bg-white shadow-sm border border-slate-100 text-2xl font-medium text-slate-700 flex items-center justify-center"
                >
                  {key}
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
