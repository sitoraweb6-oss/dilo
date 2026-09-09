const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

file = file.replace(`const { firebaseUser, userProfile, loading, pinVerified } = useAuth();`, `const { firebaseUser, userProfile, loading, pinVerified, logout } = useAuth();`);

fs.writeFileSync('src/App.tsx', file);
console.log("App.tsx fixed for logout.");
