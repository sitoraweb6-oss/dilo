const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

const buttonHtml = `
      {/* Account Migration Button */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between mt-6">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">অ্যাকাউন্ট মাইগ্রেশন</h3>
          <p className="text-xs text-slate-500 mt-1">আপনার পুরোনো অ্যাকাউন্ট থেকে তথ্য স্থানান্তর করুন</p>
        </div>
        <button
          onClick={() => window.location.href = '/account-migration'}
          className="bg-indigo-50 text-indigo-700 font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors text-xs whitespace-nowrap w-full sm:w-auto"
        >
          মাইগ্রেশন রিকোয়েস্ট
        </button>
      </div>
`;

if (!file.includes('অ্যাকাউন্ট মাইগ্রেশন')) {
  file = file.replace('</main>', buttonHtml + '\n</main>');
  fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', file);
  console.log("Migration button added to PersonalTab.tsx");
}
