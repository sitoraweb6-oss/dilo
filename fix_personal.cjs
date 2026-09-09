const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

file = file.replace(
  "import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';",
  "import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';"
);

file = file.replace(
  "const [showSlotRequestModal, setShowSlotRequestModal] = useState(false);",
  "const [showSlotRequestModal, setShowSlotRequestModal] = useState(false);\n  const [hasPendingSlotReq, setHasPendingSlotReq] = useState(false);"
);

file = file.replace(
  "useEffect(() => {",
  "useEffect(() => {\n    if (userProfile?.id) {\n      const unsub = onSnapshot(query(\n        collection(db, 'slotRequests'),\n        where('userId', '==', userProfile.id),\n        where('status', 'in', ['pending', 'level_1_approved'])\n      ), (snap) => {\n        setHasPendingSlotReq(!snap.empty);\n      });\n      return () => unsub();\n    }\n  }, [userProfile?.id]);\n\n  useEffect(() => {"
);

const newSlotButton = `
          <div className="absolute top-4 right-4 z-10">
            {hasPendingSlotReq ? (
              <div className="bg-amber-100/90 text-amber-800 p-2 rounded-lg backdrop-blur-md border border-amber-200 text-xs shadow-sm max-w-[200px] text-right ml-auto">
                <div className="flex items-center justify-end gap-1.5 font-bold mb-1">
                  <Clock size={12} />
                  <span>আবেদন অপেক্ষমাণ</span>
                </div>
                <p className="text-[10px] leading-tight">আপনার নতুন স্লটের আবেদনটি এডমিনের অনুমোদনের অপেক্ষায় আছে।</p>
              </div>
            ) : (
              <button
                onClick={() => setShowSlotRequestModal(true)}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold backdrop-blur-md border border-white/20 shadow-sm"
              >
                <PlusCircle size={16} />
                <span>নতুন স্লট যোগ করুন</span>
              </button>
            )}
          </div>
`;

file = file.replace(
  /<div className="absolute top-4 right-4">[\s\S]*?<\/button>\s*<\/div>/,
  newSlotButton.trim()
);

fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', file);
console.log("Updated PersonalTab.tsx");
