const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

if (!file.includes('status === \'migrated\'')) {
  const insertIndex = file.indexOf("if (!pinVerified) {");
  if (insertIndex !== -1) {
    const migratedBlock = `  if (userProfile.status === 'migrated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <AlertTriangle className="text-amber-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Account Migrated</h1>
        <p className="text-slate-600 max-w-md">
          এই অ্যাকাউন্টটি নতুন অ্যাকাউন্টে মাইগ্রেট করা হয়েছে।
        </p>
        <button onClick={logout} className="mt-6 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold">
          লগআউট করুন
        </button>
      </div>
    );
  }
`;
    file = file.slice(0, insertIndex) + migratedBlock + file.slice(insertIndex);
    fs.writeFileSync('src/App.tsx', file);
    console.log("App.tsx fixed for migrated route.");
  }
}
