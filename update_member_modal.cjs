const fs = require('fs');

let file = fs.readFileSync('src/components/MemberProfileModal.tsx', 'utf8');

const actions = `
        {/* Super Admin Actions */}
        {isAdmin && userProfile?.role === 'super_admin' && (
          <div className="p-6 border-t border-slate-100 bg-red-50/50">
            <h4 className="text-sm font-bold text-red-800 mb-3">সুপার অ্যাডমিন অ্যাকশন</h4>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  if (confirm('নিষ্ক্রিয় করার আবেদন জমা দিতে চান?')) {
                    // This could open a modal for reason
                  }
                }}
                className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50"
              >
                নিষ্ক্রিয় করার আবেদন
              </button>
              <button 
                onClick={() => {
                  if (confirm('মুছে ফেলার আবেদন জমা দিতে চান?')) {
                    // This could open a modal for reason
                  }
                }}
                className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
              >
                মুছে ফেলার আবেদন
              </button>
            </div>
          </div>
        )}
`;

// I'll manually modify it rather than using a complex regex.
