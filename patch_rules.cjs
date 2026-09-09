const fs = require('fs');

let file = fs.readFileSync('firestore.rules', 'utf8');

const adminReqRules = `
    match /adminRequests/{docId} {
      allow read: if isAuthenticated();
      // Allow any user to create their own requests (like Slot Increase, PIN reset)
      // Allow Super Admin to create any request
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
`;

if (!file.includes("match /adminRequests")) {
  file = file.replace(
    "match /slotRequests/{docId}",
    adminReqRules + "\n    match /slotRequests/{docId}"
  );
  fs.writeFileSync('firestore.rules', file);
}
console.log("Rules patched.");
