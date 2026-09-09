const fs = require('fs');

let file = fs.readFileSync('src/components/home/HomeInvestmentSection.tsx', 'utf8');

const targetContent = `<motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-emerald-900/20"
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -ml-10 -mb-10"></div>
        
        {/* Animated Graph Line (SVG) */}
        <svg className="absolute bottom-0 right-0 w-full h-24 opacity-30 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d="M 0 100 Q 20 80, 40 90 T 80 40 T 100 0 L 100 100 Z"
            fill="url(#grad)"
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            d="M 0 100 Q 20 80, 40 90 T 80 40 T 100 0"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
          />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700/50 flex items-center justify-center backdrop-blur-sm border border-emerald-600/50">
              <TrendingUp size={16} className="text-emerald-300" />
            </div>
            <h2 className="font-heading font-black text-lg text-emerald-50">আমাদের বিনিয়োগ</h2>
          </div>
          
          <p className="text-emerald-200/80 text-sm font-medium mb-5 max-w-[200px] leading-relaxed">
            তহবিলের অর্থকে পরিকল্পিতভাবে কাজে লাগিয়ে ভবিষ্যতের জন্য সম্পদ তৈরি।
          </p>

          <div className="bg-emerald-900/50 backdrop-blur-md border border-emerald-700/50 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-emerald-300 uppercase mb-1">উপলব্ধ তহবিল</p>
            <p className="text-2xl font-black font-heading tracking-tight">
              {fundLoading ? '...' : \`৳ \${availableFund.toLocaleString('en-IN')}\`}
            </p>
            
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-emerald-700/50">
              <div>
                <p className="text-[10px] text-emerald-400 font-bold mb-0.5">চলমান</p>
                <p className="text-sm font-bold text-white">{activeInvestments.length}</p>
              </div>
              <div className="w-px h-6 bg-emerald-700/50"></div>
              <div>
                <p className="text-[10px] text-emerald-400 font-bold mb-0.5">অপেক্ষমান</p>
                <p className="text-sm font-bold text-white">{pendingProposals.length}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate('/investments')}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/50"
          >
            বিনিয়োগ ব্যবস্থাপনা দেখুন
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>`;

const replacementContent = `<motion.div 
        onClick={() => navigate('/investments')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-3xl p-4 text-white relative overflow-hidden shadow-sm flex items-center justify-between cursor-pointer group transition-all"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -ml-10 -mb-10"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-emerald-700/50 flex items-center justify-center backdrop-blur-sm border border-emerald-600/50 shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp size={20} className="text-emerald-300" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-emerald-50 mb-0.5">আমাদের বিনিয়োগ</h2>
            <p className="text-[11px] font-bold text-emerald-300">তহবিল: ৳ {fundLoading ? '...' : availableFund.toLocaleString('en-IN')}</p>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex gap-2 text-right">
             <div className="bg-emerald-900/50 px-2.5 py-1.5 rounded-xl border border-emerald-700/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block leading-none mb-1">চলমান</span>
                <span className="text-xs font-black leading-none">{activeInvestments.length}</span>
             </div>
             <div className="bg-emerald-900/50 px-2.5 py-1.5 rounded-xl border border-emerald-700/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block leading-none mb-1">প্রস্তাব</span>
                <span className="text-xs font-black leading-none">{pendingProposals.length}</span>
             </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-emerald-700/50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
            <ChevronRight size={14} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </motion.div>`;

if (file.includes(targetContent)) {
  file = file.replace(targetContent, replacementContent);
  fs.writeFileSync('src/components/home/HomeInvestmentSection.tsx', file);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find target content.");
}
