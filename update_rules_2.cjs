const fs = require('fs');
let file = fs.readFileSync('firestore.rules', 'utf8');

const toAdd = `
    match /slotRequests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAdmin();
    }
`;

file = file.replace(
  /match \/settings\/\{settingId\} \{[\s\S]*?allow write: if isAdmin\(\);\s*\}/,
  (match) => match + toAdd
);

fs.writeFileSync('firestore.rules', file);
console.log("Updated firestore.rules with regex");
