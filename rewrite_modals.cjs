const fs = require('fs');

// SlotRequestModal.tsx
let slotFile = fs.readFileSync('src/components/SlotRequestModal.tsx', 'utf8');
slotFile = slotFile.replace(/collection\(db, 'slotRequests'\)/g, "collection(db, 'adminRequests')");
slotFile = slotFile.replace(
  `      await addDoc(collection(db, 'adminRequests'), {
        userId: userProfile.id,
        userName: userProfile.displayName,
        requestedSlotsCount: requestedSlots,
        requestedSlotNames: slotNames.map(n => n.trim()),
        monthlyDuePerSlot: settings.monthlyFee || 1000,
        status: 'pending',
        createdAt: serverTimestamp()
      });`,
  `      await addDoc(collection(db, 'adminRequests'), {
        requestType: 'SLOT_INCREASE',
        status: 'PENDING',
        requestedBy: userProfile.id,
        requestedByName: userProfile.displayName,
        targetUserId: userProfile.id,
        targetUserName: userProfile.displayName,
        createdAt: serverTimestamp(),
        metadata: {
          requestedSlotsCount: requestedSlots,
          requestedSlotNames: slotNames.map(n => n.trim()),
          monthlyDuePerSlot: settings.monthlyFee || 1000
        }
      });`
);
// Fix the query status
slotFile = slotFile.replace(
  `where('status', 'in', ['pending', 'level_1_approved'])`,
  `where('status', 'in', ['PENDING', 'LEVEL_1_APPROVED'])`
);
// Add the requestType filter
slotFile = slotFile.replace(
  `where('userId', '==', userProfile.id),`,
  `where('targetUserId', '==', userProfile.id),\n        where('requestType', '==', 'SLOT_INCREASE'),`
);
fs.writeFileSync('src/components/SlotRequestModal.tsx', slotFile);

// PinRecoveryModal.tsx
let pinFile = fs.readFileSync('src/components/PinRecoveryModal.tsx', 'utf8');
pinFile = pinFile.replace(/collection\(db, 'pinRecoveryRequests'\)/g, "collection(db, 'adminRequests')");
pinFile = pinFile.replace(
  `where('userId', '==', userProfile.id),`,
  `where('targetUserId', '==', userProfile.id),\n          where('requestType', '==', 'PIN_RESET'),`
);
pinFile = pinFile.replace(
  `        where('userId', '==', userProfile.id),`,
  `        where('targetUserId', '==', userProfile.id),\n        where('requestType', '==', 'PIN_RESET'),`
);
pinFile = pinFile.replace(
  `      await addDoc(collection(db, 'adminRequests'), {
        userId: userProfile.id,
        userName: userProfile.displayName || '',
        userMobile: userProfile.personalMobile || '',
        newPinHash: hashHex,
        status: 'PENDING',
        requestedAt: serverTimestamp()
      });`,
  `      await addDoc(collection(db, 'adminRequests'), {
        requestType: 'PIN_RESET',
        status: 'PENDING',
        requestedBy: userProfile.id,
        requestedByName: userProfile.displayName || '',
        targetUserId: userProfile.id,
        targetUserName: userProfile.displayName || '',
        createdAt: serverTimestamp(),
        metadata: {
          userMobile: userProfile.personalMobile || '',
          newPinHash: hashHex
        }
      });`
);
fs.writeFileSync('src/components/PinRecoveryModal.tsx', pinFile);

console.log("Modals rewritten.");
