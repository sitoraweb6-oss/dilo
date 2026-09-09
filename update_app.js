const fs = require('fs');
let file = fs.readFileSync('src/App.tsx', 'utf8');

if (!file.includes('AccountMigration')) {
  file = file.replace("import { AccountRecovery } from './pages/AccountRecovery';", "import { AccountRecovery } from './pages/AccountRecovery';\nimport { AccountMigration } from './pages/AccountMigration';");
  file = file.replace('<Route path="/account-recovery" element={<AccountRecovery />} />', '<Route path="/account-recovery" element={<AccountRecovery />} />\n        <Route path="/account-migration" element={<AccountMigration />} />');
  fs.writeFileSync('src/App.tsx', file);
  console.log("App.tsx updated.");
}
