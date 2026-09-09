const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/HomeTab.tsx', 'utf8');

file = file.replace(
  "import { Bell, ArrowRight, UserPlus, Receipt, Vote, Megaphone } from 'lucide-react';",
  "import { Bell, ArrowRight, UserPlus, Receipt, Vote, Megaphone, TrendingUp } from 'lucide-react';"
);

const newAction = `
        <button onClick={() => navigate('/investments')} className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex flex-col items-center text-center hover:bg-emerald-100 transition-colors shadow-sm">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-emerald-800">বিনিয়োগ</p>
        </button>
`;

file = file.replace(
  "<div className=\"grid grid-cols-4 gap-3 mb-6\">",
  "<div className=\"grid grid-cols-4 sm:grid-cols-5 gap-3 mb-6\">\n" + newAction
);

fs.writeFileSync('src/pages/tabs/HomeTab.tsx', file);
