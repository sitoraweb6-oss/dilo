const fs = require('fs');

let file = fs.readFileSync('src/components/home/BankDetailsCard.tsx', 'utf8');

file = file.replace(
  "              <div className=\"pr-2\">                <p className=\"text-[10px] font-bold text-slate-500 uppercase mb-0.5\">Branch</p>                <p className=\"text-sm font-bold text-slate-700 leading-tight\">Bangabandhu Road branch</p>              </div>              <button                onClick={() => handleCopy('Bangabandhu Road branch', 'branch')}",
  "              <div className=\"pr-2\">                <p className=\"text-[10px] font-bold text-slate-500 uppercase mb-0.5\">Branch</p>                <p className=\"text-sm font-bold text-slate-700 leading-tight\">Bangabandhu Road branch, Narayanganj</p>              </div>              <button                onClick={() => handleCopy('Bangabandhu Road branch, Narayanganj', 'branch')}"
);

file = file.replace(
  "            {/* Location */}            <div className=\"bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center\">              <div className=\"pr-2\">                <p className=\"text-[10px] font-bold text-slate-500 uppercase mb-0.5\">Location</p>                <p className=\"text-sm font-bold text-slate-700 leading-tight\">Narayanganj</p>              </div>              <button                onClick={() => handleCopy('Narayanganj', 'location')}                className={`p-2 rounded-xl transition-colors shrink-0 ${                  copiedField === 'location' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'                }`}              >                {copiedField === 'location' ? <Check size={14} /> : <Copy size={14} />}              </button>            </div>",
  "            {/* A/C Name */}            <div className=\"bg-white border border-slate-100 p-3 rounded-2xl flex justify-between items-center\">              <div className=\"pr-2\">                <p className=\"text-[10px] font-bold text-slate-500 uppercase mb-0.5\">A/C Name</p>                <p className=\"text-sm font-bold text-slate-700 leading-tight\">MD GOLAM KIBRIYA</p>              </div>              <button                onClick={() => handleCopy('MD GOLAM KIBRIYA', 'acName')}                className={`p-2 rounded-xl transition-colors shrink-0 ${                  copiedField === 'acName' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50'                }`}              >                {copiedField === 'acName' ? <Check size={14} /> : <Copy size={14} />}              </button>            </div>"
);

fs.writeFileSync('src/components/home/BankDetailsCard.tsx', file);
