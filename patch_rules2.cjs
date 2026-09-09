const fs = require('fs');
let file = fs.readFileSync('firestore.rules', 'utf8');

const adminReqRules = `
    match /adminRequests/{docId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
`;

if (!file.includes("match /adminRequests")) {
  file = file.replace(
    "match /slotRequests/{requestId} {",
    adminReqRules + "\n    match /slotRequests/{requestId} {"
  );
  fs.writeFileSync('firestore.rules', file);
  console.log("Patched firestore.rules!");
} else {
  console.log("Already patched.");
}
