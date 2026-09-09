const fs = require('fs');
let file = fs.readFileSync('src/components/home/PendingApprovalsSection.tsx', 'utf8');

file = file.replace(
  "import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';",
  "import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';"
);

file = file.replace(
  "const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', request.userId)));\n        \n        if (!userSnap.empty) {\n          const userData = userSnap.docs[0].data() as UserProfile;",
  "const userSnap = await getDoc(userRef);\n        \n        if (userSnap.exists()) {\n          const userData = userSnap.data() as UserProfile;"
);

fs.writeFileSync('src/components/home/PendingApprovalsSection.tsx', file);
console.log("Updated getDoc");
