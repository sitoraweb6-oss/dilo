const fs = require('fs');

let file = fs.readFileSync('src/components/MemberProfileModal.tsx', 'utf8');

// Add useAuth import
if (!file.includes("import { useAuth }")) {
  file = file.replace(
    "import { collection", 
    "import { useAuth } from '../lib/AuthContext';\nimport { collection"
  );
}
if (!file.includes("import { useNavigate }")) {
  file = file.replace(
    "import { useAuth }", 
    "import { useNavigate } from 'react-router-dom';\nimport { useAuth }"
  );
}

// Add hooks
if (!file.includes("const { userProfile, isAdmin } = useAuth();")) {
  file = file.replace(
    "const [loading, setLoading] = useState(true);",
    "const [loading, setLoading] = useState(true);\n  const { userProfile, isAdmin } = useAuth();\n  const navigate = useNavigate();\n  const [isSubmitting, setIsSubmitting] = useState(false);"
  );
}

// Add the UI near the bottom
const renderPos = file.indexOf("</motion.div>");
if (renderPos !== -1) {
  const adminActions = `
        {/* Super Admin Actions */}
        {isAdmin && userProfile?.role === 'super_admin' && (
          <div className="p-6 border-t border-slate-100 bg-red-50/50">
            <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertCircle size={16} /> সুপার অ্যাডমিন অ্যাকশন
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => {
                  onClose();
                  navigate('/account-migration');
                }}
                className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200"
              >
                মাইগ্রেশন
              </button>
              <button 
                onClick={async () => {
                  const reason = prompt('নিষ্ক্রিয় করার কারণ লিখুন:');
                  if (!reason) return;
                  if (confirm('নিষ্ক্রিয় করার আবেদন জমা দিতে চান?')) {
                    setIsSubmitting(true);
                    try {
                      const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
                      await addDoc(collection(db, 'adminRequests'), {
                        requestType: 'MEMBER_DEACTIVATION',
                        status: 'PENDING',
                        requestedBy: userProfile.id,
                        requestedByName: userProfile.displayName,
                        targetUserId: member.id,
                        targetUserName: member.displayName,
                        createdAt: serverTimestamp(),
                        metadata: { reason }
                      });
                      alert('আবেদন জমা হয়েছে');
                      onClose();
                    } catch(e) { alert('Error: ' + e.message); }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 disabled:opacity-50"
              >
                নিষ্ক্রিয়করণ
              </button>
              <button 
                onClick={async () => {
                  const reason = prompt('মুছে ফেলার কারণ লিখুন:');
                  if (!reason) return;
                  if (confirm('মুছে ফেলার আবেদন জমা দিতে চান?')) {
                    setIsSubmitting(true);
                    try {
                      const { addDoc, collection, serverTimestamp } = require('firebase/firestore');
                      await addDoc(collection(db, 'adminRequests'), {
                        requestType: 'MEMBER_DELETION',
                        status: 'PENDING',
                        requestedBy: userProfile.id,
                        requestedByName: userProfile.displayName,
                        targetUserId: member.id,
                        targetUserName: member.displayName,
                        createdAt: serverTimestamp(),
                        metadata: { reason }
                      });
                      alert('আবেদন জমা হয়েছে');
                      onClose();
                    } catch(e) { alert('Error: ' + e.message); }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 disabled:opacity-50"
              >
                ডিলিট
              </button>
            </div>
          </div>
        )}
  `;
  file = file.slice(0, renderPos) + adminActions + file.slice(renderPos);
}

fs.writeFileSync('src/components/MemberProfileModal.tsx', file);
console.log("MemberProfileModal patched.");
