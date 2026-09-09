const fs = require('fs');
let file = fs.readFileSync('src/pages/tabs/PersonalTab.tsx', 'utf8');

file = file.replace(
  `collection(db, 'slotRequests'),`,
  `collection(db, 'adminRequests'),`
);

file = file.replace(
  `where('userId', '==', userProfile.id),`,
  `where('targetUserId', '==', userProfile.id),\n        where('requestType', '==', 'SLOT_INCREASE'),`
);

file = file.replace(
  `where('status', 'in', ['pending', 'level_1_approved'])`,
  `where('status', 'in', ['PENDING', 'LEVEL_1_APPROVED'])`
);

fs.writeFileSync('src/pages/tabs/PersonalTab.tsx', file);
console.log("PersonalTab patched");
