const fs = require('fs');
let file = fs.readFileSync('src/components/home/PendingApprovalsSection.tsx', 'utf8');

file = file.replace(
  "await addDoc(collection(db, 'activityLog'), {\n          description: `${currentUser.displayName} ${request.userName}-এর নতুন স্লটের আবেদন চূড়ান্ত অনুমোদন করেছেন`,\n          timestamp: serverTimestamp(),\n        });\n        onComplete?.();",
  "await addDoc(collection(db, 'activityLog'), {\n          description: `${currentUser.displayName} ${request.userName}-এর নতুন স্লটের আবেদন চূড়ান্ত অনুমোদন করেছেন`,\n          timestamp: serverTimestamp(),\n        });\n        await sendPushNotificationToUsers([request.userId], '✅ অতিরিক্ত স্লট অনুমোদিত', 'আপনার অতিরিক্ত Slot-এর আবেদন অনুমোদিত হয়েছে।');\n        onComplete?.();"
);

file = file.replace(
  "await addDoc(collection(db, 'activityLog'), {\n        description: `${currentUser.displayName} ${request.userName}-এর নতুন স্লটের আবেদন বাতিল করেছেন`,\n        timestamp: serverTimestamp(),\n      });\n      \n      onComplete?.();",
  "await addDoc(collection(db, 'activityLog'), {\n        description: `${currentUser.displayName} ${request.userName}-এর নতুন স্লটের আবেদন বাতিল করেছেন`,\n        timestamp: serverTimestamp(),\n      });\n      await sendPushNotificationToUsers([request.userId], '❌ অতিরিক্ত স্লট বাতিল', 'আপনার অতিরিক্ত Slot-এর আবেদন প্রত্যাখ্যান করা হয়েছে।');\n      \n      onComplete?.();"
);

fs.writeFileSync('src/components/home/PendingApprovalsSection.tsx', file);
console.log("Updated notification");
