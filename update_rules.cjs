const fs = require('fs');
let file = fs.readFileSync('firestore.rules', 'utf8');

file = file.replace(
  `    match /usersPrivate/{userId} {\n      allow read, create, update: if isAuthenticated() && request.auth.uid == userId;\n      allow delete: if isAdmin();\n    }`,
  `    match /usersPrivate/{userId} {\n      allow read, create: if isAuthenticated() && request.auth.uid == userId;\n      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());\n      allow delete: if isAdmin();\n    }`
);

if (!file.includes('pinRecoveryRequests')) {
  file = file.replace(
    `  }\n}`,
    `    match /accountMigrations/{migrationId} {\n      allow read: if isAuthenticated();\n      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.requestedBy;\n      allow update, delete: if isAdmin();\n    }\n    match /pinRecoveryRequests/{requestId} {\n      allow read: if isAuthenticated();\n      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;\n      allow update: if isAdmin() && request.auth.uid != resource.data.userId;\n      allow delete: if isAdmin();\n    }\n  }\n}`
  );
}

fs.writeFileSync('firestore.rules', file);
console.log("firestore.rules updated.");
