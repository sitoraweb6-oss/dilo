const fs = require('fs');
let file = fs.readFileSync('firestore.rules', 'utf8');

const newRules = `
    match /investments/{investmentId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdmin();
      allow update: if isAuthenticated(); // Admins handle approval, Members handle voting
    }
    match /investmentTransactions/{txnId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
`;

file = file.replace(
  "  }\n}",
  newRules + "  }\n}"
);

fs.writeFileSync('firestore.rules', file);
